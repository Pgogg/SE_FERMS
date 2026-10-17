// controllers/incident.controller.js — Handles incident reads, creation, status transitions, and resolution
'use strict';

const { Op } = require('sequelize');
const {
  Incident,
  Station,
  User,
  Vehicle,
  IncidentStatusHistory,
  IncidentNote,
  IncidentVehicle,
  sequelize,
} = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { serializeIncident } = require('../utils/serializers');
const { ROLES, INCIDENT_STATUS, SEVERITY, NOTIFICATION_TYPE } = require('../domain/constants');
const asyncHandler = require('../utils/asyncHandler');
const dispatchService = require('../services/dispatch.service');
const notificationService = require('../services/notification.service');
const { emitIncident } = require('../sockets');

// ===== Parth =====
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

/**
 * assignIncident
 * PATCH /api/incidents/:id/assign — dispatch_operator, admin
 *
 * Overrides the station assignment for an incident.
 * Body: { stationId }
 * Allowed only while status is 'unassigned' or 'assigned' (Decision D1).
 * After commit: notifyStationOnDuty (new station), notifyReporter.
 * incident:updated is already emitted by incident-state.service.transition.
 *
 * Responds with { data: { incident: serializeIncident(incident), station } }
 */
const assignIncident = asyncHandler(async (req, res) => {
  const incidentId = parseInt(req.params.id, 10);
  if (Number.isNaN(incidentId) || incidentId <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid incident id.');
  }

  const { stationId } = req.body;
  if (stationId === undefined || stationId === null) {
    throw new AppError(400, 'VALIDATION_ERROR', 'stationId is required.');
  }
  const targetStationId = parseInt(stationId, 10);
  if (Number.isNaN(targetStationId) || targetStationId <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'stationId must be a positive integer.');
  }

  // Load target station (404 if not found)
  const targetStation = await Station.findByPk(targetStationId);
  if (!targetStation) {
    throw new AppError(404, 'NOT_FOUND', `Station ${targetStationId} not found.`);
  }

  // Load incident
  const incident = await Incident.findByPk(incidentId, {
    include: [{ model: Station, as: 'station', attributes: ['id', 'name'] }],
  });
  if (!incident) {
    throw new AppError(404, 'NOT_FOUND', `Incident ${incidentId} not found.`);
  }

  // Check allowed statuses (Decision D1: only 'unassigned' or 'assigned')
  const ALLOWED_FOR_OVERRIDE = [INCIDENT_STATUS.UNASSIGNED, INCIDENT_STATUS.ASSIGNED];
  if (!ALLOWED_FOR_OVERRIDE.includes(incident.status)) {
    throw new AppError(
      400,
      'INVALID_TRANSITION',
      `Override is not allowed when incident status is '${incident.status}'. Allowed: ${ALLOWED_FOR_OVERRIDE.join(', ')}.`
    );
  }

  // Run reassign in a transaction
  let result;
  const transaction = await sequelize.transaction();
  try {
    result = await dispatchService.reassign(incident, targetStationId, {
      actorId: req.user.id,
      transaction,
    });
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  const { station, vehicle } = result;

  // After commit: notify new station's on-duty personnel (Notify.Dispatch)
  if (station) {
    await notificationService.notifyStationOnDuty(
      station.id,
      {
        incidentId: incident.id,
        type: NOTIFICATION_TYPE.DISPATCH,
        message: `Incident #${incident.id} has been reassigned to your station.`,
      }
    );
  }

  // Notify reporter (Notify.Citizen)
  await notificationService.notifyReporter(
    incident,
    `Your incident #${incident.id} has been reassigned to ${station ? station.name : 'a new station'}.`
  );

  // Refresh station on incident for serialization
  incident.Station = station || null;

  return res.json({
    data: {
      incident: serializeIncident(incident),
      station: station ? { id: station.id, name: station.name } : null,
    },
  });
});
// ===== /Parth =====


// ===== Vedant =====
const { allowedNext } = require('../domain/incident.transitions');
const incidentStateService = require('../services/incident-state.service');

/**
 * listIncidents
 * GET /api/incidents (dispatch_operator, station_officer, admin)
 * Query parameters:
 *  - status: optional enum filter
 *  - stationId: optional integer filter (ignored for station_officer)
 *  - includeClosed: boolean flag (default false; closed incidents excluded unless true)
 * Ordering: newest first (createdAt DESC), limit 200
 */
const listIncidents = async (req, res) => {
  const { status, stationId, includeClosed } = req.query;
  const where = {};

  // Validate status parameter if provided
  if (status !== undefined) {
    if (!Object.values(INCIDENT_STATUS).includes(status)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `Status must be one of: ${Object.values(INCIDENT_STATUS).join(', ')}.`
      );
    }
  }

  const shouldIncludeClosed = includeClosed === 'true';

  if (status) {
    if (status === INCIDENT_STATUS.CLOSED && !shouldIncludeClosed) {
      // Closed incidents are excluded unless includeClosed=true
      where.status = { [Op.and]: [INCIDENT_STATUS.CLOSED, { [Op.ne]: INCIDENT_STATUS.CLOSED }] };
    } else {
      where.status = status;
    }
  } else if (!shouldIncludeClosed) {
    where.status = { [Op.ne]: INCIDENT_STATUS.CLOSED };
  }

  // Station scoping: for station_officer ALWAYS filter to own station and ignore stationId param
  if (req.user.role === ROLES.STATION_OFFICER) {
    where.stationId = req.user.stationId;
  } else if (stationId !== undefined) {
    if (!/^\d+$/.test(stationId)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'stationId must be a positive integer.');
    }
    where.stationId = parseInt(stationId, 10);
  }

  const incidents = await Incident.findAll({
    where,
    include: [
      {
        model: Station,
        as: 'station',
        attributes: ['id', 'name'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: 200,
  });

  const data = incidents.map((inc) => {
    inc.Station = inc.station || inc.Station;
    return serializeIncident(inc);
  });

  return res.json({
    data,
    meta: {
      count: data.length,
    },
  });
};

/**
 * incidentStats
 * GET /api/incidents/stats (dispatch_operator, station_officer, admin)
 * Query parameters:
 *  - stationId: optional integer filter (ignored for station_officer)
 * Returns { data: { reported, unassigned, assigned, in_progress, resolved, closed } }
 * computed via a grouped query, all keys present with 0 defaults.
 */
const incidentStats = async (req, res) => {
  const { stationId } = req.query;
  const where = {};

  // Station scoping
  if (req.user.role === ROLES.STATION_OFFICER) {
    where.stationId = req.user.stationId;
  } else if (stationId !== undefined) {
    if (!/^\d+$/.test(stationId)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'stationId must be a positive integer.');
    }
    where.stationId = parseInt(stationId, 10);
  }

  const rows = await Incident.findAll({
    where,
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['status'],
    raw: true,
  });

  const stats = {
    reported: 0,
    unassigned: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  };

  for (const r of rows) {
    if (Object.prototype.hasOwnProperty.call(stats, r.status)) {
      stats[r.status] = parseInt(r.count, 10) || 0;
    }
  }

  return res.json({ data: stats });
};

/**
 * assignedIncidents
 * GET /api/incidents/assigned (firefighter, station_officer)
 * Returns incidents at the caller's station with status assigned, in_progress, or resolved, newest first.
 */
const assignedIncidents = async (req, res) => {
  const userStationId = req.user.stationId;

  const incidents = await Incident.findAll({
    where: {
      stationId: userStationId,
      status: {
        [Op.in]: [
          INCIDENT_STATUS.ASSIGNED,
          INCIDENT_STATUS.IN_PROGRESS,
          INCIDENT_STATUS.RESOLVED,
        ],
      },
    },
    include: [
      {
        model: Station,
        as: 'station',
        attributes: ['id', 'name'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  const data = incidents.map((inc) => {
    inc.Station = inc.station || inc.Station;
    return serializeIncident(inc);
  });

  return res.json({
    data,
    meta: {
      count: data.length,
    },
  });
};

/**
 * getIncident
 * GET /api/incidents/:id
 * Allowed for reporting citizen, staff of assigned station, dispatch_operator, and admin; otherwise 403.
 * Returns full incident details with statusHistory, notes, vehicles, reporter, and station.
 */
const getIncident = async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Incident ID must be a positive integer.');
  }

  const incident = await Incident.findByPk(parseInt(id, 10), {
    include: [
      { model: Station, as: 'station', attributes: ['id', 'name'] },
      { model: User, as: 'reporter', attributes: ['id', 'name'] },
    ],
  });

  if (!incident) {
    throw new AppError(404, 'NOT_FOUND', 'Incident not found.');
  }

  // Data-level authorization check (§9.3)
  const { role, id: userId, stationId: userStationId } = req.user;
  let allowed = false;

  if (role === ROLES.ADMIN || role === ROLES.DISPATCH_OPERATOR) {
    allowed = true;
  } else if (role === ROLES.CITIZEN) {
    allowed = incident.reporterId === userId;
  } else if (role === ROLES.FIREFIGHTER || role === ROLES.STATION_OFFICER) {
    allowed = Boolean(incident.stationId && userStationId && incident.stationId === userStationId);
  }

  if (!allowed) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to view this incident.');
  }

  // Fetch status history
  const historyRows = await IncidentStatusHistory.findAll({
    where: { incidentId: incident.id },
    include: [
      { model: User, as: 'changedByUser', attributes: ['id', 'name'] },
    ],
    order: [['changedAt', 'ASC'], ['id', 'ASC']],
  });

  const statusHistory = historyRows.map((h) => ({
    id: h.id,
    incidentId: h.incidentId,
    status: h.status,
    changedAt: h.changedAt,
    changedBy: h.changedByUser ? h.changedByUser.name : 'System',
  }));

  // Fetch field notes (oldest first)
  const noteRows = await IncidentNote.findAll({
    where: { incidentId: incident.id },
    include: [
      { model: User, as: 'author', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'ASC'], ['id', 'ASC']],
  });

  const notes = noteRows.map((n) => ({
    id: n.id,
    incidentId: n.incidentId,
    authorId: n.authorId,
    author: n.author ? n.author.name : null,
    authorName: n.author ? n.author.name : null,
    note: n.note,
    createdAt: n.createdAt,
  }));

  // Fetch assigned vehicles through junction
  const vehicleRows = await IncidentVehicle.findAll({
    where: { incidentId: incident.id },
    include: [
      { model: Vehicle, as: 'vehicle', attributes: ['id', 'type', 'registrationNo', 'status'] },
    ],
    order: [['assignedAt', 'ASC']],
  });

  const vehicles = vehicleRows.map((iv) => ({
    id: iv.vehicleId,
    type: iv.vehicle ? iv.vehicle.type : null,
    registrationNo: iv.vehicle ? iv.vehicle.registrationNo : null,
    status: iv.vehicle ? iv.vehicle.status : null,
    assignedAt: iv.assignedAt,
    releasedAt: iv.releasedAt,
  }));

  incident.Station = incident.station || incident.Station;
  const base = serializeIncident(incident);

  const reporter = incident.reporter
    ? { id: incident.reporter.id, name: incident.reporter.name }
    : null;

  const station = incident.station
    ? { id: incident.station.id, name: incident.station.name }
    : null;

  const data = {
    ...base,
    reporter,
    reporterName: reporter ? reporter.name : null,
    station,
    statusHistory,
    notes,
    vehicles,
  };

  return res.json({ data });
};

/**
 * updateStatus
 * PATCH /api/incidents/:id/status (firefighter, station_officer)
 * Body: { status }
 * The caller's stationId must equal incident.stationId (403 otherwise).
 * Only 'in_progress' is accepted here: if target is 'resolved' or 'closed',
 * returns 400 INVALID_TRANSITION with message pointing to /resolve or /close.
 * After commit: calls notification.notifyReporter(incident, 'Responders are on the way (status: In progress).').
 */
const updateStatus = async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Incident ID must be a positive integer.');
  }

  const { status } = req.body;
  if (!status) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Status is required.');
  }

  const incident = await Incident.findByPk(parseInt(id, 10), {
    include: [{ model: Station, as: 'station', attributes: ['id', 'name'] }],
  });

  if (!incident) {
    throw new AppError(404, 'NOT_FOUND', 'Incident not found.');
  }

  // The caller's stationId must equal incident.stationId (403 otherwise)
  const callerStationId = req.user?.stationId;
  if (!callerStationId || !incident.stationId || callerStationId !== incident.stationId) {
    throw new AppError(403, 'FORBIDDEN', 'Incident is not assigned to your station.');
  }

  const allowed = allowedNext(incident.status);

  // If target is 'resolved' or 'closed', point to dedicated endpoint
  if (status === INCIDENT_STATUS.RESOLVED) {
    throw new AppError(
      400,
      'INVALID_TRANSITION',
      'Use PATCH /api/incidents/:id/resolve to resolve an incident.',
      { allowedNext: allowed }
    );
  }

  if (status === INCIDENT_STATUS.CLOSED) {
    throw new AppError(
      400,
      'INVALID_TRANSITION',
      'Use PATCH /api/incidents/:id/close to close an incident.',
      { allowedNext: allowed }
    );
  }

  // Only 'in_progress' is accepted here
  if (status !== INCIDENT_STATUS.IN_PROGRESS) {
    throw new AppError(
      400,
      'INVALID_TRANSITION',
      `Cannot move from ${incident.status} to ${status}.`,
      { allowedNext: allowed }
    );
  }

  const transaction = await sequelize.transaction();
  try {
    await incidentStateService.transition(incident, status, {
      actorId: req.user.id,
      transaction,
    });

    transaction.afterCommit(() => {
      notificationService.notifyReporter(
        incident,
        'Responders are on the way (status: In progress).'
      );
    });

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  incident.Station = incident.station || incident.Station;
  return res.json({ data: serializeIncident(incident) });
};

/**
 * addNote
 * POST /api/incidents/:id/notes (firefighter, station_officer)
 * Body: { note } non-empty, up to 2000 characters.
 * Not allowed on closed incidents (409).
 * Return created note with author name. After commit: emit incident:updated.
 */
const addNote = async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Incident ID must be a positive integer.');
  }

  const { note } = req.body;
  if (!note || typeof note !== 'string' || note.trim().length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Note must not be empty.');
  }
  if (note.length > 2000) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Note must not exceed 2000 characters.');
  }

  const incident = await Incident.findByPk(parseInt(id, 10));
  if (!incident) {
    throw new AppError(404, 'NOT_FOUND', 'Incident not found.');
  }

  // Caller's stationId must equal incident.stationId (403 otherwise)
  const callerStationId = req.user?.stationId;
  if (!callerStationId || !incident.stationId || callerStationId !== incident.stationId) {
    throw new AppError(403, 'FORBIDDEN', 'Incident is not assigned to your station.');
  }

  // Not allowed on closed incidents (409)
  if (incident.status === INCIDENT_STATUS.CLOSED) {
    throw new AppError(409, 'CONFLICT', 'Cannot add notes to a closed incident.');
  }

  let createdNote;
  const transaction = await sequelize.transaction();
  try {
    createdNote = await IncidentNote.create(
      {
        incidentId: incident.id,
        authorId:   req.user.id,
        note:       note.trim(),
        createdAt:  new Date(),
      },
      { transaction }
    );

    transaction.afterCommit(() => {
      emitIncident('incident:updated', incident);
    });

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  const authorUser = await User.findByPk(req.user.id, { attributes: ['id', 'name'] });

  const data = {
    id:         createdNote.id,
    incidentId: createdNote.incidentId,
    authorId:   createdNote.authorId,
    authorName: authorUser ? authorUser.name : (req.user?.name || null),
    note:       createdNote.note,
    createdAt:  createdNote.createdAt,
  };

  return res.status(201).json({ data });
};

// ===== /Vedant =====

module.exports = {
  // ===== Parth =====
  createIncident,
  myIncidents,
  assignIncident,
  // ===== /Parth =====

  // ===== Vedant =====
  listIncidents,
  incidentStats,
  assignedIncidents,
  getIncident,
  updateStatus,
  addNote,
  // ===== /Vedant =====
};
