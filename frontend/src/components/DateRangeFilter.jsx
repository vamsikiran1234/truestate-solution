import { useState, useEffect } from 'react';
import '../styles/DateRangeFilter.css';

function DateRangeFilter({ label, startDate, endDate, minDate, maxDate, onChange }) {
  const [localStart, setLocalStart] = useState(startDate || '');
  const [localEnd, setLocalEnd] = useState(endDate || '');

  useEffect(() => {
    setLocalStart(startDate || '');
    setLocalEnd(endDate || '');
  }, [startDate, endDate]);

  const handleApply = () => {
    // Validate date range
    if (localStart && localEnd && new Date(localStart) > new Date(localEnd)) {
      alert('Start date cannot be after end date');
      return;
    }
    
    onChange(localStart || null, localEnd || null);
  };

  const handleClear = () => {
    setLocalStart('');
    setLocalEnd('');
    onChange(null, null);
  };

  const hasValue = localStart || localEnd;

  return (
    <div className="date-range-filter">
      <label className="filter-label">{label}</label>
      
      <div className="date-inputs">
        <div className="date-input-group">
          <label className="date-label">From</label>
          <input
            type="date"
            value={localStart}
            min={minDate}
            max={localEnd || maxDate}
            onChange={(e) => setLocalStart(e.target.value)}
          />
        </div>
        <div className="date-input-group">
          <label className="date-label">To</label>
          <input
            type="date"
            value={localEnd}
            min={localStart || minDate}
            max={maxDate}
            onChange={(e) => setLocalEnd(e.target.value)}
          />
        </div>
      </div>
      
      <div className="date-actions">
        <button 
          className="apply-btn"
          onClick={handleApply}
        >
          Apply
        </button>
        {(hasValue || startDate || endDate) && (
          <button className="clear-btn" onClick={handleClear}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export default DateRangeFilter;
