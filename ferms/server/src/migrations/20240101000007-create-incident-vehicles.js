// migrations/20240101000007-create-incident-vehicles.js — Creates the incident_vehicles join table (§4.7)
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('incident_vehicles', {
      incident_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        primaryKey: true,
        references: { model: 'incidents', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      vehicle_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        primaryKey: true,
        references: { model: 'vehicles', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT',
      },
      assigned_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      released_at: {
        type:      Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('incident_vehicles');
  },
};
