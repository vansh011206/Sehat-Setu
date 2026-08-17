"""
Django settings for SehatSetu project.
"""

from datetime import timedelta
import os
from pathlib import Path
import socket

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Attempt to load django-environ if available, otherwise fallback gracefully
try:
    import environ

    env = environ.Env(
        DEBUG=(bool, True),
        SECRET_KEY=(
            str,
            "django-insecure-sehatsetu-dev-key-change-in-production-1234567890",
        ),
        ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1", "0.0.0.0", "*"]),
        CORS_ALLOWED_ORIGINS=(
            list,
            [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ],
        ),
        DATABASE_URL=(str, f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
        REDIS_URL=(str, "redis://localhost:6379/0"),
    )
    environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

    SECRET_KEY = env("SECRET_KEY")
    DEBUG = env.bool("DEBUG", default=True)
    ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])
    CORS_ALLOWED_ORIGINS = env.list(
        "CORS_ALLOWED_ORIGINS",
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
    )

    db_url_str = env("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
    # If DATABASE_URL targets docker host 'db' and running outside container, fallback to sqlite
    if "@db:" in db_url_str or "@db/" in db_url_str:
        try:
            socket.gethostbyname("db")
        except socket.gaierror:
            db_url_str = f"sqlite:///{BASE_DIR / 'db.sqlite3'}"

    DATABASES = {"default": env.db_url_config(db_url_str)}
    REDIS_URL = env("REDIS_URL", default="redis://localhost:6379/0")
    MEDIA_URL = env("MEDIA_URL", default="/media/")

except ImportError:
    # Fallback to standard os.environ for minimal setups
    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "django-insecure-sehatsetu-dev-key-change-in-production-1234567890",
    )
    DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "t")
    ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1,*").split(",")
    CORS_ALLOWED_ORIGINS = os.environ.get(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    MEDIA_URL = os.environ.get("MEDIA_URL", "/media/")

# Application definition
INSTALLED_APPS = [
    # Daphne must be before django.contrib.staticfiles for ASGI
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party apps
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "channels",
    # Local apps
    "apps.accounts",
    "apps.doctors",
    "apps.appointments",
    "apps.consultations",
    "apps.prescriptions",
    "apps.notifications",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Custom User Model
AUTH_USER_MODEL = "accounts.User"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Media files
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 12,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/day",
        "login": "20/minute",
        "60/minute": "60/minute",
        "10/minute": "10/minute",
    },
}

# Simple JWT Settings
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": None,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# CORS Settings
CORS_ALLOW_CREDENTIALS = True
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

# DRF Spectacular OpenAPI Settings
SPECTACULAR_SETTINGS = {
    "TITLE": "SehatSetu API",
    "DESCRIPTION": "Clinic-booking & Telehealth platform API documentation.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# Channels Channel Layers
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
        if DEBUG and not os.environ.get("REDIS_URL")
        else "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        }
        if not (DEBUG and not os.environ.get("REDIS_URL"))
        else {},
    },
}

# Celery Configuration
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
