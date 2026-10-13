// models/index.js — Loads all Sequelize models, sets up associations, and exports them.
// Gracefully skips model files that export an empty stub (no model.name means V's models aren't ready yet).
'use strict';

const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const db = {};

// ===== Parth =====
// Load every .js file in this directory except index.js.
// If a model file throws or returns something without a .name, skip it
// so that running only Parth's migrations still works.
fs.readdirSync(__dirname)
  .filter((f) => f !== 'index.js' && f.endsWith('.js'))
  .sort() // deterministic load order
  .forEach((file) => {
    try {
      const factory = require(path.join(__dirname, file));
      // Vedant's stub files export (sequelize, DataTypes) => { define with no fields }
      // They will still return a model object with a name, so they load fine.
      const model = factory(sequelize, DataTypes);
      if (model && model.name) {
        db[model.name] = model;
      }
    } catch (err) {
      // A model file that hasn't been implemented yet should not crash the server.
      console.warn(`[models/index.js] Skipped model file "${file}": ${err.message}`);
    }
  });

// Run each model's associate() hook once all models are loaded.
Object.values(db).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(db);
  }
});
// ===== /Parth =====

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
