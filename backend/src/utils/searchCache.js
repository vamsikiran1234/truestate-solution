/**
 * Lightweight Search Cache for Supabase
 * Loads customer names and phone numbers for fast in-memory search
 * Works with 1M+ records by only loading searchable fields
 */

const { createClient } = require('@supabase/supabase-js');

class SearchCache {
  constructor() {
    this.records = []; // Array of { id, name (lowercase), phone (digits only) }
    this.isReady = false;
    this.isLoading = false;
    this.lastBuildTime = null;
    this.loadProgress = 0;
  }

  /**
   * Initialize the cache by loading searchable data from Supabase
   * First tries search_index table (faster), then falls back to sales table
   */
  async build(supabaseUrl, supabaseKey) {
    if (this.isLoading) {
      console.log('[SearchCache] Already loading, skipping...');
      return;
    }
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('[SearchCache] No Supabase credentials, skipping cache build');
      return;
    }

    this.isLoading = true;
    this.loadProgress = 0;
    console.log('[SearchCache] Starting to build search cache...');
    const startTime = Date.now();

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Try loading from search_index first (smaller, faster)
      const loadedFromIndex = await this.loadFromSearchIndex(supabase);
      
      if (!loadedFromIndex) {
        // Fall back to loading from sales table
        await this.loadFromSalesTable(supabase);
      }

      this.isReady = true;
      this.lastBuildTime = new Date();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[SearchCache] Built cache with ${this.records.length} records in ${elapsed}s`);
      
      // Memory usage estimate: ~80 bytes per record = ~80MB for 1M records
      const memoryMB = Math.round((this.records.length * 80) / (1024 * 1024));
      console.log(`[SearchCache] Estimated memory usage: ~${memoryMB}MB`);
      
    } catch (error) {
      console.error('[SearchCache] Failed to build cache:', error.message);
      // Mark as ready even if failed - we'll use other search methods
      this.isReady = false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load from search_index table (faster, smaller data)
   */
  async loadFromSearchIndex(supabase) {
    try {
      console.log('[SearchCache] Trying to load from search_index table...');
      
      // Use 1000-record batches (Supabase default limit)
      const BATCH_SIZE = 1000;
      let lastId = 0;
      let hasMore = true;
      this.records = [];

      while (hasMore) {
        // Use ID-based pagination instead of offset (more reliable)
        const { data, error } = await supabase
          .from('search_index')
          .select('id, name_lower, phone_digits')
          .gt('id', lastId)
          .order('id', { ascending: true })
          .limit(BATCH_SIZE);

        if (error) {
          console.log('[SearchCache] search_index not available:', error.message);
          return false;
        }

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        // Add to cache
        for (const row of data) {
          this.records.push({
            id: row.id,
            name: row.name_lower || '',
            phone: row.phone_digits || ''
          });
        }

        // Update lastId for next batch
        lastId = data[data.length - 1].id;
        this.loadProgress = this.records.length;
        
        // Log progress every 10000 records
        if (this.records.length % 10000 === 0 || data.length < BATCH_SIZE) {
          console.log(`[SearchCache] Loaded ${this.records.length} records from search_index...`);
        }

        if (data.length < BATCH_SIZE) {
          hasMore = false;
        }

        if (this.records.length >= 1000000) {
          hasMore = false;
        }
      }

      if (this.records.length >= 10000) {
        // Only use search_index if it has substantial data
        console.log(`[SearchCache] Successfully loaded ${this.records.length} from search_index`);
        return true;
      } else if (this.records.length > 0) {
        console.log(`[SearchCache] search_index only has ${this.records.length} records, falling back to sales table`);
        this.records = []; // Clear partial data
        return false;
      }
      return false;
      
    } catch (error) {
      console.log('[SearchCache] search_index load failed:', error.message);
      return false;
    }
  }

  /**
   * Load from sales table (fallback)
   */
  async loadFromSalesTable(supabase) {
    console.log('[SearchCache] Loading from sales table (this may take a few minutes for 1M records)...');
    
    // Use 1000-record batches (Supabase default limit)
    const BATCH_SIZE = 1000;
    let lastId = 0;
    let hasMore = true;
    this.records = [];

    while (hasMore) {
      const { data, error } = await supabase
        .from('sales')
        .select('id, customer_name, phone_number')
        .gt('id', lastId)
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);

      if (error) {
        console.error('[SearchCache] Error fetching batch:', error.message);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      // Add to cache with lowercase name and digits-only phone
      for (const row of data) {
        this.records.push({
          id: row.id,
          name: (row.customer_name || '').toLowerCase(),
          phone: (row.phone_number || '').replace(/\D/g, '')
        });
      }

      lastId = data[data.length - 1].id;
      this.loadProgress = this.records.length;
      
      // Log progress every 50000 records
      if (this.records.length % 50000 === 0 || data.length < BATCH_SIZE) {
        console.log(`[SearchCache] Loaded ${this.records.length} records from sales...`);
      }

      if (data.length < BATCH_SIZE) {
        hasMore = false;
      }

      if (this.records.length >= 1000000) {
        console.log('[SearchCache] Reached 1M limit');
        hasMore = false;
      }
    }
  }

  /**
   * Search for matching IDs using name or phone number
   * Returns array of matching record IDs (limited to maxResults)
   */
  search(query, maxResults = 100) {
    if (!this.isReady || !query || query.length < 2) {
      return null; // Return null to indicate cache not available
    }

    const startTime = Date.now();
    const normalizedQuery = query.toLowerCase().trim();
    const queryDigits = query.replace(/\D/g, ''); // Extract digits for phone search
    const results = [];

    // Strategy 1: Prefix search on name (fastest)
    for (let i = 0; i < this.records.length && results.length < maxResults; i++) {
      if (this.records[i].name.startsWith(normalizedQuery)) {
        results.push(this.records[i].id);
      }
    }

    // Strategy 2: Phone number search (if query has 3+ digits)
    if (queryDigits.length >= 3 && results.length < maxResults) {
      for (let i = 0; i < this.records.length && results.length < maxResults; i++) {
        const id = this.records[i].id;
        if (results.includes(id)) continue; // Skip if already found
        
        if (this.records[i].phone.includes(queryDigits)) {
          results.push(id);
        }
      }
    }

    // Strategy 3: Contains search on name (if few results so far)
    if (normalizedQuery.length >= 3 && results.length < maxResults) {
      for (let i = 0; i < this.records.length && results.length < maxResults; i++) {
        const id = this.records[i].id;
        if (results.includes(id)) continue;
        
        if (this.records[i].name.includes(normalizedQuery)) {
          results.push(id);
        }
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[SearchCache] Found ${results.length} matches for "${query}" in ${elapsed}ms`);

    return results;
  }

  /**
   * Get cache status
   */
  getStatus() {
    return {
      isReady: this.isReady,
      isLoading: this.isLoading,
      recordCount: this.records.length,
      loadProgress: this.loadProgress,
      lastBuildTime: this.lastBuildTime
    };
  }
}

// Singleton instance
const searchCache = new SearchCache();

module.exports = { searchCache };
