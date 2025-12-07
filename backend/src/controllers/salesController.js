const salesService = require('../services/salesService');

/**
 * Get sales data with search, filter, sort, and pagination
 */
const getSales = async (req, res) => {
  try {
    const {
      // Search
      search = '',
      
      // Filters
      regions = '',
      genders = '',
      minAge = '',
      maxAge = '',
      categories = '',
      tags = '',
      paymentMethods = '',
      startDate = '',
      endDate = '',
      
      // Sorting
      sortBy = 'date',
      sortOrder = 'desc',
      
      // Pagination
      page = 1,
      limit = 10
    } = req.query;

    const filters = {
      search: search.trim(),
      regions: regions ? regions.split(',').map(r => r.trim()) : [],
      genders: genders ? genders.split(',').map(g => g.trim()) : [],
      minAge: minAge ? parseInt(minAge, 10) : null,
      maxAge: maxAge ? parseInt(maxAge, 10) : null,
      categories: categories ? categories.split(',').map(c => c.trim()) : [],
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      paymentMethods: paymentMethods ? paymentMethods.split(',').map(p => p.trim()) : [],
      startDate: startDate || null,
      endDate: endDate || null
    };

    const sorting = {
      sortBy,
      sortOrder: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc'
    };

    // Allow up to 1M records for export
    const requestedLimit = parseInt(limit, 10) || 10;
    const pagination = {
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(1000000, Math.max(1, requestedLimit))
    };

    // Log for debugging large exports
    if (pagination.limit > 1000) {
      console.log(`Large export requested: limit=${pagination.limit}`);
    }

    const result = salesService.getSalesData(filters, sorting, pagination);

    // Log result size for debugging
    if (pagination.limit > 1000) {
      console.log(`Export result: ${result.data.length} records`);
    }

    res.json({
      success: true,
      data: result.data,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        itemsPerPage: result.itemsPerPage,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales data',
      message: error.message
    });
  }
};

/**
 * Get available filter options
 */
const getFilterOptions = async (req, res) => {
  try {
    const options = salesService.getFilterOptions();
    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filter options',
      message: error.message
    });
  }
};

/**
 * Get sales statistics
 */
const getStats = async (req, res) => {
  try {
    const stats = salesService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
};

/**
 * Get filtered statistics based on current filters
 */
const getFilteredStats = async (req, res) => {
  try {
    const {
      search = '',
      regions = '',
      genders = '',
      minAge = '',
      maxAge = '',
      categories = '',
      tags = '',
      paymentMethods = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const filters = {
      search: search.trim(),
      regions: regions ? regions.split(',').map(r => r.trim()) : [],
      genders: genders ? genders.split(',').map(g => g.trim()) : [],
      minAge: minAge ? parseInt(minAge, 10) : null,
      maxAge: maxAge ? parseInt(maxAge, 10) : null,
      categories: categories ? categories.split(',').map(c => c.trim()) : [],
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      paymentMethods: paymentMethods ? paymentMethods.split(',').map(p => p.trim()) : [],
      startDate: startDate || null,
      endDate: endDate || null
    };

    const stats = salesService.getFilteredStats(filters);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching filtered stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filtered statistics',
      message: error.message
    });
  }
};

module.exports = {
  getSales,
  getFilterOptions,
  getStats,
  getFilteredStats
};
