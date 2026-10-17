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
 * All DB mutations happen inside the provided transaction (or a new one if none given).
 * After commit the caller should:
 *   - notifyStationOnDuty (new station)
 *   - notifyReporter
 *   (incident:updated is already emitted by incident-state.service.transition)
 *
 * @param {object} incident   Sequelize Incident instance
 * @param {number} stationId  Target station id
 * @param {{ actorId?: number, transaction?: object }} opts
 * @returns {Promise<{ station: Station, vehicle: Vehicle }>}
 */
const reassign = async (incident, stationId, { actorId, transaction } = {}) => {
  // 1. Lock a vehicle at the target station with FOR UPDATE
  const newVehicle = await resourceService.getAvailableVehicle(stationId, { transaction });
  if (!newVehicle) {
    throw new AppError(409, 'CONFLICT', 'Target station has no available vehicle.');
  }

  const now = new Date();

  // 2. Release previous vehicle(s) (set released_at, vehicle → 'available')
  await resourceService.releaseVehicles(incident.id, { transaction });

  // 3. Create new incident_vehicles row
  await IncidentVehicle.create(
    {
      incidentId: incident.id,
      vehicleId:  newVehicle.id,
      assignedAt: now,
      releasedAt: null,
    },
    { transaction }
  );

  // 4. Set new vehicle status to 'dispatched'
  newVehicle.status = VEHICLE_STATUS.DISPATCHED;
  await newVehicle.save({ transaction });

  // 5. Update incident.stationId
  incident.stationId = stationId;
  await incident.save({ transaction });

  // 6. Transition to 'assigned' (handles history row + emits incident:updated after commit)
  const incidentStateService = require('./incident-state.service');
  await incidentStateService.transition(incident, INCIDENT_STATUS.ASSIGNED, { actorId, transaction });

  // Load the Station for the response
  const station = await Station.findByPk(stationId, { transaction });

  return { station, vehicle: newVehicle };
};

module.exports = { assignNearest, reassign };

