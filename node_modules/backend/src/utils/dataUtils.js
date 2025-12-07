/**
 * Data utility functions for search, filter, sort, and pagination
 */

const { searchIndex } = require('./searchIndex');

/**
 * Build search index for faster search (call once after data load)
 */
const buildSearchIndex = (data) => {
  searchIndex.build(data);
};

/**
 * Clear search index
 */
const clearSearchIndex = () => {
  searchIndex.clear();
};

/**
 * Apply case-insensitive search on Customer Name and Phone Number
 * Uses Trie-based index for O(m) search instead of O(n) linear scan
 */
const applySearch = (data, searchTerm) => {
  if (!searchTerm || searchTerm.trim().length === 0) return data;
  
  const matchingIndices = searchIndex.search(searchTerm, data);
  
  // If null returned, return all data (empty query)
  if (matchingIndices === null) return data;
  
  // If index returned results, map indices to records
  return matchingIndices.map(i => data[i]);
};

/**
 * Apply all filters to data - OPTIMIZED SINGLE PASS
 * Instead of multiple filter() calls, we iterate once and check all conditions
 */
const applyFilters = (data, filters) => {
  // Pre-process filter values for faster comparison
  const hasRegions = filters.regions && filters.regions.length > 0;
  const hasGenders = filters.genders && filters.genders.length > 0;
  const hasCategories = filters.categories && filters.categories.length > 0;
  const hasTags = filters.tags && filters.tags.length > 0;
  const hasPaymentMethods = filters.paymentMethods && filters.paymentMethods.length > 0;
  const hasMinAge = filters.minAge !== null && !isNaN(filters.minAge);
  const hasMaxAge = filters.maxAge !== null && !isNaN(filters.maxAge);
  
  // Pre-normalize filter values to lowercase Sets for O(1) lookup
  const regionsSet = hasRegions ? new Set(filters.regions.map(r => r.toLowerCase())) : null;
  const gendersSet = hasGenders ? new Set(filters.genders.map(g => g.toLowerCase())) : null;
  const categoriesSet = hasCategories ? new Set(filters.categories.map(c => c.toLowerCase())) : null;
  const tagsSet = hasTags ? new Set(filters.tags.map(t => t.toLowerCase())) : null;
  const paymentMethodsSet = hasPaymentMethods ? new Set(filters.paymentMethods.map(m => m.toLowerCase())) : null;
  
  // Pre-parse date filters
  let startDateTime = null;
  let endDateTime = null;
  
  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    if (!isNaN(startDate.getTime())) {
      startDateTime = startDate.getTime();
    }
  }
  
  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    if (!isNaN(endDate.getTime())) {
      endDate.setHours(23, 59, 59, 999);
      endDateTime = endDate.getTime();
    }
  }
  
  // Check if any filters are active
  const hasAnyFilter = hasRegions || hasGenders || hasCategories || hasTags || 
                       hasPaymentMethods || hasMinAge || hasMaxAge || 
                       startDateTime !== null || endDateTime !== null;
  
  // If no filters, return data as-is
  if (!hasAnyFilter) return data;
  
  // Single pass filter
  const results = [];
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    let match = true;
    
    // Check Region
    if (match && hasRegions) {
      const region = (item.customerRegion || '').toLowerCase();
      match = regionsSet.has(region);
    }
    
    // Check Gender
    if (match && hasGenders) {
      const gender = (item.gender || '').toLowerCase();
      match = gendersSet.has(gender);
    }
    
    // Check Age Range
    if (match && hasMinAge) {
      match = item.age >= filters.minAge;
    }
    if (match && hasMaxAge) {
      match = item.age <= filters.maxAge;
    }
    
    // Check Category
    if (match && hasCategories) {
      const category = (item.productCategory || '').toLowerCase();
      match = categoriesSet.has(category);
    }
    
    // Check Tags
    if (match && hasTags) {
      if (!item.tags) {
        match = false;
      } else {
        const itemTags = item.tags.split(',').map(t => t.trim().toLowerCase());
        match = itemTags.some(tag => tagsSet.has(tag));
      }
    }
    
    // Check Payment Method
    if (match && hasPaymentMethods) {
      const method = (item.paymentMethod || '').toLowerCase();
      match = paymentMethodsSet.has(method);
    }
    
    // Check Date Range
    if (match && (startDateTime !== null || endDateTime !== null)) {
      const itemDate = new Date(item.date);
      if (isNaN(itemDate.getTime())) {
        match = false;
      } else {
        const itemTime = itemDate.getTime();
        if (startDateTime !== null && itemTime < startDateTime) {
          match = false;
        }
        if (match && endDateTime !== null && itemTime > endDateTime) {
          match = false;
        }
      }
    }
    
    if (match) {
      results.push(item);
    }
  }
  
  return results;
};

/**
 * Apply sorting to data
 */
const applySorting = (data, sorting) => {
  const { sortBy, sortOrder } = sorting;
  const sortedData = [...data];
  
  sortedData.sort((a, b) => {
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
  });
  
  return sortedData;
};

/**
 * Apply pagination to data
 */
const applyPagination = (data, pagination) => {
  const { page, limit } = pagination;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return data.slice(startIndex, endIndex);
};

/**
 * Extract unique values from a field
 */
const extractUniqueValues = (data, field) => {
  const values = new Set();
  data.forEach(item => {
    if (item[field]) {
      values.add(item[field]);
    }
  });
  return Array.from(values).sort();
};

/**
 * Parse numeric value safely
 */
const parseNumber = (value, defaultValue = 0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Parse integer value safely
 */
const parseInt = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

module.exports = {
  applySearch,
  applyFilters,
  applySorting,
  applyPagination,
  extractUniqueValues,
  parseNumber,
  parseInt,
  buildSearchIndex,
  clearSearchIndex
};
