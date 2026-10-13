// services/incident-state.service.js — Enforces valid incident status transitions and records history rows (§4)
'use strict';

const { IncidentStatusHistory } = require('../models');
const { allowedNext } = require('../domain/incident.transitions');
const { AppError } = require('../middleware/error.middleware');
const { emitIncident } = require('../sockets');

/**
 * transition
 * Transitions an incident to toStatus if permitted by the state machine.
 * Throws 400 INVALID_TRANSITION with allowedNext on illegal transitions.
 * Sets status and updatedAt, inserts an incident_status_history row,
 * and emits incident:updated after transaction commit (or immediately).
 *
 * @param {object} incident   Sequelize Incident instance
 * @param {string} toStatus   Target status
 * @param {{ actorId?: number, transaction?: object }} [opts]
 * @returns {Promise<object>} The updated incident instance
 */
const transition = async (incident, toStatus, { actorId, transaction } = {}) => {
  const allowed = allowedNext(incident.status);

  if (!allowed.includes(toStatus)) {
    throw new AppError(
      400,
      'INVALID_TRANSITION',
      `Cannot move incident from "${incident.status}" to "${toStatus}".`,
      { allowedNext: allowed }
    );
  }

  const now = new Date();
  incident.status = toStatus;
  incident.updatedAt = now;
  await incident.save({ transaction });

  await IncidentStatusHistory.create(
    {
      incidentId: incident.id,
      status:     toStatus,
      changedBy:  actorId || null,
      changedAt:  now,
    },
    { transaction }
  );

  if (transaction && typeof transaction.afterCommit === 'function') {
    transaction.afterCommit(() => {
      emitIncident('incident:updated', incident);
    });
  } else {
    emitIncident('incident:updated', incident);
  }

  return incident;
};

module.exports = {
  transition,
};
