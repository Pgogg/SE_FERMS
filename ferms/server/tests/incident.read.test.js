// tests/incident.read.test.js — Integration tests for incident read endpoints (§5.2, §9.2, §9.3)
// Owner: Vedant (W3-V-BE-2)
'use strict';

require('dotenv').config();

const request = require('supertest');
const app = require('../src/app');
const {
  sequelize,
  Incident,
  Station,
  User,
  Vehicle,
  IncidentStatusHistory,
  IncidentNote,
  IncidentVehicle,
} = require('../src/models');
const { ROLES, INCIDENT_STATUS, SEVERITY } = require('../src/domain/constants');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const asRole = (role, stationId = null) => {
  const agent = request(app);
  return {
    get: (url) =>
      agent
        .get(url)
        .set('x-dev-role', role)
        .set('x-dev-station-id', stationId ? String(stationId) : ''),
  };
};

const admin = () => asRole(ROLES.ADMIN);
const dispatch = () => asRole(ROLES.DISPATCH_OPERATOR);
const officer = (stationId) => asRole(ROLES.STATION_OFFICER, stationId);
const firefighter = (stationId) => asRole(ROLES.FIREFIGHTER, stationId);
const citizen = () => asRole(ROLES.CITIZEN);

// ---------------------------------------------------------------------------
// Test Data Setup
// ---------------------------------------------------------------------------

let user0;
let userOther;
let stationA;
let stationB;
let vehicleA;

const createdIncidentIds = [];

beforeAll(async () => {
  await sequelize.authenticate();

  // Ensure dev-mode user id: 0 exists for citizen requests (req.user.id = 0)
  user0 = await User.findByPk(0);
  if (!user0) {
    await sequelize.query(`
      INSERT INTO users (id, name, email, password_hash, role, account_status, created_at)
      VALUES (0, 'Demo Citizen Zero', 'citizen0@ferms.test', '$2b$10$abcdefghijklmnopqrstuu', 'citizen', 'active', NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    user0 = await User.findByPk(0);
  }

  // Look up existing seeded citizen or create one with createdAt
  userOther = await User.findOne({ where: { email: 'citizen@ferms.test' } });
  if (!userOther) {
    userOther = await User.create({
      name: 'Other Citizen',
      email: 'other_citizen_test@ferms.test',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
      role: ROLES.CITIZEN,
      accountStatus: 'active',
      createdAt: new Date(),
    });
  }

  // Fetch two distinct stations
  const stations = await Station.findAll({ order: [['id', 'ASC']], limit: 2 });
  stationA = stations[0];
  stationB = stations[1] || stations[0];

  // Fetch or create a vehicle at stationA
  vehicleA = await Vehicle.findOne({ where: { stationId: stationA.id } });
  if (!vehicleA) {
    vehicleA = await Vehicle.create({
      stationId: stationA.id,
      type: 'fire_engine',
      registrationNo: 'MH-99-TEST-901',
      status: 'available',
    });
  }

  // Clean up any old test incidents with our unique prefix
  const oldTestIncidents = await Incident.findAll({
    where: { description: { [sequelize.Sequelize.Op.like]: 'W3-V-BE-2 Test%' } },
  });
  if (oldTestIncidents.length > 0) {
    const oldIds = oldTestIncidents.map((i) => i.id);
    await IncidentVehicle.destroy({ where: { incidentId: oldIds } });
    await IncidentNote.destroy({ where: { incidentId: oldIds } });
    await IncidentStatusHistory.destroy({ where: { incidentId: oldIds } });
    await Incident.destroy({ where: { id: oldIds } });
  }

  // Helper to create test incident
  const createTestInc = async (data) => {
    const now = new Date();
    const inc = await Incident.create({
      latitude: 19.076,
      longitude: 72.877,
      address: 'Test Location Address',
      severity: SEVERITY.HIGH,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    createdIncidentIds.push(inc.id);
    return inc;
  };

  // 1. Incident at stationA, owned by user0, status ASSIGNED
  const inc1 = await createTestInc({
    reporterId: user0.id,
    stationId: stationA.id,
    status: INCIDENT_STATUS.ASSIGNED,
    description: 'W3-V-BE-2 Test 1 Assigned Station A User 0',
  });

  // 2. Incident at stationA, owned by user0, status IN_PROGRESS
  await createTestInc({
    reporterId: user0.id,
    stationId: stationA.id,
    status: INCIDENT_STATUS.IN_PROGRESS,
    description: 'W3-V-BE-2 Test 2 In Progress Station A User 0',
  });

  // 3. Incident at stationA, owned by user0, status RESOLVED
  await createTestInc({
    reporterId: user0.id,
    stationId: stationA.id,
    status: INCIDENT_STATUS.RESOLVED,
    closingSummary: 'Extinguished safely.',
    description: 'W3-V-BE-2 Test 3 Resolved Station A User 0',
  });

  // 4. Incident at stationA, owned by user0, status CLOSED
  await createTestInc({
    reporterId: user0.id,
    stationId: stationA.id,
    status: INCIDENT_STATUS.CLOSED,
    closingSummary: 'Closed by officer.',
    description: 'W3-V-BE-2 Test 4 Closed Station A User 0',
  });

  // 5. Incident at stationB, owned by userOther, status ASSIGNED
  await createTestInc({
    reporterId: userOther.id,
    stationId: stationB.id,
    status: INCIDENT_STATUS.ASSIGNED,
    description: 'W3-V-BE-2 Test 5 Assigned Station B User Other',
  });

  // 6. Incident at stationB, owned by userOther, status CLOSED
  await createTestInc({
    reporterId: userOther.id,
    stationId: stationB.id,
    status: INCIDENT_STATUS.CLOSED,
    description: 'W3-V-BE-2 Test 6 Closed Station B User Other',
  });

  // 7. Incident with null station, status REPORTED
  await createTestInc({
    reporterId: user0.id,
    stationId: null,
    status: INCIDENT_STATUS.REPORTED,
    description: 'W3-V-BE-2 Test 7 Reported Station Null',
  });

  // 8. Incident with null station, status UNASSIGNED
  await createTestInc({
    reporterId: user0.id,
    stationId: null,
    status: INCIDENT_STATUS.UNASSIGNED,
    description: 'W3-V-BE-2 Test 8 Unassigned Station Null',
  });

  // Add history, notes, and vehicle to inc1
  await IncidentStatusHistory.create({
    incidentId: inc1.id,
    status: INCIDENT_STATUS.REPORTED,
    changedBy: null, // System
    changedAt: new Date(Date.now() - 60000),
  });

  await IncidentStatusHistory.create({
    incidentId: inc1.id,
    status: INCIDENT_STATUS.ASSIGNED,
    changedBy: userOther.id,
    changedAt: new Date(Date.now() - 30000),
  });

  await IncidentNote.create({
    incidentId: inc1.id,
    authorId: userOther.id,
    note: 'Initial responder note 1',
    createdAt: new Date(Date.now() - 20000),
  });

  await IncidentNote.create({
    incidentId: inc1.id,
    authorId: userOther.id,
    note: 'Follow-up responder note 2',
    createdAt: new Date(Date.now() - 10000),
  });

  await IncidentVehicle.create({
    incidentId: inc1.id,
    vehicleId: vehicleA.id,
    assignedAt: new Date(Date.now() - 30000),
    releasedAt: null,
  });
});

afterAll(async () => {
  if (createdIncidentIds.length > 0) {
    await IncidentVehicle.destroy({ where: { incidentId: createdIncidentIds } });
    await IncidentNote.destroy({ where: { incidentId: createdIncidentIds } });
    await IncidentStatusHistory.destroy({ where: { incidentId: createdIncidentIds } });
    await Incident.destroy({ where: { id: createdIncidentIds } });
  }
  await sequelize.close();
});

// ---------------------------------------------------------------------------
// GET /api/incidents
// ---------------------------------------------------------------------------

describe('GET /api/incidents', () => {
  describe('RBAC authorization', () => {
    test('allowed for admin', async () => {
      const res = await admin().get('/api/incidents');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(typeof res.body.meta.count).toBe('number');
    });

    test('allowed for dispatch_operator', async () => {
      const res = await dispatch().get('/api/incidents');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('allowed for station_officer', async () => {
      const res = await officer(stationA.id).get('/api/incidents');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('forbidden for citizen (403)', async () => {
      const res = await citizen().get('/api/incidents');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('forbidden for firefighter (403)', async () => {
      const res = await firefighter(stationA.id).get('/api/incidents');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Closed exclusion and filtering', () => {
    test('excludes closed incidents by default', async () => {
      const res = await admin().get('/api/incidents');
      expect(res.status).toBe(200);
      const statuses = res.body.data.map((i) => i.status);
      expect(statuses).not.toContain(INCIDENT_STATUS.CLOSED);
    });

    test('includes closed incidents when includeClosed=true', async () => {
      const res = await admin().get('/api/incidents?includeClosed=true');
      expect(res.status).toBe(200);
      const statuses = res.body.data.map((i) => i.status);
      expect(statuses).toContain(INCIDENT_STATUS.CLOSED);
    });

    test('filters by status when provided', async () => {
      const res = await admin().get('/api/incidents?status=in_progress');
      expect(res.status).toBe(200);
      for (const inc of res.body.data) {
        expect(inc.status).toBe(INCIDENT_STATUS.IN_PROGRESS);
      }
    });

    test('rejects invalid status with 400 VALIDATION_ERROR', async () => {
      const res = await admin().get('/api/incidents?status=flying');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('rejects invalid stationId with 400 VALIDATION_ERROR', async () => {
      const res = await admin().get('/api/incidents?stationId=invalid');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Station scoping and serialization', () => {
    test('admin can filter by stationId', async () => {
      const res = await admin().get(`/api/incidents?stationId=${stationA.id}`);
      expect(res.status).toBe(200);
      for (const inc of res.body.data) {
        expect(inc.stationId).toBe(stationA.id);
      }
    });

    test('station_officer ALWAYS gets own station incidents and ignores stationId parameter', async () => {
      // station_officer at stationA requests stationB
      const res = await officer(stationA.id).get(`/api/incidents?stationId=${stationB.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const inc of res.body.data) {
        expect(inc.stationId).toBe(stationA.id);
      }
    });

    test('serialized items contain station { id, name }', async () => {
      const res = await admin().get(`/api/incidents?stationId=${stationA.id}`);
      expect(res.status).toBe(200);
      const item = res.body.data[0];
      expect(item).toBeDefined();
      expect(item.station).toBeDefined();
      expect(item.station.id).toBe(stationA.id);
      expect(item.station.name).toBe(stationA.name);
      expect(item.createdAt).toBeDefined();
      expect(item.severity).toBeDefined();
    });

    test('returns newest first (createdAt DESC)', async () => {
      const res = await admin().get('/api/incidents?includeClosed=true');
      expect(res.status).toBe(200);
      for (let i = 0; i < res.body.data.length - 1; i++) {
        const current = new Date(res.body.data[i].createdAt).getTime();
        const next = new Date(res.body.data[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// GET /api/incidents/stats
// ---------------------------------------------------------------------------

describe('GET /api/incidents/stats', () => {
  test('allowed for admin, dispatch_operator, and station_officer', async () => {
    const resAdmin = await admin().get('/api/incidents/stats');
    expect(resAdmin.status).toBe(200);

    const resDispatch = await dispatch().get('/api/incidents/stats');
    expect(resDispatch.status).toBe(200);

    const resOfficer = await officer(stationA.id).get('/api/incidents/stats');
    expect(resOfficer.status).toBe(200);
  });

  test('forbidden for citizen and firefighter (403)', async () => {
    const resCitizen = await citizen().get('/api/incidents/stats');
    expect(resCitizen.status).toBe(403);

    const resFirefighter = await firefighter(stationA.id).get('/api/incidents/stats');
    expect(resFirefighter.status).toBe(403);
  });

  test('returns all required status keys with integer values', async () => {
    const res = await admin().get('/api/incidents/stats');
    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data).toBeDefined();

    const expectedKeys = [
      'reported',
      'unassigned',
      'assigned',
      'in_progress',
      'resolved',
      'closed',
    ];
    for (const key of expectedKeys) {
      expect(typeof data[key]).toBe('number');
      expect(data[key]).toBeGreaterThanOrEqual(0);
    }
  });

  test('scopes stats to own station for station_officer', async () => {
    const res = await officer(stationA.id).get('/api/incidents/stats');
    expect(res.status).toBe(200);
    // stationA has 1 assigned, 1 in_progress, 1 resolved, 1 closed from our test setup
    expect(res.body.data.assigned).toBeGreaterThanOrEqual(1);
    expect(res.body.data.in_progress).toBeGreaterThanOrEqual(1);
    expect(res.body.data.resolved).toBeGreaterThanOrEqual(1);
    expect(res.body.data.closed).toBeGreaterThanOrEqual(1);
  });

  test('admin can filter stats by stationId', async () => {
    const res = await admin().get(`/api/incidents/stats?stationId=${stationA.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.assigned).toBeGreaterThanOrEqual(1);
  });

  test('rejects invalid stationId with 400 VALIDATION_ERROR', async () => {
    const res = await admin().get('/api/incidents/stats?stationId=invalid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// GET /api/incidents/assigned
// ---------------------------------------------------------------------------

describe('GET /api/incidents/assigned', () => {
  test('allowed for firefighter and station_officer', async () => {
    const resFf = await firefighter(stationA.id).get('/api/incidents/assigned');
    expect(resFf.status).toBe(200);
    expect(Array.isArray(resFf.body.data)).toBe(true);

    const resOff = await officer(stationA.id).get('/api/incidents/assigned');
    expect(resOff.status).toBe(200);
    expect(Array.isArray(resOff.body.data)).toBe(true);
  });

  test('forbidden for citizen, dispatch_operator, and admin (403)', async () => {
    const resCit = await citizen().get('/api/incidents/assigned');
    expect(resCit.status).toBe(403);

    const resDisp = await dispatch().get('/api/incidents/assigned');
    expect(resDisp.status).toBe(403);

    const resAdmin = await admin().get('/api/incidents/assigned');
    expect(resAdmin.status).toBe(403);
  });

  test('only returns assigned, in_progress, and resolved incidents for caller station', async () => {
    const res = await firefighter(stationA.id).get('/api/incidents/assigned');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    const allowedStatuses = ['assigned', 'in_progress', 'resolved'];
    for (const inc of res.body.data) {
      expect(inc.stationId).toBe(stationA.id);
      expect(allowedStatuses).toContain(inc.status);
    }
  });

  test('returns newest first (createdAt DESC)', async () => {
    const res = await firefighter(stationA.id).get('/api/incidents/assigned');
    expect(res.status).toBe(200);
    for (let i = 0; i < res.body.data.length - 1; i++) {
      const current = new Date(res.body.data[i].createdAt).getTime();
      const next = new Date(res.body.data[i + 1].createdAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/incidents/:id
// ---------------------------------------------------------------------------

describe('GET /api/incidents/:id', () => {
  test('returns 400 for non-integer id', async () => {
    const res = await admin().get('/api/incidents/not-a-number');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('returns 404 for missing incident', async () => {
    const res = await admin().get('/api/incidents/999999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  describe('Authorization rules (§9.3)', () => {
    test('reporting citizen CAN access own incident (200)', async () => {
      // createdIncidentIds[0] was created with reporterId = user0.id (0)
      const res = await citizen().get(`/api/incidents/${createdIncidentIds[0]}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdIncidentIds[0]);
    });

    test('citizen CANNOT open someone else incident (403)', async () => {
      // createdIncidentIds[4] was created with reporterId = userOther.id (!= 0)
      const res = await citizen().get(`/api/incidents/${createdIncidentIds[4]}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('firefighter of assigned station CAN access (200)', async () => {
      const res = await firefighter(stationA.id).get(`/api/incidents/${createdIncidentIds[0]}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdIncidentIds[0]);
    });

    test('firefighter of different station CANNOT access (403)', async () => {
      // inc at stationA, firefighter at stationB
      const res = await firefighter(stationB.id).get(`/api/incidents/${createdIncidentIds[0]}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('station_officer of assigned station CAN access (200)', async () => {
      const res = await officer(stationA.id).get(`/api/incidents/${createdIncidentIds[0]}`);
      expect(res.status).toBe(200);
    });

    test('station_officer of different station CANNOT access (403)', async () => {
      const res = await officer(stationB.id).get(`/api/incidents/${createdIncidentIds[0]}`);
      expect(res.status).toBe(403);
    });

    test('dispatch_operator CAN access any incident (200)', async () => {
      const res = await dispatch().get(`/api/incidents/${createdIncidentIds[0]}`);
      expect(res.status).toBe(200);
    });

    test('admin CAN access any incident (200)', async () => {
      const res = await admin().get(`/api/incidents/${createdIncidentIds[0]}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Full incident payload shape', () => {
    test('returns statusHistory, notes, vehicles, reporter, and station', async () => {
      const res = await admin().get(`/api/incidents/${createdIncidentIds[0]}`);
      expect(res.status).toBe(200);
      const { data } = res.body;

      // Base fields
      expect(data.id).toBe(createdIncidentIds[0]);
      expect(data.description).toContain('W3-V-BE-2 Test 1');
      expect(data.severity).toBe(SEVERITY.HIGH);
      expect(data.status).toBe(INCIDENT_STATUS.ASSIGNED);

      // Reporter
      expect(data.reporter).toBeDefined();
      expect(data.reporter.id).toBe(user0.id);
      expect(data.reporter.name).toBe(user0.name);

      // Station
      expect(data.station).toBeDefined();
      expect(data.station.id).toBe(stationA.id);
      expect(data.station.name).toBe(stationA.name);

      // Status history
      expect(Array.isArray(data.statusHistory)).toBe(true);
      expect(data.statusHistory.length).toBe(2);
      expect(data.statusHistory[0].status).toBe(INCIDENT_STATUS.REPORTED);
      expect(data.statusHistory[0].changedBy).toBe('System'); // null changedBy -> 'System'
      expect(data.statusHistory[1].status).toBe(INCIDENT_STATUS.ASSIGNED);
      expect(data.statusHistory[1].changedBy).toBe(userOther.name);

      // Notes (oldest first)
      expect(Array.isArray(data.notes)).toBe(true);
      expect(data.notes.length).toBe(2);
      expect(data.notes[0].note).toBe('Initial responder note 1');
      expect(data.notes[0].author).toBe(userOther.name);
      expect(data.notes[1].note).toBe('Follow-up responder note 2');
      const note0Time = new Date(data.notes[0].createdAt).getTime();
      const note1Time = new Date(data.notes[1].createdAt).getTime();
      expect(note0Time).toBeLessThanOrEqual(note1Time);

      // Vehicles
      expect(Array.isArray(data.vehicles)).toBe(true);
      expect(data.vehicles.length).toBe(1);
      expect(data.vehicles[0].id).toBe(vehicleA.id);
      expect(data.vehicles[0].type).toBe(vehicleA.type);
      expect(data.vehicles[0].registrationNo).toBe(vehicleA.registrationNo);
      expect(data.vehicles[0].assignedAt).toBeDefined();
      expect(data.vehicles[0].releasedAt).toBeNull();
    });
  });
});
