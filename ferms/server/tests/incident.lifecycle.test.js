// tests/incident.lifecycle.test.js — API integration tests for incident resolve and close endpoints (TASK W5-V-BE-1)
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
  Vehicle,
  IncidentVehicle,
  IncidentStatusHistory,
  IncidentNote,
} = require('../src/models');
const { ROLES, INCIDENT_STATUS, SEVERITY, VEHICLE_STATUS } = require('../src/domain/constants');
const notificationService = require('../src/services/notification.service');
const sockets = require('../src/sockets');

// ---------------------------------------------------------------------------
// Helpers for role-based requests
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
const createdVehicleIds = [];

beforeAll(async () => {
  await sequelize.authenticate();

  // Ensure dev-mode user id: 0 exists (req.user.id = 0)
  user0 = await User.findByPk(0);
  if (!user0) {
    await sequelize.query(`
      INSERT INTO users (id, name, email, password_hash, role, account_status, created_at)
      VALUES (0, 'Demo Test User Zero', 'user0_lifecycle@ferms.test', '$2b$10$abcdefghijklmnopqrstuu', 'firefighter', 'active', NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    user0 = await User.findByPk(0);
  }

  // Create isolated test stations so concurrent tests are never affected
  const ts = Date.now();
  stationA = await Station.create({
    name: `Lifecycle Station A ${ts}`,
    address: '100 Lifecycle Station Rd A',
    latitude: 19.076,
    longitude: 72.877,
    createdAt: new Date(),
  });

  stationB = await Station.create({
    name: `Lifecycle Station B ${ts}`,
    address: '200 Lifecycle Station Rd B',
    latitude: 19.113,
    longitude: 72.869,
    createdAt: new Date(),
  });
});

afterAll(async () => {
  if (createdIncidentIds.length > 0) {
    await IncidentVehicle.destroy({ where: { incidentId: createdIncidentIds } });
    await IncidentNote.destroy({ where: { incidentId: createdIncidentIds } });
    await IncidentStatusHistory.destroy({ where: { incidentId: createdIncidentIds } });
    await Incident.destroy({ where: { id: createdIncidentIds } });
  }

  if (createdVehicleIds.length > 0) {
    await IncidentVehicle.destroy({ where: { vehicleId: createdVehicleIds } });
    await Vehicle.destroy({ where: { id: createdVehicleIds } });
  }

  if (stationA) {
    await Station.destroy({ where: { id: stationA.id } });
  }
  if (stationB) {
    await Station.destroy({ where: { id: stationB.id } });
  }

  await sequelize.close();
});

const createTestIncidentWithVehicle = async ({ status = INCIDENT_STATUS.IN_PROGRESS, stationId } = {}) => {
  const targetStation = stationId || stationA.id;
  const now = new Date();

  // Create a dispatched vehicle for this incident
  const vehicle = await Vehicle.create({
    stationId: targetStation,
    type: 'fire_engine',
    registrationNo: `LC-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    status: VEHICLE_STATUS.DISPATCHED,
  });
  createdVehicleIds.push(vehicle.id);

  const inc = await Incident.create({
    reporterId: 0,
    latitude: 19.076,
    longitude: 72.877,
    address: '123 Lifecycle Ave',
    description: 'Active structure fire',
    severity: SEVERITY.HIGH,
    status,
    stationId: targetStation,
    createdAt: now,
    updatedAt: now,
  });
  createdIncidentIds.push(inc.id);

  // Link vehicle to incident via junction
  await IncidentVehicle.create({
    incidentId: inc.id,
    vehicleId: vehicle.id,
    assignedAt: now,
    releasedAt: null,
  });

  // History row
  await IncidentStatusHistory.create({
    incidentId: inc.id,
    status,
    changedBy: 0,
    changedAt: now,
  });

  return { incident: inc, vehicle };
};

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('Incident Lifecycle: Resolve & Close Endpoints (W5-V-BE-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Full chain: reported -> assigned -> in_progress -> resolved -> closed through API', () => {
    it('walks an incident all the way through the lifecycle and verifies notifications, vehicles, and socket events', async () => {
      // Start with incident reported and assigned to stationA with a dispatched vehicle
      const now = new Date();
      const initialVehicle = await Vehicle.create({
        stationId: stationA.id,
        type: 'fire_engine',
        registrationNo: `CHAIN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        status: VEHICLE_STATUS.DISPATCHED,
      });
      createdVehicleIds.push(initialVehicle.id);

      const incident = await Incident.create({
        reporterId: 0,
        latitude: stationA.latitude,
        longitude: stationA.longitude,
        address: '10 Chain Way',
        description: 'Smoke billowing from roof of building',
        severity: SEVERITY.HIGH,
        status: INCIDENT_STATUS.ASSIGNED,
        stationId: stationA.id,
        createdAt: now,
        updatedAt: now,
      });
      const incidentId = incident.id;
      createdIncidentIds.push(incidentId);

      // Record reported and assigned history
      await IncidentStatusHistory.create({
        incidentId,
        status: INCIDENT_STATUS.REPORTED,
        changedBy: 0,
        changedAt: new Date(now.getTime() - 10000),
      });
      await IncidentStatusHistory.create({
        incidentId,
        status: INCIDENT_STATUS.ASSIGNED,
        changedBy: 0,
        changedAt: new Date(now.getTime() - 5000),
      });

      // Link vehicle to incident
      await IncidentVehicle.create({
        incidentId,
        vehicleId: initialVehicle.id,
        assignedAt: now,
        releasedAt: null,
      });

      // 2. Start response (assigned -> in_progress) by firefighter of stationA
      const statusRes = await firefighter(stationA.id).patch(`/api/incidents/${incidentId}/status`, {
        status: 'in_progress',
      });
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status).toBe('in_progress');

      // 3. Resolve incident (in_progress -> resolved) by firefighter of stationA
      const resolveRes = await firefighter(stationA.id).patch(`/api/incidents/${incidentId}/resolve`, {
        closingSummary: 'Fire successfully extinguished using Class A foam. No casualties.',
      });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data).toBeDefined();
      expect(resolveRes.body.data.incident).toBeDefined();
      expect(resolveRes.body.data.incident.id).toBe(incidentId);
      expect(resolveRes.body.data.incident.status).toBe('resolved');
      expect(resolveRes.body.data.incident.closingSummary).toBe(
        'Fire successfully extinguished using Class A foam. No casualties.'
      );

      // Check vehicle goes back to 'available' and released_at is set
      await initialVehicle.reload();
      expect(initialVehicle.status).toBe(VEHICLE_STATUS.AVAILABLE);

      const iv = await IncidentVehicle.findOne({
        where: { incidentId, vehicleId: initialVehicle.id },
      });
      expect(iv).not.toBeNull();
      expect(iv.releasedAt).not.toBeNull();

      // Check reporter notification after resolve
      expect(notificationService.notifyReporter).toHaveBeenCalledWith(
        expect.objectContaining({ id: incidentId }),
        'Your reported incident has been resolved.'
      );

      // Check socket emit for incident:updated
      expect(sockets.emitIncident).toHaveBeenCalledWith(
        'incident:updated',
        expect.objectContaining({ id: incidentId, status: 'resolved' })
      );

      // 4. Close incident (resolved -> closed) by station officer of stationA
      const closeRes = await officer(stationA.id).patch(`/api/incidents/${incidentId}/close`, {});

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data).toBeDefined();
      expect(closeRes.body.data.incident).toBeDefined();
      expect(closeRes.body.data.incident.id).toBe(incidentId);
      expect(closeRes.body.data.incident.status).toBe('closed');

      // Check reporter notification after close
      expect(notificationService.notifyReporter).toHaveBeenCalledWith(
        expect.objectContaining({ id: incidentId }),
        'Your reported incident has been closed.'
      );

      // Check socket emit for incident:updated
      expect(sockets.emitIncident).toHaveBeenCalledWith(
        'incident:updated',
        expect.objectContaining({ id: incidentId, status: 'closed' })
      );

      // Verify status history has all entries recorded
      const historyRows = await IncidentStatusHistory.findAll({
        where: { incidentId },
        order: [['id', 'ASC']],
      });
      const statuses = historyRows.map((h) => h.status);
      expect(statuses).toEqual(
        expect.arrayContaining(['reported', 'assigned', 'in_progress', 'resolved', 'closed'])
      );
    });
  });

  describe('2. PATCH /api/incidents/:id/resolve requirements', () => {
    it('requires closingSummary (400 if missing or empty or whitespace)', async () => {
      const { incident } = await createTestIncidentWithVehicle({ status: INCIDENT_STATUS.IN_PROGRESS });

      // Missing body
      let res = await firefighter(stationA.id).patch(`/api/incidents/${incident.id}/resolve`, {});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      // Empty string
      res = await firefighter(stationA.id).patch(`/api/incidents/${incident.id}/resolve`, {
        closingSummary: '',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      // Whitespace only
      res = await firefighter(stationA.id).patch(`/api/incidents/${incident.id}/resolve`, {
        closingSummary: '   ',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      // Non-string
      res = await firefighter(stationA.id).patch(`/api/incidents/${incident.id}/resolve`, {
        closingSummary: 12345,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects closingSummary longer than 4000 characters with 400', async () => {
      const { incident } = await createTestIncidentWithVehicle({ status: INCIDENT_STATUS.IN_PROGRESS });

      const longSummary = 'A'.repeat(4001);
      const res = await firefighter(stationA.id).patch(`/api/incidents/${incident.id}/resolve`, {
        closingSummary: longSummary,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects with 400 INVALID_TRANSITION and allowedNext when incident is not in_progress', async () => {
      const { incident } = await createTestIncidentWithVehicle({ status: INCIDENT_STATUS.ASSIGNED });

      const res = await firefighter(stationA.id).patch(`/api/incidents/${incident.id}/resolve`, {
        closingSummary: 'Attempt to resolve while assigned',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
      expect(res.body.error.allowedNext).toEqual(expect.arrayContaining(['in_progress', 'assigned']));

      // Verify incident status remained assigned
      await incident.reload();
      expect(incident.status).toBe(INCIDENT_STATUS.ASSIGNED);
    });

    it('allows station officer of the incident station to resolve', async () => {
      const { incident, vehicle } = await createTestIncidentWithVehicle({ status: INCIDENT_STATUS.IN_PROGRESS });

      const res = await officer(stationA.id).patch(`/api/incidents/${incident.id}/resolve`, {
        closingSummary: 'Resolved by station officer.',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.incident.status).toBe('resolved');
      expect(res.body.data.incident.closingSummary).toBe('Resolved by station officer.');

      await vehicle.reload();
      expect(vehicle.status).toBe(VEHICLE_STATUS.AVAILABLE);
    });

    it('rejects firefighter of another station with 403', async () => {
      const { incident } = await createTestIncidentWithVehicle({
        status: INCIDENT_STATUS.IN_PROGRESS,
        stationId: stationA.id,
      });

      const res = await firefighter(stationB.id).patch(`/api/incidents/${incident.id}/resolve`, {
        closingSummary: 'Cross-station resolve attempt',
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects station officer of another station with 403', async () => {
      const { incident } = await createTestIncidentWithVehicle({
        status: INCIDENT_STATUS.IN_PROGRESS,
        stationId: stationA.id,
      });

      const res = await officer(stationB.id).patch(`/api/incidents/${incident.id}/resolve`, {
        closingSummary: 'Cross-station officer resolve attempt',
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects citizen and dispatch operator with 403', async () => {
      const { incident } = await createTestIncidentWithVehicle({ status: INCIDENT_STATUS.IN_PROGRESS });

      const resCit = await citizen().patch(`/api/incidents/${incident.id}/resolve`, {
        closingSummary: 'Citizen attempt',
      });
      expect(resCit.status).toBe(403);

      const resDisp = await dispatch().patch(`/api/incidents/${incident.id}/resolve`, {
        closingSummary: 'Dispatch attempt',
      });
      expect(resDisp.status).toBe(403);
    });

    it('returns 404 for non-existent incident id', async () => {
      const res = await firefighter(stationA.id).patch('/api/incidents/999999/resolve', {
        closingSummary: 'Does not exist',
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('3. PATCH /api/incidents/:id/close requirements', () => {
    it('allows station officer of the incident station to close a resolved incident', async () => {
      const { incident } = await createTestIncidentWithVehicle({ status: INCIDENT_STATUS.RESOLVED });

      const res = await officer(stationA.id).patch(`/api/incidents/${incident.id}/close`, {});

      expect(res.status).toBe(200);
      expect(res.body.data.incident.id).toBe(incident.id);
      expect(res.body.data.incident.status).toBe('closed');

      await incident.reload();
      expect(incident.status).toBe('closed');

      expect(notificationService.notifyReporter).toHaveBeenCalledWith(
        expect.objectContaining({ id: incident.id }),
        'Your reported incident has been closed.'
      );

      expect(sockets.emitIncident).toHaveBeenCalledWith(
        'incident:updated',
        expect.objectContaining({ id: incident.id, status: 'closed' })
      );
    });

    it('rejects close before resolve with 400 INVALID_TRANSITION and allowedNext', async () => {
      // 1. in_progress -> close is invalid (allowedNext is ['resolved'])
      const { incident: inProgressInc } = await createTestIncidentWithVehicle({
        status: INCIDENT_STATUS.IN_PROGRESS,
      });

      let res = await officer(stationA.id).patch(`/api/incidents/${inProgressInc.id}/close`, {});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
      expect(res.body.error.allowedNext).toEqual(['resolved']);

      // 2. assigned -> close is invalid
      const { incident: assignedInc } = await createTestIncidentWithVehicle({
        status: INCIDENT_STATUS.ASSIGNED,
      });

      res = await officer(stationA.id).patch(`/api/incidents/${assignedInc.id}/close`, {});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
      expect(res.body.error.allowedNext).toEqual(expect.arrayContaining(['in_progress', 'assigned']));
    });

    it('rejects firefighter with 403 (firefighter cannot close)', async () => {
      const { incident } = await createTestIncidentWithVehicle({ status: INCIDENT_STATUS.RESOLVED });

      const res = await firefighter(stationA.id).patch(`/api/incidents/${incident.id}/close`, {});

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects officer of another station with 403', async () => {
      const { incident } = await createTestIncidentWithVehicle({
        status: INCIDENT_STATUS.RESOLVED,
        stationId: stationA.id,
      });

      const res = await officer(stationB.id).patch(`/api/incidents/${incident.id}/close`, {});

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects citizen, dispatch operator, and admin with 403', async () => {
      const { incident } = await createTestIncidentWithVehicle({ status: INCIDENT_STATUS.RESOLVED });

      const resCit = await citizen().patch(`/api/incidents/${incident.id}/close`, {});
      expect(resCit.status).toBe(403);

      const resDisp = await dispatch().patch(`/api/incidents/${incident.id}/close`, {});
      expect(resDisp.status).toBe(403);

      const resAdmin = await admin().patch(`/api/incidents/${incident.id}/close`, {});
      expect(resAdmin.status).toBe(403);
    });

    it('returns 404 for non-existent incident id', async () => {
      const res = await officer(stationA.id).patch('/api/incidents/999999/close', {});
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
