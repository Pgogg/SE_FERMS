# FERMS Use-Case Test Checklist & Walkthrough

This document provides an end-to-end testing walkthrough for all 14 use cases (UC-01 through UC-14) of the **Fire Emergency Response Management System (FERMS)**. It is derived directly from the FERMS System Design Document (v1.2, sections 5, 6.3, 7, 8, 9.2, and 14.7) and the FERMS Implementation Plan (v1.2, sections 4, 5, A.3, and B.2).

Both developers (Parth and Vedant) run this checklist together in the browser. Every test failure becomes an actionable bug task assigned to the respective feature owner per the ownership matrix.

---

## 1. Test Environment & Pre-requisites

1. **Backend Server:** Running on `http://localhost:5000` with PostgreSQL database migrated and seeded (`npm run db:migrate && npm run db:seed`).
2. **Frontend Client:** Running on `http://localhost:5173` with WebSocket connection to the backend.
3. **Demo User Accounts:** (All passwords default to `Passw0rd!`)
   - **Citizen:** `citizen@ferms.test` / `Passw0rd!`
   - **Citizen 2:** `citizen2@ferms.test` / `Passw0rd!`
   - **Dispatch Operator:** `operator@ferms.test` / `Passw0rd!`
   - **Firefighter (Station 1):** `firefighter@ferms.test` / `Passw0rd!`
   - **Firefighter 2 (Station 2):** `firefighter2@ferms.test` / `Passw0rd!`
   - **Station Officer (Station 1):** `officer@ferms.test` / `Passw0rd!`
   - **System Administrator:** `admin@ferms.test` / `Passw0rd!`

---

## 2. Use-Case Walkthroughs

---

### UC-01: Citizen Self-Registration

- **Primary Role:** Public / Unauthenticated
- **Preconditions:** Client accessible at `http://localhost:5173/register`; database running.
- **Test Steps (Browser):**
  1. Navigate to `http://localhost:5173/` and click the **Register** link in the navigation bar (or open `http://localhost:5173/register` directly).
  2. Verify the split-screen layout: a white registration `Card` on one side and a dark branding panel on the other (panel is hidden on narrow mobile screens per §14.7).
  3. Fill out the registration form:
     - Name: `New Test Citizen`
     - Email: `newcitizen@ferms.test`
     - Phone: `555-0199`
     - Password: `Password123!` (≥ 8 characters)
  4. Click the primary submit button.
  5. Verify that the user is registered as a Citizen, the JWT is stored in `localStorage` (`ferms_token`), and the browser automatically redirects to the Citizen home route (`/report`).

- **Edge Cases & Error Handling:**
  - **Try this:** Attempt to register with an email that already exists in the system (e.g. `citizen@ferms.test`).  
    **Expect:** Registration fails with a `409 Conflict` error and an in-form message stating the email is already in use (`Auth.Register.Validate`).
  - **Try this:** Enter a password shorter than 8 characters (e.g. `pass123`).  
    **Expect:** Client-side validation stops submission or API rejects with `400 Bad Request` stating password must be at least 8 characters.
  - **Try this:** Attempt to submit a role other than Citizen during public registration.  
    **Expect:** Server strictly defaults public registrations to `citizen`; staff accounts can only be provisioned by an Admin via `POST /api/users`.

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

### UC-02: User Authentication & Session Management

- **Primary Role:** Any seeded demo account (`citizen@ferms.test`, `operator@ferms.test`, `firefighter@ferms.test`, `officer@ferms.test`, `admin@ferms.test`)
- **Preconditions:** Demo accounts seeded in the database.
- **Test Steps (Browser):**
  1. Navigate to `/login` (or click **Log In** from the landing page).
  2. Verify split-screen login layout with form card and branding panel.
  3. Enter email `citizen@ferms.test` and password `Passw0rd!`, then click **Log In**.
  4. Verify login succeeds, token is persisted in `localStorage` (`ferms_token`), and user is redirected to role-specific home route `/report`.
  5. Repeat login verification for remaining roles to confirm role-home redirection:
     - Dispatch Operator (`operator@ferms.test`) → `/dashboard`
     - Firefighter (`firefighter@ferms.test`) → `/assignments`
     - Station Officer (`officer@ferms.test`) → `/dashboard`
     - Administrator (`admin@ferms.test`) → `/dashboard`
  6. Click **Log Out** in the navigation bar.
  7. Verify token is discarded from `localStorage`, session is cleared, and user is redirected to `/login`.
  8. Attempt to navigate directly to a protected URL (e.g. `/dashboard` or `/assignments`). Verify `ProtectedRoute` intercepts and redirects back to `/login`.

- **Edge Cases & Error Handling:**
  - **Try this:** Enter an incorrect password or non-existent email address.  
    **Expect:** Login fails with `401 Unauthorized` displaying generic message "Invalid email or password" (`Auth.Login.Fail`) without leaking email existence.
  - **Try this:** Attempt login using an inactive account (where `account_status = 'inactive'`).  
    **Expect:** Login rejected with `401 Unauthorized` stating the account is inactive.
  - **Try this:** While logged in as Citizen, manually type `/admin/users` into the browser URL bar.  
    **Expect:** `ProtectedRoute` blocks access and redirects to Citizen home (`/report`).

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

### UC-03: Report Fire Incident

- **Primary Role:** Citizen (`citizen@ferms.test`)
- **Preconditions:** Logged in as Citizen; at least one station exists in the database.
- **Test Steps (Browser):**
  1. Navigate to `/report` (or click **Report a Fire** on the landing page).
  2. Verify calm, high-contrast, single-screen layout with numbered steps (01 Location, 02 Details, 03 Confirm), `SeverityPicker`, and the `EmergencyCallCard` displaying emergency numbers (101 / 112) and disclaimer: *"Call 101 or 112 if anyone is in danger. FERMS does not replace emergency calls."* No hero images or marquees on this route (§14.7).
  3. Allow browser geolocation when prompted, or enter address manually and adjust pin on Leaflet map.
  4. In Details step, enter description (e.g. *"Commercial unit fire spreading to upper floor"*) and select a severity level (e.g. `High`).
  5. In Confirm step, review summary and click the primary submit button.
  6. Verify confirmation screen renders with incident ID, status, and assigned station.
  7. Navigate to `/my-reports` to confirm the incident appears as a `Card` with `SeverityBadge`, status `Badge`, and live status `Stepper`.

- **Edge Cases & Error Handling:**
  - **Try this:** Deny browser location permission when prompted.  
    **Expect:** Form falls back gracefully to manual address text input and draggable Leaflet map pin drop (`Incident.Report.Location`).
  - **Try this:** Submit form without description or without selecting severity.  
    **Expect:** Submission blocked; required inputs highlighted with validation errors (`400 Bad Request`).
  - **Try this:** Verify emergency phone callout visual card.  
    **Expect:** `EmergencyCallCard` renders prominently beside form (stacked above on phone screens).

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

### UC-04: Automated Nearest-Station Assignment & Vehicle Reservation

- **Primary Role:** Citizen (reporter) & Dispatch Operator (`operator@ferms.test` to verify)
- **Preconditions:** Stations seeded with coordinates and vehicle fleets (e.g. Station 1 with available vehicles).
- **Test Steps (Browser):**
  1. Log in as Citizen and submit an incident at coordinates located close to Downtown Station 1 (e.g. lat `19.0760`, lon `72.8777`).
  2. Confirm submission: backend calculates Haversine distance to all stations, filters for available vehicles, and picks the nearest qualifying station (`Dispatch.Assign.Nearest`).
  3. In the database and confirmation response:
     - Incident status becomes `assigned`.
     - Station is linked (`station_id = 1`).
     - One available vehicle from Station 1 is linked in `incident_vehicles` and marked `dispatched`.
     - Dispatch notification is generated for on-duty personnel at Station 1 (`Notify.Dispatch`).
  4. Log in as Dispatch Operator (`operator@ferms.test`) on `/dashboard`.
  5. Verify the new incident is listed under `assigned`, mapped to Station 1, and Station 1 available vehicle count decreases by 1.

- **Edge Cases & Error Handling:**
  - **Try this:** Report an incident at coordinates where no stations qualify or all stations have 0 available vehicles (`dispatched` or `maintenance`).  
    **Expect:** Incident status is set to `unassigned`, `station_id` is `null`, and a broadcast alert notification is sent to all dispatch operators (`Dispatch.Assign.NoStation`, `SF-2`).
  - **Try this:** Check database transaction integrity upon creation.  
    **Expect:** Incident insertion, history log, vehicle reservation (`incident_vehicles` + vehicle status `dispatched`), and notifications execute atomically within a single database transaction.

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

### UC-05: Manual Dispatch Override

- **Primary Role:** Dispatch Operator (`operator@ferms.test`) or Administrator (`admin@ferms.test`)
- **Preconditions:** An incident exists in `unassigned` or `assigned` status; at least two stations exist with available vehicles.
- **Test Steps (Browser):**
  1. Log in as Dispatch Operator and open `/dashboard`.
  2. Click on an `unassigned` or `assigned` incident row to open the `IncidentSummaryModal`.
  3. Verify the **Reassign station** button is visible for dispatch_operator and admin (§14.7, W6-V-FE-1).
  4. Click **Reassign station** to launch the `AssignOverride` modal.
  5. Select a different fire station from the dropdown (one with available vehicles) and confirm reassignment.
  6. Verify:
     - Old station's vehicle (if previously assigned) is released back to `available`.
     - New station reserves an available vehicle (`dispatched`).
     - Incident `station_id` updates and status becomes `assigned`.
     - Dashboard stats, table list, and Leaflet map pins update live.
     - A Toast confirmation message is displayed.

- **Edge Cases & Error Handling:**
  - **Try this:** Select a station that currently has NO available vehicles (all vehicles dispatched or in maintenance).  
    **Expect:** Reassignment fails with `409 Conflict` and a clear error message indicating no vehicles available at target station; existing assignment remains untouched.
  - **Try this:** Open `IncidentSummaryModal` for an incident with status `in_progress`, `resolved`, or `closed`.  
    **Expect:** **Reassign station** button is NOT shown. Direct API call `PATCH /api/incidents/:id/assign` returns `400 Bad Request` (`INVALID_TRANSITION`, UC-05 ext. 6a).
  - **Try this:** Log in as Firefighter or Citizen and attempt manual override.  
    **Expect:** Reassign button is not visible; direct API call returns `403 Forbidden` (`BR-1`).

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

### UC-06: Fire Station Management

- **Primary Role:** Administrator (`admin@ferms.test`)
- **Preconditions:** Logged in as Admin.
- **Test Steps (Browser):**
  1. Log in as Admin and navigate to `/admin/stations`.
  2. Verify the table listing all fire stations with Name, Address, Latitude, Longitude, Available Vehicles, and On-Duty Personnel.
  3. Click the primary **Add Station** button to open the modal.
  4. Enter station details:
     - Name: `West Suburb Fire Station`
     - Address: `Plot 42, Link Road, Andheri West`
     - Latitude: `19.1363`
     - Longitude: `72.8277`
  5. Click Save. Verify new station appears in table and becomes selectable in dispatch and visible as a station pin on `/dashboard` map.
  6. Click **Edit** on an existing station, modify address or coordinates, and save.
  7. Verify updated station details persist.

- **Edge Cases & Error Handling:**
  - **Try this:** Submit station form with missing name or invalid latitude/longitude format.  
    **Expect:** Validation error highlights coordinate inputs; request rejected with `400 Bad Request`.
  - **Try this:** Attempt to navigate to `/admin/stations` while logged in as Citizen, Firefighter, or Dispatch Operator.  
    **Expect:** `ProtectedRoute` redirects away; direct API request returns `403 Forbidden`.

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

### UC-07: Fire Vehicle Fleet Management

- **Primary Role:** Station Officer (`officer@ferms.test`) or Administrator (`admin@ferms.test`)
- **Preconditions:** Logged in as Station Officer (Station 1) or Admin.
- **Test Steps (Browser):**
  1. Navigate to `/station` and select the **Vehicles** tab.
  2. Verify table of station vehicles showing Registration Number, Type (Engine, Ladder, Rescue, HazMat), and Status (`available`, `dispatched`, `maintenance`).
  3. Click **Add Vehicle** button to launch modal.
  4. Enter unique Registration Number (e.g. `MH-02-FF-5501`) and select vehicle type.
  5. Submit. Verify vehicle appears in list with default status `available`.
  6. Click **Edit** on an available vehicle and toggle its status to `maintenance`. Verify status badge updates and station available vehicle counter decrements.
  7. Toggle vehicle back to `available`.

- **Edge Cases & Error Handling:**
  - **Try this:** Add a vehicle using a registration number that already exists.  
    **Expect:** Operation rejected with `409 Conflict` stating duplicate registration number (UC-07 ext. 2a).
  - **Try this:** Check the status dropdown options when editing a vehicle.  
    **Expect:** Dropdown only allows `available` and `maintenance`. `dispatched` is never selectable manually because it is system-controlled (§5.3).
  - **Try this:** Attempt to delete a vehicle that is currently dispatched on an active incident.  
    **Expect:** API blocks deletion with `409 Conflict` stating vehicle is assigned to an active incident.
  - **Try this:** Station Officer of Station 1 attempts to query or edit vehicles belonging to Station 2.  
    **Expect:** Scoped query restricts view to own station; direct API call returns `403 Forbidden` (`BR-3`).

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

### UC-08: Fire Personnel Station Assignment & Duty Status

- **Primary Role:** Station Officer (`officer@ferms.test`) or Administrator (`admin@ferms.test`)
- **Preconditions:** Seeded firefighters assigned to Station 1.
- **Test Steps (Browser):**
  1. Navigate to `/station` and select the **Personnel** tab.
  2. View personnel list showing Name, Email, Role, Station, and On-Duty status.
  3. Toggle the On-Duty status for a firefighter (e.g. `firefighter@ferms.test`) between `On Duty` and `Off Duty`.
  4. Verify the duty badge updates and the station's on-duty personnel counter reflects the change.
  5. (Admin only) Reassign a firefighter to another station via station assignment selector (`PATCH /api/personnel/:userId/station`).
  6. Verify updated station assignment takes effect immediately.

- **Edge Cases & Error Handling:**
  - **Try this:** Station Officer attempts to change duty status or station of a firefighter from another station.  
    **Expect:** Operation rejected with `403 Forbidden` (`requireOwnStation` check, `BR-3`).
  - **Try this:** Set a firefighter off-duty and then trigger a new incident assignment for that station.  
    **Expect:** The off-duty firefighter does NOT receive a dispatch notification (`Notify.Dispatch` filters by `on_duty = true`).

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

### UC-09: Live Incident Monitoring & Dashboard

- **Primary Role:** Dispatch Operator (`operator@ferms.test`), Station Officer (`officer@ferms.test`), Administrator (`admin@ferms.test`)
- **Preconditions:** Active and resolved incidents exist in database.
- **Test Steps (Browser):**
  1. Log in as Dispatch Operator and open `/dashboard`.
  2. Verify top dark band of `StatTile`s displaying live counts for: `reported`, `unassigned`, `assigned`, `in_progress`, `resolved`, `closed` (`Monitor.Count`).
  3. Verify split layout: Incident Table on left and interactive Leaflet map on right.
  4. Verify map markers: dark station markers and severity-coloured flame markers (Low, Medium, High, Critical) (§14.7).
  5. Test filtering: select status filter (e.g. `assigned`) or station filter. Verify table rows and map markers filter instantaneously.
  6. Check closed incidents: verify `closed` incidents are excluded by default and appear only when toggling `includeClosed`.
  7. Open two browser windows: window A on `/dashboard` (Dispatch Operator) and window B on `/report` (Citizen). Submit an incident in window B.
  8. Verify window A updates stat counters, incident table, and map pins in real time via Socket.io `incident:new` without page refresh.

- **Edge Cases & Error Handling:**
  - **Try this:** Log in as Station Officer (`officer@ferms.test`) and navigate to `/dashboard`.  
    **Expect:** Incident list and stats are automatically scoped to the officer's own station (`Downtown Fire Station 1`).
  - **Try this:** Test dashboard at 360px, 768px, and 1280px screen widths.  
    **Expect:** Layout stacks gracefully on mobile/tablet without horizontal overflow; touch targets remain ≥ 44px (§14.10, W6-V-FE-2).

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

### UC-10: Incident Response & Status Progression

- **Primary Role:** Firefighter (`firefighter@ferms.test`)
- **Preconditions:** An incident is assigned to Firefighter's station with status `assigned`.
- **Test Steps (Browser):**
  1. Log in as Firefighter. Verify automatic redirection to mobile-first "My Assignments" (`/assignments`).
  2. View active assignment card showing severity badge, incident ID, address, and current status `assigned`.
  3. Tap the incident card to navigate to `IncidentDetail` (`/assignments/:id`).
  4. Verify numbered `Stepper` showing 01 Assigned (active), 02 In Progress, 03 Resolved, 04 Closed.
  5. Verify the primary orange status progression button explicitly displays the only allowed next action: **Mark In Progress**.
  6. Click **Mark In Progress**.
  7. Verify:
     - Incident status updates to `in_progress`.
     - `Stepper` advances to step 02 (In Progress).
     - Status history table appends new transition row with timestamp and actor name.
     - Dispatch monitoring dashboard updates in real time via `incident:updated`.

- **Edge Cases & Error Handling:**
  - **Try this:** Attempt an invalid status transition (e.g. attempting to jump directly from `assigned` to `resolved` via API `PATCH /api/incidents/:id/status`).  
    **Expect:** Rejected with `400 Bad Request` (`INVALID_TRANSITION`) returning `allowedNext: ["in_progress"]`.
  - **Try this:** Firefighter of Station 2 (`firefighter2@ferms.test`) attempts to open or update an incident assigned to Station 1.  
    **Expect:** Access blocked with `403 Forbidden` (`BR-3`).

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

### UC-11: Incident Field Logging / Notes

- **Primary Role:** Assigned Firefighter (`firefighter@ferms.test`) or Station Officer (`officer@ferms.test`)
- **Preconditions:** Incident is in `assigned` or `in_progress` status.
- **Test Steps (Browser):**
  1. Open assigned incident in `IncidentDetail` (`/assignments/:id`).
  2. Locate the "Field Notes & Operational Log" section.
  3. Enter situational update in note input: *"Crew deployed two hoses on north flank. Structure evacuated."*
  4. Click **Add Note**.
  5. Verify note is appended immediately to chronological notes timeline with author name, role badge, timestamp, and text.
  6. Switch to Dispatch Operator dashboard or Station Officer view and inspect the same incident.
  7. Verify the field note is visible across all authorized operational views.

- **Edge Cases & Error Handling:**
  - **Try this:** Submit note form with empty text.  
    **Expect:** Client validation prevents submission; API returns `400 Bad Request`.
  - **Try this:** Citizen attempts to submit an incident note via direct API call `POST /api/incidents/:id/notes`.  
    **Expect:** Request rejected with `403 Forbidden` (`Incident.Log`).

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

### UC-12: Incident Resolution and Closure

- **Primary Role:** Assigned Firefighter (`firefighter@ferms.test`) to resolve; Station Officer (`officer@ferms.test`) to close
- **Preconditions:** Incident is in `in_progress` status with reserved vehicles.
- **Test Steps (Browser):**
  1. Log in as Firefighter and open the `in_progress` incident detail (`/assignments/:id`).
  2. Verify the primary button now reads **Resolve Incident**.
  3. Click **Resolve Incident** to open the resolve modal.
  4. Enter a detailed closing summary (e.g. *"Fire contained and extinguished. Thermal camera check clear. No injuries."*) and confirm.
  5. Verify:
     - Incident status transitions to `resolved`.
     - Reserved vehicle(s) in `incident_vehicles` are automatically released: `released_at` is set and vehicle status returns to `available` (`Vehicle.Status.Auto`, `BR-5`).
     - Reporting Citizen receives an in-app notification confirming resolution (`Notify.Citizen`).
     - Stepper advances to step 03 (Resolved).
     - Firefighter sees no further progression buttons (only Station Officer can close).
  6. Log in as Station Officer (`officer@ferms.test`) and open the resolved incident.
  7. Verify the **Close Incident** button is visible.
  8. Click **Close Incident** and confirm.
  9. Verify status transitions from `resolved` to `closed` (step 04 on Stepper).

- **Edge Cases & Error Handling:**
  - **Try this:** In the Resolve modal, attempt to confirm resolution without entering a `closingSummary`.  
    **Expect:** Validation error blocks submission; closing summary is required (`Incident.Resolve`).
  - **Try this:** Attempt to resolve an incident while status is still `assigned` (not `in_progress`).  
    **Expect:** `400 Bad Request` (`INVALID_TRANSITION`); resolution permitted only from `in_progress`.
  - **Try this:** Firefighter attempts to close a resolved incident via `PATCH /api/incidents/:id/close`.  
    **Expect:** `403 Forbidden`; close action is restricted strictly to Station Officer (`BR-4`).
  - **Try this:** Station Officer attempts to close an incident that is currently `in_progress`.  
    **Expect:** `400 Bad Request` (`INVALID_TRANSITION`); close is allowed only from `resolved`.

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

### UC-13: In-App Notifications

- **Primary Role:** Any authenticated user (Citizen, Operator, Firefighter, Officer, Admin)
- **Preconditions:** User is logged in; WebSocket connection active.
- **Test Steps (Browser):**
  1. Log in as Citizen (`citizen@ferms.test`).
  2. Inspect the `NotificationBell` in the header bar.
  3. Verify unread badge shows count of unread notifications (`meta.unreadCount`).
  4. Click `NotificationBell` to open dropdown list.
  5. Verify notification entries show title, message, timestamp, and unread indicator.
  6. Click an unread notification. Verify it is marked as read (`PATCH /api/notifications/:id/read`) and the unread count decrements.
  7. Click **Mark all as read**. Verify all notifications are marked read (`PATCH /api/notifications/read-all`) and unread badge disappears.
  8. Keep Citizen session open in window A. In window B, dispatch or resolve an incident reported by this citizen.
  9. Verify window A receives and renders a new notification in real time via Socket.io `notification:new` without refreshing (`PE-2`).

- **Edge Cases & Error Handling:**
  - **Try this:** Attempt to mark another user's notification as read via direct API call.  
    **Expect:** Operation rejected with `403 Forbidden` or `404 Not Found`; users can only manage their own notifications.
  - **Try this:** Temporarily disconnect network connection and reconnect.  
    **Expect:** Socket automatically reconnects and triggers full re-fetch of current notifications via REST (`Reliability-1`).

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

### UC-14: User Account Management & Role Assignment

- **Primary Role:** Administrator (`admin@ferms.test`)
- **Preconditions:** Logged in as Admin.
- **Test Steps (Browser):**
  1. Navigate to `/admin/users`.
  2. Verify user table listing Name, Email, Role badge, Station assignment, Account Status (`active`/`inactive`), and action controls.
  3. Click **Add User** button to open user creation modal.
  4. Fill in user form:
     - Name: `Station Operator 2`
     - Email: `operator2@ferms.test`
     - Phone: `555-0188`
     - Role: `dispatch_operator`
     - Password: `Passw0rdNewUser!` (≥ 8 chars)
  5. Submit. Verify user is created with bcrypt-hashed password and appears in user table with `active` status.
  6. Click **Edit Role** on a user (e.g. promote Firefighter to Station Officer, `BR-2`).
  7. Verify updated role badge updates in table.
  8. Click **Deactivate** on a target user account (`PATCH /api/users/:id/deactivate`).
  9. Verify target user status updates to `inactive`.
  10. Attempt to log in with the deactivated account or use its existing token. Verify all requests are immediately rejected with `401 Unauthorized` (`Auth.RBAC`, `SE-5`).

- **Edge Cases & Error Handling:**
  - **Try this:** Admin attempts to deactivate their OWN account (`id` equals caller's `req.user.id`).  
    **Expect:** Server rejects request with `400 Bad Request` stating "Cannot deactivate your own account" (UC-14 ext. 6a).
  - **Try this:** Create a user with an email already in use.  
    **Expect:** Rejected with `409 Conflict` duplicate email error.
  - **Try this:** Log in as Citizen, Dispatch Operator, or Firefighter and navigate to `/admin/users`.  
    **Expect:** `ProtectedRoute` intercepts and redirects away; API calls return `403 Forbidden` (`BR-1`).

- **Result:**
  | Status | Tester | Date | Notes |
  |---|---|---|---|
  | Not run | | | |

---

## 3. Summary Table: Use-Case Test Execution Status

| Use Case ID | Title | Primary Role | Status | Tester | Date | Notes |
|---|---|---|---|---|---|---|
| **UC-01** | Citizen Self-Registration | Public / Citizen | Not run | | | |
| **UC-02** | User Authentication & Session Management | Any Role | Not run | | | |
| **UC-03** | Report Fire Incident | Citizen | Not run | | | |
| **UC-04** | Automated Nearest-Station Assignment & Vehicle Reservation | Citizen / Dispatch Operator | Not run | | | |
| **UC-05** | Manual Dispatch Override | Dispatch Operator / Admin | Not run | | | |
| **UC-06** | Fire Station Management | Administrator | Not run | | | |
| **UC-07** | Fire Vehicle Fleet Management | Station Officer / Admin | Not run | | | |
| **UC-08** | Fire Personnel Station Assignment & Duty Status | Station Officer / Admin | Not run | | | |
| **UC-09** | Live Incident Monitoring & Dashboard | Dispatch Operator / Officer / Admin | Not run | | | |
| **UC-10** | Incident Response & Status Progression | Firefighter | Not run | | | |
| **UC-11** | Incident Field Logging / Notes | Firefighter / Station Officer | Not run | | | |
| **UC-12** | Incident Resolution and Closure | Firefighter / Station Officer | Not run | | | |
| **UC-13** | In-App Notifications | Any Role | Not run | | | |
| **UC-14** | User Account Management & Role Assignment | Administrator | Not run | | | |
