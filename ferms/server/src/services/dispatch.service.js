// services/dispatch.service.js — Finds the nearest available station and reserves a vehicle (Haversine)
//
// CONVENTIONS §4 frozen interface:
//   assignNearest(incident, { transaction }) -> { station, vehicle }
//   reassign(incident, stationId, { actorId, transaction }) -> { station, vehicle }
'use strict';

const { Station, IncidentVehicle, Vehicle, IncidentStatusHistory } = require('../models');
const resourceService = require('./resource.service');
const { distanceKm }  = require('../utils/haversine');
const { AppError }    = require('../middleware/error.middleware');
const { INCIDENT_STATUS, VEHICLE_STATUS } = require('../domain/constants');

/**
 * assignNearest
 * Finds the geographically closest station that has an available vehicle and
 * reserves that vehicle for the incident.
 *
 * Steps (all inside the provided transaction):
 *  1. Load all stations.
 *  2. Compute Haversine distance from incident to each station, sort ascending.
 *  3. Walk the sorted list; call resource.service.getAvailableVehicle() for each.
 *  4. First station returning a vehicle wins.
 *  5. In the same transaction:
 *       - set incident.stationId
 *       - create incident_vehicles row
 *       - set vehicle.status = 'dispatched'
 *       - set incident.status = 'assigned'
 *       - write incident_status_history row (changedBy null)
 *     If none qualifies: set status to 'unassigned' and write history row.
 *
 * TODO: switch to incident-state.service.transition in week 6
 *
 * @param {object} incident   Sequelize Incident instance (must have latitude, longitude, id)
 * @param {{ transaction? }} opts
 * @returns {Promise<{ station: Station|null, vehicle: Vehicle|null }>}
 */
const assignNearest = async (incident, { transaction } = {}) => {
  // 1. Load all stations
  const stations = await Station.findAll({ transaction });

  if (!stations.length) {
    // No stations exist — mark unassigned
    incident.status = INCIDENT_STATUS.UNASSIGNED;
    await incident.save({ transaction });

    // TODO: switch to incident-state.service.transition in week 6
    await IncidentStatusHistory.create(
      {
        incidentId: incident.id,
        status:     INCIDENT_STATUS.UNASSIGNED,
        changedBy:  null,
        changedAt:  new Date(),
      },
      { transaction }
    );

    return { station: null, vehicle: null };
  }

  // 2. Compute distances and sort ascending
  const sorted = stations
    .map((s) => ({
      station:  s,
      distance: distanceKm(incident.latitude, incident.longitude, s.latitude, s.longitude),
    }))
    .sort((a, b) => a.distance - b.distance);

  // 3 & 4. Walk sorted list, find first station with an available vehicle
  let winnerStation = null;
  let winnerVehicle = null;

  for (const { station } of sorted) {
    const vehicle = await resourceService.getAvailableVehicle(station.id, { transaction });
    if (vehicle) {
      winnerStation = station;
      winnerVehicle = vehicle;
      break;
    }
  }

  if (!winnerStation) {
    // No station has a free vehicle — mark unassigned
    incident.status = INCIDENT_STATUS.UNASSIGNED;
    await incident.save({ transaction });

    // TODO: switch to incident-state.service.transition in week 6
    await IncidentStatusHistory.create(
      {
        incidentId: incident.id,
        status:     INCIDENT_STATUS.UNASSIGNED,
        changedBy:  null,
        changedAt:  new Date(),
      },
      { transaction }
    );

    return { station: null, vehicle: null };
  }

  // 5. Reserve the vehicle and assign the incident
  const now = new Date();

  // Set incident.stationId and status
  incident.stationId = winnerStation.id;
  incident.status    = INCIDENT_STATUS.ASSIGNED;
  incident.updatedAt = now;
  await incident.save({ transaction });

  // Create incident_vehicles junction row
  await IncidentVehicle.create(
    {
      incidentId: incident.id,
      vehicleId:  winnerVehicle.id,
      assignedAt: now,
      releasedAt: null,
    },
    { transaction }
  );

  // Set vehicle status to 'dispatched'
  winnerVehicle.status = VEHICLE_STATUS.DISPATCHED;
  await winnerVehicle.save({ transaction });

  // Write incident_status_history row (changedBy null — system action)
  // TODO: switch to incident-state.service.transition in week 6
  await IncidentStatusHistory.create(
    {
      incidentId: incident.id,
      status:     INCIDENT_STATUS.ASSIGNED,
      changedBy:  null,
      changedAt:  now,
    },
    { transaction }
  );

  return { station: winnerStation, vehicle: winnerVehicle };
};

/**
 * reassign
 * Manually overrides the station assignment for an incident.
 * Releases the previous vehicle(s) and reserves one at the target station.
 * Throws 409 CONFLICT if the target station has no available vehicle.
 *
 * Implementation deferred to Week 4.
 *
 * @param {object} incident   Sequelize Incident instance
 * @param {number} stationId  Target station id
 * @param {{ actorId?, transaction? }} opts
 * @returns {Promise<{ station, vehicle }>}
 */
const reassign = async (incident, stationId, { actorId, transaction } = {}) => {
  // TODO(week-4): check target station availability, release old vehicle(s),
  //   reserve new vehicle, update incident.stationId, write history row.
  throw new AppError(501, 'NOT_IMPLEMENTED', 'dispatch.service.reassign is not yet implemented.');
};

module.exports = { assignNearest, reassign };
