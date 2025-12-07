import { useState, useRef, useEffect } from 'react';
import '../styles/FilterBar.css';

function FilterBar({ 
  options, 
  filters, 
  onFilterChange, 
  onAgeRangeChange, 
  onDateRangeChange,
  onClearFilters 
}) {
  const [activeDropdown, setActiveDropdown] = useState(null);

  if (!options) {
    return <div className="filter-bar-loading">Loading filters...</div>;
  }

  const handleDropdownToggle = (filterName) => {
    setActiveDropdown(activeDropdown === filterName ? null : filterName);
  };

  const handleOptionSelect = (filterName, value) => {
    const currentValues = filters[filterName] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    onFilterChange(filterName, newValues);
  };

  const getFilterLabel = (filterName, defaultLabel) => {
    const values = filters[filterName] || [];
    if (values.length === 0) return defaultLabel;
    if (values.length === 1) return values[0];
    return `${values.length} selected`;
  };

  const hasActiveFilters = 
    filters.regions?.length > 0 ||
    filters.genders?.length > 0 ||
    filters.categories?.length > 0 ||
    filters.tags?.length > 0 ||
    filters.paymentMethods?.length > 0 ||
    filters.minAge !== null ||
    filters.maxAge !== null ||
    filters.startDate !== null ||
    filters.endDate !== null;

  return (
    <div className="filter-bar">
      <button 
        className={`filter-reset-btn ${hasActiveFilters ? 'active' : ''}`}
        onClick={onClearFilters}
        title="Reset all filters"
      >
        ↻
      </button>

      {/* Customer Region Filter */}
      <FilterDropdown
        label="Customer Region"
        isOpen={activeDropdown === 'regions'}
        onToggle={() => handleDropdownToggle('regions')}
        hasSelection={filters.regions?.length > 0}
      >
        <div className="dropdown-options">
          {(options.regions || []).map(region => (
            <label key={region} className="dropdown-option">
              <input
                type="checkbox"
                checked={filters.regions?.includes(region)}
                onChange={() => handleOptionSelect('regions', region)}
              />
              <span>{region}</span>
            </label>
          ))}
        </div>
      </FilterDropdown>

      {/* Gender Filter */}
      <FilterDropdown
        label="Gender"
        isOpen={activeDropdown === 'genders'}
        onToggle={() => handleDropdownToggle('genders')}
        hasSelection={filters.genders?.length > 0}
      >
        <div className="dropdown-options">
          {(options.genders || []).map(gender => (
            <label key={gender} className="dropdown-option">
              <input
                type="checkbox"
                checked={filters.genders?.includes(gender)}
                onChange={() => handleOptionSelect('genders', gender)}
              />
              <span>{gender}</span>
            </label>
          ))}
        </div>
      </FilterDropdown>

      {/* Age Range Filter */}
      <FilterDropdown
        label="Age Range"
        isOpen={activeDropdown === 'age'}
        onToggle={() => handleDropdownToggle('age')}
        hasSelection={filters.minAge !== null || filters.maxAge !== null}
      >
        <div className="range-filter-content">
          <div className="range-inputs">
            <input
              type="number"
              placeholder="Min"
              value={filters.minAge || ''}
              onChange={(e) => onAgeRangeChange(e.target.value ? parseInt(e.target.value) : null, filters.maxAge)}
              min={options.ageRange?.min || 0}
              max={options.ageRange?.max || 100}
            />
            <span>to</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxAge || ''}
              onChange={(e) => onAgeRangeChange(filters.minAge, e.target.value ? parseInt(e.target.value) : null)}
              min={options.ageRange?.min || 0}
              max={options.ageRange?.max || 100}
            />
          </div>
        </div>
      </FilterDropdown>

      {/* Product Category Filter */}
      <FilterDropdown
        label="Product Category"
        isOpen={activeDropdown === 'categories'}
        onToggle={() => handleDropdownToggle('categories')}
        hasSelection={filters.categories?.length > 0}
      >
        <div className="dropdown-options">
          {(options.categories || []).map(category => (
            <label key={category} className="dropdown-option">
              <input
                type="checkbox"
                checked={filters.categories?.includes(category)}
                onChange={() => handleOptionSelect('categories', category)}
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
      </FilterDropdown>

      {/* Tags Filter */}
      <FilterDropdown
        label="Tags"
        isOpen={activeDropdown === 'tags'}
        onToggle={() => handleDropdownToggle('tags')}
        hasSelection={filters.tags?.length > 0}
      >
        <div className="dropdown-options">
          {(options.tags || []).map(tag => (
            <label key={tag} className="dropdown-option">
              <input
                type="checkbox"
                checked={filters.tags?.includes(tag)}
                onChange={() => handleOptionSelect('tags', tag)}
              />
              <span>{tag}</span>
            </label>
          ))}
        </div>
      </FilterDropdown>

      {/* Payment Method Filter */}
      <FilterDropdown
        label="Payment Method"
        isOpen={activeDropdown === 'paymentMethods'}
        onToggle={() => handleDropdownToggle('paymentMethods')}
        hasSelection={filters.paymentMethods?.length > 0}
      >
        <div className="dropdown-options">
          {(options.paymentMethods || []).map(method => (
            <label key={method} className="dropdown-option">
              <input
                type="checkbox"
                checked={filters.paymentMethods?.includes(method)}
                onChange={() => handleOptionSelect('paymentMethods', method)}
              />
              <span>{method}</span>
            </label>
          ))}
        </div>
      </FilterDropdown>

      {/* Date Range Filter */}
      <FilterDropdown
        label="Date"
        isOpen={activeDropdown === 'date'}
        onToggle={() => handleDropdownToggle('date')}
        hasSelection={filters.startDate !== null || filters.endDate !== null}
      >
        <div className="date-filter-content">
          <div className="date-input-group">
            <label>From</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onDateRangeChange(e.target.value || null, filters.endDate)}
            />
          </div>
          <div className="date-input-group">
            <label>To</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onDateRangeChange(filters.startDate, e.target.value || null)}
            />
          </div>
        </div>
      </FilterDropdown>

      {/* Click outside to close */}
      {activeDropdown && (
        <div className="dropdown-overlay" onClick={() => setActiveDropdown(null)} />
      )}
    </div>
  );
}

function FilterDropdown({ label, isOpen, onToggle, hasSelection, children }) {
  const dropdownRef = useRef(null);

  return (
    <div className={`filter-dropdown ${isOpen ? 'open' : ''} ${hasSelection ? 'has-selection' : ''}`} ref={dropdownRef}>
      <button className="filter-dropdown-trigger" onClick={onToggle}>
        <span>{label}</span>
        <span className="dropdown-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="filter-dropdown-menu">
          {children}
        </div>
      )}
    </div>
  );
}

export default FilterBar;
