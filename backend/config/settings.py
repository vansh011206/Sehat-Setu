"""
Django settings for SehatSetu project.
"""

from datetime import timedelta
import os
from pathlib import Path
import socket

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# LAN demo: Auto-detect local machine's LAN IP via UDP socket trick
def get_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"

LAN_IP = get_lan_ip()

# Attempt to load django-environ if available, otherwise fallback gracefully
try:
    import environ

    env = environ.Env(
        DEBUG=(bool, True),
        LAN_MODE=(bool, False),
        SECRET_KEY=(
            str,
            "django-insecure-sehatsetu-dev-key-change-in-production-1234567890",
        ),
        ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1", "0.0.0.0", LAN_IP]),
        CORS_ALLOWED_ORIGINS=(
            list,
            [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                f"http://{LAN_IP}:5173",
                f"http://{LAN_IP}:3000",
            ],
        ),
        DATABASE_URL=(str, f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
        REDIS_URL=(str, "redis://localhost:6379/0"),
    )
    environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

    SECRET_KEY = env("SECRET_KEY")
    DEBUG = env.bool("DEBUG", default=True)
    LAN_MODE = env.bool("LAN_MODE", default=False)
    ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "0.0.0.0", LAN_IP])
    CORS_ALLOWED_ORIGINS = env.list(
        "CORS_ALLOWED_ORIGINS",
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            f"http://{LAN_IP}:5173",
            f"http://{LAN_IP}:3000",
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
    LAN_MODE = os.environ.get("LAN_MODE", "").lower() in ("1", "true", "yes")
    ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", f"localhost,127.0.0.1,{LAN_IP}").split(",")
    CORS_ALLOWED_ORIGINS = os.environ.get(
        "CORS_ALLOWED_ORIGINS",
        f"http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://{LAN_IP}:5173",
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
    "apps.dashboard",
    "apps.admin_api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
]

try:
    import whitenoise  # noqa: F401
    MIDDLEWARE.append("whitenoise.middleware.WhiteNoiseMiddleware")
except ImportError:
    pass

MIDDLEWARE.extend([
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
])

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
try:
    import whitenoise  # noqa: F401
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
except ImportError:
    STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

# Media files
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Password Hashers (Argon2 primary)
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
]

# Security Headers & Hardening
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_SSL_REDIRECT = False  # Turned off for local dev

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
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "5/min",
        "user": "120/min",
        "auth": "5/min",
        "write": "30/min",
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
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https:\/\/.*\.vercel\.app$",
]

# CSRF Trusted Origins (required in Django 4+ for cross-origin forms/admin)
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://*.vercel.app",
    "https://*.onrender.com",
]

# LAN demo: Permissive settings only in DEBUG or LAN_MODE; strict in production
if DEBUG or LAN_MODE:
    ALLOWED_HOSTS = ["*"]  # LAN demo: LAN testing ke liye; production me kabhi nahi
    CORS_ALLOW_ALL_ORIGINS = True  # LAN demo: sirf LAN demo ke liye — production me explicit CORS_ALLOWED_ORIGINS allowlist use karna
else:
    CORS_ALLOW_ALL_ORIGINS = False

# DRF Spectacular OpenAPI Settings
SPECTACULAR_SETTINGS = {
    "TITLE": "SehatSetu API",
    "DESCRIPTION": "Clinic-booking & Telehealth platform API documentation.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# Channels Channel Layers
def _get_channel_layer_config():
    import socket
    from urllib.parse import urlparse

    redis_host = "127.0.0.1"
    redis_port = 6379
    if REDIS_URL:
        try:
            parsed = urlparse(REDIS_URL)
            redis_host = parsed.hostname or "127.0.0.1"
            redis_port = parsed.port or 6379
        except Exception:
            pass

    try:
        s = socket.create_connection((redis_host, redis_port), timeout=0.3)
        s.close()
        return {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
            },
        }
    except Exception:
        return {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }

CHANNEL_LAYERS = {
    "default": _get_channel_layer_config(),
}

# Celery Configuration
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

CELERY_BEAT_SCHEDULE = {
    "reminder_15min": {
        "task": "apps.notifications.tasks.send_appointment_reminders_15min",
        "schedule": 300.0,  # Run every 5 minutes
    },
    "reminder_3h": {
        "task": "apps.notifications.tasks.send_appointment_reminders_3h",
        "schedule": 900.0,  # Run every 15 minutes
    },
    "mark_missed_hourly": {
        "task": "apps.notifications.tasks.mark_missed_appointments",
        "schedule": 3600.0,  # Run every hour
    },
    "nightly_stats": {
        "task": "apps.notifications.tasks.nightly_platform_stats",
        "schedule": 86400.0,  # Run once daily
    },
    "nightly_stats_snapshot": {
        "task": "apps.admin_api.tasks.compute_daily_snapshot",
        "schedule": 86400.0,  # Run once daily
    },
}

# Email Configuration (Console Backend in dev for zero friction)
if DEBUG:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
else:
    EMAIL_BACKEND = os.environ.get(
        "EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend"
    )

DEFAULT_FROM_EMAIL = os.environ.get(
    "DEFAULT_FROM_EMAIL", "SehatSetu Care <notifications@sehatsetu.com>"
)

# ── Production overrides (Render / deployed environments) ──
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    if RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)
    if ".onrender.com" not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(".onrender.com")
    # Parse DATABASE_URL provided by Render PostgreSQL
    try:
        import dj_database_url
        DATABASES["default"] = dj_database_url.config(
            conn_max_age=600,
            conn_health_checks=True,
        )
    except ImportError:
        pass
    # HTTPS hardening
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_EXTERNAL_HOSTNAME}")
    # Add Vercel frontend to CORS and CSRF
    VERCEL_URL = os.environ.get("VERCEL_FRONTEND_URL", "")
    if VERCEL_URL:
        formatted_url = VERCEL_URL if VERCEL_URL.startswith("http") else f"https://{VERCEL_URL}"
        if formatted_url not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(formatted_url)
        if formatted_url not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(formatted_url)
    CORS_ALLOW_CREDENTIALS = True
