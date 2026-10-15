// migrations/20240101000005-create-incident-status-history.js — Creates the incident_status_history table (§4.5)
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('incident_status_history', {
      id: {
        type:          Sequelize.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      incident_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        references: { model: 'incidents', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      status: {
        type:      Sequelize.STRING(20),
        allowNull: false,
      },
      changed_by: {
        type:       Sequelize.INTEGER,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL',
      },
      changed_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // CHECK constraint on status (§4.4 / §4.5)
    await queryInterface.sequelize.query(`
      ALTER TABLE incident_status_history
        ADD CONSTRAINT chk_incident_status_history_status
          CHECK (status IN ('reported','unassigned','assigned','in_progress','resolved','closed'));
    `);

    // Index (§4.9: incident_status_history(incident_id))
    await queryInterface.addIndex('incident_status_history', ['incident_id'], {
      name: 'idx_incident_status_history_incident_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('incident_status_history');
  },
};
