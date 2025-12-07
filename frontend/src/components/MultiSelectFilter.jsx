import { useState, useRef, useEffect } from 'react';
import '../styles/MultiSelectFilter.css';

function MultiSelectFilter({ label, options, selected, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleOption = (option) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const handleClear = () => {
    onChange([]);
    setSearchTerm('');
  };

  return (
    <div className="multi-select-filter" ref={dropdownRef}>
      <label className="filter-label">{label}</label>
      
      <button 
        className={`filter-trigger ${selected.length > 0 ? 'has-selection' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="trigger-text">
          {selected.length === 0 
            ? `Select ${label}` 
            : `${selected.length} selected`}
        </span>
        <span className={`arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {options.length > 5 && (
            <div className="dropdown-search">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}

          <div className="dropdown-actions">
            <button onClick={handleSelectAll}>
              {selected.length === options.length ? 'Deselect All' : 'Select All'}
            </button>
            {selected.length > 0 && (
              <button onClick={handleClear}>Clear</button>
            )}
          </div>

          <div className="dropdown-options">
            {filteredOptions.length === 0 ? (
              <div className="no-options">No options found</div>
            ) : (
              filteredOptions.map(option => (
                <label key={option} className="option-item">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => handleToggleOption(option)}
                  />
                  <span className="option-text">{option}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiSelectFilter;
