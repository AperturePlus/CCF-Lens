/**
 * Site Manager Module
 * 
 * Manages site adapters and coordinates paper processing across different
 * academic websites. Handles adapter registration, site detection, and
 * maintains processing state.
 * 
 * Requirements: 
 * - 1.5 - Support extensible plugin mechanism for new academic sites
 * - 6.3 - Avoid duplicate processing of papers that already have RankBadge
 */

import type { 
  SiteAdapter, 
  SiteAdapterFactory,
  ProcessedPaperInfo 
} from './types'
import { getVenueMatcher, type MatchResult } from '../core/venue-matcher'

/** Data attribute name used to mark processed elements */
export const PROCESSED_MARKER = 'data-ccf-rank-processed'

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

    // Check factories and instantiate only if URL pattern matches
    // This avoids creating unnecessary adapter instances
    for (const [siteId, factory] of this.factories.entries()) {
      // Create a temporary adapter to check URL pattern
      // Only keep it if it matches
      const adapter = factory()
      if (adapter.isMatch(targetUrl)) {
        this.adapters.set(siteId, adapter)
        return adapter
      }
      // If no match, the adapter will be garbage collected
      // To further optimize, adapters could expose static URL patterns
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
   * Check if a DOM element has already been processed
   * Uses both in-memory set and DOM attribute for robustness
   * 
   * @param paperId - The paper ID to check
   * @param element - The DOM element to check
   * @returns true if the element has been processed
   */
  hasElementBeenProcessed(paperId: string, element: HTMLElement): boolean {
    // Check in-memory set first (fast path)
    if (this.processedElements.has(paperId)) {
      return true
    }
    
    // Check DOM attribute (handles page reload or multiple script instances)
    if (element.hasAttribute(PROCESSED_MARKER)) {
      // Sync with in-memory set
      this.processedElements.add(paperId)
      return true
    }
    
    return false
  }

  /**
   * Mark a DOM element as processed by adding a data attribute
   * This ensures idempotency even across script reloads
   * 
   * @param paperId - The paper ID
   * @param element - The DOM element to mark
   */
  markElementAsProcessed(paperId: string, element: HTMLElement): void {
    this.processedElements.add(paperId)
    element.setAttribute(PROCESSED_MARKER, 'true')
  }

  /**
   * Process all papers on the current page
   * Implements idempotency to avoid duplicate processing (Requirement 6.3)
   * 
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
      // Skip if we've already extracted/matched this paper in the current run
      if (this.processedPapers.has(paper.id)) {
        continue
      }

      // Skip if badge already exists (idempotency across script instances)
      if (this.hasElementBeenProcessed(paper.id, paper.element)) {
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
    }

    return this.processedPapers
  }

  /**
   * Mark a paper as processed (badge added)
   * Updates both in-memory state and DOM attribute
   * 
   * @param paperId - The paper ID to mark
   */
  markAsProcessed(paperId: string): void {
    const paper = this.processedPapers.get(paperId)
    if (paper) {
      paper.processed = true
      // Ensure DOM element is also marked (idempotent)
      if (paper.element && !paper.element.hasAttribute(PROCESSED_MARKER)) {
        this.markElementAsProcessed(paperId, paper.element)
      } else {
        this.processedElements.add(paperId)
      }
    } else {
      // Still track in memory to avoid duplicate work
      this.processedElements.add(paperId)
    }
  }

  /**
   * Check if a paper has been processed
   * Checks both in-memory set and optionally the DOM element
   * 
   * @param paperId - The paper ID to check
   * @param element - Optional DOM element to check for marker
   * @returns true if the paper has been processed
   */
  isProcessed(paperId: string, element?: HTMLElement): boolean {
    // Check in-memory set
    if (this.processedElements.has(paperId)) {
      return true
    }
    
    // If element provided, also check DOM attribute
    if (element && element.hasAttribute(PROCESSED_MARKER)) {
      // Sync with in-memory set
      this.processedElements.add(paperId)
      return true
    }
    
    return false
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
   * Optionally removes DOM markers from elements
   * 
   * @param clearDomMarkers - Whether to remove DOM markers (default: false)
   */
  reset(clearDomMarkers: boolean = false): void {
    if (clearDomMarkers) {
      // Remove DOM markers from all processed elements
      for (const paper of this.processedPapers.values()) {
        if (paper.element) {
          paper.element.removeAttribute(PROCESSED_MARKER)
        }
      }
    }
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
