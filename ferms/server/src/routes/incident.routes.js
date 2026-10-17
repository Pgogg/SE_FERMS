// routes/incident.routes.js — Registers CRUD and status-transition endpoints for incidents
'use strict';

const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/rbac.middleware');
const { ROLES } = require('../domain/constants');
const incidentController = require('../controllers/incident.controller');

// ===== Parth =====
// POST /api/incidents — citizen only
// Creates an incident and triggers the nearest-station dispatch engine.
router.post(
  '/',
  authenticate,
  allowRoles(ROLES.CITIZEN),
  incidentController.createIncident
);

// GET /api/incidents/mine — citizen only
// Returns the calling citizen's own incidents, newest first.
// NOTE: This route must be registered BEFORE '/:id' to prevent "mine" being
//       treated as an :id parameter by Vedant's read controller.
router.get(
  '/mine',
  authenticate,
  allowRoles(ROLES.CITIZEN),
  incidentController.myIncidents
);
// ===== /Parth =====

// ===== Vedant =====

// GET /api/incidents (dispatch_operator, station_officer, admin)
router.get(
  '/',
  authenticate,
  allowRoles(ROLES.DISPATCH_OPERATOR, ROLES.STATION_OFFICER, ROLES.ADMIN),
  asyncHandler(incidentController.listIncidents)
);

// GET /api/incidents/stats (dispatch_operator, station_officer, admin) — declared BEFORE /:id
router.get(
  '/stats',
  authenticate,
  allowRoles(ROLES.DISPATCH_OPERATOR, ROLES.STATION_OFFICER, ROLES.ADMIN),
  asyncHandler(incidentController.incidentStats)
);

// GET /api/incidents/assigned (firefighter, station_officer) — declared BEFORE /:id
router.get(
  '/assigned',
  authenticate,
  allowRoles(ROLES.FIREFIGHTER, ROLES.STATION_OFFICER),
  asyncHandler(incidentController.assignedIncidents)
);

// GET /api/incidents/:id (citizen, firefighter, station_officer, dispatch_operator, admin)
router.get(
  '/:id',
  authenticate,
  allowRoles(
    ROLES.CITIZEN,
    ROLES.FIREFIGHTER,
    ROLES.STATION_OFFICER,
    ROLES.DISPATCH_OPERATOR,
    ROLES.ADMIN
  ),
  asyncHandler(incidentController.getIncident)
);

// PATCH /api/incidents/:id/status (firefighter, station_officer)
router.patch(
  '/:id/status',
  authenticate,
  allowRoles(ROLES.FIREFIGHTER, ROLES.STATION_OFFICER),
  asyncHandler(incidentController.updateStatus)
);

// POST /api/incidents/:id/notes (firefighter, station_officer)
router.post(
  '/:id/notes',
  authenticate,
  allowRoles(ROLES.FIREFIGHTER, ROLES.STATION_OFFICER),
  asyncHandler(incidentController.addNote)
);

// ===== /Vedant =====

module.exports = router;
