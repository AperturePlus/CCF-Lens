/**
 * arXiv Site Adapter Module
 * 
 * Implements the SiteAdapter interface for arXiv.org.
 * Extracts paper information from arXiv search results and list pages.
 * 
 * Requirements:
 * - 1.1: Recognize and process paper lists on arXiv.org search result pages
 * - 1.4: Auto-detect and process newly added paper entries when page dynamically loads
 * - 2.1: First parse venue info from paper comments field
 */

import type { SiteAdapter, PaperInfo, VenueSource } from './types'
import { getCCFCatalog } from '../core/ccf-catalog'

/**
 * Common venue patterns found in arXiv comments
 * These patterns help extract conference/journal names from comments like:
 * - "Accepted to CVPR 2024"
 * - "Published in NeurIPS 2023"
 * - "To appear in ICML"
 * - "IEEE TPAMI 2024"
 */
const VENUE_PATTERNS: Array<{ pattern: RegExp; group: number }> = [
  // "Accepted to/at/by VENUE" or "Accepted by VENUE"
  { pattern: /(?:accepted|submitted)\s+(?:to|at|by|for)\s+([A-Z][A-Za-z0-9\s\-&]+?)(?:\s+\d{4}|\s*$|[,.])/i, group: 1 },
  // "Published in VENUE"
  { pattern: /published\s+(?:in|at)\s+([A-Z][A-Za-z0-9\s\-&]+?)(?:\s+\d{4}|\s*$|[,.])/i, group: 1 },
  // "To appear in VENUE"
  { pattern: /(?:to\s+)?appear(?:s|ing)?\s+(?:in|at)\s+([A-Z][A-Za-z0-9\s\-&]+?)(?:\s+\d{4}|\s*$|[,.])/i, group: 1 },
  // "Presented at VENUE"
  { pattern: /presented\s+(?:at|in)\s+([A-Z][A-Za-z0-9\s\-&]+?)(?:\s+\d{4}|\s*$|[,.])/i, group: 1 },
  // "IEEE/ACM VENUE" pattern
  { pattern: /(?:IEEE|ACM)\s+([A-Z][A-Za-z0-9\s\-&]+?)(?:\s+\d{4}|\s*$|[,.])/i, group: 1 },
]

/**
 * Known conference/journal abbreviations for validation
 */
const KNOWN_VENUES = new Set([
  // AI/ML conferences
  'CVPR', 'ICCV', 'ECCV', 'NEURIPS', 'NIPS', 'ICML', 'ICLR', 'AAAI', 'IJCAI',
  'ACL', 'EMNLP', 'NAACL', 'COLING', 'KDD', 'WWW', 'WSDM', 'SIGIR', 'CIKM',
  // Systems conferences
  'OSDI', 'SOSP', 'NSDI', 'SIGCOMM', 'MOBICOM', 'INFOCOM', 'IMC',
  // Security conferences
  'CCS', 'USENIX', 'NDSS', 'SP', 'OAKLAND',
  // SE/PL conferences
  'ICSE', 'FSE', 'ASE', 'ISSTA', 'PLDI', 'POPL', 'OOPSLA',
  // Database conferences
  'SIGMOD', 'VLDB', 'ICDE', 'PODS',
  // Graphics/HCI conferences
  'SIGGRAPH', 'CHI', 'UIST', 'VR',
  // Theory conferences
  'STOC', 'FOCS', 'SODA',
  // Journals
  'TPAMI', 'TIP', 'TNNLS', 'TKDE', 'TOG', 'TOCHI', 'TSE', 'TOSEM',
  'JMLR', 'TACL', 'CL', 'AIJ', 'JAIR',
])

/**
 * ArxivAdapter class for extracting paper information from arXiv.org
 */
export class ArxivAdapter implements SiteAdapter {
  readonly siteId = 'arxiv'
  readonly siteName = 'arXiv'
  readonly urlPatterns = [
    /arxiv\.org\/search/,
    /arxiv\.org\/list/,
    /arxiv\.org\/abs\//,
  ]

  private observer: MutationObserver | null = null
  private observerCallback: (() => void) | null = null

  /**
   * Check if the adapter can handle the given URL
   */
  isMatch(url: string): boolean {
    return this.urlPatterns.some(pattern => pattern.test(url))
  }

  /**
   * Parse venue information from arXiv comments field
   * 
   * @param comments - The comments text from arXiv paper
   * @returns Extracted venue name or null
   */
  parseVenueFromComments(comments: string): string | null {
    if (!comments || comments.trim().length === 0) {
      return null
    }

    // Try each pattern in order
    for (const { pattern, group } of VENUE_PATTERNS) {
      const match = comments.match(pattern)
      if (match && match[group]) {
        const venue = match[group].trim()
        // Validate: should be at least 2 chars and not just numbers
        if (venue.length >= 2 && !/^\d+$/.test(venue)) {
          // Clean up the venue name
          const cleaned = this.cleanExtractedVenue(venue)
          if (cleaned && this.isLikelyVenue(cleaned)) {
            return cleaned
          }
        }
      }
    }

    // Fallback: look for known venue abbreviations anywhere in the text
    const upperComments = comments.toUpperCase()
    for (const venue of KNOWN_VENUES) {
      // Check for matches like "CVPR", "CVPR 2024", "CVPR2024", "CVPR'24"
      const pattern = new RegExp(`\\b${venue}(?:'?\\d{2,4})?\\b`, 'i')
      if (pattern.test(upperComments)) {
        return venue
      }
    }

    return null
  }

  /**
   * Best-effort year extraction from comments text.
   * Supports "2024", "CVPR2024", and "CVPR'24" patterns.
   */
  private parseYearFromText(text: string): string | null {
    const input = text?.trim()
    if (!input) return null

    // 4-digit year, allow adjacency like "CVPR2024"
    const fullYearMatch = input.match(/(?:^|[^\d])((?:19|20)\d{2})(?!\d)/)
    if (fullYearMatch?.[1]) {
      return fullYearMatch[1]
    }

    // 2-digit year with apostrophe, e.g., "CVPR'24"
    const shortYearMatch = input.match(/'(\d{2})(?!\d)/)
    if (shortYearMatch?.[1]) {
      const yy = Number.parseInt(shortYearMatch[1], 10)
      if (Number.isFinite(yy)) {
        const century = yy <= 50 ? 2000 : 1900
        return String(century + yy)
      }
    }

    return null
  }

  /**
   * Heuristic validation to avoid extracting random text as a venue.
   */
  private isLikelyVenue(venue: string): boolean {
    const trimmed = venue.trim()
    if (trimmed.length < 2) return false

    const upper = trimmed.toUpperCase()
    if (KNOWN_VENUES.has(upper)) return true

    // If the venue is in the CCF catalog (abbr/name/alias), it's valid.
    const catalog = getCCFCatalog()
    if (catalog.has(trimmed)) return true

    // Otherwise, accept only if it looks like a full venue name.
    // This avoids false positives like "aaaaaaaaaa" or "submitted to something".
    const hasVenueKeywords =
      /\b(conference|conf\.?|symposium|workshop|journal|transactions|trans\.?|proceedings|letters|review)\b/i.test(trimmed)
    const hasMultipleWords = trimmed.split(/\s+/).filter(Boolean).length >= 2

    return hasVenueKeywords && hasMultipleWords
  }

  /**
   * Clean up extracted venue name
   */
  private cleanExtractedVenue(venue: string): string | null {
    // Remove trailing year
    let cleaned = venue.replace(/\s*['']?\d{2,4}\s*$/, '').trim()
    // Remove trailing punctuation
    cleaned = cleaned.replace(/[,.:;]+$/, '').trim()
    // Remove common prefixes
    cleaned = cleaned.replace(/^(?:the\s+)?(?:proceedings\s+of\s+)?/i, '').trim()
    
    if (cleaned.length < 2) {
      return null
    }
    
    return cleaned
  }


  /**
   * Get all papers currently visible on the page
   */
  getPapers(): PaperInfo[] {
    const papers: PaperInfo[] = []
    
    // Try different page layouts
    // Search results page: li.arxiv-result
    const searchResults = document.querySelectorAll('li.arxiv-result')
    if (searchResults.length > 0) {
      searchResults.forEach((element, index) => {
        const paper = this.processSearchResultItem(element as HTMLElement, index)
        if (paper) {
          papers.push(paper)
        }
      })
      return papers
    }

    // List page (e.g., /list/cs.AI/recent): dt elements with paper IDs
    const listItems = document.querySelectorAll('dl#articles dt')
    if (listItems.length > 0) {
      listItems.forEach((dt, index) => {
        const paper = this.processListItem(dt as HTMLElement, index)
        if (paper) {
          papers.push(paper)
        }
      })
      return papers
    }

    // Abstract page: single paper
    const absPage = document.querySelector('.abs-meta')
    if (absPage) {
      const paper = this.processAbstractPage(absPage as HTMLElement)
      if (paper) {
        papers.push(paper)
      }
    }

    return papers
  }

  /**
   * Process a single paper element
   */
  processPaper(element: HTMLElement): PaperInfo | null {
    // Determine the type of element and process accordingly
    if (element.classList.contains('arxiv-result')) {
      return this.processSearchResultItem(element, 0)
    }
    if (element.tagName === 'DT') {
      return this.processListItem(element, 0)
    }
    if (element.classList.contains('abs-meta')) {
      return this.processAbstractPage(element)
    }
    return null
  }

  /**
   * Process a search result item (li.arxiv-result)
   */
  private processSearchResultItem(element: HTMLElement, index: number): PaperInfo | null {
    // Extract arXiv ID from the link
    const idLink = element.querySelector('p.list-title a[href*="/abs/"]')
    const idMatch = idLink?.getAttribute('href')?.match(/\/abs\/([^\s?]+)/)
    const id = idMatch ? idMatch[1] : `arxiv-search-${index}`

    // Extract title
    const titleElement = element.querySelector('p.title')
    const title = titleElement?.textContent?.trim() || ''
    if (!title) {
      return null
    }

    // Extract comments (venue source)
    const commentsContainer = element.querySelector('p.comments')
    const commentsContent =
      commentsContainer?.querySelector('span.has-text-grey-dark') ?? commentsContainer
    const comments = (commentsContent?.textContent ?? '')
      .replace(/^\s*Comments:\s*/i, '')
      .trim()
    const year = this.parseYearFromText(comments)
    
    // Parse venue from comments
    const venue = this.parseVenueFromComments(comments)
    const venueSource: VenueSource = venue ? 'comment' : 'unknown'

    // Find insertion point (after title)
    const insertionPoint = titleElement as HTMLElement || element

    return {
      id,
      title,
      year,
      venue,
      venueSource,
      element,
      insertionPoint,
    }
  }

  /**
   * Process a list page item (dt element)
   */
  private processListItem(dtElement: HTMLElement, index: number): PaperInfo | null {
    // Extract arXiv ID
    const idLink = dtElement.querySelector('a[href*="/abs/"]')
    const idMatch = idLink?.getAttribute('href')?.match(/\/abs\/([^\s?]+)/)
    const id = idMatch ? idMatch[1] : `arxiv-list-${index}`

    // The dd element following dt contains the paper details
    const ddElement = dtElement.nextElementSibling as HTMLElement
    if (!ddElement || ddElement.tagName !== 'DD') {
      return null
    }

    // Extract title from dd
    const titleElement = ddElement.querySelector('.list-title')
    // Title is after "Title: " text
    let title = titleElement?.textContent?.replace(/^Title:\s*/i, '').trim() || ''
    if (!title) {
      return null
    }

    // Extract comments
    const commentsElement = ddElement.querySelector('.list-comments')
    const comments = commentsElement?.textContent?.replace(/^Comments:\s*/i, '').trim() || ''
    const year = this.parseYearFromText(comments)
    
    // Parse venue from comments
    const venue = this.parseVenueFromComments(comments)
    const venueSource: VenueSource = venue ? 'comment' : 'unknown'

    // Find insertion point (after title in dd)
    const insertionPoint = titleElement as HTMLElement || ddElement

    return {
      id,
      title,
      year,
      venue,
      venueSource,
      element: ddElement,
      insertionPoint,
    }
  }

  /**
   * Process an abstract page
   */
  private processAbstractPage(metaElement: HTMLElement): PaperInfo | null {
    // Extract arXiv ID from URL
    const urlMatch = window.location.pathname.match(/\/abs\/([^\s?]+)/)
    const id = urlMatch ? urlMatch[1] : 'arxiv-abs-0'

    // Extract title
    const titleElement = document.querySelector('h1.title')
    const title = titleElement?.textContent?.replace(/^Title:\s*/i, '').trim() || ''
    if (!title) {
      return null
    }

    // Extract comments
    const commentsElement = document.querySelector('.comments')
    const comments = commentsElement?.textContent?.replace(/^Comments:\s*/i, '').trim() || ''
    const year = this.parseYearFromText(comments)
    
    // Parse venue from comments
    const venue = this.parseVenueFromComments(comments)
    const venueSource: VenueSource = venue ? 'comment' : 'unknown'

    // Find insertion point (after title)
    const insertionPoint = titleElement as HTMLElement || metaElement

    return {
      id,
      title,
      year,
      venue,
      venueSource,
      element: metaElement,
      insertionPoint,
    }
  }

  /**
   * Get the DOM element where the rank badge should be inserted
   */
  getInsertionPoint(paper: PaperInfo): HTMLElement {
    return paper.insertionPoint
  }

  /**
   * Start observing the page for dynamic content changes
   * Requirement 1.4: Auto-detect and process newly added paper entries
   */
  observeChanges(callback: () => void): void {
    if (this.observer) {
      this.disconnect()
    }

    this.observerCallback = callback

    // Create mutation observer
    this.observer = new MutationObserver((mutations) => {
      // Check if any relevant nodes were added
      let hasNewPapers = false
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              // Check if it's a paper element or contains paper elements
              if (
                node.classList?.contains('arxiv-result') ||
                node.tagName === 'DT' ||
                node.querySelector?.('.arxiv-result, dt')
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
        this.observerCallback()
      }
    })

    // Observe the main content area
    const targetNode = document.querySelector('main, #content, body')
    if (targetNode) {
      this.observer.observe(targetNode, {
        childList: true,
        subtree: true,
      })
    }
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

// Factory function for lazy instantiation
export function createArxivAdapter(): ArxivAdapter {
  return new ArxivAdapter()
}

export default ArxivAdapter
