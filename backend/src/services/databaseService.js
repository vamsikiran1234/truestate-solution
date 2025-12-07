const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

let supabase = null;
let useDatabase = false;

/**
 * Initialize Supabase client
 */
const initSupabase = () => {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    useDatabase = true;
    console.log('✓ Supabase database connected');
    return true;
  }
  console.log('ℹ Using CSV file (no Supabase credentials)');
  return false;
};

/**
 * Check if using database
 */
const isUsingDatabase = () => useDatabase;

/**
 * Get all sales data from database (for stats calculation)
 * Uses aggregate queries instead of fetching all records
 */
const getAllSalesFromDB = async () => {
  if (!supabase) return null;
  
  try {
    console.time('Database aggregate query');
    
    // Use PostgreSQL aggregate functions for efficiency
    const { data, error } = await supabase
      .rpc('get_sales_stats');
    
    if (error) {
      // Fallback: fetch with limit if RPC doesn't exist
      console.log('RPC not found, using count query');
      const { count } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true });
      
      console.timeEnd('Database aggregate query');
      return { count: count || 0 };
    }
    
    console.timeEnd('Database aggregate query');
    console.log(`Retrieved stats from database (${data?.total_records || 0} records)`);
    return data;
  } catch (error) {
    console.error('Database query error:', error);
    return null;
  }
};

/**
 * Get filtered sales data from database
 */
const getFilteredSalesFromDB = async (filters, sorting, pagination) => {
  if (!supabase) return null;
  
  try {
    // Count query first to get total
    let countQuery = supabase.from('sales').select('*', { count: 'exact', head: true });
    
    // Build data query
    let query = supabase.from('sales').select('*');
    
    // Apply search filter
    if (filters.search) {
      query = query.or(`customer_name.ilike.%${filters.search}%,phone_number.ilike.%${filters.search}%`);
    }
    
    // Apply filters
    if (filters.regions?.length > 0) {
      query = query.in('customer_region', filters.regions);
    }
    if (filters.genders?.length > 0) {
      query = query.in('gender', filters.genders);
    }
    if (filters.categories?.length > 0) {
      query = query.in('product_category', filters.categories);
    }
    if (filters.paymentMethods?.length > 0) {
      query = query.in('payment_method', filters.paymentMethods);
    }
    if (filters.minAge) {
      query = query.gte('age', filters.minAge);
    }
    if (filters.maxAge) {
      query = query.lte('age', filters.maxAge);
    }
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }
    
    // Apply sorting
    const sortColumn = sorting.sortBy === 'date' ? 'date' : 
                       sorting.sortBy === 'amount' ? 'final_amount' : 
                       sorting.sortBy === 'customer' ? 'customer_name' : 'date';
    query = query.order(sortColumn, { ascending: sorting.sortOrder === 'asc' });
    
    // Apply filters to count query
    if (filters.search) {
      countQuery = countQuery.or(`customer_name.ilike.%${filters.search}%,phone_number.ilike.%${filters.search}%`);
    }
    if (filters.regions?.length > 0) countQuery = countQuery.in('customer_region', filters.regions);
    if (filters.genders?.length > 0) countQuery = countQuery.in('gender', filters.genders);
    if (filters.categories?.length > 0) countQuery = countQuery.in('product_category', filters.categories);
    if (filters.paymentMethods?.length > 0) countQuery = countQuery.in('payment_method', filters.paymentMethods);
    if (filters.minAge) countQuery = countQuery.gte('age', filters.minAge);
    if (filters.maxAge) countQuery = countQuery.lte('age', filters.maxAge);
    if (filters.startDate) countQuery = countQuery.gte('date', filters.startDate);
    if (filters.endDate) countQuery = countQuery.lte('date', filters.endDate);
    
    // Get total count
    const { count, error: countError } = await countQuery;
    if (countError) throw countError;
    
    // Apply pagination to data query
    const from = (pagination.page - 1) * pagination.limit;
    const to = from + pagination.limit - 1;
    query = query.range(from, to);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return {
      data: data || [],
      totalItems: count || 0,
      currentPage: pagination.page,
      totalPages: Math.ceil((count || 0) / pagination.limit),
      itemsPerPage: pagination.limit,
      hasNextPage: pagination.page < Math.ceil((count || 0) / pagination.limit),
      hasPrevPage: pagination.page > 1
    };
  } catch (error) {
    console.error('Database filter query error:', error);
    return null;
  }
};

/**
 * Get filter options from database
 */
const getFilterOptionsFromDB = async () => {
  if (!supabase) return null;
  
  try {
    const { data: regions } = await supabase.from('sales').select('customer_region').not('customer_region', 'is', null);
    const { data: genders } = await supabase.from('sales').select('gender').not('gender', 'is', null);
    const { data: categories } = await supabase.from('sales').select('product_category').not('product_category', 'is', null);
    const { data: paymentMethods } = await supabase.from('sales').select('payment_method').not('payment_method', 'is', null);
    const { data: ageData } = await supabase.rpc('get_age_range');
    const { data: dateData } = await supabase.rpc('get_date_range');
    
    return {
      regions: [...new Set(regions?.map(r => r.customer_region))].sort(),
      genders: [...new Set(genders?.map(g => g.gender))].sort(),
      categories: [...new Set(categories?.map(c => c.product_category))].sort(),
      paymentMethods: [...new Set(paymentMethods?.map(p => p.payment_method))].sort(),
      ageRange: ageData?.[0] || { min: 18, max: 100 },
      dateRange: dateData?.[0] || { min: '2021-01-01', max: '2023-12-31' }
    };
  } catch (error) {
    console.error('Database filter options error:', error);
    return null;
  }
};

module.exports = {
  initSupabase,
  isUsingDatabase,
  getAllSalesFromDB,
  getFilteredSalesFromDB,
  getFilterOptionsFromDB
};
