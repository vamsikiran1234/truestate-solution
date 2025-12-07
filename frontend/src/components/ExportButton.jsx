import { useState } from 'react';
import '../styles/ExportButton.css';

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
      params.append('page', '1');
      params.append('limit', '1000000'); // Support full 1M records
      
      console.log('Export URL:', `/api/sales?${params.toString()}`);
      
      setProgress(5); // Starting request
      
      // Fetch with timeout for large datasets
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
      
      const response = await fetch(`/api/sales?${params.toString()}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Server returned error:', response.status, response.statusText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      setProgress(25); // Response received, parsing JSON
      
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        throw new Error('Failed to parse server response');
      }
      
      console.log('Server response:', { success: result.success, dataLength: result.data?.length, pagination: result.pagination });
      
      setProgress(40); // Data parsed
      
      if (result.success && result.data && result.data.length > 0) {
        console.log(`Exporting ${result.data.length} records...`);
        // Convert to CSV with progress updates
        const csvContent = await convertToCSVWithProgress(result.data);
        setProgress(95); // CSV created
        downloadCSV(csvContent, `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
        setProgress(100); // Download started
      } else {
        console.error('Invalid response:', result);
        throw new Error(result.error || 'No data received from server');
      }
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
      }, 500);
    }
  };

  const formatDateForExcel = (dateStr) => {
    if (!dateStr) return '';
    try {
      // Handle various date formats
      let date;
      
      // Try direct parsing first (works for ISO dates like "2023-03-23")
      date = new Date(dateStr);
      
      // If invalid, try parsing as DD/MM/YYYY or DD-MM-YYYY
      if (isNaN(date.getTime())) {
        const parts = dateStr.split(/[-\/]/);
        if (parts.length === 3) {
          // Try YYYY-MM-DD
          if (parts[0].length === 4) {
            date = new Date(parts[0], parts[1] - 1, parts[2]);
          } else {
            // Try DD-MM-YYYY
            date = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        }
      }
      
      if (isNaN(date.getTime())) return '';  // Return empty for invalid dates
      
      const day = String(date.getDate()).padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      
      // Format as "28-Sep-2023" with apostrophe prefix to force text in Excel
      // This prevents Excel from interpreting it as a number and showing ###
      return `'${day}-${month}-${year}`;
    } catch {
      return '';
    }
  };

  // Format phone number as text for Excel (prevent scientific notation)
  const formatPhoneForExcel = (phone) => {
    if (!phone) return '';
    // Return as string with apostrophe prefix to force text in Excel
    return "'" + String(phone);
  };

  const convertToCSVWithProgress = async (data) => {
    if (!data.length) return '';
    
    const headers = [
      'Date',
      'Customer Name',
      'Phone Number',
      'Age',
      'Gender',
      'Region',
      'Product Name',
      'Brand',
      'Category',
      'Quantity',
      'Unit Price',
      'Discount %',
      'Final Amount',
      'Payment Method',
      'Status',
      'Tags'
    ];
    
    const totalRows = data.length;
    // Use array of strings and join at the end for better memory efficiency
    const csvParts = [headers.join(',')];
    const chunkSize = 50000; // Larger chunks for faster processing
    
    for (let i = 0; i < totalRows; i += chunkSize) {
      const endIdx = Math.min(i + chunkSize, totalRows);
      const chunkRows = [];
      
      for (let j = i; j < endIdx; j++) {
        const item = data[j];
        chunkRows.push([
          formatDateForExcel(item.date),
          item.customerName || '',
          formatPhoneForExcel(item.phoneNumber),
          item.age || '',
          item.gender || '',
          item.customerRegion || '',
          item.productName || '',
          item.brand || '',
          item.productCategory || '',
          item.quantity || 0,
          item.pricePerUnit || 0,
          item.discountPercentage || 0,
          item.finalAmount || 0,
          item.paymentMethod || '',
          item.orderStatus || '',
          item.tags || ''
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
      }
      
      csvParts.push(chunkRows.join('\n'));
      
      // Update progress (40% to 95% range for CSV conversion)
      const csvProgress = 40 + Math.round(((i + chunkSize) / totalRows) * 55);
      setProgress(Math.min(csvProgress, 95));
      
      // Yield to UI to update every chunk
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return csvParts.join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
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
