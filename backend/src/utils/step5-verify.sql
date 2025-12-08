-- ============================================
-- VERIFY: Check Everything is Set Up (Run this last)
-- ============================================

-- 1. Check RPC function works
SELECT * FROM get_sales_stats();
-- Should return: total_records = 1000000

-- 2. List all indexes created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'sales'
ORDER BY indexname;

-- Should show at least these indexes:
-- idx_sales_age
-- idx_sales_customer_name_trgm
-- idx_sales_customer_region
-- idx_sales_date
-- idx_sales_date_region
-- idx_sales_final_amount
-- idx_sales_gender
-- idx_sales_payment_method
-- idx_sales_phone_trgm
-- idx_sales_product_category
-- idx_sales_quantity
-- idx_sales_total_amount

-- 3. Test a sample query
SELECT date, customer_name, final_amount 
FROM sales 
ORDER BY date DESC 
LIMIT 10;

-- ✅ All queries should complete quickly (<2 seconds)
