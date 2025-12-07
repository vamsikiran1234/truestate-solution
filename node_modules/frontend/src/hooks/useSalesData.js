import { useState, useCallback } from 'react';
import { salesApi } from '../services/api';

/**
 * Custom hook for managing sales data fetching
 */
export function useSalesData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  /**
   * Fetch sales data with filters, sorting, and pagination
   */
  const refetch = useCallback(async (filters, sorting, pagination) => {
    setLoading(true);
    setError(null);

    try {
      const response = await salesApi.getSales({
        search: filters.search,
        regions: filters.regions.join(','),
        genders: filters.genders.join(','),
        minAge: filters.minAge,
        maxAge: filters.maxAge,
        categories: filters.categories.join(','),
        tags: filters.tags.join(','),
        paymentMethods: filters.paymentMethods.join(','),
        startDate: filters.startDate,
        endDate: filters.endDate,
        sortBy: sorting.sortBy,
        sortOrder: sorting.sortOrder,
        page: pagination.page,
        limit: pagination.limit
      });

      if (response.success) {
        setData(response.data);
        setTotalItems(response.pagination.totalItems);
        setTotalPages(response.pagination.totalPages);
      } else {
        throw new Error(response.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(err.message || 'An error occurred while fetching data');
      setData([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch filter options
   */
  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await salesApi.getFilterOptions();
      if (response.success) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Error fetching filter options:', err);
      return null;
    }
  }, []);

  return {
    data,
    loading,
    error,
    totalItems,
    totalPages,
    refetch,
    fetchFilterOptions
  };
}
