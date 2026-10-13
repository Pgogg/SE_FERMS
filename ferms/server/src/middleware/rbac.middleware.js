// middleware/rbac.middleware.js — Role-based access control: restricts routes to specific user roles
const { AppError } = require('./error.middleware');

/**
 * allowRoles(...roles)
 * Returns an Express middleware that rejects callers whose role is not in
 * the provided list with a 403 FORBIDDEN error.
 *
 * Usage:  router.get('/', authenticate, allowRoles(ROLES.ADMIN, ROLES.DISPATCH_OPERATOR), controller)
 *
 * @param {...string} roles  Allowed role strings (from domain/constants ROLES)
 * @returns {Function}       Express middleware (req, res, next) => void
 */
const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated.'));
  }
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError(403, 'FORBIDDEN', `Role '${req.user.role}' is not permitted to access this resource.`)
    );
  }
  return next();
};

/**
 * requireOwnStation(getStationId)
 * Returns middleware that ensures the acting user belongs to the station
 * referenced in the request. Admin users are exempt.
 *
 * @param {Function} getStationId  (req) => number|string — extracts the target
 *                                 station id from the request (e.g. from
 *                                 req.params.id or req.body.stationId).
 * @returns {Function}             Express middleware
 */
const requireOwnStation = (getStationId) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated.'));
  }

  // Admin is exempt from station-scoping
  if (req.user.role === 'admin') {
    return next();
  }

  const targetStationId = parseInt(getStationId(req), 10);
  const userStationId   = req.user.stationId;

  if (!userStationId || userStationId !== targetStationId) {
    return next(
      new AppError(403, 'FORBIDDEN', 'You do not have access to this station\'s resources.')
    );
  }

  return next();
};

module.exports = { allowRoles, requireOwnStation };
