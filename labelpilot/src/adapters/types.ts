/**
 * Site Adapter Types Module
 * 
 * Defines interfaces for site adapters that extract paper information
 * from different academic websites.
 * 
 * Requirements: 1.5 - Support extensible plugin mechanism for new academic sites
 */

import type { MatchResult } from '../core/venue-matcher'

/**
 * Source of venue information extraction
 */
export type VenueSource = 'comment' | 'dblp' | 'page' | 'unknown'

/**
 * Information about a single paper extracted from a page
 */
export interface PaperInfo {
  /** Unique identifier for the paper (e.g., arXiv ID, DOI) */
  id: string
  /** Paper title */
  title: string
  /** Publication year (best-effort), null if not found */
  year?: string | null
  /** Extracted venue name, null if not found */
  venue: string | null
  /** Source of the venue information */
  venueSource: VenueSource
  /** Reference to the DOM element containing the paper */
  element: HTMLElement
  /** DOM element where the rank badge should be inserted */
  insertionPoint: HTMLElement
}

/**
 * Paper info with match result after processing
 */
export interface ProcessedPaperInfo extends PaperInfo {
  /** Result of venue matching against CCF catalog */
  matchResult: MatchResult
  /** Whether the paper has been processed (badge added) */
  processed: boolean
}

/**
 * Site adapter interface for extracting paper information from academic websites.
 * 
 * Each adapter implements site-specific logic for:
 * - Detecting if the current page matches the site
 * - Extracting paper information from the DOM
 * - Finding the correct insertion point for badges
 * - Observing page changes for dynamic content
 * 
 * Requirements: 1.5 - Extensible plugin mechanism
 */
export interface SiteAdapter {
  /** Unique identifier for the site (e.g., 'arxiv', 'dblp', 'ieee') */
  readonly siteId: string

  /** Display name for the site */
  readonly siteName: string

  /** URL patterns that this adapter handles */
  readonly urlPatterns: RegExp[]

  /**
   * Check if the adapter can handle the given URL
   * @param url - The URL to check
   * @returns true if this adapter can handle the URL
   */
  isMatch(url: string): boolean

  /**
   * Get all papers currently visible on the page
   * @returns Array of PaperInfo objects
   */
  getPapers(): PaperInfo[]

  /**
   * Process a single paper element and extract its information
   * @param element - The DOM element containing the paper
   * @returns PaperInfo or null if extraction fails
   */
  processPaper(element: HTMLElement): PaperInfo | null

  /**
   * Get the DOM element where the rank badge should be inserted
   * @param paper - The paper info
   * @returns The insertion point element
   */
  getInsertionPoint(paper: PaperInfo): HTMLElement

  /**
   * Start observing the page for dynamic content changes
   * @param callback - Function to call when new content is detected
   */
  observeChanges(callback: () => void): void

  /**
   * Stop observing page changes and clean up resources
   */
  disconnect(): void
}

/**
 * Configuration options for site adapters
 */
export interface SiteAdapterConfig {
  /** Whether the adapter is enabled */
  enabled: boolean
  /** Custom selectors for paper elements (optional override) */
  paperSelector?: string
  /** Custom selectors for title elements (optional override) */
  titleSelector?: string
}

/**
 * Factory function type for creating site adapters
 */
export type SiteAdapterFactory = () => SiteAdapter
