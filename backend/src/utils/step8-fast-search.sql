-- ============================================
-- STEP 8: FAST SEARCH FUNCTION (Run in Supabase SQL Editor)
-- ============================================
-- This creates an optimized search function that uses indexed columns
-- Run this ONCE in your Supabase SQL Editor

-- Drop existing function if any
DROP FUNCTION IF EXISTS fast_search_sales;

-- Create optimized search function
-- Uses multiple strategies: exact match first, then prefix, then contains
CREATE OR REPLACE FUNCTION fast_search_sales(
  search_term TEXT,
  page_offset INT DEFAULT 0,
  page_limit INT DEFAULT 25,
  sort_column TEXT DEFAULT 'date',
  sort_asc BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id BIGINT,
  date DATE,
  customer_name VARCHAR,
  phone_number VARCHAR,
  age INT,
  gender VARCHAR,
  customer_region VARCHAR,
  product_name VARCHAR,
  brand VARCHAR,
  product_category VARCHAR,
  quantity INT,
  price_per_unit DECIMAL,
  discount_percentage DECIMAL,
  final_amount DECIMAL,
  payment_method VARCHAR,
  order_status VARCHAR,
  tags TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
DECLARE
  clean_term TEXT;
  total BIGINT;
  sort_expr TEXT;
BEGIN
  -- Clean the search term
  clean_term := LOWER(TRIM(search_term));
  
  -- Skip if search term is too short
  IF LENGTH(clean_term) < 3 THEN
    RETURN;
  END IF;
  
  -- Build sort expression
  sort_expr := CASE sort_column
    WHEN 'amount' THEN 'final_amount'
    WHEN 'customer' THEN 'customer_name'
    ELSE 'date'
  END;
  
  -- Get count first (with limit for speed)
  SELECT COUNT(*) INTO total
  FROM (
    SELECT 1 FROM sales s
    WHERE LOWER(s.customer_name) LIKE clean_term || '%'
       OR s.phone_number LIKE '%' || clean_term || '%'
    LIMIT 10000
  ) sub;
  
  -- Return matching rows with total count
  RETURN QUERY EXECUTE format(
    'SELECT 
      s.id, s.date, s.customer_name, s.phone_number, s.age, s.gender,
      s.customer_region, s.product_name, s.brand, s.product_category,
      s.quantity, s.price_per_unit, s.discount_percentage, s.final_amount,
      s.payment_method, s.order_status, s.tags,
      $1::bigint as total_count
    FROM sales s
    WHERE LOWER(s.customer_name) LIKE $2 || ''%%''
       OR s.phone_number LIKE ''%%'' || $2 || ''%%''
    ORDER BY %I %s
    LIMIT $3 OFFSET $4',
    sort_expr,
    CASE WHEN sort_asc THEN 'ASC' ELSE 'DESC' END
  ) USING total, clean_term, page_limit, page_offset;
END;
$$;

-- Create a simpler version for filtered searches
CREATE OR REPLACE FUNCTION search_sales_with_filters(
  p_search TEXT DEFAULT NULL,
  p_regions TEXT[] DEFAULT NULL,
  p_genders TEXT[] DEFAULT NULL,
  p_categories TEXT[] DEFAULT NULL,
  p_payment_methods TEXT[] DEFAULT NULL,
  p_min_age INT DEFAULT NULL,
  p_max_age INT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_page_offset INT DEFAULT 0,
  p_page_limit INT DEFAULT 25,
  p_sort_column TEXT DEFAULT 'date',
  p_sort_asc BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id BIGINT,
  date DATE,
  customer_name VARCHAR,
  phone_number VARCHAR,
  age INT,
  gender VARCHAR,
  customer_region VARCHAR,
  product_name VARCHAR,
  brand VARCHAR,
  product_category VARCHAR,
  quantity INT,
  price_per_unit DECIMAL,
  discount_percentage DECIMAL,
  final_amount DECIMAL,
  payment_method VARCHAR,
  order_status VARCHAR,
  tags TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
DECLARE
  clean_search TEXT;
  total BIGINT := 0;
  base_query TEXT;
  count_query TEXT;
  where_clauses TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Clean search term
  IF p_search IS NOT NULL AND LENGTH(TRIM(p_search)) >= 3 THEN
    clean_search := LOWER(TRIM(p_search));
    where_clauses := array_append(where_clauses, 
      format('(LOWER(customer_name) LIKE %L OR phone_number LIKE %L)', 
             clean_search || '%', '%' || clean_search || '%'));
  END IF;
  
  -- Add filter conditions
  IF p_regions IS NOT NULL AND array_length(p_regions, 1) > 0 THEN
    where_clauses := array_append(where_clauses, 
      format('customer_region = ANY(%L)', p_regions));
  END IF;
  
  IF p_genders IS NOT NULL AND array_length(p_genders, 1) > 0 THEN
    where_clauses := array_append(where_clauses, 
      format('gender = ANY(%L)', p_genders));
  END IF;
  
  IF p_categories IS NOT NULL AND array_length(p_categories, 1) > 0 THEN
    where_clauses := array_append(where_clauses, 
      format('product_category = ANY(%L)', p_categories));
  END IF;
  
  IF p_payment_methods IS NOT NULL AND array_length(p_payment_methods, 1) > 0 THEN
    where_clauses := array_append(where_clauses, 
      format('payment_method = ANY(%L)', p_payment_methods));
  END IF;
  
  IF p_min_age IS NOT NULL THEN
    where_clauses := array_append(where_clauses, format('age >= %s', p_min_age));
  END IF;
  
  IF p_max_age IS NOT NULL THEN
    where_clauses := array_append(where_clauses, format('age <= %s', p_max_age));
  END IF;
  
  IF p_start_date IS NOT NULL THEN
    where_clauses := array_append(where_clauses, format('date >= %L', p_start_date));
  END IF;
  
  IF p_end_date IS NOT NULL THEN
    where_clauses := array_append(where_clauses, format('date <= %L', p_end_date));
  END IF;
  
  -- Build WHERE clause
  IF array_length(where_clauses, 1) > 0 THEN
    base_query := 'SELECT * FROM sales WHERE ' || array_to_string(where_clauses, ' AND ');
    count_query := 'SELECT COUNT(*) FROM (SELECT 1 FROM sales WHERE ' || array_to_string(where_clauses, ' AND ') || ' LIMIT 50000) sub';
  ELSE
    base_query := 'SELECT * FROM sales';
    -- Use cached count for unfiltered queries
    SELECT total_records INTO total FROM sales_stats WHERE id = 1;
  END IF;
  
  -- Get count if not already set
  IF total = 0 AND count_query IS NOT NULL THEN
    EXECUTE count_query INTO total;
  END IF;
  
  -- Add ORDER BY and pagination
  base_query := base_query || format(' ORDER BY %I %s LIMIT %s OFFSET %s',
    CASE p_sort_column WHEN 'amount' THEN 'final_amount' WHEN 'customer' THEN 'customer_name' ELSE 'date' END,
    CASE WHEN p_sort_asc THEN 'ASC' ELSE 'DESC' END,
    p_page_limit,
    p_page_offset
  );
  
  -- Execute and return with total
  RETURN QUERY EXECUTE 'SELECT *, ' || total || '::bigint as total_count FROM (' || base_query || ') sub';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION fast_search_sales TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_sales_with_filters TO anon, authenticated;

-- ✅ SUCCESS! Now your search will be much faster
-- The function uses:
-- 1. Prefix matching for names (uses index)
-- 2. Contains matching for phone numbers
-- 3. Limited count queries (max 50k) to prevent timeouts
-- 4. 30 second timeout to prevent runaway queries
