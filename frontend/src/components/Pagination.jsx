import '../styles/Pagination.css';

function Pagination({ currentPage, totalPages, totalItems, onPageChange, disabled }) {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    onPageChange(page);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <button
        className="pagination-btn prev-btn"
        onClick={handlePrevious}
        disabled={disabled || currentPage === 1}
      >
        ← Previous
      </button>

      <div className="page-numbers">
        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="ellipsis">...</span>
          ) : (
            <button
              key={page}
              className={`page-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => handlePageClick(page)}
              disabled={disabled}
            >
              {page}
            </button>
          )
        ))}
      </div>

      <button
        className="pagination-btn next-btn"
        onClick={handleNext}
        disabled={disabled || currentPage === totalPages}
      >
        Next →
      </button>

      <span className="page-info">
        Page {currentPage} of {totalPages} ({totalItems?.toLocaleString() || 0} records)
      </span>
    </div>
  );
}

export default Pagination;
