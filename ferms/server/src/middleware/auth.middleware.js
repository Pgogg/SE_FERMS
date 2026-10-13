// middleware/auth.middleware.js — Verifies JWT from Authorization header and attaches user to req
//
// In Week 2 the real JWT path below the dev-mode block will be implemented.
// For now, when NODE_ENV !== 'production', the middleware reads:
//   x-dev-role       → req.user.role
//   x-dev-station-id → req.user.stationId  (parsed as integer, or null)
// so every route can be exercised without a real token during development.

const { AppError } = require('./error.middleware');

// TODO(week-2): replace dev-mode stub with real JWT verification using jsonwebtoken.verify()

const authenticate = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    // --- Dev shortcut: headers drive the fake user -------------------------
    const role      = req.headers['x-dev-role'] || 'admin';
    const stationId = req.headers['x-dev-station-id']
      ? parseInt(req.headers['x-dev-station-id'], 10)
      : null;

    req.user = {
      id:        0,          // placeholder; real JWT will carry the real id
      role,
      stationId: Number.isNaN(stationId) ? null : stationId,
      onDuty:    false,
    };

    return next();
  }

  // TODO(week-2): production — verify Bearer JWT
  // const authHeader = req.headers['authorization'];
  // if (!authHeader || !authHeader.startsWith('Bearer ')) {
  //   return next(new AppError(401, 'UNAUTHORIZED', 'Missing or malformed token.'));
  // }
  // const token = authHeader.split(' ')[1];
  // try {
  //   const payload = jwt.verify(token, process.env.JWT_SECRET);
  //   // re-check account_status from DB here
  //   req.user = { id: payload.userId, role: payload.role, stationId: payload.stationId };
  //   next();
  // } catch (e) {
  //   next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token.'));
  // }

  return next(new AppError(401, 'UNAUTHORIZED', 'Authentication not yet implemented in production.'));
};

module.exports = authenticate;
