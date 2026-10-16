// controllers/incident.controller.js — Handles create, list, fetch, update, status-transition, and close for incidents
'use strict';

// ===== Parth =====
const { sequelize } = require('../models');
const { Incident, Station } = require('../models');
const dispatchService = require('../services/dispatch.service');
const notificationService = require('../services/notification.service');
const { emitIncident } = require('../sockets');
const { serializeIncident } = require('../utils/serializers');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/error.middleware');
const { INCIDENT_STATUS, SEVERITY, ROLES, NOTIFICATION_TYPE } = require('../domain/constants');

// Allowed severity values for validation
const SEVERITY_VALUES = Object.values(SEVERITY);

/**
 * createIncident
 * POST /api/incidents — citizen only
 *
 * Validates body, creates the incident in 'reported', writes the first history
 * row, calls dispatch.service.assignNearest — all in ONE transaction.
 * After commit: sends notifications and emits incident:new via Socket.IO.
 *
 * TODO: switch to incident-state.service.transition in week 6
 */
const createIncident = asyncHandler(async (req, res) => {
  const { description, severity, latitude, longitude, address } = req.body;

  // --- Input validation ---
  const errors = [];

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Description is required.' });
  } else if (description.length > 2000) {
    errors.push({ field: 'description', message: 'Description must be at most 2000 characters.' });
  }

  if (!severity) {
    errors.push({ field: 'severity', message: `Severity is required. Must be one of: ${SEVERITY_VALUES.join(', ')}.` });
  } else if (!SEVERITY_VALUES.includes(severity)) {
    errors.push({ field: 'severity', message: `Severity must be one of: ${SEVERITY_VALUES.join(', ')}.` });
  }

  if (latitude === undefined || latitude === null || latitude === '') {
    errors.push({ field: 'latitude', message: 'Latitude is required.' });
  } else {
    const lat = parseFloat(latitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      errors.push({ field: 'latitude', message: 'Latitude must be a number between -90 and 90.' });
    }
  }

  if (longitude === undefined || longitude === null || longitude === '') {
    errors.push({ field: 'longitude', message: 'Longitude is required.' });
  } else {
    const lon = parseFloat(longitude);
    if (Number.isNaN(lon) || lon < -180 || lon > 180) {
      errors.push({ field: 'longitude', message: 'Longitude must be a number between -180 and 180.' });
    }
  }

  if (address !== undefined && address !== null && typeof address !== 'string') {
    errors.push({ field: 'address', message: 'Address must be a string.' });
  }

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', { details: errors });
  }

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  let incident;
  let assignResult;

  // --- One transaction: create incident, first history row, dispatch ---
  const transaction = await sequelize.transaction();
  try {
    // Create incident with status 'reported'
    incident = await Incident.create(
      {
        reporterId:  req.user.id,
        latitude:    lat,
        longitude:   lon,
        address:     address ? address.trim() : null,
        description: description.trim(),
        severity,
        status:      INCIDENT_STATUS.REPORTED,
        stationId:   null,
      },
      { transaction }
    );

    // Write first history row (reported) — changedBy = reporter
    // TODO: switch to incident-state.service.transition in week 6
    const { IncidentStatusHistory } = require('../models');
    await IncidentStatusHistory.create(
      {
        incidentId: incident.id,
        status:     INCIDENT_STATUS.REPORTED,
        changedBy:  req.user.id,
        changedAt:  new Date(),
      },
      { transaction }
    );

    // Call dispatch engine (also writes 'assigned'/'unassigned' history row)
    assignResult = await dispatchService.assignNearest(incident, { transaction });

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  // --- After commit: notifications and socket events ---
  const { station, vehicle } = assignResult;

  if (station) {
    // Notify on-duty station staff (Notify.Dispatch)
    await notificationService.notifyStationOnDuty(
      station.id,
      {
        incidentId: incident.id,
        type:       NOTIFICATION_TYPE.DISPATCH,
        message:    `New incident #${incident.id} has been assigned to your station.`,
      }
    );
  } else {
    // No station found — notify all dispatch operators (Dispatch.Assign.NoStation / SF-2)
    await notificationService.notifyRole(
      ROLES.DISPATCH_OPERATOR,
      {
        incidentId: incident.id,
        type:       NOTIFICATION_TYPE.DISPATCH,
        message:    `Incident #${incident.id} could not be auto-assigned — no station has an available vehicle.`,
      }
    );
  }

  // Emit incident:new (§5.6)
  emitIncident('incident:new', incident);

  // --- Respond 201 ---
  return res.status(201).json({
    data: {
      incident: serializeIncident(incident),
      station:  station ? { id: station.id, name: station.name } : null,
    },
  });
});

/**
 * myIncidents
 * GET /api/incidents/mine — citizen only
 *
 * Returns the calling citizen's incidents, newest first.
 * Uses reporter_id = req.user.id (§9.3 / SE-4).
 */
const myIncidents = asyncHandler(async (req, res) => {
  const incidents = await Incident.findAll({
    where:   { reporterId: req.user.id },
    include: [{ model: Station, as: 'station', attributes: ['id', 'name'] }],
    order:   [['createdAt', 'DESC']],
  });

  return res.json({
    data: incidents.map(serializeIncident),
    meta: { count: incidents.length },
  });
});

module.exports = { createIncident, myIncidents };
// ===== /Parth =====
