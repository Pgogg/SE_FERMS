// client/src/mocks/handlers/track2.handlers.js — MSW handlers for Track 2 endpoints (Vedant)
// Covers:
//   - GET /api/stations, POST /api/stations, PATCH /api/stations/:id
//   - GET /api/stations/:id/vehicles, POST /api/vehicles, PATCH /api/vehicles/:id, DELETE /api/vehicles/:id
//   - GET /api/stations/:id/personnel, PATCH /api/personnel/:userId/station, PATCH /api/personnel/:userId/duty

import { http, HttpResponse } from 'msw';
import { stations, users, incidents, serializeUser, serializeIncident } from '../data/track1.data.js';
import { vehicles, getNextVehicleId, getNextStationId } from '../data/track2.data.js';

// Ensure demo dataset includes unassigned and closed incidents for full 6-tile stats telemetry
if (Array.isArray(incidents)) {
  if (!incidents.some((i) => i.status === 'unassigned')) {
    incidents.push({
      id: 105,
      reporterId: 1,
      latitude: 19.1200,
      longitude: 72.8500,
      address: 'Plot 14, MIDC Industrial Area',
      description: 'Chemical vapor leak and electrical short-circuit hazard near warehouse.',
      severity: 'critical',
      status: 'unassigned',
      stationId: null,
      station: null,
      closingSummary: null,
      createdAt: '2026-10-13T12:00:00.000Z',
      updatedAt: '2026-10-13T12:00:00.000Z',
    });
  }
  if (!incidents.some((i) => i.status === 'closed')) {
    incidents.push({
      id: 106,
      reporterId: 1,
      latitude: 19.0700,
      longitude: 72.8800,
      address: 'Near Old Toll Plaza, Highway 4',
      description: 'Dry grass blaze by highway embankment.',
      severity: 'low',
      status: 'closed',
      stationId: 1,
      station: { id: 1, name: 'Downtown Fire Station 1' },
      closingSummary: 'Fire extinguished and site inspected.',
      createdAt: '2026-10-12T10:00:00.000Z',
      updatedAt: '2026-10-12T16:00:00.000Z',
    });
  }
}


/**
 * Helper to identify the authenticated user from the Authorization header.
 */
function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const match = token.match(/fake-jwt-token-(\d+)/);
  if (match) {
    const id = Number(match[1]);
    return users.find((u) => u.id === id) || null;
  }

  const byId = users.find((u) => String(u.id) === token);
  if (byId) return byId;

  const byEmail = users.find((u) => u.email.toLowerCase() === token.toLowerCase());
  if (byEmail) return byEmail;

  return null;
}

/**
 * Per-incident in-memory stores so PATCH status and POST notes persist
 * across requests within the same MSW session.
 * Map<incidentId: number, Array>
 */
const incidentStatusHistory = new Map();
const incidentNotes = new Map();

export const track2Handlers = [
  // ==========================================
  // Stations Endpoints (§5.3)
  // ==========================================

  // GET /api/stations
  http.get('*/api/stations', ({ request }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const data = stations.map((st) => {
      const availableVehicles = vehicles.filter(
        (v) => v.stationId === st.id && v.status === 'available'
      ).length;

      const onDutyPersonnel = users.filter(
        (u) =>
          u.stationId === st.id &&
          u.onDuty === true &&
          ['firefighter', 'station_officer'].includes(u.role)
      ).length;

      return {
        ...st,
        availableVehicles,
        onDutyPersonnel,
      };
    });

    return HttpResponse.json({
      data,
      meta: { count: data.length },
    });
  }),

  // POST /api/stations
  http.post('*/api/stations', async ({ request }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    if (caller.role !== 'admin') {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only administrators may create fire stations' } },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { name, address, latitude, longitude, contact } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Station name is required.' } },
        { status: 400 }
      );
    }
    if (!address || typeof address !== 'string' || !address.trim()) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Station address is required.' } },
        { status: 400 }
      );
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Latitude must be a valid number between -90 and 90.' } },
        { status: 400 }
      );
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Longitude must be a valid number between -180 and 180.' } },
        { status: 400 }
      );
    }

    const newStation = {
      id: getNextStationId(),
      name: name.trim(),
      address: address.trim(),
      latitude: lat,
      longitude: lng,
      contact: contact ? String(contact).trim() : null,
      createdAt: new Date().toISOString(),
    };

    stations.push(newStation);

    return HttpResponse.json(
      { data: { ...newStation, availableVehicles: 0, onDutyPersonnel: 0 } },
      { status: 201 }
    );
  }),

  // PATCH /api/stations/:id
  http.patch('*/api/stations/:id', async ({ request, params }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    if (caller.role !== 'admin') {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only administrators may update fire stations' } },
        { status: 403 }
      );
    }

    const stationId = Number(params.id);
    const station = stations.find((s) => s.id === stationId);
    if (!station) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: `Station ${stationId} not found.` } },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { name, address, latitude, longitude, contact } = body;

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Station name cannot be empty.' } },
          { status: 400 }
        );
      }
      station.name = name.trim();
    }

    if (address !== undefined) {
      if (!address || typeof address !== 'string' || !address.trim()) {
        return HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Station address cannot be empty.' } },
          { status: 400 }
        );
      }
      station.address = address.trim();
    }

    if (latitude !== undefined) {
      const lat = Number(latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Latitude must be between -90 and 90.' } },
          { status: 400 }
        );
      }
      station.latitude = lat;
    }

    if (longitude !== undefined) {
      const lng = Number(longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Longitude must be between -180 and 180.' } },
          { status: 400 }
        );
      }
      station.longitude = lng;
    }

    if (contact !== undefined) {
      station.contact = contact ? String(contact).trim() : null;
    }

    const availableVehicles = vehicles.filter(
      (v) => v.stationId === station.id && v.status === 'available'
    ).length;

    const onDutyPersonnel = users.filter(
      (u) =>
        u.stationId === station.id &&
        u.onDuty === true &&
        ['firefighter', 'station_officer'].includes(u.role)
    ).length;

    return HttpResponse.json({
      data: {
        ...station,
        availableVehicles,
        onDutyPersonnel,
      },
    });
  }),

  // ==========================================
  // Vehicles Endpoints (§5.3)
  // ==========================================

  // GET /api/stations/:id/vehicles
  http.get('*/api/stations/:id/vehicles', ({ request, params }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const stationId = Number(params.id);
    if (caller.role === 'station_officer' && caller.stationId !== stationId) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Station officers can only view vehicles at their assigned station.' } },
        { status: 403 }
      );
    }

    const stationVehicles = vehicles.filter((v) => v.stationId === stationId);
    return HttpResponse.json({
      data: stationVehicles,
      meta: { count: stationVehicles.length },
    });
  }),

  // POST /api/vehicles
  http.post('*/api/vehicles', async ({ request }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (!['admin', 'station_officer'].includes(caller.role)) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Permission denied.' } },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { stationId, type, registrationNo, status = 'available' } = body;

    if (!stationId || !type || !registrationNo) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'stationId, type, and registrationNo are required.' } },
        { status: 400 }
      );
    }

    const targetStationId = Number(stationId);
    if (caller.role === 'station_officer' && caller.stationId !== targetStationId) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot add vehicles to another fire station.' } },
        { status: 403 }
      );
    }

    // Check duplicate registration number
    const regClean = String(registrationNo).trim();
    const duplicate = vehicles.some(
      (v) => v.registrationNo.toLowerCase() === regClean.toLowerCase()
    );

    if (duplicate) {
      return HttpResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: `Vehicle with registration number '${regClean}' already exists.`,
          },
        },
        { status: 409 }
      );
    }

    const newVehicle = {
      id: getNextVehicleId(),
      stationId: targetStationId,
      type: String(type).trim(),
      registrationNo: regClean,
      status: ['available', 'maintenance'].includes(status) ? status : 'available',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vehicles.push(newVehicle);

    return HttpResponse.json({ data: newVehicle }, { status: 201 });
  }),

  // PATCH /api/vehicles/:id
  http.patch('*/api/vehicles/:id', async ({ request, params }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (!['admin', 'station_officer'].includes(caller.role)) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Permission denied.' } },
        { status: 403 }
      );
    }

    const vehicleId = Number(params.id);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: `Vehicle ${vehicleId} not found.` } },
        { status: 404 }
      );
    }

    if (caller.role === 'station_officer' && caller.stationId !== vehicle.stationId) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot edit vehicles assigned to another station.' } },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { status, type } = body;

    if (status !== undefined) {
      if (!['available', 'maintenance'].includes(status)) {
        return HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: "Manual status updates only allow 'available' or 'maintenance'." } },
          { status: 400 }
        );
      }
      vehicle.status = status;
    }

    if (type !== undefined && typeof type === 'string' && type.trim()) {
      vehicle.type = type.trim();
    }

    vehicle.updatedAt = new Date().toISOString();
    return HttpResponse.json({ data: vehicle });
  }),

  // DELETE /api/vehicles/:id
  http.delete('*/api/vehicles/:id', ({ request, params }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (!['admin', 'station_officer'].includes(caller.role)) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Permission denied.' } },
        { status: 403 }
      );
    }

    const vehicleId = Number(params.id);
    const vehicleIndex = vehicles.findIndex((v) => v.id === vehicleId);
    if (vehicleIndex === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: `Vehicle ${vehicleId} not found.` } },
        { status: 404 }
      );
    }

    const vehicle = vehicles[vehicleIndex];
    if (caller.role === 'station_officer' && caller.stationId !== vehicle.stationId) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot delete vehicles assigned to another station.' } },
        { status: 403 }
      );
    }

    // If currently dispatched / active on an incident
    if (vehicle.status === 'dispatched') {
      return HttpResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Vehicle is currently assigned to an active incident and cannot be removed.',
          },
        },
        { status: 409 }
      );
    }

    vehicles.splice(vehicleIndex, 1);
    return HttpResponse.json({ data: { message: 'Vehicle removed successfully' } });
  }),

  // ==========================================
  // Personnel Endpoints (§5.3)
  // ==========================================

  // GET /api/stations/:id/personnel
  http.get('*/api/stations/:id/personnel', ({ request, params }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const stationId = Number(params.id);
    if (caller.role === 'station_officer' && caller.stationId !== stationId) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot view personnel at another station.' } },
        { status: 403 }
      );
    }

    const stationPersonnel = users
      .filter(
        (u) =>
          u.stationId === stationId &&
          ['firefighter', 'station_officer'].includes(u.role) &&
          u.accountStatus !== 'inactive'
      )
      .map(serializeUser);

    return HttpResponse.json({
      data: stationPersonnel,
      meta: { count: stationPersonnel.length },
    });
  }),

  // PATCH /api/personnel/:userId/station
  http.patch('*/api/personnel/:userId/station', async ({ request, params }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (!['admin', 'station_officer'].includes(caller.role)) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Permission denied.' } },
        { status: 403 }
      );
    }

    const targetUserId = Number(params.userId);
    const user = users.find((u) => u.id === targetUserId);
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: `User ${targetUserId} not found.` } },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { stationId } = body;
    if (stationId === undefined) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'stationId is required.' } },
        { status: 400 }
      );
    }

    const nextStationId = stationId === null ? null : Number(stationId);

    // If caller is station officer, they can only assign to their own station
    if (caller.role === 'station_officer' && nextStationId !== null && caller.stationId !== nextStationId) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot assign personnel to a different station.' } },
        { status: 403 }
      );
    }

    user.stationId = nextStationId;
    return HttpResponse.json({ data: serializeUser(user) });
  }),

  // GET /api/users
  http.get('*/api/users', ({ request }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    if (!['admin', 'station_officer'].includes(caller.role)) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Permission denied.' } },
        { status: 403 }
      );
    }

    const data = users.map(serializeUser);
    return HttpResponse.json({
      data,
      meta: { count: data.length },
    });
  }),

  // PATCH /api/personnel/:userId/duty
  http.patch('*/api/personnel/:userId/duty', async ({ request, params }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (!['admin', 'station_officer'].includes(caller.role)) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Permission denied.' } },
        { status: 403 }
      );
    }

    const targetUserId = Number(params.userId);
    const user = users.find((u) => u.id === targetUserId);
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: `User ${targetUserId} not found.` } },
        { status: 404 }
      );
    }

    if (caller.role === 'station_officer' && caller.stationId !== user.stationId) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot modify duty status for staff at another station.' } },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { onDuty } = body;
    if (onDuty === undefined || typeof onDuty !== 'boolean') {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'onDuty boolean is required.' } },
        { status: 400 }
      );
    }

    user.onDuty = onDuty;
    return HttpResponse.json({ data: serializeUser(user) });
  }),

  // ==========================================
  // Incident Read Endpoints (§5.2 — Vedant)
  // ==========================================

  // GET /api/incidents/stats (dispatch_operator, station_officer, admin)
  // Must be declared BEFORE /:id
  http.get('*/api/incidents/stats', ({ request }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    if (!['dispatch_operator', 'station_officer', 'admin'].includes(caller.role)) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Permission denied.' } },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const stationIdParam = url.searchParams.get('stationId');

    let stationId = null;
    if (caller.role === 'station_officer') {
      stationId = caller.stationId;
    } else if (stationIdParam) {
      stationId = Number(stationIdParam);
    }

    const stats = {
      reported: 0,
      unassigned: 0,
      assigned: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };

    for (const inc of incidents) {
      if (stationId != null && inc.stationId !== stationId) {
        continue;
      }
      if (stats[inc.status] !== undefined) {
        stats[inc.status]++;
      }
    }

    return HttpResponse.json({ data: stats });
  }),

  // GET /api/incidents/assigned (firefighter, station_officer)
  // Must be declared BEFORE /:id
  http.get('*/api/incidents/assigned', ({ request }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    if (!['firefighter', 'station_officer'].includes(caller.role)) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Permission denied.' } },
        { status: 403 }
      );
    }

    const stationId = caller.stationId;
    const allowedStatuses = ['assigned', 'in_progress', 'resolved'];
    const filtered = incidents
      .filter((i) => i.stationId === stationId && allowedStatuses.includes(i.status))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return HttpResponse.json({
      data: filtered.map(serializeIncident),
      meta: { count: filtered.length },
    });
  }),

  // GET /api/incidents (dispatch_operator, station_officer, admin)
  http.get('*/api/incidents', ({ request }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    if (!['dispatch_operator', 'station_officer', 'admin'].includes(caller.role)) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Permission denied.' } },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status');
    const stationIdParam = url.searchParams.get('stationId');
    const includeClosed = url.searchParams.get('includeClosed') === 'true';

    const validStatuses = ['reported', 'unassigned', 'assigned', 'in_progress', 'resolved', 'closed'];
    if (statusParam && !validStatuses.includes(statusParam)) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `Status must be one of: ${validStatuses.join(', ')}.` } },
        { status: 400 }
      );
    }

    let targetStationId = null;
    if (caller.role === 'station_officer') {
      targetStationId = caller.stationId;
    } else if (stationIdParam) {
      targetStationId = Number(stationIdParam);
    }

    let filtered = incidents.filter((inc) => {
      // Station filter
      if (targetStationId != null && inc.stationId !== targetStationId) {
        return false;
      }
      // Status filter
      if (statusParam) {
        if (inc.status !== statusParam) return false;
        if (statusParam === 'closed' && !includeClosed) return false;
      } else if (!includeClosed && inc.status === 'closed') {
        return false;
      }
      return true;
    });

    // Newest first, limit 200
    filtered = filtered
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 200);

    return HttpResponse.json({
      data: filtered.map(serializeIncident),
      meta: { count: filtered.length },
    });
  }),

  // GET /api/incidents/:id (detail read) — enriched with statusHistory and notes
  http.get('*/api/incidents/:id', ({ request, params }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const id = Number(params.id);
    const incident = incidents.find((i) => i.id === id);
    if (!incident) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Incident not found.' } },
        { status: 404 }
      );
    }

    // Authorization check per §9.3
    let allowed = false;
    if (['admin', 'dispatch_operator'].includes(caller.role)) {
      allowed = true;
    } else if (caller.role === 'citizen') {
      allowed = incident.reporterId === caller.id;
    } else if (['firefighter', 'station_officer'].includes(caller.role)) {
      allowed = Boolean(incident.stationId && caller.stationId && incident.stationId === caller.stationId);
    }

    if (!allowed) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You do not have permission to view this incident.' } },
        { status: 403 }
      );
    }

    // Build rich status history from per-incident store
    const history = incidentStatusHistory.get(id) || [
      {
        id: id * 100 + 1,
        incidentId: id,
        status: incident.status === 'assigned' || incident.status === 'in_progress' || incident.status === 'resolved' || incident.status === 'closed'
          ? 'assigned'
          : incident.status,
        changedAt: incident.createdAt,
        changedBy: null,
        changedByName: 'System',
      },
    ];

    // Add in_progress row if already in_progress or further
    if (['in_progress', 'resolved', 'closed'].includes(incident.status) &&
        !history.some((h) => h.status === 'in_progress')) {
      history.push({
        id: id * 100 + 2,
        incidentId: id,
        status: 'in_progress',
        changedAt: incident.updatedAt,
        changedBy: caller.id,
        changedByName: caller.name,
      });
    }

    const notes = incidentNotes.get(id) || [];

    // Build assigned vehicles list from vehicles data
    const assignedVehicles = vehicles
      .filter((v) => v.stationId === incident.stationId && v.status === 'dispatched')
      .slice(0, 1)
      .map((v) => ({
        vehicleId: v.id,
        type: v.type,
        registrationNo: v.registrationNo,
        assignedAt: incident.updatedAt,
        releasedAt: null,
      }));

    return HttpResponse.json({
      data: {
        ...serializeIncident(incident),
        station: incident.station || (incident.stationId ? stations.find((s) => s.id === incident.stationId) || { id: incident.stationId, name: `Station ${incident.stationId}` } : null),
        statusHistory: history,
        notes,
        vehicles: assignedVehicles,
      },
    });
  }),

  // PATCH /api/incidents/:id/status — assigned → in_progress only
  http.patch('*/api/incidents/:id/status', async ({ request, params }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    if (!['firefighter', 'station_officer'].includes(caller.role)) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only station staff may update incident status.' } },
        { status: 403 }
      );
    }

    const id = Number(params.id);
    const incident = incidents.find((i) => i.id === id);
    if (!incident) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Incident not found.' } },
        { status: 404 }
      );
    }

    // Station scope check
    if (incident.stationId !== caller.stationId) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'This incident is not assigned to your station.' } },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { status: toStatus } = body;

    if (!toStatus) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'status is required.' } },
        { status: 400 }
      );
    }

    // Validate transition (mirrors server domain/incident.transitions.js)
    const ALLOWED = {
      reported: ['assigned', 'unassigned'],
      unassigned: ['assigned'],
      assigned: ['in_progress', 'assigned'],
      in_progress: ['resolved'],
      resolved: ['closed'],
      closed: [],
    };

    const allowedForCurrent = ALLOWED[incident.status] || [];
    if (!allowedForCurrent.includes(toStatus)) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot move from ${incident.status} to ${toStatus}.`,
            allowedNext: allowedForCurrent,
          },
        },
        { status: 400 }
      );
    }

    // Apply the transition
    const now = new Date().toISOString();
    incident.status = toStatus;
    incident.updatedAt = now;

    // Append to status history store
    const history = incidentStatusHistory.get(id) || [
      {
        id: id * 100 + 1,
        incidentId: id,
        status: 'assigned',
        changedAt: incident.createdAt,
        changedBy: null,
        changedByName: 'System',
      },
    ];
    history.push({
      id: Date.now(),
      incidentId: id,
      status: toStatus,
      changedAt: now,
      changedBy: caller.id,
      changedByName: caller.name,
    });
    incidentStatusHistory.set(id, history);

    return HttpResponse.json({ data: serializeIncident(incident) });
  }),

  // POST /api/incidents/:id/notes — add a field note
  http.post('*/api/incidents/:id/notes', async ({ request, params }) => {
    const caller = getUserFromRequest(request);
    if (!caller) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    if (!['firefighter', 'station_officer'].includes(caller.role)) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only station staff may add notes.' } },
        { status: 403 }
      );
    }

    const id = Number(params.id);
    const incident = incidents.find((i) => i.id === id);
    if (!incident) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Incident not found.' } },
        { status: 404 }
      );
    }

    if (incident.stationId !== caller.stationId) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'This incident is not assigned to your station.' } },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { note } = body;

    if (!note || typeof note !== 'string' || !note.trim()) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'note is required.' } },
        { status: 400 }
      );
    }
    if (note.trim().length > 2000) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'note must be at most 2000 characters.' } },
        { status: 400 }
      );
    }

    const newNote = {
      id: Date.now(),
      incidentId: id,
      authorId: caller.id,
      authorName: caller.name,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };

    const notes = incidentNotes.get(id) || [];
    notes.push(newNote);
    incidentNotes.set(id, notes);

    return HttpResponse.json({ data: newNote }, { status: 201 });
  }),
];

export const handlers = track2Handlers;
export default track2Handlers;

