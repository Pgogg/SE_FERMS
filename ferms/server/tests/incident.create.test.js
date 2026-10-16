// tests/incident.create.test.js — Integration-style tests for POST /api/incidents (W3-P-BE-1)
// Uses Supertest against the Express app with all DB calls mocked.
'use strict';

// ─── Mock heavy dependencies before requiring app ────────────────────────────

// Mock models
jest.mock('../src/models', () => {
  const mockTransaction = {
    commit:      jest.fn().mockResolvedValue(undefined),
    rollback:    jest.fn().mockResolvedValue(undefined),
    afterCommit: jest.fn((cb) => cb()),
  };
  const mockIncident = {
    id:          99,
    reporterId:  1,
    latitude:    19.1136,
    longitude:   72.8697,
    address:     null,
    description: 'Test fire',
    severity:    'high',
    status:      'reported',
    stationId:   null,
    createdAt:   new Date(),
    updatedAt:   new Date(),
    save:        jest.fn().mockResolvedValue(undefined),
  };
  return {
    sequelize: {
      transaction: jest.fn().mockResolvedValue(mockTransaction),
    },
    Incident: {
      create:  jest.fn().mockResolvedValue(mockIncident),
      findAll: jest.fn().mockResolvedValue([mockIncident]),
    },
    Station: {
      findAll: jest.fn().mockResolvedValue([]),
    },
    IncidentStatusHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
    IncidentVehicle: {
      create: jest.fn().mockResolvedValue({}),
    },
    Vehicle: {},
  };
});

// Mock dispatch service
jest.mock('../src/services/dispatch.service', () => ({
  assignNearest: jest.fn().mockResolvedValue({ station: null, vehicle: null }),
  reassign:      jest.fn(),
}));

// Mock notification service
jest.mock('../src/services/notification.service', () => ({
  notify:              jest.fn().mockResolvedValue(null),
  notifyStationOnDuty: jest.fn().mockResolvedValue([]),
  notifyRole:          jest.fn().mockResolvedValue(undefined),
  notifyReporter:      jest.fn().mockResolvedValue(undefined),
}));

// Mock sockets
jest.mock('../src/sockets', () => ({
  initSockets:    jest.fn(),
  emitToUser:     jest.fn(),
  emitToRole:     jest.fn(),
  emitToStation:  jest.fn(),
  emitIncident:   jest.fn(),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────
const request        = require('supertest');
const app            = require('../src/app');
const dispatchService = require('../src/services/dispatch.service');
const notificationService = require('../src/services/notification.service');
const { emitIncident } = require('../src/sockets');
const { Incident }   = require('../src/models');

// Helper: citizen auth headers (dev-mode middleware reads these)
const citizenHeaders = { 'x-dev-role': 'citizen', 'x-dev-user-id': '1' };

// Valid payload
const validBody = {
  description: 'Fire reported near Andheri station.',
  severity:    'high',
  latitude:    19.1136,
  longitude:   72.8697,
};

beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply defaults after clearAllMocks
  const { sequelize, Incident: I, IncidentStatusHistory, IncidentVehicle } = require('../src/models');
  const mockTx = {
    commit:      jest.fn().mockResolvedValue(undefined),
    rollback:    jest.fn().mockResolvedValue(undefined),
    afterCommit: jest.fn((cb) => cb()),
  };
  sequelize.transaction.mockResolvedValue(mockTx);

  const mockIncident = {
    id:          99,
    reporterId:  1,
    latitude:    19.1136,
    longitude:   72.8697,
    address:     null,
    description: 'Test fire',
    severity:    'high',
    status:      'assigned',
    stationId:   1,
    createdAt:   new Date(),
    updatedAt:   new Date(),
    save:        jest.fn().mockResolvedValue(undefined),
  };

  I.create.mockResolvedValue(mockIncident);
  I.findAll.mockResolvedValue([mockIncident]);
  IncidentStatusHistory.create.mockResolvedValue({});
  IncidentVehicle.create.mockResolvedValue({});

  dispatchService.assignNearest.mockResolvedValue({ station: null, vehicle: null });
  notificationService.notifyStationOnDuty.mockResolvedValue([]);
  notificationService.notifyRole.mockResolvedValue(undefined);
  emitIncident.mockReturnValue(undefined);
});

// ─── POST /api/incidents ──────────────────────────────────────────────────────
describe('POST /api/incidents', () => {
  it('201 with valid body and unassigned result (no stations)', async () => {
    dispatchService.assignNearest.mockResolvedValue({ station: null, vehicle: null });

    const res = await request(app)
      .post('/api/incidents')
      .set(citizenHeaders)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('incident');
    expect(res.body.data.station).toBeNull();
  });

  it('201 with assigned result returns station id and name', async () => {
    const mockStation = { id: 1, name: 'Andheri Fire Station' };
    dispatchService.assignNearest.mockResolvedValue({
      station: mockStation,
      vehicle: { id: 10, status: 'dispatched' },
    });

    const res = await request(app)
      .post('/api/incidents')
      .set(citizenHeaders)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data.station).toMatchObject({ id: 1, name: 'Andheri Fire Station' });
  });

  it('400 when description is missing', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set(citizenHeaders)
      .send({ ...validBody, description: undefined });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 when description exceeds 2000 chars', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set(citizenHeaders)
      .send({ ...validBody, description: 'x'.repeat(2001) });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('description');
  });

  it('400 when severity is invalid enum', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set(citizenHeaders)
      .send({ ...validBody, severity: 'extreme' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('severity');
  });

  it('400 when latitude is out of range', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set(citizenHeaders)
      .send({ ...validBody, latitude: 91 });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('latitude');
  });

  it('400 when longitude is out of range', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set(citizenHeaders)
      .send({ ...validBody, longitude: -181 });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('longitude');
  });

  it('403 when a non-citizen role tries to report', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set({ 'x-dev-role': 'dispatch_operator' })
      .send(validBody);

    expect(res.status).toBe(403);
  });

  it('emits incident:new after commit', async () => {
    await request(app)
      .post('/api/incidents')
      .set(citizenHeaders)
      .send(validBody);

    expect(emitIncident).toHaveBeenCalledWith('incident:new', expect.anything());
  });

  it('notifies dispatch operators when unassigned', async () => {
    dispatchService.assignNearest.mockResolvedValue({ station: null, vehicle: null });

    await request(app)
      .post('/api/incidents')
      .set(citizenHeaders)
      .send(validBody);

    expect(notificationService.notifyRole).toHaveBeenCalledWith(
      'dispatch_operator',
      expect.objectContaining({ type: 'dispatch' })
    );
  });

  it('notifies station on-duty staff when assigned', async () => {
    dispatchService.assignNearest.mockResolvedValue({
      station: { id: 5, name: 'Test Station' },
      vehicle: { id: 10 },
    });

    await request(app)
      .post('/api/incidents')
      .set(citizenHeaders)
      .send(validBody);

    expect(notificationService.notifyStationOnDuty).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ type: 'dispatch' })
    );
  });
});

// ─── GET /api/incidents/mine ──────────────────────────────────────────────────
describe('GET /api/incidents/mine', () => {
  it('200 with array of citizen incidents', async () => {
    const res = await request(app)
      .get('/api/incidents/mine')
      .set(citizenHeaders);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('count');
  });

  it('403 for non-citizen role', async () => {
    const res = await request(app)
      .get('/api/incidents/mine')
      .set({ 'x-dev-role': 'firefighter' });

    expect(res.status).toBe(403);
  });

  it('queries by reporter_id = req.user.id', async () => {
    await request(app)
      .get('/api/incidents/mine')
      .set(citizenHeaders);

    expect(Incident.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ reporterId: expect.anything() }),
        order: [['createdAt', 'DESC']],
      })
    );
  });
});
