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

## 📶 Local WiFi (LAN) Demo Testing (Multi-Device Laptop + Phone)

Test real-time telehealth video consultations and push notifications across two physical devices (e.g., **Doctor on Laptop** + **Patient on Mobile Phone**) on the same home Wi-Fi network without third-party tunnels or external services.

### 1. Step-by-Step Execution

#### Step A: Run LAN Seed Command
```bash
cd backend
python manage.py lan_demo
```
This command auto-detects your local machine's LAN IP and outputs the exact URLs and credentials:
- **LAN IP Detected**: e.g., `192.168.29.246`
- **Health Check**: `http://<lan-ip>:8000/api/v1/health/`
- **Web App**: `http://<lan-ip>:5173`
- **Doctor (Laptop)**: `9999900001` / `Demo@1234` (Dr. Aarti Sharma, Cardiologist)
- **Patient (Phone)**: `9999900002` / `Demo@1234` (Rahul Verma)
- **Instant Video Appointment**: Code `LAN-VIDEO-1` scheduled for immediate testing.

#### Step B: Start Backend (Daphne ASGI on 0.0.0.0)
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```
> [!NOTE]
> Daphne automatically serves both HTTP REST endpoints and Channels WebSockets over `0.0.0.0:8000`.

#### Step C: Start Frontend (Vite on 0.0.0.0)
```bash
cd frontend
npm run dev
```
> [!NOTE]
> Vite automatically listens on `0.0.0.0:5173` (`server.host = true` in `vite.config.ts`). The top navbar will display a green **LAN MODE** indicator with your machine's IP whenever accessed via local network.

---

### 2. Finding Your Machine IP

- **Windows (PowerShell/CMD)**:
  ```powershell
  ipconfig
  ```
  Look for **IPv4 Address** under `Wireless LAN adapter Wi-Fi` (e.g. `192.168.1.X` or `192.168.29.X`).
- **macOS / Linux**:
  ```bash
  ip addr show   # Linux
  ifconfig en0   # macOS
  ```
  Look for the `inet` address assigned to your Wi-Fi interface.

---

### 3. Windows Firewall Configuration

If your mobile phone cannot load `http://<lan-ip>:5173` or API calls return network errors, Windows Defender Firewall may be blocking incoming connections. Run PowerShell as **Administrator** and execute:

```powershell
netsh advfirewall firewall add rule name="SehatSetu Backend 8000" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="SehatSetu Frontend 5173" dir=in action=allow protocol=TCP localport=5173
```

---

### 4. Mobile Camera & Microphone Note (HTTPS Fallback)

Mobile browsers (Safari on iOS and Chrome on Android) strictly require a secure origin (`HTTPS` or `localhost`) to grant hardware camera and microphone access via `navigator.mediaDevices.getUserMedia`.

To ensure seamless multi-device video calls on local Wi-Fi:
1. Both devices enter the consultation room.
2. The UI features a dedicated **"Open in Jitsi"** fallback button in both the header and the video stage.
3. Clicking **"Open in Jitsi"** opens `https://meet.jit.si/SehatSetu-{room_name}` in a new tab over native HTTPS, allowing phone browsers to access the hardware camera and mic without self-signed certificate warnings.

---

### 5. Troubleshooting Table

| Issue | Root Cause | Solution |
|---|---|---|
| **Phone cannot open `http://<lan-ip>:5173`** | Windows Firewall blocking port 5173, or phone is on mobile data instead of home Wi-Fi. | Connect phone to the exact same Wi-Fi SSID as laptop; run the `netsh advfirewall` command above. |
| **API calls fail with "Network Error"** | Backend running on `127.0.0.1` instead of `0.0.0.0`, or port 8000 is blocked. | Start backend with `python manage.py runserver 0.0.0.0:8000` and ensure port 8000 firewall rule is active. |
| **WebSocket disconnects on phone** | WebSocket trying to connect to `localhost`. | Already solved: `getWsBaseUrl()` dynamically resolves to `ws://<lan-ip>:8000/ws`. Verify Daphne is active. |
| **Camera/mic disabled in mobile iframe** | Mobile browser security restricts HTTP iframe WebRTC access. | Tap the **"Open in Jitsi"** button to open the secure HTTPS Jitsi room directly in a new tab. |
| **Severe audio howling / feedback** | Both laptop and phone are active in the same room. | Mute the microphone on one device, or plug headphones into at least one device during testing. |

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
