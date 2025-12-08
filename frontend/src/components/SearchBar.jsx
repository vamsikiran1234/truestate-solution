import { useState, useEffect, useMemo, useRef } from 'react';
import '../styles/SearchBar.css';

function SearchBar({ value, onSearch }) {
  const [inputValue, setInputValue] = useState(value || '');
  const timeoutRef = useRef(null);

  // Update local state when prop changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Only search if input is empty (clear) or has 2+ characters
    // 2 chars is enough for prefix matching with in-memory cache
    if (newValue.length === 0 || newValue.length >= 2) {
      // Debounce the search - wait 500ms after user stops typing
      timeoutRef.current = setTimeout(() => {
        onSearch(newValue);
      }, 500);
    }
  };

  const handleClear = () => {
    setInputValue('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onSearch('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // Clear debounce and search immediately on Enter
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      onSearch(inputValue);
    }
  };

  return (
    <div className="search-bar">
      <div className="search-input-container">
        <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search name (min 2 chars)"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {inputValue && (
          <button 
            className="clear-button" 
            onClick={handleClear}
            title="Clear search"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
