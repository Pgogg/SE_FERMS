// config/db.js — Initialises and exports the Sequelize connection using DATABASE_URL
const { Sequelize } = require('sequelize');

const isProd =
  process.env.NODE_ENV === 'production' ||
  process.env.DATABASE_SSL === 'true';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,

  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },

  dialectOptions: isProd
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
});

module.exports = sequelize;
