// Vercel invokes the Express app directly; no listen() or background jobs.
module.exports = require('../escape-room-backend/src/app');
