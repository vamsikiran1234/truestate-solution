import { useState, useEffect } from 'react';
import { salesApi } from '../services/api';
import '../styles/StatsCards.css';

function StatsCards({ filters, totalItems }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Extract filter values for dependency array
  const search = filters?.search || '';
  const regions = filters?.regions?.join(',') || '';
  const genders = filters?.genders?.join(',') || '';
  const categories = filters?.categories?.join(',') || '';
  const tags = filters?.tags?.join(',') || '';
  const paymentMethods = filters?.paymentMethods?.join(',') || '';
  const minAge = filters?.minAge || '';
  const maxAge = filters?.maxAge || '';
  const startDate = filters?.startDate || '';
  const endDate = filters?.endDate || '';

  // Fetch stats when any filter changes
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Check if any filters are active (excluding search - it's too slow for stats)
        const hasNonSearchFilters = regions || genders || categories || 
                          tags || paymentMethods || minAge || maxAge || 
                          startDate || endDate;

        let response;
        
        // OPTIMIZATION: Skip filtered stats when only searching
        // Search queries are slow on 1M records, and stats aren't critical during search
        if (search && !hasNonSearchFilters) {
          // When only searching, use cached global stats (fast)
          console.log('Search active - using cached stats for speed');
          response = await salesApi.getStats();
        } else if (hasNonSearchFilters) {
          // Fetch filtered stats (but exclude search term to avoid timeout)
          console.log('Fetching filtered stats with:', { regions, genders, categories });
          response = await salesApi.getFilteredStats({
            // search: '', // Skip search in stats query - too slow
            regions,
            genders,
            minAge,
            maxAge,
            categories,
            tags,
            paymentMethods,
            startDate,
            endDate
          });
        } else {
          // Fetch global stats (cached)
          console.log('Fetching global stats');
          response = await salesApi.getStats();
        }
        
        if (response.success) {
          console.log('Stats response:', response.data);
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [search, regions, genders, categories, tags, paymentMethods, minAge, maxAge, startDate, endDate]);

  const filteredCount = totalItems || stats?.totalRecords || 0;

  return (
    <div className="stats-cards">
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-label">Total Units Sold</span>
        </div>
        <div className="stat-value">
          {loading ? '...' : (stats?.totalQuantity || 0).toLocaleString()}
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-label">Total Amount</span>
        </div>
        <div className="stat-value">
          {loading ? '...' : `₹${(stats?.totalSales || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        </div>
        <div className="stat-subtext">{filteredCount.toLocaleString()} records</div>
      </div>
      
      <div className="stat-card highlight">
        <div className="stat-header">
          <span className="stat-label">Total Discount</span>
        </div>
        <div className="stat-value">
          {loading ? '...' : `₹${(stats?.totalDiscount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-label">Avg Order Value</span>
        </div>
        <div className="stat-value">
          {loading ? '...' : `₹${(stats?.averageOrderValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        </div>
      </div>
    </div>
  );
}

export default StatsCards;
