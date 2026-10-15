// routes/personnel.routes.js — Registers endpoints for listing and managing personnel assigned to stations
'use strict';

const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/rbac.middleware');
const { ROLES } = require('../domain/constants');

const personnelController = require('../controllers/personnel.controller');

// PATCH /api/personnel/:userId/station with { stationId }
// Officers can only move firefighters who have no station or are already at their own station, into their own station; admin can set any station.
router.patch(
  '/:userId/station',
  authenticate,
  allowRoles(ROLES.STATION_OFFICER, ROLES.ADMIN),
  asyncHandler(personnelController.updatePersonnelStation)
);

// PATCH /api/personnel/:userId/duty with { onDuty }
// Officer only for personnel at their own station; admin any.
router.patch(
  '/:userId/duty',
  authenticate,
  allowRoles(ROLES.STATION_OFFICER, ROLES.ADMIN),
  asyncHandler(personnelController.updatePersonnelDuty)
);

module.exports = router;
