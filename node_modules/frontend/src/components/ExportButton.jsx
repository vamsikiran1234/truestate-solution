import { useState } from 'react';
import '../styles/ExportButton.css';

// API base URL for export
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function ExportButton({ filters, sorting }) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);
    
    try {
      // Build query params for current filters
      const params = new URLSearchParams();
      
      // Only append non-empty filter values
      if (filters.search && filters.search.trim()) {
        params.append('search', filters.search.trim());
      }
      if (filters.regions && filters.regions.length > 0) {
        params.append('regions', filters.regions.join(','));
      }
      if (filters.genders && filters.genders.length > 0) {
        params.append('genders', filters.genders.join(','));
      }
      if (filters.categories && filters.categories.length > 0) {
        params.append('categories', filters.categories.join(','));
      }
      if (filters.tags && filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }
      if (filters.paymentMethods && filters.paymentMethods.length > 0) {
        params.append('paymentMethods', filters.paymentMethods.join(','));
      }
      if (filters.minAge !== null && filters.minAge !== undefined && filters.minAge !== '') {
        params.append('minAge', filters.minAge);
      }
      if (filters.maxAge !== null && filters.maxAge !== undefined && filters.maxAge !== '') {
        params.append('maxAge', filters.maxAge);
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }
      
      params.append('sortBy', sorting.sortBy);
      params.append('sortOrder', sorting.sortOrder);
      
      const exportUrl = `${API_BASE_URL}/sales/export?${params.toString()}`;
      console.log('Export URL:', exportUrl);
      
      setProgress(10); // Starting request
      
      // Use streaming endpoint that returns CSV directly
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
      
      const response = await fetch(exportUrl, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Server returned error:', response.status, response.statusText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      setProgress(30); // Response headers received
      
      // Get the response as a blob (CSV file)
      const blob = await response.blob();
      
      setProgress(80); // Data received
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setProgress(100); // Download started
      console.log('Export completed successfully');
      
    } catch (error) {
      console.error('Export failed:', error);
      if (error.name === 'AbortError') {
        alert('Export timed out. Try exporting with filters to reduce data size.');
      } else {
        alert(`Export failed: ${error.message}`);
      }
    } finally {
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
      }, 1000);
    }
  };

  return (
    <button 
      className={`export-btn ${exporting ? 'exporting' : ''}`}
      onClick={handleExport}
      disabled={exporting}
      title="Export filtered data to CSV"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>{exporting ? `${progress}%` : 'Export'}</span>
    </button>
  );
}

export default ExportButton;
