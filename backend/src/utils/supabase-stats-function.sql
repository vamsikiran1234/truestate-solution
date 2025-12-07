-- Run this in Supabase SQL Editor to add efficient stats calculation

-- Create function to get sales statistics without fetching all rows
CREATE OR REPLACE FUNCTION get_sales_stats()
RETURNS TABLE(
  total_records BIGINT,
  total_sales NUMERIC,
  total_quantity BIGINT,
  total_discount NUMERIC,
  average_order_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_records,
    ROUND(SUM(final_amount)::NUMERIC, 2) as total_sales,
    SUM(quantity)::BIGINT as total_quantity,
    ROUND(SUM(total_amount - final_amount)::NUMERIC, 2) as total_discount,
    ROUND(AVG(final_amount)::NUMERIC, 2) as average_order_value
  FROM sales;
END;
$$ LANGUAGE plpgsql;
