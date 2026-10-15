// services/resource.service.js — Queries and updates vehicle and personnel availability across stations (§4)
'use strict';

const { Vehicle, IncidentVehicle } = require('../models');
const { VEHICLE_STATUS } = require('../domain/constants');

/**
 * getAvailableVehicle
 * Returns the first vehicle with status 'available' at that station,
 * row-locked FOR UPDATE when a transaction is given.
 *
 * @param {number} stationId
 * @param {{ transaction?: object }} [opts]
 * @returns {Promise<Vehicle|null>}
 */
const getAvailableVehicle = async (stationId, { transaction } = {}) => {
  const findOptions = {
    where: {
      stationId,
      status: VEHICLE_STATUS.AVAILABLE,
    },
    order: [['id', 'ASC']],
  };

  if (transaction) {
    findOptions.transaction = transaction;
    findOptions.lock = (transaction.LOCK && transaction.LOCK.UPDATE) ? transaction.LOCK.UPDATE : true;
  }

  const vehicle = await Vehicle.findOne(findOptions);
  return vehicle;
};

/**
 * releaseVehicles
 * For every incident_vehicles row with released_at null:
 * set released_at to now and set the vehicle back to 'available'.
 * Returns the number of vehicles released.
 *
 * @param {number} incidentId
 * @param {{ transaction?: object }} [opts]
 * @returns {Promise<number>}
 */
const releaseVehicles = async (incidentId, { transaction } = {}) => {
  const activeAssignments = await IncidentVehicle.findAll({
    where: {
      incidentId,
      releasedAt: null,
    },
    transaction,
  });

  if (!activeAssignments || activeAssignments.length === 0) {
    return 0;
  }

  const now = new Date();
  const vehicleIds = activeAssignments.map((a) => a.vehicleId);

  await IncidentVehicle.update(
    { releasedAt: now },
    {
      where: {
        incidentId,
        releasedAt: null,
      },
      transaction,
    }
  );

  await Vehicle.update(
    { status: VEHICLE_STATUS.AVAILABLE },
    {
      where: {
        id: vehicleIds,
      },
      transaction,
    }
  );

  return activeAssignments.length;
};

module.exports = {
  getAvailableVehicle,
  releaseVehicles,
};
