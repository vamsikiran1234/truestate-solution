# Supabase Migration Guide

This guide will help you set up Supabase and migrate your 1,000,000 sales records from CSV to PostgreSQL.

## Why Supabase?

The application was experiencing "Out of memory" errors on free hosting tiers (512MB RAM) because it was loading all 1M records into memory. By using Supabase's free PostgreSQL database (500MB), we offload the data storage and querying to the database, allowing the backend to run efficiently within memory constraints.

## Step 1: Create Supabase Account and Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account
3. Click "New Project"
4. Fill in the details:
   - Name: `truestate-sales` (or your preferred name)
   - Database Password: Choose a strong password (save it!)
   - Region: Choose closest to your users
   - Pricing Plan: **Free** (500MB database, perfect for our needs)
5. Click "Create new project"
6. Wait 2-3 minutes for project provisioning

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

## Step 3: Create Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste this SQL:

```sql
-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  transaction_id TEXT,
  date DATE,
  customer_id TEXT,
  customer_name TEXT,
  phone_number TEXT,
  gender TEXT,
  age INTEGER,
  customer_region TEXT,
  customer_type TEXT,
  product_id TEXT,
  product_name TEXT,
  brand TEXT,
  product_category TEXT,
  tags TEXT,
  quantity INTEGER,
  price_per_unit DECIMAL,
  discount_percentage DECIMAL,
  total_amount DECIMAL,
  final_amount DECIMAL,
  payment_method TEXT,
  order_status TEXT,
  delivery_type TEXT,
  store_id TEXT,
  store_location TEXT,
  salesperson_id TEXT,
  employee_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer_name ON sales(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_phone ON sales(phone_number);
CREATE INDEX IF NOT EXISTS idx_sales_region ON sales(customer_region);
CREATE INDEX IF NOT EXISTS idx_sales_category ON sales(product_category);

-- Create functions for filter options
CREATE OR REPLACE FUNCTION get_age_range()
RETURNS TABLE(min INTEGER, max INTEGER) AS $$
BEGIN
  RETURN QUERY SELECT MIN(age)::INTEGER, MAX(age)::INTEGER FROM sales WHERE age IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_date_range()
RETURNS TABLE(min TEXT, max TEXT) AS $$
BEGIN
  RETURN QUERY SELECT MIN(date)::TEXT, MAX(date)::TEXT FROM sales WHERE date IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
```

4. Click "Run" to execute the SQL
5. You should see "Success. No rows returned" message

## Step 4: Import CSV Data to Supabase

You have two options:

### Option A: Using the Migration Script (Recommended for Local)

1. Set environment variables in your terminal:
   ```powershell
   $env:SUPABASE_URL="https://your-project.supabase.co"
   $env:SUPABASE_KEY="your-anon-key"
   ```

2. Run the migration script:
   ```powershell
   cd backend
   node src/utils/migrate-to-supabase.js
   ```

3. Wait for the upload to complete (takes ~10-15 minutes for 1M records)
4. You'll see progress updates: "Progress: 500000/1000000 (50%)"

### Option B: Using Supabase CSV Import (Faster)

1. In Supabase dashboard, go to **Table Editor** → **sales** table
2. Click **Import data via spreadsheet**
3. Upload `backend/data/sales_data.csv`
4. Map the CSV columns to the table columns (they should auto-match)
5. Click "Import"
6. Wait for import to complete

**Note:** Supabase has a 5MB upload limit via dashboard, so you may need to split your CSV or use Option A.

## Step 5: Verify Data Import

1. In Supabase dashboard, go to **Table Editor** → **sales**
2. You should see your records
3. Check the count: Run this query in SQL Editor:
   ```sql
   SELECT COUNT(*) FROM sales;
   ```
   Should return: `1000000`

## Step 6: Configure Backend Environment Variables

### For Local Development:

1. Create `.env` file in `backend/` directory:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   PORT=5000
   ```

2. Install dotenv if not already installed:
   ```powershell
   npm install dotenv
   ```

3. The backend will automatically use Supabase when these variables are set

### For Render Deployment:

1. Go to your Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add environment variables:
   - `SUPABASE_URL` = `https://your-project.supabase.co`
   - `SUPABASE_KEY` = `your-anon-key`
5. Save changes
6. Render will automatically redeploy

## Step 7: Test Locally

1. Start your backend:
   ```powershell
   cd backend
   npm start
   ```

2. You should see in logs:
   ```
   Supabase initialized successfully
   Server running on port 5000
   Data source: Supabase PostgreSQL
   ```

3. Test the health endpoint:
   ```powershell
   curl http://localhost:5000/api/health
   ```
   Should return: `{"status":"OK","message":"Server is running","dataSource":"Supabase PostgreSQL"}`

4. Test fetching data:
   ```powershell
   curl "http://localhost:5000/api/sales?page=1&limit=10"
   ```

## Step 8: Deploy to Render

1. Push your updated code to GitHub:
   ```powershell
   git add .
   git commit -m "Add Supabase integration for production deployment"
   git push origin main
   ```

2. Go to Render dashboard
3. Your service should auto-deploy with the new code
4. Check logs to confirm:
   ```
   Supabase initialized successfully
   Data source: Supabase PostgreSQL
   ```

5. Memory usage should now be under 512MB ✅

## Fallback Behavior

The application is smart:
- **If Supabase credentials are set:** Uses PostgreSQL database
- **If no credentials:** Falls back to loading CSV file (works locally)

This means:
- You can develop locally with CSV (fast, no setup)
- Deploy to production with Supabase (efficient, scalable)

## Performance Comparison

| Metric | CSV (In-Memory) | Supabase PostgreSQL |
|--------|----------------|---------------------|
| Memory Usage | ~2GB | ~50MB |
| Startup Time | 7-8 seconds | <1 second |
| Query Speed | 5ms (cached) | 10-50ms (indexed) |
| Search Speed | 50-100ms | 100-200ms |
| Free Hosting | ❌ (needs 2GB+) | ✅ (fits in 512MB) |

## Troubleshooting

### Error: "Failed to connect to Supabase"
- Check your `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Ensure no extra spaces or quotes in environment variables
- Verify your Supabase project is active (not paused)

### Error: "relation 'sales' does not exist"
- Run the SQL schema creation script (Step 3)
- Verify the table was created in Table Editor

### Slow Queries
- Ensure indexes were created (Step 3)
- Check query execution plan in SQL Editor
- Consider adding more indexes on frequently filtered columns

### Import Timeout
- If migration script times out, split CSV into smaller chunks
- Or use Supabase CSV import feature
- Increase timeout in migration script if needed

## Cost Estimate

**Supabase Free Tier:**
- 500MB database ✅ (our data: ~250MB)
- 2GB bandwidth/month ✅ (sufficient for typical usage)
- 50,000 monthly active users ✅

**Render Free Tier:**
- 512MB RAM ✅ (now sufficient with database offloading)
- 750 hours/month ✅

**Total Monthly Cost: $0** 🎉

## Need Help?

If you encounter issues:
1. Check Supabase logs in dashboard
2. Check Render deployment logs
3. Verify environment variables are set correctly
4. Test the `/api/health` endpoint to confirm data source
