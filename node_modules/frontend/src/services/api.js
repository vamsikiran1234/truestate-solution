import axios from 'axios';

// API base URL - use environment variable for production or /api for local development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds timeout for large dataset
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('[API] Response error:', error);
    
    if (error.response) {
      // Server responded with error status
      const errorMessage = error.response.data?.message || error.response.statusText;
      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      // Request made but no response
      return Promise.reject(new Error('No response from server. Please check your connection.'));
    } else {
      // Request setup error
      return Promise.reject(new Error('Request failed. Please try again.'));
    }
  }
);

/**
 * Sales API endpoints
 */
export const salesApi = {
  /**
   * Get sales data with filters, sorting, and pagination
   */
  getSales: async (params) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    return apiClient.get(`/sales?${queryParams.toString()}`);
  },

  /**
   * Get available filter options
   */
  getFilterOptions: async () => {
    return apiClient.get('/sales/filters');
  },

  /**
   * Get sales statistics
   */
  getStats: async () => {
    return apiClient.get('/sales/stats');
  },

  /**
   * Get filtered statistics
   */
  getFilteredStats: async (params) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    return apiClient.get(`/sales/filtered-stats?${queryParams.toString()}`);
  }
};

export default apiClient;
