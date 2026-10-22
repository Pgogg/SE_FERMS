# FERMS Requirements Traceability Matrix

**Fire Emergency Response Management System (FERMS)**  
**Version:** 1.0  
**Authors:** Parth Goggi (2024300068) & Vedant Ghuge (2024300067)  
**Date:** October 2026  
**Companion Documents:**  
- `docs/SystemDesign.md` (v1.2, Sections 5, 6.3, 9, 10, 13)
- `docs/ImplementationPlan.md` (v1.2, Sections 4, 5, 6, 8)
- `docs/openapi.yaml` (API Specification)
- `docs/UC-Walkthrough.md` (End-to-End Use Case Walkthrough)

---

## 1. Overview & Methodology

This traceability matrix maps every requirement identifier established in the **FERMS System Design Document** (Section 5 API Tables, Section 5.6 Real-Time Events, Section 9 Security & Access Control, and Section 10 Non-Functional Considerations) and the **FERMS Implementation Plan** to its corresponding:
1. **Use Case** (`UC-01` through `UC-14`)
2. **API Endpoint(s)** (per `docs/openapi.yaml` and Express router definitions)
3. **Server File(s)** (controllers, services, middleware, domain models)
4. **Client Page / Component** (React pages, components, context providers)
5. **Test Coverage** (Jest automated tests, Postman API collections, or UC-Walkthrough sections)
6. **Implementation Status** (`Implemented & Verified`, `Partially Verified`, or `MISSING`)

Per the specification rules, cells where no physical code file or endpoint exists are explicitly flagged as `MISSING` (with architectural rationale noted where applicable).

---

## 2. Requirements Traceability Table

| Requirement | Use Case | API Endpoint(s) | Server File(s) | Client Page or Component | Test (Jest, Postman or UC-Walkthrough section) | Status |
|---|---|---|---|---|---|---|
| **Auth.Register** | UC-01 | `POST /api/auth/register` | `server/src/routes/auth.routes.js`<br>`server/src/controllers/auth.controller.js` | `client/src/pages/auth/Register/Register.jsx` | Postman: Track 1 (`Auth / Register Citizen`)<br>UC-Walkthrough: `UC-01` | Implemented & Verified |
| **Auth.Register.Validate** | UC-01 | `POST /api/auth/register` | `server/src/controllers/auth.controller.js` | `client/src/pages/auth/Register/Register.jsx` | Postman: Track 1 (`Auth / Register Validation`)<br>UC-Walkthrough: `UC-01` | Implemented & Verified |
| **Auth.Login** | UC-02 | `POST /api/auth/login` | `server/src/routes/auth.routes.js`<br>`server/src/controllers/auth.controller.js` | `client/src/pages/auth/Login/Login.jsx`<br>`client/src/context/AuthContext.jsx` | Jest: `server/tests/helpers/auth.js`<br>Postman: Track 1 (`Auth / Login`)<br>UC-Walkthrough: `UC-02` | Implemented & Verified |
| **Auth.Login.Fail** | UC-02 | `POST /api/auth/login` | `server/src/controllers/auth.controller.js` | `client/src/pages/auth/Login/Login.jsx` | Postman: Track 1 (`Auth / Login Failures`)<br>UC-Walkthrough: `UC-02` | Implemented & Verified |
| **Auth.Logout** | UC-02 | `POST /api/auth/logout` | `server/src/routes/auth.routes.js`<br>`server/src/controllers/auth.controller.js` | `client/src/components/common/AppNavbar/AppNavbar.jsx`<br>`client/src/context/AuthContext.jsx` | Postman: Track 1 (`Auth / Logout`)<br>UC-Walkthrough: `UC-02` | Implemented & Verified |
| **Auth.RBAC** | UC-01, UC-02, UC-14 | All protected endpoints (`/api/*`) | `server/src/middleware/auth.middleware.js`<br>`server/src/middleware/rbac.middleware.js` | `client/src/components/common/ProtectedRoute/ProtectedRoute.jsx`<br>`client/src/routes/AppRouter.jsx` | Jest: `server/tests/rbac.matrix.test.js`<br>Postman: Track 1 & 2 RBAC audit<br>UC-Walkthrough: `UC-02`, `UC-14` | Implemented & Verified |
| **Incident.Report** | UC-03 | `POST /api/incidents` | `server/src/routes/incident.routes.js`<br>`server/src/controllers/incident.controller.js` | `client/src/pages/citizen/ReportIncident/ReportIncident.jsx`<br>`client/src/components/incidents/IncidentForm/IncidentForm.jsx` | Jest: `server/tests/incident.create.test.js`<br>Postman: Track 1 (`Incidents / Report Incident`)<br>UC-Walkthrough: `UC-03` | Implemented & Verified |
| **Incident.Report.Location** | UC-03 | `POST /api/incidents` | `server/src/controllers/incident.controller.js` | `client/src/components/incidents/IncidentForm/LocationPicker.jsx`<br>`client/src/components/map/LeafletMap/LeafletMap.jsx` | Jest: `server/tests/incident.create.test.js`<br>Postman: Track 1 (`Incidents / Coordinates & Address`)<br>UC-Walkthrough: `UC-03` | Implemented & Verified |
| **Incident.Report.Confirm** | UC-03 | `POST /api/incidents` | `server/src/controllers/incident.controller.js` | `client/src/pages/citizen/ReportIncident/ReportIncident.jsx` | Jest: `server/tests/incident.create.test.js`<br>Postman: Track 1 (`Incidents / Report Confirmation`)<br>UC-Walkthrough: `UC-03` | Implemented & Verified |
| **Dispatch.Assign.Nearest** | UC-04 | `POST /api/incidents` | `server/src/services/dispatch.service.js`<br>`server/src/utils/haversine.js` | `client/src/pages/citizen/ReportIncident/ReportIncident.jsx` | Jest: `server/tests/dispatch.service.test.js`<br>Postman: Track 1 (`Incidents / Nearest Station Dispatch`)<br>UC-Walkthrough: `UC-04` | Implemented & Verified |
| **Dispatch.Assign.NoStation** | UC-04 | `POST /api/incidents` | `server/src/services/dispatch.service.js`<br>`server/src/controllers/incident.controller.js` | `client/src/pages/citizen/ReportIncident/ReportIncident.jsx`<br>`client/src/pages/dispatch/MonitoringDashboard/MonitoringDashboard.jsx` | Jest: `server/tests/dispatch.service.test.js`<br>`server/tests/incident.create.test.js`<br>Postman: Track 1 (`Incidents / Unassigned Fallback`)<br>UC-Walkthrough: `UC-04` | Implemented & Verified |
| **Dispatch.Override** | UC-05 | `PATCH /api/incidents/:id/assign` | `server/src/routes/incident.routes.js`<br>`server/src/controllers/incident.controller.js`<br>`server/src/services/dispatch.service.js` | `client/src/pages/dispatch/AssignOverride/AssignOverride.jsx`<br>`client/src/pages/dispatch/MonitoringDashboard/MonitoringDashboard.jsx` | Jest: `server/tests/dispatch.reassign.test.js`<br>Postman: Track 1 (`Incidents / Reassign Override`)<br>UC-Walkthrough: `UC-05` | Implemented & Verified |
| **Resource.Availability** | UC-04, UC-06, UC-07, UC-08 | `GET /api/stations` | `server/src/routes/station.routes.js`<br>`server/src/controllers/station.controller.js`<br>`server/src/services/resource.service.js` | `client/src/pages/station/StationResources/StationResources.jsx`<br>`client/src/pages/dispatch/MonitoringDashboard/MonitoringDashboard.jsx` | Jest: `server/tests/resource.api.test.js`<br>`server/tests/resource.service.test.js`<br>Postman: Track 2 (`Stations / Availability Counts`)<br>UC-Walkthrough: `UC-06`, `UC-07` | Implemented & Verified |
| **Station.Manage** | UC-06 | `GET /api/stations`<br>`POST /api/stations`<br>`PATCH /api/stations/:id` | `server/src/routes/station.routes.js`<br>`server/src/controllers/station.controller.js` | `client/src/pages/admin/StationManagement/StationManagement.jsx` | Jest: `server/tests/resource.api.test.js`<br>Postman: Track 2 (`Stations / CRUD`)<br>UC-Walkthrough: `UC-06` | Implemented & Verified |
| **Vehicle.Manage** | UC-07 | `GET /api/stations/:id/vehicles`<br>`POST /api/vehicles`<br>`PATCH /api/vehicles/:id`<br>`DELETE /api/vehicles/:id` | `server/src/routes/vehicle.routes.js`<br>`server/src/controllers/vehicle.controller.js` | `client/src/pages/station/StationResources/StationResources.jsx` | Jest: `server/tests/resource.api.test.js`<br>Postman: Track 2 (`Vehicles / CRUD & Active Block`)<br>UC-Walkthrough: `UC-07` | Implemented & Verified |
| **Vehicle.Status.Auto** | UC-04, UC-05, UC-12 | `POST /api/incidents`<br>`PATCH /api/incidents/:id/assign`<br>`PATCH /api/incidents/:id/resolve` | `server/src/services/dispatch.service.js`<br>`server/src/services/resource.service.js`<br>`server/src/services/incident-state.service.js` | `client/src/pages/station/StationResources/StationResources.jsx`<br>`client/src/pages/firefighter/IncidentDetail/IncidentDetail.jsx` | Jest: `server/tests/dispatch.service.test.js`<br>`server/tests/dispatch.reassign.test.js`<br>`server/tests/resource.service.test.js`<br>`server/tests/incident.lifecycle.test.js`<br>Postman: Track 1 & 2<br>UC-Walkthrough: `UC-04`, `UC-05`, `UC-12` | Implemented & Verified |
| **Personnel.Manage** | UC-08 | `GET /api/stations/:id/personnel`<br>`PATCH /api/personnel/:userId/station`<br>`PATCH /api/personnel/:userId/duty` | `server/src/routes/personnel.routes.js`<br>`server/src/controllers/personnel.controller.js` | `client/src/pages/station/StationResources/StationResources.jsx` | Jest: `server/tests/resource.api.test.js`<br>Postman: Track 2 (`Personnel / Duty & Station Assignment`)<br>UC-Walkthrough: `UC-08` | Implemented & Verified |
| **Monitor.Live** | UC-09 | `GET /api/incidents`<br>WebSocket `incident:new`, `incident:updated` | `server/src/routes/incident.routes.js`<br>`server/src/controllers/incident.controller.js`<br>`server/src/sockets/index.js` | `client/src/pages/dispatch/MonitoringDashboard/MonitoringDashboard.jsx`<br>`client/src/components/map/LeafletMap/LeafletMap.jsx`<br>`client/src/context/SocketContext.jsx` | Jest: `server/tests/incident.read.test.js`<br>`server/tests/notification.test.js`<br>Postman: Track 2 (`Incidents / Live Monitoring`)<br>UC-Walkthrough: `UC-09` | Implemented & Verified |
| **Monitor.Filter** | UC-09 | `GET /api/incidents` | `server/src/routes/incident.routes.js`<br>`server/src/controllers/incident.controller.js` | `client/src/pages/dispatch/MonitoringDashboard/MonitoringDashboard.jsx` | Jest: `server/tests/incident.read.test.js`<br>Postman: Track 2 (`Incidents / Filter Status & Station`)<br>UC-Walkthrough: `UC-09` | Implemented & Verified |
| **Monitor.Count** | UC-09 | `GET /api/incidents/stats` | `server/src/routes/incident.routes.js`<br>`server/src/controllers/incident.controller.js` | `client/src/pages/dispatch/MonitoringDashboard/MonitoringDashboard.jsx` | Jest: `server/tests/incident.read.test.js`<br>Postman: Track 2 (`Incidents / Statistics Summary`)<br>UC-Walkthrough: `UC-09` | Implemented & Verified |
| **Incident.Status.Update** | UC-10 | `PATCH /api/incidents/:id/status` | `server/src/routes/incident.routes.js`<br>`server/src/controllers/incident.controller.js`<br>`server/src/services/incident-state.service.js` | `client/src/pages/firefighter/IncidentDetail/IncidentDetail.jsx`<br>`client/src/pages/firefighter/MyAssignments/MyAssignments.jsx` | Jest: `server/tests/incident.status.test.js`<br>Postman: Track 2 (`Incidents / Assigned to In Progress`)<br>UC-Walkthrough: `UC-10` | Implemented & Verified |
| **Incident.Status.Invalid** | UC-10 | `PATCH /api/incidents/:id/status` | `server/src/domain/incident.transitions.js`<br>`server/src/services/incident-state.service.js` | `client/src/pages/firefighter/IncidentDetail/IncidentDetail.jsx` | Jest: `server/tests/incident.transitions.test.js`<br>`server/tests/incident.status.test.js`<br>Postman: Track 2 (`Incidents / Invalid Transition 400`)<br>UC-Walkthrough: `UC-10` | Implemented & Verified |
| **Incident.Status.Transition** | UC-10, UC-11, UC-12 | `PATCH /api/incidents/:id/status`<br>`PATCH /api/incidents/:id/resolve`<br>`PATCH /api/incidents/:id/close` | `server/src/domain/incident.transitions.js`<br>`server/src/services/incident-state.service.js` | `client/src/pages/firefighter/IncidentDetail/IncidentDetail.jsx` | Jest: `server/tests/incident.transitions.test.js`<br>`server/tests/incident.lifecycle.test.js`<br>Postman: Track 2 (`Incidents / Lifecycle Transitions`)<br>UC-Walkthrough: `UC-10`, `UC-12` | Implemented & Verified |
| **Incident.Log** | UC-11 | `POST /api/incidents/:id/notes` | `server/src/routes/incident.routes.js`<br>`server/src/controllers/incident.controller.js` | `client/src/pages/firefighter/IncidentDetail/IncidentDetail.jsx` | Jest: `server/tests/incident.status.test.js`<br>Postman: Track 2 (`Incidents / Field Notes`)<br>UC-Walkthrough: `UC-11` | Implemented & Verified |
| **Incident.Resolve** | UC-12 | `PATCH /api/incidents/:id/resolve` | `server/src/routes/incident.routes.js`<br>`server/src/controllers/incident.controller.js`<br>`server/src/services/incident-state.service.js` | `client/src/pages/firefighter/IncidentDetail/IncidentDetail.jsx` | Jest: `server/tests/incident.lifecycle.test.js`<br>Postman: Track 2 (`Incidents / Resolve with Summary`)<br>UC-Walkthrough: `UC-12` | Implemented & Verified |
| **Incident.Close** | UC-12 | `PATCH /api/incidents/:id/close` | `server/src/routes/incident.routes.js`<br>`server/src/controllers/incident.controller.js`<br>`server/src/services/incident-state.service.js` | `client/src/pages/firefighter/IncidentDetail/IncidentDetail.jsx` | Jest: `server/tests/incident.lifecycle.test.js`<br>`server/tests/rbac.matrix.test.js`<br>Postman: Track 2 (`Incidents / Close by Station Officer`)<br>UC-Walkthrough: `UC-12` | Implemented & Verified |
| **Incident.History** | UC-04, UC-10, UC-12 | `GET /api/incidents/:id` | `server/src/models/IncidentStatusHistory.js`<br>`server/src/services/incident-state.service.js`<br>`server/src/controllers/incident.controller.js` | `client/src/pages/firefighter/IncidentDetail/IncidentDetail.jsx` | Jest: `server/tests/incident.read.test.js`<br>`server/tests/incident.lifecycle.test.js`<br>Postman: Track 2 (`Incidents / History Trail`)<br>UC-Walkthrough: `UC-10`, `UC-12` | Implemented & Verified |
| **Notify.InApp** | UC-13 | `GET /api/notifications`<br>`PATCH /api/notifications/:id/read`<br>`PATCH /api/notifications/read-all` | `server/src/routes/notification.routes.js`<br>`server/src/controllers/notification.controller.js` | `client/src/components/common/NotificationBell/NotificationBell.jsx` | Jest: `server/tests/notification.test.js`<br>Postman: Track 1 (`Notifications / CRUD`)<br>UC-Walkthrough: `UC-13` | Implemented & Verified |
| **Notify.Dispatch** | UC-04, UC-13 | WebSocket `notification:new`<br>`GET /api/notifications` | `server/src/services/notification.service.js`<br>`server/src/services/dispatch.service.js`<br>`server/src/sockets/index.js` | `client/src/components/common/NotificationBell/NotificationBell.jsx` | Jest: `server/tests/notification.test.js`<br>`server/tests/incident.create.test.js`<br>Postman: Track 1 (`Notifications / Dispatch Push`)<br>UC-Walkthrough: `UC-04`, `UC-13` | Implemented & Verified |
| **Notify.Citizen** | UC-10, UC-12, UC-13 | WebSocket `notification:new`, `incident:updated` | `server/src/services/notification.service.js`<br>`server/src/services/incident-state.service.js` | `client/src/pages/citizen/MyReports/MyReports.jsx`<br>`client/src/components/common/NotificationBell/NotificationBell.jsx` | Jest: `server/tests/notification.test.js`<br>`server/tests/incident.lifecycle.test.js`<br>Postman: Track 1 (`Notifications / Citizen Status Update`)<br>UC-Walkthrough: `UC-10`, `UC-12`, `UC-13` | Implemented & Verified |
| **Admin.User.Manage** | UC-14 | `GET /api/users`<br>`POST /api/users`<br>`PATCH /api/users/:id`<br>`PATCH /api/users/:id/deactivate` | `server/src/routes/user.routes.js`<br>`server/src/controllers/user.controller.js` | `client/src/pages/admin/UserManagement/UserManagement.jsx` | Jest: `server/tests/user.admin.test.js`<br>Postman: Track 1 (`Users / Admin Management`)<br>UC-Walkthrough: `UC-14` | Implemented & Verified |
| **Admin.User.Role** | UC-14 | `PATCH /api/users/:id/role` | `server/src/routes/user.routes.js`<br>`server/src/controllers/user.controller.js` | `client/src/pages/admin/UserManagement/UserManagement.jsx` | Jest: `server/tests/user.admin.test.js`<br>Postman: Track 1 (`Users / Role Assignment`)<br>UC-Walkthrough: `UC-14` | Implemented & Verified |
| **BR-1** | UC-03, UC-09, UC-13 | `POST /api/incidents`<br>`GET /api/incidents/mine` | `server/src/middleware/rbac.middleware.js`<br>`server/src/controllers/incident.controller.js` | `client/src/pages/citizen/MyReports/MyReports.jsx` | Jest: `server/tests/rbac.matrix.test.js`<br>`server/tests/incident.create.test.js`<br>Postman: Track 1 (`RBAC Citizen Scope`)<br>UC-Walkthrough: `UC-02`, `UC-03` | Implemented & Verified |
| **BR-2** | UC-14 | `PATCH /api/users/:id/role`<br>`PATCH /api/users/:id/deactivate` | `server/src/middleware/rbac.middleware.js`<br>`server/src/controllers/user.controller.js` | `client/src/pages/admin/UserManagement/UserManagement.jsx` | Jest: `server/tests/user.admin.test.js`<br>Postman: Track 1 (`Users / Role & Self-Deactivation Lock`)<br>UC-Walkthrough: `UC-14` | Implemented & Verified |
| **BR-3** | UC-06, UC-07, UC-08, UC-10, UC-12 | `/api/stations/:id/*`<br>`/api/vehicles/*`<br>`/api/personnel/*` | `server/src/middleware/rbac.middleware.js`<br>`server/src/controllers/station.controller.js`<br>`server/src/controllers/vehicle.controller.js`<br>`server/src/controllers/personnel.controller.js` | `client/src/pages/station/StationResources/StationResources.jsx` | Jest: `server/tests/rbac.matrix.test.js`<br>`server/tests/resource.api.test.js`<br>Postman: Track 2 (`RBAC Station Officer Scope`)<br>UC-Walkthrough: `UC-07`, `UC-08` | Implemented & Verified |
| **BR-4** | UC-12 | `PATCH /api/incidents/:id/close` | `server/src/routes/incident.routes.js`<br>`server/src/controllers/incident.controller.js`<br>`server/src/domain/incident.transitions.js` | `client/src/pages/firefighter/IncidentDetail/IncidentDetail.jsx` | Jest: `server/tests/incident.lifecycle.test.js`<br>`server/tests/rbac.matrix.test.js`<br>Postman: Track 2 (`Incidents / Close Incident Auth`)<br>UC-Walkthrough: `UC-12` | Implemented & Verified |
| **BR-5** | UC-05, UC-09, UC-12 | `GET /api/incidents`<br>`PATCH /api/incidents/:id/assign`<br>`PATCH /api/incidents/:id/resolve` | `server/src/middleware/rbac.middleware.js`<br>`server/src/services/dispatch.service.js`<br>`server/src/services/resource.service.js` | `client/src/pages/dispatch/MonitoringDashboard/MonitoringDashboard.jsx`<br>`client/src/pages/dispatch/AssignOverride/AssignOverride.jsx` | Jest: `server/tests/dispatch.reassign.test.js`<br>`server/tests/resource.service.test.js`<br>`server/tests/incident.lifecycle.test.js`<br>Postman: Track 1 & 2<br>UC-Walkthrough: `UC-05`, `UC-09`, `UC-12` | Implemented & Verified |
| **SE-1** | Architecture | All endpoints / WebSocket handshake | `server/src/server.js` | `client/src/api/client.js`<br>`client/src/context/SocketContext.jsx` | Postman environment SSL validation<br>UC-Walkthrough deployment check | Implemented & Verified |
| **SE-2** | UC-01, UC-14 | `POST /api/auth/register`<br>`POST /api/users` | `server/src/controllers/auth.controller.js`<br>`server/src/controllers/user.controller.js`<br>`server/src/models/User.js` | `client/src/pages/auth/Register/Register.jsx`<br>`client/src/pages/admin/UserManagement/UserManagement.jsx` | Jest: `server/tests/user.admin.test.js`<br>Postman: Track 1 (`Auth / Register`, `Users / Create`)<br>UC-Walkthrough: `UC-01`, `UC-14` | Implemented & Verified |
| **SE-3** | UC-02, UC-14 | All protected `/api/*` routes | `server/src/middleware/auth.middleware.js` | `client/src/api/client.js`<br>`client/src/context/AuthContext.jsx` | Jest: `server/tests/rbac.matrix.test.js`<br>`server/tests/notification.test.js`<br>Postman: Track 1 & 2 unauthenticated 401 tests<br>UC-Walkthrough: `UC-02` | Implemented & Verified |
| **SE-4** | UC-03, UC-09 | `GET /api/incidents/mine`<br>`GET /api/incidents/:id` | `server/src/controllers/incident.controller.js`<br>`server/src/middleware/rbac.middleware.js` | `client/src/pages/citizen/MyReports/MyReports.jsx`<br>`client/src/pages/firefighter/IncidentDetail/IncidentDetail.jsx` | Jest: `server/tests/rbac.matrix.test.js`<br>`server/tests/incident.read.test.js`<br>Postman: Track 1 & 2 scoping checks<br>UC-Walkthrough: `UC-02`, `UC-09` | Implemented & Verified |
| **SE-5** | UC-02, UC-14 | All protected `/api/*` routes | `server/src/middleware/auth.middleware.js` | `client/src/api/client.js`<br>`client/src/context/AuthContext.jsx` | Jest: `server/tests/user.admin.test.js`<br>`server/tests/notification.test.js`<br>Postman: Track 1 (`Users / Inactive Token Rejection`)<br>UC-Walkthrough: `UC-02`, `UC-14` | Implemented & Verified |
| **PE-1** | Architecture | All endpoints | `server/src/config/db.js`<br>`server/src/app.js` | **MISSING** *(Architectural sizing)* | UC-Walkthrough deployment check | Implemented |
| **PE-2** | UC-04, UC-10, UC-12, UC-13 | WebSocket `notification:new` | `server/src/services/notification.service.js`<br>`server/src/sockets/index.js` | `client/src/components/common/NotificationBell/NotificationBell.jsx` | Jest: `server/tests/notification.test.js`<br>UC-Walkthrough: `UC-13` | Implemented & Verified |
| **PE-3** | UC-06, UC-09, UC-13 | `GET /api/incidents`<br>`GET /api/stations`<br>`GET /api/notifications` | `server/src/models/Incident.js`<br>`server/src/models/Notification.js`<br>(Database indexes per §4.9) | `client/src/pages/dispatch/MonitoringDashboard/MonitoringDashboard.jsx` | Postman response time checks<br>UC-Walkthrough performance check | Implemented & Verified |
| **PE-4** | UC-04 | `POST /api/incidents` | `server/src/utils/haversine.js`<br>`server/src/services/dispatch.service.js` | `client/src/pages/citizen/ReportIncident/ReportIncident.jsx` | Jest: `server/tests/dispatch.service.test.js`<br>Postman response time checks<br>UC-Walkthrough: `UC-04` | Implemented & Verified |
| **SF-1** | UC-03 | `POST /api/incidents` | `server/src/controllers/incident.controller.js` | `client/src/pages/citizen/ReportIncident/ReportIncident.jsx`<br>`client/src/components/incidents/IncidentForm/LocationPicker.jsx` | Jest: `server/tests/incident.create.test.js`<br>UC-Walkthrough: `UC-03` | Implemented & Verified |
| **SF-2** | UC-04, UC-05 | `POST /api/incidents` | `server/src/services/dispatch.service.js`<br>`server/src/controllers/incident.controller.js` | `client/src/pages/citizen/ReportIncident/ReportIncident.jsx`<br>`client/src/pages/dispatch/MonitoringDashboard/MonitoringDashboard.jsx` | Jest: `server/tests/dispatch.service.test.js`<br>`server/tests/incident.create.test.js`<br>Postman: Track 1 (`Incidents / Unassigned Flow`)<br>UC-Walkthrough: `UC-04`, `UC-05` | Implemented & Verified |
| **Reliability-1** | UC-09, UC-13 | WebSocket handshake | `server/src/sockets/index.js` | `client/src/context/SocketContext.jsx` | Jest: `server/tests/notification.test.js`<br>UC-Walkthrough: `§1.2 / §7.5 / UC-09` | Implemented & Verified |
| **Maintainability-1** | Architecture | All endpoints | `server/src/routes/*`<br>`server/src/controllers/*`<br>`server/src/services/*` | `client/src/api/*`<br>`client/src/components/*`<br>`client/src/pages/*` | Jest modular test suite<br>ESLint clean run | Implemented & Verified |
| **Usability-1** | UC-03 | `POST /api/incidents` | `server/src/controllers/incident.controller.js` | `client/src/pages/citizen/ReportIncident/ReportIncident.jsx`<br>`client/src/components/incidents/IncidentForm/IncidentForm.jsx` | UC-Walkthrough: `UC-03` | Implemented & Verified |
| **UI-1** | UC-01, UC-02, UC-14 | **MISSING** *(Client route guards)* | **MISSING** *(Client-side only)* | `client/src/routes/AppRouter.jsx`<br>`client/src/components/common/ProtectedRoute/ProtectedRoute.jsx` | UC-Walkthrough: `UC-01`, `UC-02`, `UC-14` | Implemented & Verified |
| **UI-2** | UC-03, UC-10, UC-11 | **MISSING** *(Client responsive layout)* | **MISSING** *(Client-side only)* | `client/src/pages/citizen/ReportIncident/ReportIncident.jsx`<br>`client/src/pages/firefighter/MyAssignments/MyAssignments.jsx`<br>`client/src/pages/firefighter/IncidentDetail/IncidentDetail.jsx` | UC-Walkthrough responsive checks across mobile viewports | Implemented & Verified |
| **UI-3** | UC-02, UC-03 | **MISSING** *(Navigation / Click depth)* | **MISSING** *(Client-side only)* | `client/src/pages/public/Landing/Landing.jsx`<br>`client/src/pages/auth/Login/Login.jsx` | UC-Walkthrough: `UC-01`, `UC-02`, `UC-03` | Implemented & Verified |
| **UI-4** | UC-03, UC-09, UC-10, UC-12 | **MISSING** *(Design tokens & badges)* | **MISSING** *(Client-side only)* | `client/src/styles/tokens.css`<br>`client/src/components/ui/Badge/Badge.jsx`<br>`client/src/components/incidents/StatusBadge/StatusBadge.jsx`<br>`client/src/components/incidents/SeverityBadge/SeverityBadge.jsx` | `client/scripts/check-no-hex.mjs` (`npm run lint:tokens`) exits 0<br>UC-Walkthrough | Implemented & Verified |
| **AS-1** | UC-03 | `POST /api/incidents` | `server/src/controllers/incident.controller.js` | `client/src/components/incidents/IncidentForm/LocationPicker.jsx` | Jest: `server/tests/incident.create.test.js`<br>UC-Walkthrough: `UC-03` | Implemented & Verified |
| **AS-2** | UC-03, UC-04 | `POST /api/incidents` | `server/src/models/Incident.js`<br>`server/src/controllers/incident.controller.js`<br>`server/src/utils/haversine.js` | `client/src/components/incidents/IncidentForm/LocationPicker.jsx` | Jest: `server/tests/dispatch.service.test.js`<br>`server/tests/incident.create.test.js` | Implemented & Verified |
| **CI-1** | Architecture | All endpoints | `server/src/server.js` | `client/src/api/client.js` | Deployment TLS verification | Implemented & Verified |
| **CI-2** | UC-04, UC-09, UC-10, UC-13 | WebSocket handshake | `server/src/sockets/index.js`<br>`server/src/server.js` | `client/src/context/SocketContext.jsx` | Jest: `server/tests/notification.test.js`<br>UC-Walkthrough: `UC-09`, `UC-13` | Implemented & Verified |
| **CO-1** | Architecture | All endpoints | `server/package.json`<br>`server/src/app.js` | `client/package.json`<br>`client/src/App.jsx` | Full test suite execution across PERN layers | Implemented & Verified |
| **CO-2** | UC-09, UC-13 | WebSocket events | `server/src/services/notification.service.js`<br>`server/src/sockets/index.js` | `client/src/context/SocketContext.jsx` | Jest: `server/tests/notification.test.js` | Implemented & Verified |
| **CO-3** | UC-01, UC-02, UC-14 | All protected `/api/*` routes | `server/src/middleware/auth.middleware.js` | `client/src/api/client.js` | Jest: `server/tests/rbac.matrix.test.js` | Implemented & Verified |
| **CO-4** | UC-03, UC-09 | **MISSING** *(Map tile rendering)* | **MISSING** *(Client-side map)* | `client/src/components/map/LeafletMap/LeafletMap.jsx` | UC-Walkthrough: `UC-03`, `UC-09` | Implemented & Verified |
| **OE-2** | Architecture | All endpoints | `server/src/config/db.js`<br>`server/src/models/index.js` | **MISSING** *(Data tier)* | Database migrations & seed execution | Implemented & Verified |
| **SI-1** | UC-03, UC-09 | **MISSING** *(OpenStreetMap tiles)* | **MISSING** *(Client-side map)* | `client/src/components/map/LeafletMap/LeafletMap.jsx` | UC-Walkthrough: `UC-03`, `UC-09` | Implemented & Verified |
| **SI-2** | Architecture | All endpoints | `server/src/models/*`<br>`server/src/migrations/*` | **MISSING** *(Data tier)* | Jest test suites querying PostgreSQL tables | Implemented & Verified |

---

## 3. Analysis of MISSING Cells

Below is the complete itemised inventory of every cell in the traceability matrix marked as `MISSING`:

### 3.1 Missing API Endpoints
*These requirements are client-side user experience constructs, styling systems, or infrastructure constraints that do not expose a dedicated HTTP route:*
1. **`UI-1` (Role-Based Route Guards):** Implemented client-side in `AppRouter.jsx` and `ProtectedRoute.jsx`. There is no dedicated backend route.
2. **`UI-2` (Responsive Viewport Layout):** Implemented using CSS flexbox/grid and media queries across client views. No backend route exists.
3. **`UI-3` (Click-Depth Navigation):** Navigation hierarchy implemented on `Landing.jsx` and `Login.jsx`. No backend route exists.
4. **`UI-4` (Design Tokens & Color Coding):** Implemented via `tokens.css` and UI badge components. No backend route exists.
5. **`CO-4` (Leaflet.js Mapping):** Client-side mapping engine; renders OpenStreetMap tiles directly in the browser.
6. **`SI-1` (Leaflet / OSM Interface):** Client-side browser map component interface.

### 3.2 Missing Server Files
*These requirements are strictly frontend UI components or client architectural layers:*
1. **`UI-1` (Route Guards):** Handled entirely within React Router on the client.
2. **`UI-2` (Responsive UI):** Frontend CSS modules and responsive components.
3. **`UI-3` (Two-Click Reporting Flow):** Frontend page layout and CTAs.
4. **`UI-4` (Color System):** Frontend design tokens and badges.
5. **`CO-4` (OpenStreetMap Integration):** Leaflet client mapping.
6. **`SI-1` (Leaflet Map Component):** Leaflet client component.

### 3.3 Missing Client Components
*These requirements represent backend or data-tier concerns that have no direct frontend presentation layer:*
1. **`PE-1` (Concurrency Sizing):** Handled by Node.js event loop and Sequelize pool configuration in `server/src/config/db.js`.
2. **`OE-2` (PostgreSQL Database):** Data persistence tier managed via Sequelize ORM.
3. **`SI-2` (Database Schema Persistence):** PostgreSQL relational schema and migrations.

---

## 4. Test Coverage & Gap Analysis

### 4.1 Requirements with Complete Automated Jest Test Coverage
The following **27 requirements** have full unit and integration test suites in `server/tests/`:
- `Auth.Login` (`server/tests/helpers/auth.js`)
- `Auth.RBAC` (`server/tests/rbac.matrix.test.js`)
- `Incident.Report` (`server/tests/incident.create.test.js`)
- `Incident.Report.Location` (`server/tests/incident.create.test.js`)
- `Incident.Report.Confirm` (`server/tests/incident.create.test.js`)
- `Dispatch.Assign.Nearest` (`server/tests/dispatch.service.test.js`)
- `Dispatch.Assign.NoStation` (`server/tests/dispatch.service.test.js`, `server/tests/incident.create.test.js`)
- `Dispatch.Override` (`server/tests/dispatch.reassign.test.js`)
- `Resource.Availability` (`server/tests/resource.api.test.js`, `server/tests/resource.service.test.js`)
- `Station.Manage` (`server/tests/resource.api.test.js`)
- `Vehicle.Manage` (`server/tests/resource.api.test.js`)
- `Vehicle.Status.Auto` (`server/tests/dispatch.service.test.js`, `server/tests/dispatch.reassign.test.js`, `server/tests/resource.service.test.js`, `server/tests/incident.lifecycle.test.js`)
- `Personnel.Manage` (`server/tests/resource.api.test.js`)
- `Monitor.Live` (`server/tests/incident.read.test.js`, `server/tests/notification.test.js`)
- `Monitor.Filter` (`server/tests/incident.read.test.js`)
- `Monitor.Count` (`server/tests/incident.read.test.js`)
- `Incident.Status.Update` (`server/tests/incident.status.test.js`)
- `Incident.Status.Invalid` (`server/tests/incident.transitions.test.js`, `server/tests/incident.status.test.js`)
- `Incident.Status.Transition` (`server/tests/incident.transitions.test.js`, `server/tests/incident.lifecycle.test.js`)
- `Incident.Log` (`server/tests/incident.status.test.js`)
- `Incident.Resolve` (`server/tests/incident.lifecycle.test.js`)
- `Incident.Close` (`server/tests/incident.lifecycle.test.js`, `server/tests/rbac.matrix.test.js`)
- `Incident.History` (`server/tests/incident.read.test.js`, `server/tests/incident.lifecycle.test.js`)
- `Notify.InApp` (`server/tests/notification.test.js`)
- `Notify.Dispatch` (`server/tests/notification.test.js`, `server/tests/incident.create.test.js`)
- `Notify.Citizen` (`server/tests/notification.test.js`, `server/tests/incident.lifecycle.test.js`)
- `Admin.User.Manage` (`server/tests/user.admin.test.js`)
- `Admin.User.Role` (`server/tests/user.admin.test.js`)
- `BR-1` through `BR-5` (`server/tests/rbac.matrix.test.js`, `server/tests/user.admin.test.js`, `server/tests/resource.api.test.js`, `server/tests/incident.lifecycle.test.js`, `server/tests/dispatch.reassign.test.js`)
- `SE-2`, `SE-3`, `SE-4`, `SE-5` (`server/tests/user.admin.test.js`, `server/tests/rbac.matrix.test.js`, `server/tests/incident.read.test.js`, `server/tests/notification.test.js`)
- `PE-2`, `PE-4`, `SF-1`, `SF-2`, `Reliability-1`, `CO-2`, `CO-3`, `AS-1`, `AS-2`, `CI-2`

### 4.2 Requirements with No Automated Jest Tests (Covered via Postman / UC-Walkthrough)
The following requirements currently rely on Postman collections, linting scripts, or manual browser use-case walkthroughs:

1. **`Auth.Register` & `Auth.Register.Validate`:**
   - *Current Coverage:* Postman Track 1 collection (`Auth / Register Citizen` & validation error tests) and UC-Walkthrough `UC-01`.
   - *Gap:* No dedicated `server/tests/auth.test.js` exercising `POST /api/auth/register` and edge cases (duplicate email, short password) in Jest.
2. **`Auth.Login.Fail` & `Auth.Logout`:**
   - *Current Coverage:* Postman Track 1 collection (`Auth / Login Failures`, `Auth / Logout`) and UC-Walkthrough `UC-02`.
   - *Gap:* `server/tests/helpers/auth.js` verifies successful login, but failed logins and logout endpoints do not have dedicated Jest assertions.
3. **`UI-1` (Route Protection) & `UI-3` (Click Depth):**
   - *Current Coverage:* UC-Walkthrough `UC-01`, `UC-02`, and manual route tampering verification.
   - *Gap:* No automated React component / Cypress / Playwright tests for client navigation.
4. **`UI-2` (Responsive Layout):**
   - *Current Coverage:* Manual verification in Chrome DevTools mobile viewports per Section 14.10.
   - *Gap:* No automated visual regression tests.
5. **`UI-4` (Token Consistency & No Color Literals):**
   - *Current Coverage:* Custom automated scanner `client/scripts/check-no-hex.mjs` run via `npm run lint:tokens`.
   - *Gap:* Token guard is part of the linting pipeline rather than the Jest test runner.
6. **`Usability-1` (Incident Report within 2 Minutes):**
   - *Current Coverage:* Manual timing during UC-Walkthrough `UC-03`.
   - *Gap:* Human usability metric; cannot be asserted via Jest.
7. **`PE-1` (20-30 Concurrent Users) & `PE-3` (Read Latency < 3s):**
   - *Current Coverage:* Manual Postman response duration metrics and architectural review.
   - *Gap:* No automated k6 or Artillery load-testing script committed to the repository.
8. **`SE-1` (Transport TLS / HTTPS) & `CI-1`:**
   - *Current Coverage:* Platform-level deployment configuration (Vercel/Render TLS termination).
   - *Gap:* Infrastructure constraint outside the local test runner.
9. **`CO-4` & `SI-1` (Leaflet / OSM Tile Interface):**
   - *Current Coverage:* UC-Walkthrough `UC-03` and `UC-09` browser map rendering.
   - *Gap:* Mocking Leaflet canvas / tile loading in Jest was omitted in favor of manual verification.

---

## 5. Summary & Recommendations

1. **Functional Completeness:** Every single functional requirement (`Auth.*`, `Incident.*`, `Dispatch.*`, `Resource.*`, `Station.*`, `Vehicle.*`, `Personnel.*`, `Monitor.*`, `Notify.*`, `Admin.*`) is implemented in code and has verified API and UI implementations.
2. **Automated Testing Strength:** The core business logic—including the Haversine dispatch algorithm, database transactions, vehicle locking/release, the 6-state incident transition machine, notification routing, and the multi-role RBAC matrix—is heavily covered by 12 Jest test suites.
3. **Follow-up Tasks for Final Report:**
   - Add a lightweight `server/tests/auth.test.js` to bring `Auth.Register`, `Auth.Register.Validate`, and `Auth.Logout` into the Jest automated pipeline.
   - Note the distinction in the final report between requirements validated by unit/integration tests (Jest), API contract suites (Postman), static token guards (`npm run lint:tokens`), and end-to-end user journeys (`UC-Walkthrough.md`).
