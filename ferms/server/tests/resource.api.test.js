// tests/resource.api.test.js — Integration tests for stations, vehicles, and personnel API (§9.2, §9.3)
// Owner: Vedant (W2-V-BE-1)
'use strict';

const request = require('supertest');
const app     = require('../src/app');
const { sequelize } = require('../src/models');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const asRole = (role, stationId = null) => {
  const agent = request(app);
  return {
    get:    (url) => agent.get(url).set('x-dev-role', role).set('x-dev-station-id', stationId ? String(stationId) : ''),
    post:   (url) => agent.post(url).set('x-dev-role', role).set('x-dev-station-id', stationId ? String(stationId) : ''),
    patch:  (url) => agent.patch(url).set('x-dev-role', role).set('x-dev-station-id', stationId ? String(stationId) : ''),
    delete: (url) => agent.delete(url).set('x-dev-role', role).set('x-dev-station-id', stationId ? String(stationId) : ''),
  };
};

const admin   = () => asRole('admin');
const officer = (stationId) => asRole('station_officer', stationId);
const citizen = () => asRole('citizen');

beforeAll(async () => { await sequelize.authenticate(); });
afterAll(async () => { await sequelize.close(); });

// ---------------------------------------------------------------------------
// GET /api/stations
// ---------------------------------------------------------------------------

describe('GET /api/stations', () => {
  test('returns 200 with data array for any authenticated user', async () => {
    const res = await citizen().get('/api/stations');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.meta.count).toBe('number');
  });

  test('each station has availableVehicles and onDutyPersonnel counts', async () => {
    const res = await admin().get('/api/stations');
    for (const s of res.body.data) {
      expect(typeof s.availableVehicles).toBe('number');
      expect(typeof s.onDutyPersonnel).toBe('number');
    }
  });

  test('Andheri station has 3 available vehicles from seed', async () => {
    const res = await admin().get('/api/stations');
    const andheri = res.body.data.find((s) => s.name.includes('Andheri'));
    expect(andheri).toBeDefined();
    expect(andheri.availableVehicles).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// POST /api/stations (admin only)
// ---------------------------------------------------------------------------

describe('POST /api/stations', () => {
  let createdStationId;

  test('admin can create a station', async () => {
    const res = await admin()
      .post('/api/stations')
      .send({ name: 'Test Station Alpha', address: '1 Test Road, Mumbai', latitude: 19.07, longitude: 72.88, contact: '022-99990000' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Station Alpha');
    createdStationId = res.body.data.id;
  });

  test('citizen cannot create a station (403)', async () => {
    const res = await citizen()
      .post('/api/stations')
      .send({ name: 'Unauthorized Station', address: 'X', latitude: 0, longitude: 0 });
    expect(res.status).toBe(403);
  });

  test('missing required fields returns 400', async () => {
    const res = await admin().post('/api/stations').send({ latitude: 19.07, longitude: 72.88 });
    expect(res.status).toBe(400);
  });

  afterAll(async () => {
    if (createdStationId) {
      const { Station } = require('../src/models');
      await Station.destroy({ where: { id: createdStationId } });
    }
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/stations/:id (admin only)
// ---------------------------------------------------------------------------

describe('PATCH /api/stations/:id', () => {
  let tempStationId;

  beforeAll(async () => {
    const res = await admin()
      .post('/api/stations')
      .send({ name: 'Patch Target Station', address: '2 Patch Road', latitude: 19.01, longitude: 72.80 });
    tempStationId = res.body.data.id;
  });

  afterAll(async () => {
    if (tempStationId) {
      const { Station } = require('../src/models');
      await Station.destroy({ where: { id: tempStationId } });
    }
  });

  test('admin can update station name', async () => {
    const res = await admin().patch(`/api/stations/${tempStationId}`).send({ name: 'Updated Station Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Station Name');
  });

  test('returns 404 for non-existent station', async () => {
    const res = await admin().patch('/api/stations/999999').send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// GET /api/stations/:id/vehicles
// ---------------------------------------------------------------------------

describe('GET /api/stations/:id/vehicles', () => {
  let stationId;

  beforeAll(async () => {
    const { Station } = require('../src/models');
    const { Op } = require('sequelize');
    const s = await Station.findOne({ where: { name: { [Op.like]: '%Andheri%' } } });
    stationId = s.id;
  });

  test('station officer for own station can list vehicles', async () => {
    const res = await officer(stationId).get(`/api/stations/${stationId}/vehicles`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('station officer for DIFFERENT station gets 403', async () => {
    const res = await officer(stationId + 99).get(`/api/stations/${stationId}/vehicles`);
    expect(res.status).toBe(403);
  });

  test('admin can list vehicles for any station', async () => {
    const res = await admin().get(`/api/stations/${stationId}/vehicles`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// POST /api/vehicles — duplicate registration
// ---------------------------------------------------------------------------

describe('POST /api/vehicles - duplicate registration', () => {
  test('duplicate registration number returns 409', async () => {
    const res = await admin()
      .post('/api/vehicles')
      .send({ type: 'fire_engine', registrationNo: 'MH-02-FE-101', stationId: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('unique registration number returns 201', async () => {
    const regNo = `TEST-${Date.now()}`;
    const { Station, Vehicle } = require('../src/models');
    const s = await Station.findOne();
    const res = await admin().post('/api/vehicles').send({ type: 'fire_engine', registrationNo: regNo, stationId: s.id });
    expect(res.status).toBe(201);
    await Vehicle.destroy({ where: { registrationNo: regNo.toUpperCase() } });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/vehicles/:id — active incident block
// ---------------------------------------------------------------------------

describe('DELETE /api/vehicles/:id - active incident block', () => {
  let vehicleId;
  let incidentId;

  beforeAll(async () => {
    const { Vehicle, Incident, IncidentVehicle, Station, User } = require('../src/models');
    const { Op } = require('sequelize');
    const station = await Station.findOne({ where: { name: { [Op.like]: '%Andheri%' } } });
    const vehicle = await Vehicle.findOne({ where: { stationId: station.id, status: 'available' } });
    vehicleId = vehicle.id;

    const reporter = await User.findOne({ where: { role: 'citizen' } });
    const now = new Date();
    const incident = await Incident.create({
      reporterId: reporter.id, latitude: 19.1, longitude: 72.85,
      description: 'Test incident for deletion block', severity: 'medium',
      status: 'assigned', stationId: station.id,
      createdAt: now, updatedAt: now,  // explicit: model has allowNull:false on timestamps
    });
    incidentId = incident.id;

    await IncidentVehicle.create({ incidentId, vehicleId, assignedAt: new Date(), releasedAt: null });
    await vehicle.update({ status: 'dispatched' });
  });

  afterAll(async () => {
    const { IncidentVehicle, Incident, Vehicle } = require('../src/models');
    if (incidentId) {
      await IncidentVehicle.destroy({ where: { incidentId } });
      await Incident.destroy({ where: { id: incidentId } });
    }
    if (vehicleId) {
      await Vehicle.update({ status: 'available' }, { where: { id: vehicleId } });
    }
  });

  test('returns 409 when vehicle has active incident assignment', async () => {
    const res = await admin().delete(`/api/vehicles/${vehicleId}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/personnel/:userId/duty — station officer scope
// ---------------------------------------------------------------------------

describe('PATCH /api/personnel/:userId/duty - scope enforcement', () => {
  let ff1Id;
  let ff2Id;

  beforeAll(async () => {
    const { User } = require('../src/models');
    const ff1 = await User.findOne({ where: { role: 'firefighter', stationId: 1 } });
    const ff2 = await User.findOne({ where: { role: 'firefighter', stationId: 2 } });
    ff1Id = ff1 ? ff1.id : null;
    ff2Id = ff2 ? ff2.id : null;
  });

  test('officer at station 1 can update own firefighter duty', async () => {
    if (!ff1Id) return;
    const res = await officer(1).patch(`/api/personnel/${ff1Id}/duty`).send({ onDuty: false });
    expect(res.status).toBe(200);
    expect(res.body.data.onDuty).toBe(false);
    await officer(1).patch(`/api/personnel/${ff1Id}/duty`).send({ onDuty: true });
  });

  test('officer at station 1 cannot update station 2 firefighter (403)', async () => {
    if (!ff2Id) return;
    const res = await officer(1).patch(`/api/personnel/${ff2Id}/duty`).send({ onDuty: false });
    expect(res.status).toBe(403);
  });

  test('admin can update duty for any personnel', async () => {
    if (!ff2Id) return;
    const res = await admin().patch(`/api/personnel/${ff2Id}/duty`).send({ onDuty: false });
    expect(res.status).toBe(200);
    await admin().patch(`/api/personnel/${ff2Id}/duty`).send({ onDuty: true });
  });
});
