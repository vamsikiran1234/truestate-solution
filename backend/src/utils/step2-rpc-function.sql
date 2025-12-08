-- ============================================
-- STEP 2: CREATE STATS TABLE (Run after STEP 1)
-- This is MUCH faster than RPC function!
-- ============================================

-- Create a table to store pre-computed stats
CREATE TABLE IF NOT EXISTS sales_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_records BIGINT,
    total_sales NUMERIC,
    total_quantity BIGINT,
    total_discount NUMERIC,
    average_order_value NUMERIC,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Delete any existing stats
DELETE FROM sales_stats WHERE id = 1;

-- Compute and insert the stats
-- This INSERT might take a while, but only runs once!
INSERT INTO sales_stats (id, total_records, total_sales, total_quantity, total_discount, average_order_value)
SELECT 
    1 as id,
    COUNT(*) as total_records,
    ROUND(SUM(final_amount)::NUMERIC, 2) as total_sales,
    SUM(quantity) as total_quantity,
    ROUND(SUM(total_amount - final_amount)::NUMERIC, 2) as total_discount,
    ROUND(AVG(final_amount)::NUMERIC, 2) as average_order_value
FROM sales;

-- Verify it worked
SELECT * FROM sales_stats;

-- ✅ You should see output like:
-- total_records: 1000000
-- total_sales: 5683455355.65
-- etc.

-- Now proceed to STEP 3
