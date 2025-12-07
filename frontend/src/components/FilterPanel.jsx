import { useState } from 'react';
import MultiSelectFilter from './MultiSelectFilter';
import RangeFilter from './RangeFilter';
import DateRangeFilter from './DateRangeFilter';
import '../styles/FilterPanel.css';

function FilterPanel({ 
  options, 
  filters, 
  onFilterChange, 
  onAgeRangeChange, 
  onDateRangeChange,
  onClearFilters 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!options) {
    return (
      <div className="filter-panel">
        <div className="filter-loading">Loading filters...</div>
      </div>
    );
  }

  const hasActiveFilters = 
    filters.regions.length > 0 ||
    filters.genders.length > 0 ||
    filters.categories.length > 0 ||
    filters.tags.length > 0 ||
    filters.paymentMethods.length > 0 ||
    filters.minAge !== null ||
    filters.maxAge !== null ||
    filters.startDate !== null ||
    filters.endDate !== null;

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <button 
          className="filter-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <svg className="filter-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          Filters
          {hasActiveFilters && <span className="active-badge">Active</span>}
          <span className={`arrow ${isExpanded ? 'expanded' : ''}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </button>
        
        {hasActiveFilters && (
          <button className="clear-filters-btn" onClick={onClearFilters}>
            Clear All
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="filter-content">
          <div className="filter-grid">
            {/* Customer Region */}
            <MultiSelectFilter
              label="Customer Region"
              options={options.regions || []}
              selected={filters.regions}
              onChange={(values) => onFilterChange('regions', values)}
            />

            {/* Gender */}
            <MultiSelectFilter
              label="Gender"
              options={options.genders || []}
              selected={filters.genders}
              onChange={(values) => onFilterChange('genders', values)}
            />

            {/* Product Category */}
            <MultiSelectFilter
              label="Product Category"
              options={options.categories || []}
              selected={filters.categories}
              onChange={(values) => onFilterChange('categories', values)}
            />

            {/* Tags */}
            <MultiSelectFilter
              label="Tags"
              options={options.tags || []}
              selected={filters.tags}
              onChange={(values) => onFilterChange('tags', values)}
            />

            {/* Payment Method */}
            <MultiSelectFilter
              label="Payment Method"
              options={options.paymentMethods || []}
              selected={filters.paymentMethods}
              onChange={(values) => onFilterChange('paymentMethods', values)}
            />

            {/* Age Range */}
            <RangeFilter
              label="Age Range"
              minValue={filters.minAge}
              maxValue={filters.maxAge}
              minLimit={options.ageRange?.min || 0}
              maxLimit={options.ageRange?.max || 100}
              onChange={onAgeRangeChange}
            />

            {/* Date Range */}
            <DateRangeFilter
              label="Date Range"
              startDate={filters.startDate}
              endDate={filters.endDate}
              minDate={options.dateRange?.min}
              maxDate={options.dateRange?.max}
              onChange={onDateRangeChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterPanel;
