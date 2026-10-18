// tests/user.admin.test.js — Admin user endpoints and deactivation enforcement tests (TASK W5-P-BE-1)
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

// Mock notification service
jest.mock('../src/services/notification.service', () => ({
  notify:              jest.fn().mockResolvedValue(null),
  notifyStationOnDuty: jest.fn().mockResolvedValue([]),
  notifyRole:          jest.fn().mockResolvedValue(undefined),
  notifyReporter:      jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const { sequelize, User, Station } = require('../src/models');
const { ROLES } = require('../src/domain/constants');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_supersecret';

// ---------------------------------------------------------------------------
// Helpers for role-based requests
// ---------------------------------------------------------------------------

const asRole = (role, stationId = null, userId = null) => {
  const agent = request(app);
  const uid = userId !== null ? String(userId) : '0';
  return {
    get: (url) =>
      agent
        .get(url)
        .set('x-dev-role', role)
        .set('x-dev-station-id', stationId ? String(stationId) : '')
        .set('x-dev-user-id', uid),
    post: (url, body) =>
      agent
        .post(url)
        .set('x-dev-role', role)
        .set('x-dev-station-id', stationId ? String(stationId) : '')
        .set('x-dev-user-id', uid)
        .send(body),
    patch: (url, body) =>
      agent
        .patch(url)
        .set('x-dev-role', role)
        .set('x-dev-station-id', stationId ? String(stationId) : '')
        .set('x-dev-user-id', uid)
        .send(body),
  };
};

const admin = (callerId = null) => asRole(ROLES.ADMIN, null, callerId);
const citizen = () => asRole(ROLES.CITIZEN);
const firefighter = (stationId) => asRole(ROLES.FIREFIGHTER, stationId);
const officer = (stationId) => asRole(ROLES.STATION_OFFICER, stationId);
const dispatcher = () => asRole(ROLES.DISPATCH_OPERATOR);

// ---------------------------------------------------------------------------
// Test Data Setup
// ---------------------------------------------------------------------------

let testStation;
let adminUser;
const createdUserIds = [];

beforeAll(async () => {
  await sequelize.authenticate();

  // Create isolated test station
  testStation = await Station.create({
    name: `User Admin Test Station ${Date.now()}`,
    address: '999 Admin Test Blvd',
    latitude: 19.123,
    longitude: 72.854,
    createdAt: new Date(),
  });

  // Ensure an admin user exists in DB for caller checks
  adminUser = await User.create({
    name: 'Admin Tester',
    email: `admin_tester_${Date.now()}@ferms.test`,
    passwordHash: await bcrypt.hash('Passw0rd!', 10),
    role: ROLES.ADMIN,
    accountStatus: 'active',
    createdAt: new Date(),
  });
  createdUserIds.push(adminUser.id);
});

afterAll(async () => {
  if (createdUserIds.length > 0) {
    await User.destroy({ where: { id: createdUserIds } });
  }

  if (testStation) {
    await Station.destroy({ where: { id: testStation.id } });
  }

  await sequelize.close();
});

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('User Admin Endpoints & Authentication (W5-P-BE-1)', () => {
  describe('1. Non-admin callers receive 403 on all routes', () => {
    it('rejects GET /api/users for citizen, dispatcher, firefighter, station_officer', async () => {
      const resCit = await citizen().get('/api/users');
      expect(resCit.status).toBe(403);

      const resDisp = await dispatcher().get('/api/users');
      expect(resDisp.status).toBe(403);

      const resFf = await firefighter(testStation.id).get('/api/users');
      expect(resFf.status).toBe(403);

      const resOff = await officer(testStation.id).get('/api/users');
      expect(resOff.status).toBe(403);
    });

    it('rejects POST /api/users for non-admin', async () => {
      const res = await citizen().post('/api/users', { name: 'Test' });
      expect(res.status).toBe(403);
    });

    it('rejects PATCH /api/users/:id for non-admin', async () => {
      const res = await firefighter(testStation.id).patch(`/api/users/${adminUser.id}`, { name: 'Test' });
      expect(res.status).toBe(403);
    });

    it('rejects PATCH /api/users/:id/role for non-admin', async () => {
      const res = await officer(testStation.id).patch(`/api/users/${adminUser.id}/role`, { role: 'admin' });
      expect(res.status).toBe(403);
    });

    it('rejects PATCH /api/users/:id/deactivate for non-admin', async () => {
      const res = await citizen().patch(`/api/users/${adminUser.id}/deactivate`, {});
      expect(res.status).toBe(403);
    });
  });

  describe('2. GET /api/users', () => {
    let userFf, userCit;

    beforeAll(async () => {
      userFf = await User.create({
        name: 'Query FF User',
        email: `query_ff_${Date.now()}@ferms.test`,
        passwordHash: await bcrypt.hash('Passw0rd!', 10),
        role: ROLES.FIREFIGHTER,
        stationId: testStation.id,
        accountStatus: 'active',
        createdAt: new Date(),
      });
      createdUserIds.push(userFf.id);

      userCit = await User.create({
        name: 'Query Inactive Citizen',
        email: `query_cit_${Date.now()}@ferms.test`,
        passwordHash: await bcrypt.hash('Passw0rd!', 10),
        role: ROLES.CITIZEN,
        accountStatus: 'inactive',
        createdAt: new Date(Date.now() + 1000),
      });
      createdUserIds.push(userCit.id);
    });

    it('lists users newest first and never includes passwordHash', async () => {
      const res = await admin().get('/api/users');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.count).toBeGreaterThanOrEqual(2);

      // Verify no passwordHash in any returned object
      for (const u of res.body.data) {
        expect(u.passwordHash).toBeUndefined();
        expect(u.password_hash).toBeUndefined();
      }

      // Verify newest first
      const firstTime = new Date(res.body.data[0].createdAt).getTime();
      const secondTime = new Date(res.body.data[1].createdAt).getTime();
      expect(firstTime).toBeGreaterThanOrEqual(secondTime);
    });

    it('filters users by ?role=', async () => {
      const res = await admin().get(`/api/users?role=${ROLES.FIREFIGHTER}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((u) => u.role === ROLES.FIREFIGHTER)).toBe(true);
      expect(res.body.data.some((u) => u.id === userFf.id)).toBe(true);
    });

    it('filters users by ?status=', async () => {
      const res = await admin().get('/api/users?status=inactive');

      expect(res.status).toBe(200);
      expect(res.body.data.every((u) => u.accountStatus === 'inactive')).toBe(true);
      expect(res.body.data.some((u) => u.id === userCit.id)).toBe(true);
    });

    it('rejects invalid role or status with 400', async () => {
      const resRole = await admin().get('/api/users?role=superhero');
      expect(resRole.status).toBe(400);

      const resStatus = await admin().get('/api/users?status=banned');
      expect(resStatus.status).toBe(400);
    });
  });

  describe('3. POST /api/users', () => {
    it('creates a user with ANY role and hashes password', async () => {
      const email = `new_dispatch_${Date.now()}@ferms.test`;
      const res = await admin().post('/api/users', {
        name: 'New Dispatcher',
        email,
        password: 'SecurePassword123!',
        role: ROLES.DISPATCH_OPERATOR,
        phone: '555-0199',
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.email).toBe(email);
      expect(res.body.data.role).toBe(ROLES.DISPATCH_OPERATOR);
      expect(res.body.data.passwordHash).toBeUndefined();
      createdUserIds.push(res.body.data.id);

      // Verify hashed in DB
      const dbUser = await User.scope('withPassword').findByPk(res.body.data.id);
      expect(dbUser).not.toBeNull();
      expect(dbUser.passwordHash).not.toBe('SecurePassword123!');
      const match = await bcrypt.compare('SecurePassword123!', dbUser.passwordHash);
      expect(match).toBe(true);
    });

    it('creates firefighter with required stationId', async () => {
      const email = `new_ff_${Date.now()}@ferms.test`;
      const res = await admin().post('/api/users', {
        name: 'New Firefighter',
        email,
        password: 'Passw0rdFire!',
        role: ROLES.FIREFIGHTER,
        stationId: testStation.id,
        onDuty: true,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.stationId).toBe(testStation.id);
      expect(res.body.data.onDuty).toBe(true);
      createdUserIds.push(res.body.data.id);
    });

    it('rejects firefighter or station_officer without stationId with 400', async () => {
      const res = await admin().post('/api/users', {
        name: 'Missing Station FF',
        email: `missing_station_${Date.now()}@ferms.test`,
        password: 'Password123!',
        role: ROLES.FIREFIGHTER,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-existent stationId with 400', async () => {
      const res = await admin().post('/api/users', {
        name: 'Bad Station FF',
        email: `bad_station_${Date.now()}@ferms.test`,
        password: 'Password123!',
        role: ROLES.FIREFIGHTER,
        stationId: 999999,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate email with 409 CONFLICT', async () => {
      const email = `dup_${Date.now()}@ferms.test`;
      const firstRes = await admin().post('/api/users', {
        name: 'First User',
        email,
        password: 'Password123!',
        role: ROLES.CITIZEN,
      });
      expect(firstRes.status).toBe(201);
      createdUserIds.push(firstRes.body.data.id);

      const dupRes = await admin().post('/api/users', {
        name: 'Duplicate User',
        email,
        password: 'Password123!',
        role: ROLES.CITIZEN,
      });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.code).toBe('CONFLICT');
    });

    it('validates password minimum length of 8 characters', async () => {
      const res = await admin().post('/api/users', {
        name: 'Short Password',
        email: `short_pw_${Date.now()}@ferms.test`,
        password: 'short',
        role: ROLES.CITIZEN,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('4. PATCH /api/users/:id', () => {
    let targetUser;

    beforeEach(async () => {
      targetUser = await User.create({
        name: 'Editable User',
        email: `edit_${Date.now()}_${Math.floor(Math.random() * 1000)}@ferms.test`,
        passwordHash: await bcrypt.hash('Passw0rd!', 10),
        role: ROLES.CITIZEN,
        accountStatus: 'active',
        createdAt: new Date(),
      });
      createdUserIds.push(targetUser.id);
    });

    it('edits name, phone, email, and stationId', async () => {
      const newEmail = `updated_email_${Date.now()}@ferms.test`;
      const res = await admin().patch(`/api/users/${targetUser.id}`, {
        name: 'Updated Name',
        phone: '555-9876',
        email: newEmail,
        stationId: testStation.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.phone).toBe('555-9876');
      expect(res.body.data.email).toBe(newEmail);
      expect(res.body.data.stationId).toBe(testStation.id);
    });

    it('rejects updating to an email that is already used by another user with 409', async () => {
      const otherUser = await User.create({
        name: 'Other User',
        email: `other_${Date.now()}@ferms.test`,
        passwordHash: await bcrypt.hash('Passw0rd!', 10),
        role: ROLES.CITIZEN,
        accountStatus: 'active',
        createdAt: new Date(),
      });
      createdUserIds.push(otherUser.id);

      const res = await admin().patch(`/api/users/${targetUser.id}`, {
        email: otherUser.email,
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns 404 for non-existent user', async () => {
      const res = await admin().patch('/api/users/999999', { name: 'Non Existent' });
      expect(res.status).toBe(404);
    });
  });

  describe('5. PATCH /api/users/:id/role', () => {
    it('changes user role and validates against ROLES', async () => {
      const user = await User.create({
        name: 'Role Switcher',
        email: `role_switch_${Date.now()}@ferms.test`,
        passwordHash: await bcrypt.hash('Passw0rd!', 10),
        role: ROLES.CITIZEN,
        accountStatus: 'active',
        createdAt: new Date(),
      });
      createdUserIds.push(user.id);

      const res = await admin().patch(`/api/users/${user.id}/role`, {
        role: ROLES.DISPATCH_OPERATOR,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe(ROLES.DISPATCH_OPERATOR);

      // Verify in DB
      await user.reload();
      expect(user.role).toBe(ROLES.DISPATCH_OPERATOR);
    });

    it('rejects invalid role with 400', async () => {
      const res = await admin().patch(`/api/users/${adminUser.id}/role`, {
        role: 'invalid_role_xyz',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('6. PATCH /api/users/:id/deactivate and self-deactivate rule', () => {
    it('deactivates an account and sets accountStatus to inactive', async () => {
      const victim = await User.create({
        name: 'To Be Deactivated',
        email: `deactivate_${Date.now()}@ferms.test`,
        passwordHash: await bcrypt.hash('Passw0rd!', 10),
        role: ROLES.CITIZEN,
        accountStatus: 'active',
        createdAt: new Date(),
      });
      createdUserIds.push(victim.id);

      const res = await admin(adminUser.id).patch(`/api/users/${victim.id}/deactivate`, {});

      expect(res.status).toBe(200);
      expect(res.body.data.accountStatus).toBe('inactive');

      await victim.reload();
      expect(victim.accountStatus).toBe('inactive');
    });

    it('rejects self-deactivation with 400 and exact message', async () => {
      // Calling admin targets their own ID
      const res = await admin(adminUser.id).patch(`/api/users/${adminUser.id}/deactivate`, {});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toBe('You cannot deactivate your own account.');

      // Verify accountStatus remains active
      await adminUser.reload();
      expect(adminUser.accountStatus).toBe('active');
    });
  });

  describe('7. Deactivated user token is rejected on their very next request', () => {
    it('rejects a token issued before deactivation with 401 UNAUTHORIZED', async () => {
      // Create user
      const user = await User.create({
        name: 'Token Deactivation Test User',
        email: `token_deact_${Date.now()}@ferms.test`,
        passwordHash: await bcrypt.hash('Passw0rd!', 10),
        role: ROLES.CITIZEN,
        accountStatus: 'active',
        createdAt: new Date(),
      });
      createdUserIds.push(user.id);

      // Issue token BEFORE deactivation
      const token = jwt.sign(
        { userId: user.id, role: user.role, stationId: user.stationId },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // 1. Verify token works before deactivation (GET /api/incidents/mine is accessible by citizen)
      const resBefore = await request(app)
        .get('/api/incidents/mine')
        .set('Authorization', `Bearer ${token}`);
      expect(resBefore.status).toBe(200);

      // 2. Admin deactivates the user
      const deactRes = await admin(adminUser.id).patch(`/api/users/${user.id}/deactivate`, {});
      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.accountStatus).toBe('inactive');

      // 3. Very next request with the old token MUST return 401
      const resAfter = await request(app)
        .get('/api/incidents/mine')
        .set('Authorization', `Bearer ${token}`);

      expect(resAfter.status).toBe(401);
      expect(resAfter.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
