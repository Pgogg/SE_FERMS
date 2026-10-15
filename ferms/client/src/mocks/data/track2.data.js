// client/src/mocks/data/track2.data.js — Seed mock data and in-memory store for Track 2 (Vedant)
// Covers vehicles fleet and station resources data.
import { users } from './track1.data.js';

export const initialVehicles = [
  {
    id: 1,
    stationId: 1,
    type: 'pumper_truck',
    registrationNo: 'MH-01-PT-1001',
    status: 'available',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 2,
    stationId: 1,
    type: 'ladder_truck',
    registrationNo: 'MH-01-LT-1002',
    status: 'available',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 3,
    stationId: 1,
    type: 'rescue_van',
    registrationNo: 'MH-01-RV-1003',
    status: 'dispatched',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 4,
    stationId: 1,
    type: 'water_bowser',
    registrationNo: 'MH-01-WB-1004',
    status: 'maintenance',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 5,
    stationId: 2,
    type: 'pumper_truck',
    registrationNo: 'MH-02-PT-2001',
    status: 'available',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 6,
    stationId: 2,
    type: 'rescue_van',
    registrationNo: 'MH-02-RV-2002',
    status: 'available',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 7,
    stationId: 2,
    type: 'ladder_truck',
    registrationNo: 'MH-02-LT-2003',
    status: 'dispatched',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 8,
    stationId: 3,
    type: 'pumper_truck',
    registrationNo: 'MH-03-PT-3001',
    status: 'available',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 9,
    stationId: 3,
    type: 'water_bowser',
    registrationNo: 'MH-03-WB-3002',
    status: 'available',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
];

// Ensure extra personnel exist across stations for testing UC-08
if (Array.isArray(users) && !users.some((u) => u.id === 6)) {
  users.push(
    {
      id: 6,
      name: 'Sunil Patil',
      email: 'firefighter2@ferms.test',
      phone: '555-0106',
      role: 'firefighter',
      stationId: 2,
      onDuty: true,
      accountStatus: 'active',
      createdAt: '2026-10-01T08:00:00.000Z',
    },
    {
      id: 7,
      name: 'Anil Deshmukh',
      email: 'officer2@ferms.test',
      phone: '555-0107',
      role: 'station_officer',
      stationId: 2,
      onDuty: true,
      accountStatus: 'active',
      createdAt: '2026-10-01T08:00:00.000Z',
    },
    {
      id: 8,
      name: 'Kavita Joshi',
      email: 'firefighter3@ferms.test',
      phone: '555-0108',
      role: 'firefighter',
      stationId: 3,
      onDuty: false,
      accountStatus: 'active',
      createdAt: '2026-10-01T08:00:00.000Z',
    },
    {
      id: 9,
      name: 'Vikram Shinde',
      email: 'unassigned@ferms.test',
      phone: '555-0109',
      role: 'firefighter',
      stationId: null,
      onDuty: false,
      accountStatus: 'active',
      createdAt: '2026-10-01T08:00:00.000Z',
    }
  );
}

// In-memory mutable vehicle collection
export let vehicles = initialVehicles.map((v) => ({ ...v }));

let nextVehicleId = 100;
export function getNextVehicleId() {
  return nextVehicleId++;
}

let nextStationId = 10;
export function getNextStationId() {
  return nextStationId++;
}

export function resetTrack2Data() {
  vehicles = initialVehicles.map((v) => ({ ...v }));
  nextVehicleId = 100;
  nextStationId = 10;
}
