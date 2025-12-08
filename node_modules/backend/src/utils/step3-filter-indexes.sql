-- ============================================
-- STEP 3: CREATE FILTER INDEXES (Run after STEP 2)
-- ============================================

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_sales_customer_region ON sales(customer_region);
CREATE INDEX IF NOT EXISTS idx_sales_product_category ON sales(product_category);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_gender ON sales(gender);
CREATE INDEX IF NOT EXISTS idx_sales_age ON sales(age);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_sales_date_region ON sales(date, customer_region);

-- Update statistics again
ANALYZE sales;

-- ✅ You should see: "Success. No rows returned"
-- Now proceed to STEP 4
