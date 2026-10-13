// services/notification.service.js — Creates in-app notifications and broadcasts them over Socket.IO
//
// CONVENTIONS §4 frozen interface:
//   notify({ recipientId, incidentId, type, message }, { transaction }) -> Notification
//   notifyStationOnDuty(stationId, { incidentId, type, message }, opts)  -> Notification[]
//   notifyRole(role, payload, opts)                                       -> void
//   notifyReporter(incident, message, opts)                               -> void
//
// STUB: All bodies log and return empty/null values.
// Week 2: replace stubs with real DB writes + socket emits after transaction.afterCommit.

/**
 * notify
 * Creates a Notification row for a single recipient and emits notification:new
 * to user:<recipientId> after the transaction commits.
 *
 * @param {{ recipientId, incidentId, type, message }} payload
 * @param {{ transaction? }} opts
 * @returns {Promise<null>}  Will return the created Notification in Week 2
 */
const notify = async ({ recipientId, incidentId, type, message }, { transaction } = {}) => {
  // TODO(week-2): create Notification row in DB, emit 'notification:new' to user:<recipientId> after commit
  console.log('[notification.service] notify (stub)', { recipientId, incidentId, type, message });
  return null;
};

/**
 * notifyStationOnDuty
 * Notifies every on-duty user at a station (users where station_id = stationId AND on_duty = true).
 *
 * @param {number} stationId
 * @param {{ incidentId, type, message }} payload
 * @param {{ transaction? }} opts
 * @returns {Promise<[]>}  Will return Notification[] in Week 2
 */
const notifyStationOnDuty = async (stationId, { incidentId, type, message }, opts = {}) => {
  // TODO(week-2): query on-duty users, call notify() for each, return array
  console.log('[notification.service] notifyStationOnDuty (stub)', { stationId, incidentId, type, message });
  return [];
};

/**
 * notifyRole
 * Notifies every active user with a given role.
 *
 * @param {string} role
 * @param {{ incidentId, type, message }} payload
 * @param {{ transaction? }} opts
 * @returns {Promise<void>}
 */
const notifyRole = async (role, payload, opts = {}) => {
  // TODO(week-2): query all active users with the role, call notify() for each
  console.log('[notification.service] notifyRole (stub)', { role, ...payload });
};

/**
 * notifyReporter
 * Notifies the citizen who reported an incident.
 *
 * @param {object} incident  Sequelize Incident instance (must have reporterId)
 * @param {string} message
 * @param {{ transaction? }} opts
 * @returns {Promise<void>}
 */
const notifyReporter = async (incident, message, opts = {}) => {
  // TODO(week-2): call notify({ recipientId: incident.reporterId, incidentId: incident.id, ... })
  console.log('[notification.service] notifyReporter (stub)', { incidentId: incident.id, message });
};

module.exports = { notify, notifyStationOnDuty, notifyRole, notifyReporter };
