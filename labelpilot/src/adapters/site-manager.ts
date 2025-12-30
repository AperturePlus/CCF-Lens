/**
 * Site Manager Module
 * 
 * Manages site adapters and coordinates paper processing across different
 * academic websites. Handles adapter registration, site detection, and
 * maintains processing state.
 * 
 * Requirements: 1.5 - Support extensible plugin mechanism for new academic sites
 */

import type { 
  SiteAdapter, 
  SiteAdapterFactory,
  ProcessedPaperInfo 
} from './types'
import { getVenueMatcher, type MatchResult } from '../core/venue-matcher'

/**
 * SiteManager class for managing site adapters and coordinating paper processing
 */
export class SiteManager {
  /** Registered adapters by site ID */
  private adapters: Map<string, SiteAdapter> = new Map()
  
  /** Adapter factories for lazy instantiation */
  private factories: Map<string, SiteAdapterFactory> = new Map()
  
  /** Currently active adapter for the current page */
  private currentAdapter: SiteAdapter | null = null
  
  /** Processed papers with their match results */
  private processedPapers: Map<string, ProcessedPaperInfo> = new Map()
  
  /** Set of processed element IDs to prevent duplicate processing */
  private processedElements: Set<string> = new Set()

  /**
   * Register a site adapter instance
   * @param adapter - The adapter to register
   */
  registerAdapter(adapter: SiteAdapter): void {
    if (this.adapters.has(adapter.siteId)) {
      console.warn(`[SiteManager] Adapter '${adapter.siteId}' already registered, replacing`)
    }
    this.adapters.set(adapter.siteId, adapter)
  }

  /**
   * Register a site adapter factory for lazy instantiation
   * @param siteId - The site identifier
   * @param factory - Factory function to create the adapter
   */
  registerAdapterFactory(siteId: string, factory: SiteAdapterFactory): void {
    this.factories.set(siteId, factory)
  }

  /**
   * Get an adapter by site ID, instantiating from factory if needed
   * @param siteId - The site identifier
   * @returns The adapter or null if not found
   */
  getAdapter(siteId: string): SiteAdapter | null {
    // Check if already instantiated
    if (this.adapters.has(siteId)) {
      return this.adapters.get(siteId)!
    }

    // Try to instantiate from factory
    const factory = this.factories.get(siteId)
    if (factory) {
      const adapter = factory()
      this.adapters.set(siteId, adapter)
      return adapter
    }

    return null
  }

  /**
   * Get all registered adapter IDs
   * @returns Array of site IDs
   */
  getRegisteredSiteIds(): string[] {
    const ids = new Set([
      ...this.adapters.keys(),
      ...this.factories.keys()
    ])
    return Array.from(ids)
  }

  /**
   * Detect and return the adapter for the current page URL
   * @param url - The URL to check (defaults to current location)
   * @returns The matching adapter or null
   */
  detectCurrentSite(url?: string): SiteAdapter | null {
    const targetUrl = url || window.location.href

    // Check instantiated adapters first
    for (const adapter of this.adapters.values()) {
      if (adapter.isMatch(targetUrl)) {
        return adapter
      }
    }

    // Check factories and instantiate if match found
    for (const [siteId, factory] of this.factories.entries()) {
      const adapter = factory()
      if (adapter.isMatch(targetUrl)) {
        this.adapters.set(siteId, adapter)
        return adapter
      }
    }

    return null
  }

  /**
   * Get the currently active adapter
   * @returns The current adapter or null
   */
  getCurrentAdapter(): SiteAdapter | null {
    return this.currentAdapter
  }

  /**
   * Initialize the manager for the current page
   * Detects the appropriate adapter and sets it as current
   * @returns true if an adapter was found and set
   */
  initialize(): boolean {
    this.currentAdapter = this.detectCurrentSite()
    
    if (this.currentAdapter) {
      console.log(`[SiteManager] Initialized with adapter: ${this.currentAdapter.siteId}`)
      return true
    }
    
    console.log('[SiteManager] No matching adapter found for current page')
    return false
  }

  /**
   * Process all papers on the current page
   * @returns Map of paper IDs to processed paper info
   */
  processCurrentPage(): Map<string, ProcessedPaperInfo> {
    if (!this.currentAdapter) {
      console.warn('[SiteManager] No adapter set, cannot process page')
      return this.processedPapers
    }

    const papers = this.currentAdapter.getPapers()
    const matcher = getVenueMatcher()

    for (const paper of papers) {
      // Skip if already processed (idempotency - Requirement 6.3)
      if (this.processedElements.has(paper.id)) {
        continue
      }

      // Match venue against CCF catalog
      const matchResult: MatchResult = paper.venue 
        ? matcher.match(paper.venue)
        : {
            matched: false,
            entry: null,
            confidence: 'none',
            originalVenue: '',
            cleanedVenue: ''
          }

      const processedPaper: ProcessedPaperInfo = {
        ...paper,
        matchResult,
        processed: false
      }

      this.processedPapers.set(paper.id, processedPaper)
      this.processedElements.add(paper.id)
    }

    return this.processedPapers
  }

  /**
   * Mark a paper as processed (badge added)
   * @param paperId - The paper ID to mark
   */
  markAsProcessed(paperId: string): void {
    const paper = this.processedPapers.get(paperId)
    if (paper) {
      paper.processed = true
    }
  }

  /**
   * Check if a paper has been processed
   * @param paperId - The paper ID to check
   * @returns true if the paper has been processed
   */
  isProcessed(paperId: string): boolean {
    return this.processedElements.has(paperId)
  }

  /**
   * Get all processed papers
   * @returns Map of paper IDs to processed paper info
   */
  getResults(): Map<string, ProcessedPaperInfo> {
    return this.processedPapers
  }

  /**
   * Get papers filtered by CCF rank
   * @param rank - The rank to filter by ('A', 'B', 'C', or null for unranked)
   * @returns Array of processed papers with the specified rank
   */
  getPapersByRank(rank: 'A' | 'B' | 'C' | null): ProcessedPaperInfo[] {
    return Array.from(this.processedPapers.values()).filter(paper => {
      if (rank === null) {
        return !paper.matchResult.matched
      }
      return paper.matchResult.entry?.rank === rank
    })
  }

  /**
   * Get statistics about processed papers
   * @returns Object with counts by rank
   */
  getStatistics(): { total: number; byRank: Record<string, number> } {
    const stats = {
      total: this.processedPapers.size,
      byRank: {
        A: 0,
        B: 0,
        C: 0,
        unknown: 0
      }
    }

    for (const paper of this.processedPapers.values()) {
      if (paper.matchResult.matched && paper.matchResult.entry) {
        stats.byRank[paper.matchResult.entry.rank]++
      } else {
        stats.byRank.unknown++
      }
    }

    return stats
  }

  /**
   * Start observing page changes with the current adapter
   * @param callback - Function to call when changes are detected
   */
  startObserving(callback: () => void): void {
    if (this.currentAdapter) {
      this.currentAdapter.observeChanges(callback)
    }
  }

  /**
   * Stop observing and clean up resources
   */
  disconnect(): void {
    if (this.currentAdapter) {
      this.currentAdapter.disconnect()
    }
  }

  /**
   * Clear all processed papers and reset state
   */
  reset(): void {
    this.processedPapers.clear()
    this.processedElements.clear()
  }

  /**
   * Unregister an adapter by site ID
   * @param siteId - The site ID to unregister
   */
  unregisterAdapter(siteId: string): void {
    const adapter = this.adapters.get(siteId)
    if (adapter) {
      adapter.disconnect()
      this.adapters.delete(siteId)
    }
    this.factories.delete(siteId)
  }
}

// Singleton instance
let managerInstance: SiteManager | null = null

/**
 * Get the singleton SiteManager instance
 * @returns The SiteManager singleton
 */
export function getSiteManager(): SiteManager {
  if (!managerInstance) {
    managerInstance = new SiteManager()
  }
  return managerInstance
}

export default getSiteManager
