const { Client } = require('pg');
require('dotenv').config();

const incidents = [
  { type: 'Fire', lat: 30.3165, lng: 78.0322, severity: 'High', status: 'Active', metadata: { source: 'Satellite-A1' } },
  { type: 'Flood', lat: 30.3200, lng: 78.0400, severity: 'Critical', status: 'Active', metadata: { water_level: '4.5m' } },
  { type: 'Fire', lat: 30.3100, lng: 78.0300, severity: 'Medium', status: 'Contained', metadata: { area: '20acres' } }
];

const hospitals = [
  { name: 'Max Super Speciality Hospital', lat: 30.3541, lng: 78.0773, total_beds: 500, available_beds: 42, oxygen: 1200.5 },
  { name: 'Doon Medical College Hospital', lat: 30.3142, lng: 78.0368, total_beds: 200, available_beds: 15, oxygen: 450.0 },
  { name: 'Synergy Institute of Medical Sciences', lat: 30.3102, lng: 78.0093, total_beds: 300, available_beds: 88, oxygen: 800.0 }
];

async function setup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- Database Setup Started ---');

    // 1. Drop existing tables for a clean slate
    await client.query('DROP TABLE IF EXISTS suppliesCASCADE');
    await client.query('DROP TABLE IF EXISTS hospitals CASCADE');
    await client.query('DROP TABLE IF EXISTS incidents CASCADE');
    console.log('Tables cleared');

    // 2. Create Tables
    await client.query(`
      CREATE TABLE incidents (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        severity VARCHAR(20) DEFAULT 'Low',
        status VARCHAR(20) DEFAULT 'Active',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE hospitals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        total_beds INTEGER DEFAULT 0,
        available_beds INTEGER DEFAULT 0,
        oxygen_level FLOAT DEFAULT 0.0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE supplies (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(100) NOT NULL,
        quantity INTEGER NOT NULL,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        hospital_id INTEGER REFERENCES hospitals(id),
        status VARCHAR(20) DEFAULT 'Available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tables created');

    // 3. Seed Data
    for (const inc of incidents) {
      await client.query(
        'INSERT INTO incidents (type, latitude, longitude, severity, status, metadata) VALUES ($1, $2, $3, $4, $5, $6)',
        [inc.type, inc.lat, inc.lng, inc.severity, inc.status, JSON.stringify(inc.metadata)]
      );
    }

    for (const hosp of hospitals) {
      await client.query(
        'INSERT INTO hospitals (name, latitude, longitude, total_beds, available_beds, oxygen_level) VALUES ($1, $2, $3, $4, $5, $6)',
        [hosp.name, hosp.lat, hosp.lng, hosp.total_beds, hosp.available_beds, hosp.oxygen]
      );
    }

    const hospResult = await client.query('SELECT id FROM hospitals WHERE name = $1', ['Max Super Speciality Hospital']);
    const cityHospId = hospResult.rows[0].id;

    await client.query(
      'INSERT INTO supplies (item_name, quantity, status, hospital_id) VALUES ($1, $2, $3, $4)',
      ['Medical Kits', 200, 'Shipped', cityHospId]
    );

    console.log('Data seeded successfully');
    await client.end();
    console.log('--- Setup Complete ---');
  } catch (err) {
    console.error('Setup failed:', err);
    process.exit(1);
  }
}

setup();
