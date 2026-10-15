// seeders/02-users.js — Seeds default demo user accounts (Parth W2)
'use strict';

const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { ROLES } = require('../domain/constants');

const DEMO_PASSWORD = 'Passw0rd!';
const BCRYPT_ROUNDS = 10;

const SEED_EMAILS = [
  'citizen@ferms.test',
  'operator@ferms.test',
  'firefighter@ferms.test',
  'officer@ferms.test',
  'admin@ferms.test',
  'firefighter2@ferms.test',
  'citizen2@ferms.test',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Hash demo password
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

    // 2. Look up stations to link station staff
    // Look up by station name from 01-stations / seed data, or fallback by order
    const [stations] = await queryInterface.sequelize.query(
      `SELECT id, name FROM stations ORDER BY id ASC;`
    );

    const firstStation =
      stations.find((s) => s.name === 'Downtown Fire Station 1') ||
      stations[0] ||
      null;

    const secondStation =
      stations.find((s) => s.name === 'Metro Central Station 2') ||
      stations[1] ||
      firstStation ||
      null;

    const firstStationId = firstStation ? firstStation.id : null;
    const secondStationId = secondStation ? secondStation.id : firstStationId;

    // 3. Define candidate demo user accounts
    const now = new Date();
    const candidateUsers = [
      {
        name: 'Demo Citizen',
        email: 'citizen@ferms.test',
        phone: '555-0101',
        password_hash: passwordHash,
        role: ROLES.CITIZEN,
        station_id: null,
        on_duty: false,
        account_status: 'active',
        created_at: now,
      },
      {
        name: 'Demo Dispatch Operator',
        email: 'operator@ferms.test',
        phone: '555-0102',
        password_hash: passwordHash,
        role: ROLES.DISPATCH_OPERATOR,
        station_id: null,
        on_duty: false,
        account_status: 'active',
        created_at: now,
      },
      {
        name: 'Demo Firefighter',
        email: 'firefighter@ferms.test',
        phone: '555-0103',
        password_hash: passwordHash,
        role: ROLES.FIREFIGHTER,
        station_id: firstStationId,
        on_duty: true,
        account_status: 'active',
        created_at: now,
      },
      {
        name: 'Demo Station Officer',
        email: 'officer@ferms.test',
        phone: '555-0104',
        password_hash: passwordHash,
        role: ROLES.STATION_OFFICER,
        station_id: firstStationId,
        on_duty: true,
        account_status: 'active',
        created_at: now,
      },
      {
        name: 'Demo System Admin',
        email: 'admin@ferms.test',
        phone: '555-0105',
        password_hash: passwordHash,
        role: ROLES.ADMIN,
        station_id: null,
        on_duty: false,
        account_status: 'active',
        created_at: now,
      },
      {
        name: 'Demo Firefighter 2',
        email: 'firefighter2@ferms.test',
        phone: '555-0106',
        password_hash: passwordHash,
        role: ROLES.FIREFIGHTER,
        station_id: secondStationId,
        on_duty: true,
        account_status: 'active',
        created_at: now,
      },
      {
        name: 'Demo Citizen 2',
        email: 'citizen2@ferms.test',
        phone: '555-0107',
        password_hash: passwordHash,
        role: ROLES.CITIZEN,
        station_id: null,
        on_duty: false,
        account_status: 'active',
        created_at: now,
      },
    ];

    // 4. Safe to run again: skip emails that already exist in the database
    const [existingUsers] = await queryInterface.sequelize.query(
      `SELECT email FROM users WHERE email IN (:emails);`,
      {
        replacements: { emails: SEED_EMAILS },
      }
    );

    const existingEmailSet = new Set(
      existingUsers.map((u) => u.email.toLowerCase())
    );

    const usersToInsert = candidateUsers.filter(
      (u) => !existingEmailSet.has(u.email.toLowerCase())
    );

    if (usersToInsert.length > 0) {
      await queryInterface.bulkInsert('users', usersToInsert);
    }
  },

  async down(queryInterface, Sequelize) {
    // Only deletes the demo seed emails
    const opIn = (Sequelize && Sequelize.Op && Sequelize.Op.in) ? Sequelize.Op.in : Op.in;
    await queryInterface.bulkDelete('users', {
      email: {
        [opIn]: SEED_EMAILS,
      },
    });
  },
};
