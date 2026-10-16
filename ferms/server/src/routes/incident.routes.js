// routes/incident.routes.js — Registers CRUD and status-transition endpoints for incidents
'use strict';

const router = require('express').Router();

// ===== Parth =====
const authenticate    = require('../middleware/auth.middleware');
const { allowRoles }  = require('../middleware/rbac.middleware');
const { ROLES }       = require('../domain/constants');
const { createIncident, myIncidents } = require('../controllers/incident.controller');

// POST /api/incidents — citizen only
// Creates an incident and triggers the nearest-station dispatch engine.
router.post(
  '/',
  authenticate,
  allowRoles(ROLES.CITIZEN),
  createIncident
);

// GET /api/incidents/mine — citizen only
// Returns the calling citizen's own incidents, newest first.
// NOTE: This route must be registered BEFORE '/:id' to prevent "mine" being
//       treated as an :id parameter by Vedant's read controller.
router.get(
  '/mine',
  authenticate,
  allowRoles(ROLES.CITIZEN),
  myIncidents
);
// ===== /Parth =====

// ===== Vedant =====
// Vedant's read, stats, assigned, status, notes, resolve, close endpoints go here.
// ===== /Vedant =====

module.exports = router;
