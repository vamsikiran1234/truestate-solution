const { createClient } = require('@supabase/supabase-js');
const { searchCache } = require('../utils/searchCache');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

let supabase = null;
let useDatabase = false;

// Cache for filter options (computed once, reused)
let filterOptionsCache = null;
let filterOptionsCacheTime = 0;
const FILTER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Convert snake_case to camelCase
 */
const snakeToCamel = (str) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

/**
 * Transform database row (snake_case) to API format (camelCase)
 */
const transformRow = (row) => {
  if (!row) return row;
  const transformed = {};
  for (const [key, value] of Object.entries(row)) {
    transformed[snakeToCamel(key)] = value;
  }
  return transformed;
};

/**
 * Transform array of rows
 */
const transformRows = (rows) => {
  if (!Array.isArray(rows)) return rows;
  return rows.map(transformRow);
};

/**
 * Initialize Supabase client
 */
const initSupabase = () => {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    useDatabase = true;
    console.log('✓ Supabase database connected');
    
    // Build search cache in background (non-blocking)
    // This loads customer names into memory for fast search
    setTimeout(() => {
      searchCache.build(supabaseUrl, supabaseKey).catch(err => {
        console.error('Failed to build search cache:', err.message);
      });
    }, 1000); // Delay 1s to let server start first
    
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
 * Uses pre-computed stats table for instant response
 */
const getAllSalesFromDB = async () => {
  if (!supabase) return null;
  
  try {
    console.time('Database stats query');
    
    // First try: Query the pre-computed sales_stats table (instant!)
    const { data: statsData, error: statsError } = await supabase
      .from('sales_stats')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (!statsError && statsData && statsData.total_records > 0) {
      console.timeEnd('Database stats query');
      console.log(`Retrieved stats from sales_stats table (${statsData.total_records} records)`);
      return statsData;
    }
    
    // Second try: RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_sales_stats');
    
    if (!rpcError && rpcData) {
      console.timeEnd('Database stats query');
      const stats = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : rpcData;
      console.log(`Retrieved stats from RPC (${stats?.total_records || 0} records)`);
      return stats;
    }
    
    // Final fallback: just get the count
    console.log('Using fallback count query');
    const { count } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });
    
    console.timeEnd('Database stats query');
    console.log(`Retrieved count from database (${count || 0} records)`);
    
    return { 
      total_records: count || 0,
      total_sales: 0,
      total_quantity: 0,
      total_discount: 0,
      average_order_value: 0
    };
  } catch (error) {
    console.error('Database query error:', error);
    return null;
  }
};

/**
 * Get filtered sales data from database
 * Uses optimized RPC function if available, falls back to direct queries
 */
const getFilteredSalesFromDB = async (filters, sorting, pagination) => {
  if (!supabase) return null;
  
  // Debug: Log received filters
  console.log('[DB] getFilteredSalesFromDB called with filters:', JSON.stringify(filters));
  
  try {
    const startTime = Date.now();
    
    // Try using RPC function for better performance
    const useRPC = filters.search && filters.search.length >= 3;
    
    if (useRPC) {
      console.log('[DB] Attempting RPC-based search for better performance...');
      try {
        const offset = (pagination.page - 1) * pagination.limit;
        const sortColumn = sorting.sortBy === 'date' ? 'date' : 
                          sorting.sortBy === 'amount' ? 'amount' : 
                          sorting.sortBy === 'customer' ? 'customer' : 'date';
        
        const { data: rpcData, error: rpcError } = await supabase.rpc('search_sales_with_filters', {
          p_search: filters.search.trim(),
          p_regions: filters.regions?.length > 0 ? filters.regions : null,
          p_genders: filters.genders?.length > 0 ? filters.genders : null,
          p_categories: filters.categories?.length > 0 ? filters.categories : null,
          p_payment_methods: filters.paymentMethods?.length > 0 ? filters.paymentMethods : null,
          p_min_age: filters.minAge || null,
          p_max_age: filters.maxAge || null,
          p_start_date: filters.startDate || null,
          p_end_date: filters.endDate || null,
          p_page_offset: offset,
          p_page_limit: pagination.limit,
          p_sort_column: sortColumn,
          p_sort_asc: sorting.sortOrder === 'asc'
        });
        
        if (!rpcError && rpcData && rpcData.length > 0) {
          const totalCount = rpcData[0]?.total_count || rpcData.length;
          const queryTime = ((Date.now() - startTime) / 1000).toFixed(3);
          console.log(`[DB] RPC search completed: ${queryTime}s, ${rpcData.length} records, total: ${totalCount}`);
          
          return {
            data: transformRows(rpcData) || [],
            totalItems: totalCount,
            currentPage: pagination.page,
            totalPages: Math.ceil(totalCount / pagination.limit),
            itemsPerPage: pagination.limit,
            hasNextPage: pagination.page < Math.ceil(totalCount / pagination.limit),
            hasPrevPage: pagination.page > 1
          };
        }
        
        if (rpcError) {
          console.log('[DB] RPC not available, falling back to direct query:', rpcError.message);
        }
      } catch (rpcErr) {
        console.log('[DB] RPC failed, using direct query:', rpcErr.message);
      }
    }
    
    // Build base filter conditions for both queries
    const applyFilters = (query) => {
      console.log('[DB] Applying filters to query...');
      
      // Search - uses OR between multiple fields
      // Only apply search if it has 3+ characters (faster and more meaningful results)
      if (filters.search && filters.search.length >= 3) {
        console.log('[DB] Adding search filter:', filters.search);
        // OPTIMIZED: Use prefix matching ONLY on customer_name (uses trigram index)
        // This is MUCH faster than contains matching with leading %
        const searchTerm = filters.search.trim();
        // Only use prefix matching - contains is too slow on 1M records
        query = query.ilike('customer_name', `${searchTerm}%`);
      } else if (filters.search && filters.search.length > 0 && filters.search.length < 3) {
        console.log('[DB] Search term too short, skipping:', filters.search);
      }
      
      // All these use AND (chained .in() and comparison operators)
      if (filters.regions && Array.isArray(filters.regions) && filters.regions.length > 0) {
        console.log('[DB] Adding regions filter:', filters.regions);
        query = query.in('customer_region', filters.regions);
      }
      if (filters.genders && Array.isArray(filters.genders) && filters.genders.length > 0) {
        console.log('[DB] Adding genders filter:', filters.genders);
        query = query.in('gender', filters.genders);
      }
      if (filters.categories && Array.isArray(filters.categories) && filters.categories.length > 0) {
        console.log('[DB] Adding categories filter:', filters.categories);
        query = query.in('product_category', filters.categories);
      }
      if (filters.paymentMethods && Array.isArray(filters.paymentMethods) && filters.paymentMethods.length > 0) {
        console.log('[DB] Adding paymentMethods filter:', filters.paymentMethods);
        query = query.in('payment_method', filters.paymentMethods);
      }
      
      // Tags filter - tags are stored as comma-separated string
      if (filters.tags && Array.isArray(filters.tags) && filters.tags.length === 1) {
        console.log('[DB] Adding single tag filter:', filters.tags[0]);
        query = query.ilike('tags', `%${filters.tags[0]}%`);
      } else if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 1) {
        console.log('[DB] Adding multiple tags filter:', filters.tags);
        const tagPatterns = filters.tags.map(tag => `tags.ilike.%${tag}%`).join(',');
        query = query.or(tagPatterns);
      }
      
      if (filters.minAge !== null && filters.minAge !== undefined) {
        console.log('[DB] Adding minAge filter:', filters.minAge);
        query = query.gte('age', filters.minAge);
      }
      if (filters.maxAge !== null && filters.maxAge !== undefined) {
        console.log('[DB] Adding maxAge filter:', filters.maxAge);
        query = query.lte('age', filters.maxAge);
      }
      if (filters.startDate) {
        console.log('[DB] Adding startDate filter:', filters.startDate);
        query = query.gte('date', filters.startDate);
      }
      if (filters.endDate) {
        console.log('[DB] Adding endDate filter:', filters.endDate);
        query = query.lte('date', filters.endDate);
      }
      
      console.log('[DB] Filters applied successfully');
      return query;
    };
    
    // Check if any filters are active - be more explicit
    const hasFilters = !!(
      filters.search || 
      (filters.regions && filters.regions.length > 0) || 
      (filters.genders && filters.genders.length > 0) || 
      (filters.categories && filters.categories.length > 0) || 
      (filters.paymentMethods && filters.paymentMethods.length > 0) || 
      (filters.tags && filters.tags.length > 0) ||
      (filters.minAge !== null && filters.minAge !== undefined) || 
      (filters.maxAge !== null && filters.maxAge !== undefined) || 
      filters.startDate || 
      filters.endDate
    );
    
    // Count how many filter types are active
    const activeFilterCount = [
      filters.search,
      filters.regions?.length > 0,
      filters.genders?.length > 0,
      filters.categories?.length > 0,
      filters.paymentMethods?.length > 0,
      filters.tags?.length > 0,
      filters.minAge !== null && filters.minAge !== undefined,
      filters.maxAge !== null && filters.maxAge !== undefined,
      filters.startDate,
      filters.endDate
    ].filter(Boolean).length;
    
    console.log('[DB] hasFilters:', hasFilters, '| activeFilterCount:', activeFilterCount);
    
    // Check if search is present (regardless of other filters)
    const hasSearch = filters.search && filters.search.length >= 2;
    const hasOtherFilters = activeFilterCount > (hasSearch ? 1 : 0);
    
    // OPTIMIZATION: When search is present, use multi-strategy search
    if (hasSearch) {
      console.log('[DB] Search detected, using multi-strategy search');
      const searchTerm = filters.search.trim().toLowerCase();
      
      // Get matching IDs using various strategies
      let matchingIds = null;
      let searchMethod = 'none';
      
      // Try 1: In-memory cache FIRST (instant if loaded - most reliable)
      const cacheStatus = searchCache.getStatus();
      if (cacheStatus.isReady) {
        matchingIds = searchCache.search(searchTerm, 500); // Increased from 200 to 500
        if (matchingIds && matchingIds.length > 0) {
          searchMethod = 'cache';
          console.log(`[DB] Cache found ${matchingIds.length} matches`);
        }
      } else {
        console.log(`[DB] Cache status: ${cacheStatus.isLoading ? 'loading...' : 'not started'}, records: ${cacheStatus.recordCount}`);
      }
      
      // Try 2: fast_search RPC function (if cache not ready)
      if (!matchingIds) {
        try {
          const { data: searchIds, error: rpcError } = await supabase
            .rpc('fast_search', { search_term: searchTerm, max_results: 200 });
          
          if (!rpcError && searchIds && searchIds.length > 0) {
            matchingIds = searchIds.map(r => r.matching_id);
            searchMethod = 'fast_search';
            console.log(`[DB] fast_search RPC found ${matchingIds.length} matches`);
          } else if (rpcError) {
            console.log('[DB] fast_search RPC not available:', rpcError.message);
          }
        } catch (e) {
          console.log('[DB] fast_search RPC failed:', e.message);
        }
      }
      
      // Try 3: search_with_ids RPC function (alternative)
      if (!matchingIds) {
        try {
          const { data: searchIds, error: rpcError } = await supabase
            .rpc('search_with_ids', { search_term: searchTerm, max_results: 200 });
          
          if (!rpcError && searchIds && searchIds.length > 0) {
            matchingIds = searchIds.map(r => r.matching_id);
            searchMethod = 'search_with_ids';
            console.log(`[DB] search_with_ids RPC found ${matchingIds.length} matches`);
          } else if (rpcError) {
            console.log('[DB] search_with_ids RPC not available:', rpcError.message);
          }
        } catch (e) {
          console.log('[DB] search_with_ids RPC failed:', e.message);
        }
      }
      
      // Try 4: Direct search_index table query
      if (!matchingIds) {
        try {
          const searchPattern = `${searchTerm}%`;
          const { data: indexData, error: indexError } = await supabase
            .from('search_index')
            .select('id')
            .ilike('first_name', searchPattern)
            .limit(200);
          
          if (!indexError && indexData && indexData.length > 0) {
            matchingIds = indexData.map(r => r.id);
            searchMethod = 'search_index';
            console.log(`[DB] search_index found ${matchingIds.length} matches`);
          } else if (indexError) {
            console.log('[DB] search_index not available:', indexError.message);
          }
        } catch (e) {
          console.log('[DB] search_index query failed:', e.message);
        }
      }
      
      // Try 5: Quick scan of first 100k records using ID range (works without indexes!)
      if (!matchingIds) {
        try {
          console.log('[DB] Using optimized ID range scan (fallback)');
          const searchPattern = `%${searchTerm}%`; // Changed to contains search
          
          // OPTIMIZED: Use smaller batches with LIMIT to avoid timeout
          const SCAN_SIZE = 20000; // Reduced from 50k to 20k
          const MAX_SCANS = 3; // Scan up to 60k records (faster)
          const foundIds = [];
          
          for (let scan = 0; scan < MAX_SCANS && foundIds.length < 100; scan++) {
            const startId = scan * SCAN_SIZE + 1;
            const endId = (scan + 1) * SCAN_SIZE;
            
            const { data: scanData, error: scanError } = await supabase
              .from('sales')
              .select('id')
              .gte('id', startId)
              .lte('id', endId)
              .or(`customer_name.ilike.${searchPattern},phone_number.ilike.${searchPattern}`)
              .limit(100);
            
            if (scanError) {
              console.log(`[DB] Scan ${scan} failed:`, scanError.message);
              break;
            }
            
            if (scanData && scanData.length > 0) {
              foundIds.push(...scanData.map(r => r.id));
              console.log(`[DB] Scan ${scan} (IDs ${startId}-${endId}) found ${scanData.length} matches`);
            }
            
            // If we found enough matches, stop scanning
            if (foundIds.length >= 100) break;
          }
          
          if (foundIds.length > 0) {
            matchingIds = foundIds.slice(0, 500);
            searchMethod = 'id_range_scan';
            console.log(`[DB] ID range scan found ${matchingIds.length} total matches`);
          }
        } catch (e) {
          console.log('[DB] ID range scan failed:', e.message);
        }
      }
      
      // If still no results and cache is loading, return helpful message
      if (!matchingIds && cacheStatus.isLoading) {
        console.log('[DB] Search cache is loading, returning partial response');
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
        return {
          data: [],
          totalItems: 0,
          currentPage: 1,
          totalPages: 0,
          itemsPerPage: pagination.limit,
          hasNextPage: false,
          hasPrevPage: false,
          searchStatus: 'loading',
          message: 'Search index is being built. Please try again in a moment.'
        };
      }
      
      // If no matches found after all strategies, return empty result
      if (!matchingIds || matchingIds.length === 0) {
        console.log('[DB] No search matches found after all strategies');
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
        return {
          data: [],
          totalItems: 0,
          currentPage: 1,
          totalPages: 0,
          itemsPerPage: pagination.limit,
          hasNextPage: false,
          hasPrevPage: false
        };
      }
      
      // If we have matching IDs, query sales table with those IDs + other filters
      console.log(`[DB] Querying sales table with ${matchingIds.length} matching IDs`);
      
      // Build query with ID filter and other filters
      let query = supabase.from('sales').select('*', { count: 'exact' });
      query = query.in('id', matchingIds);
        
        // Apply additional filters
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
        if (filters.tags?.length === 1) {
          query = query.ilike('tags', `%${filters.tags[0]}%`);
        } else if (filters.tags?.length > 1) {
          const tagPatterns = filters.tags.map(tag => `tags.ilike.%${tag}%`).join(',');
          query = query.or(tagPatterns);
        }
        if (filters.minAge !== null && filters.minAge !== undefined) {
          query = query.gte('age', filters.minAge);
        }
        if (filters.maxAge !== null && filters.maxAge !== undefined) {
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
        const offset = (pagination.page - 1) * pagination.limit;
        query = query.range(offset, offset + pagination.limit - 1);
        
        const { data: searchData, error: searchError, count } = await query;
        
        if (!searchError) {
          const totalCount = count || searchData?.length || 0;
          const queryTime = ((Date.now() - startTime) / 1000).toFixed(3);
          console.log(`[DB] Search+filters completed: ${queryTime}s, ${searchData?.length || 0} records, total: ${totalCount}`);
          
          return {
            data: transformRows(searchData) || [],
            totalItems: totalCount,
            currentPage: pagination.page,
            totalPages: Math.ceil(totalCount / pagination.limit),
            itemsPerPage: pagination.limit,
            hasNextPage: pagination.page < Math.ceil(totalCount / pagination.limit),
            hasPrevPage: pagination.page > 1
          };
        }
        console.log('[DB] Search+filters query error:', searchError.message);
      }
    }
    
    // Get total count with filters (use pre-computed stats if no filters)
    let totalCount;
    
    if (!hasFilters) {
      // No filters - use cached count from sales_stats table (instant!)
      const { data: statsData } = await supabase
        .from('sales_stats')
        .select('total_records')
        .eq('id', 1)
        .single();
      totalCount = statsData?.total_records || 1000000;
      console.log('[DB] No filters - using cached count:', totalCount);
    } else {
      // Has filters - get count WITH data query (more reliable than separate count)
      // This avoids the timeout issue with count-only queries on Supabase free tier
      console.log('[DB] Has filters - will get count with data query...');
      totalCount = null; // Will be calculated from data query
    }
    
    const offset = (pagination.page - 1) * pagination.limit;
    
    // Determine sort column
    const sortColumn = sorting.sortBy === 'date' ? 'date' : 
                       sorting.sortBy === 'amount' ? 'final_amount' : 
                       sorting.sortBy === 'customer' ? 'customer_name' : 'date';
    const sortAsc = sorting.sortOrder === 'asc';
    
    let data;
    let error;
    
    // For tags filter, we get count with data query to avoid timeout
    const needsCountWithData = totalCount === null;
    
    // For pages in the last 10% of data, query from the opposite direction
    // This is much faster because we use a smaller offset
    // Skip this optimization if we don't know totalCount yet (tags filter)
    const OFFSET_THRESHOLD = totalCount ? Math.floor(totalCount * 0.7) : Infinity; // 70% threshold
    const isNearEnd = offset > OFFSET_THRESHOLD && !hasFilters;
    
    if (isNearEnd) {
      // Query from the opposite direction with smaller offset
      const reverseOffset = totalCount - offset - pagination.limit;
      const actualOffset = Math.max(0, reverseOffset);
      const actualLimit = Math.min(pagination.limit, totalCount - offset);
      
      if (actualLimit <= 0) {
        // Beyond data range
        data = [];
        error = null;
      } else {
        let query = supabase.from('sales').select('*');
        query = applyFilters(query);
        // Query in reverse order
        query = query.order(sortColumn, { ascending: !sortAsc });
        query = query.range(actualOffset, actualOffset + actualLimit - 1);
        
        const result = await query;
        // Reverse the results to get correct order
        data = result.data?.reverse() || [];
        error = result.error;
      }
    } else {
      // Standard query for earlier pages
      // Only use count: 'exact' for single filters (avoids timeout on multi-filter queries)
      const useExactCount = activeFilterCount <= 1;
      
      let query;
      if (useExactCount) {
        query = supabase.from('sales').select('*', { count: 'exact' });
        console.log('[DB] Using exact count (single filter)');
      } else {
        query = supabase.from('sales').select('*');
        console.log('[DB] Skipping count query (multiple filters - would timeout)');
      }
      
      query = applyFilters(query);
      query = query.order(sortColumn, { ascending: sortAsc });
      query = query.range(offset, offset + pagination.limit - 1);
      
      const result = await query;
      data = result.data;
      error = result.error;
      
      // Get the count from the result if available
      if (needsCountWithData) {
        if (useExactCount && result.count !== null && result.count !== undefined) {
          totalCount = result.count;
          console.log('[DB] Got exact count from data query:', totalCount);
        } else {
          // For multi-filter queries, estimate based on filter selectivity
          // Each filter typically reduces the dataset by ~20-50%
          const baseCount = 1000000;
          // More filters = smaller result set
          const estimatedSelectivity = Math.pow(0.35, activeFilterCount);
          const estimatedCount = Math.round(baseCount * estimatedSelectivity);
          
          // But also check if we're on the last page
          if (data && data.length < pagination.limit) {
            totalCount = offset + (data?.length || 0); // Last page - exact
            console.log('[DB] Exact count (last page):', totalCount);
          } else {
            totalCount = Math.max(estimatedCount, pagination.limit * 10);
            console.log('[DB] Estimated count (multi-filter):', totalCount, `(${activeFilterCount} filters, selectivity: ${(estimatedSelectivity * 100).toFixed(1)}%)`);
          }
        }
      }
    }
    
    if (error) throw error;
    
    const queryTime = ((Date.now() - startTime) / 1000).toFixed(3);
    console.log(`Database query completed: ${queryTime}s, returned ${data?.length || 0} records`);
    
    // Transform snake_case to camelCase for frontend
    const transformedData = transformRows(data);
    
    return {
      data: transformedData || [],
      totalItems: totalCount || 0,
      currentPage: pagination.page,
      totalPages: Math.ceil((totalCount || 0) / pagination.limit),
      itemsPerPage: pagination.limit,
      hasNextPage: pagination.page < Math.ceil((totalCount || 0) / pagination.limit),
      hasPrevPage: pagination.page > 1
    };
  } catch (error) {
    if (error.code === '57014') {
      console.error('Query timeout - consider using filters to narrow results');
      throw new Error('Query timeout. Please add filters or use a smaller page number.');
    }
    console.error('Database filter query error:', error);
    throw error;
  }
};

/**
 * Get filter options from database using efficient queries
 */
const getFilterOptionsFromDB = async () => {
  if (!supabase) return null;
  
  // Check in-memory cache first (fastest!)
  const now = Date.now();
  if (filterOptionsCache && (now - filterOptionsCacheTime) < FILTER_CACHE_TTL) {
    console.log('Using in-memory cached filter options');
    return filterOptionsCache;
  }
  
  try {
    // First try: Get from pre-computed filter_options table (instant!)
    const { data: cachedOptions, error: cacheError } = await supabase
      .from('filter_options')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (!cacheError && cachedOptions && cachedOptions.tags && cachedOptions.tags.length > 0) {
      console.log('Using cached filter options from DB table (with tags)');
      const result = {
        regions: cachedOptions.regions || [],
        genders: cachedOptions.genders || [],
        categories: cachedOptions.categories || [],
        paymentMethods: cachedOptions.payment_methods || [],
        tags: cachedOptions.tags || [],
        ageRange: { min: cachedOptions.min_age || 18, max: cachedOptions.max_age || 70 },
        dateRange: { min: cachedOptions.min_date || '2021-01-01', max: cachedOptions.max_date || '2023-12-31' }
      };
      
      // Cache the result in memory
      filterOptionsCache = result;
      filterOptionsCacheTime = Date.now();
      return result;
    }
    
    // If we have cachedOptions but no tags, use cached data and compute tags only
    if (!cacheError && cachedOptions) {
      console.log('Using cached filter options from DB, computing tags separately...');
      
      // Get tags from a sample (Supabase free tier limits to 1000 rows per request)
      const { data: tagsData } = await supabase.from('sales').select('tags').limit(1000);
      const tags = [...new Set(
        tagsData?.flatMap(t => t.tags ? t.tags.split(',').map(tag => tag.trim()) : []).filter(Boolean)
      )].sort();
      
      const result = {
        regions: cachedOptions.regions || [],
        genders: cachedOptions.genders || [],
        categories: cachedOptions.categories || [],
        paymentMethods: cachedOptions.payment_methods || [],
        tags: tags,
        ageRange: { min: cachedOptions.min_age || 18, max: cachedOptions.max_age || 70 },
        dateRange: { min: cachedOptions.min_date || '2021-01-01', max: cachedOptions.max_date || '2023-12-31' }
      };
      filterOptionsCache = result;
      filterOptionsCacheTime = Date.now();
      return result;
    }
    
    // Fallback: Query directly with larger sampling to ensure we get all unique values
    console.log('Computing filter options from database...');
    const [regionsResult, gendersResult, categoriesResult, paymentMethodsResult, tagsResult, ageResult, dateResult] = await Promise.all([
      supabase.from('sales').select('customer_region').limit(100000), // Larger sample for regions
      supabase.from('sales').select('gender').limit(10000),
      supabase.from('sales').select('product_category').limit(10000),
      supabase.from('sales').select('payment_method').limit(10000),
      supabase.from('sales').select('tags').limit(100000), // Sample for tags (comma-separated)
      supabase.from('sales').select('age').order('age', { ascending: true }).limit(1),
      supabase.from('sales').select('date').order('date', { ascending: true }).limit(1)
    ]);
    
    const [maxAgeResult, maxDateResult] = await Promise.all([
      supabase.from('sales').select('age').order('age', { ascending: false }).limit(1),
      supabase.from('sales').select('date').order('date', { ascending: false }).limit(1)
    ]);
    
    const regions = [...new Set(regionsResult.data?.map(r => r.customer_region).filter(Boolean))].sort();
    const genders = [...new Set(gendersResult.data?.map(g => g.gender).filter(Boolean))].sort();
    const categories = [...new Set(categoriesResult.data?.map(c => c.product_category).filter(Boolean))].sort();
    const paymentMethods = [...new Set(paymentMethodsResult.data?.map(p => p.payment_method).filter(Boolean))].sort();
    // Extract unique tags from comma-separated strings
    const tags = [...new Set(
      tagsResult.data?.flatMap(t => t.tags ? t.tags.split(',').map(tag => tag.trim()) : []).filter(Boolean)
    )].sort();
    
    const result = {
      regions,
      genders,
      categories,
      paymentMethods,
      tags,
      ageRange: { 
        min: ageResult.data?.[0]?.age || 18, 
        max: maxAgeResult.data?.[0]?.age || 70 
      },
      dateRange: { 
        min: dateResult.data?.[0]?.date || '2021-01-01', 
        max: maxDateResult.data?.[0]?.date || '2023-12-31' 
      }
    };
    
    // Cache the result in memory
    filterOptionsCache = result;
    filterOptionsCacheTime = Date.now();
    
    return result;
  } catch (error) {
    console.error('Database filter options error:', error);
    // Return default filter options as fallback
    return {
      regions: ['Central', 'East', 'North', 'South', 'West'],
      genders: ['Female', 'Male'],
      categories: ['Beauty', 'Clothing', 'Electronics'],
      paymentMethods: ['Cash', 'Credit Card', 'Debit Card', 'EMI', 'Net Banking', 'UPI'],
      tags: ['accessories', 'beauty', 'casual', 'cotton', 'fashion', 'formal', 'fragrance-free', 'gadgets', 'makeup', 'organic', 'portable', 'skincare', 'smart', 'unisex', 'wireless'],
      ageRange: { min: 18, max: 70 },
      dateRange: { min: '2021-01-01', max: '2023-12-31' }
    };
  }
};

/**
 * Export sales data in batches for large CSV exports
 * Uses cursor-based pagination with parallel fetching for speed
 * @param {Object} filters - Filter criteria
 * @param {Object} sorting - Sort options
 * @param {Function} onBatch - Callback function called with each batch of data
 * @returns {Promise<number>} Total number of records exported
 */
const exportSalesFromDB = async (filters, sorting, onBatch) => {
  if (!supabase) return 0;
  
  const BATCH_SIZE = 1000; // Supabase max per request
  const PARALLEL_BATCHES = 5; // Fetch 5 batches in parallel for 5x speed
  let totalExported = 0;
  let hasMore = true;
  let lastId = 0;
  
  // Check if any filters are active
  const hasFilters = !!(
    filters.search || 
    filters.regions?.length > 0 || 
    filters.genders?.length > 0 || 
    filters.categories?.length > 0 || 
    filters.paymentMethods?.length > 0 || 
    filters.tags?.length > 0 ||
    filters.minAge || filters.maxAge ||
    filters.startDate || filters.endDate
  );
  
  console.log('[Export] Starting export with filters:', JSON.stringify(filters));
  console.log('[Export] Has active filters:', hasFilters);
  const startTime = Date.now();
  
  // Build filter function
  const applyFilters = (query) => {
    if (filters.search) {
      query = query.or(`customer_name.ilike.%${filters.search}%,phone_number.ilike.%${filters.search}%`);
    }
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
    if (filters.tags?.length === 1) {
      query = query.ilike('tags', `%${filters.tags[0]}%`);
    } else if (filters.tags?.length > 1) {
      const tagPatterns = filters.tags.map(tag => `tags.ilike.%${tag}%`).join(',');
      query = query.or(tagPatterns);
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
    return query;
  };

  // Fetch a single batch starting from a given ID (cursor-based)
  const fetchBatch = async (startId) => {
    let query = supabase.from('sales').select('*');
    query = applyFilters(query);
    query = query.gt('id', startId);
    query = query.order('id', { ascending: true });
    query = query.limit(BATCH_SIZE);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  // Fetch multiple batches in parallel using ID ranges
  const fetchParallelBatches = async (startId, numBatches) => {
    // First, get IDs at intervals to define ranges for parallel fetching
    let query = supabase.from('sales').select('id');
    query = applyFilters(query);
    query = query.gt('id', startId);
    query = query.order('id', { ascending: true });
    query = query.limit(BATCH_SIZE * numBatches);
    
    const { data: allIds, error: idsError } = await query;
    if (idsError) throw idsError;
    if (!allIds || allIds.length === 0) return [];
    
    // Split into chunks and fetch data for each chunk in parallel
    const chunks = [];
    for (let i = 0; i < numBatches && i * BATCH_SIZE < allIds.length; i++) {
      const startIdx = i * BATCH_SIZE;
      const endIdx = Math.min((i + 1) * BATCH_SIZE, allIds.length);
      if (startIdx < allIds.length) {
        const chunkStartId = i === 0 ? startId : allIds[startIdx - 1].id;
        const chunkEndId = allIds[endIdx - 1]?.id;
        if (chunkEndId) {
          chunks.push({ startId: chunkStartId, endId: chunkEndId });
        }
      }
    }
    
    // Fetch all chunks in parallel
    const batchPromises = chunks.map(async (chunk) => {
      let q = supabase.from('sales').select('*');
      q = applyFilters(q);
      q = q.gt('id', chunk.startId);
      q = q.lte('id', chunk.endId);
      q = q.order('id', { ascending: true });
      
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    });
    
    const results = await Promise.all(batchPromises);
    return results.flat();
  };
  
  try {
    // Use parallel fetching for faster exports
    while (hasMore) {
      let batch;
      
      // Try parallel fetching first (faster for large exports)
      try {
        batch = await fetchParallelBatches(lastId, PARALLEL_BATCHES);
      } catch (parallelError) {
        console.log('[Export] Parallel fetch failed, falling back to sequential:', parallelError.message);
        batch = await fetchBatch(lastId);
      }
      
      if (!batch || batch.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process batch
      await onBatch(transformRows(batch));
      totalExported += batch.length;
      
      // Update cursor to last ID in this batch
      lastId = batch[batch.length - 1].id;
      
      // Check if this was the last batch (less than expected parallel batch size)
      if (batch.length < BATCH_SIZE * PARALLEL_BATCHES) {
        hasMore = false;
        // Don't break - still need to process this batch
      }
      
      // Log progress every 25k records (more frequent for faster exports)
      if (totalExported % 25000 < BATCH_SIZE * PARALLEL_BATCHES) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = Math.round(totalExported / parseFloat(elapsed));
        console.log(`[Export] Progress: ${totalExported} records in ${elapsed}s (${rate} rec/s)`);
      }
      
      // Safety limit
      if (totalExported >= 1000000) {
        console.log('[Export] Reached 1M record limit');
        hasMore = false;
      }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Export] Completed: ${totalExported} records in ${totalTime}s`);
    return totalExported;
  } catch (error) {
    console.error('[Export] Error:', error.message);
    console.log(`[Export] Stopped with ${totalExported} records`);
    return totalExported;
  }
};

/**
 * Get search cache status
 */
const getSearchCacheStatus = () => {
  return searchCache.getStatus();
};

module.exports = {
  initSupabase,
  isUsingDatabase,
  getAllSalesFromDB,
  getFilteredSalesFromDB,
  getFilterOptionsFromDB,
  exportSalesFromDB,
  getSearchCacheStatus
};
