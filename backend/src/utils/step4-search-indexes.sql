-- ============================================
-- STEP 4: CREATE SEARCH INDEXES (Run after STEP 3)
-- ============================================

-- Enable trigram extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes for fast ILIKE search
-- These take longer to build but make search VERY fast
CREATE INDEX IF NOT EXISTS idx_sales_customer_name_trgm ON sales USING gin(customer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sales_phone_trgm ON sales USING gin(phone_number gin_trgm_ops);

-- Final statistics update
ANALYZE sales;

-- ✅ You should see: "Success. No rows returned"
-- All done! Proceed to verification step
