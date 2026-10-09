// server.js — Entry point: loads env, creates HTTP server, attaches Socket.IO, and starts listening
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`FERMS server running on port ${PORT}`));
