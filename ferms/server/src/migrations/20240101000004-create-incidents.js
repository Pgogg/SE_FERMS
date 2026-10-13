// migrations/20240101000004-create-incidents.js — Creates the incidents table (depends on users and stations)
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('incidents', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      reporter_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      latitude: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      longitude: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      address: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      severity: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'reported',
      },
      station_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'stations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      closing_summary: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // CHECK constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE incidents
        ADD CONSTRAINT chk_incidents_severity
          CHECK (severity IN ('low','medium','high','critical')),
        ADD CONSTRAINT chk_incidents_status
          CHECK (status IN ('reported','unassigned','assigned','in_progress','resolved','closed'));
    `);

    // Indexes
    await queryInterface.addIndex('incidents', ['status'], {
      name: 'idx_incidents_status',
    });
    await queryInterface.addIndex('incidents', ['station_id'], {
      name: 'idx_incidents_station_id',
    });
    await queryInterface.addIndex('incidents', ['reporter_id'], {
      name: 'idx_incidents_reporter_id',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('incidents');
  },
};
