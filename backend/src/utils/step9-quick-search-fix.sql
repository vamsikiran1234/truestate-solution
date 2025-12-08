-- ============================================
-- QUICK FIX: ADD SEARCH INDEXES TO SALES TABLE DIRECTLY
-- ============================================
-- This is a simpler alternative to step9-search-index-table.sql
-- Adds trigram indexes directly to the sales table for fast ILIKE search
-- Run this ONCE in your Supabase SQL Editor
-- Takes about 2-3 minutes for 1M records

-- Step 1: Enable trigram extension (for fast ILIKE/LIKE searches)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: Add trigram indexes for customer_name and phone_number
-- These make ILIKE searches much faster (from 30s+ to <1s)
CREATE INDEX IF NOT EXISTS idx_sales_name_trgm 
ON sales USING gin(customer_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_sales_phone_trgm 
ON sales USING gin(phone_number gin_trgm_ops);

-- Step 3: Add a lowercase name index for case-insensitive prefix search
CREATE INDEX IF NOT EXISTS idx_sales_name_lower 
ON sales(LOWER(customer_name) varchar_pattern_ops);

-- Step 4: Analyze tables for query optimizer
ANALYZE sales;

-- Step 5: Verify indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'sales' 
  AND indexname IN ('idx_sales_name_trgm', 'idx_sales_phone_trgm', 'idx_sales_name_lower');

-- ============================================
-- EXPECTED OUTPUT:
-- 3 rows showing the created indexes
-- ============================================

-- After running this SQL:
-- 1. Search by name will be fast (uses trigram index)
-- 2. Search by phone will be fast (uses trigram index)
-- 3. Case-insensitive search works automatically
-- 4. No code changes needed - existing code will work faster
