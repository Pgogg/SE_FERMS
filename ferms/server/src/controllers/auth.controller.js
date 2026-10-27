// controllers/auth.controller.js — Handles register and login request logic, issues JWT tokens
'use strict';

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { User } = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { ROLES } = require('../domain/constants');

const JWT_SECRET  = process.env.JWT_SECRET  || 'changeme_supersecret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
const BCRYPT_ROUNDS = 10;

// Helper: sign a JWT for a user row
function signToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, stationId: user.stationId ?? null },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// Helper: safe user object for responses (no password hash)
function safeUser(user) {
  return {
    id:            user.id,
    name:          user.name,
    email:         user.email,
    phone:         user.phone  ?? null,
    role:          user.role,
    stationId:     user.stationId ?? null,
    onDuty:        user.onDuty   ?? false,
    accountStatus: user.accountStatus,
    createdAt:     user.createdAt,
  };
}

/**
 * POST /api/auth/register — citizen self-registration
 * Body: { name, email, password, phone? }
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const errors = [];
    if (!name  || !name.trim())    errors.push({ field: 'name',     message: 'Name is required.' });
    if (!email || !email.trim())   errors.push({ field: 'email',    message: 'Email is required.' });
    if (!password)                 errors.push({ field: 'password', message: 'Password is required.' });
    else if (password.length < 8)  errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });

    if (errors.length) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', { details: errors }));
    }

    // Check duplicate email
    const existing = await User.unscoped().findOne({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return next(new AppError(409, 'CONFLICT', 'An account with that email already exists.'));
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await User.create({
      name:          name.trim(),
      email:         email.trim().toLowerCase(),
      phone:         phone ? phone.trim() : null,
      passwordHash,
      role:          ROLES.CITIZEN,
      stationId:     null,
      onDuty:        false,
      accountStatus: 'active',
      createdAt:     new Date(),
    });

    const token = signToken(user);

    return res.status(201).json({
      data: {
        token,
        user: safeUser(user),
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'Email and password are required.'));
    }

    // Must use withPassword scope to get hash
    const user = await User.scope('withPassword').findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Invalid email or password.'));
    }

    if (user.accountStatus !== 'active') {
      return next(new AppError(401, 'UNAUTHORIZED', 'Account is deactivated.'));
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Invalid email or password.'));
    }

    const token = signToken(user);

    return res.json({
      data: {
        token,
        user: safeUser(user),
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/auth/logout — stateless JWT; just acknowledge
 */
const logout = async (_req, res) => {
  return res.json({ data: { message: 'Logged out successfully.' } });
};

/**
 * GET /api/auth/me — returns authenticated user's profile
 */
const me = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return next(new AppError(404, 'NOT_FOUND', 'User not found.'));
    }
    return res.json({ data: safeUser(user) });
  } catch (err) {
    return next(err);
  }
};

module.exports = { register, login, logout, me };
