// migrations/20240101000008-create-notifications.js — Creates the notifications table (depends on users and incidents)
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      recipient_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      incident_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'incidents', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      type: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      read_status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // CHECK constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE notifications
        ADD CONSTRAINT chk_notifications_type
          CHECK (type IN ('dispatch','status_update','system'));
    `);

    // Index
    await queryInterface.addIndex('notifications', ['recipient_id', 'read_status'], {
      name: 'idx_notifications_recipient_read',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notifications');
  },
};
