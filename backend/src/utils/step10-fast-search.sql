-- =====================================================
-- STEP 10: FAST SEARCH (Simple & Works Immediately)
-- =====================================================
-- Run this SQL in Supabase SQL Editor
-- This creates indexes for fast name/phone search
-- =====================================================

-- Step 1: Create index on customer_name for LIKE searches
-- This speeds up prefix searches like 'Arjun%'
CREATE INDEX IF NOT EXISTS idx_sales_customer_name_lower 
ON sales (LOWER(customer_name) text_pattern_ops);

-- Step 2: Create index on phone_number for phone searches
CREATE INDEX IF NOT EXISTS idx_sales_phone_number 
ON sales (phone_number text_pattern_ops);

-- Step 3: Create a FAST search function with timeout
CREATE OR REPLACE FUNCTION fast_search(
  search_term TEXT,
  max_results INT DEFAULT 200
)
RETURNS TABLE(matching_id INT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '5s'  -- 5 second timeout
AS $$
DECLARE
  search_lower TEXT;
  phone_digits TEXT;
BEGIN
  search_lower := LOWER(TRIM(search_term));
  phone_digits := REGEXP_REPLACE(search_term, '\D', '', 'g');
  
  -- Search by name prefix first (fastest with index)
  RETURN QUERY
  SELECT s.id as matching_id
  FROM sales s
  WHERE LOWER(s.customer_name) LIKE search_lower || '%'
  ORDER BY s.id
  LIMIT max_results;
  
  -- If we found results, we're done
  IF FOUND THEN
    RETURN;
  END IF;
  
  -- Try phone search if search term has 3+ digits
  IF LENGTH(phone_digits) >= 3 THEN
    RETURN QUERY
    SELECT s.id as matching_id
    FROM sales s
    WHERE s.phone_number LIKE '%' || phone_digits || '%'
    ORDER BY s.id
    LIMIT max_results;
  END IF;
  
  RETURN;
END;
$$;

-- Step 4: Verify the function works
SELECT * FROM fast_search('arj', 10);
SELECT * FROM fast_search('987', 10);

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION fast_search TO anon, authenticated;

-- =====================================================
-- DONE! Search should now work fast.
-- =====================================================
