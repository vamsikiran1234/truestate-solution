import { useState, useEffect } from 'react';
import '../styles/RangeFilter.css';

function RangeFilter({ label, minValue, maxValue, minLimit, maxLimit, onChange }) {
  const [localMin, setLocalMin] = useState(minValue ?? '');
  const [localMax, setLocalMax] = useState(maxValue ?? '');

  useEffect(() => {
    setLocalMin(minValue ?? '');
    setLocalMax(maxValue ?? '');
  }, [minValue, maxValue]);

  const handleApply = () => {
    const min = localMin === '' ? null : parseInt(localMin, 10);
    const max = localMax === '' ? null : parseInt(localMax, 10);
    
    // Validate range
    if (min !== null && max !== null && min > max) {
      alert('Minimum value cannot be greater than maximum value');
      return;
    }
    
    onChange(min, max);
  };

  const handleClear = () => {
    setLocalMin('');
    setLocalMax('');
    onChange(null, null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  const hasValue = localMin !== '' || localMax !== '';

  return (
    <div className="range-filter">
      <label className="filter-label">{label}</label>
      
      <div className="range-inputs">
        <input
          type="number"
          placeholder={`Min (${minLimit})`}
          value={localMin}
          min={minLimit}
          max={maxLimit}
          onChange={(e) => setLocalMin(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <span className="range-separator">to</span>
        <input
          type="number"
          placeholder={`Max (${maxLimit})`}
          value={localMax}
          min={minLimit}
          max={maxLimit}
          onChange={(e) => setLocalMax(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      
      <div className="range-actions">
        <button 
          className="apply-btn"
          onClick={handleApply}
          disabled={!hasValue && minValue === null && maxValue === null}
        >
          Apply
        </button>
        {(hasValue || minValue !== null || maxValue !== null) && (
          <button className="clear-btn" onClick={handleClear}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export default RangeFilter;
