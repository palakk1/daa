require('dotenv').config();

const { Client } = require('pg');

const incidents = [
  { type: 'Fire',  lat: 30.3165, lng: 78.0322, severity: 'High',     status: 'Active',    metadata: { source: 'Satellite-A1' } },
  { type: 'Flood', lat: 30.3200, lng: 78.0400, severity: 'Critical',  status: 'Active',    metadata: { water_level: '4.5m' }   },
  { type: 'Fire',  lat: 30.3100, lng: 78.0300, severity: 'Medium',    status: 'Contained', metadata: { area: '20acres' }        }
];

const hospitals = [
  { name: 'Max Super Speciality Hospital',          lat: 30.3541, lng: 78.0773, total_beds: 500, available_beds: 42, oxygen: 1200.5 },
  { name: 'Doon Medical College Hospital',          lat: 30.3142, lng: 78.0368, total_beds: 200, available_beds: 15, oxygen:  450.0 },
  { name: 'Synergy Institute of Medical Sciences',  lat: 30.3102, lng: 78.0093, total_beds: 300, available_beds: 88, oxygen:  800.0 }
];

// Doctors are seeded per hospital (hospital resolved by name at runtime)
const doctorsByHospital = {
  'Max Super Speciality Hospital': [
    { name: 'Dr. Smith',  specialty: 'Emergency',        availability: true, years_experience: 10 },
    { name: 'Dr. Jones',  specialty: 'Cardiology',       availability: true, years_experience: 15 },
    { name: 'Dr. Taylor', specialty: 'General Medicine', availability: true, years_experience:  8 }
  ]
};

async function setup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- Database Setup Started ---');

    // 1. Drop existing tables (safe for dev — CASCADE handles FK deps)
    await client.query('DROP TABLE IF EXISTS supplies  CASCADE'); // ✅ Fixed: was "suppliesCASCADE"
    await client.query('DROP TABLE IF EXISTS doctors   CASCADE');
    await client.query('DROP TABLE IF EXISTS hospitals CASCADE');
    await client.query('DROP TABLE IF EXISTS incidents CASCADE');
    console.log('Tables cleared');

    // 2. Create Tables
    await client.query(`
      CREATE TABLE incidents (
        id         SERIAL PRIMARY KEY,
        type       VARCHAR(50)       NOT NULL,
        latitude   DOUBLE PRECISION  NOT NULL,
        longitude  DOUBLE PRECISION  NOT NULL,
        severity   VARCHAR(20)       DEFAULT 'Low',
        status     VARCHAR(20)       DEFAULT 'Active',
        metadata   JSONB,
        created_at TIMESTAMP         DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE hospitals (
        id              SERIAL PRIMARY KEY,
        name            VARCHAR(100)      NOT NULL,
        latitude        DOUBLE PRECISION  NOT NULL,
        longitude       DOUBLE PRECISION  NOT NULL,
        total_beds      INTEGER           DEFAULT 0,
        available_beds  INTEGER           DEFAULT 0,
        oxygen_level    FLOAT             DEFAULT 0.0,
        last_updated    TIMESTAMP         DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE supplies (
        id          SERIAL PRIMARY KEY,
        item_name   VARCHAR(100) NOT NULL,
        quantity    INTEGER      NOT NULL,
        latitude    DOUBLE PRECISION,
        longitude   DOUBLE PRECISION,
        hospital_id INTEGER      REFERENCES hospitals(id) ON DELETE SET NULL,
        status      VARCHAR(20)  DEFAULT 'Available',
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ✅ NEW: doctors table (was missing — seed_phase3.js inserts into this)
    await client.query(`
      CREATE TABLE doctors (
        id               SERIAL PRIMARY KEY,
        name             VARCHAR(100) NOT NULL,
        specialty        VARCHAR(100),
        hospital_id      INTEGER      REFERENCES hospitals(id) ON DELETE SET NULL,
        availability     BOOLEAN      DEFAULT true,
        years_experience INTEGER      DEFAULT 0,
        created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tables created');

    // 3. Seed Incidents
    for (const inc of incidents) {
      await client.query(
        'INSERT INTO incidents (type, latitude, longitude, severity, status, metadata) VALUES ($1, $2, $3, $4, $5, $6)',
        [inc.type, inc.lat, inc.lng, inc.severity, inc.status, JSON.stringify(inc.metadata)]
      );
    }
    console.log('Incidents seeded');

    // 4. Seed Hospitals
    for (const hosp of hospitals) {
      await client.query(
        'INSERT INTO hospitals (name, latitude, longitude, total_beds, available_beds, oxygen_level) VALUES ($1, $2, $3, $4, $5, $6)',
        [hosp.name, hosp.lat, hosp.lng, hosp.total_beds, hosp.available_beds, hosp.oxygen]
      );
    }
    console.log('Hospitals seeded');

    // 5. Seed Supplies
    const hospResult = await client.query(
      'SELECT id FROM hospitals WHERE name = $1',
      ['Max Super Speciality Hospital']
    );
    const cityHospId = hospResult.rows[0].id;

    await client.query(
      'INSERT INTO supplies (item_name, quantity, status, hospital_id) VALUES ($1, $2, $3, $4)',
      ['Medical Kits', 200, 'Shipped', cityHospId]
    );
    console.log('Supplies seeded');

    // 6. Seed Doctors ✅ NEW
    for (const [hospName, doctors] of Object.entries(doctorsByHospital)) {
      const res = await client.query('SELECT id FROM hospitals WHERE name = $1', [hospName]);
      if (res.rows.length === 0) continue;
      const hospId = res.rows[0].id;

      for (const doc of doctors) {
        await client.query(
          'INSERT INTO doctors (name, specialty, hospital_id, availability, years_experience) VALUES ($1, $2, $3, $4, $5)',
          [doc.name, doc.specialty, hospId, doc.availability, doc.years_experience]
        );
      }
    }
    console.log('Doctors seeded');

    await client.end();
    console.log('--- Setup Complete ---');
  } catch (err) {
    console.error('Setup failed:', err);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

setup();
