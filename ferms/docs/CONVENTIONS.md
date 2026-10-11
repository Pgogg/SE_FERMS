# FERMS Conventions (read before every task)

## 1. Sources of truth
Order: docs/SystemDesign.md (design), docs/ImplementationPlan.md (plan and requirement and use-case IDs), docs/openapi.yaml (API contract). If code and docs disagree, the docs win. If two docs disagree, stop and report it. There are no other requirement documents in the repo.

## 2. Ownership
Parth (P) backend: auth, users admin, incident creation, dispatch engine, assign override, notifications, Socket.io server, middleware (auth, rbac, error).
Parth frontend: Login, Register, AuthContext, ProtectedRoute, SocketContext, useSocketEvent, useNotifications, IncidentForm, MyReports, NotificationBell, AssignOverride, UserManagement, Landing.
Vedant (V) backend: stations, vehicles, personnel, resource.service, incident reads, transitions, incident-state.service, status, notes, resolve, close.
Vedant frontend: app foundation, router, design tokens, UI kit (components/ui), AppNavbar, EmergencyCallCard, MonitoringDashboard, map components, StationManagement, StationResources, MyAssignments, IncidentDetail, useIncidents.
Rule: edit only files you own. Shared files (docs/openapi.yaml and the Incident, Vehicle, Notification models) change only through a pull request into main that both approve. In files that both of us edit (server/src/routes/incident.routes.js, server/src/controllers/incident.controller.js, client/src/api/incidents.api.js, server/src/models/index.js), keep your code in its own block marked with a comment banner such as // ===== Parth ===== or // ===== Vedant =====, so merges stay clean. If a task needs a change in someone else's file, stop and say so in your summary.

## 3. Backend rules
- Express. Routes only wire middleware and a controller. Controllers are thin. Logic lives in services.
- Sequelize models: module.exports = (sequelize, DataTypes) => Model, with underscored: true. Tables are snake_case plural, attributes camelCase. Each model defines its own side of associations in Model.associate = (models) => {...}.
- Use constants from server/src/domain/constants.js (ROLES, INCIDENT_STATUS, SEVERITY, VEHICLE_STATUS, NOTIFICATION_TYPE). No string literals for these.
- Errors: throw new AppError(status, code, message, extra) from middleware/error.middleware.js. Never write error JSON by hand. Wrap async handlers with utils/asyncHandler.js.
- Success body: { "data": ... } or { "data": [...], "meta": {...} }. Error body: { "error": { "code", "message", ...extra } }.
- Error codes: VALIDATION_ERROR 400, INVALID_TRANSITION 400, UNAUTHORIZED 401, FORBIDDEN 403, NOT_FOUND 404, CONFLICT 409.
- Every route uses auth.middleware (except register and login) and allowRoles(...). Station-scoped roles are also checked against req.user.stationId; admin is exempt. Never trust role or stationId from a request body.
- Anything that changes more than one table uses a Sequelize transaction. Notifications and socket events are sent only after commit (transaction.afterCommit).
- Never return password_hash. Validate every body, query and path parameter (type, length, enum).
- Tests use Jest and Supertest in server/tests/.

## 4. Frozen server interfaces (names and signatures must not change without both approving)
- resource.service (V): getAvailableVehicle(stationId, { transaction }) -> Vehicle or null (first vehicle with status 'available' at that station, row-locked FOR UPDATE when a transaction is given). releaseVehicles(incidentId, { transaction }) -> number (for every incident_vehicles row with released_at null: set released_at to now and set the vehicle back to 'available').
- notification.service (P): notify({ recipientId, incidentId, type, message }, { transaction }) -> Notification. notifyStationOnDuty(stationId, { incidentId, type, message }, opts) -> Notification[] (active users at that station with on_duty true). notifyRole(role, payload, opts). notifyReporter(incident, message, opts). All create the row and emit notification:new to user:<recipientId> after commit.
- sockets/index.js (P): initSockets(httpServer), emitToUser(userId, event, payload), emitToRole(role, event, payload), emitToStation(stationId, event, payload), emitIncident(event, incident). emitIncident takes 'incident:new' (sent to role:dispatch_operator, role:admin, station:<id>) or 'incident:updated' (same plus user:<reporterId>). Payload is { incident: serializeIncident(incident) }.
- utils/serializers.js (P): serializeIncident(incident) -> { id, reporterId, latitude, longitude, address, description, severity, status, stationId, station: {id,name} or null, closingSummary, createdAt, updatedAt }. serializeUser(user) -> user without passwordHash.
- incident-state.service (V): transition(incident, toStatus, { actorId, transaction }) -> incident. Validates with domain/incident.transitions.js (throws 400 INVALID_TRANSITION with allowedNext), sets status and updatedAt, inserts an incident_status_history row (changedBy = actorId or null), emits incident:updated after commit.
- domain/incident.transitions.js (V): ALLOWED_TRANSITIONS, allowedNext(status).
- dispatch.service (P): assignNearest(incident, { transaction }) -> { station, vehicle } (both null when no station has an available vehicle). reassign(incident, stationId, { actorId, transaction }) -> { station, vehicle }, throws 409 CONFLICT if the target station has no available vehicle.
- middleware (P): auth.middleware sets req.user = { id, role, stationId }. allowRoles(...roles). requireOwnStation(getStationId) compares a station id to req.user.stationId unless the role is admin.

## 5. Socket.io
Rooms: user:<id>, role:<role>, station:<id>. Handshake sends the JWT in socket.handshake.auth.token. Events: incident:new { incident }, incident:updated { incident }, notification:new { notification }.

## 6. Frontend rules
- React + Vite + CSS Modules. Every component and page lives in its own folder: Name/Name.jsx and Name/Name.module.css.
- No colour literals outside src/styles/tokens.css. Use var(--token). Fonts come from @fontsource.
- Use components from src/components/ui for buttons, badges, cards, forms, tables, modals. Do not add UI libraries.
- Backgrounds of --color-brand use dark text (--color-ink), never white, except display text of 24px or larger.
- Status, severity, role and vehicle status are shown only through <Badge>. Never rely on colour alone: icon plus text label.
- Network calls only in src/api/*.js. Each function returns the response envelope { data, meta }. Errors are thrown as ApiError { status, code, message, allowedNext }.
- Token in localStorage key ferms_token, user in key ferms_user, managed only by AuthContext.
- Every data page has a loading state (Skeleton), an empty state (EmptyState) and an error state.
- Accessibility: labels on inputs, visible focus ring, 44px touch targets, aria attributes on modals, respect prefers-reduced-motion.
- Home page by role: citizen /report, dispatch_operator /dashboard, firefighter /assignments, station_officer /dashboard, admin /dashboard.
- Route access: /, /login, /register public. /report and /my-reports: citizen. /dashboard: dispatch_operator, station_officer, admin. /assignments and /assignments/:id: firefighter, station_officer. /station: station_officer, admin. /admin/users and /admin/stations: admin.

## 7. Frozen frontend interfaces
- useAuth() (P) -> { user, token, isAuthenticated, loading, login(email, password), register(data), logout() }. user = { id, name, email, role, stationId, onDuty }.
- <ProtectedRoute roles={[...]} /> (P) renders <Outlet /> or redirects.
- useSocketEvent(eventName, handler) (P), useOnReconnect(callback) (P), useNotifications() (P) -> { notifications, unreadCount, markRead(id), markAllRead(), refetch }.
- <NotificationBell /> (P): no props.
- <AssignOverride incident open onClose onAssigned={(incident)=>{}} /> (P).
- <EmergencyCallCard /> (V): no props. Emergency numbers are constants in src/constants.js.
- useIncidents(params) (V) -> { incidents, stats, loading, error, refetch }.
- UI kit (V): Button({ variant: 'primary'|'dark'|'ghost', size: 'md'|'lg', loading, disabled, ...rest }); Badge({ variant: 'status'|'severity'|'role'|'vehicle', value }); Card({ variant: 'light'|'warm'|'dark'|'accent', as, ...rest }); FormField({ label, name, error, hint, required, children }) and also accepts input props when no children are given; Select({ label, name, options:[{value,label}], value, onChange, error }); SeverityPicker({ value, onChange, error }); SectionHeading({ eyebrow, title, intro }); StatTile({ value, label, tone: 'light'|'dark' }); Stepper({ steps:[{key,label}], currentKey }); Modal({ open, onClose, title, children, footer }); useToast().show({ type:'success'|'error'|'info', message }); Table({ columns:[{key,header,render}], rows, rowKey, onRowClick, empty }); Tabs({ tabs:[{key,label}], value, onChange }); EmptyState({ title, description, action }); Skeleton({ lines, height }).

## 8. Git
Only three branches exist: main, vedant, parth. Work only on your own branch (Vedant on vedant, Parth on parth). Never commit to main directly and never create other branches. Commit message: "<task-id>: summary". When a task is done, push your branch and open a pull request into main; the other person reviews and merges it with a merge commit (not squash or rebase). Before each new task run git fetch origin and git merge origin/main on your branch. Never force-push. Never commit .env.

## 9. End of every task
Run lint and tests (and the build for client). Then print: files created or changed, commands to try it, assumptions you made, and anything you were unsure of. Do not implement anything outside the task. Do not install packages that are not named in the task or already in package.json.
