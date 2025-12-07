import { useState, useEffect, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import FilterBar from './components/FilterBar';
import SortingDropdown from './components/SortingDropdown';
import TransactionTable from './components/TransactionTable';
import Pagination from './components/Pagination';
import StatsCards from './components/StatsCards';
import ExportButton from './components/ExportButton';
import { useSalesData } from './hooks/useSalesData';
import { useFilters } from './hooks/useFilters';
import './styles/App.css';

function App() {
  // Filter options from API
  const [filterOptions, setFilterOptions] = useState(null);
  
  // Active filters state
  const {
    filters,
    updateSearch,
    updateFilter,
    updateAgeRange,
    updateDateRange,
    clearFilters,
    sorting,
    updateSorting,
    pagination,
    updatePage
  } = useFilters();

  // Sales data hook
  const { data, loading, error, totalItems, totalPages, refetch, fetchFilterOptions } = useSalesData();

  // Fetch filter options on mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      const options = await fetchFilterOptions();
      setFilterOptions(options);
    };
    loadFilterOptions();
  }, [fetchFilterOptions]);

  // Fetch data when filters, sorting, or pagination changes
  useEffect(() => {
    refetch(filters, sorting, pagination);
  }, [filters, sorting, pagination, refetch]);

  // Handle search
  const handleSearch = useCallback((searchTerm) => {
    updateSearch(searchTerm);
    updatePage(1);
  }, [updateSearch, updatePage]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterName, values) => {
    updateFilter(filterName, values);
    updatePage(1);
  }, [updateFilter, updatePage]);

  // Handle age range change
  const handleAgeRangeChange = useCallback((minAge, maxAge) => {
    updateAgeRange(minAge, maxAge);
    updatePage(1);
  }, [updateAgeRange, updatePage]);

  // Handle date range change
  const handleDateRangeChange = useCallback((startDate, endDate) => {
    updateDateRange(startDate, endDate);
    updatePage(1);
  }, [updateDateRange, updatePage]);

  // Handle sort change
  const handleSortChange = useCallback((sortBy, sortOrder) => {
    updateSorting(sortBy, sortOrder);
    updatePage(1);
  }, [updateSorting, updatePage]);

  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    updatePage(newPage);
  }, [updatePage]);

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    clearFilters();
    updatePage(1);
  }, [clearFilters, updatePage]);

  return (
    <div className="app-container">
      {/* Top Header Bar */}
      <header className="top-header">
        <h1 className="page-title">Retail Sales Management System</h1>
        <div className="header-right">
          <ExportButton filters={filters} sorting={sorting} />
          <SearchBar 
            value={filters.search} 
            onSearch={handleSearch} 
          />
        </div>
      </header>

      <main className="main-content">
        {/* Stats Cards - Updates based on filtered data */}
        <StatsCards 
          filters={filters}
          totalItems={totalItems} 
        />

        {/* Filter Panel */}
        <div className="filter-row">
          <FilterBar
            options={filterOptions}
            filters={filters}
            onFilterChange={handleFilterChange}
            onAgeRangeChange={handleAgeRangeChange}
            onDateRangeChange={handleDateRangeChange}
            onClearFilters={handleClearFilters}
          />
          <SortingDropdown
            sortBy={sorting.sortBy}
            sortOrder={sorting.sortOrder}
            onSortChange={handleSortChange}
          />
        </div>

        {/* Transaction Table */}
        <TransactionTable 
          data={data} 
          loading={loading} 
          error={error}
          searchTerm={filters.search}
        />

        {/* Pagination Controls */}
        <Pagination
          currentPage={pagination.page}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={handlePageChange}
          disabled={loading}
        />
      </main>
    </div>
  );
}

export default App;
