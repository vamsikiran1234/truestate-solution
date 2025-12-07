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
 * Get all sales data from database
 */
const getAllSalesFromDB = async () => {
  if (!supabase) return null;
  
  try {
    console.time('Database query time');
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    console.timeEnd('Database query time');
    console.log(`Retrieved ${data.length} records from database`);
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
    let query = supabase.from('sales').select('*', { count: 'exact' });
    
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
    
    // Apply pagination
    const from = (pagination.page - 1) * pagination.limit;
    const to = from + pagination.limit - 1;
    query = query.range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      data: data || [],
      totalItems: count || 0,
      currentPage: pagination.page,
      totalPages: Math.ceil((count || 0) / pagination.limit),
      itemsPerPage: pagination.limit
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
