import axios from 'axios';

// API base URL - use /api for local development (Vite proxy handles routing)
// In production, VITE_API_URL should be set to the full backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Store for cancellation tokens
let currentSalesRequest = null;
let currentStatsRequest = null;

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Reduced to 30 seconds for faster feedback
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
   * Automatically cancels previous pending requests
   */
  getSales: async (params) => {
    // Cancel previous request if still pending
    if (currentSalesRequest) {
      currentSalesRequest.cancel('New request initiated');
    }
    
    // Create new cancel token
    currentSalesRequest = axios.CancelToken.source();
    
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    try {
      const result = await apiClient.get(`/sales?${queryParams.toString()}`, {
        cancelToken: currentSalesRequest.token
      });
      currentSalesRequest = null;
      return result;
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('[API] Request cancelled:', error.message);
        throw new Error('Request cancelled');
      }
      throw error;
    }
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
   * Automatically cancels previous pending requests
   */
  getFilteredStats: async (params) => {
    // Cancel previous request if still pending
    if (currentStatsRequest) {
      currentStatsRequest.cancel('New request initiated');
    }
    
    // Create new cancel token
    currentStatsRequest = axios.CancelToken.source();
    
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    try {
      const result = await apiClient.get(`/sales/filtered-stats?${queryParams.toString()}`, {
        cancelToken: currentStatsRequest.token
      });
      currentStatsRequest = null;
      return result;
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('[API] Stats request cancelled:', error.message);
        throw new Error('Request cancelled');
      }
      throw error;
    }
  }
};

export default apiClient;
