/**
 * Debounce function to limit the rate of function calls
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Format currency value
 */
export const formatCurrency = (value, currency = 'INR') => {
  if (value === null || value === undefined) return '-';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Format date to readable format
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength = 30) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Parse query string to object
 */
export const parseQueryString = (queryString) => {
  const params = new URLSearchParams(queryString);
  const result = {};
  
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  
  return result;
};

/**
 * Build query string from object
 */
export const buildQueryString = (params) => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          queryParams.append(key, value.join(','));
        }
      } else {
        queryParams.append(key, value);
      }
    }
  });
  
  return queryParams.toString();
};

/**
 * Deep clone an object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj) => {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

/**
 * Highlight search term in text
 * Returns an array of { text, highlighted } objects for rendering
 */
export const highlightText = (text, searchTerm) => {
  if (!text || !searchTerm || searchTerm.trim() === '') {
    return [{ text, highlighted: false }];
  }
  
  const normalizedText = String(text);
  const normalizedSearch = searchTerm.toLowerCase().trim();
  const lowerText = normalizedText.toLowerCase();
  
  const parts = [];
  let lastIndex = 0;
  let index = lowerText.indexOf(normalizedSearch);
  
  while (index !== -1) {
    // Add non-highlighted part before match
    if (index > lastIndex) {
      parts.push({ text: normalizedText.slice(lastIndex, index), highlighted: false });
    }
    
    // Add highlighted match
    parts.push({ 
      text: normalizedText.slice(index, index + normalizedSearch.length), 
      highlighted: true 
    });
    
    lastIndex = index + normalizedSearch.length;
    index = lowerText.indexOf(normalizedSearch, lastIndex);
  }
  
  // Add remaining text
  if (lastIndex < normalizedText.length) {
    parts.push({ text: normalizedText.slice(lastIndex), highlighted: false });
  }
  
  return parts.length > 0 ? parts : [{ text: normalizedText, highlighted: false }];
};
