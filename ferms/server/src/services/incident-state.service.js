// services/incident-state.service.js — Enforces valid incident status transitions and records history rows (§4)
'use strict';

const { IncidentStatusHistory, sequelize } = require('../models');
const { allowedNext } = require('../domain/incident.transitions');
const { AppError } = require('../middleware/error.middleware');
const { emitIncident } = require('../sockets');

/**
 * transition
 * Transitions an incident to toStatus if permitted by the state machine.
 * Throws 400 INVALID_TRANSITION with allowedNext on illegal transitions.
 * Sets status and updatedAt, inserts an incident_status_history row,
 * and registers transaction.afterCommit to call emitIncident('incident:updated', incident)
 * from sockets/index.js. Returns the incident.
 * If no transaction is passed, creates one itself.
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
      `Cannot move from ${incident.status} to ${toStatus}.`,
      { allowedNext: allowed }
    );
  }

  const execute = async (t) => {
    const now = new Date();
    incident.status = toStatus;
    incident.updatedAt = now;
    await incident.save({ transaction: t });

    await IncidentStatusHistory.create(
      {
        incidentId: incident.id,
        status:     toStatus,
        changedBy:  actorId != null ? actorId : null,
        changedAt:  now,
      },
      { transaction: t }
    );

    if (t && typeof t.afterCommit === 'function') {
      t.afterCommit(() => {
        emitIncident('incident:updated', incident);
      });
    } else {
      emitIncident('incident:updated', incident);
    }

    return incident;
  };

  if (transaction) {
    return await execute(transaction);
  }

  return await sequelize.transaction(async (t) => {
    return await execute(t);
  });
};

module.exports = {
  transition,
};
