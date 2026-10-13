// migrations/20240101000006-create-incident-notes.js — Creates the incident_notes table (§4.6)
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('incident_notes', {
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
      author_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT',
      },
      note: {
        type:      Sequelize.TEXT,
        allowNull: false,
      },
      created_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('incident_notes');
  },
};
