# Implementation Plan

## for

**Fire Emergency Response Management System (FERMS)**

**Version:** 1.2
**Prepared by:** Parth Goggi (2024300068) & Vedant Ghuge (2024300067)
**Div A, Batch D — Sardar Patel Institute of Technology**
**Companion document to:** SRS for FERMS v1.0, FERMS Use Case Diagram & Descriptions, FERMS System Design Document v1.2
**Date created:** October 9, 2026

---

## Revision Summary (v1.1 → v1.2): Visual Design Direction

| Change | Why |
|---|---|
| Frontend follows the "FIRECORE" fire-safety landing-page design as inspiration: orange on near-black and white, condensed caps headings, pill buttons, rounded cards. Full spec in **System Design Section 14** | Requested design direction |
| New frontend tasks: design tokens, fonts, logo, UI kit (`components/ui/`), custom map markers (B1.5, B1.8 to B1.10) | One shared look, built once, used by both tracks |
| New public **Landing page** at `/` (Parth, Week 7) and split-layout auth screens | Matches the reference; an enhancement, not an SRS feature, so it is scheduled last and is the first thing cut if time runs short |
| New hand-off **H7**: Vedant's tokens and UI kit are used by Parth's screens (end of Week 1 for basics) | Both tracks need the same components |
| New Section B.4 "Applying the Visual Design" and extra "done when" checks (tokens only, contrast, Lighthouse) | Makes the design testable |
| Timeline, testing, risks, and deliverables updated | Keeps the plan consistent |

The v1.1 changes (Backend/Frontend parts, parallel tracks) are unchanged.

---

## Revision Summary (v1.0 → v1.1)

| Change | Why |
|---|---|
| Section 4 and 5 are now **Part A: Backend** and **Part B: Frontend**, covering all seven SRS features together, instead of seven module-by-module sections | Requested restructure |
| Added a **contract-first, two-track** way of working (Sections 3.3 and 6) | Lets Parth and Vedant each build backend **and** frontend in parallel without waiting for each other |
| Every API endpoint, service, page and component now has a named **owner** (P = Parth, V = Vedant) | No ambiguity about who builds what |
| Week-by-week timeline now shows four lanes: Parth-BE, Parth-FE, Vedant-BE, Vedant-FE | Shows the parallel work explicitly |
| Added the endpoints and fields the SRS/use cases need that v1.0 was missing (see System Design v1.1, Section 12) | Closes requirement gaps (`Monitor.Count`, `Personnel.Manage`, `Vehicle.Manage` remove, etc.) |

---

## Table of Contents

1. [Objective](#1-objective)
2. [Technology Stack Summary](#2-technology-stack-summary)
3. [Project Setup & Ways of Working](#3-project-setup--ways-of-working)
4. [Part A — Backend Implementation](#4-part-a--backend-implementation)
5. [Part B — Frontend Implementation](#5-part-b--frontend-implementation)
6. [Team Role Division (Parallel Tracks)](#6-team-role-division-parallel-tracks)
7. [Development Timeline](#7-development-timeline)
8. [Testing Strategy](#8-testing-strategy)
9. [Deployment Plan](#9-deployment-plan)
10. [Risk & Mitigation](#10-risk--mitigation)
11. [Deliverables Checklist](#11-deliverables-checklist)

---

## 1. Objective

Build and deliver Release 1.0 of FERMS, as scoped in the SRS (mini-project scope, **PERN stack**: PostgreSQL, Express, React, Node; 7 features; 5 user roles), as a working, demonstrable web application within an academic-project timeline. Every delivered feature must trace to an SRS requirement ID and a use case ID.

The work is organised as **one Backend part and one Frontend part**. Each part covers all seven SRS features. Both team members work on **both parts at the same time**, each on their own vertical track (Section 6).

---

## 2. Technology Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React.js (Vite), React Router, Axios, Socket.io-client, Leaflet.js + react-leaflet, MSW (mock API, dev only), CSS Modules + CSS custom-property design tokens, `@fontsource/bebas-neue` + `@fontsource/work-sans`, Lucide icons |
| Backend | Node.js, Express.js, Socket.io |
| Database | PostgreSQL + Sequelize ORM |
| Auth | JWT, bcrypt |
| Hosting | Vercel/Netlify (frontend), Render/Railway (backend), Render Postgres / Supabase / Neon (DB) |
| Tooling | Git/GitHub, Postman, Jest, ESLint/Prettier |

*(Rationale in System Design, Section 3.)*

---

## 3. Project Setup & Ways of Working

### 3.1 Repository Structure

```
ferms/
├── client/          # React frontend (System Design §6.2)
├── server/          # Express backend (System Design §6.1)
├── docs/
│   ├── SRS.md, UseCases.md, SystemDesign.md, ImplementationPlan.md
│   ├── openapi.yaml           # the API contract both of you build against
│   └── postman/               # exported Postman collection
└── README.md
```

### 3.2 Initial Setup Steps (Week 1)

1. Create a shared GitHub repository; both members clone it.
2. `server/`: `npm init`, install `express pg pg-hstore sequelize sequelize-cli bcrypt jsonwebtoken socket.io cors dotenv`; dev: `jest supertest nodemon`.
3. `client/`: `npm create vite@latest client -- --template react`, install `axios react-router-dom socket.io-client leaflet react-leaflet`; dev: `msw`. Also install the design fonts and icons: `@fontsource/bebas-neue @fontsource/work-sans lucide-react`.
4. Create a free PostgreSQL instance (Render Postgres, Supabase, or Neon). Each developer should use **their own database** (a second free instance, or a local Postgres) so migrations in progress do not break each other. Keep `DATABASE_URL` in `server/.env`, never committed.
5. `npx sequelize-cli init`; write one migration per table (System Design §4). Migrations are split between you two (see Section 7, Week 1).
6. Add `.env.example` in `client/` and `server/`.
7. Branching: `main` (demo-ready), `dev` (integration), short-lived `feature/<track>-<thing>` branches. Both approve each other's PRs into `dev`.

### 3.3 Contract-First Parallel Development

This is what makes parallel work possible:

1. **Week 1, together:** write `docs/openapi.yaml` covering every endpoint in System Design §5 (path, method, role, request body, response body, error codes). Also fix the response envelope and error format (System Design §5.0).
2. **Backend developers** implement against the contract.
3. **Frontend developers** build against **MSW mock handlers** generated from the same contract (`client/src/mocks/`), so every page can be built and demoed before its real endpoint exists. Switching from mock to real is one environment flag (`VITE_USE_MOCKS=false`).
4. **Contract changes** go through a small PR to `docs/openapi.yaml`, approved by both, before either side changes code.
5. **Frozen early:** the Sequelize models and the contract for `Incident`, `Vehicle`, and `Notification` are frozen at the end of Week 1, because both tracks touch them.

---

## 4. Part A — Backend Implementation

All backend work for all seven SRS features. **Owner** column: **P** = Parth, **V** = Vedant.

### A.1 Foundation

| # | Task | Owner | Notes |
|---|---|---|---|
| A1.1 | Express app wiring (`app.js`), `server.js` with http + Socket.io bootstrap, CORS, JSON parsing, central error handler | P | Uses the error format from System Design §5.0 |
| A1.2 | `config/db.js` (Sequelize instance), model associations file | P | Associations match System Design §4 |
| A1.3 | Migrations: `users`, `notifications`, `incidents` | P | |
| A1.4 | Migrations: `stations`, `vehicles`, `incident_status_history`, `incident_notes`, `incident_vehicles` | V | |
| A1.5 | Sequelize models for all eight tables | P: User, Incident, Notification. V: Station, Vehicle, IncidentStatusHistory, IncidentNote, IncidentVehicle | |
| A1.6 | `docs/openapi.yaml` | P + V | Together, Week 1 |

### A.2 Cross-Cutting Middleware and Services

| # | Component | Owner | Requirement(s) |
|---|---|---|---|
| A2.1 | `auth.middleware.js` (JWT verify, reject deactivated accounts) | P | `Auth.RBAC`, `SE-3`, `SE-5` |
| A2.2 | `rbac.middleware.js` (`allowRoles(...)`, station-scope helper) | P | `Auth.RBAC`, `BR-1` to `BR-3` |
| A2.3 | `utils/haversine.js`, `dispatch.service.js` | P | `Dispatch.Assign.Nearest`, `PE-4` |
| A2.4 | `notification.service.js` (create row + emit) | P | `Notify.*`, `PE-2` |
| A2.5 | `sockets/index.js` (JWT handshake, rooms per user, role, station; `emitToUser/Role/Station` helpers) | P | `Monitor.Live`, `CI-2` |
| A2.6 | `incident.transitions.js` (transition table + `allowedNext()`), `incident-state.service.js` (apply a transition + write history + emit + notify) | V | `Incident.Status.*`, `Incident.History` |
| A2.7 | `resource.service.js` (available-vehicle count, on-duty count, vehicle release) | V | `Resource.Availability`, `Vehicle.Status.Auto` |

### A.3 REST Endpoints

*Full request/response shapes are in System Design §5 and `openapi.yaml`.*

| Area | Endpoints | SRS Feature · UC | Owner |
|---|---|---|---|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | 4.1 · UC-01, UC-02 | P |
| **Users (Admin)** | `GET /users`, `POST /users`, `PATCH /users/:id`, `PATCH /users/:id/role`, `PATCH /users/:id/deactivate` | 4.7 · UC-14 | P |
| **Incident creation and dispatch** | `POST /incidents`, `GET /incidents/mine`, `PATCH /incidents/:id/assign` | 4.2 · UC-03, UC-04, UC-05 | P |
| **Notifications** | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` | 4.6 · UC-13 | P |
| **Stations** | `GET /stations`, `POST /stations`, `PATCH /stations/:id` | 4.3 · UC-06 | V |
| **Vehicles** | `GET /stations/:id/vehicles`, `POST /vehicles`, `PATCH /vehicles/:id`, `DELETE /vehicles/:id` | 4.3 · UC-07 | V |
| **Personnel** | `GET /stations/:id/personnel`, `PATCH /personnel/:userId/station`, `PATCH /personnel/:userId/duty` | 4.3 · UC-08 | V |
| **Incident monitoring (reads)** | `GET /incidents` (filters), `GET /incidents/stats`, `GET /incidents/assigned`, `GET /incidents/:id` | 4.4 · UC-09 | V |
| **Incident response** | `PATCH /incidents/:id/status`, `POST /incidents/:id/notes`, `PATCH /incidents/:id/resolve`, `PATCH /incidents/:id/close` | 4.5 · UC-10, UC-11, UC-12 | V |

### A.4 Real-Time (Socket.io)

| Item | Owner |
|---|---|
| Server bootstrap, JWT handshake, rooms (`user:<id>`, `role:<role>`, `station:<id>`) | P |
| `notification:new` emission (inside `notification.service.js`) | P |
| `incident:new` emission (called from `POST /incidents`) | P |
| `incident:updated` emission (called from assign override, status, notes, resolve, close) | V, via `incident-state.service.js`; P calls the same helper from `assign` |

### A.5 Seed Data

One `seeders/demo-seed.js`, built in pieces: **P** seeds one user per role and a Citizen; **V** seeds 3 stations (with real-looking coordinates, one far away so "no nearest station" can be demonstrated), 6 to 8 vehicles in mixed statuses, and a few incidents in different states. Seeds are idempotent so they can be re-run.

### A.6 Backend "Done When"

- Every endpoint in the contract returns the documented shape, including error cases.
- Every "—" cell of the RBAC matrix (System Design §9.2) returns `403` from the server.
- A Citizen report is auto-assigned to the correct nearest station that has an available vehicle (checked against seeded data), and a vehicle is marked `dispatched`.
- A full lifecycle (`reported → assigned → in_progress → resolved → closed`) works through the API, and the vehicle returns to `available` on resolve.
- Socket events fire for every item in System Design §5.6.

---

## 5. Part B — Frontend Implementation

All frontend work for all seven SRS features. **Owner** column: **P** = Parth, **V** = Vedant.

### B.1 Foundation

| # | Task | Owner | Notes |
|---|---|---|---|
| B1.1 | Vite project, folder structure (System Design §6.2), ESLint/Prettier | V | |
| B1.2 | `api/` Axios instance (base URL, JWT interceptor, 401 → logout), per-resource API modules | V creates the instance; each owner writes the modules for their own endpoints | |
| B1.3 | MSW mock handlers from `openapi.yaml` | Each owner mocks their own endpoints | `VITE_USE_MOCKS` flag |
| B1.4 | `AppRouter.jsx` (role-based route table), layout shell, `Navbar` | V | `UI-1` |
| B1.5 | Shared UI: `StatusBadge`, `SeverityBadge`, tables, forms, modal, toast, loading and empty states | V | `UI-4`: one colour map used everywhere |
| B1.6 | `AuthContext`, `ProtectedRoute`, role-based redirect after login | P | `Auth.RBAC` |
| B1.7 | `SocketContext` (single shared connection, auto-reconnect, re-sync callback) | P | `Reliability-1` |

### B.2 Pages and Components by Role

| Role | Page / Component | SRS Feature · UC | Owner |
|---|---|---|---|
| Public | `Login`, `Register` | 4.1 · UC-01, UC-02 | P |
| Citizen | `ReportIncident` (`IncidentForm`: Geolocation + manual fallback, severity), confirmation screen | 4.2 · UC-03 | P |
| Citizen | `MyReports` (own reports with live status) | 4.2, 4.6 · UC-03, UC-13 | P |
| Any | `NotificationBell` (unread badge, dropdown, mark read) | 4.6 · UC-13 | P |
| Dispatch Operator | `AssignOverride` modal component (station picker, confirm) | 4.2 · UC-05 | P |
| Dispatch Operator, Station Officer, Admin | `MonitoringDashboard`: incident list, status/station filters, status counts, live updates | 4.4 · UC-09 | V |
| Same | `LeafletMap`, `StationMarker`, `IncidentMarker` | 4.4 · UC-09 | V |
| Dispatch Operator | Reassign button on the dashboard that opens P's `AssignOverride` | 4.2 · UC-05 | V (integration) |
| Admin | `StationManagement` (add/edit stations with coordinates) | 4.3 · UC-06 | V |
| Station Officer, Admin | `StationResources`: Vehicles tab (add/edit/remove) and Personnel tab (assign, on/off duty) | 4.3 · UC-07, UC-08 | V |
| Firefighter | `MyAssignments` (mobile-friendly list) | 4.5 · UC-10 | V |
| Firefighter, Station Officer | `IncidentDetail`: next-status button (only the allowed next state), notes, history, resolve modal with closing summary, Close action (Station Officer only) | 4.5 · UC-10, UC-11, UC-12 | V |
| Admin | `UserManagement` (list, create, edit, change role, deactivate) | 4.7 · UC-14 | P |

### B.3 Real-Time on the Frontend

| Behaviour | Owner |
|---|---|
| Shared socket connection and reconnect-then-refetch | P (`SocketContext`) |
| Dashboard subscribes to `incident:new` / `incident:updated` and updates list, map and counts without refresh | V |
| `MyReports`, `MyAssignments`, `IncidentDetail` update on `incident:updated` | P (`MyReports`), V (the other two) |
| `NotificationBell` subscribes to `notification:new` | P |

### B.4 Frontend "Done When"

- Each role logs in and lands on its own dashboard; opening another role's URL redirects away.
- The reporting form is reachable within two clicks of login (`UI-3`) and works with location permission denied (manual entry).
- Two browser tabs show the same incident update live without refresh.
- Every screen works at phone width (`UI-2`); status and severity colours are consistent (`UI-4`).
- Invalid actions show clear messages (for example, the allowed next status when a transition is rejected).

---

## 6. Team Role Division (Parallel Tracks)

**Principle:** each person owns a *vertical track*, with both backend and frontend for their features. Both of you therefore work on backend and frontend every week, and each of you can demo complete working features. The two tracks touch only at a small number of defined hand-off points.

### 6.1 Track Assignment

| | **Parth Goggi — Track 1: Identity, Reporting & Dispatch** | **Vedant Ghuge — Track 2: Resources, Monitoring & Response** |
|---|---|---|
| **Backend** | App wiring, DB config, Auth + RBAC middleware, Users (Admin), Incident creation, Dispatch engine (Haversine, auto-assign, override), Notification service and endpoints, Socket.io server (rooms, handshake) | Stations, Vehicles, Personnel (CRUD + availability), Incident reads (list, stats, assigned, detail), State machine (status, notes, resolve, close, vehicle release), `incident:updated` emission |
| **Frontend** | Login/Register, `AuthContext`, `ProtectedRoute`, `SocketContext`, Report form + confirmation, `MyReports`, `NotificationBell`, `AssignOverride`, Admin `UserManagement` | Project foundation, router, layout, shared UI, `MonitoringDashboard` + Leaflet map, `StationManagement`, `StationResources`, `MyAssignments`, `IncidentDetail` |
| **SRS features covered** | 4.1, 4.2, 4.6, 4.7 | 4.3, 4.4, 4.5 |
| **Use cases** | UC-01 to UC-05, UC-13, UC-14 | UC-06 to UC-12 |
| **Unit tests** | `dispatch.service` (Haversine, nearest, no-station) | `incident.transitions` (every valid and invalid transition) |

### 6.2 Hand-Off Points (the only places the tracks depend on each other)

| # | Hand-off | From → To | Needed by | How to avoid blocking |
|---|---|---|---|---|
| H1 | `auth.middleware` + `rbac.middleware` | P → V | Week 2 | V starts with a stub `allowRoles()` that lets everything through; swap in P's version when merged |
| H2 | Frozen models + contract for `Incident`, `Vehicle`, `Notification` | Both | End of Week 1 | Done jointly |
| H3 | `dispatch.service` marks a vehicle `dispatched` and writes `incident_vehicles` using V's `Vehicle` / `IncidentVehicle` models; V's `resource.service` provides `getAvailableVehicle(stationId)` and `releaseVehicles(incidentId)` | V → P | Week 3 | V ships `resource.service` with those two functions early in Week 3 (a few lines each) |
| H4 | `notification.service.notify(...)` and socket helpers | P → V | Week 5 | V calls them from the state service; until then a no-op stub with the same signature |
| H5 | `AssignOverride` modal component | P → V | Week 6 | V builds the dashboard's Reassign button with a placeholder; P's component drops in |
| H6 | `SocketContext` | P → V | Week 4 | V's dashboard first polls or uses the mock; switches to live when merged |

### 6.3 Shared Work

| Item | Who |
|---|---|
| `openapi.yaml` and response/error conventions | Both, Week 1 |
| Cross-review of every PR | Each reviews the other's track |
| RBAC audit and Postman role tests | Both, Week 6 |
| Deployment, smoke tests, demo rehearsal | Both, Weeks 7 to 8 |
| Final report and documentation | P: SRS/Use Case sync, test report. V: design/deployment sections. Both: demo script |

Because the Dispatch Engine (Parth) and the Monitoring Dashboard (Vedant) share the `Incident` schema, both of you must approve every change to it.

---

## 7. Development Timeline

An 8-week plan. Each cell lists work that can happen **at the same time** as the other lanes in that row.

| Week | Parth: Backend | Parth: Frontend | Vedant: Backend | Vedant: Frontend |
|---|---|---|---|---|
| **1** Setup and contract | `server/` scaffold, `app.js`, DB config; migrations + models for `users`, `notifications`, `incidents` | (joint) | Migrations + models for `stations`, `vehicles`, `incident_status_history`, `incident_notes`, `incident_vehicles` | `client/` scaffold, router skeleton, Axios instance, MSW setup |
| | **Together:** write `openapi.yaml`, agree response/error format, freeze shared models (H2), set up GitHub, branches, `.env.example` | | | |
| **2** Auth and resources | `/auth/*`, `auth.middleware`, `rbac.middleware` (**H1**), seed users | `Login`, `Register`, `AuthContext`, `ProtectedRoute`, role redirect | `/stations`, `/vehicles`, `/personnel/*` CRUD (stub RBAC until H1) | Layout, `Navbar`, shared UI (badges, tables, modal); `StationManagement` and `StationResources` against mocks |
| **3** Reporting, dispatch, monitoring reads | `haversine.js`, `dispatch.service`, `POST /incidents`, `GET /incidents/mine`; Jest tests for dispatch (**H3**) | `IncidentForm` with Geolocation + manual fallback, confirmation screen, `MyReports` | `resource.service` (**H3**, early in week); `GET /incidents` + filters, `/incidents/stats`, `/incidents/assigned`, `/incidents/:id` | Connect station/vehicle pages to real API; `MonitoringDashboard` list, filters, status counts |
| **4** Real-time and notifications | `sockets/index.js` (rooms, handshake), `notification.service`, `/notifications/*` (**H4**), `PATCH /incidents/:id/assign` (override) | `SocketContext` (**H6**), `NotificationBell`, `AssignOverride` modal (**H5**) | `incident.transitions` + `incident-state.service`, `PATCH /status`, `POST /notes`; Jest tests for transitions | `LeafletMap` with station + incident markers; `MyAssignments`; `IncidentDetail` (status button, notes, history) |
| **5** Admin and lifecycle | `/users/*` admin endpoints; citizen notification on status change; `incident:new` emit | Admin `UserManagement` page; `MyReports` live updates | `PATCH /resolve` (closing summary + vehicle auto-release), `PATCH /close`; `incident:updated` emits; wire to H4 | Resolve modal, Close action; dashboard + map live via sockets; reconnect and re-sync |
| **6** Integration | Review V's PRs; RBAC audit via Postman (all five roles) | Wire `AssignOverride` into the dashboard with V (**H5**); notification end-to-end checks | Review P's PRs; fix integration bugs; turn off mocks (`VITE_USE_MOCKS=false`) | Reassign button integration (**H5**); responsive and mobile pass on Firefighter views |
| **7** Testing and polish | Postman collection for Track 1; fix bugs; seed finalisation | UI polish, error states, accessibility pass | Postman collection for Track 2; fix bugs; seed finalisation | UI polish, empty and loading states |
| **8** Deploy and demo | Deploy backend + DB, set env vars, run migrations/seeds on production | Final smoke test on deployed URLs | Deploy frontend, set `VITE_*` URLs | Demo script, rehearsal on demo network, final report |

> Suggested cadence: 15-minute sync at the start of each week to agree that week's hand-offs, and a mid-week check-in to catch contract mismatches early. Any contract change goes through a small PR to `openapi.yaml` first.

---

## 8. Testing Strategy

| Test Type | Scope | Tooling | Owner |
|---|---|---|---|
| **Unit** | `dispatch.service` (Haversine distance, nearest selection, no-station case) | Jest | P |
| **Unit** | `incident.transitions` (every valid transition, every invalid one, `allowedNext`) | Jest | V |
| **API** | Each endpoint: happy path, validation error, wrong-role `403`, unauthenticated `401` | Postman (export to `docs/postman/`) | Each for own endpoints |
| **Cross-role access** | Every "—" cell of the RBAC matrix (System Design §9.2) is rejected **server-side**, plus data-scope checks (Citizen cannot read another's incident; Station Officer cannot edit another station) | Postman with a token per role | Both (Week 6) |
| **Real-time** | Two tabs/users: dashboard live update, notification arrives within 5 seconds, reconnect re-syncs | Manual | Both |
| **Use-case walkthroughs** | UC-01 to UC-14 end to end in the browser against each Basic Flow and Extension in the Use Case document | Manual, pair testing | Both |
| **Responsive** | Citizen and Firefighter flows on a phone-width viewport | Browser dev tools + a real phone | V (Firefighter), P (Citizen) |

**Traceability check before submission:** every requirement ID in SRS Section 4 and every UC ID must map to at least one passed test. Keep this as a table in the final report.

---

## 9. Deployment Plan

1. **Database:** provision a free PostgreSQL instance; set `DATABASE_URL`; run `npx sequelize-cli db:migrate`, then `db:seed:all`.
2. **Backend:** push `server/` to GitHub; connect to Render or Railway; set `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`; confirm WebSocket support.
3. **Frontend:** connect `client/` to Vercel or Netlify; set `VITE_API_URL`, `VITE_SOCKET_URL`; make sure `VITE_USE_MOCKS` is `false` in production.
4. **Smoke test on the deployed URLs** (not localhost): register a Citizen, report an incident, confirm it reaches a seeded station, confirm live updates across two devices, walk it to `resolved` and `closed`.
5. **Seed:** demo data must include one user per role, 2 to 3 stations, vehicles, and one far-away location to demo the "no station available" path.

---

## 10. Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| One track blocks the other (hand-offs H1 to H6) | Idle time, delays | Contract-first + MSW mocks + stub functions with final signatures (Section 6.2) |
| Merge conflicts on shared files (`Incident` model, `app.js`, `AppRouter.jsx`, `openapi.yaml`) | Lost work | Freeze shared models in Week 1; one owner per shared file (P: `app.js`; V: `AppRouter.jsx`); small PRs; both review |
| API contract drifts from implementation | Frontend breaks late | Contract changes only via PR; Postman collection checks responses against the contract |
| Free-tier backend host sleeps (cold start) | Slow first request in demo | Wake it a few minutes before the demo |
| WebSocket blocked on the demo network | Live updates look broken | Test on the real network; Socket.io falls back to long-polling |
| Geolocation denied during demo | Auto-fill fails | Manual address fallback is a required feature (`AS-1`); rehearse it |
| Uneven workload between tracks | One person finishes late | Week 6 is buffer; whoever finishes early takes bug-fixing and Postman tests for the other |
| Scope creep | Timeline slips | Keep SRS Appendix C visible as the out-of-scope list |

---

## 11. Deliverables Checklist

- [x] SRS document
- [x] Use Case Diagram & Descriptions document
- [x] System Design document (v1.1)
- [x] Implementation Plan (this document, v1.1)
- [ ] `docs/openapi.yaml` (API contract)
- [ ] Working source code (`client/`, `server/`) in GitHub repo
- [ ] Seeded demo data (stations, vehicles, one user per role)
- [ ] Postman collection for API and role tests
- [ ] Jest unit tests (dispatch, transitions)
- [ ] Deployed, publicly reachable frontend + backend URLs
- [ ] Requirement-to-test traceability table
- [ ] Final project report / presentation referencing requirement IDs and use case IDs

---

*End of Implementation Plan*
