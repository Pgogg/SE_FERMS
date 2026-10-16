// tests/dispatch.service.test.js — Unit tests for dispatch service: nearest-station selection and vehicle ranking
// W3-P-BE-1 requirement 1 & 6
'use strict';

const { distanceKm } = require('../src/utils/haversine');

// ─── Haversine unit tests (requirement 1) ────────────────────────────────────
describe('distanceKm (Haversine)', () => {
  // Mumbai (Chhatrapati Shivaji airport) → Delhi (Indira Gandhi airport)
  // Known distance ≈ 1148 km
  it('Mumbai → Delhi within 1% of 1148 km', () => {
    const d = distanceKm(19.0896, 72.8656, 28.5665, 77.1031);
    expect(d).toBeGreaterThan(1148 * 0.99);
    expect(d).toBeLessThan(1148 * 1.01);
  });

  // Andheri (Mumbai) → Dadar (Mumbai) — short distance ≈ 10.9 km (computed from coordinates)
  it('Andheri → Dadar within 1%', () => {
    const d = distanceKm(19.1136, 72.8697, 19.0178, 72.8478);
    // Actual computed Haversine = ~10.90 km; reference ≈ 10.9
    expect(d).toBeGreaterThan(10.9 * 0.99);
    expect(d).toBeLessThan(10.9 * 1.01);
  });

  // Same point → 0 km
  it('same point returns 0', () => {
    const d = distanceKm(19.076, 72.8777, 19.076, 72.8777);
    expect(d).toBeCloseTo(0, 5);
  });

  // Symmetry
  it('is symmetric (A→B = B→A)', () => {
    const ab = distanceKm(19.076, 72.877, 28.613, 77.209);
    const ba = distanceKm(28.613, 77.209, 19.076, 72.877);
    expect(Math.abs(ab - ba)).toBeLessThan(0.001);
  });
});

// ─── dispatch.service.assignNearest unit tests (requirement 6) ───────────────
//
// We mock the models and resource.service so no DB is needed.
jest.mock('../src/models', () => {
  const mockTransaction = {
    commit:      jest.fn().mockResolvedValue(undefined),
    rollback:    jest.fn().mockResolvedValue(undefined),
    afterCommit: jest.fn(),
  };

  return {
    Station:               { findAll: jest.fn() },
    IncidentVehicle:       { create: jest.fn().mockResolvedValue({}) },
    Vehicle:               {},
    IncidentStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    sequelize:             { transaction: jest.fn().mockResolvedValue(mockTransaction) },
  };
});

jest.mock('../src/services/resource.service', () => ({
  getAvailableVehicle: jest.fn(),
}));

const { Station, IncidentStatusHistory, IncidentVehicle } = require('../src/models');
const resourceService = require('../src/services/resource.service');
const dispatchService = require('../src/services/dispatch.service');

// Helpers
const makeTx = () => ({
  commit:      jest.fn().mockResolvedValue(undefined),
  rollback:    jest.fn().mockResolvedValue(undefined),
  afterCommit: jest.fn(),
});

const makeIncident = (overrides = {}) => ({
  id:        1,
  latitude:  19.1136,   // Andheri-ish
  longitude: 72.8697,
  status:    'reported',
  stationId: null,
  updatedAt: null,
  save:      jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// Stations: Andheri is closer, Dadar is farther
const STATION_ANDHERI = {
  id:        1,
  name:      'Andheri Station',
  latitude:  19.1197,   // ~0.7 km from incident
  longitude: 72.8468,
};

const STATION_DADAR = {
  id:        2,
  name:      'Dadar Station',
  latitude:  19.0178,   // ~11 km from incident
  longitude: 72.8478,
};

beforeEach(() => {
  // Use mockReset to fully flush once-queues AND return values for key mocks
  Station.findAll.mockReset();
  resourceService.getAvailableVehicle.mockReset();
  IncidentStatusHistory.create.mockReset().mockResolvedValue({});
  IncidentVehicle.create.mockReset().mockResolvedValue({});
});

describe('assignNearest', () => {
  it('test 1: selects the nearest station when both have vehicles', async () => {
    // Service sorts by distance; ANDHERI is closer to our incident coords (19.1136, 72.8697)
    Station.findAll.mockResolvedValue([STATION_DADAR, STATION_ANDHERI]); // intentionally wrong order

    // After sort, Andheri will be asked first (nearest), Dadar second
    resourceService.getAvailableVehicle
      .mockResolvedValueOnce({ id: 10, status: 'available', save: jest.fn() })  // call 1 → Andheri wins
      .mockResolvedValueOnce({ id: 20, status: 'available', save: jest.fn() }); // call 2 → Dadar (not reached)

    const incident = makeIncident();
    const tx       = makeTx();
    const result   = await dispatchService.assignNearest(incident, { transaction: tx });

    expect(result.station.id).toBe(STATION_ANDHERI.id);
    expect(result.vehicle.id).toBe(10);
    expect(incident.stationId).toBe(STATION_ANDHERI.id);
    expect(incident.status).toBe('assigned');
  });

  it('test 2: skips a nearer station with no available vehicle and picks the farther one', async () => {
    // Both stations present; Andheri is nearest so it is tried first
    Station.findAll.mockResolvedValue([STATION_ANDHERI, STATION_DADAR]);

    // Call 1 → Andheri (nearest): no vehicle available
    // Call 2 → Dadar: vehicle available
    resourceService.getAvailableVehicle
      .mockResolvedValueOnce(null)                                                 // Andheri: no vehicle
      .mockResolvedValueOnce({ id: 20, status: 'available', save: jest.fn() }); // Dadar: has one

    const incident = makeIncident();
    const tx       = makeTx();
    const result   = await dispatchService.assignNearest(incident, { transaction: tx });

    expect(result.station.id).toBe(STATION_DADAR.id);
    expect(result.vehicle.id).toBe(20);
    expect(incident.status).toBe('assigned');
    // getAvailableVehicle was called twice: first for Andheri, then for Dadar
    expect(resourceService.getAvailableVehicle).toHaveBeenCalledTimes(2);
  });

  it('test 3: all stations without vehicles → status unassigned, returns nulls', async () => {
    Station.findAll.mockResolvedValue([STATION_ANDHERI, STATION_DADAR]);
    // Both calls return null
    resourceService.getAvailableVehicle.mockResolvedValue(null);

    const incident = makeIncident();
    const tx       = makeTx();
    const result   = await dispatchService.assignNearest(incident, { transaction: tx });

    expect(result.station).toBeNull();
    expect(result.vehicle).toBeNull();
    expect(incident.status).toBe('unassigned');

    // History row written for 'unassigned'
    expect(IncidentStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unassigned', changedBy: null }),
      expect.anything()
    );
  });

  it('test 4: vehicle is marked dispatched after assignment', async () => {
    const mockVehicle = { id: 10, status: 'available', save: jest.fn() };
    Station.findAll.mockResolvedValue([STATION_ANDHERI]);
    resourceService.getAvailableVehicle.mockResolvedValue(mockVehicle);

    const incident = makeIncident();
    const tx       = makeTx();
    await dispatchService.assignNearest(incident, { transaction: tx });

    expect(mockVehicle.status).toBe('dispatched');
    expect(mockVehicle.save).toHaveBeenCalledWith({ transaction: tx });
  });

  it('test 5: failure after vehicle update rolls back (error propagates)', async () => {
    const mockVehicle = { id: 10, status: 'available', save: jest.fn() };
    Station.findAll.mockResolvedValue([STATION_ANDHERI]);
    resourceService.getAvailableVehicle.mockResolvedValue(mockVehicle);

    // Simulate error thrown after vehicle is updated (IncidentVehicle.create fails)
    IncidentVehicle.create.mockRejectedValueOnce(new Error('DB write failed after vehicle update'));

    const incident = makeIncident();
    const tx       = makeTx();

    await expect(
      dispatchService.assignNearest(incident, { transaction: tx })
    ).rejects.toThrow('DB write failed after vehicle update');
  });

  it('test 6: no stations → status unassigned, returns nulls', async () => {
    Station.findAll.mockResolvedValue([]);

    const incident = makeIncident();
    const tx       = makeTx();
    const result   = await dispatchService.assignNearest(incident, { transaction: tx });

    expect(result).toEqual({ station: null, vehicle: null });
    expect(incident.status).toBe('unassigned');
  });
});
