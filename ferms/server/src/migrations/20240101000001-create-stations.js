// migrations/20240101000001-create-stations.js — Creates the stations table (§4.2)
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stations', {
      id: {
        type:          Sequelize.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      name: {
        type:      Sequelize.STRING(150),
        allowNull: false,
      },
      address: {
        type:      Sequelize.STRING(255),
        allowNull: false,
      },
      latitude: {
        type:      Sequelize.DOUBLE,
        allowNull: false,
      },
      longitude: {
        type:      Sequelize.DOUBLE,
        allowNull: false,
      },
      contact: {
        type:      Sequelize.STRING(100),
        allowNull: true,
      },
      created_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stations');
  },
};
