// seeders/03-vehicles-incidents.js — Seeds sample vehicles and incidents
// TODO: Vedant W2 and W7
'use strict';

const VEHICLES_DEF = [
  // Andheri 3 (all available)
  {
    stationName: 'FERMS Demo Station - Andheri',
    type: 'fire_engine',
    registration_no: 'MH-02-FE-101',
    status: 'available',
  },
  {
    stationName: 'FERMS Demo Station - Andheri',
    type: 'rescue_van',
    registration_no: 'MH-02-RV-102',
    status: 'available',
  },
  {
    stationName: 'FERMS Demo Station - Andheri',
    type: 'water_tanker',
    registration_no: 'MH-02-WT-103',
    status: 'available',
  },
  // Bandra 2 (all available)
  {
    stationName: 'FERMS Demo Station - Bandra',
    type: 'fire_engine',
    registration_no: 'MH-02-FE-201',
    status: 'available',
  },
  {
    stationName: 'FERMS Demo Station - Bandra',
    type: 'rescue_van',
    registration_no: 'MH-02-RV-202',
    status: 'available',
  },
  // Powai 2 (both in maintenance)
  {
    stationName: 'FERMS Demo Station - Powai',
    type: 'fire_engine',
    registration_no: 'MH-02-FE-301',
    status: 'maintenance',
  },
  {
    stationName: 'FERMS Demo Station - Powai',
    type: 'hazmat_unit',
    registration_no: 'MH-02-HZ-302',
    status: 'maintenance',
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const v of VEHICLES_DEF) {
      const stationId = await queryInterface.rawSelect(
        'stations',
        { where: { name: v.stationName } },
        ['id']
      );

      if (!stationId) continue;

      const existing = await queryInterface.rawSelect(
        'vehicles',
        { where: { registration_no: v.registration_no } },
        ['id']
      );

      if (!existing) {
        await queryInterface.bulkInsert('vehicles', [
          {
            type: v.type,
            registration_no: v.registration_no,
            status: v.status,
            station_id: stationId,
          },
        ]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('vehicles', {
      registration_no: VEHICLES_DEF.map((v) => v.registration_no),
    });
  },
};
