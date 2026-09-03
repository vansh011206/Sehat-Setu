# SehatSetu — Enterprise Clinic Booking & Telehealth Platform

![Pytest](https://img.shields.io/badge/pytest-passing-success?style=flat-square&logo=pytest)
![Coverage](https://img.shields.io/badge/coverage-%3E80%25-teal?style=flat-square&logo=codecov)
![Python](https://img.shields.io/badge/python-3.12-blue?style=flat-square&logo=python)
![Django](https://img.shields.io/badge/django-5.2-092E20?style=flat-square&logo=django)
![React](https://img.shields.io/badge/react-19.0-61DAFB?style=flat-square&logo=react)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-4.0-06B6D4?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

> **SehatSetu** is an enterprise-grade digital telehealth and clinic management platform. Built strictly following the **Global Design System (Deep Teal `#0F766E`, zero emojis, Lucide icons only, `rounded-2xl` cards)**, it connects patients with verified medical specialists for real-time WebRTC video consultations, in-clinic visits, ReportLab digital PDF prescriptions with public QR verification, real-time WebSocket push notifications, and super admin telemetry.

---

## 🏛️ System Architecture Diagram (ASCII)

```
                     +-------------------------------------------------------+
                     |        Client Browser (React 19 SPA + Vite)            |
                     |  - Patient Dashboard  - Doctor Portal  - Super Admin  |
                     +-------------------------------------------------------+
                                        |                   |
                           HTTPS REST   |                   | WebSocket (ws://)
                           (JSON + JWT) |                   | (Real-time Chat & Push)
                                        v                   v
                     +-------------------------------------------------------+
                     |         Nginx Reverse Proxy (Port 80 / 443)           |
                     |   - SPA Static Server   - Proxy /api/ & /ws/          |
                     +-------------------------------------------------------+
                                        |                   |
                                        v                   v
                     +-------------------------------------------------------+
                     |           Daphne ASGI Server (Port 8000)              |
                     |                 Django 5.2 Framework                  |
                     +-------------------------------------------------------+
                                  /            |             \
                                 /             |              \
                                v              v               v
               +-------------------+  +-----------------+  +-------------------+
               | PostgreSQL 16 DB  |  | Redis 7 Broker  |  |  Celery Workers   |
               | (ACID Locks & Rx) |  | (Channels + WS) |  | (Reminders + PDF) |
               +-------------------+  +-----------------+  +-------------------+
```

---

## 🔗 Live API Documentation & Links

- **Swagger UI Interactive API Documentation**: [`/api/v1/docs/`](http://localhost:8000/api/v1/docs/)
- **ReDoc Schema Explorer**: [`/api/v1/redoc/`](http://localhost:8000/api/v1/redoc/)
- **Health Check Endpoint**: [`/api/v1/health/`](http://localhost:8000/api/v1/health/)
- **Public e-Prescription Verification**: [`/verify/:code`](http://localhost:5173/verify/SHTS-8XK2PL3)

---

## ⚡ 2-Minute Instant Demo Seeding

Anyone can set up a fully-populated, demo-ready clinical environment in under 15 seconds:

```bash
# Navigate to backend directory and run demo_seed
cd backend
python manage.py demo_seed
```

This command resets test data and seeds:
- **4 Doctors**: Cardiology (Dr. Rajesh Sharma), Dermatology (Dr. Priya Patel), Orthopedics (Dr. Vikram Singh), Gynecology (Dr. Anita Roy)
- **3 Patients**: Aarav Kumar, Sunita Devi, Rahul Verma
- **2 Completed Consultations**: Pre-loaded with ReportLab PDF e-Prescriptions and 5-star verified patient reviews
- **2 Upcoming Appointments**: Ready for instant live video telehealth demonstration

---

## 🔑 Pre-Seeded Demo Credentials

| Role | Phone Number | Password | Account Holder | Key Features |
|---|---|---|---|---|
| **Super Admin** | `+919876543210` | `Demo@1234` | System Administrator | Full platform analytics, revenue trends, doctor availability toggle, status overrides, audit logs |
| **Doctor** | `+919876543212` | `Demo@1234` | Dr. Rajesh Sharma (Cardiology) | Today's schedule, patient directory, prescription composer, video consultation stage |
| **Doctor** | `+919876543213` | `Demo@1234` | Dr. Priya Patel (Dermatology) | Consultation schedule, review history, patient record viewer |
| **Patient** | `+919876543211` | `Demo@1234` | Aarav Kumar | Book slots, upcoming countdown timer, live WebRTC video room, Rx PDF downloads |

---

## ✨ Features per Role

### 👤 Patient Experience
- **Specialty & City Search**: Search doctors by city, specialty (Cardiology, Dermatology, Orthopedics, Gynecology), rating, and fee.
- **Atomic Slot Reservation**: Real-time slot locking with concurrency collision protection.
- **Telehealth Video Room**: Integrated Jitsi WebRTC video call with real-time text chat and presence tracking.
- **Digital Health Record**: Downloadable ReportLab PDF e-Prescriptions and public QR verification lookup.
- **Notification Dropdown**: Real-time WebSocket notifications and unread badge indicator.

### 🩺 Doctor Portal
- **Daily Practice Schedule**: Sorted daily queue with patient mini-profiles and quick actions.
- **Digital Prescription Composer**: Form with dynamic medicine table, dosage, frequency, duration, advice, and auto-generated verification code (`SHTS-XXXXXXX`).
- **Patient Health Directory**: View distinct patient history, past appointment counts, and past prescriptions.
- **Availability Toggle**: Instant toggle to pause/resume slot availability.

### 🛡️ Super Admin Console (`/admin`)
- **Telemetry Overview**: KPI stat cards with % deltas vs previous periods, Recharts Area revenue trend, Donut appointment status chart, and Specialty Demand bar chart.
- **Doctor Directory Management**: Audit doctor credentials, toggle availability, soft-deactivate accounts, and export UTF-8 BOM CSV.
- **Patient History Explorer**: Search patient records with expandable inline appointment histories.
- **Status Override Engine**: Administrative appointment status overrides with mandatory audit logging note.
- **Security Audit Logs**: Track administrative state mutations with JSON diff modal.

---

## 🔒 Security Hardening & Concurrency Protection

1. **The Concurrency Guarantee**:
   - `Appointment` booking uses `select_for_update(nowait=True)` within an atomic database transaction.
   - When 2 parallel requests attempt to book the exact same doctor slot at the exact same millisecond, exactly **one** receives `201 Created` and the other receives `409 Conflict`. Tested and verified via multi-threaded Pytest concurrency test suite.
2. **CORS Allowlist**: Strict `CORS_ALLOWED_ORIGINS` allowlist matching VITE origin only (no `*` wildcard).
3. **DRF Throttling**:
   - `auth`: 5 requests / min
   - `anon`: 5 requests / min
   - `user`: 120 requests / min
   - `write`: 30 requests / min
4. **Password Security**: Argon2 password hasher as primary (`Argon2PasswordHasher`). SimpleJWT refresh token rotation and blacklisting enabled.
5. **Security Headers**: `SECURE_CONTENT_TYPE_NOSNIFF = True`, `SECURE_BROWSER_XSS_FILTER = True`, `X_FRAME_OPTIONS = "DENY"`, `REFERRER_POLICY = "strict-origin-when-cross-origin"`.

---

## 🛠️ Local Development & Running Tests

### 1. Backend Setup (Django + Celery + Channels)

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # On Windows

pip install -r requirements.txt
python manage.py migrate
python manage.py demo_seed
python manage.py runserver 8000
```

### 2. Run Pytest Suite (>80% Coverage)

```bash
cd backend
pytest --cov=apps.accounts --cov=apps.doctors --cov=apps.appointments --cov=apps.consultations --cov=apps.prescriptions --cov=apps.notifications --cov=apps.admin_api --cov-report=term-missing
```

### 3. Frontend Setup (React 19 + Vitest)

```bash
cd frontend
npm install
npm run dev        # Starts Vite dev server on http://localhost:5173
npm test           # Runs Vitest unit test suite
npm run build      # Builds production bundle (tsc -b && vite build)
```

---

## 🐳 Production Deployment with Docker Compose

To build and run the complete production stack (PostgreSQL 16, Redis 7, Django ASGI/Daphne, Celery Worker, Celery Beat, and Nginx SPA proxy):

```bash
# 1. Clone & prepare environment
git clone <repo-url>
cd Sehat-Setu
cp .env.example .env

# 2. Launch production stack in background
docker compose -f docker-compose.prod.yml up -d --build
```

### Production Services Ports:
- **Frontend SPA / Nginx**: `http://localhost:80`
- **REST API & Swagger Docs**: `http://localhost:80/api/v1/docs/`
- **WebSockets Telehealth & Notifications**: `ws://localhost:80/ws/`

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for details.
