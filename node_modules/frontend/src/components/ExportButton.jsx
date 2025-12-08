import { useState } from 'react';
import '../styles/ExportButton.css';

// API base URL for export - use relative path so Vite proxy handles it
const API_BASE_URL = '/api';

/**
 * Build export URL with filter parameters
 * @param {Object} filters - Current filter state
 * @param {Object} sorting - Current sorting state
 * @returns {string} Complete export URL with query parameters
 */
function buildExportUrl(filters, sorting) {
  const params = new URLSearchParams();
  
  // Search filter
  if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  
  // Array filters - regions, genders, categories, tags, paymentMethods
  if (Array.isArray(filters.regions) && filters.regions.length > 0) {
    params.set('regions', filters.regions.join(','));
  }
  
  if (Array.isArray(filters.genders) && filters.genders.length > 0) {
    params.set('genders', filters.genders.join(','));
  }
  
  if (Array.isArray(filters.categories) && filters.categories.length > 0) {
    params.set('categories', filters.categories.join(','));
  }
  
  if (Array.isArray(filters.tags) && filters.tags.length > 0) {
    params.set('tags', filters.tags.join(','));
  }
  
  if (Array.isArray(filters.paymentMethods) && filters.paymentMethods.length > 0) {
    params.set('paymentMethods', filters.paymentMethods.join(','));
  }
  
  // Numeric filters - minAge, maxAge
  if (filters.minAge !== null && filters.minAge !== undefined && filters.minAge !== '') {
    params.set('minAge', String(filters.minAge));
  }
  
  if (filters.maxAge !== null && filters.maxAge !== undefined && filters.maxAge !== '') {
    params.set('maxAge', String(filters.maxAge));
  }
  
  // Date filters
  if (filters.startDate) {
    params.set('startDate', filters.startDate);
  }
  
  if (filters.endDate) {
    params.set('endDate', filters.endDate);
  }
  
  // Sorting
  if (sorting && sorting.sortBy) {
    params.set('sortBy', sorting.sortBy);
  }
  
  if (sorting && sorting.sortOrder) {
    params.set('sortOrder', sorting.sortOrder);
  }
  
  const queryString = params.toString();
  return `${API_BASE_URL}/sales/export${queryString ? '?' + queryString : ''}`;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * ExportButton Component
 * Exports filtered sales data to CSV
 */
function ExportButton({ filters, sorting }) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const handleExport = async () => {
    // CRITICAL: Read filters and sorting directly from props at click time
    // This ensures we always have the latest values
    const currentFilters = filters || {
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
    
    const currentSorting = sorting || {
      sortBy: 'date',
      sortOrder: 'desc'
    };

    // Log for debugging
    console.log('========== EXPORT STARTED ==========');
    console.log('Current Filters:', JSON.stringify(currentFilters, null, 2));
    console.log('Current Sorting:', JSON.stringify(currentSorting, null, 2));
    
    // Build the export URL
    const exportUrl = buildExportUrl(currentFilters, currentSorting);
    console.log('Export URL:', exportUrl);
    console.log('=====================================');

    setExporting(true);
    setProgress(0);
    setStatusText('Starting...');

    try {
      setProgress(5);
      setStatusText('Connecting...');

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 min timeout

      // Make the fetch request
      const response = await fetch(exportUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'text/csv'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export failed - Status:', response.status, 'Response:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      setProgress(10);
      setStatusText('Downloading...');

      // Stream the response
      const reader = response.body.getReader();
      const chunks = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        chunks.push(value);
        receivedLength += value.length;

        // Update progress
        const progressPercent = Math.min(90, 10 + Math.floor(receivedLength / 500000) * 5);
        setProgress(progressPercent);
        setStatusText(formatBytes(receivedLength));
      }

      // Combine chunks
      const allChunks = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      setProgress(95);
      setStatusText('Preparing file...');

      // Create blob and download
      const blob = new Blob([allChunks], { type: 'text/csv; charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setProgress(100);
      setStatusText('Done!');
      
      // Count lines for logging
      const text = new TextDecoder().decode(allChunks);
      const lineCount = text.split('\n').filter(line => line.trim()).length;
      console.log(`Export completed: ${formatBytes(receivedLength)}, ${lineCount} rows`);

    } catch (error) {
      console.error('Export failed:', error);
      if (error.name === 'AbortError') {
        alert('Export timed out. Try applying filters to reduce data size.');
      } else {
        alert(`Export failed: ${error.message}`);
      }
    } finally {
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
        setStatusText('');
      }, 1500);
    }
  };

  return (
    <button
      className={`export-btn ${exporting ? 'exporting' : ''}`}
      onClick={handleExport}
      disabled={exporting}
      title="Export filtered data to CSV (supports up to 1M records)"
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span>{exporting ? (statusText || `${progress}%`) : 'Export'}</span>
    </button>
  );
}

export default ExportButton;
