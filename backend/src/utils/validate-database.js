/**
 * Validate Supabase Database Setup
 * Run this to check if RPC function and indexes exist
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function validateDatabaseSetup() {
  console.log('🔍 Validating Supabase Database Setup...\n');

  let allPassed = true;

  // Test 1: Check sales_stats table exists and has data
  console.log('1️⃣  Testing sales_stats table...');
  try {
    const { data, error } = await supabase
      .from('sales_stats')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (error) {
      console.log('   ❌ FAILED: sales_stats table not found or empty');
      console.log('   → You need to run: backend/src/utils/step2-rpc-function.sql');
      console.log('   → Error:', error.message);
      allPassed = false;
    } else if (data && data.total_records > 0) {
      console.log('   ✅ PASSED: sales_stats table exists and has data');
      console.log(`   → Total records: ${Number(data.total_records).toLocaleString()}`);
      console.log(`   → Total sales: $${Number(data.total_sales).toLocaleString()}`);
    } else {
      console.log('   ⚠️  WARNING: sales_stats table exists but has 0 records');
      console.log('   → Re-run step2-rpc-function.sql to populate stats');
      allPassed = false;
    }
  } catch (err) {
    console.log('   ❌ FAILED: Error querying sales_stats');
    console.log('   → Error:', err.message);
    allPassed = false;
  }

  console.log('');

  // Test 2: Check basic query performance
  console.log('2️⃣  Testing basic query performance...');
  try {
    const startTime = Date.now();
    const { data, error, count } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: false })
      .order('date', { ascending: false })
      .range(0, 9);
    
    const queryTime = Date.now() - startTime;
    
    if (error) {
      console.log('   ❌ FAILED: Query error');
      console.log('   → Error:', error.message);
      allPassed = false;
    } else {
      console.log('   ✅ PASSED: Query successful');
      console.log(`   → Query time: ${queryTime}ms`);
      console.log(`   → Total count: ${count?.toLocaleString() || 'N/A'}`);
      console.log(`   → Records returned: ${data?.length || 0}`);
      
      if (queryTime > 3000) {
        console.log('   ⚠️  WARNING: Query is slow (>3s)');
        console.log('   → Consider running supabase-optimize.sql to add indexes');
      }
    }
  } catch (err) {
    console.log('   ❌ FAILED: Query error');
    console.log('   → Error:', err.message);
    allPassed = false;
  }

  console.log('');

  // Test 3: Check search performance
  console.log('3️⃣  Testing search query performance...');
  try {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('sales')
      .select('customer_name, phone_number, date')
      .or('customer_name.ilike.%john%,phone_number.ilike.%555%')
      .limit(10);
    
    const queryTime = Date.now() - startTime;
    
    if (error) {
      console.log('   ❌ FAILED: Search query error');
      console.log('   → Error:', error.message);
      allPassed = false;
    } else {
      console.log('   ✅ PASSED: Search query successful');
      console.log(`   → Query time: ${queryTime}ms`);
      console.log(`   → Results found: ${data?.length || 0}`);
      
      if (queryTime > 5000) {
        console.log('   ⚠️  WARNING: Search is slow (>5s)');
        console.log('   → Trigram indexes may not be installed');
        console.log('   → Run supabase-optimize.sql to add pg_trgm indexes');
      }
    }
  } catch (err) {
    console.log('   ❌ FAILED: Search query error');
    console.log('   → Error:', err.message);
    allPassed = false;
  }

  console.log('');
  console.log('═'.repeat(60));
  
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Database is properly configured!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start backend: npm start');
    console.log('2. Deploy to Render with Supabase credentials');
    console.log('3. Update Vercel with Render backend URL');
  } else {
    console.log('❌ SOME TESTS FAILED - Database needs configuration');
    console.log('');
    console.log('Required actions:');
    console.log('1. Open Supabase SQL Editor');
    console.log('2. Run: backend/src/utils/supabase-optimize.sql');
    console.log('3. Run this validation script again');
    console.log('');
    console.log('See: backend/CRITICAL_RUN_SQL_FIRST.md for detailed instructions');
  }
  
  console.log('═'.repeat(60));
}

validateDatabaseSetup().catch(console.error);
