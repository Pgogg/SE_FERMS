// utils/serializers.js — Converts Sequelize model instances to safe API-shaped plain objects
//
// These functions are the ONLY place that translates between model columns and
// the JSON keys the client sees.  Keep them in sync with CONVENTIONS §4 and
// the openapi contract.

/**
 * serializeIncident
 * Returns a plain object safe to send over the wire.  Never includes internal
 * or Sequelize-specific fields.
 *
 * Shape (CONVENTIONS §4):
 *   { id, reporterId, latitude, longitude, address, description, severity,
 *     status, stationId, station: {id, name} | null, closingSummary,
 *     createdAt, updatedAt }
 *
 * @param {object} incident  Sequelize Incident instance (may have Station eager-loaded)
 * @returns {object}
 */
const serializeIncident = (incident) => ({
  id:             incident.id,
  reporterId:     incident.reporterId,
  latitude:       incident.latitude,
  longitude:      incident.longitude,
  address:        incident.address    ?? null,
  description:    incident.description,
  severity:       incident.severity,
  status:         incident.status,
  stationId:      incident.stationId  ?? null,
  station:        incident.Station
    ? { id: incident.Station.id, name: incident.Station.name }
    : null,
  closingSummary: incident.closingSummary ?? null,
  createdAt:      incident.createdAt,
  updatedAt:      incident.updatedAt,
});

/**
 * serializeUser
 * Returns the user without the passwordHash field.
 *
 * @param {object} user  Sequelize User instance
 * @returns {object}
 */
const serializeUser = (user) => {
  // Convert to plain object if it's a Sequelize model instance
  const plain = user.toJSON ? user.toJSON() : { ...user };
  // Remove sensitive field under both possible key names
  delete plain.passwordHash;
  delete plain.password_hash;
  return plain;
};

module.exports = { serializeIncident, serializeUser };
