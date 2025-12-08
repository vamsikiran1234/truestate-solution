// Vercel Serverless API catch-all handler for Express app
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });

const app = require('../backend/src/index.js');

// Export the Express app as a Vercel serverless function
module.exports = app;
