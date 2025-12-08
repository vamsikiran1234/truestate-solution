-- ============================================
-- SUPABASE DATABASE OPTIMIZATION
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- IMPORTANT: Create indexes FIRST to speed up the RPC function
-- Step 1: Create indexes for fast filtering and sorting
-- Index on date (most common sort field)
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date DESC);

-- Composite index for date + region (common filter combo)
CREATE INDEX IF NOT EXISTS idx_sales_date_region ON sales(date, customer_region);

-- Index on commonly filtered fields
CREATE INDEX IF NOT EXISTS idx_sales_customer_region ON sales(customer_region);
CREATE INDEX IF NOT EXISTS idx_sales_product_category ON sales(product_category);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_gender ON sales(gender);

-- Index for age range queries
CREATE INDEX IF NOT EXISTS idx_sales_age ON sales(age);

-- Index for amount sorting
CREATE INDEX IF NOT EXISTS idx_sales_final_amount ON sales(final_amount DESC);

-- Composite index for customer name search (supports ILIKE with trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_sales_customer_name_trgm ON sales USING gin(customer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sales_phone_trgm ON sales USING gin(phone_number gin_trgm_ops);

-- Step 2: Update table statistics for query planner (IMPORTANT!)
ANALYZE sales;

-- Step 3: NOW create the stats function (will be fast with indexes)
CREATE OR REPLACE FUNCTION get_sales_stats()
RETURNS TABLE(
  total_records BIGINT,
  total_sales NUMERIC,
  total_quantity BIGINT,
  total_discount NUMERIC,
  average_order_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_records,
    ROUND(SUM(final_amount)::NUMERIC, 2) as total_sales,
    SUM(quantity)::BIGINT as total_quantity,
    ROUND(SUM(total_amount - final_amount)::NUMERIC, 2) as total_discount,
    ROUND(AVG(final_amount)::NUMERIC, 2) as average_order_value
  FROM sales;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Test the function (should return 1M records)
SELECT * FROM get_sales_stats();

-- Step 5: Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'sales'
ORDER BY indexname;

-- Expected output should show all the indexes above
