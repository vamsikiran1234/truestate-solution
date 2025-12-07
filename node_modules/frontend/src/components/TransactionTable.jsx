import { formatCurrency, formatDate, highlightText } from '../utils/helpers';
import '../styles/TransactionTable.css';

/**
 * Render text with search term highlighted
 */
const HighlightedText = ({ text, searchTerm }) => {
  const parts = highlightText(text, searchTerm);
  return (
    <>
      {parts.map((part, i) => 
        part.highlighted ? (
          <mark key={i} className="search-highlight">{part.text}</mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
};

function TransactionTable({ data, loading, error, searchTerm = '' }) {
  // Copy phone number to clipboard
  const handleCopyPhone = (phone) => {
    navigator.clipboard.writeText(phone);
  };

  if (loading) {
    return (
      <div className="table-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading sales data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-container">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <p>Error loading data: {error}</p>
          <p className="error-hint">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-container">
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>No sales records found</p>
          <p className="empty-hint">Try adjusting your search or filter criteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Category</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Discount</th>
              <th>Final Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Region</th>
            </tr>
          </thead>
          <tbody>
            {data.map((sale, index) => (
              <tr key={`${sale.customerId}-${sale.productId}-${index}`}>
                <td className="date-cell">{formatDate(sale.date)}</td>
                <td className="customer-cell">
                  <div className="customer-info">
                    <span className="customer-name">
                      <HighlightedText text={sale.customerName} searchTerm={searchTerm} />
                    </span>
                    <span className="customer-phone" onClick={() => handleCopyPhone(sale.phoneNumber)} title="Click to copy">
                      <HighlightedText text={sale.phoneNumber} searchTerm={searchTerm} />
                    </span>
                  </div>
                </td>
                <td className="product-cell">
                  <div className="product-info">
                    <span className="product-name">{sale.productName}</span>
                    <span className="product-brand">{sale.brand}</span>
                  </div>
                </td>
                <td>
                  <span className="category-badge">{sale.productCategory}</span>
                </td>
                <td className="qty-cell">{sale.quantity}</td>
                <td className="price-cell">{formatCurrency(sale.pricePerUnit)}</td>
                <td className="discount-cell">
                  {sale.discountPercentage > 0 ? (
                    <span className="discount-badge">{sale.discountPercentage}%</span>
                  ) : (
                    <span className="no-discount">-</span>
                  )}
                </td>
                <td className="amount-cell">{formatCurrency(sale.finalAmount)}</td>
                <td>
                  <span className={`payment-badge ${sale.paymentMethod?.toLowerCase().replace(' ', '-')}`}>
                    {sale.paymentMethod}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${sale.orderStatus?.toLowerCase()}`}>
                    {sale.orderStatus}
                  </span>
                </td>
                <td className="region-cell">{sale.customerRegion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TransactionTable;
