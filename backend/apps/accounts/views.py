"""
Views for authentication, token handling, and user profile management.
"""

from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from .models import User
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    """
    Register a new user account (Patient or Doctor).
    Generates JWT access and refresh tokens upon successful registration.
    """

    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    @extend_schema(responses={201: UserSerializer})
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens for the new user
        refresh = RefreshToken.for_user(user)

        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        return Response(
            {
                "message": "User registered successfully.",
                "user": user_data,
                "access": access_token,
                "refresh": refresh_token,
                "tokens": {
                    "access": access_token,
                    "refresh": refresh_token,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    Log in using phone or email and password.
    Returns user info along with JWT tokens.
    """

    permission_classes = [AllowAny]
    throttle_scope = "login"

    @extend_schema(request=LoginSerializer, responses={200: UserSerializer})
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        user_data = UserSerializer(user, context={"request": request}).data
        access_token = serializer.validated_data["access"]
        refresh_token = serializer.validated_data["refresh"]

        return Response(
            {
                "message": "Login successful.",
                "user": user_data,
                "access": access_token,
                "refresh": refresh_token,
                "tokens": {
                    "access": access_token,
                    "refresh": refresh_token,
                },
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    Logout user by blacklisting their refresh token.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request={"application/json": {"properties": {"refresh": {"type": "string"}}}},
        responses={200: {"properties": {"message": {"type": "string"}}}},
    )
    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"message": "Successfully logged out."},
                status=status.HTTP_200_OK,
            )
        except TokenError:
            return Response(
                {"error": "Invalid or already blacklisted token."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MeView(generics.RetrieveUpdateAPIView):
    """
    Get or update the current authenticated user's profile.
    Supports file uploads for profile pictures.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """
    Change password for currently authenticated user.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(request=ChangePasswordSerializer)
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )
