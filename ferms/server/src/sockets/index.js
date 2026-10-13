// sockets/index.js — Attaches Socket.IO to the HTTP server and registers all real-time event handlers
//
// CONVENTIONS §4 frozen interface:
//   initSockets(httpServer)
//   emitToUser(userId, event, payload)
//   emitToRole(role, event, payload)
//   emitToStation(stationId, event, payload)
//   emitIncident(event, incident)   — 'incident:new' | 'incident:updated'
//
// This is a STUB.  In Week 2 the handshake will verify the JWT and join the
// client to its user:<id>, role:<role>, and station:<id> rooms.

const { Server } = require('socket.io');
const { serializeIncident } = require('../utils/serializers');

let _io = null; // module-level singleton so emit helpers can access it

// ---------------------------------------------------------------------------
// initSockets — call once from server.js with the http.Server instance
// ---------------------------------------------------------------------------
const initSockets = (httpServer) => {
  _io = new Server(httpServer, {
    cors: {
      origin: (process.env.CLIENT_URL || 'http://localhost:5173')
        .split(',')
        .map((u) => u.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  _io.on('connection', (socket) => {
    // TODO(week-2): verify JWT from socket.handshake.auth.token, join rooms
    console.log(`[Socket.IO] client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket.IO] initialised');
  return _io;
};

// ---------------------------------------------------------------------------
// Emit helpers
// ---------------------------------------------------------------------------

/** Emit an event to a single user's private room. */
const emitToUser = (userId, event, payload) => {
  if (!_io) { console.warn('[Socket.IO] emitToUser called before initSockets'); return; }
  _io.to(`user:${userId}`).emit(event, payload);
};

/** Emit an event to every socket in a role room. */
const emitToRole = (role, event, payload) => {
  if (!_io) { console.warn('[Socket.IO] emitToRole called before initSockets'); return; }
  _io.to(`role:${role}`).emit(event, payload);
};

/** Emit an event to every socket in a station room. */
const emitToStation = (stationId, event, payload) => {
  if (!_io) { console.warn('[Socket.IO] emitToStation called before initSockets'); return; }
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
  if (!_io) { console.warn('[Socket.IO] emitIncident called before initSockets'); return; }

  const payload = { incident: serializeIncident(incident) };

  emitToRole('dispatch_operator', event, payload);
  emitToRole('admin', event, payload);

  if (incident.stationId) {
    emitToStation(incident.stationId, event, payload);
  }

  if (event === 'incident:updated' && incident.reporterId) {
    emitToUser(incident.reporterId, event, payload);
  }
};

module.exports = { initSockets, emitToUser, emitToRole, emitToStation, emitIncident };
