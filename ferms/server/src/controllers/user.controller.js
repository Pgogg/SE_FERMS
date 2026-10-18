// controllers/user.controller.js — Handles user management for administrators (§5.5, Feature 4.7)
'use strict';

const userService = require('../services/user.service');
const { serializeUser } = require('../utils/serializers');
const { AppError } = require('../middleware/error.middleware');

/**
 * listUsers
 * GET /api/users (admin only)
 * Filters by ?role= and ?status=, newest first, excludes passwordHash.
 */
const listUsers = async (req, res) => {
  const { role, status } = req.query;
  const users = await userService.listUsers({ role, status });

  return res.json({
    data: users.map(serializeUser),
    meta: { count: users.length },
  });
};

/**
 * createUser
 * POST /api/users (admin only)
 * Creates a user with any role. Returns 201 with UserEnvelope.
 */
const createUser = async (req, res) => {
  const { name, email, password, role, phone, stationId, onDuty } = req.body || {};
  const user = await userService.createUser({
    name,
    email,
    password,
    role,
    phone,
    stationId,
    onDuty,
  });

  return res.status(201).json({
    data: serializeUser(user),
  });
};

/**
 * updateUser
 * PATCH /api/users/:id (admin only)
 * Updates name, phone, email (unique), stationId, onDuty.
 */
const updateUser = async (req, res) => {
  const { id } = req.params;
  const parsedId = parseInt(id, 10);
  if (Number.isNaN(parsedId) || parsedId <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'User ID must be a positive integer.');
  }

  const { name, phone, email, stationId, onDuty } = req.body || {};
  const user = await userService.updateUser(parsedId, {
    name,
    phone,
    email,
    stationId,
    onDuty,
  });

  return res.json({
    data: serializeUser(user),
  });
};

/**
 * updateUserRole
 * PATCH /api/users/:id/role (admin only)
 * Updates role.
 */
const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const parsedId = parseInt(id, 10);
  if (Number.isNaN(parsedId) || parsedId <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'User ID must be a positive integer.');
  }

  const { role } = req.body || {};
  const user = await userService.updateUserRole(parsedId, role);

  return res.json({
    data: serializeUser(user),
  });
};

/**
 * deactivateUser
 * PATCH /api/users/:id/deactivate (admin only)
 * Sets accountStatus to 'inactive'.
 * Returns 400 if target is the calling admin.
 */
const deactivateUser = async (req, res) => {
  const { id } = req.params;
  const parsedId = parseInt(id, 10);
  if (Number.isNaN(parsedId) || parsedId <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'User ID must be a positive integer.');
  }

  const callerId = req.user?.id;
  const user = await userService.deactivateUser(parsedId, callerId);

  return res.json({
    data: serializeUser(user),
  });
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  updateUserRole,
  deactivateUser,
};
