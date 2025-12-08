-- ============================================
-- STEP 1: CREATE BASIC INDEXES (Run this first)
-- ============================================

-- Index on date (most common sort field)
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date DESC);

-- Index for amount calculations
CREATE INDEX IF NOT EXISTS idx_sales_final_amount ON sales(final_amount);

-- Index for quantity aggregation  
CREATE INDEX IF NOT EXISTS idx_sales_quantity ON sales(quantity);

-- Index for total_amount (needed for discount calculation)
CREATE INDEX IF NOT EXISTS idx_sales_total_amount ON sales(total_amount);

-- Update statistics
ANALYZE sales;

-- ✅ You should see: "Success. No rows returned"
-- Now proceed to STEP 2
