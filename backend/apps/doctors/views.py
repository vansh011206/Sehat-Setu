"""
Views for Doctors, Specialties, and Review management in SehatSetu.
"""

from decimal import Decimal
from django.db import connection
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.accounts.models import User
from apps.appointments.models import Appointment
from .models import DoctorProfile, Review, Specialty
from .serializers import (
    CreateReviewSerializer,
    DoctorDetailSerializer,
    DoctorListSerializer,
    ReviewSerializer,
    SpecialtySerializer,
)


class DoctorListPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 50


class ReviewPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 30


class DoctorSearchRateThrottle(AnonRateThrottle):
    rate = "60/minute"


class ReviewCreateRateThrottle(UserRateThrottle):
    rate = "10/minute"


class SpecialtyListView(generics.ListAPIView):
    """
    List all active medical specialties with verified doctor counts.
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = SpecialtySerializer
    pagination_class = None

    def get_queryset(self):
        return Specialty.objects.filter(is_active=True).order_by("name")


class DoctorListView(generics.ListAPIView):
    """
    List and filter doctors directory with full-text search, specialty,
    city, price ceiling, and rating filters.
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = DoctorListSerializer
    pagination_class = DoctorListPagination
    throttle_classes = [DoctorSearchRateThrottle]

    @extend_schema(
        parameters=[
            OpenApiParameter("specialty", str, description="Specialty slug or ID"),
            OpenApiParameter("city", str, description="Filter by city name"),
            OpenApiParameter("min_rating", float, description="Minimum star rating (e.g. 4.0)"),
            OpenApiParameter("max_fee", float, description="Maximum consultation fee"),
            OpenApiParameter(
                "sort",
                str,
                description="Sorting: rating (default), fee_asc, fee_desc, experience",
            ),
            OpenApiParameter("search", str, description="Search query across doctor name, specialty, city"),
        ]
    )
    def get_queryset(self):
        queryset = (
            DoctorProfile.objects.filter(user__is_active=True)
            .select_related("user", "specialty")
        )

        params = self.request.query_params

        # 1. Specialty filter
        specialty = params.get("specialty")
        if specialty:
            if specialty.isdigit():
                queryset = queryset.filter(specialty_id=int(specialty))
            else:
                queryset = queryset.filter(specialty__slug__iexact=specialty)

        # 2. City filter
        city = params.get("city")
        if city:
            queryset = queryset.filter(city__icontains=city.strip())

        # 3. Minimum rating filter
        min_rating = params.get("min_rating")
        if min_rating:
            try:
                queryset = queryset.filter(avg_rating__gte=Decimal(min_rating))
            except Exception:
                pass

        # 4. Maximum fee filter
        max_fee = params.get("max_fee")
        if max_fee:
            try:
                queryset = queryset.filter(consultation_fee__lte=Decimal(max_fee))
            except Exception:
                pass

        # 5. Search query (PostgreSQL full-text / trigram fallback)
        search = params.get("search")
        if search:
            search_term = search.strip()
            is_postgres = connection.vendor == "postgresql"

            if is_postgres:
                try:
                    from django.contrib.postgres.search import SearchVector, TrigramSimilarity

                    queryset = queryset.annotate(
                        similarity=TrigramSimilarity("user__full_name", search_term)
                        + TrigramSimilarity("specialty__name", search_term)
                        + TrigramSimilarity("city", search_term)
                    ).filter(
                        Q(similarity__gt=0.1)
                        | Q(user__full_name__icontains=search_term)
                        | Q(specialty__name__icontains=search_term)
                        | Q(city__icontains=search_term)
                    )
                except Exception:
                    queryset = queryset.filter(
                        Q(user__full_name__icontains=search_term)
                        | Q(specialty__name__icontains=search_term)
                        | Q(city__icontains=search_term)
                        | Q(clinic_name__icontains=search_term)
                        | Q(qualification__icontains=search_term)
                    )
            else:
                queryset = queryset.filter(
                    Q(user__full_name__icontains=search_term)
                    | Q(specialty__name__icontains=search_term)
                    | Q(city__icontains=search_term)
                    | Q(clinic_name__icontains=search_term)
                    | Q(qualification__icontains=search_term)
                )

        # 6. Sorting
        sort = params.get("sort", "rating")
        if sort == "fee_asc":
            queryset = queryset.order_by("consultation_fee", "-avg_rating")
        elif sort == "fee_desc":
            queryset = queryset.order_by("-consultation_fee", "-avg_rating")
        elif sort == "experience":
            queryset = queryset.order_by("-years_of_experience", "-avg_rating")
        else:
            queryset = queryset.order_by("-avg_rating", "-rating_count", "-years_of_experience")

        return queryset


class DoctorDetailView(generics.RetrieveAPIView):
    """
    Retrieve single doctor full profile with recent reviews and star distribution stats.
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = DoctorDetailSerializer
    queryset = DoctorProfile.objects.select_related("user", "specialty")


class DoctorReviewsListCreateView(APIView):
    """
    GET: Paginated reviews for a doctor.
    POST: Submit a review (Only patients with a COMPLETED appointment with this doctor).
    """

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_throttles(self):
        if self.request.method == "POST":
            return [ReviewCreateRateThrottle()]
        return [DoctorSearchRateThrottle()]

    @extend_schema(responses={200: ReviewSerializer(many=True)})
    def get(self, request, pk):
        try:
            doctor = DoctorProfile.objects.get(pk=pk)
        except DoctorProfile.DoesNotExist:
            return Response({"detail": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)

        reviews = doctor.reviews.select_related("patient").order_by("-created_at")
        paginator = ReviewPagination()
        page = paginator.paginate_queryset(reviews, request)
        serializer = ReviewSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(request=CreateReviewSerializer, responses={201: ReviewSerializer})
    def post(self, request, pk):
        try:
            doctor = DoctorProfile.objects.get(pk=pk)
        except DoctorProfile.DoesNotExist:
            return Response({"detail": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)

        # 1. Verify user is a patient with a COMPLETED appointment with this doctor
        has_completed_appointment = Appointment.objects.filter(
            doctor=doctor,
            patient=request.user,
            status=Appointment.Status.COMPLETED,
        ).exists()

        if not has_completed_appointment:
            return Response(
                {
                    "detail": "You can only review doctors after completing an appointment with them."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # 2. Check if already reviewed (One review per patient per doctor)
        if Review.objects.filter(doctor=doctor, patient=request.user).exists():
            return Response(
                {
                    "detail": "You have already submitted a review for this doctor."
                },
                status=status.HTTP_409_CONFLICT,
            )

        serializer = CreateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save(doctor=doctor, patient=request.user)

        return Response(
            ReviewSerializer(review, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
