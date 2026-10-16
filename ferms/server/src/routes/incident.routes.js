// routes/incident.routes.js — Registers CRUD and status-transition endpoints for incidents
'use strict';

const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/rbac.middleware');
const { ROLES } = require('../domain/constants');

const incidentController = require('../controllers/incident.controller');

// ===== Parth =====
// POST / (createIncident)
// GET /mine (myIncidents) — must be declared BEFORE /:id
// PATCH /:id/assign (assign)
if (typeof incidentController.myIncidents === 'function') {
  router.get(
    '/mine',
    authenticate,
    allowRoles(ROLES.CITIZEN),
    asyncHandler(incidentController.myIncidents)
  );
}
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

// ===== /Vedant =====

module.exports = router;
