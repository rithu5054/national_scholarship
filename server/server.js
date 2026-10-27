const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Route Registrations
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/scholarships', require('./routes/scholarshipRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/officer', require('./routes/officerRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'ScholarTrack Backend API',
    time: new Date().toISOString(),
  });
});

// Serve static client production build if available
const path = require('path');
const fs = require('fs');
const clientDistPath = path.join(__dirname, '../client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ScholarTrack Error Handler]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
  });
});

const startServer = async () => {
  await connectDB();

  // Run seed check or initialization if DB is empty
  const seedDatabase = require('./scripts/seed');
  await seedDatabase();

  app.listen(PORT, () => {
    console.log(`[ScholarTrack] Server listening on http://localhost:${PORT}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app;
