-- =====================================================
-- COMPLETE SEARCH SETUP FOR 1M+ RECORDS
-- =====================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- This will create everything needed for fast search
-- Estimated time: 3-5 minutes for 1M records
-- =====================================================

-- =====================================================
-- STEP 1: Create indexes on sales table (for direct queries)
-- =====================================================
-- These indexes help even without the search_index table

-- Index for customer_name searches
CREATE INDEX IF NOT EXISTS idx_sales_customer_name 
ON sales (customer_name);

-- Index for phone_number searches  
CREATE INDEX IF NOT EXISTS idx_sales_phone_number
ON sales (phone_number);

-- Index for lowercase customer_name (case-insensitive search)
CREATE INDEX IF NOT EXISTS idx_sales_customer_name_lower 
ON sales (LOWER(customer_name));

-- Composite index for ID-based pagination
CREATE INDEX IF NOT EXISTS idx_sales_id_name
ON sales (id, customer_name);

RAISE NOTICE 'Step 1 complete: Basic indexes created';

-- =====================================================
-- STEP 2: Create the search_index table
-- =====================================================
-- Small, optimized table just for search lookups

DROP TABLE IF EXISTS search_index;

CREATE TABLE search_index (
  id BIGINT PRIMARY KEY,
  name_lower VARCHAR(255),        -- Full name in lowercase
  first_name VARCHAR(100),        -- First word of name (for prefix search)
  phone_digits VARCHAR(20)        -- Phone number digits only
);

RAISE NOTICE 'Step 2 complete: search_index table created';

-- =====================================================
-- STEP 3: Create indexes on search_index
-- =====================================================

CREATE INDEX idx_si_first_name ON search_index (first_name);
CREATE INDEX idx_si_name_lower ON search_index (name_lower);
CREATE INDEX idx_si_phone ON search_index (phone_digits);

-- Trigram indexes for partial matching (LIKE '%term%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_si_name_trgm ON search_index USING gin(name_lower gin_trgm_ops);
CREATE INDEX idx_si_phone_trgm ON search_index USING gin(phone_digits gin_trgm_ops);

RAISE NOTICE 'Step 3 complete: search_index indexes created';

-- =====================================================
-- STEP 4: Populate search_index from sales table
-- =====================================================
-- This may take 1-2 minutes for 1M records

INSERT INTO search_index (id, name_lower, first_name, phone_digits)
SELECT 
  id,
  LOWER(customer_name) as name_lower,
  LOWER(SPLIT_PART(customer_name, ' ', 1)) as first_name,
  REGEXP_REPLACE(COALESCE(phone_number, ''), '[^0-9]', '', 'g') as phone_digits
FROM sales
ON CONFLICT (id) DO UPDATE SET
  name_lower = EXCLUDED.name_lower,
  first_name = EXCLUDED.first_name,
  phone_digits = EXCLUDED.phone_digits;

-- Analyze for query optimization
ANALYZE search_index;

RAISE NOTICE 'Step 4 complete: search_index populated with data';

-- =====================================================
-- STEP 5: Create fast_search RPC function
-- =====================================================
-- Primary search function - uses search_index for speed

DROP FUNCTION IF EXISTS fast_search(TEXT, INT);

CREATE OR REPLACE FUNCTION fast_search(
  search_term TEXT,
  max_results INT DEFAULT 200
)
RETURNS TABLE(matching_id BIGINT) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET statement_timeout = '8s'
AS $$
DECLARE
  search_lower TEXT;
  phone_digits TEXT;
BEGIN
  -- Normalize search term
  search_lower := LOWER(TRIM(search_term));
  phone_digits := REGEXP_REPLACE(search_term, '[^0-9]', '', 'g');
  
  -- Skip if search term is too short
  IF LENGTH(search_lower) < 2 THEN
    RETURN;
  END IF;
  
  -- Strategy 1: First name prefix match (fastest, uses index)
  RETURN QUERY
  SELECT si.id as matching_id
  FROM search_index si
  WHERE si.first_name LIKE search_lower || '%'
  ORDER BY si.id
  LIMIT max_results;
  
  -- If we found enough results, stop
  IF FOUND THEN
    RETURN;
  END IF;
  
  -- Strategy 2: Full name prefix match
  RETURN QUERY
  SELECT si.id as matching_id
  FROM search_index si
  WHERE si.name_lower LIKE search_lower || '%'
  ORDER BY si.id
  LIMIT max_results;
  
  IF FOUND THEN
    RETURN;
  END IF;
  
  -- Strategy 3: Phone number search (if 3+ digits)
  IF LENGTH(phone_digits) >= 3 THEN
    RETURN QUERY
    SELECT si.id as matching_id
    FROM search_index si
    WHERE si.phone_digits LIKE '%' || phone_digits || '%'
    ORDER BY si.id
    LIMIT max_results;
    
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- Strategy 4: Contains match (uses trigram index)
  IF LENGTH(search_lower) >= 3 THEN
    RETURN QUERY
    SELECT si.id as matching_id
    FROM search_index si
    WHERE si.name_lower LIKE '%' || search_lower || '%'
    ORDER BY si.id
    LIMIT max_results;
  END IF;
  
  RETURN;
END;
$$;

RAISE NOTICE 'Step 5 complete: fast_search function created';

-- =====================================================
-- STEP 6: Create search_with_ids RPC function
-- =====================================================
-- Alternative search function with match scoring

DROP FUNCTION IF EXISTS search_with_ids(TEXT, INT);

CREATE OR REPLACE FUNCTION search_with_ids(
  search_term TEXT,
  max_results INT DEFAULT 200
)
RETURNS TABLE(matching_id BIGINT, match_score INT) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET statement_timeout = '10s'
AS $$
DECLARE
  search_lower TEXT;
  phone_digits TEXT;
BEGIN
  search_lower := LOWER(TRIM(search_term));
  phone_digits := REGEXP_REPLACE(search_term, '[^0-9]', '', 'g');
  
  IF LENGTH(search_lower) < 2 THEN
    RETURN;
  END IF;
  
  -- Combined search with scoring
  RETURN QUERY
  SELECT DISTINCT ON (si.id)
    si.id as matching_id,
    CASE
      WHEN si.first_name = search_lower THEN 100           -- Exact first name match
      WHEN si.first_name LIKE search_lower || '%' THEN 90  -- First name prefix
      WHEN si.name_lower LIKE search_lower || '%' THEN 80  -- Full name prefix
      WHEN LENGTH(phone_digits) >= 3 AND si.phone_digits LIKE '%' || phone_digits || '%' THEN 70  -- Phone match
      WHEN si.name_lower LIKE '%' || search_lower || '%' THEN 60  -- Name contains
      ELSE 50
    END as match_score
  FROM search_index si
  WHERE 
    si.first_name LIKE search_lower || '%'
    OR si.name_lower LIKE search_lower || '%'
    OR (LENGTH(phone_digits) >= 3 AND si.phone_digits LIKE '%' || phone_digits || '%')
    OR (LENGTH(search_lower) >= 3 AND si.name_lower LIKE '%' || search_lower || '%')
  ORDER BY si.id, match_score DESC
  LIMIT max_results;
  
  RETURN;
END;
$$;

RAISE NOTICE 'Step 6 complete: search_with_ids function created';

-- =====================================================
-- STEP 7: Create quick_search RPC function (simpler version)
-- =====================================================

DROP FUNCTION IF EXISTS quick_search(TEXT, INT);

CREATE OR REPLACE FUNCTION quick_search(
  search_term TEXT,
  max_results INT DEFAULT 100
)
RETURNS TABLE(id BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET statement_timeout = '5s'
AS $$
DECLARE
  search_lower TEXT;
BEGIN
  search_lower := LOWER(TRIM(search_term));
  
  IF LENGTH(search_lower) < 2 THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT si.id
  FROM search_index si
  WHERE si.first_name LIKE search_lower || '%'
     OR si.name_lower LIKE search_lower || '%'
  ORDER BY si.id
  LIMIT max_results;
  
  RETURN;
END;
$$;

RAISE NOTICE 'Step 7 complete: quick_search function created';

-- =====================================================
-- STEP 8: Grant permissions
-- =====================================================

GRANT SELECT ON search_index TO anon, authenticated;
GRANT EXECUTE ON FUNCTION fast_search TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_with_ids TO anon, authenticated;
GRANT EXECUTE ON FUNCTION quick_search TO anon, authenticated;

RAISE NOTICE 'Step 8 complete: Permissions granted';

-- =====================================================
-- STEP 9: Create trigger to keep search_index in sync
-- =====================================================

CREATE OR REPLACE FUNCTION update_search_index()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO search_index (id, name_lower, first_name, phone_digits)
    VALUES (
      NEW.id,
      LOWER(NEW.customer_name),
      LOWER(SPLIT_PART(NEW.customer_name, ' ', 1)),
      REGEXP_REPLACE(COALESCE(NEW.phone_number, ''), '[^0-9]', '', 'g')
    )
    ON CONFLICT (id) DO UPDATE SET
      name_lower = EXCLUDED.name_lower,
      first_name = EXCLUDED.first_name,
      phone_digits = EXCLUDED.phone_digits;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM search_index WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_search_index ON sales;

CREATE TRIGGER trg_update_search_index
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH ROW
EXECUTE FUNCTION update_search_index();

RAISE NOTICE 'Step 9 complete: Sync trigger created';

-- =====================================================
-- STEP 10: Verify everything is set up correctly
-- =====================================================

DO $$
DECLARE
  search_index_count BIGINT;
  sales_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO search_index_count FROM search_index;
  SELECT COUNT(*) INTO sales_count FROM sales;
  
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'SETUP COMPLETE!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Sales table records: %', sales_count;
  RAISE NOTICE 'Search index records: %', search_index_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - fast_search(search_term, max_results)';
  RAISE NOTICE '  - search_with_ids(search_term, max_results)';
  RAISE NOTICE '  - quick_search(search_term, max_results)';
  RAISE NOTICE '';
  RAISE NOTICE 'To test, run:';
  RAISE NOTICE '  SELECT * FROM fast_search(''arjun'', 10);';
  RAISE NOTICE '  SELECT * FROM fast_search(''9876'', 10);';
  RAISE NOTICE '=====================================================';
END;
$$;

-- =====================================================
-- TEST QUERIES (uncomment to run)
-- =====================================================
-- SELECT * FROM fast_search('arjun', 10);
-- SELECT * FROM fast_search('9876', 10);
-- SELECT * FROM search_with_ids('sharma', 10);
-- SELECT COUNT(*) FROM search_index;
