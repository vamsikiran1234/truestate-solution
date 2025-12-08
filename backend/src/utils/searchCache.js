/**
 * Lightweight Search Cache for Supabase
 * Loads only customer names and IDs for fast in-memory search
 * Works with 1M+ records by only loading searchable fields
 */

const { createClient } = require('@supabase/supabase-js');

class SearchCache {
  constructor() {
    this.names = []; // Array of { id, name (lowercase) }
    this.isReady = false;
    this.isLoading = false;
    this.lastBuildTime = null;
  }

  /**
   * Initialize the cache by loading searchable data from Supabase
   * Only loads id and customer_name to minimize memory usage
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
      this.names = [];

      while (hasMore) {
        const { data, error } = await supabase
          .from('sales')
          .select('id, customer_name')
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

        // Add to cache with lowercase name for case-insensitive search
        for (const row of data) {
          this.names.push({
            id: row.id,
            name: (row.customer_name || '').toLowerCase()
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
      console.log(`[SearchCache] Built cache with ${this.names.length} records in ${elapsed}s`);
      
      // Memory usage estimate: ~100 bytes per record = ~100MB for 1M records
      const memoryMB = Math.round((this.names.length * 100) / (1024 * 1024));
      console.log(`[SearchCache] Estimated memory usage: ~${memoryMB}MB`);
      
    } catch (error) {
      console.error('[SearchCache] Failed to build cache:', error.message);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Search for matching IDs using prefix matching
   * Returns array of matching record IDs (limited to maxResults)
   */
  search(query, maxResults = 100) {
    if (!this.isReady || !query || query.length < 2) {
      return null; // Return null to indicate cache not available
    }

    const startTime = Date.now();
    const normalizedQuery = query.toLowerCase().trim();
    const results = [];

    // Prefix search - O(n) but very fast since we're just comparing strings
    for (let i = 0; i < this.names.length && results.length < maxResults; i++) {
      if (this.names[i].name.startsWith(normalizedQuery)) {
        results.push(this.names[i].id);
      }
    }

    // If few prefix matches, also do contains search
    if (results.length < maxResults && normalizedQuery.length >= 3) {
      for (let i = 0; i < this.names.length && results.length < maxResults; i++) {
        const id = this.names[i].id;
        // Skip if already in results
        if (results.includes(id)) continue;
        
        if (this.names[i].name.includes(normalizedQuery)) {
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
      recordCount: this.names.length,
      lastBuildTime: this.lastBuildTime
    };
  }
}

// Singleton instance
const searchCache = new SearchCache();

module.exports = { searchCache };
