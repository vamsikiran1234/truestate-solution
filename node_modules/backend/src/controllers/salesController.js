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

    const result = await salesService.getSalesData(filters, sorting, pagination);

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
    const options = await salesService.getFilterOptions();
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
    const stats = await salesService.getStats();
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

    const stats = await salesService.getFilteredStats(filters);
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

/**
 * Export sales data as CSV (streaming for large datasets)
 */
const exportSales = async (req, res) => {
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
      endDate = '',
      sortBy = 'date',
      sortOrder = 'desc'
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

    // Get all data (no pagination for export)
    const pagination = { page: 1, limit: 1000000 };
    
    console.log('Starting CSV export...');
    console.time('Export time');
    
    const result = salesService.getSalesData(filters, sorting, pagination);
    
    console.log(`Exporting ${result.data.length} records as CSV`);

    // Set headers for CSV download
    const filename = `sales_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write CSV header
    const headers = [
      'Date', 'Customer Name', 'Phone Number', 'Age', 'Gender', 'Region',
      'Product Name', 'Brand', 'Category', 'Quantity', 'Unit Price',
      'Discount %', 'Final Amount', 'Payment Method', 'Status', 'Tags'
    ];
    res.write(headers.join(',') + '\n');

    // Helper function to format date
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      } catch {
        return '';
      }
    };

    // Helper to escape CSV values
    const escapeCSV = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Write data in chunks to avoid memory issues
    const chunkSize = 10000;
    for (let i = 0; i < result.data.length; i += chunkSize) {
      const chunk = result.data.slice(i, i + chunkSize);
      const lines = chunk.map(item => [
        escapeCSV(formatDate(item.date)),
        escapeCSV(item.customerName),
        escapeCSV("'" + (item.phoneNumber || '')), // Apostrophe for Excel text
        escapeCSV(item.age),
        escapeCSV(item.gender),
        escapeCSV(item.customerRegion),
        escapeCSV(item.productName),
        escapeCSV(item.brand),
        escapeCSV(item.productCategory),
        escapeCSV(item.quantity),
        escapeCSV(item.pricePerUnit),
        escapeCSV(item.discountPercentage),
        escapeCSV(item.finalAmount),
        escapeCSV(item.paymentMethod),
        escapeCSV(item.orderStatus),
        escapeCSV(item.tags)
      ].join(',')).join('\n');
      
      res.write(lines + '\n');
    }

    console.timeEnd('Export time');
    res.end();
    
  } catch (error) {
    console.error('Error exporting sales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export sales data',
      message: error.message
    });
  }
};

module.exports = {
  getSales,
  getFilterOptions,
  getStats,
  getFilteredStats,
  exportSales
};
