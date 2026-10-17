// tests/dispatch.reassign.test.js — Tests for dispatch.service.reassign and PATCH /api/incidents/:id/assign (W4-P-BE-2)
'use strict';

// ─── Mock models before requiring app ────────────────────────────────────────
jest.mock('../src/models', () => {
  const mockTransaction = {
    commit:      jest.fn().mockResolvedValue(undefined),
    rollback:    jest.fn().mockResolvedValue(undefined),
    afterCommit: jest.fn((cb) => cb()),
  };

  const Station = {
    findByPk: jest.fn(),
    findAll:  jest.fn(),
  };

  const Incident = {
    findByPk: jest.fn(),
    create:   jest.fn(),
    findAll:  jest.fn(),
  };

  const IncidentVehicle = {
    create:  jest.fn().mockResolvedValue({}),
    findAll: jest.fn().mockResolvedValue([]),
    update:  jest.fn().mockResolvedValue([0]),
  };

  const Vehicle = {
    findOne:  jest.fn(),
    update:   jest.fn().mockResolvedValue([0]),
    findByPk: jest.fn(),
  };

  const IncidentStatusHistory = {
    create: jest.fn().mockResolvedValue({}),
  };

  const User = {
    findAll:  jest.fn().mockResolvedValue([]),
    findByPk: jest.fn().mockResolvedValue(null),
  };

  const Notification = {
    create:  jest.fn().mockResolvedValue({ id: 1 }),
    findAll: jest.fn().mockResolvedValue([]),
    count:   jest.fn().mockResolvedValue(0),
    findOne: jest.fn().mockResolvedValue(null),
    update:  jest.fn().mockResolvedValue([0]),
  };

  return {
    sequelize: {
      transaction: jest.fn().mockResolvedValue(mockTransaction),
    },
    Station,
    Incident,
    IncidentVehicle,
    Vehicle,
    IncidentStatusHistory,
    User,
    Notification,
  };
});

// Mock sockets before requiring app (so Socket.IO doesn't try to connect)
jest.mock('../src/sockets', () => ({
  initSockets:   jest.fn(),
  emitToUser:    jest.fn(),
  emitToRole:    jest.fn(),
  emitToStation: jest.fn(),
  emitIncident:  jest.fn(),
}));

// Mock notification service
jest.mock('../src/services/notification.service', () => ({
  notify:              jest.fn().mockResolvedValue({ id: 1 }),
  notifyStationOnDuty: jest.fn().mockResolvedValue([]),
  notifyRole:          jest.fn().mockResolvedValue([]),
  notifyReporter:      jest.fn().mockResolvedValue({ id: 1 }),
}));

// Mock incident-state.service to control transition behaviour
jest.mock('../src/services/incident-state.service', () => ({
  transition: jest.fn().mockImplementation(async (incident, toStatus, { actorId, transaction } = {}) => {
    incident.status = toStatus;
    incident.updatedAt = new Date();
    return incident;
  }),
}));

// Mock resource.service
jest.mock('../src/services/resource.service', () => ({
  getAvailableVehicle: jest.fn(),
  releaseVehicles:     jest.fn().mockResolvedValue(1),
  countAvailableByStation: jest.fn().mockResolvedValue(new Map()),
  countOnDutyByStation:    jest.fn().mockResolvedValue(new Map()),
}));

const request              = require('supertest');
const app                  = require('../src/app');
const { Station, Incident, IncidentVehicle, sequelize } = require('../src/models');
const resourceService      = require('../src/services/resource.service');
const dispatchService      = require('../src/services/dispatch.service');
const notificationService  = require('../src/services/notification.service');
const incidentStateService = require('../src/services/incident-state.service');
const { emitIncident }     = require('../src/sockets');
const { INCIDENT_STATUS, ROLES } = require('../src/domain/constants');

// ─── Test helpers ─────────────────────────────────────────────────────────────

const asRole = (role, stationId = null) => {
  const agent = request(app);
  const headers = {
    'x-dev-role':       role,
    'x-dev-user-id':    '1',
    'x-dev-station-id': stationId ? String(stationId) : '',
  };
  return {
    patch: (url, body) => agent.patch(url).set(headers).send(body),
    get:   (url)       => agent.get(url).set(headers),
  };
};

const dispatcher = () => asRole(ROLES.DISPATCH_OPERATOR);
const admin      = () => asRole(ROLES.ADMIN);
const firefighter = () => asRole(ROLES.FIREFIGHTER, 1);

const makeTx = () => ({
  commit:      jest.fn().mockResolvedValue(undefined),
  rollback:    jest.fn().mockResolvedValue(undefined),
  afterCommit: jest.fn((cb) => cb()),
});

const makeVehicle = (id, status = INCIDENT_STATUS.ASSIGNED) => ({
  id,
  status,
  stationId: null,
  save: jest.fn().mockResolvedValue(undefined),
});

const makeStation = (id, name) => ({
  id,
  name: name || `Station ${id}`,
  latitude:  19.1,
  longitude: 72.8,
  findByPk: jest.fn(),
});

const makeIncident = (overrides = {}) => ({
  id:         99,
  reporterId: 1,
  latitude:   19.1136,
  longitude:  72.8697,
  status:     INCIDENT_STATUS.ASSIGNED,
  stationId:  1,
  description: 'Test fire',
  severity:    'high',
  address:     null,
  closingSummary: null,
  createdAt:  new Date(),
  updatedAt:  new Date(),
  station:    { id: 1, name: 'Station A' },
  Station:    { id: 1, name: 'Station A' },
  save:       jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// ─── dispatch.service.reassign unit tests ─────────────────────────────────────

describe('dispatch.service.reassign', () => {
  let stationA;
  let stationB;

  beforeEach(() => {
    jest.clearAllMocks();
    stationA = makeStation(1, 'Station A');
    stationB = makeStation(2, 'Station B');

    Station.findByPk.mockImplementation(async (id) => {
      if (id === 1) return stationA;
      if (id === 2) return stationB;
      return null;
    });

    IncidentVehicle.create.mockResolvedValue({});
    resourceService.releaseVehicles.mockResolvedValue(1);
    incidentStateService.transition.mockImplementation(async (incident, toStatus) => {
      incident.status = toStatus;
      return incident;
    });
  });

  it('moves vehicle: old one returned available, new one dispatched', async () => {
    const oldVehicle = makeVehicle(10);
    const newVehicle = makeVehicle(20, 'available');

    resourceService.getAvailableVehicle.mockResolvedValue(newVehicle);
    resourceService.releaseVehicles.mockResolvedValue(1);

    const incident = makeIncident({ stationId: 1 });
    const tx = makeTx();

    const result = await dispatchService.reassign(incident, 2, { actorId: 5, transaction: tx });

    // New vehicle should be dispatched
    expect(newVehicle.status).toBe('dispatched');
    expect(newVehicle.save).toHaveBeenCalledWith({ transaction: tx });

    // Old vehicle release was requested
    expect(resourceService.releaseVehicles).toHaveBeenCalledWith(incident.id, { transaction: tx });

    // New incident_vehicles row created
    expect(IncidentVehicle.create).toHaveBeenCalledWith(
      expect.objectContaining({ incidentId: incident.id, vehicleId: 20 }),
      { transaction: tx }
    );

    // Station updated on incident
    expect(incident.stationId).toBe(2);
    expect(incident.save).toHaveBeenCalled();

    // incidentStateService.transition called with 'assigned'
    expect(incidentStateService.transition).toHaveBeenCalledWith(
      incident,
      INCIDENT_STATUS.ASSIGNED,
      expect.objectContaining({ actorId: 5, transaction: tx })
    );

    // Returns station and vehicle
    expect(result.station.id).toBe(2);
    expect(result.vehicle.id).toBe(20);
  });

  it('throws 409 CONFLICT when target station has no available vehicle, changes nothing', async () => {
    resourceService.getAvailableVehicle.mockResolvedValue(null);
    const incident = makeIncident({ stationId: 1 });
    const tx = makeTx();

    await expect(
      dispatchService.reassign(incident, 2, { actorId: 5, transaction: tx })
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });

    // Nothing else should have been called
    expect(resourceService.releaseVehicles).not.toHaveBeenCalled();
    expect(IncidentVehicle.create).not.toHaveBeenCalled();
    expect(incidentStateService.transition).not.toHaveBeenCalled();
    // incident stationId unchanged
    expect(incident.stationId).toBe(1);
  });
});

// ─── PATCH /api/incidents/:id/assign integration tests ────────────────────────

describe('PATCH /api/incidents/:id/assign', () => {
  let mockStation;
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStation = makeStation(2, 'Station B');
    mockTransaction = makeTx();
    sequelize.transaction.mockResolvedValue(mockTransaction);

    Station.findByPk.mockImplementation(async (id) => {
      if (id === 2) return mockStation;
      return null;
    });

    notificationService.notifyStationOnDuty.mockResolvedValue([]);
    notificationService.notifyReporter.mockResolvedValue({ id: 1 });

    resourceService.releaseVehicles.mockResolvedValue(1);
    resourceService.getAvailableVehicle.mockResolvedValue(makeVehicle(20, 'available'));

    incidentStateService.transition.mockImplementation(async (incident, toStatus) => {
      incident.status = toStatus;
      return incident;
    });
  });

  it('returns 403 if called by a firefighter', async () => {
    Incident.findByPk.mockResolvedValue(makeIncident({ status: INCIDENT_STATUS.ASSIGNED }));
    const res = await firefighter().patch('/api/incidents/99/assign', { stationId: 2 });
    expect(res.status).toBe(403);
  });

  it('returns 404 if target station does not exist', async () => {
    Incident.findByPk.mockResolvedValue(makeIncident({ status: INCIDENT_STATUS.ASSIGNED }));
    Station.findByPk.mockResolvedValue(null);
    const res = await dispatcher().patch('/api/incidents/99/assign', { stationId: 999 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 if incident does not exist', async () => {
    Station.findByPk.mockResolvedValue(mockStation);
    Incident.findByPk.mockResolvedValue(null);
    const res = await dispatcher().patch('/api/incidents/9999/assign', { stationId: 2 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 if incident is resolved (bad status)', async () => {
    Incident.findByPk.mockResolvedValue(
      makeIncident({ status: INCIDENT_STATUS.RESOLVED })
    );
    const res = await dispatcher().patch('/api/incidents/99/assign', { stationId: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('returns 400 if incident is closed (bad status)', async () => {
    Incident.findByPk.mockResolvedValue(
      makeIncident({ status: INCIDENT_STATUS.CLOSED })
    );
    const res = await dispatcher().patch('/api/incidents/99/assign', { stationId: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('returns 400 if stationId is missing from body', async () => {
    Incident.findByPk.mockResolvedValue(makeIncident());
    const res = await dispatcher().patch('/api/incidents/99/assign', {});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when target station has no available vehicle — rolls back, changes nothing', async () => {
    Incident.findByPk.mockResolvedValue(makeIncident({ status: INCIDENT_STATUS.ASSIGNED }));
    resourceService.getAvailableVehicle.mockResolvedValue(null);

    const res = await dispatcher().patch('/api/incidents/99/assign', { stationId: 2 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    // Transaction should have been rolled back
    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
  });

  it('successfully overrides an assigned incident — responds 200 with incident and station', async () => {
    const incident = makeIncident({ status: INCIDENT_STATUS.ASSIGNED });
    Incident.findByPk.mockResolvedValue(incident);

    const res = await dispatcher().patch('/api/incidents/99/assign', { stationId: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('incident');
    expect(res.body.data).toHaveProperty('station');
    // Transaction committed
    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    // Notifications sent
    expect(notificationService.notifyStationOnDuty).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ incidentId: 99 })
    );
    expect(notificationService.notifyReporter).toHaveBeenCalledWith(
      incident,
      expect.stringContaining('reassigned')
    );
  });

  it('successfully overrides an unassigned incident — moves it to assigned', async () => {
    const incident = makeIncident({ status: INCIDENT_STATUS.UNASSIGNED, stationId: null });
    Incident.findByPk.mockResolvedValue(incident);

    const res = await dispatcher().patch('/api/incidents/99/assign', { stationId: 2 });

    expect(res.status).toBe(200);
    expect(mockTransaction.commit).toHaveBeenCalled();
    // incident-state.service.transition was called with 'assigned'
    expect(incidentStateService.transition).toHaveBeenCalledWith(
      expect.any(Object),
      INCIDENT_STATUS.ASSIGNED,
      expect.objectContaining({ actorId: expect.any(Number) })
    );
  });

  it('admin can also call the override endpoint', async () => {
    const incident = makeIncident({ status: INCIDENT_STATUS.ASSIGNED });
    Incident.findByPk.mockResolvedValue(incident);

    const res = await admin().patch('/api/incidents/99/assign', { stationId: 2 });
    expect(res.status).toBe(200);
  });
});
