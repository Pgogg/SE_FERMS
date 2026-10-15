// routes/vehicle.routes.js — Registers CRUD endpoints for vehicles and their availability status
'use strict';

const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/rbac.middleware');
const { ROLES } = require('../domain/constants');

const vehicleController = require('../controllers/vehicle.controller');

// POST /api/vehicles (station officer into own station, admin with stationId in the body)
router.post(
  '/',
  authenticate,
  allowRoles(ROLES.STATION_OFFICER, ROLES.ADMIN),
  asyncHandler(vehicleController.createVehicle)
);

// PATCH /api/vehicles/:id (station officer for own station, admin)
router.patch(
  '/:id',
  authenticate,
  allowRoles(ROLES.STATION_OFFICER, ROLES.ADMIN),
  asyncHandler(vehicleController.updateVehicle)
);

// DELETE /api/vehicles/:id (station officer for own station, admin)
router.delete(
  '/:id',
  authenticate,
  allowRoles(ROLES.STATION_OFFICER, ROLES.ADMIN),
  asyncHandler(vehicleController.deleteVehicle)
);

module.exports = router;
