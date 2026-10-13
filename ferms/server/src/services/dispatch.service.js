// services/dispatch.service.js — Finds the nearest available station and reserves a vehicle (Haversine)
//
// CONVENTIONS §4 frozen interface:
//   assignNearest(incident, { transaction }) -> { station, vehicle }
//   reassign(incident, stationId, { actorId, transaction }) -> { station, vehicle }
//
// STUB: assignNearest returns { station: null, vehicle: null }.
//       reassign throws AppError 501 (Not Implemented).
// Week 2: replace with Haversine sort + resource.service.getAvailableVehicle().

const { AppError } = require('../middleware/error.middleware');

/**
 * assignNearest
 * Finds the geographically closest station that has an available vehicle and
 * reserves that vehicle for the incident.
 *
 * @param {object} incident   Sequelize Incident instance (must have latitude, longitude)
 * @param {{ transaction? }} opts
 * @returns {Promise<{ station: null, vehicle: null }>}  Week 2: real Station + Vehicle
 */
const assignNearest = async (incident, { transaction } = {}) => {
  // TODO(week-2): load all stations, compute Haversine distance, call
  //   resource.service.getAvailableVehicle(stationId, { transaction }) for
  //   each station (nearest-first), pick the first that returns a vehicle,
  //   insert incident_vehicles row, set vehicle status to 'dispatched'.
  console.log('[dispatch.service] assignNearest (stub)', { incidentId: incident.id });
  return { station: null, vehicle: null };
};

/**
 * reassign
 * Manually overrides the station assignment for an incident.
 * Releases the previous vehicle(s) and reserves one at the target station.
 * Throws 409 CONFLICT if the target station has no available vehicle.
 *
 * @param {object} incident   Sequelize Incident instance
 * @param {number} stationId  Target station id
 * @param {{ actorId?, transaction? }} opts
 * @returns {Promise<{ station, vehicle }>}
 */
const reassign = async (incident, stationId, { actorId, transaction } = {}) => {
  // TODO(week-2): check target station availability, release old vehicle(s),
  //   reserve new vehicle, update incident.stationId, write history row.
  throw new AppError(501, 'NOT_IMPLEMENTED', 'dispatch.service.reassign is not yet implemented.');
};

module.exports = { assignNearest, reassign };
