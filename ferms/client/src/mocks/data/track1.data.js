// client/src/mocks/data/track1.data.js — Seed mock data and in-memory store for Track 1 (Parth)
// Covers demo users, incidents, notifications, and reference stations.

export const DEMO_PASSWORD = 'Passw0rd!';

export const initialUsers = [
  {
    id: 1,
    name: 'Demo Citizen',
    email: 'citizen@ferms.test',
    password: DEMO_PASSWORD,
    phone: '555-0101',
    role: 'citizen',
    stationId: null,
    onDuty: false,
    accountStatus: 'active',
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 2,
    name: 'Demo Dispatch Operator',
    email: 'operator@ferms.test',
    password: DEMO_PASSWORD,
    phone: '555-0102',
    role: 'dispatch_operator',
    stationId: null,
    onDuty: true,
    accountStatus: 'active',
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 3,
    name: 'Demo Firefighter',
    email: 'firefighter@ferms.test',
    password: DEMO_PASSWORD,
    phone: '555-0103',
    role: 'firefighter',
    stationId: 1,
    onDuty: true,
    accountStatus: 'active',
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 4,
    name: 'Demo Station Officer',
    email: 'officer@ferms.test',
    password: DEMO_PASSWORD,
    phone: '555-0104',
    role: 'station_officer',
    stationId: 1,
    onDuty: true,
    accountStatus: 'active',
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 5,
    name: 'Demo System Admin',
    email: 'admin@ferms.test',
    password: DEMO_PASSWORD,
    phone: '555-0105',
    role: 'admin',
    stationId: null,
    onDuty: false,
    accountStatus: 'active',
    createdAt: '2026-10-01T08:00:00.000Z',
  },
];

export const stations = [
  {
    id: 1,
    name: 'Downtown Fire Station 1',
    address: '100 Main Street, Downtown',
    latitude: 19.076,
    longitude: 72.8777,
    contact: '555-FIRE-01',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Metro Central Station 2',
    address: '250 Park Avenue, Midtown',
    latitude: 19.1136,
    longitude: 72.8697,
    contact: '555-FIRE-02',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 3,
    name: 'Westside Fire Station 3',
    address: '400 Ocean Boulevard, Westside',
    latitude: 19.1663,
    longitude: 72.8526,
    contact: '555-FIRE-03',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];

export const initialIncidents = [
  {
    id: 101,
    reporterId: 1,
    latitude: 19.0792,
    longitude: 72.8791,
    address: '45 Commercial Complex, Downtown',
    description: 'Electrical fire detected on 2nd floor server room with heavy smoke.',
    severity: 'high',
    status: 'assigned',
    stationId: 1,
    station: { id: 1, name: 'Downtown Fire Station 1' },
    closingSummary: null,
    createdAt: '2026-10-13T10:15:00.000Z',
    updatedAt: '2026-10-13T10:16:30.000Z',
  },
  {
    id: 102,
    reporterId: 1,
    latitude: 19.0825,
    longitude: 72.885,
    address: '12 Market Street, East Wing',
    description: 'Kitchen fire spreading to adjacent storage unit in restaurant.',
    severity: 'medium',
    status: 'in_progress',
    stationId: 1,
    station: { id: 1, name: 'Downtown Fire Station 1' },
    closingSummary: null,
    createdAt: '2026-10-13T09:00:00.000Z',
    updatedAt: '2026-10-13T09:15:00.000Z',
  },
  {
    id: 103,
    reporterId: 1,
    latitude: 19.095,
    longitude: 72.89,
    address: 'Building 4, Sector 7 Industrial Zone',
    description: 'Dense smoke and flame visible from waste storage dump.',
    severity: 'critical',
    status: 'reported',
    stationId: null,
    station: null,
    closingSummary: null,
    createdAt: '2026-10-13T11:45:00.000Z',
    updatedAt: '2026-10-13T11:45:00.000Z',
  },
  {
    id: 104,
    reporterId: 1,
    latitude: 19.072,
    longitude: 72.871,
    address: '88 Harbour View Apartments',
    description: 'Trash container fire in basement parking area.',
    severity: 'low',
    status: 'resolved',
    stationId: 1,
    station: { id: 1, name: 'Downtown Fire Station 1' },
    closingSummary: 'Extinguished by station crew. Area ventilated and declared safe.',
    createdAt: '2026-10-12T14:30:00.000Z',
    updatedAt: '2026-10-12T15:20:00.000Z',
  },
];

export const initialNotifications = [
  {
    id: 201,
    recipientId: 1,
    incidentId: 101,
    type: 'dispatch',
    message: 'Fire engine and rescue squad dispatched from Downtown Fire Station 1 for incident at 45 Commercial Complex.',
    readStatus: false,
    createdAt: '2026-10-13T10:16:30.000Z',
  },
  {
    id: 202,
    recipientId: 1,
    incidentId: 102,
    type: 'status_update',
    message: 'Incident at 12 Market Street has progressed to IN_PROGRESS. First responders are on site.',
    readStatus: false,
    createdAt: '2026-10-13T09:15:00.000Z',
  },
  {
    id: 203,
    recipientId: 1,
    incidentId: 104,
    type: 'status_update',
    message: 'Incident at 88 Harbour View Apartments has been RESOLVED.',
    readStatus: true,
    createdAt: '2026-10-12T15:20:00.000Z',
  },
  {
    id: 204,
    recipientId: 1,
    incidentId: null,
    type: 'system',
    message: 'Welcome to FERMS emergency response management portal. Emergency services are active 24/7.',
    readStatus: true,
    createdAt: '2026-10-01T08:05:00.000Z',
  },
];

// In-memory mutable state collections
export let users = initialUsers.map((u) => ({ ...u }));
export let incidents = initialIncidents.map((i) => ({ ...i }));
export let notifications = initialNotifications.map((n) => ({ ...n }));

let nextUserId = 10;
let nextIncidentId = 200;
let nextNotificationId = 300;

export function getNextUserId() {
  return nextUserId++;
}

export function getNextIncidentId() {
  return nextIncidentId++;
}

export function getNextNotificationId() {
  return nextNotificationId++;
}

export function resetMockData() {
  users = initialUsers.map((u) => ({ ...u }));
  incidents = initialIncidents.map((i) => ({ ...i }));
  notifications = initialNotifications.map((n) => ({ ...n }));
}

/**
 * Strips password information and returns standard API user payload
 */
export function serializeUser(user) {
  if (!user) return null;
  const { password, passwordHash, password_hash, ...rest } = user;
  return {
    id: rest.id,
    name: rest.name,
    email: rest.email,
    phone: rest.phone ?? null,
    role: rest.role,
    stationId: rest.stationId ?? null,
    onDuty: Boolean(rest.onDuty),
    accountStatus: rest.accountStatus ?? 'active',
    createdAt: rest.createdAt,
  };
}

/**
 * Formats incident object matching API wire shape
 */
export function serializeIncident(incident) {
  if (!incident) return null;
  return {
    id: incident.id,
    reporterId: incident.reporterId,
    latitude: incident.latitude,
    longitude: incident.longitude,
    address: incident.address ?? null,
    description: incident.description,
    severity: incident.severity,
    status: incident.status,
    stationId: incident.stationId ?? null,
    station: incident.station
      ? { id: incident.station.id, name: incident.station.name }
      : incident.stationId
      ? { id: incident.stationId, name: `Station ${incident.stationId}` }
      : null,
    closingSummary: incident.closingSummary ?? null,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
  };
}
