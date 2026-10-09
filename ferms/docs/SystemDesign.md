# System Design Document

## for

**Fire Emergency Response Management System (FERMS)**

**Version:** 1.2
**Prepared by:** Parth Goggi (2024300068) & Vedant Ghuge (2024300067)
**Div A, Batch D — Sardar Patel Institute of Technology**
**Companion document to:** SRS for FERMS v1.0, FERMS Use Case Diagram & Descriptions, FERMS Implementation Plan v1.2
**Date created:** October 9, 2026

---

## Revision Summary (v1.1 → v1.2): Visual Design Direction

| # | Change | Reason |
|---|---|---|
| 1 | New **Section 14: Visual Design System & UI Direction** (colour tokens, typography, shape, component kit, per-screen layout rules, accessibility) | Frontend now follows the "FIRECORE" fire-safety landing-page design as inspiration: warm orange on near-black and white, tall condensed headings, pill buttons, rounded cards |
| 2 | Status and severity colours mapped onto the new palette (Section 14.3) | `UI-4` requires consistent colour coding; brand orange must not be confused with severity |
| 3 | Frontend stack: CSS Modules + CSS custom-property tokens, `@fontsource` fonts (Section 3); folder structure gains `styles/`, `assets/`, `components/ui/`, `pages/public/` (Section 6.2) | Put the design system in code |
| 4 | New public **Landing page** at `/` (Sections 6.3, 14.8). It is a UI enhancement, not an SRS feature | Inspiration design is a landing page; it also gives a clear "Report a Fire" entry point (`UI-3`) |
| 5 | New hand-off **H7**: Vedant's design tokens and UI kit are used by Parth's screens (Section 12) | Both tracks share one look |
| 6 | Accessibility and responsive rules added to Section 10 | The reference's white-on-orange text is below WCAG contrast for small text; rules in 14.2 and 14.10 fix this |

The v1.1 changes (schema, endpoints, workflows) are unchanged.

---

## Revision Summary (v1.0 → v1.1)

| # | Change | Reason |
|---|---|---|
| 1 | `users` table: added `on_duty` | `Personnel.Manage` and `Resource.Availability` need an on-duty flag; v1.0 had no column for it |
| 2 | `users.account_status` value `deactivated` renamed to `inactive` | Matches the Use Case document (UC-14 step 7) |
| 3 | `incidents`: added `updated_at`; `incident_vehicles`: added `assigned_at`; `notifications`: added `incident_id` | Sorting, audit of dispatches, and linking a notification to its incident |
| 4 | New endpoints: `GET /incidents/stats`, `GET /incidents/assigned`, `POST /users`, `DELETE /vehicles/:id`, `PATCH /personnel/:userId/station`, `PATCH /notifications/read-all` | Required by `Monitor.Count`, UC-10 step 1, UC-14 step 2, `Vehicle.Manage` (remove), `Personnel.Manage` (assign), `Notify.InApp` |
| 5 | New Section 5.0: API conventions (response envelope, error format, status codes) | Needed so frontend mocks and backend responses match |
| 6 | Dispatch now also **reserves a vehicle** (`incident_vehicles` row + vehicle → `dispatched`); override releases the old vehicle and reserves one at the new station | v1.0 released vehicles on resolve but never said how they were dispatched (`Vehicle.Status.Auto`) |
| 7 | Clarified the state machine: `PATCH /status` moves only `assigned → in_progress`; assignment, resolve, and close have their own endpoints | Removes ambiguity about who triggers which transition |
| 8 | `IncidentVehicle` model added to the backend folder structure (it was missing) | Junction table needs a model |
| 9 | New Section 12: ownership map (which developer builds each component) and Section 13: SRS alignment notes | Parallel work by two developers; SRS still mentions MongoDB |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Database Design](#4-database-design)
5. [API Design](#5-api-design)
6. [Module / Component Design](#6-module--component-design)
7. [Key Workflows](#7-key-workflows)
8. [Incident State-Transition Design](#8-incident-state-transition-design)
9. [Security Design](#9-security-design)
10. [Non-Functional Design Considerations](#10-non-functional-design-considerations)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Ownership Map for Parallel Development](#12-ownership-map-for-parallel-development)
13. [SRS Alignment Notes](#13-srs-alignment-notes)
14. [Visual Design System & UI Direction](#14-visual-design-system--ui-direction)

---

## 1. Introduction

This document translates the functional requirements in the FERMS SRS (v1.0) and the use cases in the companion Use Case document into a concrete technical design: architecture, database schema, API contract, module breakdown, and key workflows. It is the blueprint the two-person development team (Parth Goggi, Vedant Ghuge) builds against.

Every design element is traceable to an SRS requirement ID (e.g., `Auth.Login`) or a use case ID (e.g., `UC-03`).

---

## 2. Architecture Overview

FERMS follows a **three-tier PERN architecture**: a React single-page application (client tier), an Express.js REST + WebSocket API (application tier), and PostgreSQL (data tier).

![FERMS Architecture Diagram](diagrams/architecture.png)
*Figure 1: FERMS Three-Tier Architecture*

### 2.1 Tier Responsibilities

| Tier | Responsibility |
|---|---|
| **Client (React)** | Role-based dashboards for the 5 user classes (SRS §2.3); renders the Leaflet map; talks to the backend over REST (Axios) for CRUD and over WebSocket (Socket.io client) for live incident/notification updates. |
| **Application (Express + Socket.io)** | Exposes the REST API (Section 5); enforces authentication and role-based access control (`Auth.RBAC`) on every route; runs the nearest-station Dispatch Engine (`Dispatch.Assign.Nearest`); owns the incident state machine; pushes real-time events over Socket.io. |
| **Data (PostgreSQL)** | Persists the eight relational tables (`users`, `stations`, `vehicles`, `incidents`, `incident_status_history`, `incident_notes`, `incident_vehicles`, `notifications`), detailed in Section 4. |

### 2.2 Why This Architecture

- **Single JavaScript codebase on a relational store (PERN)**: realistic for a 2-person mini-project team. FERMS entities are naturally relational (a user reports an incident, an incident belongs to a station, a station has many vehicles).
- **Socket.io over the existing HTTP connection** satisfies `CO-2` (no external broker) and the real-time requirements `Monitor.Live`, `Notify.Dispatch`, `Notify.Citizen` (`PE-2`).
- **Stateless REST + JWT** (`CO-3`) keeps the API server free of in-memory session state, which makes restarts during development and demo painless.
- **Contract-first design**: the API (Section 5) is also written as `docs/openapi.yaml`, so frontend work (against MSW mocks) and backend work proceed in parallel.

---

## 3. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React.js (Vite), React Router, Axios, Socket.io-client | Component-based UI for 5 role-specific dashboards (`UI-1`, `UI-2`) |
| Mapping | Leaflet.js + react-leaflet + OpenStreetMap tiles | Free, no API key (`CO-4`, `SI-1`) |
| Styling & fonts | CSS Modules + CSS custom properties (design tokens); `@fontsource/bebas-neue`, `@fontsource/work-sans` | No extra UI framework to learn; tokens give one source of truth for colours and type (`UI-2`, `UI-4`); fonts are bundled by npm, so no runtime call to a font CDN |
| Frontend dev tooling | MSW (Mock Service Worker) | Lets the frontend run against the API contract before the backend endpoint exists |
| Backend | Node.js, Express.js | REST API + RBAC middleware |
| Real-time | Socket.io (server + client) | Live incidents/notifications (`CI-2`) |
| Database | PostgreSQL + Sequelize ORM | Foreign-key relationships; migrations + model validation (`OE-2`, `SI-2`) |
| Auth | JWT (jsonwebtoken), bcrypt | Stateless auth (`CO-3`), salted hashing (`SE-2`) |
| Testing | Jest, Supertest, Postman | Unit tests for dispatch and transitions; API and role tests |
| Deployment | Render / Railway (API), Vercel / Netlify (frontend), Render Postgres / Supabase / Neon (DB) | Free tiers sufficient for demo (`PE-1`) |
| Version Control | Git + GitHub | Two-contributor collaboration |

---

## 4. Database Design

FERMS uses a normalized **PostgreSQL** schema of eight tables. The incident's embedded arrays from the earlier MongoDB design (`statusHistory`, `notes`, `vehicleRefs`) are child tables and a many-to-many junction table.

![FERMS ER Diagram](diagrams/er_diagram.png)
*Figure 2: FERMS Entity-Relationship Diagram (PostgreSQL). Update it to show `users.on_duty`, `incident_vehicles.assigned_at`, and `notifications.incident_id`.*

### 4.1 `users`

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `name` | `VARCHAR(100) NOT NULL` | |
| `email` | `VARCHAR(150) UNIQUE NOT NULL` | `Auth.Register.Validate` |
| `phone` | `VARCHAR(20)` | |
| `password_hash` | `VARCHAR(255) NOT NULL` | bcrypt (`SE-2`); never returned by the API |
| `role` | `VARCHAR(20) NOT NULL` | `CHECK (role IN ('citizen','dispatch_operator','firefighter','station_officer','admin'))` |
| `station_id` | `INTEGER REFERENCES stations(id)` | Nullable; for `firefighter` / `station_officer` |
| `on_duty` | `BOOLEAN NOT NULL DEFAULT false` | **New.** Duty status for station personnel (`Personnel.Manage`); only meaningful for `firefighter` / `station_officer` |
| `account_status` | `VARCHAR(20) NOT NULL DEFAULT 'active'` | `CHECK (account_status IN ('active','inactive'))` (`Admin.User.Manage`) |
| `created_at` | `TIMESTAMP NOT NULL DEFAULT now()` | |

### 4.2 `stations`

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `name` | `VARCHAR(150) NOT NULL` | |
| `address` | `VARCHAR(255) NOT NULL` | |
| `latitude` | `DOUBLE PRECISION NOT NULL` | Haversine input (`AS-2`) |
| `longitude` | `DOUBLE PRECISION NOT NULL` | |
| `contact` | `VARCHAR(100)` | |
| `created_at` | `TIMESTAMP NOT NULL DEFAULT now()` | |

> Optional future optimization: PostGIS `geography(Point)` with `ST_Distance`. Not needed at mini-project scale.

### 4.3 `vehicles`

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `type` | `VARCHAR(50) NOT NULL` | e.g., `fire_engine`, `rescue_van` |
| `registration_no` | `VARCHAR(30) UNIQUE NOT NULL` | Duplicate → `409` (UC-07 ext. 2a) |
| `status` | `VARCHAR(20) NOT NULL DEFAULT 'available'` | `CHECK (status IN ('available','dispatched','maintenance'))` |
| `station_id` | `INTEGER NOT NULL REFERENCES stations(id)` | |

### 4.4 `incidents`

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `reporter_id` | `INTEGER NOT NULL REFERENCES users(id)` | |
| `latitude` | `DOUBLE PRECISION NOT NULL` | Geolocation or manual entry |
| `longitude` | `DOUBLE PRECISION NOT NULL` | |
| `address` | `VARCHAR(255)` | Required when location was entered manually |
| `description` | `TEXT NOT NULL` | |
| `severity` | `VARCHAR(10) NOT NULL` | `CHECK (severity IN ('low','medium','high','critical'))` |
| `status` | `VARCHAR(20) NOT NULL DEFAULT 'reported'` | `CHECK (status IN ('reported','unassigned','assigned','in_progress','resolved','closed'))` |
| `station_id` | `INTEGER REFERENCES stations(id)` | Nullable until assigned |
| `closing_summary` | `TEXT` | Required before resolve |
| `created_at` | `TIMESTAMP NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMP NOT NULL DEFAULT now()` | **New.** Updated on every change |

> **Manual address entry:** the SRS requires manual address entry as a fallback but forbids external paid APIs. If the Citizen types an address and no coordinates are available, the form asks the Citizen to **drop a pin on the Leaflet map** (or click the map) to produce latitude/longitude; the typed address is stored in `address`. No external geocoding call is made.

### 4.5 `incident_status_history`

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `incident_id` | `INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE` | |
| `status` | `VARCHAR(20) NOT NULL` | Status transitioned to |
| `changed_by` | `INTEGER REFERENCES users(id)` | `NULL` for system-made changes (auto-assign) |
| `changed_at` | `TIMESTAMP NOT NULL DEFAULT now()` | `Incident.History` |

A reassignment (`assigned → assigned`) is also written here, so every dispatch and override is timestamped (UC-04 post-condition).

### 4.6 `incident_notes`

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `incident_id` | `INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE` | |
| `author_id` | `INTEGER NOT NULL REFERENCES users(id)` | |
| `note` | `TEXT NOT NULL` | `Incident.Log` |
| `created_at` | `TIMESTAMP NOT NULL DEFAULT now()` | |

### 4.7 `incident_vehicles` (junction)

| Column | Type | Notes |
|---|---|---|
| `incident_id` | `INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE` | |
| `vehicle_id` | `INTEGER NOT NULL REFERENCES vehicles(id)` | |
| `assigned_at` | `TIMESTAMP NOT NULL DEFAULT now()` | **New** |
| `released_at` | `TIMESTAMP` | **New.** Set when the vehicle is released (resolve or reassignment); `NULL` means still on this incident |
| — | `PRIMARY KEY (incident_id, vehicle_id)` | |

### 4.8 `notifications`

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `recipient_id` | `INTEGER NOT NULL REFERENCES users(id)` | |
| `incident_id` | `INTEGER REFERENCES incidents(id) ON DELETE SET NULL` | **New.** Lets the UI link a notification to its incident |
| `type` | `VARCHAR(20) NOT NULL` | `CHECK (type IN ('dispatch','status_update','system'))` |
| `message` | `TEXT NOT NULL` | |
| `read_status` | `BOOLEAN NOT NULL DEFAULT false` | `Notify.InApp` |
| `created_at` | `TIMESTAMP NOT NULL DEFAULT now()` | |

### 4.9 Indexes

| Table | Index | Purpose |
|---|---|---|
| `users` | `UNIQUE (email)` | Login lookup, uniqueness |
| `users` | `CREATE INDEX ON users(station_id, on_duty);` | Find a station's on-duty staff for `Notify.Dispatch` |
| `incidents` | `CREATE INDEX ON incidents(status);` | `Monitor.Filter`, `Monitor.Count` |
| `incidents` | `CREATE INDEX ON incidents(station_id);` | Station filter, `GET /incidents/assigned` |
| `incidents` | `CREATE INDEX ON incidents(reporter_id);` | Citizen's own reports (`SE-4`) |
| `vehicles` | `CREATE INDEX ON vehicles(station_id, status);` | Available-vehicle count and lookup |
| `incident_status_history` | `CREATE INDEX ON incident_status_history(incident_id);` | History lookup |
| `notifications` | `CREATE INDEX ON notifications(recipient_id, read_status);` | Unread list and badge count |

---

## 5. API Design

All endpoints are prefixed `/api`. Every route except `POST /auth/register` (Citizen self-registration) and `POST /auth/login` requires `Authorization: Bearer <JWT>` (`SE-3`). The **Role(s)** column lists who may call the endpoint (Section 9).

### 5.0 API Conventions (both developers follow these)

**Success response:**
```json
{ "data": { ... } }
```
Lists use `{ "data": [ ... ], "meta": { "count": 12 } }`.

**Error response:**
```json
{ "error": { "code": "INVALID_TRANSITION", "message": "Cannot move from assigned to resolved.", "allowedNext": ["in_progress"] } }
```

| HTTP | Meaning | Examples |
|---|---|---|
| `400` | Validation failed / invalid transition | Missing field; `Incident.Status.Invalid` |
| `401` | Missing, expired, or invalid token; deactivated account | `SE-3`, `SE-5` |
| `403` | Authenticated but role or scope not allowed | Citizen calls an Admin route; Station Officer edits another station |
| `404` | Resource not found | |
| `409` | Conflict | Duplicate email or registration number; no available vehicle at target station on override |

Login failures always return `401` with the generic message "Invalid email or password" (`Auth.Login.Fail`). Field names in JSON are `camelCase`; DB columns are `snake_case` (Sequelize maps them).

### 5.1 Auth (`/api/auth`) — Feature 4.1 · Owner: Parth

| Method | Endpoint | Role(s) | Requirement(s) |
|---|---|---|---|
| POST | `/register` | Public (creates a Citizen only) | `Auth.Register`, `Auth.Register.Validate` (email unique, password ≥ 8 chars) |
| POST | `/login` | Public | `Auth.Login`, `Auth.Login.Fail`; rejects `inactive` accounts |
| POST | `/logout` | Any authenticated user | `Auth.Logout` (client discards the token; server returns `200`) |
| GET | `/me` | Any authenticated user | Profile + role |

### 5.2 Incident Creation, Dispatch, Monitoring Reads, and Response (`/api/incidents`) — Features 4.2, 4.4, 4.5

| Method | Endpoint | Role(s) | Requirement(s) | Owner |
|---|---|---|---|---|
| POST | `/` | Citizen | `Incident.Report`, `Incident.Report.Location`, `Dispatch.Assign.Nearest`, `Dispatch.Assign.NoStation`, `Incident.Report.Confirm` | Parth |
| GET | `/mine` | Citizen | Own reports only (`SE-4`) | Parth |
| PATCH | `/:id/assign` | Dispatch Operator, Admin | `Dispatch.Override` (body: `{ stationId }`); allowed only while status ∈ {`reported`, `unassigned`, `assigned`, `in_progress`} (not `resolved` / `closed`) | Parth |
| GET | `/` | Dispatch Operator, Station Officer (own station), Admin | `Monitor.Live`, `Monitor.Filter` (`?status=`, `?stationId=`); excludes `closed` by default (`?includeClosed=true` to include) | Vedant |
| GET | `/stats` | Dispatch Operator, Station Officer (own station), Admin | `Monitor.Count`: `{ reported, unassigned, assigned, in_progress, resolved, closed }` | Vedant |
| GET | `/assigned` | Firefighter, Station Officer | Incidents assigned to the caller's station (UC-10 step 1) | Vedant |
| GET | `/:id` | Reporter, assigned Station staff, Dispatch Operator, Admin | Detail + status history + notes + vehicles | Vedant |
| PATCH | `/:id/status` | Assigned Firefighter, Station Officer | `Incident.Status.Update`, `Incident.Status.Invalid`, `Incident.Status.Transition`. In practice moves `assigned → in_progress`; targets `resolved` / `closed` are rejected with a message pointing to the dedicated endpoints | Vedant |
| POST | `/:id/notes` | Assigned Firefighter, Station Officer | `Incident.Log` | Vedant |
| PATCH | `/:id/resolve` | Assigned Firefighter, Station Officer | `Incident.Resolve` (body: `{ closingSummary }`, required); only from `in_progress`; releases vehicles | Vedant |
| PATCH | `/:id/close` | Station Officer (own station) | `Incident.Close` (only from `resolved`, `BR-4`) | Vedant |

### 5.3 Stations & Resources (`/api/stations`, `/api/vehicles`, `/api/personnel`) — Feature 4.3 · Owner: Vedant

| Method | Endpoint | Role(s) | Requirement(s) |
|---|---|---|---|
| GET | `/stations` | Any authenticated user | List stations (map, dropdowns); includes `availableVehicles` and `onDutyPersonnel` counts (`Resource.Availability`) |
| POST | `/stations` | Admin | `Station.Manage` |
| PATCH | `/stations/:id` | Admin | `Station.Manage` |
| GET | `/stations/:id/vehicles` | Station Officer (own), Admin | `Vehicle.Manage` |
| POST | `/vehicles` | Station Officer (own station), Admin | `Vehicle.Manage` |
| PATCH | `/vehicles/:id` | Station Officer (own station), Admin | `Vehicle.Manage`; manual status values: `available`, `maintenance` (`dispatched` is set only by the system) |
| DELETE | `/vehicles/:id` | Station Officer (own station), Admin | `Vehicle.Manage` (remove); blocked with `409` if the vehicle is on an active incident |
| GET | `/stations/:id/personnel` | Station Officer (own), Admin | `Personnel.Manage` |
| PATCH | `/personnel/:userId/station` | Station Officer (own station), Admin | `Personnel.Manage`: assign a firefighter to a station |
| PATCH | `/personnel/:userId/duty` | Station Officer (own station), Admin | `Personnel.Manage`: body `{ onDuty: true/false }` |

### 5.4 Notifications (`/api/notifications`) — Feature 4.6 · Owner: Parth

| Method | Endpoint | Role(s) | Requirement(s) |
|---|---|---|---|
| GET | `/` | Any authenticated user | `Notify.InApp`; supports `?unread=true`; returns `meta.unreadCount` |
| PATCH | `/:id/read` | Owning user | Mark one read |
| PATCH | `/read-all` | Any authenticated user | Mark all of the caller's notifications read |

### 5.5 User & Operations Management (`/api/users`) — Feature 4.7 · Owner: Parth

| Method | Endpoint | Role(s) | Requirement(s) |
|---|---|---|---|
| GET | `/` | Admin | `Admin.User.Manage` |
| POST | `/` | Admin | Create a user with any role (UC-14 step 2); validates unique email, password ≥ 8, bcrypt-hashed |
| PATCH | `/:id` | Admin | `Admin.User.Manage`, edit profile |
| PATCH | `/:id/role` | Admin | `Admin.User.Role`, `BR-2` |
| PATCH | `/:id/deactivate` | Admin | `Admin.User.Manage`; sets `account_status = 'inactive'`; **rejected with `400` if the target is the caller** (UC-14 ext. 6a) |

### 5.6 Real-Time Events (Socket.io)

The socket handshake carries the JWT; the server rejects unauthenticated connections. On connect, a client joins `user:<id>`, `role:<role>`, and (if staff) `station:<stationId>`.

| Event (server → client) | Emitted When | Sent To | Requirement(s) |
|---|---|---|---|
| `incident:new` | A new incident is created | `role:dispatch_operator`, `role:admin`, assigned `station:<id>` | `Monitor.Live` |
| `incident:updated` | Status, assignment, notes, or resolution changes | Reporter's `user:<id>`, `station:<id>`, `role:dispatch_operator`, `role:admin` | `Monitor.Live`, `Incident.Status.Update` |
| `notification:new` | A notification row is created | `user:<recipientId>` | `Notify.Dispatch`, `Notify.Citizen`, `PE-2` |

On socket reconnect, the client re-fetches its current lists via REST (`Reliability-1`).

---

## 6. Module / Component Design

### 6.1 Backend Folder Structure

```
server/
├── src/
│   ├── config/
│   │   └── db.js                      # Sequelize instance
│   ├── models/                         # one per table + associations
│   │   ├── index.js                    # associations
│   │   ├── User.js
│   │   ├── Station.js
│   │   ├── Vehicle.js
│   │   ├── Incident.js
│   │   ├── IncidentStatusHistory.js
│   │   ├── IncidentNote.js
│   │   ├── IncidentVehicle.js          # junction (new in v1.1)
│   │   └── Notification.js
│   ├── migrations/
│   ├── seeders/
│   │   ├── 01-users.js                 # Parth
│   │   └── 02-stations-vehicles-incidents.js   # Vedant
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── incident.routes.js
│   │   ├── station.routes.js
│   │   ├── vehicle.routes.js
│   │   ├── personnel.routes.js
│   │   └── notification.routes.js
│   ├── controllers/                    # one per routes file
│   ├── middleware/
│   │   ├── auth.middleware.js          # JWT verify, reject inactive accounts
│   │   ├── rbac.middleware.js          # allowRoles(...), station scope
│   │   └── error.middleware.js         # central error format (Section 5.0)
│   ├── services/
│   │   ├── dispatch.service.js         # Haversine + nearest-station + vehicle reservation (Parth)
│   │   ├── notification.service.js      # create + emit (Parth)
│   │   ├── incident-state.service.js    # apply transition + history + emit + notify (Vedant)
│   │   └── resource.service.js          # availability counts, getAvailableVehicle, releaseVehicles (Vedant)
│   ├── domain/
│   │   └── incident.transitions.js      # ALLOWED_TRANSITIONS + allowedNext() (Vedant)
│   ├── sockets/
│   │   └── index.js                    # handshake, rooms, emit helpers (Parth)
│   ├── utils/
│   │   └── haversine.js
│   └── app.js
└── server.js                           # http + socket.io bootstrap
```

### 6.2 Frontend Folder Structure

```
client/
├── src/
│   ├── api/                            # Axios instance + per-resource modules
│   ├── mocks/                          # MSW handlers from openapi.yaml (dev only)
│   ├── context/
│   │   ├── AuthContext.jsx             # JWT + current user/role
│   │   └── SocketContext.jsx           # shared Socket.io connection + reconnect re-sync
│   ├── hooks/                          # useIncidents, useNotifications, useSocketEvent ...
│   ├── styles/                         # tokens.css, base.css, typography.css (Section 14)
│   ├── assets/                         # logo (SVG flame mark), icons, optimised images
│   ├── components/
│   │   ├── common/                     # AppNavbar, ProtectedRoute, NotificationBell, EmergencyCallCard
│   │   ├── ui/                         # design-system primitives (Section 14.6): Button, Badge, Card, ...
│   │   ├── map/                        # LeafletMap, StationMarker, IncidentMarker
│   │   └── incidents/                  # IncidentForm, IncidentCard, StatusBadge, SeverityBadge
│   ├── pages/
│   │   ├── auth/                       # Login, Register (split layout)
│   │   ├── public/                     # Landing (public home page at `/`)
│   │   ├── citizen/                    # ReportIncident, MyReports
│   │   ├── dispatch/                   # MonitoringDashboard, AssignOverride
│   │   ├── firefighter/                # MyAssignments, IncidentDetail
│   │   ├── station/                    # StationResources (vehicles/personnel tabs)
│   │   └── admin/                      # UserManagement, StationManagement
│   ├── routes/
│   │   └── AppRouter.jsx               # role-based route guards (UI-1)
│   └── App.jsx
```

### 6.3 Component-to-Requirement Mapping

| Frontend Area | SRS Feature | Use Cases | Owner |
|---|---|---|---|
| `pages/auth/*`, `AuthContext`, `ProtectedRoute` | 4.1 | UC-01, UC-02 | Parth |
| `pages/citizen/*` | 4.2 | UC-03 | Parth |
| `AssignOverride` | 4.2 | UC-05 | Parth |
| `MonitoringDashboard`, `components/map/*` | 4.4 | UC-09 | Vedant |
| `pages/station/*`, `admin/StationManagement` | 4.3 | UC-06, UC-07, UC-08 | Vedant |
| `pages/firefighter/*` | 4.5 | UC-10, UC-11, UC-12 | Vedant |
| `NotificationBell`, `SocketContext` | 4.6 | UC-13 | Parth |
| `admin/UserManagement` | 4.7 | UC-14 | Parth |
| `pages/public/Landing` | Not an SRS feature (public home page; supports `UI-3`) | none | Parth |
| `components/ui/*`, `styles/*` (design system) | `UI-1`, `UI-2`, `UI-4` | none | Vedant |

---

## 7. Key Workflows

### 7.1 Report Incident, Nearest-Station Assignment, and Vehicle Reservation (UC-03, UC-04)

![Report Incident Flow](diagrams/report_flow.png)
*Figure 3: Report Incident & Nearest-Station Assignment Flow (add a step for vehicle reservation)*

1. Citizen submits the form (`Incident.Report`). Geolocation API supplies coordinates; on denial the Citizen enters an address and drops a map pin (`Incident.Report.Location`). Missing description or severity → `400`, field highlighted.
2. `POST /api/incidents` saves the incident as `reported` and writes the first history row.
3. `dispatch.service` computes the Haversine distance to every station and keeps only stations for which `resource.service.getAvailableVehicle(stationId)` returns a vehicle.
4. **If a station qualifies:** pick the nearest, set `station_id`, reserve one available vehicle (insert `incident_vehicles`, set vehicle `dispatched`), set status `assigned`, write history, and:
   - create `dispatch` notifications for the station's on-duty personnel (`users.station_id = X AND on_duty = true`) (`Notify.Dispatch`);
   - emit `incident:new` to dispatch operators, admins, and the station room.
5. **If none qualify:** status → `unassigned`; notify all dispatch operators (`Dispatch.Assign.NoStation`, `SF-2`).
6. The response returns the incident ID and station name (or `null`) as confirmation (`Incident.Report.Confirm`).

Steps 2 to 5 run in **one database transaction** so a failure cannot leave a vehicle marked `dispatched` without an incident.

### 7.2 Manual Override (UC-05)

1. Dispatch Operator calls `PATCH /api/incidents/:id/assign` with `{ stationId }`.
2. Server rejects with `400` if the incident is `resolved` or `closed` (`Dispatch.Override`, UC-05 ext. 6a). Only `dispatch_operator` / `admin` are allowed (`BR-1`).
3. Server checks the target station has an available vehicle; if not → `409` with a clear message (design decision: an override must not leave the incident with a station but no vehicle).
4. In one transaction: release the previous vehicle(s) (`released_at`, vehicle → `available`), reserve one at the new station, update `station_id`, status → `assigned` (an `unassigned` incident becomes `assigned`), write history.
5. Notify the new station's on-duty personnel and the reporting Citizen; emit `incident:updated`.

### 7.3 Status Update and Resolution (UC-10, UC-11, UC-12)

1. Firefighter opens "My Assignments" (`GET /incidents/assigned`) and selects an incident.
2. `PATCH /:id/status` → server checks the caller belongs to the incident's station, validates the transition (Section 8). Invalid → `400` with `allowedNext`.
3. `POST /:id/notes` appends field notes at any stage (`Incident.Log`).
4. `PATCH /:id/resolve` requires `closingSummary` and status `in_progress`. In one transaction: set status `resolved`, store the summary, release every vehicle in `incident_vehicles` (`released_at`, vehicle → `available`) (`Vehicle.Status.Auto`, `BR-5`), write history. Then notify the reporting Citizen (`Notify.Citizen`) and emit `incident:updated`.
5. A Station Officer later calls `PATCH /:id/close`, allowed only from `resolved` (`BR-4`).

### 7.4 Authentication (UC-01, UC-02)

1. `POST /auth/register` validates (email unique, password ≥ 8), bcrypt-hashes, creates a **Citizen**. Staff accounts are created only through `POST /users` by an Admin.
2. `POST /auth/login` verifies credentials, rejects `inactive` accounts, issues a JWT (24-hour expiry) with `{ userId, role, stationId }`.
3. `auth.middleware` verifies the JWT and re-checks `account_status` on every request, so a deactivated user is locked out immediately, not only at next login. `rbac.middleware` checks the role against the route's allowed roles.

### 7.5 Real-Time Connection (Reliability-1)

1. Client opens the Socket.io connection after login, sending the JWT; the server joins the client to its rooms.
2. If the connection drops, Socket.io reconnects automatically; on `connect` the client re-fetches the current screen's data via REST so no event is lost.

---

## 8. Incident State-Transition Design

![Incident State Diagram](diagrams/state_diagram.png)
*Figure 4: Incident State-Transition Diagram (mirrors SRS Appendix B)*

Transitions are enforced server-side in `domain/incident.transitions.js`, never trusted from the client:

```js
const ALLOWED_TRANSITIONS = {
  reported:     ["assigned", "unassigned"],
  unassigned:   ["assigned"],
  assigned:     ["in_progress", "assigned"],   // assigned→assigned = Dispatch.Override
  in_progress:  ["resolved"],
  resolved:     ["closed"],
  closed:       [],
};
const allowedNext = (status) => ALLOWED_TRANSITIONS[status];
```

Who triggers which transition:

| Transition | Endpoint | Role(s) |
|---|---|---|
| `reported → assigned` / `unassigned` | `POST /incidents` (system, via dispatch engine) | System |
| `unassigned → assigned`, `assigned → assigned` | `PATCH /:id/assign` | Dispatch Operator, Admin |
| `assigned → in_progress` | `PATCH /:id/status` | Assigned Firefighter, Station Officer |
| `in_progress → resolved` | `PATCH /:id/resolve` | Assigned Firefighter, Station Officer |
| `resolved → closed` | `PATCH /:id/close` | Station Officer |

Any request whose target state is not in the current state's allowed list is rejected with `400` and `allowedNext` in the body (`Incident.Status.Invalid`). All transitions go through `incident-state.service`, which writes the history row, updates `updated_at`, and emits `incident:updated`.

---

## 9. Security Design

### 9.1 Authentication Flow

- Passwords hashed with **bcrypt** (cost 10) (`SE-2`); never logged.
- JWT signed with `JWT_SECRET` from `.env`, 24-hour expiry (`CO-3`, `SE-5`).
- `Authorization: Bearer <token>` verified on every protected route (`SE-3`); `account_status` re-checked each request.

### 9.2 Role-Based Access Control (RBAC) Matrix

| Action | Citizen | Dispatch Operator | Firefighter | Station Officer | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Report incident | ✅ | — | — | — | — |
| View own incidents | ✅ | — | — | — | — |
| View all incidents / stats | — | ✅ | — | ✅ (own station) | ✅ |
| View assigned incidents | — | — | ✅ (own station) | ✅ (own station) | — |
| Override station assignment | — | ✅ | — | — | ✅ |
| Update status / add notes / resolve | — | — | ✅ (own station) | ✅ (own station) | — |
| Close incident | — | — | — | ✅ (own station) | — |
| Manage vehicles / personnel | — | — | — | ✅ (own station) | ✅ |
| Manage stations | — | — | — | — | ✅ |
| Manage users / change roles | — | — | — | — | ✅ |
| View own notifications | ✅ | ✅ | ✅ | ✅ | ✅ |

Enforced as a role list per route in `rbac.middleware.js`, implementing `BR-1` to `BR-3`.

### 9.3 Data-Level Access Control

- `GET /incidents/mine` uses `WHERE reporter_id = req.user.id`; `GET /incidents/:id` additionally verifies the caller is the reporter, belongs to the assigned station, or is a dispatch operator/admin (`SE-4`).
- Station Officer queries for vehicles/personnel/incidents are scoped with `station_id = req.user.stationId` unless the caller is `admin` (`BR-3`).
- Firefighters and Station Officers can update or resolve an incident only if `incident.station_id === req.user.stationId`.

### 9.4 Transport Security

- HTTPS in production (`SE-1`, `CI-1`) via the hosting platform's TLS termination. Socket.io connections use `wss`.

### 9.5 Input Validation

- Request bodies validated server-side (type, length, enum values); Sequelize parameterised queries prevent SQL injection; user-provided text is rendered as text, never as HTML, on the client.

---

## 10. Non-Functional Design Considerations

| SRS Requirement | Design Response |
|---|---|
| `PE-1` (20–30 concurrent users) | A single Node.js process with a free-tier PostgreSQL instance handles this load; Sequelize's built-in pool is sufficient. |
| `PE-2` (notifications within 5s) | Socket emits occur right after the DB write, with no polling or queue. |
| `PE-3` (reads within 3s) | Indexes in §4.9; list endpoints return only the fields needed. |
| `PE-4` (nearest-station within 5s) | Haversine over tens of stations runs in milliseconds in memory; no external geocoding call. |
| `SF-1` (reporting never blocked) | The report form is a standalone route with no non-essential widgets; manual location fallback ensures submission is never blocked on location permission. |
| `Reliability-1` (reconnect) | Socket.io auto-reconnect + REST re-fetch on `connect` (§7.5). |
| `Maintainability-1` (modular backend) | One routes/controller pair per feature area; business logic in services (§6.1). |
| `Usability-1` (first report under 2 minutes) | Single-screen form, auto-filled location, severity as four large buttons. |
| `UI-2` (responsive) | Mobile-first layouts; Firefighter and Citizen screens designed at phone width first (Section 14.10). |
| `UI-4` (consistent colour coding) | One status/severity colour map in `tokens.css`, consumed only through the `Badge` component (Section 14.3). |
| `SF-1` (reporting never delayed) | The report form route loads no hero images, marquee, or animations; fonts and CSS only (Section 14.7). |
| Accessibility (design goal) | WCAG AA text contrast, visible focus rings, 44px touch targets, status never conveyed by colour alone (Section 14.10). |

---

## 11. Deployment Architecture

| Component | Platform | Notes |
|---|---|---|
| Frontend (React build) | Vercel or Netlify (free tier) | Static hosting, auto-deploy from GitHub |
| Backend (Express + Socket.io) | Render or Railway (free tier) | Needs persistent WebSocket support |
| Database | PostgreSQL: Render Postgres, Supabase, or Neon (free tier) | `OE-2` |
| Environment variables | Platform dashboards | Server: `JWT_SECRET`, `DATABASE_URL`, `CLIENT_URL`. Client: `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_USE_MOCKS=false` |

```
GitHub repo
   ├── /client  → auto-deploys to Vercel on push to main
   └── /server  → auto-deploys to Render on push to main
                        │
                        ▼
              PostgreSQL (Render / Supabase / Neon)
```

---

## 12. Ownership Map for Parallel Development

Two vertical tracks, each with backend and frontend. Details and weekly schedule are in the Implementation Plan (Sections 6 and 7).

| Area | Backend | Frontend |
|---|---|---|
| **Parth: Track 1** | Auth, Users (Admin), `POST /incidents`, `/incidents/mine`, `/assign`, dispatch engine, notification service + endpoints, Socket.io server | Login/Register, `AuthContext`, `ProtectedRoute`, `SocketContext`, `IncidentForm`, `MyReports`, `NotificationBell`, `AssignOverride`, `UserManagement`, public `Landing` page, auth-screen styling |
| **Vedant: Track 2** | Stations, Vehicles, Personnel, `resource.service`, incident reads (`GET /`, `/stats`, `/assigned`, `/:id`), state machine, `/status`, `/notes`, `/resolve`, `/close` | Foundation + router + design tokens and UI kit, `MonitoringDashboard` + map, `StationManagement`, `StationResources`, `MyAssignments`, `IncidentDetail` |

**Hand-offs between tracks:**

| # | Hand-off | Direction |
|---|---|---|
| H1 | `auth.middleware` and `rbac.middleware` | Parth → Vedant |
| H2 | Frozen `Incident` / `Vehicle` / `Notification` models and contract | Joint, end of Week 1 |
| H3 | `resource.service.getAvailableVehicle()` / `releaseVehicles()` used by `dispatch.service` | Vedant → Parth |
| H4 | `notification.service.notify()` and socket emit helpers used by the state service | Parth → Vedant |
| H5 | `AssignOverride` component embedded in `MonitoringDashboard` | Parth → Vedant |
| H6 | `SocketContext` used by dashboard and assignment pages | Parth → Vedant |
| H7 | Design tokens + UI kit (`Button`, `Card`, `Badge`, `FormField`, `Modal`, ...) used by every screen | Vedant → Parth |

---

## 13. SRS Alignment Notes

The design follows the SRS requirement IDs. The following SRS text should be updated in the next SRS revision so the documents agree:

| SRS location | Current text | Suggested update |
|---|---|---|
| §1.1, §1.3, `CO-1` | MERN stack (MongoDB) | PERN stack (PostgreSQL) |
| `OE-2` | Database: MongoDB (Atlas) | Database: PostgreSQL (Render Postgres / Supabase / Neon) |
| `SI-2` | Persist data in MongoDB collections | Persist data in PostgreSQL tables, per System Design §4 |
| §6 Other Requirements | MongoDB collections with indexes on status and email | PostgreSQL tables with the indexes in System Design §4.9 |
| Appendix A | MongoDB collections; embedded `statusHistory` | Eight relational tables; `incident_status_history` child table |
| `Auth.Register` / UC-01 | Admin creates non-Citizen accounts | Implemented via `POST /users` (Admin only), not `/auth/register` |
| Appendix B | Four core states plus exception path | Add the `assigned → assigned` override self-transition and the `unassigned → assigned` manual-dispatch edge to the table |
| `Incident.Report.Location` | Manual address entry as fallback | Clarify: typed address plus map pin (no paid geocoding) |
| UC-14 step 7 | `accountStatus` set to `inactive` | Used as-is in this design |
| `UI-3` (report form within two clicks of login) | Reached from the dashboard | Also satisfied from the public Landing page: "Report a Fire" leads to login/register, then straight to the report form |
| §2.2 Product Functions / §4 System Features | No public home page listed | Add a one-line note that a non-functional public landing page is included for presentation (Section 14.8) |

---

## 14. Visual Design System & UI Direction

### 14.1 Inspiration and What We Take From It

The reference is the "FIRECORE" fire-safety landing page (Dribbble). We take its **direction** (colour, type, shapes, section patterns) and apply it to FERMS. We do **not** reuse its photos, copy text, brand name, logo, or invented statistics.

| What the reference does | How FERMS uses it |
|---|---|
| Vivid orange as the single brand colour, on white, warm off-white, and near-black | Same: orange for primary actions and highlights; dark surfaces for emphasis (Section 14.2) |
| Tall, condensed, all-caps display headings; small orange eyebrow label above each heading | Same for headings, nav, buttons, big numbers; eyebrow labels on landing sections |
| Floating, rounded, light-grey navigation bar with one orange pill button | App and landing navbar (Section 14.6) |
| Rounded cards (about 16 to 24px), soft grey-white card backgrounds | All cards, modals, tables-in-cards |
| Numbered list (01 to 04) with the active number in an orange tab | Report-form steps; incident progress stepper; landing "key features" |
| Orange marquee band and outline-text marquee | Landing page only (decorative, pauses on hover, off for reduced motion) |
| Dark floating "Call us for emergency" card | `EmergencyCallCard` on landing and report form |
| Dark band with big white numerals and short captions | Dashboard status-count tiles (`Monitor.Count`) |
| Flame-shaped service cards | Landing "Built for five roles" section |
| 3 step cards ("Step 01, 02, 03") | Landing "How it works" and report-form stepper |
| Giant outlined wordmark in the dark footer | Landing footer |
| Testimonials, blog posts, team slider, contact form, invented stats (12K+, 95%) | **Not used.** Out of scope, and the numbers would be fabricated |

### 14.2 Colour Tokens

Hex values are read by eye from the screenshots, so confirm them with an eyedropper and adjust in `tokens.css` if needed. No screen may hard-code a hex value; everything uses a token.

| Token | Value | Use |
|---|---|---|
| `--color-brand` | `#FF6A00` | Primary buttons, active tabs, icon circles, marquee band, highlights |
| `--color-brand-hover` | `#E55F00` | Button hover/pressed |
| `--color-brand-tint` | `#FFF1E6` | Soft orange backgrounds (selected row, info banner) |
| `--color-brand-text` | `#C2410C` | Orange **text** on light backgrounds (eyebrow labels, links): `#FF6A00` is too light for small text on white |
| `--color-ink` | `#111111` | Headings, text on orange |
| `--color-dark` | `#1A1814` | Dark sections, footer, floating cards (warm black as in the reference) |
| `--color-dark-2` | `#25221D` | Raised surfaces on dark |
| `--color-bg` | `#FFFFFF` | Page background |
| `--color-bg-warm` | `#F4F2EE` | Alternate section background (services-style bands) |
| `--color-card` | `#F6F8F8` | Card background on white |
| `--color-border` | `#E7E5E0` | Hairlines, table borders |
| `--color-text` | `#1F1F1F` | Body text |
| `--color-muted` | `#6B6B6B` | Secondary text (5.3:1 on white) |

**Contrast rule (important):** the reference puts white text on orange. White on `#FF6A00` is only about 2.9:1, below the 4.5:1 AA minimum for normal text. In FERMS, **orange buttons and bands use `--color-ink` text** (about 6.5:1), and white text on orange is allowed only for large display text (24px and above).

### 14.3 Status and Severity Colours (`UI-4`)

Brand orange is used for *actions*, so it is not reused as a severity colour. Badges are always **tinted background + dark text + small icon + text label**, so meaning never depends on colour alone.

| Severity | Token | Value | | Status | Token | Value |
|---|---|---|---|---|---|---|
| Low | `--sev-low` | `#667085` (slate) | | Reported | `--st-reported` | `#475467` (slate) |
| Medium | `--sev-medium` | `#F2B705` (hi-vis yellow, from the reference's gear) | | Unassigned | `--st-unassigned` | `#D92D20` (red, with an alert icon and the label "Needs dispatch") |
| High | `--sev-high` | `#D9480F` (burnt orange) | | Assigned | `--st-assigned` | `#2563EB` (blue) |
| Critical | `--sev-critical` | `#D92D20` (red, as `UI-4` requires) | | In Progress | `--st-progress` | `#FF6A00` (brand orange; badge text stays dark) |
| | | | | Resolved | `--st-resolved` | `#16A34A` (green, as `UI-4` requires) |
| | | | | Closed | `--st-closed` | `#98A2B3` (grey) |

### 14.4 Typography

| Role | Font | Notes |
|---|---|---|
| Display / headings, nav, buttons, big numerals, badges | **Bebas Neue** (fallback `Oswald`, `Impact`, sans-serif) | Caps-only, single weight. Use for short text only. Never for paragraphs, table cells, form inputs, or notes |
| Body, forms, tables, notes, notifications | **Work Sans** (fallback `system-ui`) | Weights 400, 500, 600 |

| Style | Size (desktop / phone) | Line height |
|---|---|---|
| Hero heading | 96px / 52px | 0.95 |
| Section heading | 56px / 36px | 1.0 |
| Card or modal heading | 28px / 24px | 1.1 |
| Eyebrow label (orange, caps) | 16px | 1 |
| Body | 16px | 1.6 |
| Small / caption | 14px | 1.5 |

Bebas Neue is bundled with `@fontsource` packages, loaded with `font-display: swap`, so text shows immediately and the report form is never delayed (`SF-1`).

### 14.5 Shape, Spacing, Elevation

| Token | Value |
|---|---|
| `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-pill` | `8px` / `16px` / `24px` / `999px` |
| Spacing scale | 4, 8, 12, 16, 24, 32, 48, 64, 96 px |
| Page max width | 1200px content width, 16px side gutter on phones |
| Elevation | Mostly flat (hairline border). One soft shadow `0 8px 24px rgba(17,17,17,.08)` for floating elements (navbar, modals, emergency card) |
| Focus ring | 3px `--color-brand` outline with 2px offset, visible on every interactive element |

```css
/* client/src/styles/tokens.css (excerpt) */
:root {
  --color-brand: #FF6A00;  --color-brand-hover: #E55F00;
  --color-brand-tint: #FFF1E6;  --color-brand-text: #C2410C;
  --color-ink: #111111;  --color-dark: #1A1814;  --color-dark-2: #25221D;
  --color-bg: #FFFFFF;  --color-bg-warm: #F4F2EE;
  --color-card: #F6F8F8;  --color-border: #E7E5E0;
  --color-text: #1F1F1F;  --color-muted: #6B6B6B;

  --sev-low: #667085;  --sev-medium: #F2B705;  --sev-high: #D9480F;  --sev-critical: #D92D20;
  --st-reported: #475467;  --st-unassigned: #D92D20;  --st-assigned: #2563EB;
  --st-progress: #FF6A00;  --st-resolved: #16A34A;  --st-closed: #98A2B3;

  --font-display: 'Bebas Neue', 'Oswald', Impact, sans-serif;
  --font-body: 'Work Sans', system-ui, sans-serif;
  --radius-sm: 8px;  --radius-md: 16px;  --radius-lg: 24px;  --radius-pill: 999px;
}
```

### 14.6 Component Kit (`components/ui/`, built by Vedant in Weeks 1 to 2)

| Component | Description | Used in |
|---|---|---|
| `Button` | Variants: `primary` (orange pill, ink text), `dark` (near-black pill), `ghost` (outlined); sizes; loading state; min height 44px | Everywhere |
| `Badge` | `status` and `severity` variants from Section 14.3; icon + label | Dashboard, lists, detail, MyReports |
| `Card` | Rounded container; variants `light`, `warm`, `dark`, `accent` (orange) | Everywhere |
| `SectionHeading` | Orange eyebrow label + condensed heading + optional intro text | Landing, dashboards |
| `StatTile` | Big Bebas numeral + caption, on dark or light | `Monitor.Count` on the dashboard; station availability |
| `Stepper` / `StepCard` | Numbered 01, 02, 03 items; active number in an orange tab | Report form, incident progress, landing |
| `FormField`, `Select`, `SeverityPicker` | Underlined or soft-boxed inputs with labels and inline errors; `SeverityPicker` is four large buttons | All forms, report form |
| `Table` | Light table inside a `Card`; sticky header; row hover; responsive collapse to stacked cards on phones | Users, vehicles, personnel, incident list |
| `Tabs` | Pill tabs | Vehicles / Personnel tabs |
| `Modal`, `Toast`, `EmptyState`, `Skeleton` | Standard feedback components | Everywhere |
| `AppNavbar` (in `common/`) | Floating rounded light-grey bar, logo left, role-based links centre, orange pill (or avatar and `NotificationBell`) right; collapses to a drawer on phones | All pages |
| `EmergencyCallCard` (in `common/`) | Dark rounded card: "Emergency? Call 101 (Fire) or 112", orange phone circle. Numbers come from one constant so they can be changed | Landing hero, report form sidebar |
| `Marquee` | Looping orange band with short phrases | Landing only |
| `FlameCard` | White flame-shaped card with an icon and label | Landing roles section |

### 14.7 Layout by Surface

| Surface | Look and behaviour |
|---|---|
| **Landing (`/`)** | Full reference-style experience (Section 14.8). Public |
| **Login / Register** | Split layout: form on a white `Card` on one side, a dark panel with the logo, a short line, and the flame mark on the other (panel hidden on phones). No heavy photo |
| **Citizen: Report form** | Calm, fast, single screen (`SF-1`, `Usability-1`). White page, one `Card`, three numbered steps (01 Location, 02 Details, 03 Confirm), `SeverityPicker`, big orange submit button, `EmergencyCallCard` beside the form (stacked above it on phones), and a visible line: "Call 101 or 112 if anyone is in danger. FERMS does not replace emergency calls." **No hero image, marquee, or animation on this route** |
| **Citizen: MyReports** | List of `Card`s with `Badge`s and a live status stepper |
| **Dispatch / Station / Admin: Monitoring dashboard** | Top row: dark band of `StatTile`s (one per status, `Monitor.Count`). Below: filters, then incident list (left) and Leaflet map (right) in `Card`s; stacked on tablets and phones. Map markers: dark station pins; incident flame pins coloured by severity token |
| **Station and Admin management pages** | `Tabs` + `Table` inside `Card`s; orange primary "Add" button; modal forms |
| **Firefighter: MyAssignments / IncidentDetail** | Mobile-first. Large `Card`s, 48px buttons, one big orange "next status" button showing only the allowed next state, notes field, resolve modal with closing summary. Progress shown as a numbered `Stepper` (01 Assigned, 02 In Progress, 03 Resolved, 04 Closed) |
| **Admin: UserManagement** | `Table` with role `Badge`s; `Modal` for create/edit |

### 14.8 Landing Page Structure (public, `/`)

A presentation page; it adds no backend work and is not an SRS feature. Copy is our own and states only true things about the project (no invented customer counts or testimonials).

| # | Section | Content |
|---|---|---|
| 1 | **Hero** | Dark image-backed band with `AppNavbar` floating over it. Eyebrow: "Fire Emergency Response Management". Heading: "Report a fire. Reach the nearest station." Buttons: **Report a Fire** (orange) and **Log In** (ghost). `EmergencyCallCard` floating at the lower right |
| 2 | **Marquee band** | Orange band: "Real-time dispatch", "Nearest-station assignment", "Live incident tracking", "Built for five roles" |
| 3 | **About / Why FERMS** | Heading, short paragraph, an orange `Card` with two points (for example "Report in seconds" and "Dispatch with confidence"), one supporting image |
| 4 | **Key features** | Numbered list 01 to 04 with the active item in an orange tab, next to an image: Location-aware reporting, Nearest-station dispatch, Live monitoring, Resolve and close with history |
| 5 | **Built for five roles** | Four or five `FlameCard`s (Citizen, Dispatch Operator, Firefighter, Station Officer, Administrator) over a warm band; below it a dark band of **true** facts as `StatTile`s: "5 user roles", "4 severity levels", "Live updates", "5 s nearest-station target" (`PE-4`) |
| 6 | **How it works** | Three `StepCard`s: Report, Dispatch, Resolve |
| 7 | **Call to action** | Dark rounded `Card`: "Need to report a fire now?" with the Report button |
| 8 | **Footer** | Dark footer: logo, links (Home, How it works, Log in, Register), project credit line (team and institute), giant outlined "FERMS" wordmark |

Skipped from the reference: testimonials, blog, team slider, contact form.

### 14.9 Imagery, Icons, Motion

- **Images:** do not reuse the Dribbble photos. Use our own, royalty-free photos (check the licence on Unsplash or Pexels), or SVG illustrations. Compress to WebP, lazy-load, and give every image alt text. If an image fails to load, the hero falls back to the dark colour.
- **Logo:** simple SVG flame mark plus the word "FERMS" in Bebas Neue. Do not copy the reference's logo.
- **Icons:** one outline icon set (for example Lucide), 1.5px stroke, so icons match the line-art style in the reference.
- **Motion:** subtle only: hover colour change, 150 to 200 ms transitions, marquee on the landing page. All animation respects `prefers-reduced-motion`.
- **Leaflet:** OSM tiles with custom `divIcon` markers (dark station pin, severity-coloured flame pin) built from tokens.

### 14.10 Accessibility and Responsive Rules

- Body text contrast at least 4.5:1; large text at least 3:1 (see the orange rule in Section 14.2).
- Every interactive element has a visible focus ring and can be used with the keyboard; touch targets at least 44 by 44 px.
- Status and severity always show a text label and icon, never colour alone.
- Marquee and any moving content pause on hover/focus and are disabled with reduced motion.
- Breakpoints: 640px (phone), 1024px (tablet), 1280px (desktop). Layouts are designed phone-first. Tables collapse into stacked cards on phones.
- Headings follow a logical order (`h1` once per page); form fields have labels and error text linked with `aria-describedby`.
- Target: Lighthouse accessibility score of 90 or more on Landing, Login, and the Report form.

---

*End of System Design Document*
