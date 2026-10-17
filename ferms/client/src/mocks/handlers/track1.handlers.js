// client/src/mocks/handlers/track1.handlers.js — MSW handlers for Track 1 endpoints (Parth)
// Covers:
//   - POST /api/auth/register, /login, /logout, GET /api/auth/me
//   - GET /api/users, POST /api/users, PATCH /api/users/:id, /api/users/:id/role, /api/users/:id/deactivate
//   - POST /api/incidents, GET /api/incidents/mine, PATCH /api/incidents/:id/assign
//   - GET /api/notifications, PATCH /api/notifications/:id/read, PATCH /api/notifications/read-all

import { http, HttpResponse } from 'msw';
import {
  DEMO_PASSWORD,
  users,
  stations,
  incidents,
  notifications,
  getNextUserId,
  getNextIncidentId,
  getNextNotificationId,
  serializeUser,
  serializeIncident,
} from '../data/track1.data.js';

/**
 * Helper to identify the authenticated user from the Authorization header.
 * Recognises 'Bearer fake-jwt-token-<id>', direct IDs, or user emails.
 */
function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const devRole = request.headers.get('x-dev-role');

  if (!authHeader) {
    if (devRole) return users.find((u) => u.role === devRole) || null;
    return null;
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    if (devRole) return users.find((u) => u.role === devRole) || null;
    return null;
  }

  const match = token.match(/fake-jwt-token-(\d+)/);
  if (match) {
    const id = Number(match[1]);
    return users.find((u) => u.id === id) || null;
  }

  const byId = users.find((u) => String(u.id) === token);
  if (byId) return byId;

  const byEmail = users.find((u) => u.email.toLowerCase() === token.toLowerCase());
  if (byEmail) return byEmail;

  if (devRole) {
    return users.find((u) => u.role === devRole) || null;
  }

  return null;
}

export const track1Handlers = [
  // ==========================================
  // Auth Endpoints (Feature 4.1)
  // ==========================================

  // POST /api/auth/register (Citizen self-registration)
  http.post('*/api/auth/register', async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const { name, email, password, phone } = body;

    if (!name || !email || !password) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name, email, and password are required.',
          },
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be at least 8 characters.',
          },
        },
        { status: 400 }
      );
    }

    const existing = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      return HttpResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Email is already registered.',
          },
        },
        { status: 409 }
      );
    }

    const newUser = {
      id: getNextUserId(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone || null,
      role: 'citizen',
      stationId: null,
      onDuty: false,
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);

    const token = `fake-jwt-token-${newUser.id}`;
    return HttpResponse.json(
      {
        data: {
          token,
          user: serializeUser(newUser),
        },
      },
      { status: 201 }
    );
  }),

  // POST /api/auth/login
  http.post('*/api/auth/login', async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return HttpResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          },
        },
        { status: 401 }
      );
    }

    const user = users.find(
      (u) => u.email.toLowerCase() === String(email).trim().toLowerCase()
    );

    if (!user || (user.password !== password && password !== DEMO_PASSWORD)) {
      return HttpResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          },
        },
        { status: 401 }
      );
    }

    if (user.accountStatus === 'inactive') {
      return HttpResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Account is deactivated.',
          },
        },
        { status: 401 }
      );
    }

    const token = `fake-jwt-token-${user.id}`;
    return HttpResponse.json({
      data: {
        token,
        user: serializeUser(user),
      },
    });
  }),

  // POST /api/auth/logout
  http.post('*/api/auth/logout', async () => {
    return HttpResponse.json({
      data: {
        message: 'Successfully logged out.',
      },
    });
  }),

  // GET /api/auth/me
  http.get('*/api/auth/me', async ({ request }) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return HttpResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing, expired, or invalid token.',
          },
        },
        { status: 401 }
      );
    }

    if (user.accountStatus === 'inactive') {
      return HttpResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Account is deactivated.',
          },
        },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      data: serializeUser(user),
    });
  }),

  // ==========================================
  // User Management Endpoints (Feature 4.7)
  // ==========================================

  // GET /api/users
  http.get('*/api/users', async ({ request }) => {
    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    let list = users;
    if (role) {
      list = list.filter((u) => u.role === role);
    }

    return HttpResponse.json({
      data: list.map(serializeUser),
      meta: {
        count: list.length,
      },
    });
  }),

  // POST /api/users
  http.post('*/api/users', async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const { name, email, password, role, phone, stationId, onDuty } = body;

    if (!name || !email || !password || !role) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name, email, password, and role are required.',
          },
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be at least 8 characters long.',
          },
        },
        { status: 400 }
      );
    }

    const validRoles = ['citizen', 'dispatch_operator', 'firefighter', 'station_officer', 'admin'];
    if (!validRoles.includes(role)) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Role must be one of: ${validRoles.join(', ')}.`,
          },
        },
        { status: 400 }
      );
    }

    const existing = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      return HttpResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Email is already registered.',
          },
        },
        { status: 409 }
      );
    }

    const newUser = {
      id: getNextUserId(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone || null,
      role,
      stationId: stationId ? Number(stationId) : null,
      onDuty: Boolean(onDuty),
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);

    return HttpResponse.json(
      {
        data: serializeUser(newUser),
      },
      { status: 201 }
    );
  }),

  // PATCH /api/users/:id
  http.patch('*/api/users/:id', async ({ params, request }) => {
    const userId = Number(params.id);
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'User not found.',
          },
        },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (body.name !== undefined) user.name = String(body.name).trim();
    if (body.phone !== undefined) user.phone = body.phone;
    if (body.stationId !== undefined) user.stationId = body.stationId ? Number(body.stationId) : null;
    if (body.onDuty !== undefined) user.onDuty = Boolean(body.onDuty);

    return HttpResponse.json({
      data: serializeUser(user),
    });
  }),

  // PATCH /api/users/:id/role
  http.patch('*/api/users/:id/role', async ({ params, request }) => {
    const userId = Number(params.id);
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'User not found.',
          },
        },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { role } = body;
    const validRoles = ['citizen', 'dispatch_operator', 'firefighter', 'station_officer', 'admin'];
    if (!role || !validRoles.includes(role)) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Role must be one of: ${validRoles.join(', ')}.`,
          },
        },
        { status: 400 }
      );
    }

    user.role = role;
    return HttpResponse.json({
      data: serializeUser(user),
    });
  }),

  // PATCH /api/users/:id/deactivate
  http.patch('*/api/users/:id/deactivate', async ({ params, request }) => {
    const userId = Number(params.id);
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'User not found.',
          },
        },
        { status: 404 }
      );
    }

    const caller = getUserFromRequest(request);
    if (caller && caller.id === userId) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot deactivate your own account.',
          },
        },
        { status: 400 }
      );
    }

    user.accountStatus = 'inactive';
    return HttpResponse.json({
      data: serializeUser(user),
    });
  }),

  // ==========================================
  // Incident Endpoints (Feature 4.2 / 4.4)
  // ==========================================

  // POST /api/incidents (Report incident)
  http.post('*/api/incidents', async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const { latitude, longitude, address, description, severity } = body;

    if (latitude == null || longitude == null || !description || !severity) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Latitude, longitude, description, and severity are required.',
          },
        },
        { status: 400 }
      );
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Severity must be one of: ${validSeverities.join(', ')}.`,
          },
        },
        { status: 400 }
      );
    }

    const caller = getUserFromRequest(request) || users.find((u) => u.role === 'citizen');
    const reporterId = caller ? caller.id : 1;
    const assignedStation = stations[0] || { id: 1, name: 'Downtown Fire Station 1' };
    const now = new Date().toISOString();

    const newIncident = {
      id: getNextIncidentId(),
      reporterId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      address: address || 'Coordinates pinned by reporter',
      description: String(description).trim(),
      severity,
      status: 'assigned',
      stationId: assignedStation.id,
      station: {
        id: assignedStation.id,
        name: assignedStation.name,
      },
      closingSummary: null,
      createdAt: now,
      updatedAt: now,
    };

    incidents.unshift(newIncident);

    // Create a dispatch notification for the reporting citizen
    notifications.unshift({
      id: getNextNotificationId(),
      recipientId: reporterId,
      incidentId: newIncident.id,
      type: 'dispatch',
      message: `Emergency response dispatched from ${assignedStation.name} for Incident #${newIncident.id}.`,
      readStatus: false,
      createdAt: now,
    });

    return HttpResponse.json(
      {
        data: {
          incident: serializeIncident(newIncident),
          station: assignedStation ? { id: assignedStation.id, name: assignedStation.name } : null,
          ...serializeIncident(newIncident),
        },
      },
      { status: 201 }
    );
  }),

  // GET /api/incidents/mine (Citizen own reports)
  http.get('*/api/incidents/mine', async ({ request }) => {
    const caller = getUserFromRequest(request) || users.find((u) => u.role === 'citizen');
    const reporterId = caller ? caller.id : 1;

    const mine = incidents.filter((i) => i.reporterId === reporterId);

    return HttpResponse.json({
      data: mine.map(serializeIncident),
      meta: {
        count: mine.length,
      },
    });
  }),

  // PATCH /api/incidents/:id/assign (Dispatch override)
  http.patch('*/api/incidents/:id/assign', async ({ params, request }) => {
    const incidentId = Number(params.id);
    const incident = incidents.find((i) => i.id === incidentId);
    if (!incident) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Incident not found.',
          },
        },
        { status: 404 }
      );
    }

    if (['resolved', 'closed'].includes(incident.status)) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_TRANSITION',
            message: 'Cannot reassign a resolved or closed incident.',
            allowedNext: [],
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { stationId } = body;
    if (!stationId) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'stationId is required.',
          },
        },
        { status: 400 }
      );
    }

    const targetStation = stations.find((s) => s.id === Number(stationId)) || {
      id: Number(stationId),
      name: `Station ${stationId}`,
    };

    incident.stationId = targetStation.id;
    incident.station = { id: targetStation.id, name: targetStation.name };
    incident.status = 'assigned';
    incident.updatedAt = new Date().toISOString();

    // Create notification for the reporter
    notifications.unshift({
      id: getNextNotificationId(),
      recipientId: incident.reporterId,
      incidentId: incident.id,
      type: 'dispatch',
      message: `Incident #${incident.id} reassigned to ${targetStation.name}.`,
      readStatus: false,
      createdAt: new Date().toISOString(),
    });

    return HttpResponse.json({
      data: serializeIncident(incident),
    });
  }),

  // ==========================================
  // Notifications Endpoints (Feature 4.6)
  // ==========================================

  // GET /api/notifications
  http.get('*/api/notifications', async ({ request }) => {
    const caller = getUserFromRequest(request) || users.find((u) => u.role === 'citizen');
    const recipientId = caller ? caller.id : 1;

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';

    let userNotifs = notifications.filter((n) => n.recipientId === recipientId);

    // If caller has no notifications yet, seed role-appropriate demo notifications
    if (userNotifs.length === 0) {
      const now = new Date();
      const role = caller?.role || 'citizen';
      const roleNotifs = [];

      if (role === 'dispatch_operator' || role === 'admin') {
        roleNotifs.push(
          {
            id: getNextNotificationId(),
            recipientId,
            incidentId: 101,
            type: 'dispatch',
            message: 'New critical incident #101 reported at 45 Commercial Complex.',
            readStatus: false,
            createdAt: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
          },
          {
            id: getNextNotificationId(),
            recipientId,
            incidentId: 102,
            type: 'status_update',
            message: 'Incident #102 at 12 Market Street has progressed to IN_PROGRESS.',
            readStatus: false,
            createdAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
          },
          {
            id: getNextNotificationId(),
            recipientId,
            incidentId: 104,
            type: 'status_update',
            message: 'Incident #104 at 88 Harbour View Apartments has been resolved.',
            readStatus: true,
            createdAt: new Date(now.getTime() - 120 * 60 * 1000).toISOString(),
          }
        );
      } else if (role === 'firefighter' || role === 'station_officer') {
        roleNotifs.push(
          {
            id: getNextNotificationId(),
            recipientId,
            incidentId: 101,
            type: 'dispatch',
            message: 'Emergency dispatch: Respond to Incident #101 at 45 Commercial Complex.',
            readStatus: false,
            createdAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
          },
          {
            id: getNextNotificationId(),
            recipientId,
            incidentId: 102,
            type: 'status_update',
            message: 'Incident #102 marked in progress by Station 1 crew.',
            readStatus: true,
            createdAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
          }
        );
      }

      if (roleNotifs.length > 0) {
        notifications.unshift(...roleNotifs);
        userNotifs = notifications.filter((n) => n.recipientId === recipientId);
      }
    }

    const unreadCount = userNotifs.filter((n) => !n.readStatus).length;
    const filtered = unreadOnly ? userNotifs.filter((n) => !n.readStatus) : userNotifs;

    return HttpResponse.json({
      data: filtered,
      meta: {
        count: filtered.length,
        unreadCount,
      },
    });
  }),

  // PATCH /api/notifications/:id/read
  http.patch('*/api/notifications/:id/read', async ({ params }) => {
    const notifId = Number(params.id);
    const notif = notifications.find((n) => n.id === notifId);
    if (!notif) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Notification not found.',
          },
        },
        { status: 404 }
      );
    }

    notif.readStatus = true;
    return HttpResponse.json({
      data: notif,
    });
  }),

  // PATCH /api/notifications/read-all
  http.patch('*/api/notifications/read-all', async ({ request }) => {
    const caller = getUserFromRequest(request) || users.find((u) => u.role === 'citizen');
    const recipientId = caller ? caller.id : 1;

    notifications.forEach((n) => {
      if (n.recipientId === recipientId) {
        n.readStatus = true;
      }
    });

    return HttpResponse.json({
      data: {
        message: 'All notifications marked as read.',
      },
    });
  }),
];

export const handlers = track1Handlers;
export default track1Handlers;
