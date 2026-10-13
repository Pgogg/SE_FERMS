// app.js — Creates and configures the Express application with middleware and routes
'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const { notFound, errorHandler } = require('./middleware/error.middleware');

// --- Routes -----------------------------------------------------------------
const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const incidentRoutes     = require('./routes/incident.routes');
const stationRoutes      = require('./routes/station.routes');
const vehicleRoutes      = require('./routes/vehicle.routes');
const personnelRoutes    = require('./routes/personnel.routes');
const notificationRoutes = require('./routes/notification.routes');

// ---------------------------------------------------------------------------
const app = express();

// --- CORS -------------------------------------------------------------------
// CLIENT_URL may be a comma-separated list of allowed origins
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((u) => u.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin (e.g. curl, Postman) and listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// --- Body parsing -----------------------------------------------------------
app.use(express.json());

// --- Health check (unauthenticated) -----------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok', time: new Date().toISOString() } });
});

// --- API routers ------------------------------------------------------------
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/incidents',     incidentRoutes);
app.use('/api/stations',      stationRoutes);
app.use('/api/vehicles',      vehicleRoutes);
app.use('/api/personnel',     personnelRoutes);
app.use('/api/notifications', notificationRoutes);

// --- 404 for anything else --------------------------------------------------
app.use(notFound);

// --- Central error handler (must be last) -----------------------------------
app.use(errorHandler);

module.exports = app;
