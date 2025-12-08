// Vercel Serverless API catch-all handler
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Transform snake_case to camelCase
const snakeToCamel = (str) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
const transformRow = (row) => {
  if (!row) return row;
  const transformed = {};
  for (const [key, value] of Object.entries(row)) {
    transformed[snakeToCamel(key)] = value;
  }
  return transformed;
};

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  const path = req.url.replace('/api/', '').split('?')[0];

  try {
    // Health check
    if (path === 'health') {
      return res.status(200).json({
        status: 'OK',
        message: 'Server is running',
        dataSource: supabase ? 'Supabase PostgreSQL' : 'Not configured'
      });
    }

    // Check if Supabase is configured
    if (!supabase) {
      return res.status(500).json({
        error: 'Database not configured',
        message: 'SUPABASE_URL and SUPABASE_KEY environment variables are required'
      });
    }

    // Sales endpoints
    if (path === 'sales' || path === 'sales/') {
      return await handleGetSales(req, res);
    }

    if (path === 'sales/stats') {
      return await handleGetStats(req, res);
    }

    if (path === 'sales/filter-options') {
      return await handleGetFilterOptions(req, res);
    }

    if (path === 'sales/export') {
      return await handleExport(req, res);
    }

    // 404 for unknown routes
    return res.status(404).json({ error: 'Not Found' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

// Get sales with pagination and filtering
async function handleGetSales(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const limit = parseInt(url.searchParams.get('limit')) || 20;
  const offset = (page - 1) * limit;

  let query = supabase.from('sales').select('*', { count: 'exact' });

  // Apply filters
  const regions = url.searchParams.get('regions');
  if (regions) {
    query = query.in('region', regions.split(',').filter(r => r.trim()));
  }

  const productCategories = url.searchParams.get('productCategories');
  if (productCategories) {
    query = query.in('product_category', productCategories.split(',').filter(p => p.trim()));
  }

  const genders = url.searchParams.get('genders');
  if (genders) {
    query = query.in('customer_gender', genders.split(',').filter(g => g.trim()));
  }

  const search = url.searchParams.get('search');
  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,product_name.ilike.%${search}%`);
  }

  // Sorting
  const sortBy = url.searchParams.get('sortBy') || 'sale_date';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    data: data.map(transformRow),
    pagination: {
      page,
      limit,
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  });
}

// Get stats
async function handleGetStats(req, res) {
  const { data, error } = await supabase
    .from('sales_stats')
    .select('*')
    .single();

  if (error) {
    // Fallback: calculate from sales table
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('total_amount, quantity');

    if (salesError) {
      return res.status(500).json({ error: salesError.message });
    }

    const stats = {
      totalSales: salesData.reduce((sum, s) => sum + (s.total_amount || 0), 0),
      totalTransactions: salesData.length,
      totalQuantity: salesData.reduce((sum, s) => sum + (s.quantity || 0), 0),
      averageOrderValue: salesData.length > 0 
        ? salesData.reduce((sum, s) => sum + (s.total_amount || 0), 0) / salesData.length 
        : 0
    };

    return res.status(200).json(stats);
  }

  return res.status(200).json(transformRow(data));
}

// Get filter options
async function handleGetFilterOptions(req, res) {
  const { data, error } = await supabase
    .from('filter_options')
    .select('*')
    .single();

  if (error) {
    // Fallback: get unique values from sales
    const { data: regions } = await supabase.from('sales').select('region').limit(1000);
    const { data: categories } = await supabase.from('sales').select('product_category').limit(1000);
    const { data: genders } = await supabase.from('sales').select('customer_gender').limit(1000);

    return res.status(200).json({
      regions: [...new Set(regions?.map(r => r.region) || [])],
      productCategories: [...new Set(categories?.map(c => c.product_category) || [])],
      customerGenders: [...new Set(genders?.map(g => g.customer_gender) || [])]
    });
  }

  return res.status(200).json({
    regions: data.regions || [],
    productCategories: data.product_categories || [],
    customerGenders: data.customer_genders || []
  });
}

// Export sales data
async function handleExport(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=sales_export.csv');

  // CSV header
  const header = 'id,sale_date,product_name,product_category,quantity,unit_price,region,customer_name,customer_gender,total_amount\n';
  res.write(header);

  let lastId = 0;
  const batchSize = 5000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('sales')
      .select('*')
      .gt('id', lastId)
      .order('id', { ascending: true })
      .limit(batchSize);

    // Apply filters
    const regions = url.searchParams.get('regions');
    if (regions) {
      query = query.in('region', regions.split(',').filter(r => r.trim()));
    }

    const productCategories = url.searchParams.get('productCategories');
    if (productCategories) {
      query = query.in('product_category', productCategories.split(',').filter(p => p.trim()));
    }

    const genders = url.searchParams.get('genders');
    if (genders) {
      query = query.in('customer_gender', genders.split(',').filter(g => g.trim()));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Export error:', error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    // Write CSV rows
    for (const row of data) {
      const csvRow = [
        row.id,
        row.sale_date,
        `"${(row.product_name || '').replace(/"/g, '""')}"`,
        `"${(row.product_category || '').replace(/"/g, '""')}"`,
        row.quantity,
        row.unit_price,
        `"${(row.region || '').replace(/"/g, '""')}"`,
        `"${(row.customer_name || '').replace(/"/g, '""')}"`,
        `"${(row.customer_gender || '').replace(/"/g, '""')}"`,
        row.total_amount
      ].join(',');
      res.write(csvRow + '\n');
    }

    lastId = data[data.length - 1].id;
    
    if (data.length < batchSize) {
      hasMore = false;
    }
  }

  res.end();
}
