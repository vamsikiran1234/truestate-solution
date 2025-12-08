const { getSalesData, getPrecomputedFilterOptions } = require('./dataService');
const { isUsingDatabase, getFilteredSalesFromDB, getFilterOptionsFromDB, getAllSalesFromDB, exportSalesFromDB } = require('./databaseService');
const { 
  applySearch, 
  applyFilters, 
  applySorting, 
  applyPagination,
  extractUniqueValues 
} = require('../utils/dataUtils');

// Cache for filter options and stats (computed once after data load)
let filterOptionsCache = null;
let statsCache = null;
let lastDataLength = 0;

/**
 * Invalidate cache when data changes
 */
const invalidateCache = () => {
  filterOptionsCache = null;
  statsCache = null;
};

/**
 * Check if cache needs refresh
 */
const checkCacheValidity = () => {
  const currentLength = getSalesData().length;
  if (currentLength !== lastDataLength) {
    lastDataLength = currentLength;
    invalidateCache();
  }
};

/**
 * Check if any filters are active
 */
const hasActiveFilters = (filters) => {
  return (
    (filters.regions && filters.regions.length > 0) ||
    (filters.genders && filters.genders.length > 0) ||
    (filters.categories && filters.categories.length > 0) ||
    (filters.tags && filters.tags.length > 0) ||
    (filters.paymentMethods && filters.paymentMethods.length > 0) ||
    (filters.minAge !== null && !isNaN(filters.minAge)) ||
    (filters.maxAge !== null && !isNaN(filters.maxAge)) ||
    filters.startDate ||
    filters.endDate
  );
};

/**
 * Get filtered, sorted, and paginated sales data
 * OPTIMIZED: Uses database when available, otherwise falls back to CSV
 */
const getSalesDataFiltered = async (filters, sorting, pagination) => {
  // Debug log
  console.log('[SalesService] getSalesDataFiltered called');
  console.log('[SalesService] Filters received:', JSON.stringify(filters));
  
  // If using database, delegate to database service
  if (isUsingDatabase()) {
    console.log('[SalesService] Delegating to database query');
    return await getFilteredSalesFromDB(filters, sorting, pagination);
  }
  
  // Otherwise use CSV in-memory processing
  console.time('Total query time');
  
  let data = getSalesData();
  console.log(`Starting with ${data.length} records`);
  
  // Apply search
  if (filters.search) {
    console.time('Search time');
    data = applySearch(data, filters.search);
    console.timeEnd('Search time');
    console.log(`After search: ${data.length} records`);
  }
  
  // Apply filters
  console.time('Filter time');
  data = applyFilters(data, filters);
  console.timeEnd('Filter time');
  console.log(`After filters: ${data.length} records`);
  
  // Get total count before pagination
  const totalItems = data.length;
  
  // Apply sorting - OPTIMIZE: Skip if using default sort (date desc) since data is pre-sorted
  console.time('Sort time');
  const isDefaultSort = sorting.sortBy === 'date' && sorting.sortOrder === 'desc';
  
  if (isDefaultSort && !filters.search && !hasActiveFilters(filters)) {
    // Data is already sorted by date desc, no need to re-sort
    console.log('Using pre-sorted data (date desc)');
  } else if (data.length <= 50000) {
    // Full sort for smaller datasets
    data = applySorting(data, sorting);
  } else {
    // For large datasets (>50K), sorting is expensive
    // We still need to sort but log a warning
    console.log(`Sorting ${data.length} records...`);
    data = applySorting(data, sorting);
  }
  console.timeEnd('Sort time');
  
  // Apply pagination
  const paginatedData = applyPagination(data, pagination);
  
  const totalPages = Math.ceil(totalItems / pagination.limit);
  
  console.timeEnd('Total query time');
  
  return {
    data: paginatedData,
    currentPage: pagination.page,
    totalPages,
    totalItems,
    itemsPerPage: pagination.limit,
    hasNextPage: pagination.page < totalPages,
    hasPrevPage: pagination.page > 1
  };
};

/**
 * Partial sorting for large datasets - only sorts enough to get current page
 */
const applyPartialSorting = (data, sorting, pagination) => {
  const { sortBy, sortOrder } = sorting;
  const { page, limit } = pagination;
  const neededElements = page * limit;
  
  // For first few pages, use partial sort (heap-based selection)
  if (neededElements <= 1000) {
    return getTopN(data, neededElements, sortBy, sortOrder);
  }
  
  // For later pages, fall back to full sort
  return applySorting(data, sorting);
};

/**
 * Get top N elements efficiently without full sort
 */
const getTopN = (data, n, sortBy, sortOrder) => {
  const compareFn = getCompareFn(sortBy, sortOrder);
  
  // Use a simple approach: sort and slice
  // For production, could use a heap-based algorithm
  const sorted = [...data].sort(compareFn);
  return sorted;
};

/**
 * Get comparison function for sorting
 */
const getCompareFn = (sortBy, sortOrder) => {
  return (a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        comparison = dateA.getTime() - dateB.getTime();
        break;
      case 'quantity':
        comparison = (a.quantity || 0) - (b.quantity || 0);
        break;
      case 'customerName':
        const nameA = (a.customerName || '').toLowerCase();
        const nameB = (b.customerName || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
        break;
      case 'finalAmount':
        comparison = (a.finalAmount || 0) - (b.finalAmount || 0);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  };
};

/**
 * Get available filter options from the dataset (uses precomputed values from startup)
 */
const getFilterOptions = async () => {
  // If using database, get from database
  if (isUsingDatabase()) {
    console.log('Getting filter options from database');
    return await getFilterOptionsFromDB();
  }
  
  // Use precomputed filter options from data load (instant)
  const precomputed = getPrecomputedFilterOptions();
  if (precomputed) {
    return precomputed;
  }
  
  // Fallback to computing (should rarely happen)
  checkCacheValidity();
  
  if (filterOptionsCache) {
    return filterOptionsCache;
  }
  
  console.log('Computing filter options (fallback - precomputed not available)...');
  const data = getSalesData();
  
  filterOptionsCache = {
    regions: extractUniqueValues(data, 'customerRegion'),
    genders: extractUniqueValues(data, 'gender'),
    categories: extractUniqueValues(data, 'productCategory'),
    tags: extractUniqueTags(data),
    paymentMethods: extractUniqueValues(data, 'paymentMethod'),
    ageRange: getAgeRange(data),
    dateRange: getDateRange(data)
  };
  
  return filterOptionsCache;
};

/**
 * Extract unique tags from data (tags can be comma-separated)
 */
const extractUniqueTags = (data) => {
  const tagsSet = new Set();
  data.forEach(item => {
    if (item.tags) {
      const tagList = item.tags.split(',').map(t => t.trim());
      tagList.forEach(tag => {
        if (tag) tagsSet.add(tag);
      });
    }
  });
  return Array.from(tagsSet).sort();
};

/**
 * Get age range from data (optimized for large datasets)
 */
const getAgeRange = (data) => {
  let min = Infinity;
  let max = -Infinity;
  
  for (let i = 0; i < data.length; i++) {
    const age = data[i].age;
    if (age > 0) {
      if (age < min) min = age;
      if (age > max) max = age;
    }
  }
  
  if (min === Infinity) return { min: 0, max: 100 };
  return { min, max };
};

/**
 * Get date range from data (optimized for large datasets)
 */
const getDateRange = (data) => {
  let minTime = Infinity;
  let maxTime = -Infinity;
  
  for (let i = 0; i < data.length; i++) {
    const dateStr = data[i].date;
    if (dateStr) {
      const date = new Date(dateStr);
      const time = date.getTime();
      if (!isNaN(time)) {
        if (time < minTime) minTime = time;
        if (time > maxTime) maxTime = time;
      }
    }
  }
  
  if (minTime === Infinity) {
    const today = new Date();
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    return {
      min: yearAgo.toISOString().split('T')[0],
      max: today.toISOString().split('T')[0]
    };
  }
  
  return {
    min: new Date(minTime).toISOString().split('T')[0],
    max: new Date(maxTime).toISOString().split('T')[0]
  };
};

/**
 * Get sales statistics (cached)
 */
const getStats = async () => {
  // If using database, get stats from RPC function
  if (isUsingDatabase()) {
    console.log('Getting stats from database');
    const stats = await getAllSalesFromDB();
    
    if (stats && stats.total_records !== undefined) {
      // Using RPC function result
      return {
        totalRecords: Number(stats.total_records) || 0,
        totalSales: Number(stats.total_sales) || 0,
        totalQuantity: Number(stats.total_quantity) || 0,
        totalDiscount: Number(stats.total_discount) || 0,
        averageOrderValue: Number(stats.average_order_value) || 0
      };
    } else if (stats && stats.count !== undefined) {
      // Fallback: only have count
      return {
        totalRecords: stats.count,
        totalSales: 0,
        totalQuantity: 0,
        totalDiscount: 0,
        averageOrderValue: 0
      };
    }
  }
  
  checkCacheValidity();
  
  if (statsCache) {
    return statsCache;
  }
  
  console.log('Computing stats (first time or cache invalidated)...');
  const data = getSalesData();
  
  const totalSales = data.reduce((sum, item) => sum + (item.finalAmount || 0), 0);
  const totalQuantity = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalDiscount = data.reduce((sum, item) => {
    const discount = (item.totalAmount || 0) - (item.finalAmount || 0);
    return sum + discount;
  }, 0);
  const averageOrderValue = data.length > 0 ? totalSales / data.length : 0;
  
  statsCache = {
    totalRecords: data.length,
    totalSales: Math.round(totalSales * 100) / 100,
    totalQuantity,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100
  };
  
  return statsCache;
};

/**
 * Get filtered statistics (computes stats for filtered data)
 */
const getFilteredStats = async (filters) => {
  // If using database, fetch filtered data and compute stats
  if (isUsingDatabase()) {
    console.log('Computing filtered stats from database');
    // Get all matching records without pagination
    const result = await getFilteredSalesFromDB(filters, { sortBy: 'date', sortOrder: 'desc' }, { page: 1, limit: 1000000 });
    const data = result.data;
    
    const totalSales = data.reduce((sum, item) => sum + (item.finalAmount || 0), 0);
    const totalQuantity = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalDiscount = data.reduce((sum, item) => {
      const discount = (item.totalAmount || 0) - (item.finalAmount || 0);
      return sum + discount;
    }, 0);
    const averageOrderValue = data.length > 0 ? totalSales / data.length : 0;
    
    return {
      totalRecords: data.length,
      totalSales: Math.round(totalSales * 100) / 100,
      totalQuantity,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100
    };
  }
  
  let data = getSalesData();
  
  // Apply search if present
  if (filters.search) {
    data = applySearch(data, filters.search);
  }
  
  // Apply filters
  data = applyFilters(data, filters);
  
  // Compute stats on filtered data
  const totalSales = data.reduce((sum, item) => sum + (item.finalAmount || 0), 0);
  const totalQuantity = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalDiscount = data.reduce((sum, item) => {
    const discount = (item.totalAmount || 0) - (item.finalAmount || 0);
    return sum + discount;
  }, 0);
  const averageOrderValue = data.length > 0 ? totalSales / data.length : 0;
  
  return {
    totalRecords: data.length,
    totalSales: Math.round(totalSales * 100) / 100,
    totalQuantity,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100
  };
};

/**
 * Export all sales data (streaming for large datasets)
 * @param {Object} filters - Filter criteria
 * @param {Object} sorting - Sort options
 * @param {Function} onBatch - Callback for each batch of data
 * @returns {Promise<number>} Total records exported
 */
const exportSalesData = async (filters, sorting, onBatch) => {
  // If using database, use the dedicated export function
  if (isUsingDatabase()) {
    console.log('Exporting from database with streaming');
    return await exportSalesFromDB(filters, sorting, onBatch);
  }
  
  // Otherwise use CSV in-memory processing
  console.log('Exporting from CSV data');
  let data = getSalesData();
  
  // Apply search
  if (filters.search) {
    data = applySearch(data, filters.search);
  }
  
  // Apply filters
  data = applyFilters(data, filters);
  
  // Apply sorting
  data = applySorting(data, sorting);
  
  // Send all data in batches
  const BATCH_SIZE = 10000;
  let totalExported = 0;
  
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    await onBatch(batch);
    totalExported += batch.length;
  }
  
  return totalExported;
};

module.exports = {
  getSalesData: getSalesDataFiltered,
  getFilterOptions,
  getStats,
  getFilteredStats,
  invalidateCache,
  exportSalesData
};
