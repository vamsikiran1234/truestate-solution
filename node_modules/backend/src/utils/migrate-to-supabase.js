const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Get Supabase credentials from command line or environment
const supabaseUrl = process.env.SUPABASE_URL || process.argv[2];
const supabaseKey = process.env.SUPABASE_KEY || process.argv[3];

if (!supabaseUrl || !supabaseKey) {
  console.error('Usage: node migrate-to-supabase.js <SUPABASE_URL> <SUPABASE_KEY>');
  console.error('Or set SUPABASE_URL and SUPABASE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Create sales table in Supabase
 */
async function createTable() {
  console.log('Creating sales table...');
  
  // Note: You need to run this SQL in Supabase SQL Editor:
  const sqlSchema = `
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
  `;
  
  console.log('\n📋 Please run this SQL in Supabase SQL Editor:\n');
  console.log(sqlSchema);
  console.log('\nPress Enter after running the SQL...');
  
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
}

/**
 * Read and upload CSV data
 */
async function uploadCSVData() {
  const csvPath = path.join(__dirname, '../../data/sales_data.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }
  
  console.log('Reading CSV file...');
  const records = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        records.push({
          transaction_id: row['Transaction ID'],
          date: row['Date'],
          customer_id: row['Customer ID'],
          customer_name: row['Customer Name'],
          phone_number: row['Phone Number'],
          gender: row['Gender'],
          age: parseInt(row['Age']) || null,
          customer_region: row['Customer Region'],
          customer_type: row['Customer Type'],
          product_id: row['Product ID'],
          product_name: row['Product Name'],
          brand: row['Brand'],
          product_category: row['Product Category'],
          tags: row['Tags'],
          quantity: parseInt(row['Quantity']) || 0,
          price_per_unit: parseFloat(row['Price per Unit']) || 0,
          discount_percentage: parseFloat(row['Discount Percentage']) || 0,
          total_amount: parseFloat(row['Total Amount']) || 0,
          final_amount: parseFloat(row['Final Amount']) || 0,
          payment_method: row['Payment Method'],
          order_status: row['Order Status'],
          delivery_type: row['Delivery Type'],
          store_id: row['Store ID'],
          store_location: row['Store Location'],
          salesperson_id: row['Salesperson ID'],
          employee_name: row['Employee Name']
        });
      })
      .on('end', async () => {
        console.log(`Parsed ${records.length} records from CSV`);
        
        // Upload in batches of 1000
        const batchSize = 1000;
        let uploaded = 0;
        
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          
          console.log(`Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}...`);
          
          const { error } = await supabase
            .from('sales')
            .insert(batch);
          
          if (error) {
            console.error('Upload error:', error);
            reject(error);
            return;
          }
          
          uploaded += batch.length;
          console.log(`Progress: ${uploaded}/${records.length} (${Math.round(uploaded / records.length * 100)}%)`);
        }
        
        console.log('\n✅ All data uploaded successfully!');
        resolve();
      })
      .on('error', reject);
  });
}

/**
 * Main migration function
 */
async function migrate() {
  try {
    console.log('🚀 Starting Supabase migration...\n');
    
    await createTable();
    await uploadCSVData();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Set SUPABASE_URL and SUPABASE_KEY environment variables in Render');
    console.log('2. Redeploy your application');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
