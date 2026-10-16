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
const { ROLES, INCIDENT_STATUS } = require('../domain/constants');

// ===== Parth =====
// createIncident, myIncidents, assign routes owned by Parth
// ===== /Parth =====

// ===== Vedant =====

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

// ===== /Vedant =====

module.exports = {
  // ===== Parth =====
  // createIncident,
  // myIncidents,
  // assign,
  // ===== /Parth =====

  // ===== Vedant =====
  listIncidents,
  incidentStats,
  assignedIncidents,
  getIncident,
  // ===== /Vedant =====
};
