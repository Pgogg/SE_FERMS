// routes/auth.routes.js — Registers POST /auth/register and POST /auth/login endpoints
// ===== Parth =====
const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const { register, login, logout, me } = require('../controllers/auth.controller');

// POST /api/auth/register  (public — Citizen self-registration)
router.post('/register', register);

// POST /api/auth/login     (public)
router.post('/login', login);

// POST /api/auth/logout    (authenticated)
router.post('/logout', authenticate, logout);

// GET  /api/auth/me        (authenticated)
router.get('/me', authenticate, me);

module.exports = router;
