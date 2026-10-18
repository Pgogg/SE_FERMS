// services/user.service.js — Admin user administration service (Feature 4.7, UC-14)
'use strict';

const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { User, Station } = require('../models');
const { ROLES } = require('../domain/constants');
const { AppError } = require('../middleware/error.middleware');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT_STATUS_VALUES = ['active', 'inactive'];

/**
 * listUsers
 * Lists all users with optional role and status filters, newest first.
 *
 * @param {{ role?: string, status?: string }} filters
 * @returns {Promise<Array<User>>}
 */
const listUsers = async ({ role, status } = {}) => {
  const where = {};

  if (role !== undefined) {
    if (!Object.values(ROLES).includes(role)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `Role must be one of: ${Object.values(ROLES).join(', ')}.`
      );
    }
    where.role = role;
  }

  if (status !== undefined) {
    if (!ACCOUNT_STATUS_VALUES.includes(status)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `Status must be one of: ${ACCOUNT_STATUS_VALUES.join(', ')}.`
      );
    }
    where.accountStatus = status;
  }

  const users = await User.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [{ model: Station, as: 'station', attributes: ['id', 'name'] }],
  });

  return users;
};

/**
 * createUser
 * Creates a new user with any role.
 * Validates unique email, password length >= 8, role, and stationId requirements.
 *
 * @param {object} userData
 * @returns {Promise<User>}
 */
const createUser = async ({ name, email, password, role, phone, stationId, onDuty }) => {
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required.' });
  } else if (name.length > 100) {
    errors.push({ field: 'name', message: 'Name must be at most 100 characters.' });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Valid email is required.' });
  } else if (email.length > 150) {
    errors.push({ field: 'email', message: 'Email must be at most 150 characters.' });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });
  }

  if (!role || !Object.values(ROLES).includes(role)) {
    errors.push({
      field: 'role',
      message: `Role is required and must be one of: ${Object.values(ROLES).join(', ')}.`,
    });
  }

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', { details: errors });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check unique email
  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new AppError(409, 'CONFLICT', 'Email already in use.');
  }

  // stationId validation
  let parsedStationId = null;
  if (role === ROLES.FIREFIGHTER || role === ROLES.STATION_OFFICER) {
    if (stationId === undefined || stationId === null || stationId === '') {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `stationId is required for role '${role}'.`
      );
    }
  }

  if (stationId !== undefined && stationId !== null && stationId !== '') {
    parsedStationId = parseInt(stationId, 10);
    if (Number.isNaN(parsedStationId) || parsedStationId <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'stationId must be a positive integer.');
    }
    const station = await Station.findByPk(parsedStationId);
    if (!station) {
      throw new AppError(400, 'VALIDATION_ERROR', `Station ${parsedStationId} not found.`);
    }
  }

  if (phone && (typeof phone !== 'string' || phone.length > 20)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Phone must be at most 20 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  const user = await User.create({
    name:          name.trim(),
    email:         normalizedEmail,
    passwordHash,
    role,
    phone:         phone ? phone.trim() : null,
    stationId:     parsedStationId,
    onDuty:        Boolean(onDuty),
    accountStatus: 'active',
    createdAt:     now,
  });

  return user;
};

/**
 * updateUser
 * Updates user name, phone, email (unique), stationId, and optional onDuty.
 *
 * @param {number} id
 * @param {object} updates
 * @returns {Promise<User>}
 */
const updateUser = async (id, { name, phone, email, stationId, onDuty }) => {
  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found.');
  }

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Name must be between 1 and 100 characters.');
    }
    user.name = name.trim();
  }

  if (phone !== undefined) {
    if (phone !== null && phone !== '') {
      if (typeof phone !== 'string' || phone.length > 20) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Phone must be at most 20 characters.');
      }
      user.phone = phone.trim();
    } else {
      user.phone = null;
    }
  }

  if (email !== undefined) {
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) || email.length > 150) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Valid email is required.');
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== user.email) {
      const existing = await User.findOne({
        where: {
          email: normalizedEmail,
          id: { [Op.ne]: user.id },
        },
      });
      if (existing) {
        throw new AppError(409, 'CONFLICT', 'Email already in use.');
      }
      user.email = normalizedEmail;
    }
  }

  if (stationId !== undefined) {
    if (stationId !== null && stationId !== '') {
      const parsedStationId = parseInt(stationId, 10);
      if (Number.isNaN(parsedStationId) || parsedStationId <= 0) {
        throw new AppError(400, 'VALIDATION_ERROR', 'stationId must be a positive integer.');
      }
      const station = await Station.findByPk(parsedStationId);
      if (!station) {
        throw new AppError(400, 'VALIDATION_ERROR', `Station ${parsedStationId} not found.`);
      }
      user.stationId = parsedStationId;
    } else {
      if (user.role === ROLES.FIREFIGHTER || user.role === ROLES.STATION_OFFICER) {
        throw new AppError(400, 'VALIDATION_ERROR', `stationId is required for role '${user.role}'.`);
      }
      user.stationId = null;
    }
  }

  if (onDuty !== undefined) {
    user.onDuty = Boolean(onDuty);
  }

  await user.save();
  return user;
};

/**
 * updateUserRole
 * Updates user role (validated against ROLES).
 *
 * @param {number} id
 * @param {string} role
 * @returns {Promise<User>}
 */
const updateUserRole = async (id, role) => {
  if (!role || !Object.values(ROLES).includes(role)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `Role must be one of: ${Object.values(ROLES).join(', ')}.`
    );
  }

  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found.');
  }

  if ((role === ROLES.FIREFIGHTER || role === ROLES.STATION_OFFICER) && !user.stationId) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `User must be assigned to a station before switching to role '${role}'.`
    );
  }

  user.role = role;
  await user.save();
  return user;
};

/**
 * deactivateUser
 * Sets accountStatus to 'inactive'.
 * Rejected with 400 if the target is the caller itself.
 *
 * @param {number} id
 * @param {number} callerId
 * @returns {Promise<User>}
 */
const deactivateUser = async (id, callerId) => {
  if (parseInt(id, 10) === parseInt(callerId, 10)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'You cannot deactivate your own account.');
  }

  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found.');
  }

  user.accountStatus = 'inactive';
  await user.save();
  return user;
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  updateUserRole,
  deactivateUser,
};
