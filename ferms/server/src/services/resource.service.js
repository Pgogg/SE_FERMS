// services/resource.service.js — Queries and updates vehicle and personnel availability across stations (§4)
'use strict';

const { Op, fn, col } = require('sequelize');
const { Station, Vehicle, User, IncidentVehicle } = require('../models');
const { ROLES, VEHICLE_STATUS } = require('../domain/constants');
const { AppError } = require('../middleware/error.middleware');

// ============================================================================
// Frozen signatures (CONVENTIONS §4)
// ============================================================================

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

// ============================================================================
// Vedant's Helper Service Functions (TASK W2-V-BE-1)
// ============================================================================

/**
 * listStationsWithCounts
 * Returns all fire stations with grouped counts for availableVehicles and onDutyPersonnel.
 * Requirement 1: Compute with grouped queries, not one query per station.
 *
 * @returns {Promise<Array<object>>}
 */
const listStationsWithCounts = async () => {
  const [stations, vehicleCounts, personnelCounts] = await Promise.all([
    Station.findAll({
      order: [['id', 'ASC']],
    }),
    Vehicle.findAll({
      attributes: [
        'stationId',
        [fn('COUNT', col('id')), 'availableCount'],
      ],
      where: {
        status: VEHICLE_STATUS.AVAILABLE,
      },
      group: ['stationId'],
      raw: true,
    }),
    User.findAll({
      attributes: [
        'stationId',
        [fn('COUNT', col('id')), 'onDutyCount'],
      ],
      where: {
        stationId: { [Op.ne]: null },
        onDuty: true,
        accountStatus: 'active',
        role: { [Op.in]: [ROLES.FIREFIGHTER, ROLES.STATION_OFFICER] },
      },
      group: ['stationId'],
      raw: true,
    }),
  ]);

  const vehicleMap = new Map(
    vehicleCounts.map((r) => [Number(r.stationId), parseInt(r.availableCount, 10)])
  );
  const personnelMap = new Map(
    personnelCounts.map((r) => [Number(r.stationId), parseInt(r.onDutyCount, 10)])
  );

  return stations.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    latitude: s.latitude,
    longitude: s.longitude,
    contact: s.contact,
    availableVehicles: vehicleMap.get(s.id) || 0,
    onDutyPersonnel: personnelMap.get(s.id) || 0,
    createdAt: s.createdAt,
  }));
};

/**
 * createStation
 * Creates a new station with input validation.
 *
 * @param {object} payload
 * @returns {Promise<Station>}
 */
const createStation = async ({ name, address, latitude, longitude, contact }) => {
  if (!name || typeof name !== 'string' || !name.trim() || name.trim().length > 150) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Name is required and must be between 1 and 150 characters.');
  }
  if (!address || typeof address !== 'string' || !address.trim() || address.trim().length > 255) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Address is required and must be between 1 and 255 characters.');
  }

  const lat = Number(latitude);
  if (latitude === undefined || latitude === null || Number.isNaN(lat) || lat < -90 || lat > 90) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Latitude must be a valid number between -90 and 90.');
  }

  const lon = Number(longitude);
  if (longitude === undefined || longitude === null || Number.isNaN(lon) || lon < -180 || lon > 180) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Longitude must be a valid number between -180 and 180.');
  }

  const station = await Station.create({
    name: name.trim(),
    address: address.trim(),
    latitude: lat,
    longitude: lon,
    contact: contact ? String(contact).trim() : null,
    createdAt: new Date(),  // explicit: model declares createdAt allowNull:false
  });

  return station;
};

/**
 * updateStation
 * Updates an existing station's details.
 *
 * @param {number} stationId
 * @param {object} payload
 * @returns {Promise<Station>}
 */
const updateStation = async (stationId, payload) => {
  const station = await Station.findByPk(stationId);
  if (!station) {
    throw new AppError(404, 'NOT_FOUND', 'Station not found.');
  }

  const { name, address, latitude, longitude, contact } = payload;

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim() || name.trim().length > 150) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Name must be between 1 and 150 characters.');
    }
    station.name = name.trim();
  }

  if (address !== undefined) {
    if (!address || typeof address !== 'string' || !address.trim() || address.trim().length > 255) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Address must be between 1 and 255 characters.');
    }
    station.address = address.trim();
  }

  if (latitude !== undefined) {
    const lat = Number(latitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Latitude must be a valid number between -90 and 90.');
    }
    station.latitude = lat;
  }

  if (longitude !== undefined) {
    const lon = Number(longitude);
    if (Number.isNaN(lon) || lon < -180 || lon > 180) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Longitude must be a valid number between -180 and 180.');
    }
    station.longitude = lon;
  }

  if (contact !== undefined) {
    station.contact = contact ? String(contact).trim() : null;
  }

  await station.save();
  return station;
};

/**
 * getStationVehicles
 * Lists all vehicles assigned to a given station.
 *
 * @param {number} stationId
 * @returns {Promise<Array<Vehicle>>}
 */
const getStationVehicles = async (stationId) => {
  const station = await Station.findByPk(stationId);
  if (!station) {
    throw new AppError(404, 'NOT_FOUND', 'Station not found.');
  }

  return Vehicle.findAll({
    where: { stationId },
    order: [['id', 'ASC']],
  });
};

/**
 * createVehicle
 * Registers a new vehicle into a station.
 *
 * @param {object} payload
 * @param {object} user  Current authenticated user (req.user)
 * @returns {Promise<Vehicle>}
 */
const createVehicle = async (payload, user) => {
  const { type, registrationNo, status } = payload;
  let targetStationId;

  if (user.role === ROLES.STATION_OFFICER) {
    if (!user.stationId) {
      throw new AppError(403, 'FORBIDDEN', 'Station officer is not assigned to any station.');
    }
    targetStationId = user.stationId;
  } else {
    // Admin
    if (!payload.stationId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'stationId is required.');
    }
    targetStationId = parseInt(payload.stationId, 10);
  }

  if (!type || typeof type !== 'string' || !type.trim() || type.trim().length > 50) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Vehicle type is required and must be at most 50 characters.');
  }

  if (!registrationNo || typeof registrationNo !== 'string' || !registrationNo.trim() || registrationNo.trim().length > 30) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Registration number is required and must be at most 30 characters.');
  }

  const cleanRegNo = registrationNo.trim().toUpperCase();

  // Check unique registration number (Duplicate registration returns 409)
  const existing = await Vehicle.findOne({
    where: { registrationNo: cleanRegNo },
  });
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Vehicle with this registration number already exists.');
  }

  const station = await Station.findByPk(targetStationId);
  if (!station) {
    throw new AppError(404, 'NOT_FOUND', 'Target station not found.');
  }

  let vehicleStatus = VEHICLE_STATUS.AVAILABLE;
  if (status !== undefined) {
    if (![VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.MAINTENANCE].includes(status)) {
      throw new AppError(400, 'VALIDATION_ERROR', "Initial vehicle status must be 'available' or 'maintenance'.");
    }
    vehicleStatus = status;
  }

  const vehicle = await Vehicle.create({
    type: type.trim(),
    registrationNo: cleanRegNo,
    status: vehicleStatus,
    stationId: targetStationId,
  });

  return vehicle;
};

/**
 * updateVehicle
 * Updates vehicle type, registrationNo, or status ('available' or 'maintenance').
 * A currently dispatched vehicle cannot change status (returns 409).
 *
 * @param {number} vehicleId
 * @param {object} payload
 * @param {object} user
 * @returns {Promise<Vehicle>}
 */
const updateVehicle = async (vehicleId, payload, user) => {
  const vehicle = await Vehicle.findByPk(vehicleId);
  if (!vehicle) {
    throw new AppError(404, 'NOT_FOUND', 'Vehicle not found.');
  }

  if (user.role === ROLES.STATION_OFFICER && vehicle.stationId !== user.stationId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this station\'s vehicles.');
  }

  const { type, registrationNo, status, stationId } = payload;

  if (status !== undefined) {
    if (vehicle.status === VEHICLE_STATUS.DISPATCHED && status !== vehicle.status) {
      throw new AppError(409, 'CONFLICT', 'Cannot change status of a currently dispatched vehicle.');
    }

    if (![VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.MAINTENANCE].includes(status)) {
      throw new AppError(400, 'VALIDATION_ERROR', "Vehicle status can only be updated to 'available' or 'maintenance'.");
    }

    vehicle.status = status;
  }

  if (type !== undefined) {
    if (!type || typeof type !== 'string' || !type.trim() || type.trim().length > 50) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Vehicle type must be at most 50 characters.');
    }
    vehicle.type = type.trim();
  }

  if (registrationNo !== undefined) {
    if (!registrationNo || typeof registrationNo !== 'string' || !registrationNo.trim() || registrationNo.trim().length > 30) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Registration number must be at most 30 characters.');
    }
    const cleanRegNo = registrationNo.trim().toUpperCase();
    if (cleanRegNo !== vehicle.registrationNo) {
      const dup = await Vehicle.findOne({
        where: {
          registrationNo: cleanRegNo,
          id: { [Op.ne]: vehicle.id },
        },
      });
      if (dup) {
        throw new AppError(409, 'CONFLICT', 'Vehicle with this registration number already exists.');
      }
      vehicle.registrationNo = cleanRegNo;
    }
  }

  if (stationId !== undefined) {
    if (user.role !== ROLES.ADMIN) {
      throw new AppError(403, 'FORBIDDEN', 'Only admin can transfer vehicles between stations.');
    }
    const targetStation = await Station.findByPk(stationId);
    if (!targetStation) {
      throw new AppError(404, 'NOT_FOUND', 'Target station not found.');
    }
    vehicle.stationId = parseInt(stationId, 10);
  }

  await vehicle.save();
  return vehicle;
};

/**
 * deleteVehicle
 * Deletes a vehicle. Blocked with 409 if vehicle has an active incident (released_at is null).
 *
 * @param {number} vehicleId
 * @param {object} user
 * @returns {Promise<void>}
 */
const deleteVehicle = async (vehicleId, user) => {
  const vehicle = await Vehicle.findByPk(vehicleId);
  if (!vehicle) {
    throw new AppError(404, 'NOT_FOUND', 'Vehicle not found.');
  }

  if (user.role === ROLES.STATION_OFFICER && vehicle.stationId !== user.stationId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this station\'s vehicles.');
  }

  // Check for active incident assignment (released_at null)
  const activeAssignment = await IncidentVehicle.findOne({
    where: {
      vehicleId: vehicle.id,
      releasedAt: null,
    },
  });

  if (activeAssignment) {
    throw new AppError(409, 'CONFLICT', 'Cannot delete vehicle currently assigned to an active incident.');
  }

  await vehicle.destroy();
};

/**
 * getStationPersonnel
 * Lists active firefighters and station officers assigned to a station.
 *
 * @param {number} stationId
 * @returns {Promise<Array<object>>}
 */
const getStationPersonnel = async (stationId) => {
  const station = await Station.findByPk(stationId);
  if (!station) {
    throw new AppError(404, 'NOT_FOUND', 'Station not found.');
  }

  return User.findAll({
    where: {
      stationId,
      accountStatus: 'active',
      role: { [Op.in]: [ROLES.FIREFIGHTER, ROLES.STATION_OFFICER] },
    },
    attributes: ['id', 'name', 'email', 'phone', 'role', 'onDuty', 'stationId'],
    order: [['id', 'ASC']],
  });
};

/**
 * updatePersonnelStation
 * Assigns or transfers personnel to a station.
 * Officers can only move firefighters who have no station or are already at their own station,
 * into their own station; admin can set any station.
 *
 * @param {number} targetUserId
 * @param {number|null} targetStationId
 * @param {object} user
 * @returns {Promise<User>}
 */
const updatePersonnelStation = async (targetUserId, targetStationId, user) => {
  const targetUser = await User.findByPk(targetUserId);
  if (!targetUser) {
    throw new AppError(404, 'NOT_FOUND', 'User not found.');
  }

  const parsedStationId = targetStationId !== null ? parseInt(targetStationId, 10) : null;

  if (user.role === ROLES.STATION_OFFICER) {
    if (!user.stationId) {
      throw new AppError(403, 'FORBIDDEN', 'Station officer is not assigned to any station.');
    }
    if (parsedStationId !== user.stationId) {
      throw new AppError(403, 'FORBIDDEN', 'Station officers can only assign personnel into their own station.');
    }
    if (targetUser.role !== ROLES.FIREFIGHTER) {
      throw new AppError(403, 'FORBIDDEN', 'Station officers can only manage firefighters.');
    }
    if (targetUser.stationId !== null && targetUser.stationId !== user.stationId) {
      throw new AppError(403, 'FORBIDDEN', 'Station officers can only move firefighters who have no station or are already at their own station.');
    }
  }

  if (parsedStationId !== null) {
    const targetStation = await Station.findByPk(parsedStationId);
    if (!targetStation) {
      throw new AppError(404, 'NOT_FOUND', 'Target station not found.');
    }
  }

  targetUser.stationId = parsedStationId;
  await targetUser.save();
  return targetUser;
};

/**
 * updatePersonnelDuty
 * Updates onDuty status for station personnel.
 * Officer only for personnel at their own station; admin any.
 *
 * @param {number} targetUserId
 * @param {boolean} onDuty
 * @param {object} user
 * @returns {Promise<User>}
 */
const updatePersonnelDuty = async (targetUserId, onDuty, user) => {
  if (typeof onDuty !== 'boolean') {
    throw new AppError(400, 'VALIDATION_ERROR', 'onDuty must be a boolean.');
  }

  const targetUser = await User.findByPk(targetUserId);
  if (!targetUser) {
    throw new AppError(404, 'NOT_FOUND', 'User not found.');
  }

  if (user.role === ROLES.STATION_OFFICER) {
    if (!user.stationId || targetUser.stationId !== user.stationId) {
      throw new AppError(403, 'FORBIDDEN', 'Station officers can only update duty status for personnel at their own station.');
    }
  }

  targetUser.onDuty = onDuty;
  await targetUser.save();
  return targetUser;
};

module.exports = {
  getAvailableVehicle,
  releaseVehicles,
  listStationsWithCounts,
  createStation,
  updateStation,
  getStationVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getStationPersonnel,
  updatePersonnelStation,
  updatePersonnelDuty,
};
