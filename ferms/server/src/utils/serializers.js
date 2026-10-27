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

/**
 * serializeIncidentWithVehicles
 * Same as serializeIncident but also includes the `vehicles` array
 * built from eager-loaded incidentVehicles (IncidentVehicle → Vehicle).
 *
 * @param {object} incident  Sequelize Incident instance with incidentVehicles included
 * @returns {object}
 */
const serializeIncidentWithVehicles = (incident) => {
  const base = serializeIncident(incident);

  // BelongsToMany: incident.vehicles is array of Vehicle instances,
  // each with junction data at vehicle.IncidentVehicle
  const vehicleRows = incident.vehicles || [];
  const vehicles = vehicleRows.map((v) => {
    const junction = v.IncidentVehicle || v.incidentVehicle || {};
    return {
      id:             v.id,
      type:           v.type           ?? null,
      registrationNo: v.registrationNo ?? null,
      status:         v.status         ?? null,
      assignedAt:     junction.assignedAt  ?? junction.assigned_at  ?? null,
      releasedAt:     junction.releasedAt  ?? junction.released_at  ?? null,
    };
  });

  return { ...base, vehicles };
};

module.exports = { serializeIncident, serializeIncidentWithVehicles, serializeUser };
