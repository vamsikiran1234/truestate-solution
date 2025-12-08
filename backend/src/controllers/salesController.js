const salesService = require('../services/salesService');

/**
 * Parse comma-separated filter values to array
 * Handles empty strings and trims whitespace
 */
const parseArrayFilter = (value) => {
  if (!value || typeof value !== 'string') return [];
  return value.split(',').map(v => v.trim()).filter(v => v.length > 0);
};

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
      search: search ? search.trim() : '',
      regions: parseArrayFilter(regions),
      genders: parseArrayFilter(genders),
      minAge: minAge ? parseInt(minAge, 10) : null,
      maxAge: maxAge ? parseInt(maxAge, 10) : null,
      categories: parseArrayFilter(categories),
      tags: parseArrayFilter(tags),
      paymentMethods: parseArrayFilter(paymentMethods),
      startDate: startDate || null,
      endDate: endDate || null
    };

    // Debug log - show raw query params and parsed filters
    console.log('[Controller getSales] Raw query:', req.query);
    console.log('[Controller getSales] Parsed filters:', JSON.stringify(filters));
    console.log('[Controller getSales] regions array:', filters.regions, 'length:', filters.regions.length);
    console.log('[Controller getSales] genders array:', filters.genders, 'length:', filters.genders.length);

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
    
    // Handle specific errors with appropriate status codes
    if (error.message?.includes('timeout')) {
      return res.status(408).json({
        success: false,
        error: 'Query timeout',
        message: error.message,
        hint: 'Try using filters to narrow results or navigate to an earlier page'
      });
    }
    
    if (error.message?.includes('Page number too high')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid page number',
        message: error.message
      });
    }
    
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
 * Export sales data as CSV (streaming for large datasets up to 1M records)
 */
const exportSales = async (req, res) => {
  try {
    // Log raw query params for debugging
    console.log('=== EXPORT RECEIVED ===');
    console.log('Raw query params:', req.query);
    
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

    // Use shared parseArrayFilter function (defined at top of file)
    const filters = {
      search: search ? search.trim() : '',
      regions: parseArrayFilter(regions),
      genders: parseArrayFilter(genders),
      minAge: minAge ? parseInt(minAge, 10) : null,
      maxAge: maxAge ? parseInt(maxAge, 10) : null,
      categories: parseArrayFilter(categories),
      tags: parseArrayFilter(tags),
      paymentMethods: parseArrayFilter(paymentMethods),
      startDate: startDate || null,
      endDate: endDate || null
    };

    // Debug log for filter parsing
    console.log('[exportSales] Parsed filters:', JSON.stringify(filters));

    const sorting = {
      sortBy,
      sortOrder: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc'
    };

    // Check if any filters are active
    const hasActiveFilters = filters.search || 
      filters.regions.length > 0 || 
      filters.genders.length > 0 || 
      filters.categories.length > 0 || 
      filters.tags.length > 0 || 
      filters.paymentMethods.length > 0 ||
      filters.minAge || filters.maxAge ||
      filters.startDate || filters.endDate;
    
    console.log('Has active filters:', hasActiveFilters);
    console.log('=== END EXPORT RECEIVED ===');
    
    console.time('Export time');

    // Set headers for CSV download immediately (streaming response)
    const filename = `sales_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');

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

    // Convert data items to CSV lines
    const convertToCSVLines = (items) => {
      if (!items || items.length === 0) return '';
      return items.map(item => [
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
    };

    // Use the streaming export function
    const totalExported = await salesService.exportSalesData(filters, sorting, async (batch) => {
      const csvLines = convertToCSVLines(batch);
      if (csvLines) {
        res.write(csvLines + '\n');
      }
    });

    console.log(`Export completed: ${totalExported} total records`);
    console.timeEnd('Export time');
    res.end();
    
  } catch (error) {
    console.error('Error exporting sales:', error);
    // If headers haven't been sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to export sales data',
        message: error.message
      });
    } else {
      // Headers already sent, just end the response
      res.end();
    }
  }
};

/**
 * Get search cache status
 */
const getSearchStatus = async (req, res) => {
  try {
    const status = await salesService.getSearchStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting search status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get search status',
      message: error.message
    });
  }
};

module.exports = {
  getSales,
  getFilterOptions,
  getStats,
  getFilteredStats,
  exportSales,
  getSearchStatus
};
