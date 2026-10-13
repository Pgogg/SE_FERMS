// middleware/error.middleware.js — Centralised error handler that formats and returns JSON error responses
const { ValidationError, UniqueConstraintError } = require('sequelize');

// ---------------------------------------------------------------------------
// AppError — the only error class that should cross the service/controller
// boundary. Routes throw this; the handler formats it.
// ---------------------------------------------------------------------------
class AppError extends Error {
  /**
   * @param {number} status   HTTP status code
   * @param {string} code     Machine-readable error code (CONVENTIONS §3)
   * @param {string} message  Human-readable description
   * @param {object} [extra]  Additional fields merged into the error envelope
   */
  constructor(status, code, message, extra = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

// ---------------------------------------------------------------------------
// notFound — catches unknown routes and returns a 404 NOT_FOUND envelope
// ---------------------------------------------------------------------------
const notFound = (req, res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`));
};

// ---------------------------------------------------------------------------
// errorHandler — must be registered LAST in app.js (4-arg signature required)
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';

  // --- Sequelize validation failures → 400 VALIDATION_ERROR ---------------
  if (err instanceof ValidationError) {
    const details = err.errors.map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed.',
        details,
      },
    });
  }

  // --- Sequelize unique-constraint violations → 409 CONFLICT ---------------
  if (err instanceof UniqueConstraintError) {
    const fields = err.errors.map((e) => e.path);
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: `Duplicate value for: ${fields.join(', ')}.`,
        fields,
      },
    });
  }

  // --- AppError (our own structured errors) --------------------------------
  if (err instanceof AppError) {
    const { status, code, message, extra } = err;
    return res.status(status).json({
      error: { code, message, ...extra },
    });
  }

  // --- Unexpected errors ---------------------------------------------------
  const status = err.status || err.statusCode || 500;
  console.error('[Unhandled Error]', err);

  return res.status(status).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'An unexpected error occurred.' : err.message,
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
};

module.exports = { AppError, notFound, errorHandler };
