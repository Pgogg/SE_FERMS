// sockets/index.js — Attaches Socket.IO to the HTTP server and registers all real-time event handlers
//
// CONVENTIONS §4 frozen interface:
//   initSockets(httpServer)
//   emitToUser(userId, event, payload)
//   emitToRole(role, event, payload)
//   emitToStation(stationId, event, payload)
//   emitIncident(event, incident)   — 'incident:new' | 'incident:updated'
'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { serializeIncident } = require('../utils/serializers');
const { User } = require('../models');
const { ROLES } = require('../domain/constants');

let _io = null; // module-level singleton so emit helpers can access it

/**
 * initSockets — call once from server.js with the http.Server instance
 * Creates a Socket.io server with CORS from CLIENT_URL,
 * authenticates connections via JWT from socket.handshake.auth.token,
 * and joins authenticated sockets to user, role, and station rooms.
 */
const initSockets = (httpServer) => {
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((u) => u.trim());

  _io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket authentication middleware
  _io.use(async (socket, next) => {
    try {
      const token = socket.handshake?.auth?.token;
      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET || 'changeme_supersecret');
      } catch (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }

      const userId = payload?.userId ?? payload?.id;
      if (!userId) {
        return next(new Error('Authentication error: Invalid token payload'));
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (user.accountStatus !== 'active') {
        return next(new Error('Authentication error: User account is inactive'));
      }

      socket.user = user;
      return next();
    } catch (err) {
      return next(new Error('Authentication error: Internal error'));
    }
  });

  _io.on('connection', (socket) => {
    const user = socket.user;
    if (user) {
      socket.join(`user:${user.id}`);
      socket.join(`role:${user.role}`);
      if (user.stationId) {
        socket.join(`station:${user.stationId}`);
      }
    }

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return _io;
};

/** Get the current Socket.io server instance */
const getIO = () => _io;

/** Close the Socket.io server instance (useful for clean test teardown) */
const closeSockets = () => {
  if (_io) {
    _io.close();
    _io = null;
  }
};

/** Emit an event to a single user's private room. */
const emitToUser = (userId, event, payload) => {
  if (!_io) {
    console.warn('[Socket.IO] emitToUser called before initSockets');
    return;
  }
  _io.to(`user:${userId}`).emit(event, payload);
};

/** Emit an event to every socket in a role room. */
const emitToRole = (role, event, payload) => {
  if (!_io) {
    console.warn('[Socket.IO] emitToRole called before initSockets');
    return;
  }
  _io.to(`role:${role}`).emit(event, payload);
};

/** Emit an event to every socket in a station room. */
const emitToStation = (stationId, event, payload) => {
  if (!_io) {
    console.warn('[Socket.IO] emitToStation called before initSockets');
    return;
  }
  _io.to(`station:${stationId}`).emit(event, payload);
};

/**
 * emitIncident — broadcasts an incident event according to CONVENTIONS §4.
 *
 * 'incident:new'     → role:dispatch_operator, role:admin, station:<stationId>
 * 'incident:updated' → same + user:<reporterId>
 *
 * @param {'incident:new'|'incident:updated'} event
 * @param {object} incident  Sequelize Incident instance
 */
const emitIncident = (event, incident) => {
  if (!_io) {
    console.warn('[Socket.IO] emitIncident called before initSockets');
    return;
  }

  const payload = { incident: serializeIncident(incident) };

  emitToRole(ROLES.DISPATCH_OPERATOR, event, payload);
  emitToRole(ROLES.ADMIN, event, payload);

  if (incident.stationId) {
    emitToStation(incident.stationId, event, payload);
  }

  if (event === 'incident:updated' && incident.reporterId) {
    emitToUser(incident.reporterId, event, payload);
  }
};

module.exports = {
  initSockets,
  getIO,
  closeSockets,
  emitToUser,
  emitToRole,
  emitToStation,
  emitIncident,
};
