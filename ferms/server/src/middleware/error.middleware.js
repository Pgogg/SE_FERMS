// middleware/error.middleware.js — Centralised error handler that formats and returns JSON error responses
module.exports = (err, req, res, next) => res.status(500).json({ error: err.message });
