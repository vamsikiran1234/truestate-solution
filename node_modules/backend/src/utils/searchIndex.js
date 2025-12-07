/**
 * High-Performance Search Index using Inverted Index
 * Optimized for searching Customer Name and Phone Number on 1M+ records
 * Memory-efficient implementation without full substring indexing
 */

/**
 * High-Performance Search Index using Inverted Index + Word Tokenization
 */
class SearchIndex {
  constructor() {
    // Word-based inverted index: word -> Set of record indices
    this.nameWordIndex = new Map();
    // Phone prefix index: normalized phone digits -> Set of record indices  
    this.phoneIndex = new Map();
    // Store normalized data for fast linear fallback
    this.normalizedData = [];
    this.dataLength = 0;
    this.isBuilt = false;
  }

  /**
   * Build the search index from data
   * Call once after data is loaded
   */
  build(data) {
    console.time('SearchIndex: Build time');
    
    this.nameWordIndex = new Map();
    this.phoneIndex = new Map();
    this.normalizedData = new Array(data.length);
    this.dataLength = data.length;

    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      
      // Normalize and store for fallback search
      const normalizedName = (record.customerName || '').toLowerCase();
      const normalizedPhone = (record.phoneNumber || '').toLowerCase();
      const phoneDigits = normalizedPhone.replace(/\D/g, '');
      
      this.normalizedData[i] = {
        name: normalizedName,
        phone: normalizedPhone,
        phoneDigits: phoneDigits
      };
      
      // Index words from customer name
      if (normalizedName) {
        const words = normalizedName.split(/\s+/).filter(w => w.length > 0);
        for (const word of words) {
          if (!this.nameWordIndex.has(word)) {
            this.nameWordIndex.set(word, new Set());
          }
          this.nameWordIndex.get(word).add(i);
        }
      }
      
      // Index phone number prefixes (first 3, 4, 5+ digits for quick lookup)
      if (phoneDigits.length >= 3) {
        for (let len = 3; len <= Math.min(phoneDigits.length, 6); len++) {
          const prefix = phoneDigits.substring(0, len);
          if (!this.phoneIndex.has(prefix)) {
            this.phoneIndex.set(prefix, new Set());
          }
          this.phoneIndex.get(prefix).add(i);
        }
        // Also index the last 4 digits (common search pattern)
        if (phoneDigits.length >= 4) {
          const lastFour = phoneDigits.slice(-4);
          if (!this.phoneIndex.has(lastFour)) {
            this.phoneIndex.set(lastFour, new Set());
          }
          this.phoneIndex.get(lastFour).add(i);
        }
      }
    }
    
    this.isBuilt = true;
    console.timeEnd('SearchIndex: Build time');
    console.log(`SearchIndex: Indexed ${data.length} records, ${this.nameWordIndex.size} unique words, ${this.phoneIndex.size} phone prefixes`);
  }

  /**
   * Search for records matching the query
   * Returns array of matching record indices, or null for empty query
   */
  search(query, data) {
    if (!query || query.trim().length === 0) {
      return null; // Return null to indicate "return all data"
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // If index is not built or data length changed, fall back to linear search
    if (!this.isBuilt || this.dataLength !== data.length) {
      console.log('SearchIndex: Falling back to linear search (index not ready)');
      return this.linearSearch(normalizedQuery);
    }
    
    console.time('SearchIndex: Search time');
    
    const resultSet = new Set();
    const queryDigits = normalizedQuery.replace(/\D/g, '');
    
    // Strategy 1: Word-based matching (fast path)
    // Check if query matches any indexed word as prefix or exact match
    let foundInWordIndex = false;
    for (const [word, indices] of this.nameWordIndex) {
      if (word.startsWith(normalizedQuery) || word === normalizedQuery) {
        foundInWordIndex = true;
        for (const idx of indices) {
          resultSet.add(idx);
        }
      }
    }
    
    // Strategy 2: Phone number index (fast path)
    if (queryDigits.length >= 3) {
      if (this.phoneIndex.has(queryDigits)) {
        for (const idx of this.phoneIndex.get(queryDigits)) {
          resultSet.add(idx);
        }
      }
      // Check prefixes of the query digits
      for (let len = 3; len <= Math.min(queryDigits.length, 6); len++) {
        const prefix = queryDigits.substring(0, len);
        if (this.phoneIndex.has(prefix)) {
          for (const idx of this.phoneIndex.get(prefix)) {
            resultSet.add(idx);
          }
        }
      }
    }
    
    // Strategy 3: Linear scan ONLY if no results found from indices
    // This is for substring matches that don't start words (e.g., "esh" in "Mahesh")
    if (resultSet.size === 0) {
      console.log('SearchIndex: No index matches, doing linear scan for substring');
      for (let i = 0; i < this.normalizedData.length; i++) {
        const item = this.normalizedData[i];
        if (item.name.includes(normalizedQuery) || 
            item.phone.includes(normalizedQuery) ||
            (queryDigits.length >= 3 && item.phoneDigits.includes(queryDigits))) {
          resultSet.add(i);
        }
      }
    }
    
    console.timeEnd('SearchIndex: Search time');
    console.log(`SearchIndex: Found ${resultSet.size} matches for "${query}"`);
    
    return Array.from(resultSet);
  }

  /**
   * Linear search on pre-normalized data (faster than normalizing on each search)
   */
  linearSearch(query) {
    const results = [];
    const queryDigits = query.replace(/\D/g, '');
    
    for (let i = 0; i < this.normalizedData.length; i++) {
      const item = this.normalizedData[i];
      if (item.name.includes(query) || 
          item.phone.includes(query) ||
          (queryDigits.length >= 3 && item.phoneDigits.includes(queryDigits))) {
        results.push(i);
      }
    }
    
    return results;
  }

  /**
   * Clear the index
   */
  clear() {
    this.nameWordIndex = new Map();
    this.phoneIndex = new Map();
    this.normalizedData = [];
    this.dataLength = 0;
    this.isBuilt = false;
  }
}

// Singleton instance
const searchIndex = new SearchIndex();

module.exports = {
  searchIndex,
  SearchIndex
};
