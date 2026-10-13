// migrations/20240101000003-create-vehicles.js — Creates the vehicles table (§4.3)
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vehicles', {
      id: {
        type:          Sequelize.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      type: {
        type:      Sequelize.STRING(50),
        allowNull: false,
      },
      registration_no: {
        type:      Sequelize.STRING(30),
        allowNull: false,
        unique:    true,
      },
      status: {
        type:         Sequelize.STRING(20),
        allowNull:    false,
        defaultValue: 'available',
      },
      station_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        references: { model: 'stations', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT',
      },
    });

    // CHECK constraint on status
    await queryInterface.sequelize.query(`
      ALTER TABLE vehicles
        ADD CONSTRAINT chk_vehicles_status
          CHECK (status IN ('available','dispatched','maintenance'));
    `);

    // Index (§4.9: vehicles(station_id, status))
    await queryInterface.addIndex('vehicles', ['station_id', 'status'], {
      name: 'idx_vehicles_station_id_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vehicles');
  },
};
