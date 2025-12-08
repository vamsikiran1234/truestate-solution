-- ============================================
-- STEP 7: CREATE PAGINATION INDEXES (Run for fast page access)
-- ============================================

-- Add primary key index if not exists
ALTER TABLE sales ADD COLUMN IF NOT EXISTS id SERIAL;
CREATE INDEX IF NOT EXISTS idx_sales_id ON sales(id);

-- Create composite indexes for sorted pagination
-- These allow PostgreSQL to quickly jump to any offset
CREATE INDEX IF NOT EXISTS idx_sales_date_id ON sales(date DESC, id);
CREATE INDEX IF NOT EXISTS idx_sales_final_amount_id ON sales(final_amount DESC, id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_name_id ON sales(customer_name, id);

-- Increase statement timeout for this session (only for this query)
-- Note: This only works if you have permission
-- SET statement_timeout = '60s';

-- Update statistics
ANALYZE sales;

-- Test pagination to page 100000 (should be faster now)
SELECT id, date, customer_name FROM sales ORDER BY date DESC LIMIT 10 OFFSET 999990;
