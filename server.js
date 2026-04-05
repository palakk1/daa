require('dotenv').config(); // ✅ Must be first before any other imports

const express = require('express');
const cors = require('cors');
const { initModels } = require('./backend/src/models/PostgresModels');
const db = require('./backend/src/config/database');

// Route Imports
const disasterRoutes = require('./backend/src/modules/disaster/disasterRoutes');
const logisticsRoutes = require('./backend/src/modules/medical-logistics/logisticsRoutes');
const hospitalRoutes = require('./backend/src/modules/hospital-network/networkRoutes');
const triageRoutes = require('./backend/src/modules/emergency-triage/triageRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize PostgreSQL models
initModels();

// Health Check
app.get('/', (req, res) => {
    res.json({
        message: 'MediMatch Umbrella API is running',
        modules: ['Disaster Management', 'Medical Logistics', 'Hospital Network', 'Emergency Triage']
    });
});

// Mount Routes
app.use('/api/disaster', disasterRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/triage', triageRoutes);

app.listen(PORT, () => {
    console.log(`MediMatch Server running on port ${PORT}`);
});
