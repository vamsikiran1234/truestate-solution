import { useState, useCallback } from 'react';

/**
 * Initial filter state
 */
const initialFilters = {
  search: '',
  regions: [],
  genders: [],
  minAge: null,
  maxAge: null,
  categories: [],
  tags: [],
  paymentMethods: [],
  startDate: null,
  endDate: null
};

/**
 * Initial sorting state
 */
const initialSorting = {
  sortBy: 'date',
  sortOrder: 'desc'
};

/**
 * Initial pagination state
 */
const initialPagination = {
  page: 1,
  limit: 10
};

/**
 * Custom hook for managing filter, sorting, and pagination state
 */
export function useFilters() {
  const [filters, setFilters] = useState(initialFilters);
  const [sorting, setSorting] = useState(initialSorting);
  const [pagination, setPagination] = useState(initialPagination);

  /**
   * Update search term (also resets page to 1)
   */
  const updateSearch = useCallback((searchTerm) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm
    }));
    // Reset to first page when searching
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  }, []);

  /**
   * Update a specific filter (also resets page to 1)
   */
  const updateFilter = useCallback((filterName, values) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: values
    }));
    // Reset to first page when filtering
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  }, []);

  /**
   * Update age range filter (also resets page to 1)
   */
  const updateAgeRange = useCallback((minAge, maxAge) => {
    setFilters(prev => ({
      ...prev,
      minAge,
      maxAge
    }));
    // Reset to first page when filtering
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  }, []);

  /**
   * Update date range filter (also resets page to 1)
   */
  const updateDateRange = useCallback((startDate, endDate) => {
    setFilters(prev => ({
      ...prev,
      startDate,
      endDate
    }));
    // Reset to first page when filtering
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  /**
   * Update sorting
   */
  const updateSorting = useCallback((sortBy, sortOrder) => {
    setSorting({ sortBy, sortOrder });
  }, []);

  /**
   * Update current page
   */
  const updatePage = useCallback((page) => {
    setPagination(prev => ({
      ...prev,
      page
    }));
  }, []);

  /**
   * Update items per page
   */
  const updateLimit = useCallback((limit) => {
    setPagination(prev => ({
      ...prev,
      limit,
      page: 1 // Reset to first page when changing limit
    }));
  }, []);

  return {
    filters,
    updateSearch,
    updateFilter,
    updateAgeRange,
    updateDateRange,
    clearFilters,
    sorting,
    updateSorting,
    pagination,
    updatePage,
    updateLimit
  };
}
