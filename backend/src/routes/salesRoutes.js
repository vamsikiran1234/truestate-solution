const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

// GET /api/sales - Get paginated sales with search, filter, sort
router.get('/', salesController.getSales);

// GET /api/sales/filters - Get available filter options
router.get('/filters', salesController.getFilterOptions);

// GET /api/sales/stats - Get sales statistics (global)
router.get('/stats', salesController.getStats);

// GET /api/sales/filtered-stats - Get statistics for filtered data
router.get('/filtered-stats', salesController.getFilteredStats);

module.exports = router;
