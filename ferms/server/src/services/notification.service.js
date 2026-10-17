// services/notification.service.js — Creates in-app notifications and broadcasts them over Socket.IO
//
// CONVENTIONS §4 frozen interface:
//   notify({ recipientId, incidentId, type, message }, { transaction }) -> Notification
//   notifyStationOnDuty(stationId, { incidentId, type, message }, opts)  -> Notification[]
//   notifyRole(role, payload, opts)                                       -> void / Notification[]
//   notifyReporter(incident, message, opts)                               -> void / Notification
'use strict';

const { Notification, User } = require('../models');
const { emitToUser } = require('../sockets');
const { NOTIFICATION_TYPE } = require('../domain/constants');

/**
 * notify
 * Creates a Notification row for a single recipient and emits notification:new
 * to user:<recipientId> after the transaction commits (or immediately if no transaction).
 *
 * @param {{ recipientId: number, incidentId?: number|null, type: string, message: string }} payload
 * @param {{ transaction?: object }} [opts]
 * @returns {Promise<Notification>} The created Notification instance
 */
const notify = async ({ recipientId, incidentId = null, type, message }, { transaction } = {}) => {
  const notification = await Notification.create(
    {
      recipientId,
      incidentId: incidentId ?? null,
      type,
      message,
    },
    { transaction }
  );

  const emit = () => {
    emitToUser(recipientId, 'notification:new', { notification });
  };

  if (transaction && typeof transaction.afterCommit === 'function') {
    transaction.afterCommit(emit);
  } else {
    emit();
  }

  return notification;
};

/**
 * notifyStationOnDuty
 * Notifies every on-duty, active user at a station (users where station_id = stationId AND on_duty = true AND account_status = 'active').
 *
 * @param {number} stationId
 * @param {{ incidentId?: number|null, type: string, message: string }} payload
 * @param {{ transaction?: object }} [opts]
 * @returns {Promise<Notification[]>} Array of created Notification instances
 */
const notifyStationOnDuty = async (stationId, { incidentId = null, type, message }, opts = {}) => {
  const users = await User.findAll({
    where: {
      stationId,
      onDuty: true,
      accountStatus: 'active',
    },
    transaction: opts.transaction,
  });

  if (!users || users.length === 0) {
    return [];
  }

  return Promise.all(
    users.map((user) =>
      notify(
        {
          recipientId: user.id,
          incidentId,
          type,
          message,
        },
        opts
      )
    )
  );
};

/**
 * notifyRole
 * Notifies every active user with a given role.
 *
 * @param {string} role
 * @param {{ incidentId?: number|null, type: string, message: string }} payload
 * @param {{ transaction?: object }} [opts]
 * @returns {Promise<Notification[]>} Array of created Notification instances
 */
const notifyRole = async (role, payload, opts = {}) => {
  const { incidentId = null, type, message } = payload;
  const users = await User.findAll({
    where: {
      role,
      accountStatus: 'active',
    },
    transaction: opts.transaction,
  });

  if (!users || users.length === 0) {
    return [];
  }

  return Promise.all(
    users.map((user) =>
      notify(
        {
          recipientId: user.id,
          incidentId,
          type,
          message,
        },
        opts
      )
    )
  );
};

/**
 * notifyReporter
 * Notifies the citizen who reported an incident.
 *
 * @param {object} incident  Sequelize Incident instance (must have reporterId)
 * @param {string} message
 * @param {{ transaction?: object, type?: string }} [opts]
 * @returns {Promise<Notification|null>}
 */
const notifyReporter = async (incident, message, opts = {}) => {
  if (!incident || !incident.reporterId) {
    return null;
  }

  const type = opts?.type || NOTIFICATION_TYPE.STATUS_UPDATE;

  return notify(
    {
      recipientId: incident.reporterId,
      incidentId: incident.id,
      type,
      message,
    },
    opts
  );
};

module.exports = {
  notify,
  notifyStationOnDuty,
  notifyRole,
  notifyReporter,
};
