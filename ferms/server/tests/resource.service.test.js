// tests/resource.service.test.js — Unit and integration tests for resource.service (§4.3, §4.7, §7.1)
// Owner: Vedant (W3-V-BE-1)
'use strict';

require('dotenv').config();
const { sequelize, Station, Vehicle, User, Incident, IncidentVehicle } = require('../src/models');
const { VEHICLE_STATUS, SEVERITY, INCIDENT_STATUS } = require('../src/domain/constants');
const {
  getAvailableVehicle,
  releaseVehicles,
  countAvailableByStation,
} = require('../src/services/resource.service');

describe('resource.service (W3-V-BE-1)', () => {
  let testStation;
  let emptyStation;
  let testUser;
  let createdVehicleIds = [];
  let createdIncidentIds = [];
  let createdStationIds = [];

  beforeAll(async () => {
    await sequelize.authenticate();

    // Find or create a user for incidents
    testUser = await User.findOne({ where: { accountStatus: 'active' } });
    if (!testUser) {
      testUser = await User.create({
        name: 'Test Citizen',
        email: `test-citizen-${Date.now()}@ferms.test`,
        passwordHash: 'dummyhash123',
        role: 'citizen',
        accountStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Create a dedicated station for testing
    testStation = await Station.create({
      name: `Resource Test Station ${Date.now()}`,
      address: '100 Service Test Ave',
      latitude: 19.08,
      longitude: 72.88,
      contact: '555-TEST-01',
      createdAt: new Date(),
    });
    createdStationIds.push(testStation.id);

    // Create a station with no vehicles to test empty availability
    emptyStation = await Station.create({
      name: `Empty Station ${Date.now()}`,
      address: '101 Service Empty Ave',
      latitude: 19.09,
      longitude: 72.89,
      contact: '555-TEST-02',
      createdAt: new Date(),
    });
    createdStationIds.push(emptyStation.id);
  });

  afterAll(async () => {
    // Cleanup junction rows, incidents, vehicles, stations
    if (createdIncidentIds.length > 0) {
      await IncidentVehicle.destroy({ where: { incidentId: createdIncidentIds } });
      await Incident.destroy({ where: { id: createdIncidentIds } });
    }
    if (createdVehicleIds.length > 0) {
      await IncidentVehicle.destroy({ where: { vehicleId: createdVehicleIds } });
      await Vehicle.destroy({ where: { id: createdVehicleIds } });
    }
    if (createdStationIds.length > 0) {
      await Station.destroy({ where: { id: createdStationIds } });
    }
    await sequelize.close();
  });

  // ==========================================================================
  // 1. getAvailableVehicle
  // ==========================================================================

  describe('getAvailableVehicle', () => {
    let vDispatched, vMaintenance, vAvailable1, vAvailable2;

    beforeAll(async () => {
      // Create vehicles in different states in order
      vDispatched = await Vehicle.create({
        stationId: testStation.id,
        type: 'pumper_truck',
        registrationNo: `TEST-DISP-${Date.now()}`,
        status: VEHICLE_STATUS.DISPATCHED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdVehicleIds.push(vDispatched.id);

      vMaintenance = await Vehicle.create({
        stationId: testStation.id,
        type: 'ladder_truck',
        registrationNo: `TEST-MAIN-${Date.now()}`,
        status: VEHICLE_STATUS.MAINTENANCE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdVehicleIds.push(vMaintenance.id);

      vAvailable1 = await Vehicle.create({
        stationId: testStation.id,
        type: 'pumper_truck',
        registrationNo: `TEST-AV1-${Date.now()}`,
        status: VEHICLE_STATUS.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdVehicleIds.push(vAvailable1.id);

      vAvailable2 = await Vehicle.create({
        stationId: testStation.id,
        type: 'water_bowser',
        registrationNo: `TEST-AV2-${Date.now()}`,
        status: VEHICLE_STATUS.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdVehicleIds.push(vAvailable2.id);
    });

    test('returns null when none available at the station', async () => {
      const result = await getAvailableVehicle(emptyStation.id);
      expect(result).toBeNull();
    });

    test('returns the first available vehicle ordered by id ASC', async () => {
      const vehicle = await getAvailableVehicle(testStation.id);
      expect(vehicle).not.toBeNull();
      expect(vehicle.id).toBe(vAvailable1.id);
      expect(vehicle.status).toBe(VEHICLE_STATUS.AVAILABLE);
    });

    test('skips maintenance and dispatched vehicles', async () => {
      const vehicle = await getAvailableVehicle(testStation.id);
      expect(vehicle.id).not.toBe(vDispatched.id);
      expect(vehicle.id).not.toBe(vMaintenance.id);
      expect(vehicle.status).toBe(VEHICLE_STATUS.AVAILABLE);
    });

    test('locks the row with FOR UPDATE when transaction is passed', async () => {
      const t = await sequelize.transaction();
      try {
        const vehicle = await getAvailableVehicle(testStation.id, { transaction: t });
        expect(vehicle).not.toBeNull();
        expect(vehicle.id).toBe(vAvailable1.id);
        await t.commit();
      } catch (err) {
        await t.rollback();
        throw err;
      }
    });

    test('passes transaction.LOCK.UPDATE in findOptions when transaction is provided', async () => {
      const t = await sequelize.transaction();
      const spy = jest.spyOn(Vehicle, 'findOne');
      try {
        await getAvailableVehicle(testStation.id, { transaction: t });
        expect(spy).toHaveBeenCalled();
        const callArgs = spy.mock.calls[spy.mock.calls.length - 1][0];
        expect(callArgs.transaction).toBe(t);
        expect(callArgs.lock).toBe(t.LOCK.UPDATE);
        await t.commit();
      } catch (err) {
        await t.rollback();
        throw err;
      } finally {
        spy.mockRestore();
      }
    });

    test('returns null when all vehicles at station are in maintenance or dispatched', async () => {
      // Temporarily mark available vehicles to maintenance
      await Vehicle.update(
        { status: VEHICLE_STATUS.MAINTENANCE },
        { where: { id: [vAvailable1.id, vAvailable2.id] } }
      );

      const result = await getAvailableVehicle(testStation.id);
      expect(result).toBeNull();

      // Restore to available
      await Vehicle.update(
        { status: VEHICLE_STATUS.AVAILABLE },
        { where: { id: [vAvailable1.id, vAvailable2.id] } }
      );
    });
  });

  // ==========================================================================
  // 2. releaseVehicles
  // ==========================================================================

  describe('releaseVehicles', () => {
    let incident;
    let vActive1, vActive2, vAlreadyReleased;

    beforeAll(async () => {
      incident = await Incident.create({
        reporterId: testUser.id,
        latitude: 19.076,
        longitude: 72.877,
        address: '123 Release Test St',
        description: 'Test fire incident for release vehicles verification',
        severity: SEVERITY.HIGH,
        status: INCIDENT_STATUS.IN_PROGRESS,
        stationId: testStation.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdIncidentIds.push(incident.id);

      vActive1 = await Vehicle.create({
        stationId: testStation.id,
        type: 'pumper_truck',
        registrationNo: `REL-V1-${Date.now()}`,
        status: VEHICLE_STATUS.DISPATCHED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdVehicleIds.push(vActive1.id);

      vActive2 = await Vehicle.create({
        stationId: testStation.id,
        type: 'rescue_van',
        registrationNo: `REL-V2-${Date.now()}`,
        status: VEHICLE_STATUS.DISPATCHED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdVehicleIds.push(vActive2.id);

      vAlreadyReleased = await Vehicle.create({
        stationId: testStation.id,
        type: 'water_bowser',
        registrationNo: `REL-V3-${Date.now()}`,
        status: VEHICLE_STATUS.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdVehicleIds.push(vAlreadyReleased.id);

      // Junction assignments: two active (released_at null), one already released
      const pastDate = new Date(Date.now() - 3600000);
      await IncidentVehicle.bulkCreate([
        { incidentId: incident.id, vehicleId: vActive1.id, assignedAt: pastDate, releasedAt: null },
        { incidentId: incident.id, vehicleId: vActive2.id, assignedAt: pastDate, releasedAt: null },
        { incidentId: incident.id, vehicleId: vAlreadyReleased.id, assignedAt: pastDate, releasedAt: pastDate },
      ]);
    });

    test('releases only active rows and returns the count released', async () => {
      const releasedCount = await releaseVehicles(incident.id);
      expect(releasedCount).toBe(2);

      // Verify incident_vehicles rows: all should now have releasedAt populated
      const ivRows = await IncidentVehicle.findAll({
        where: { incidentId: incident.id },
        order: [['vehicleId', 'ASC']],
      });

      expect(ivRows.length).toBe(3);
      for (const row of ivRows) {
        expect(row.releasedAt).not.toBeNull();
      }

      // Verify vehicles status changed to available
      const updatedV1 = await Vehicle.findByPk(vActive1.id);
      const updatedV2 = await Vehicle.findByPk(vActive2.id);

      expect(updatedV1.status).toBe(VEHICLE_STATUS.AVAILABLE);
      expect(updatedV2.status).toBe(VEHICLE_STATUS.AVAILABLE);
    });

    test('returns 0 when calling releaseVehicles again on already released incident', async () => {
      const secondReleaseCount = await releaseVehicles(incident.id);
      expect(secondReleaseCount).toBe(0);
    });

    test('returns 0 for non-existent incident', async () => {
      const nonExistentCount = await releaseVehicles(999999);
      expect(nonExistentCount).toBe(0);
    });

    test('works properly within an active database transaction', async () => {
      const tempIncident = await Incident.create({
        reporterId: testUser.id,
        latitude: 19.076,
        longitude: 72.877,
        address: '456 Tx Test St',
        description: 'Transaction release test',
        severity: SEVERITY.MEDIUM,
        status: INCIDENT_STATUS.IN_PROGRESS,
        stationId: testStation.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdIncidentIds.push(tempIncident.id);

      const tempVehicle = await Vehicle.create({
        stationId: testStation.id,
        type: 'pumper_truck',
        registrationNo: `TX-REL-${Date.now()}`,
        status: VEHICLE_STATUS.DISPATCHED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdVehicleIds.push(tempVehicle.id);

      await IncidentVehicle.create({
        incidentId: tempIncident.id,
        vehicleId: tempVehicle.id,
        assignedAt: new Date(),
        releasedAt: null,
      });

      const t = await sequelize.transaction();
      try {
        const count = await releaseVehicles(tempIncident.id, { transaction: t });
        expect(count).toBe(1);
        await t.commit();
      } catch (err) {
        await t.rollback();
        throw err;
      }

      const refreshedVehicle = await Vehicle.findByPk(tempVehicle.id);
      expect(refreshedVehicle.status).toBe(VEHICLE_STATUS.AVAILABLE);
    });
  });

  // ==========================================================================
  // 3. countAvailableByStation
  // ==========================================================================

  describe('countAvailableByStation', () => {
    test('returns a map of stationId to available vehicle count', async () => {
      const map = await countAvailableByStation();
      expect(map).toBeDefined();

      // Check map instance methods
      expect(typeof map.get).toBe('function');

      // testStation should have at least the available vehicles we created
      const count = map.get(testStation.id);
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);

      // Bracket notation indexing should also work
      expect(map[testStation.id]).toBe(count);
    });

    test('excludes maintenance and dispatched vehicles from counts', async () => {
      const isolatedStation = await Station.create({
        name: `Isolated Station ${Date.now()}`,
        address: '999 Isolated Way',
        latitude: 19.01,
        longitude: 72.80,
        createdAt: new Date(),
      });
      createdStationIds.push(isolatedStation.id);

      // Add 2 available, 1 dispatched, 1 maintenance
      const v1 = await Vehicle.create({
        stationId: isolatedStation.id,
        type: 'pumper_truck',
        registrationNo: `ISO-AV1-${Date.now()}`,
        status: VEHICLE_STATUS.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const v2 = await Vehicle.create({
        stationId: isolatedStation.id,
        type: 'pumper_truck',
        registrationNo: `ISO-AV2-${Date.now()}`,
        status: VEHICLE_STATUS.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const v3 = await Vehicle.create({
        stationId: isolatedStation.id,
        type: 'ladder_truck',
        registrationNo: `ISO-DISP-${Date.now()}`,
        status: VEHICLE_STATUS.DISPATCHED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const v4 = await Vehicle.create({
        stationId: isolatedStation.id,
        type: 'rescue_van',
        registrationNo: `ISO-MAIN-${Date.now()}`,
        status: VEHICLE_STATUS.MAINTENANCE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdVehicleIds.push(v1.id, v2.id, v3.id, v4.id);

      const map = await countAvailableByStation();
      expect(map.get(isolatedStation.id)).toBe(2);
      expect(map[isolatedStation.id]).toBe(2);
    });
  });
});
