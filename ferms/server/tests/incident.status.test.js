// tests/incident.status.test.js — API integration tests for status transitions and notes (§5.2, §8, UC-10, UC-11)
'use strict';

require('dotenv').config();

// Mock sockets before requiring app
jest.mock('../src/sockets', () => ({
  initSockets:   jest.fn(),
  emitToUser:    jest.fn(),
  emitToRole:    jest.fn(),
  emitToStation: jest.fn(),
  emitIncident:  jest.fn(),
}));

// Mock notification service before requiring app
jest.mock('../src/services/notification.service', () => ({
  notify:              jest.fn().mockResolvedValue(null),
  notifyStationOnDuty: jest.fn().mockResolvedValue([]),
  notifyRole:          jest.fn().mockResolvedValue(undefined),
  notifyReporter:      jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../src/app');
const {
  sequelize,
  Incident,
  Station,
  User,
  IncidentStatusHistory,
  IncidentNote,
} = require('../src/models');
const { ROLES, INCIDENT_STATUS, SEVERITY } = require('../src/domain/constants');
const notificationService = require('../src/services/notification.service');
const sockets = require('../src/sockets');

// ---------------------------------------------------------------------------
// Helpers for dev-mode role injection
// ---------------------------------------------------------------------------

const asRole = (role, stationId = null) => {
  const agent = request(app);
  return {
    patch: (url, body) =>
      agent
        .patch(url)
        .set('x-dev-role', role)
        .set('x-dev-station-id', stationId ? String(stationId) : '')
        .send(body),
    post: (url, body) =>
      agent
        .post(url)
        .set('x-dev-role', role)
        .set('x-dev-station-id', stationId ? String(stationId) : '')
        .send(body),
    get: (url) =>
      agent
        .get(url)
        .set('x-dev-role', role)
        .set('x-dev-station-id', stationId ? String(stationId) : ''),
  };
};

const citizen = () => asRole(ROLES.CITIZEN);
const dispatch = () => asRole(ROLES.DISPATCH_OPERATOR);
const admin = () => asRole(ROLES.ADMIN);
const firefighter = (stationId) => asRole(ROLES.FIREFIGHTER, stationId);
const officer = (stationId) => asRole(ROLES.STATION_OFFICER, stationId);

// ---------------------------------------------------------------------------
// Test Data Setup
// ---------------------------------------------------------------------------

let user0;
let stationA;
let stationB;
const createdIncidentIds = [];

beforeAll(async () => {
  await sequelize.authenticate();

  // Ensure dev-mode user id: 0 exists (req.user.id = 0)
  user0 = await User.findByPk(0);
  if (!user0) {
    await sequelize.query(`
      INSERT INTO users (id, name, email, password_hash, role, account_status, created_at)
      VALUES (0, 'Demo Test User Zero', 'user0_status@ferms.test', '$2b$10$abcdefghijklmnopqrstuu', 'firefighter', 'active', NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    user0 = await User.findByPk(0);
  }

  // Look up existing stations or create new test stations
  const stations = await Station.findAll({ order: [['id', 'ASC']], limit: 2 });
  if (stations.length >= 2) {
    stationA = stations[0];
    stationB = stations[1];
  } else {
    stationA = stations[0] || (await Station.create({
      name: 'Status Test Station A',
      address: '123 Test Station Road A',
      latitude: 19.076,
      longitude: 72.877,
      createdAt: new Date(),
    }));

    stationB = await Station.create({
      name: 'Status Test Station B',
      address: '456 Test Station Road B',
      latitude: 19.113,
      longitude: 72.869,
      createdAt: new Date(),
    });
  }
});

afterAll(async () => {
  if (createdIncidentIds.length > 0) {
    await IncidentNote.destroy({ where: { incidentId: createdIncidentIds } });
    await IncidentStatusHistory.destroy({ where: { incidentId: createdIncidentIds } });
    await Incident.destroy({ where: { id: createdIncidentIds } });
  }

  await sequelize.close();
});

const createTestIncident = async (fields = {}) => {
  const now = new Date();
  const inc = await Incident.create({
    reporterId: 0,
    latitude: 19.076,
    longitude: 72.877,
    address: '100 Status Road',
    description: 'Status test emergency',
    severity: SEVERITY.HIGH,
    status: INCIDENT_STATUS.ASSIGNED,
    stationId: stationA.id,
    createdAt: now,
    updatedAt: now,
    ...fields,
  });
  createdIncidentIds.push(inc.id);
  return inc;
};

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('PATCH /api/incidents/:id/status (§5.2, §8, UC-10)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates assigned incident to in_progress when called by firefighter of assigned station', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await firefighter(stationA.id).patch(`/api/incidents/${inc.id}/status`, {
      status: 'in_progress',
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(inc.id);
    expect(res.body.data.status).toBe('in_progress');

    // DB verify
    await inc.reload();
    expect(inc.status).toBe('in_progress');

    // History row check
    const history = await IncidentStatusHistory.findOne({
      where: { incidentId: inc.id, status: 'in_progress' },
    });
    expect(history).not.toBeNull();
    expect(history.changedBy).toBe(0);

    // Notification check
    expect(notificationService.notifyReporter).toHaveBeenCalledWith(
      expect.objectContaining({ id: inc.id }),
      'Responders are on the way (status: In progress).'
    );
  });

  it('updates assigned incident to in_progress when called by station officer of assigned station', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await officer(stationA.id).patch(`/api/incidents/${inc.id}/status`, {
      status: 'in_progress',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_progress');
  });

  it('rejects with 403 if firefighter belongs to a different station (wrong station 403)', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await firefighter(stationB.id).patch(`/api/incidents/${inc.id}/status`, {
      status: 'in_progress',
    });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toMatch(/not assigned to your station/i);
  });

  it('rejects with 403 if caller is a citizen (citizen 403)', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await citizen().patch(`/api/incidents/${inc.id}/status`, {
      status: 'in_progress',
    });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects with 403 if caller is a dispatch operator', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await dispatch().patch(`/api/incidents/${inc.id}/status`, {
      status: 'in_progress',
    });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects with 400 INVALID_TRANSITION when attempting resolve via status endpoint (resolve via status endpoint 400)', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await firefighter(stationA.id).patch(`/api/incidents/${inc.id}/status`, {
      status: 'resolved',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
    expect(res.body.error.message).toMatch(/PATCH \/api\/incidents\/:id\/resolve/i);
    expect(res.body.error.allowedNext).toEqual(['in_progress', 'assigned']);
  });

  it('rejects with 400 INVALID_TRANSITION when attempting close via status endpoint', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await firefighter(stationA.id).patch(`/api/incidents/${inc.id}/status`, {
      status: 'closed',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
    expect(res.body.error.message).toMatch(/PATCH \/api\/incidents\/:id\/close/i);
    expect(res.body.error.allowedNext).toEqual(['in_progress', 'assigned']);
  });

  it('rejects with 400 INVALID_TRANSITION when attempting invalid status like reported or assigned', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await firefighter(stationA.id).patch(`/api/incidents/${inc.id}/status`, {
      status: 'reported',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
    expect(res.body.error.message).toBe('Cannot move from assigned to reported.');
    expect(res.body.error.allowedNext).toEqual(['in_progress', 'assigned']);
  });

  it('rejects with 400 VALIDATION_ERROR if status is omitted in body', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await firefighter(stationA.id).patch(`/api/incidents/${inc.id}/status`, {});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects with 404 NOT_FOUND for non-existent incident id', async () => {
    const res = await firefighter(stationA.id).patch('/api/incidents/9999999/status', {
      status: 'in_progress',
    });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/incidents/:id/notes (§5.2, §4.6, UC-11)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('appends a field note when called by firefighter of assigned station', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await firefighter(stationA.id).post(`/api/incidents/${inc.id}/notes`, {
      note: 'Water tender connected to hydrant.',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.incidentId).toBe(inc.id);
    expect(res.body.data.note).toBe('Water tender connected to hydrant.');
    expect(res.body.data.authorId).toBe(0);
    expect(res.body.data.authorName).toBe(user0.name);
    expect(res.body.data.createdAt).toBeDefined();

    // Verify DB
    const noteRow = await IncidentNote.findByPk(res.body.data.id);
    expect(noteRow).not.toBeNull();
    expect(noteRow.note).toBe('Water tender connected to hydrant.');

    // Socket emit check
    expect(sockets.emitIncident).toHaveBeenCalledWith(
      'incident:updated',
      expect.objectContaining({ id: inc.id })
    );
  });

  it('appends a field note when called by station officer of assigned station', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.IN_PROGRESS });

    const res = await officer(stationA.id).post(`/api/incidents/${inc.id}/notes`, {
      note: 'Command post established on north side.',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.note).toBe('Command post established on north side.');
  });

  it('rejects with 403 if caller belongs to a different station', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await firefighter(stationB.id).post(`/api/incidents/${inc.id}/notes`, {
      note: 'Unauthorized note from another station',
    });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects with 403 if caller is a citizen', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await citizen().post(`/api/incidents/${inc.id}/notes`, {
      note: 'Citizen comment',
    });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects with 409 CONFLICT when adding note to a closed incident', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.CLOSED });

    const res = await officer(stationA.id).post(`/api/incidents/${inc.id}/notes`, {
      note: 'Note after incident is closed',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toMatch(/closed incident/i);
  });

  it('rejects with 400 VALIDATION_ERROR for empty note', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await firefighter(stationA.id).post(`/api/incidents/${inc.id}/notes`, {
      note: '   ',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects with 400 VALIDATION_ERROR for note exceeding 2000 characters', async () => {
    const inc = await createTestIncident({ status: INCIDENT_STATUS.ASSIGNED });

    const res = await firefighter(stationA.id).post(`/api/incidents/${inc.id}/notes`, {
      note: 'x'.repeat(2001),
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects with 404 NOT_FOUND for non-existent incident', async () => {
    const res = await firefighter(stationA.id).post('/api/incidents/9999999/notes', {
      note: 'Valid note for missing incident',
    });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
