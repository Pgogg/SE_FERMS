// seeders/03-vehicles-incidents.js — Seeds sample vehicles and 6 demo incidents covering all states
// Requirements: Vedant W2, W7. Task W7-V-BE-1
'use strict';

const VEHICLES_DEF = [
  // Andheri 3 (mixed: 1 dispatched, 1 available, 1 maintenance)
  {
    stationName: 'FERMS Demo Station - Andheri',
    type: 'fire_engine',
    registration_no: 'MH-02-FE-101',
    status: 'dispatched',
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
    status: 'maintenance',
  },
  // Bandra 2 (1 dispatched, 1 available)
  {
    stationName: 'FERMS Demo Station - Bandra',
    type: 'fire_engine',
    registration_no: 'MH-02-FE-201',
    status: 'dispatched',
  },
  {
    stationName: 'FERMS Demo Station - Bandra',
    type: 'rescue_van',
    registration_no: 'MH-02-RV-202',
    status: 'available',
  },
  // Powai 2 (both in maintenance per Decision D2)
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

const DEMO_INCIDENT_DESCRIPTIONS = [
  'Commercial kitchen smoke sighting near Lokhandwala market',
  'Industrial scrap shed fire near Kanjurmarg railway siding',
  'Electrical transformer sparking on link road near Metro pillar 42',
  'Basement parking vehicle fire spreading to adjacent cars',
  'Residential 4th floor balcony dry waste and curtain blaze',
  'Open grassland fire adjacent to highway service road',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1. Fetch stations by name
    const [stations] = await queryInterface.sequelize.query(
      `SELECT id, name FROM stations;`
    );
    const stationMap = {};
    for (const s of stations) {
      stationMap[s.name] = s.id;
    }

    const andheriId = stationMap['FERMS Demo Station - Andheri'] || stations[0]?.id || null;
    const bandraId  = stationMap['FERMS Demo Station - Bandra']  || stations[1]?.id || andheriId;
    const powaiId   = stationMap['FERMS Demo Station - Powai']   || stations[2]?.id || andheriId;

    // 2. Fetch users by email for reporter and actor IDs
    const [users] = await queryInterface.sequelize.query(
      `SELECT id, email, role FROM users;`
    );
    const userMap = {};
    for (const u of users) {
      userMap[u.email] = u.id;
    }

    const citizen1Id     = userMap['citizen@ferms.test']      || users[0]?.id || 1;
    const citizen2Id     = userMap['citizen2@ferms.test']     || citizen1Id;
    const operatorId     = userMap['operator@ferms.test']     || null;
    const firefighter1Id = userMap['firefighter@ferms.test']  || null;
    const firefighter2Id = userMap['firefighter2@ferms.test'] || firefighter1Id;
    const officerId      = userMap['officer@ferms.test']      || null;

    // 3. Upsert vehicles
    for (const v of VEHICLES_DEF) {
      const targetStationId = stationMap[v.stationName] || andheriId;
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
            station_id: targetStationId,
          },
        ]);
      } else {
        await queryInterface.bulkUpdate(
          'vehicles',
          { status: v.status, station_id: targetStationId },
          { registration_no: v.registration_no }
        );
      }
    }

    // Fetch vehicle IDs map
    const [vehicles] = await queryInterface.sequelize.query(
      `SELECT id, registration_no FROM vehicles;`
    );
    const vehicleMap = {};
    for (const v of vehicles) {
      vehicleMap[v.registration_no] = v.id;
    }

    // 4. Seed 6 demo incidents covering every state
    const incidentsData = [
      // Incident 1: reported (citizen, no station, no vehicle)
      {
        description: DEMO_INCIDENT_DESCRIPTIONS[0],
        severity: 'medium',
        status: 'reported',
        station_id: null,
        reporter_id: citizen1Id,
        latitude: 19.1412,
        longitude: 72.8285,
        address: 'Lokhandwala Complex, Andheri West, Mumbai',
        closing_summary: null,
        created_at: new Date(now.getTime() - 60 * 60 * 1000), // 60 mins ago
        updated_at: new Date(now.getTime() - 60 * 60 * 1000),
        history: [
          { status: 'reported', changed_by: citizen1Id, offsetMins: 60 },
        ],
        notes: [],
        vehicles: [],
      },
      // Incident 2: unassigned (citizen2, no station, no vehicle)
      {
        description: DEMO_INCIDENT_DESCRIPTIONS[1],
        severity: 'high',
        status: 'unassigned',
        station_id: null,
        reporter_id: citizen2Id,
        latitude: 19.1290,
        longitude: 72.9340,
        address: 'LBS Marg near Railway Siding, Kanjurmarg, Mumbai',
        closing_summary: null,
        created_at: new Date(now.getTime() - 120 * 60 * 1000), // 2 hrs ago
        updated_at: new Date(now.getTime() - 118 * 60 * 1000),
        history: [
          { status: 'reported', changed_by: citizen2Id, offsetMins: 120 },
          { status: 'unassigned', changed_by: null, offsetMins: 118 }, // system
        ],
        notes: [
          {
            author_id: operatorId || citizen2Id,
            note: 'Automated Dispatch Alert: No stations with available vehicles within operational radius.',
            offsetMins: 117,
          },
        ],
        vehicles: [],
      },
      // Incident 3: assigned (citizen1, Andheri station, vehicle MH-02-FE-101 dispatched)
      {
        description: DEMO_INCIDENT_DESCRIPTIONS[2],
        severity: 'medium',
        status: 'assigned',
        station_id: andheriId,
        reporter_id: citizen1Id,
        latitude: 19.1245,
        longitude: 72.8362,
        address: 'New Link Road, DN Nagar, Andheri West, Mumbai',
        closing_summary: null,
        created_at: new Date(now.getTime() - 45 * 60 * 1000),
        updated_at: new Date(now.getTime() - 44 * 60 * 1000),
        history: [
          { status: 'reported', changed_by: citizen1Id, offsetMins: 45 },
          { status: 'assigned', changed_by: null, offsetMins: 44 }, // system
        ],
        notes: [
          {
            author_id: operatorId || citizen1Id,
            note: 'Assigned to Andheri Station. Dispatched Fire Engine MH-02-FE-101. Traffic control alerted.',
            offsetMins: 43,
          },
        ],
        vehicles: [
          {
            vehicle_id: vehicleMap['MH-02-FE-101'],
            assigned_at: new Date(now.getTime() - 44 * 60 * 1000),
            released_at: null,
          },
        ],
      },
      // Incident 4: in_progress (citizen2, Bandra station, vehicle MH-02-FE-201 dispatched)
      {
        description: DEMO_INCIDENT_DESCRIPTIONS[3],
        severity: 'critical',
        status: 'in_progress',
        station_id: bandraId,
        reporter_id: citizen2Id,
        latitude: 19.0528,
        longitude: 72.8315,
        address: 'Carter Road Promenade, Bandra West, Mumbai',
        closing_summary: null,
        created_at: new Date(now.getTime() - 90 * 60 * 1000),
        updated_at: new Date(now.getTime() - 60 * 60 * 1000),
        history: [
          { status: 'reported', changed_by: citizen2Id, offsetMins: 90 },
          { status: 'assigned', changed_by: null, offsetMins: 89 },
          { status: 'in_progress', changed_by: firefighter2Id, offsetMins: 60 },
        ],
        notes: [
          {
            author_id: firefighter2Id || citizen2Id,
            note: 'Crew on scene. Two 45mm hose lines deployed into parking basement. Primary search underway.',
            offsetMins: 55,
          },
          {
            author_id: firefighter2Id || citizen2Id,
            note: 'Main blaze suppressed. Commencing thermal imaging check for heat pockets.',
            offsetMins: 30,
          },
        ],
        vehicles: [
          {
            vehicle_id: vehicleMap['MH-02-FE-201'],
            assigned_at: new Date(now.getTime() - 89 * 60 * 1000),
            released_at: null,
          },
        ],
      },
      // Incident 5: resolved (citizen1, Andheri station, vehicle released, closing summary)
      {
        description: DEMO_INCIDENT_DESCRIPTIONS[4],
        severity: 'medium',
        status: 'resolved',
        station_id: andheriId,
        reporter_id: citizen1Id,
        latitude: 19.1154,
        longitude: 72.8458,
        address: 'Veera Desai Industrial Estate Road, Andheri West, Mumbai',
        closing_summary: 'Fire completely extinguished with 1 line. Ventilation completed. No civilian or crew casualties.',
        created_at: new Date(now.getTime() - 180 * 60 * 1000),
        updated_at: new Date(now.getTime() - 75 * 60 * 1000),
        history: [
          { status: 'reported', changed_by: citizen1Id, offsetMins: 180 },
          { status: 'assigned', changed_by: null, offsetMins: 179 },
          { status: 'in_progress', changed_by: firefighter1Id, offsetMins: 160 },
          { status: 'resolved', changed_by: firefighter1Id, offsetMins: 75 },
        ],
        notes: [
          {
            author_id: firefighter1Id || citizen1Id,
            note: 'Water tender on scene, connecting to hydrant.',
            offsetMins: 155,
          },
          {
            author_id: firefighter1Id || citizen1Id,
            note: 'Fire contained to balcony. Commencing smoke clearing.',
            offsetMins: 95,
          },
        ],
        vehicles: [
          {
            vehicle_id: vehicleMap['MH-02-RV-102'],
            assigned_at: new Date(now.getTime() - 179 * 60 * 1000),
            released_at: new Date(now.getTime() - 75 * 60 * 1000), // released_at set
          },
        ],
      },
      // Incident 6: closed (citizen2, Andheri station, vehicle released, closing summary)
      {
        description: DEMO_INCIDENT_DESCRIPTIONS[5],
        severity: 'low',
        status: 'closed',
        station_id: andheriId,
        reporter_id: citizen2Id,
        latitude: 19.1288,
        longitude: 72.8624,
        address: 'JVLR Service Road near SEEPZ, Andheri East, Mumbai',
        closing_summary: 'Brush fire extinguished. Surrounding grass wetted to prevent rekindling. Handed over to local ward staff.',
        created_at: new Date(now.getTime() - 300 * 60 * 1000),
        updated_at: new Date(now.getTime() - 150 * 60 * 1000),
        history: [
          { status: 'reported', changed_by: citizen2Id, offsetMins: 300 },
          { status: 'assigned', changed_by: null, offsetMins: 299 },
          { status: 'in_progress', changed_by: firefighter1Id, offsetMins: 270 },
          { status: 'resolved', changed_by: firefighter1Id, offsetMins: 210 },
          { status: 'closed', changed_by: officerId, offsetMins: 150 },
        ],
        notes: [
          {
            author_id: officerId || citizen2Id,
            note: 'Station Officer verified site cold and secure. Case closed.',
            offsetMins: 150,
          },
        ],
        vehicles: [
          {
            vehicle_id: vehicleMap['MH-02-RV-102'],
            assigned_at: new Date(now.getTime() - 299 * 60 * 1000),
            released_at: new Date(now.getTime() - 210 * 60 * 1000), // released_at set
          },
        ],
      },
    ];

    for (const incDef of incidentsData) {
      let incidentId = await queryInterface.rawSelect(
        'incidents',
        { where: { description: incDef.description } },
        ['id']
      );

      if (!incidentId) {
        await queryInterface.bulkInsert('incidents', [
          {
            description: incDef.description,
            severity: incDef.severity,
            status: incDef.status,
            station_id: incDef.station_id,
            reporter_id: incDef.reporter_id,
            latitude: incDef.latitude,
            longitude: incDef.longitude,
            address: incDef.address,
            closing_summary: incDef.closing_summary,
            created_at: incDef.created_at,
            updated_at: incDef.updated_at,
          },
        ]);

        incidentId = await queryInterface.rawSelect(
          'incidents',
          { where: { description: incDef.description } },
          ['id']
        );
      } else {
        await queryInterface.bulkUpdate(
          'incidents',
          {
            severity: incDef.severity,
            status: incDef.status,
            station_id: incDef.station_id,
            reporter_id: incDef.reporter_id,
            latitude: incDef.latitude,
            longitude: incDef.longitude,
            address: incDef.address,
            closing_summary: incDef.closing_summary,
            updated_at: incDef.updated_at,
          },
          { id: incidentId }
        );
      }

      if (!incidentId) continue;

      // Seed status history if not already present
      for (const h of incDef.history) {
        const hExisting = await queryInterface.rawSelect(
          'incident_status_history',
          { where: { incident_id: incidentId, status: h.status } },
          ['id']
        );
        if (!hExisting) {
          await queryInterface.bulkInsert('incident_status_history', [
            {
              incident_id: incidentId,
              status: h.status,
              changed_by: h.changed_by,
              changed_at: new Date(now.getTime() - h.offsetMins * 60 * 1000),
            },
          ]);
        }
      }

      // Seed notes if not already present
      for (const n of incDef.notes) {
        const nExisting = await queryInterface.rawSelect(
          'incident_notes',
          { where: { incident_id: incidentId, note: n.note } },
          ['id']
        );
        if (!nExisting) {
          await queryInterface.bulkInsert('incident_notes', [
            {
              incident_id: incidentId,
              author_id: n.author_id,
              note: n.note,
              created_at: new Date(now.getTime() - n.offsetMins * 60 * 1000),
            },
          ]);
        }
      }

      // Seed incident vehicles if not already present
      for (const iv of incDef.vehicles) {
        if (!iv.vehicle_id) continue;
        const ivExisting = await queryInterface.rawSelect(
          'incident_vehicles',
          { where: { incident_id: incidentId, vehicle_id: iv.vehicle_id } },
          ['assigned_at']
        );
        if (!ivExisting) {
          await queryInterface.bulkInsert('incident_vehicles', [
            {
              incident_id: incidentId,
              vehicle_id: iv.vehicle_id,
              assigned_at: iv.assigned_at,
              released_at: iv.released_at,
            },
          ]);
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // 1. Delete notes, history, and vehicle links for seeded demo incidents
    const [incidents] = await queryInterface.sequelize.query(
      `SELECT id FROM incidents WHERE description IN (${DEMO_INCIDENT_DESCRIPTIONS.map((d) => `'${d.replace(/'/g, "''")}'`).join(', ')});`
    );

    if (incidents.length > 0) {
      const incIds = incidents.map((i) => i.id);
      await queryInterface.bulkDelete('incident_vehicles', {
        incident_id: incIds,
      });
      await queryInterface.bulkDelete('incident_notes', {
        incident_id: incIds,
      });
      await queryInterface.bulkDelete('incident_status_history', {
        incident_id: incIds,
      });
      await queryInterface.bulkDelete('incidents', {
        id: incIds,
      });
    }

    // 2. Delete seeded vehicles
    await queryInterface.bulkDelete('vehicles', {
      registration_no: VEHICLES_DEF.map((v) => v.registration_no),
    });
  },
};
