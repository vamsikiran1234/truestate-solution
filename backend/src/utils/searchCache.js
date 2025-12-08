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
  }

  /**
   * Initialize the cache by loading searchable data from Supabase
   * Only loads id, customer_name, and phone_number to minimize memory usage
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
    console.log('[SearchCache] Starting to build search cache...');
    const startTime = Date.now();

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Load in batches to avoid timeout
      const BATCH_SIZE = 50000;
      let offset = 0;
      let hasMore = true;
      this.records = [];

      while (hasMore) {
        const { data, error } = await supabase
          .from('sales')
          .select('id, customer_name, phone_number')
          .range(offset, offset + BATCH_SIZE - 1)
          .order('id', { ascending: true });

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
            phone: (row.phone_number || '').replace(/\D/g, '') // digits only
          });
        }

        offset += data.length;
        console.log(`[SearchCache] Loaded ${offset} records...`);

        if (data.length < BATCH_SIZE) {
          hasMore = false;
        }

        // Safety limit
        if (offset >= 1000000) {
          console.log('[SearchCache] Reached 1M limit');
          hasMore = false;
        }
      }

      this.isReady = true;
      this.lastBuildTime = new Date();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[SearchCache] Built cache with ${this.records.length} records in ${elapsed}s`);
      
      // Memory usage estimate: ~120 bytes per record = ~120MB for 1M records
      const memoryMB = Math.round((this.records.length * 120) / (1024 * 1024));
      console.log(`[SearchCache] Estimated memory usage: ~${memoryMB}MB`);
      
    } catch (error) {
      console.error('[SearchCache] Failed to build cache:', error.message);
    } finally {
      this.isLoading = false;
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
      lastBuildTime: this.lastBuildTime
    };
  }
}

// Singleton instance
const searchCache = new SearchCache();

module.exports = { searchCache };
