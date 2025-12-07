import '../styles/SortingDropdown.css';

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Date (Newest First)', sortBy: 'date', sortOrder: 'desc' },
  { value: 'date-asc', label: 'Date (Oldest First)', sortBy: 'date', sortOrder: 'asc' },
  { value: 'quantity-desc', label: 'Quantity (High to Low)', sortBy: 'quantity', sortOrder: 'desc' },
  { value: 'quantity-asc', label: 'Quantity (Low to High)', sortBy: 'quantity', sortOrder: 'asc' },
  { value: 'customerName-asc', label: 'Customer Name (A–Z)', sortBy: 'customerName', sortOrder: 'asc' },
  { value: 'customerName-desc', label: 'Customer Name (Z–A)', sortBy: 'customerName', sortOrder: 'desc' },
  { value: 'finalAmount-desc', label: 'Amount (High to Low)', sortBy: 'finalAmount', sortOrder: 'desc' },
  { value: 'finalAmount-asc', label: 'Amount (Low to High)', sortBy: 'finalAmount', sortOrder: 'asc' }
];

function SortingDropdown({ sortBy, sortOrder, onSortChange }) {
  const currentValue = `${sortBy}-${sortOrder}`;

  const handleChange = (e) => {
    const selectedOption = SORT_OPTIONS.find(opt => opt.value === e.target.value);
    if (selectedOption) {
      onSortChange(selectedOption.sortBy, selectedOption.sortOrder);
    }
  };

  return (
    <div className="sorting-dropdown">
      <span className="sort-label">Sort by:</span>
      <select className="sort-select" value={currentValue} onChange={handleChange}>
        {SORT_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SortingDropdown;
