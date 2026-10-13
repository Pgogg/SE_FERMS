// domain/incident.transitions.js — Defines the allowed incident status state machine (§8)
'use strict';

const { INCIDENT_STATUS } = require('./constants');

const ALLOWED_TRANSITIONS = Object.freeze({
  [INCIDENT_STATUS.REPORTED]:    Object.freeze([INCIDENT_STATUS.ASSIGNED, INCIDENT_STATUS.UNASSIGNED]),
  [INCIDENT_STATUS.UNASSIGNED]:  Object.freeze([INCIDENT_STATUS.ASSIGNED]),
  [INCIDENT_STATUS.ASSIGNED]:    Object.freeze([INCIDENT_STATUS.IN_PROGRESS, INCIDENT_STATUS.ASSIGNED]),
  [INCIDENT_STATUS.IN_PROGRESS]: Object.freeze([INCIDENT_STATUS.RESOLVED]),
  [INCIDENT_STATUS.RESOLVED]:    Object.freeze([INCIDENT_STATUS.CLOSED]),
  [INCIDENT_STATUS.CLOSED]:      Object.freeze([]),
});

/**
 * allowedNext
 * Returns an array of valid destination statuses from a given status.
 *
 * @param {string} status  Current incident status
 * @returns {string[]}     Array of permitted next statuses
 */
const allowedNext = (status) => ALLOWED_TRANSITIONS[status] || [];

module.exports = {
  ALLOWED_TRANSITIONS,
  allowedNext,
};
