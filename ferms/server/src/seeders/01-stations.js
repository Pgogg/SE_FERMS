// seeders/01-stations.js — Seeds default fire stations
// TODO: Vedant W2 and W7
'use strict';

const STATIONS = [
  {
    name: 'FERMS Demo Station - Andheri',
    address: 'SV Road, Andheri West, Mumbai, MH 400058',
    latitude: 19.1100,
    longitude: 72.8500,
    contact: '022-26200101',
    created_at: new Date(),
  },
  {
    name: 'FERMS Demo Station - Bandra',
    address: 'Hill Road, Bandra West, Mumbai, MH 400050',
    latitude: 19.0600,
    longitude: 72.8400,
    contact: '022-26400101',
    created_at: new Date(),
  },
  {
    name: 'FERMS Demo Station - Powai',
    address: 'Central Avenue, Hiranandani, Powai, Mumbai, MH 400076',
    latitude: 19.1200,
    longitude: 72.9000,
    contact: '022-25700101',
    created_at: new Date(),
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const station of STATIONS) {
      const existing = await queryInterface.rawSelect(
        'stations',
        { where: { name: station.name } },
        ['id']
      );
      if (!existing) {
        await queryInterface.bulkInsert('stations', [station]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('stations', {
      name: STATIONS.map((s) => s.name),
    });
  },
};
