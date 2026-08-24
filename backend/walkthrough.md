# Walkthrough: SehatSetu Notification & Reminder System

## 1. Overview of Delivered Capabilities

We built and verified the complete **Real-Time Notification, Reminder & Transactional Email System** for SehatSetu adhering strictly to the Global Design System (Teal palette, Lucide icons only, zero emojis, notification center with icon-based types).

---

## 2. Backend Architecture (`apps/notifications/`)

- **`Notification` Model**:
  - `recipient`: ForeignKey linked to receiving User.
  - `actor`: Optional ForeignKey of the user who triggered the event.
  - `type`: `APPOINTMENT_CONFIRMED`, `APPOINTMENT_CANCELLED`, `APPOINTMENT_REMINDER`, `CONSULT_STARTED`, `NEW_PRESCRIPTION`, `REVIEW_RECEIVED`, `PROFILE_INCOMPLETE`, `SYSTEM`.
  - `title` & `message`: Notification text.
  - `icon`: Lucide icon name (e.g. `video`, `file-text`, `calendar-check`, `clock`).
  - `data`: JSONField containing navigation links (`{"link": "/consult/2", "appointment_id": 2}`).
  - `is_read`: Boolean with composite index on `(recipient, is_read, created_at)`.

- **`NotificationService` (`services.py`)**:
  - `create_notification(...)`: Single helper used across all domain flows (booking, cancellation, confirmation, consult start, new prescription, review).
  - Pushes real-time WebSocket events via Django Channels to channel group `f"user_{recipient.id}"`.
  - Sends transactional HTML & plain-text emails formatted with SehatSetu deep teal palette (`#0F766E`), clear typography, and zero emojis.

- **WebSocket Consumer (`consumers.py` & `routing.py`)**:
  - Connected at `/ws/notifications/?token=<jwt_access_token>`.
  - Authenticates via JWT query parameter.
  - Pushes live unread badge counts, new notification cards, and supports client actions (`mark_read`, `mark_all_read`).

- **Celery Periodic Tasks (`tasks.py`) & Beat Schedule**:
  - `send_appointment_reminders_15min`: 15 min before appointment -> notifies both doctor & patient (in-app + email).
  - `send_appointment_reminders_3h`: 3h before appointment -> sends email reminder + SMS stub.
  - `mark_missed_appointments`: Hourly cleanup for unfulfilled past appointments -> notifies patient and doctor.
  - `nightly_platform_stats`: Nightly platform metrics aggregation.

---

## 3. Frontend Experience

### 🔔 Real-Time Notification Bell & Dropdown (`Navbar.tsx` & `NotificationBell.tsx`)
- **Unread Badge**: Coral/Red badge displaying live count (`tabular-nums`), pulsing animation on update.
- **Dropdown Panel**:
  - Header: Unread count pill + "Mark all read" button (`CheckCheck` icon).
  - Grouped by day: "Today", "Yesterday", "Earlier".
  - Icon in soft-tinted circle tailored by type (`Video` in teal, `FileText` in blue, `Calendar` in emerald, `Clock` in amber).
  - Zero-dependency relative time formatter (`"4m ago"`, `"1h ago"`).
  - Click action: Marks as read optimistically and navigates directly to the target destination.

### 📋 Full Notification Center (`/notifications`)
- Search bar for quick text filtering.
- Filter chips: `All Notifications`, `Unread Only`, `Appointments`, `Consultations`, `Prescriptions`.
- Rich notification cards with "New" status pill, mark-read quick action, and "View Details" button.

### ⚡ Real-Time WebSocket Hook (`useNotificationsWebSocket.ts`)
- Automatically keeps badge counts synchronized across multiple open browser tabs.
- Triggers custom in-app live toasts whenever a new notification is received while the app is open.

---

## 4. Visual Verification Highlights

![Navbar Notification Bell with Unread Badge](file:///C:/Users/Vanshaj%20sharma/.gemini/antigravity-ide/brain/0201fbdd-6b92-4965-bc77-b029a1f02e43/dashboard_unread_badge_1786974083045.png)
*Navbar showing notification bell with unread count badge.*

![Notification Dropdown Panel](file:///C:/Users/Vanshaj%20sharma/.gemini/antigravity-ide/brain/0201fbdd-6b92-4965-bc77-b029a1f02e43/notifications_dropdown_open_1786974108989.png)
*Dropdown panel grouped by day showing unread consultation alert, relative time ('4m ago'), and 'Mark all read' action.*

![Full Notification Center Page](file:///C:/Users/Vanshaj%20sharma/.gemini/antigravity-ide/brain/0201fbdd-6b92-4965-bc77-b029a1f02e43/notifications_page_loaded_1786974134619.png)
*Full notifications page with category filter chips, search bar, and action cards.*

![Marked Read State](file:///C:/Users/Vanshaj%20sharma/.gemini/antigravity-ide/brain/0201fbdd-6b92-4965-bc77-b029a1f02e43/notifications_marked_read_1786974161899.png)
*Real-time badge clear after marking all notifications as read.*
