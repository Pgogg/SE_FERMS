// routes/user.routes.js — Registers CRUD endpoints for user management (admin only, §5.5, Feature 4.7)
'use strict';

const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/rbac.middleware');
const { ROLES } = require('../domain/constants');
const userController = require('../controllers/user.controller');

// All user management routes are restricted to admin
router.use(authenticate, allowRoles(ROLES.ADMIN));

// GET /api/users — list users with optional ?role= and ?status= filters
router.get('/', asyncHandler(userController.listUsers));

// POST /api/users — create a user with any role
router.post('/', asyncHandler(userController.createUser));

// PATCH /api/users/:id — update user details (name, phone, email, stationId, onDuty)
router.patch('/:id', asyncHandler(userController.updateUser));

// PATCH /api/users/:id/role — change user role
router.patch('/:id/role', asyncHandler(userController.updateUserRole));

// PATCH /api/users/:id/deactivate — deactivate user account
router.patch('/:id/deactivate', asyncHandler(userController.deactivateUser));

module.exports = router;
