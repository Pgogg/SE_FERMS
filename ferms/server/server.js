// server.js — Entry point: loads env, creates HTTP server, attaches Socket.IO, and starts listening
'use strict';

require('dotenv').config();

const http = require('http');
const app  = require('./src/app');
const { initSockets } = require('./src/sockets');
const sequelize        = require('./src/config/db');

const PORT = process.env.PORT || 4000;

// Create the HTTP server from the Express app so Socket.IO can share it
const httpServer = http.createServer(app);

// Attach Socket.IO
initSockets(httpServer);

// Authenticate the database connection, then start listening
sequelize
  .authenticate()
  .then(() => {
    console.log('[DB] Connection established successfully.');
    httpServer.listen(PORT, () => {
      console.log(`[FERMS] Server running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
    });
  })
  .catch((err) => {
    console.error('[DB] Unable to connect to the database:', err.message);
    process.exit(1);
  });
