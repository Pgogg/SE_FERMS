// middleware/auth.middleware.js — Verifies JWT from Authorization header and attaches user to req
'use strict';

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { AppError } = require('./error.middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_supersecret';

const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // 1. Real JWT path when Authorization: Bearer <token> is provided
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const userId = payload.userId !== undefined ? payload.userId : payload.id;
      const user = await User.findByPk(userId);

      if (!user) {
        return next(new AppError(401, 'UNAUTHORIZED', 'User not found.'));
      }

      // Re-check account_status from DB (§9.1, §7.4, Requirement 2)
      if (user.accountStatus === 'inactive') {
        return next(new AppError(401, 'UNAUTHORIZED', 'Account is deactivated.'));
      }

      req.user = {
        id:        user.id,
        role:      user.role,
        stationId: user.stationId,
        onDuty:    user.onDuty,
        name:      user.name,
        email:     user.email,
      };

      return next();
    } catch (err) {
      if (err instanceof AppError) {
        return next(err);
      }
      return next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token.'));
    }
  }

  // 2. Dev shortcut when NODE_ENV !== 'production' (x-dev-role headers)
  if (process.env.NODE_ENV !== 'production') {
    const role      = req.headers['x-dev-role'] || 'admin';
    const stationId = req.headers['x-dev-station-id']
      ? parseInt(req.headers['x-dev-station-id'], 10)
      : null;
    const devUserId = req.headers['x-dev-user-id']
      ? parseInt(req.headers['x-dev-user-id'], 10)
      : 0;

    // Check account status if user exists
    if (devUserId) {
      try {
        const devUser = await User.findByPk(devUserId);
        if (devUser && devUser.accountStatus === 'inactive') {
          return next(new AppError(401, 'UNAUTHORIZED', 'Account is deactivated.'));
        }
      } catch (e) {
        // Ignore DB lookup error in dev fallback
      }
    }

    req.user = {
      id:        devUserId,
      role,
      stationId: Number.isNaN(stationId) ? null : stationId,
      onDuty:    false,
    };

    return next();
  }

  return next(new AppError(401, 'UNAUTHORIZED', 'Missing or malformed token.'));
};

module.exports = authenticate;
