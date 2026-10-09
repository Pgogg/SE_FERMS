// models/User.js — Defines the User model (id, name, email, password_hash, role, station_id)
'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {}, { tableName: 'users' });
  User.associate = (models) => {};
  return User;
};
