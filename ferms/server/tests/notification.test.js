// tests/notification.test.js — Tests for Socket.IO server, notification service, and notification routes (W4-P-BE-1)
'use strict';

require('dotenv').config();

const http = require('http');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const ioClient = require('../../client/node_modules/socket.io-client');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_supersecret';

// In-memory mock store
let mockUsers = [];
let mockNotifications = [];
let mockNotificationIdCounter = 1;

// Mock models before requiring app / sockets / services
jest.mock('../src/models', () => {
  const mockTransaction = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    afterCommit: jest.fn((cb) => cb()),
  };

  const User = {
    findByPk: jest.fn(async (id) => {
      return mockUsers.find((u) => u.id === Number(id)) || null;
    }),
    findAll: jest.fn(async ({ where }) => {
      return mockUsers.filter((u) => {
        if (where.role && u.role !== where.role) return false;
        if (where.stationId !== undefined && u.stationId !== where.stationId) return false;
        if (where.onDuty !== undefined && u.onDuty !== where.onDuty) return false;
        if (where.accountStatus && u.accountStatus !== where.accountStatus) return false;
        return true;
      });
    }),
  };

  const Notification = {
    create: jest.fn(async (data) => {
      const newNotif = {
        id: mockNotificationIdCounter++,
        recipientId: data.recipientId,
        incidentId: data.incidentId ?? null,
        type: data.type,
        message: data.message,
        readStatus: false,
        createdAt: new Date(),
        save: jest.fn(async function () {
          return this;
        }),
      };
      mockNotifications.push(newNotif);
      return newNotif;
    }),
    findAll: jest.fn(async ({ where, order }) => {
      let results = mockNotifications.filter((n) => {
        if (where.recipientId !== undefined && n.recipientId !== where.recipientId) return false;
        if (where.readStatus !== undefined && n.readStatus !== where.readStatus) return false;
        return true;
      });
      // Sort desc
      results.sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
      return results;
    }),
    count: jest.fn(async ({ where }) => {
      return mockNotifications.filter((n) => {
        if (where.recipientId !== undefined && n.recipientId !== where.recipientId) return false;
        if (where.readStatus !== undefined && n.readStatus !== where.readStatus) return false;
        return true;
      }).length;
    }),
    findOne: jest.fn(async ({ where }) => {
      return (
        mockNotifications.find((n) => {
          if (where.id !== undefined && n.id !== where.id) return false;
          if (where.recipientId !== undefined && n.recipientId !== where.recipientId) return false;
          return true;
        }) || null
      );
    }),
    update: jest.fn(async (values, { where }) => {
      let updatedCount = 0;
      mockNotifications.forEach((n) => {
        if (where.recipientId !== undefined && n.recipientId !== where.recipientId) return;
        if (where.readStatus !== undefined && n.readStatus !== where.readStatus) return;
        Object.assign(n, values);
        updatedCount++;
      });
      return [updatedCount];
    }),
  };

  return {
    sequelize: {
      transaction: jest.fn().mockResolvedValue(mockTransaction),
    },
    User,
    Notification,
    Incident: {},
    Station: {},
    Vehicle: {},
    IncidentStatusHistory: {},
    IncidentVehicle: {},
  };
});

// Mock auth middleware for supertest route testing so we can pass caller identity via headers
jest.mock('../src/middleware/auth.middleware', () => {
  return (req, res, next) => {
    const userId =
      req.headers['x-dev-user-id'] !== undefined
        ? parseInt(req.headers['x-dev-user-id'], 10)
        : 1;
    const role = req.headers['x-dev-role'] || 'citizen';
    const stationId = req.headers['x-dev-station-id']
      ? parseInt(req.headers['x-dev-station-id'], 10)
      : null;

    req.user = {
      id: Number.isNaN(userId) ? 1 : userId,
      role,
      stationId: Number.isNaN(stationId) ? null : stationId,
      onDuty: false,
    };
    next();
  };
});

const app = require('../src/app');
const { initSockets, closeSockets, emitToRole, emitToStation, emitToUser, emitIncident } = require('../src/sockets');
const notificationService = require('../src/services/notification.service');
const { NOTIFICATION_TYPE, ROLES } = require('../src/domain/constants');

describe('Socket.io server and Notification System (W4-P-BE-1)', () => {
  let server;
  let serverPort;

  beforeAll((done) => {
    server = http.createServer();
    initSockets(server);
    server.listen(0, () => {
      serverPort = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    closeSockets();
    server.close(done);
  });

  beforeEach(() => {
    mockNotifications = [];
    mockNotificationIdCounter = 1;
    mockUsers = [
      {
        id: 1,
        name: 'John Citizen',
        email: 'citizen@example.com',
        role: ROLES.CITIZEN,
        stationId: null,
        onDuty: false,
        accountStatus: 'active',
      },
      {
        id: 2,
        name: 'Bob Firefighter',
        email: 'firefighter@example.com',
        role: ROLES.FIREFIGHTER,
        stationId: 10,
        onDuty: true,
        accountStatus: 'active',
      },
      {
        id: 3,
        name: 'Alice Dispatcher',
        email: 'dispatcher@example.com',
        role: ROLES.DISPATCH_OPERATOR,
        stationId: null,
        onDuty: false,
        accountStatus: 'active',
      },
      {
        id: 4,
        name: 'Inactive User',
        email: 'inactive@example.com',
        role: ROLES.CITIZEN,
        stationId: null,
        onDuty: false,
        accountStatus: 'inactive',
      },
    ];
  });

  // -------------------------------------------------------------------------
  // 1. Socket Authentication & Room Joining
  // -------------------------------------------------------------------------
  describe('Socket.io Authentication', () => {
    it('rejects connection when token is missing', (done) => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        auth: {},
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect_error', (err) => {
        expect(err.message).toMatch(/Missing token/);
        client.disconnect();
        done();
      });
    });

    it('rejects connection when token is invalid or expired', (done) => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: 'invalid.jwt.token' },
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect_error', (err) => {
        expect(err.message).toMatch(/Invalid or expired token/);
        client.disconnect();
        done();
      });
    });

    it('rejects connection when user is not found', (done) => {
      const token = jwt.sign({ userId: 999 }, JWT_SECRET);
      const client = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect_error', (err) => {
        expect(err.message).toMatch(/User not found/);
        client.disconnect();
        done();
      });
    });

    it('rejects connection when user account is inactive', (done) => {
      const token = jwt.sign({ userId: 4 }, JWT_SECRET);
      const client = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect_error', (err) => {
        expect(err.message).toMatch(/inactive/i);
        client.disconnect();
        done();
      });
    });

    it('connects successfully with a valid token for an active user', (done) => {
      const token = jwt.sign({ userId: 1 }, JWT_SECRET);
      const client = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });
    });
  });

  // -------------------------------------------------------------------------
  // 2. Real-Time Delivery & Acceptance Test (Two Sockets)
  // -------------------------------------------------------------------------
  describe('Real-Time Notification Delivery & Multi-Role Targeted Delivery', () => {
    let clientFirefighter;
    let clientDispatcher;

    beforeEach((done) => {
      const tokenFF = jwt.sign({ userId: 2, role: ROLES.FIREFIGHTER }, JWT_SECRET);
      const tokenDisp = jwt.sign({ userId: 3, role: ROLES.DISPATCH_OPERATOR }, JWT_SECRET);

      let connectedCount = 0;
      const checkConnected = () => {
        connectedCount++;
        if (connectedCount === 2) done();
      };

      clientFirefighter = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: tokenFF },
        transports: ['websocket'],
        reconnection: false,
      });
      clientFirefighter.on('connect', checkConnected);

      clientDispatcher = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: tokenDisp },
        transports: ['websocket'],
        reconnection: false,
      });
      clientDispatcher.on('connect', checkConnected);
    });

    afterEach(() => {
      if (clientFirefighter?.connected) clientFirefighter.disconnect();
      if (clientDispatcher?.connected) clientDispatcher.disconnect();
    });

    it('valid user receives notification:new event when notify() is called', (done) => {
      clientFirefighter.on('notification:new', (data) => {
        expect(data).toHaveProperty('notification');
        expect(data.notification.recipientId).toBe(2);
        expect(data.notification.message).toBe('Structure fire reported');
        expect(data.notification.type).toBe(NOTIFICATION_TYPE.DISPATCH);
        done();
      });

      notificationService.notify({
        recipientId: 2,
        type: NOTIFICATION_TYPE.DISPATCH,
        message: 'Structure fire reported',
      });
    });

    it('ACCEPTANCE: targeted delivery reaches intended recipient socket and not other sockets', (done) => {
      const dispatcherSpy = jest.fn();
      clientDispatcher.on('notification:new', dispatcherSpy);

      clientFirefighter.on('notification:new', (data) => {
        expect(data.notification.recipientId).toBe(2);
        expect(data.notification.message).toBe('Exclusive for Firefighter');

        setTimeout(() => {
          expect(dispatcherSpy).not.toHaveBeenCalled();
          done();
        }, 100);
      });

      // Send specifically to firefighter (userId 2)
      notificationService.notify({
        recipientId: 2,
        type: NOTIFICATION_TYPE.DISPATCH,
        message: 'Exclusive for Firefighter',
      });
    });

    it('targeted delivery by role reaches only sockets with that role', (done) => {
      const ffSpy = jest.fn();
      clientFirefighter.on('role:event', ffSpy);

      clientDispatcher.on('role:event', (payload) => {
        expect(payload.info).toBe('For dispatch only');
        setTimeout(() => {
          expect(ffSpy).not.toHaveBeenCalled();
          done();
        }, 100);
      });

      emitToRole(ROLES.DISPATCH_OPERATOR, 'role:event', { info: 'For dispatch only' });
    });

    it('targeted delivery by station reaches only sockets assigned to that station', (done) => {
      const dispSpy = jest.fn();
      clientDispatcher.on('station:alert', dispSpy);

      clientFirefighter.on('station:alert', (payload) => {
        expect(payload.alert).toBe('Station 10 turnout');
        setTimeout(() => {
          expect(dispSpy).not.toHaveBeenCalled();
          done();
        }, 100);
      });

      emitToStation(10, 'station:alert', { alert: 'Station 10 turnout' });
    });
  });

  // -------------------------------------------------------------------------
  // 3. Notification Service Methods
  // -------------------------------------------------------------------------
  describe('notification.service methods', () => {
    it('notify() supports transactions and emits after commit', async () => {
      let afterCommitCallback = null;
      const mockTx = {
        afterCommit: jest.fn((cb) => {
          afterCommitCallback = cb;
        }),
      };

      const notif = await notificationService.notify(
        {
          recipientId: 1,
          type: NOTIFICATION_TYPE.SYSTEM,
          message: 'Tx test notification',
        },
        { transaction: mockTx }
      );

      expect(notif.recipientId).toBe(1);
      expect(mockTx.afterCommit).toHaveBeenCalled();
      expect(typeof afterCommitCallback).toBe('function');
    });

    it('notifyStationOnDuty() targets active users at the station with on_duty: true', async () => {
      const notifications = await notificationService.notifyStationOnDuty(10, {
        type: NOTIFICATION_TYPE.DISPATCH,
        message: 'Turn out Station 10',
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].recipientId).toBe(2);
      expect(notifications[0].message).toBe('Turn out Station 10');
    });

    it('notifyReporter() targets incident reporter with status_update type', async () => {
      const incident = { id: 101, reporterId: 1 };
      const notif = await notificationService.notifyReporter(
        incident,
        'Responders are on the way.'
      );

      expect(notif).not.toBeNull();
      expect(notif.recipientId).toBe(1);
      expect(notif.incidentId).toBe(101);
      expect(notif.type).toBe(NOTIFICATION_TYPE.STATUS_UPDATE);
      expect(notif.message).toBe('Responders are on the way.');
    });

    it('notifyRole() targets all active users with the given role', async () => {
      const notifications = await notificationService.notifyRole(ROLES.DISPATCH_OPERATOR, {
        type: NOTIFICATION_TYPE.SYSTEM,
        message: 'System alert for dispatch',
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].recipientId).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // 4. REST Endpoints (/api/notifications)
  // -------------------------------------------------------------------------
  describe('REST Endpoints (/api/notifications)', () => {
    beforeEach(async () => {
      // Seed some notifications for user 1 and user 2
      mockNotifications = [
        {
          id: 1,
          recipientId: 1,
          incidentId: 101,
          type: NOTIFICATION_TYPE.DISPATCH,
          message: 'User 1 - Unread 1',
          readStatus: false,
          createdAt: new Date('2026-10-17T10:00:00Z'),
          save: jest.fn(async function () {
            return this;
          }),
        },
        {
          id: 2,
          recipientId: 1,
          incidentId: 102,
          type: NOTIFICATION_TYPE.STATUS_UPDATE,
          message: 'User 1 - Read 1',
          readStatus: true,
          createdAt: new Date('2026-10-17T11:00:00Z'),
          save: jest.fn(async function () {
            return this;
          }),
        },
        {
          id: 3,
          recipientId: 1,
          incidentId: 103,
          type: NOTIFICATION_TYPE.SYSTEM,
          message: 'User 1 - Unread 2',
          readStatus: false,
          createdAt: new Date('2026-10-17T12:00:00Z'),
          save: jest.fn(async function () {
            return this;
          }),
        },
        {
          id: 4,
          recipientId: 2,
          incidentId: 201,
          type: NOTIFICATION_TYPE.DISPATCH,
          message: 'User 2 - Unread 1',
          readStatus: false,
          createdAt: new Date('2026-10-17T10:30:00Z'),
          save: jest.fn(async function () {
            return this;
          }),
        },
      ];
    });

    it('GET /api/notifications returns list newest first with unreadCount in meta', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('x-dev-user-id', '1');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      // Newest first
      expect(res.body.data[0].id).toBe(3);
      expect(res.body.data[1].id).toBe(2);
      expect(res.body.data[2].id).toBe(1);
      // meta
      expect(res.body.meta).toEqual({
        count: 3,
        unreadCount: 2,
      });
    });

    it('GET /api/notifications?unread=true returns only unread notifications', async () => {
      const res = await request(app)
        .get('/api/notifications?unread=true')
        .set('x-dev-user-id', '1');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((n) => n.readStatus === false)).toBe(true);
      expect(res.body.meta).toEqual({
        count: 2,
        unreadCount: 2,
      });
    });

    it('PATCH /api/notifications/read-all marks all unread notifications of caller as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('x-dev-user-id', '1');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        message: 'All notifications marked read.',
      });

      // Verify user 1 has 0 unread now
      const user1Unread = mockNotifications.filter(
        (n) => n.recipientId === 1 && n.readStatus === false
      );
      expect(user1Unread).toHaveLength(0);

      // Verify user 2's notification was NOT touched
      const user2Notif = mockNotifications.find((n) => n.id === 4);
      expect(user2Notif.readStatus).toBe(false);
    });

    it('PATCH /api/notifications/:id/read marks a single notification as read for owner', async () => {
      const res = await request(app)
        .patch('/api/notifications/1/read')
        .set('x-dev-user-id', '1');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.readStatus).toBe(true);

      const notif1 = mockNotifications.find((n) => n.id === 1);
      expect(notif1.readStatus).toBe(true);
    });

    it('PATCH /api/notifications/:id/read returns 404 when user attempts to read another user notification', async () => {
      // Notification 4 belongs to User 2. User 1 tries to mark it read.
      const res = await request(app)
        .patch('/api/notifications/4/read')
        .set('x-dev-user-id', '1');

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');

      // Notification 4 remains unread
      const notif4 = mockNotifications.find((n) => n.id === 4);
      expect(notif4.readStatus).toBe(false);
    });

    it('PATCH /api/notifications/:id/read returns 404 for non-existent notification', async () => {
      const res = await request(app)
        .patch('/api/notifications/999/read')
        .set('x-dev-user-id', '1');

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('PATCH /api/notifications/:id/read returns 400 for invalid notification id', async () => {
      const res = await request(app)
        .patch('/api/notifications/abc/read')
        .set('x-dev-user-id', '1');

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });
});
