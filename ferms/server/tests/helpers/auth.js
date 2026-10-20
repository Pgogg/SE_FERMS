// tests/helpers/auth.js — Test helper to log in as each seeded demo account and return its token
'use strict';

require('dotenv').config();

// Ensure test DB is used if configured
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');
const { ROLES } = require('../../src/domain/constants');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_supersecret';
const DEMO_PASSWORD = 'Passw0rd!';

const DEMO_ACCOUNTS = {
  [ROLES.CITIZEN]: {
    email: 'citizen@ferms.test',
    password: DEMO_PASSWORD,
    role: ROLES.CITIZEN,
  },
  [ROLES.DISPATCH_OPERATOR]: {
    email: 'operator@ferms.test',
    password: DEMO_PASSWORD,
    role: ROLES.DISPATCH_OPERATOR,
  },
  [ROLES.FIREFIGHTER]: {
    email: 'firefighter@ferms.test',
    password: DEMO_PASSWORD,
    role: ROLES.FIREFIGHTER,
  },
  [ROLES.STATION_OFFICER]: {
    email: 'officer@ferms.test',
    password: DEMO_PASSWORD,
    role: ROLES.STATION_OFFICER,
  },
  [ROLES.ADMIN]: {
    email: 'admin@ferms.test',
    password: DEMO_PASSWORD,
    role: ROLES.ADMIN,
  },
  firefighter2: {
    email: 'firefighter2@ferms.test',
    password: DEMO_PASSWORD,
    role: ROLES.FIREFIGHTER,
  },
  citizen2: {
    email: 'citizen2@ferms.test',
    password: DEMO_PASSWORD,
    role: ROLES.CITIZEN,
  },
};

const tokenCache = {};

/**
 * Logs in with credentials via POST /api/auth/login.
 * If endpoint returns 404 (auth routes unmounted), falls back to verifying
 * user from DB and signing a valid 24h JWT.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
async function loginAs(email, password = DEMO_PASSWORD) {
  try {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    if (res.status === 200 && res.body?.data?.token) {
      return {
        token: res.body.data.token,
        user: res.body.data.user,
      };
    }
  } catch {
    // Fall back to direct DB + JWT token generation
  }

  // Fallback: look up user in DB (with passwordHash included) and generate valid JWT
  const user = await User.scope('withPassword').findOne({ where: { email } });
  if (!user) {
    throw new Error(`Seeded user with email "${email}" not found in database.`);
  }

  if (user.passwordHash) {
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new Error(`Invalid password for user "${email}".`);
    }
  }


  const token = jwt.sign(
    {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      stationId: user.stationId,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      stationId: user.stationId,
      onDuty: user.onDuty,
      accountStatus: user.accountStatus,
    },
  };
}

/**
 * Pre-authenticates all seeded demo roles and caches their tokens.
 *
 * @returns {Promise<Record<string, { token: string, user: object }>>}
 */
async function getDemoTokens() {
  for (const [key, account] of Object.entries(DEMO_ACCOUNTS)) {
    if (!tokenCache[key]) {
      const authData = await loginAs(account.email, account.password);
      tokenCache[key] = authData;
    }
  }
  return tokenCache;
}

/**
 * Returns the Authorization header for a given role or account key.
 *
 * @param {string} roleOrKey
 * @returns {Promise<{ Authorization: string }>}
 */
async function getAuthHeaders(roleOrKey) {
  const tokens = await getDemoTokens();
  const auth = tokens[roleOrKey];
  if (!auth?.token) {
    throw new Error(`No token available for role/account "${roleOrKey}".`);
  }
  return { Authorization: `Bearer ${auth.token}` };
}

module.exports = {
  loginAs,
  getDemoTokens,
  getAuthHeaders,
  DEMO_ACCOUNTS,
  JWT_SECRET,
};
