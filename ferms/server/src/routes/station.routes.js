// routes/station.routes.js — Registers CRUD endpoints for fire stations and their resources
'use strict';

const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middleware/auth.middleware');
const { allowRoles, requireOwnStation } = require('../middleware/rbac.middleware');
const { ROLES } = require('../domain/constants');

const stationController = require('../controllers/station.controller');
const vehicleController = require('../controllers/vehicle.controller');
const personnelController = require('../controllers/personnel.controller');

// GET /api/stations (any authenticated user)
router.get(
  '/',
  authenticate,
  allowRoles(
    ROLES.CITIZEN,
    ROLES.DISPATCH_OPERATOR,
    ROLES.FIREFIGHTER,
    ROLES.STATION_OFFICER,
    ROLES.ADMIN
  ),
  asyncHandler(stationController.listStations)
);

// POST /api/stations (admin)
router.post(
  '/',
  authenticate,
  allowRoles(ROLES.ADMIN),
  asyncHandler(stationController.createStation)
);

// PATCH /api/stations/:id (admin)
router.patch(
  '/:id',
  authenticate,
  allowRoles(ROLES.ADMIN),
  asyncHandler(stationController.updateStation)
);

// GET /api/stations/:id/vehicles (station officer for own station, admin)
router.get(
  '/:id/vehicles',
  authenticate,
  allowRoles(ROLES.STATION_OFFICER, ROLES.ADMIN),
  requireOwnStation((req) => req.params.id),
  asyncHandler(vehicleController.listStationVehicles)
);

// GET /api/stations/:id/personnel (own station officer, admin)
router.get(
  '/:id/personnel',
  authenticate,
  allowRoles(ROLES.STATION_OFFICER, ROLES.ADMIN),
  requireOwnStation((req) => req.params.id),
  asyncHandler(personnelController.listStationPersonnel)
);

module.exports = router;
