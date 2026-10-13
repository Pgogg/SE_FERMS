// migrations/20240101000002-create-users.js — Creates the users table (depends on stations)
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      station_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'stations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      on_duty: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      account_status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'active',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // CHECK constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE users
        ADD CONSTRAINT chk_users_role
          CHECK (role IN ('citizen','dispatch_operator','firefighter','station_officer','admin')),
        ADD CONSTRAINT chk_users_account_status
          CHECK (account_status IN ('active','inactive'));
    `);

    // Indexes (email UNIQUE is already created by the column definition)
    await queryInterface.addIndex('users', ['station_id', 'on_duty'], {
      name: 'idx_users_station_on_duty',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  },
};
