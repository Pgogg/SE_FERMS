// config/db.js — Initialises and exports the Sequelize connection using DATABASE_URL
const { Sequelize } = require('sequelize');

module.exports = new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres' });
