/**
 * Google Scholar Site Adapter Module
 * 
 * Implements the SiteAdapter interface for Google Scholar.
 * Extracts paper information from search results and author profile pages.
 * 
 * Requirements:
 * - 1.1: Recognize and process paper lists on Google Scholar search result pages
 * - 1.2: Recognize and process paper lists on Google Scholar author profile pages
 * - 1.3: Extract title and venue information from paper entries
 * - 1.4: Handle truncated journal names (with ellipsis)
 * - 1.5: Auto-detect and process newly added paper entries when page dynamically loads
 * - 1.6: Follow SiteAdapter interface specification for plugin registration
 */

import type { SiteAdapter, PaperInfo, VenueSource } from './types'

/**
 * Extended paper info for Google Scholar with additional metadata
 */
export interface GoogleScholarPaperInfo extends PaperInfo {
  /** Journal/conference name extracted from the page */
  journal: string | null
  /** Whether the journal name was truncated (contains ellipsis) */
  journalTruncated: boolean
  /** Citation ID for fetching full citation info (if available) */
  citationId: string | null
}

/**
 * Result of extracting journal info from venue text
 */
export interface JournalExtractResult {
  /** Extracted journal/conference name */
  journal: string
  /** Whether the name was truncated */
  truncated: boolean
}

/**
 * GoogleScholarAdapter class for extracting paper information from Google Scholar
 * 
 * Supports two page types:
 * 1. Search results page (scholar.google.com/scholar?...)
 * 2. Author profile page (scholar.google.com/citations?...)
 */
export class GoogleScholarAdapter implements SiteAdapter {
  readonly siteId = 'google-scholar'
  readonly siteName = 'Google Scholar'
  
  /**
   * URL patterns for Google Scholar pages
   * - Search results: /scholar?q=...
   * - Author profile: /citations?user=...
   * - Proxy sites: scholar.lanfanshu.cn (for testing)
   */
  readonly urlPatterns = [
    /scholar\.google\.[^/]+\/scholar/,      // Search results (all Google Scholar TLDs)
    /scholar\.google\.[^/]+\/citations/,    // Author profile (all Google Scholar TLDs)
    /scholar\.lanfanshu\.cn\/scholar/,      // Proxy site - Search results
    /scholar\.lanfanshu\.cn\/citations/     // Proxy site - Author profile
  ]

  private observer: MutationObserver | null = null
  private observerCallback: (() => void) | null = null

  /**
   * Check if the adapter can handle the given URL
   * @param url - The URL to check
   * @returns true if this adapter can handle the URL
   */
  isMatch(url: string): boolean {
    return this.urlPatterns.some(pattern => pattern.test(url))
  }


  /**
   * Determine if the current page is a search results page
   * @returns true if on search results page
   */
  private isSearchResultsPage(): boolean {
    const { hostname, pathname } = new URL(window.location.href)
    if (hostname === 'scholar.lanfanshu.cn') {
      return pathname === '/scholar'
    }
    return /^scholar\.google\./i.test(hostname) && pathname === '/scholar'
  }

  /**
   * Determine if the current page is an author profile page
   * @returns true if on author profile page
   */
  private isAuthorPage(): boolean {
    const { hostname, pathname } = new URL(window.location.href)
    if (hostname === 'scholar.lanfanshu.cn') {
      return pathname === '/citations'
    }
    return /^scholar\.google\./i.test(hostname) && pathname === '/citations'
  }

  /**
   * Extract journal/conference information from venue text
   * Handles truncated names (with ellipsis) and various formats
   * 
   * Google Scholar venue format examples:
   * - "J Smith, A Jones - Nature, 2024 - nature.com"
   * - "J Smith - Proceedings of the IEEE Conference on..., 2023"
   * - "J Smith, A Jones - arXiv preprint arXiv:2401.12345, 2024"
   * 
   * @param venueText - The raw venue text from the page
   * @returns Extracted journal info with truncation flag
   * 
   * Requirements: 1.3, 1.4
   */
  extractJournalInfo(venueText: string): JournalExtractResult {
    if (!venueText || venueText.trim().length === 0) {
      return { journal: '', truncated: false }
    }

    // Normalize whitespace: replace non-breaking spaces and other unicode spaces with regular space
    const normalizedText = venueText
      .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // The venue text typically follows pattern: "Authors - Venue, Year - Source"
    // We need to extract the venue part
    
    // Split by " - " to separate authors from venue info
    const parts = normalizedText.split(' - ')
    
    if (parts.length < 2) {
      // No clear separator, try to extract venue directly
      return this.parseVenueFromText(normalizedText)
    }

    // The venue is typically in the second part (after authors)
    // Format: "Venue, Year" or "Venue, Year - Source"
    let venuePart = parts[1]
    
    // If there's a third part (source like "nature.com"), ignore it
    // But be careful: some venues have " - " in their names
    
    // Remove trailing source (e.g., "- nature.com", "- Springer")
    // This is usually the last part after the year
    const yearMatch = venuePart.match(/,\s*(\d{4})\s*(?:-|$)/)
    if (yearMatch) {
      // Extract everything before the year
      const yearIndex = venuePart.indexOf(yearMatch[0])
      venuePart = venuePart.substring(0, yearIndex).trim()
    } else {
      // No year found, try to remove trailing source
      const lastDashIndex = venuePart.lastIndexOf(' - ')
      if (lastDashIndex > 0) {
        venuePart = venuePart.substring(0, lastDashIndex).trim()
      }
    }

    return this.parseVenueFromText(venuePart)
  }

  /**
   * Parse venue name from text, detecting truncation
   * @param text - Text potentially containing venue name
   * @returns Parsed venue with truncation flag
   */
  private parseVenueFromText(text: string): JournalExtractResult {
    let venue = text.trim()
    let truncated = false

    // Check for truncation indicators
    if (venue.includes('…') || venue.includes('...')) {
      truncated = true
      // Remove ellipsis for cleaner matching
      venue = venue.replace(/[…\.]{2,}/g, '').trim()
    }

    // Clean up common artifacts
    venue = venue
      .replace(/,\s*$/, '')           // Remove trailing comma
      .replace(/^\s*,/, '')           // Remove leading comma
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .trim()

    // Skip arXiv preprints - they don't have venue info
    if (/^arXiv preprint/i.test(venue)) {
      return { journal: '', truncated: false }
    }

    return { journal: venue, truncated }
  }


  /**
   * Process search results page and extract paper information
   * 
   * Search result structure:
   * <div class="gs_r gs_or gs_scl">
   *   <div class="gs_ri">
   *     <h3 class="gs_rt">
   *       <a href="...">Paper Title</a>
   *     </h3>
   *     <div class="gs_a">Authors - Venue, Year - Source</div>
   *     ...
   *   </div>
   * </div>
   * 
   * @returns Array of paper info from search results
   * 
   * Requirements: 1.1, 1.3
   */
  processSearchResults(): GoogleScholarPaperInfo[] {
    const papers: GoogleScholarPaperInfo[] = []
    
    // Select all search result items
    // Class structure: gs_r (result), gs_or (organic result), gs_scl (scholar)
    const resultElements = document.querySelectorAll('.gs_r.gs_or.gs_scl')
    
    resultElements.forEach((element, index) => {
      const paper = this.processSearchResultItem(element as HTMLElement, index)
      if (paper) {
        papers.push(paper)
      }
    })

    return papers
  }

  /**
   * Process a single search result item
   * @param element - The result container element
   * @param index - Index for generating fallback ID
   * @returns Paper info or null if extraction fails
   */
  private processSearchResultItem(element: HTMLElement, index: number): GoogleScholarPaperInfo | null {
    // Find the inner content container
    const contentDiv = element.querySelector('.gs_ri')
    if (!contentDiv) {
      return null
    }

    // Extract title from h3.gs_rt
    const titleElement = contentDiv.querySelector('h3.gs_rt')
    const titleLink = titleElement?.querySelector('a')
    const title = (titleLink?.textContent || titleElement?.textContent || '').trim()
    
    if (!title) {
      return null
    }

    // Generate ID from data-cid attribute or fallback to index
    const dataCid = element.getAttribute('data-cid')
    const id = dataCid || `gs-search-${index}`

    // Extract venue info from .gs_a element
    const venueElement = contentDiv.querySelector('.gs_a')
    const venueText = venueElement?.textContent || ''
    
    const { journal, truncated } = this.extractJournalInfo(venueText)

    // Extract year from venue text
    const year = this.extractYear(venueText)

    // Determine venue source
    const venueSource: VenueSource = journal ? 'page' : 'unknown'

    // Find citation ID for potential API lookup
    const citationId = this.extractCitationId(element)

    // Insertion point: after the title element
    const insertionPoint = titleElement as HTMLElement || contentDiv as HTMLElement

    return {
      id,
      title,
      year,
      venue: journal || null,
      venueSource,
      element: element as HTMLElement,
      insertionPoint,
      journal,
      journalTruncated: truncated,
      citationId
    }
  }


  /**
   * Process author profile page and extract paper information
   * 
   * Author page structure:
   * <tr class="gsc_a_tr">
   *   <td class="gsc_a_t">
   *     <a class="gsc_a_at" href="...">Paper Title</a>
   *     <div class="gs_gray">Authors</div>
   *     <div class="gs_gray">Venue, Year</div>
   *   </td>
   *   <td class="gsc_a_c">Citations</td>
   *   <td class="gsc_a_y">Year</td>
   * </tr>
   * 
   * @returns Array of paper info from author page
   * 
   * Requirements: 1.2, 1.3
   */
  processAuthorPage(): GoogleScholarPaperInfo[] {
    const papers: GoogleScholarPaperInfo[] = []
    
    // Select all paper rows in the author's publication list
    const paperRows = document.querySelectorAll('tr.gsc_a_tr')
    
    paperRows.forEach((element, index) => {
      const paper = this.processAuthorPageItem(element as HTMLElement, index)
      if (paper) {
        papers.push(paper)
      }
    })

    return papers
  }

  /**
   * Process a single paper row from author page
   * @param element - The table row element
   * @param index - Index for generating fallback ID
   * @returns Paper info or null if extraction fails
   */
  private processAuthorPageItem(element: HTMLElement, index: number): GoogleScholarPaperInfo | null {
    // Find the title cell
    const titleCell = element.querySelector('td.gsc_a_t')
    if (!titleCell) {
      return null
    }

    // Extract title from the link
    const titleLink = titleCell.querySelector('a.gsc_a_at')
    const title = titleLink?.textContent?.trim() || ''
    
    if (!title) {
      return null
    }

    // Generate ID from href or fallback to index
    const href = titleLink?.getAttribute('href') || ''
    const cidMatch = href.match(/citation_for_view=([^&]+)/)
    const id = cidMatch ? cidMatch[1] : `gs-author-${index}`

    // Extract venue from the gray divs
    // Structure: first gs_gray is authors, second is venue
    const grayDivs = titleCell.querySelectorAll('div.gs_gray')
    let venueText = ''
    
    if (grayDivs.length >= 2) {
      // Second gray div contains venue info
      venueText = grayDivs[1].textContent || ''
    } else if (grayDivs.length === 1) {
      // Sometimes there's only one gray div with venue
      venueText = grayDivs[0].textContent || ''
    }

    const { journal, truncated } = this.extractJournalInfoFromAuthorPage(venueText)

    // Extract year from the year cell or venue text
    const yearCell = element.querySelector('td.gsc_a_y span.gsc_a_h')
    let year = yearCell?.textContent?.trim() || null
    if (!year) {
      year = this.extractYear(venueText)
    }

    // Determine venue source
    const venueSource: VenueSource = journal ? 'page' : 'unknown'

    // Citation ID for potential API lookup
    const citationId = cidMatch ? cidMatch[1] : null

    // Insertion point: after the title link
    const insertionPoint = titleLink as HTMLElement || titleCell as HTMLElement

    return {
      id,
      title,
      year,
      venue: journal || null,
      venueSource,
      element: element as HTMLElement,
      insertionPoint,
      journal,
      journalTruncated: truncated,
      citationId
    }
  }

  /**
   * Extract journal info specifically from author page format
   * Author page venue format: "Venue Name, Volume, Pages" or just "Venue Name"
   * 
   * @param venueText - The venue text from author page
   * @returns Extracted journal info
   */
  private extractJournalInfoFromAuthorPage(venueText: string): JournalExtractResult {
    if (!venueText || venueText.trim().length === 0) {
      return { journal: '', truncated: false }
    }

    let venue = venueText.trim()
    let truncated = false

    // Check for truncation
    if (venue.includes('…') || venue.includes('...')) {
      truncated = true
      venue = venue.replace(/[…\.]{2,}/g, '').trim()
    }

    // Author page format is simpler: "Venue, Volume (Issue), Pages"
    // or "Venue, Year" or just "Venue"
    
    // Split by comma and take the first part as venue
    const parts = venue.split(',')
    if (parts.length > 0) {
      venue = parts[0].trim()
    }

    // Skip arXiv preprints
    if (/^arXiv preprint/i.test(venue)) {
      return { journal: '', truncated: false }
    }

    return { journal: venue, truncated }
  }


  /**
   * Extract year from venue text
   * @param text - Text potentially containing year
   * @returns Year string or null
   */
  private extractYear(text: string): string | null {
    if (!text) return null
    
    // Look for 4-digit year (1900-2099)
    const yearMatch = text.match(/\b(19|20)\d{2}\b/)
    return yearMatch ? yearMatch[0] : null
  }

  /**
   * Extract citation ID from search result element
   * Used for potential API lookups to get full citation info
   * 
   * @param element - The search result element
   * @returns Citation ID or null
   */
  private extractCitationId(element: HTMLElement): string | null {
    // Try data-cid attribute first
    const dataCid = element.getAttribute('data-cid')
    if (dataCid) {
      return dataCid
    }

    // Try to find citation link
    const citeLink = element.querySelector('a.gs_or_cit')
    if (citeLink) {
      const onclick = citeLink.getAttribute('onclick') || ''
      const cidMatch = onclick.match(/gs_ocit\([^,]*,\s*'([^']+)'/)
      if (cidMatch) {
        return cidMatch[1]
      }
    }

    return null
  }

  /**
   * Get all papers currently visible on the page
   * Automatically detects page type and uses appropriate method
   * 
   * @returns Array of PaperInfo objects
   */
  getPapers(): PaperInfo[] {
    if (this.isSearchResultsPage()) {
      return this.processSearchResults()
    }
    
    if (this.isAuthorPage()) {
      return this.processAuthorPage()
    }

    // Unknown page type, return empty
    return []
  }

  /**
   * Process a single paper element and extract its information
   * @param element - The DOM element containing the paper
   * @returns PaperInfo or null if extraction fails
   */
  processPaper(element: HTMLElement): PaperInfo | null {
    // Determine element type and process accordingly
    if (element.classList.contains('gs_r')) {
      return this.processSearchResultItem(element, 0)
    }
    
    if (element.classList.contains('gsc_a_tr') || element.tagName === 'TR') {
      return this.processAuthorPageItem(element, 0)
    }

    return null
  }

  /**
   * Get the DOM element where the rank badge should be inserted
   * @param paper - The paper info
   * @returns The insertion point element
   */
  getInsertionPoint(paper: PaperInfo): HTMLElement {
    return paper.insertionPoint
  }


  /**
   * Start observing the page for dynamic content changes
   * Google Scholar loads content dynamically on:
   * - Search result pagination
   * - Author page "Show more" button
   * - Infinite scroll (if enabled)
   * 
   * @param callback - Function to call when new content is detected
   * 
   * Requirements: 1.5
   */
  observeChanges(callback: () => void): void {
    if (this.observer) {
      this.disconnect()
    }

    this.observerCallback = callback

    // Create mutation observer
    this.observer = new MutationObserver((mutations) => {
      let hasNewPapers = false

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              // Check for search result items
              if (
                node.classList?.contains('gs_r') ||
                node.classList?.contains('gs_scl') ||
                node.querySelector?.('.gs_r.gs_or.gs_scl')
              ) {
                hasNewPapers = true
                break
              }
              
              // Check for author page items
              if (
                node.classList?.contains('gsc_a_tr') ||
                node.tagName === 'TR' ||
                node.querySelector?.('tr.gsc_a_tr')
              ) {
                hasNewPapers = true
                break
              }
            }
          }
        }
        if (hasNewPapers) break
      }

      if (hasNewPapers && this.observerCallback) {
        // Debounce callback to avoid excessive processing
        this.observerCallback()
      }
    })

    // Determine the best target node to observe based on page type
    let targetNode: Element | null = null
    
    if (this.isSearchResultsPage()) {
      // Search results container
      targetNode = document.querySelector('#gs_res_ccl_mid') || 
                   document.querySelector('#gs_res_ccl') ||
                   document.querySelector('#gs_bdy')
    } else if (this.isAuthorPage()) {
      // Author page publications table
      targetNode = document.querySelector('#gsc_a_b') ||
                   document.querySelector('#gsc_art')
    }

    // Fallback to body if no specific container found
    if (!targetNode) {
      targetNode = document.body
    }

    this.observer.observe(targetNode, {
      childList: true,
      subtree: true
    })
  }

  /**
   * Stop observing page changes and clean up resources
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    this.observerCallback = null
  }
}

/**
 * Factory function for creating GoogleScholarAdapter instances
 * @returns New GoogleScholarAdapter instance
 */
export function createGoogleScholarAdapter(): GoogleScholarAdapter {
  return new GoogleScholarAdapter()
}

export default GoogleScholarAdapter
