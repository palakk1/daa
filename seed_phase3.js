const db = require('./backend/src/config/database');

const seed = async () => {
    try {
        console.log('Seeding Phase 3 data...');

        // 1. Clear existing Phase 3 data (Optional/Safe for dev)
        // await db.query('DELETE FROM doctors');
        // await db.query('DELETE FROM hospitals');

        // 2. Seed Hospitals
        const hospitals = [
            ['Max Super Speciality', 30.3541, 78.0773, 100, 2, 85.0],
            ['Doon Medical College', 30.3142, 78.0368, 200, 15, 90.0],
            ['Synergy Institute', 30.3102, 78.0093, 150, 20, 75.0]
        ];

        for (const h of hospitals) {
            await db.query(
                'INSERT INTO hospitals (name, latitude, longitude, total_beds, available_beds, oxygen_level) VALUES ($1, $2, $3, $4, $5, $6)',
                h
            );
        }
        console.log('Hospitals seeded');

        // 3. Seed Doctors
        const hospResult = await db.query('SELECT id FROM hospitals LIMIT 1');
        if (hospResult.rows.length > 0) {
            const hospId = hospResult.rows[0].id;
            const doctors = [
                ['Dr. Smith', 'Emergency', hospId, true, 10],
                ['Dr. Jones', 'Cardiology', hospId, true, 15],
                ['Dr. Taylor', 'General Medicine', hospId, true, 8]
            ];

            for (const d of doctors) {
                await db.query(
                    'INSERT INTO doctors (name, specialty, hospital_id, availability, years_experience) VALUES ($1, $2, $3, $4, $5)',
                    d
                );
            }
            console.log('Doctors seeded');
        }

        console.log('Seeding complete');
    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        process.exit(0);
    }
};

seed();
