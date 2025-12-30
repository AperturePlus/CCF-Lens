/**
 * CCF Catalog Module
 * 
 * Provides access to CCF (China Computer Federation) ranked journals and conferences.
 * Supports lookup by abbreviation, full name, or aliases.
 * 
 * Requirements: 3.1, 3.6
 */

import catalogData from '../data/ccf-catalog.json'

/**
 * Represents a single entry in the CCF catalog
 */
export interface CCFEntry {
  /** Full name of the journal/conference */
  name: string
  /** Standard abbreviation */
  abbr: string
  /** CCF ranking: A, B, or C */
  rank: 'A' | 'B' | 'C'
  /** Type: journal or conference */
  type: 'journal' | 'conference'
  /** Category/field classification */
  category: string
  /** Alternative names and abbreviations */
  aliases: string[]
}

/**
 * CCF Catalog class for managing and querying CCF ranked venues
 */
export class CCFCatalog {
  private entries: Map<string, CCFEntry>
  private lookupIndex: Map<string, CCFEntry>

  constructor() {
    this.entries = new Map()
    this.lookupIndex = new Map()
    this.loadCatalog()
  }

  /**
   * Load catalog data and build lookup indices
   */
  private loadCatalog(): void {
    for (const entry of catalogData.entries) {
      const ccfEntry: CCFEntry = {
        name: entry.name,
        abbr: entry.abbr,
        rank: entry.rank as 'A' | 'B' | 'C',
        type: entry.type as 'journal' | 'conference',
        category: entry.category,
        aliases: entry.aliases || []
      }

      // Store by abbreviation as primary key
      this.entries.set(ccfEntry.abbr.toLowerCase(), ccfEntry)

      // Build lookup index for all possible keys
      this.addToLookupIndex(ccfEntry.abbr, ccfEntry)
      this.addToLookupIndex(ccfEntry.name, ccfEntry)

      // Add all aliases to lookup index
      for (const alias of ccfEntry.aliases) {
        this.addToLookupIndex(alias, ccfEntry)
      }
    }
  }

  /**
   * Add a key to the lookup index (case-insensitive)
   */
  private addToLookupIndex(key: string, entry: CCFEntry): void {
    const normalizedKey = key.toLowerCase().trim()
    if (normalizedKey && !this.lookupIndex.has(normalizedKey)) {
      this.lookupIndex.set(normalizedKey, entry)
    }
  }

  /**
   * Find an entry by abbreviation, full name, or alias
   * @param key - The search key (case-insensitive)
   * @returns The matching CCFEntry or null if not found
   */
  findByKey(key: string): CCFEntry | null {
    if (!key) return null
    const normalizedKey = key.toLowerCase().trim()
    return this.lookupIndex.get(normalizedKey) || null
  }

  /**
   * Get all entries in the catalog
   * @returns Array of all CCFEntry objects
   */
  getAllEntries(): CCFEntry[] {
    return Array.from(this.entries.values())
  }

  /**
   * Get entries filtered by rank
   * @param rank - The CCF rank to filter by ('A', 'B', or 'C')
   * @returns Array of CCFEntry objects with the specified rank
   */
  getByRank(rank: 'A' | 'B' | 'C'): CCFEntry[] {
    return this.getAllEntries().filter(entry => entry.rank === rank)
  }

  /**
   * Get entries filtered by type
   * @param type - The type to filter by ('journal' or 'conference')
   * @returns Array of CCFEntry objects with the specified type
   */
  getByType(type: 'journal' | 'conference'): CCFEntry[] {
    return this.getAllEntries().filter(entry => entry.type === type)
  }


  /**
   * Get entries filtered by category
   * @param category - The category to filter by
   * @returns Array of CCFEntry objects in the specified category
   */
  getByCategory(category: string): CCFEntry[] {
    return this.getAllEntries().filter(entry => entry.category === category)
  }

  /**
   * Check if a key exists in the catalog
   * @param key - The search key (case-insensitive)
   * @returns true if the key exists, false otherwise
   */
  has(key: string): boolean {
    return this.findByKey(key) !== null
  }

  /**
   * Get the total number of entries in the catalog
   * @returns The count of unique entries
   */
  get size(): number {
    return this.entries.size
  }

  /**
   * Get catalog version information
   */
  get version(): string {
    return catalogData.version
  }

  /**
   * Get catalog last updated date
   */
  get lastUpdated(): string {
    return catalogData.lastUpdated
  }
}

// Singleton instance for global access
let catalogInstance: CCFCatalog | null = null

/**
 * Get the singleton CCFCatalog instance
 * @returns The CCFCatalog singleton
 */
export function getCCFCatalog(): CCFCatalog {
  if (!catalogInstance) {
    catalogInstance = new CCFCatalog()
  }
  return catalogInstance
}

// Default export for convenience
export default getCCFCatalog
