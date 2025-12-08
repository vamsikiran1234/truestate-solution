-- ============================================
-- STEP 6: CREATE FILTER OPTIONS TABLE (Run this for instant filter loading)
-- ============================================

-- Create table to store pre-computed filter options
CREATE TABLE IF NOT EXISTS filter_options (
    id INTEGER PRIMARY KEY DEFAULT 1,
    regions TEXT[],
    genders TEXT[],
    categories TEXT[],
    payment_methods TEXT[],
    min_age INTEGER,
    max_age INTEGER,
    min_date DATE,
    max_date DATE,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Delete existing data
DELETE FROM filter_options WHERE id = 1;

-- Compute and store filter options (runs once)
INSERT INTO filter_options (id, regions, genders, categories, payment_methods, min_age, max_age, min_date, max_date)
SELECT 
    1 as id,
    ARRAY(SELECT DISTINCT customer_region FROM sales WHERE customer_region IS NOT NULL ORDER BY customer_region) as regions,
    ARRAY(SELECT DISTINCT gender FROM sales WHERE gender IS NOT NULL ORDER BY gender) as genders,
    ARRAY(SELECT DISTINCT product_category FROM sales WHERE product_category IS NOT NULL ORDER BY product_category) as categories,
    ARRAY(SELECT DISTINCT payment_method FROM sales WHERE payment_method IS NOT NULL ORDER BY payment_method) as payment_methods,
    (SELECT MIN(age) FROM sales) as min_age,
    (SELECT MAX(age) FROM sales) as max_age,
    (SELECT MIN(date) FROM sales) as min_date,
    (SELECT MAX(date) FROM sales) as max_date;

-- Verify
SELECT * FROM filter_options;
