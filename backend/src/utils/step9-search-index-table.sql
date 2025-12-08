-- ============================================
-- STEP 9: CREATE SEARCH INDEX TABLE (REQUIRED FOR SEARCH TO WORK)
-- ============================================
-- This creates a small, fast lookup table for search
-- Supports: Name search, Phone search, Case-insensitive, Works with filters
-- Run this ONCE in your Supabase SQL Editor

-- Step 1: Drop old table and create new one with phone support
DROP TABLE IF EXISTS search_index;

CREATE TABLE search_index (
  id BIGINT PRIMARY KEY,
  name_lower VARCHAR(255),        -- Full name in lowercase
  first_name VARCHAR(100),        -- First word of name (for prefix search)
  phone_digits VARCHAR(20)        -- Phone number digits only (no formatting)
);

-- Step 2: Create indexes for fast lookup
CREATE INDEX idx_search_first_name ON search_index(first_name);
CREATE INDEX idx_search_name_lower ON search_index(name_lower);
CREATE INDEX idx_search_phone ON search_index(phone_digits);

-- Also create a trigram index for partial matching (if extension available)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_search_name_trgm ON search_index USING gin(name_lower gin_trgm_ops);
CREATE INDEX idx_search_phone_trgm ON search_index USING gin(phone_digits gin_trgm_ops);

-- Step 3: Populate the search index (takes 1-2 minutes for 1M records)
INSERT INTO search_index (id, name_lower, first_name, phone_digits)
SELECT 
  id,
  LOWER(customer_name) as name_lower,
  LOWER(SPLIT_PART(customer_name, ' ', 1)) as first_name,
  REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g') as phone_digits
FROM sales;

-- Step 4: Analyze for query optimization
ANALYZE search_index;

-- Step 5: Create the fast search function that returns matching IDs
-- Searches both name and phone, case-insensitive
CREATE OR REPLACE FUNCTION quick_search(
  search_term TEXT,
  max_results INT DEFAULT 100
)
RETURNS TABLE (id BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET statement_timeout = '10s'
AS $$
DECLARE
  clean_term TEXT;
  clean_digits TEXT;
BEGIN
  -- Clean and lowercase the search term
  clean_term := LOWER(TRIM(search_term));
  -- Extract only digits for phone search
  clean_digits := REGEXP_REPLACE(search_term, '[^0-9]', '', 'g');
  
  -- Skip if search term is too short
  IF LENGTH(clean_term) < 2 THEN
    RETURN;
  END IF;
  
  -- Search strategy:
  -- 1. First name prefix match (fastest, uses index)
  -- 2. Full name prefix match
  -- 3. Phone number contains match (if digits present)
  -- 4. Full name contains match (slowest, but accurate)
  
  RETURN QUERY
  SELECT DISTINCT si.id
  FROM search_index si
  WHERE 
    -- Name prefix matches (fast, uses index)
    si.first_name LIKE clean_term || '%'
    OR si.name_lower LIKE clean_term || '%'
    -- Phone search (if search term has 3+ digits)
    OR (LENGTH(clean_digits) >= 3 AND si.phone_digits LIKE '%' || clean_digits || '%')
    -- Contains match for name (uses trigram index if available)
    OR (LENGTH(clean_term) >= 3 AND si.name_lower LIKE '%' || clean_term || '%')
  LIMIT max_results;
END;
$$;

-- Step 6: Create a function that returns IDs matching search + can be joined with filters
CREATE OR REPLACE FUNCTION search_with_ids(
  search_term TEXT,
  max_results INT DEFAULT 500
)
RETURNS TABLE (matching_id BIGINT, match_score INT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET statement_timeout = '15s'
AS $$
DECLARE
  clean_term TEXT;
  clean_digits TEXT;
BEGIN
  clean_term := LOWER(TRIM(search_term));
  clean_digits := REGEXP_REPLACE(search_term, '[^0-9]', '', 'g');
  
  IF LENGTH(clean_term) < 2 THEN
    RETURN;
  END IF;
  
  -- Return IDs with a match score for ranking
  -- Score: 1 = exact/prefix match (best), 2 = contains match, 3 = phone match
  RETURN QUERY
  SELECT si.id, 
    CASE 
      WHEN si.first_name = clean_term THEN 1
      WHEN si.first_name LIKE clean_term || '%' THEN 2
      WHEN si.name_lower LIKE clean_term || '%' THEN 3
      WHEN LENGTH(clean_digits) >= 3 AND si.phone_digits LIKE '%' || clean_digits || '%' THEN 4
      WHEN si.name_lower LIKE '%' || clean_term || '%' THEN 5
      ELSE 6
    END as score
  FROM search_index si
  WHERE 
    si.first_name LIKE clean_term || '%'
    OR si.name_lower LIKE clean_term || '%'
    OR (LENGTH(clean_digits) >= 3 AND si.phone_digits LIKE '%' || clean_digits || '%')
    OR (LENGTH(clean_term) >= 3 AND si.name_lower LIKE '%' || clean_term || '%')
  ORDER BY score, si.id
  LIMIT max_results;
END;
$$;

-- Grant permissions
GRANT SELECT ON search_index TO anon, authenticated;
GRANT EXECUTE ON FUNCTION quick_search TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_with_ids TO anon, authenticated;

-- ✅ DONE! Run this SQL in Supabase, then search will work instantly.
-- 
-- Features:
-- ✓ Name search (prefix and contains)
-- ✓ Phone number search (digits only, ignores formatting)
-- ✓ Case-insensitive
-- ✓ Ranked results (exact matches first)
-- ✓ Fast (uses indexed lookup table ~50MB vs 500MB+ sales table)
-- ✓ 10-15 second timeout to prevent runaway queries
