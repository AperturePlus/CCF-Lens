/**
 * DBLP Site Adapter Module
 * 
 * Implements the SiteAdapter interface for dblp.org.
 * Extracts paper information from DBLP search results, database pages, and author pages.
 * 
 * Requirements:
 * - 1.2: Recognize and process paper lists on DBLP.org search results or author pages
 * - 1.4: Auto-detect and process newly added paper entries when page dynamically loads
 * - 2.3: Extract venue info from venue link or text on DBLP pages
 */

import type { SiteAdapter, PaperInfo, VenueSource } from './types'

/**
 * DblpAdapter class for extracting paper information from dblp.org
 */
export class DblpAdapter implements SiteAdapter {
  readonly siteId = 'dblp'
  readonly siteName = 'DBLP'
  readonly urlPatterns = [
    /dblp\.org\/search/,
    /dblp\.org\/db\//,
    /dblp\.org\/pid\//,
    /dblp\.org\/pers\//,
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
   * Extract venue information from a venue link element
   * DBLP uses links like /db/conf/cvpr/ or /db/journals/tpami/
   * 
   * @param element - The paper entry element
   * @returns Extracted venue name or null
   */
  extractVenueFromLink(element: HTMLElement): string | null {
    // Try to find venue link in the entry
    // DBLP structure: venue links are typically in <a> tags with href containing /db/conf/ or /db/journals/
    const venueLinks = element.querySelectorAll('a[href*="/db/conf/"], a[href*="/db/journals/"]')
    
    for (const link of venueLinks) {
      const href = link.getAttribute('href')
      if (href) {
        const venue = this.extractVenueFromHref(href)
        if (venue) {
          return venue
        }
      }
    }

    // Fallback: try to extract from venue text
    const venueText = this.extractVenueFromText(element)
    if (venueText) {
      return venueText
    }

    return null
  }

  /**
   * Extract venue abbreviation from DBLP URL path
   * Examples:
   * - /db/conf/cvpr/cvpr2024.html -> CVPR
   * - /db/journals/tpami/tpami47.html -> TPAMI
   * - /db/conf/nips/neurips2023.html -> NeurIPS
   */
  private extractVenueFromHref(href: string): string | null {
    // Match conference pattern: /db/conf/{venue}/
    const confMatch = href.match(/\/db\/conf\/([^/]+)/)
    if (confMatch) {
      return confMatch[1].toUpperCase()
    }

    // Match journal pattern: /db/journals/{venue}/
    const journalMatch = href.match(/\/db\/journals\/([^/]+)/)
    if (journalMatch) {
      return journalMatch[1].toUpperCase()
    }

    return null
  }

  /**
   * Extract venue from text content as fallback
   */
  private extractVenueFromText(element: HTMLElement): string | null {
    // Look for venue in the cite element or entry text
    const citeElement = element.querySelector('cite')
    if (citeElement) {
      const text = citeElement.textContent || ''
      // Common patterns in DBLP cite text
      // e.g., "CVPR 2024: 1234-1245" or "IEEE Trans. Pattern Anal. Mach. Intell."
      const venueMatch = text.match(/^([A-Z][A-Za-z0-9\s\-&.]+?)(?:\s*\d{4}|\s*:|\s*$)/)
      if (venueMatch) {
        return venueMatch[1].trim()
      }
    }

    return null
  }

  /**
   * Extract publication year from entry element
   * DBLP typically shows year in various formats:
   * - In the year span element
   * - In the venue link URL (e.g., /db/conf/cvpr/cvpr2024.html)
   * - In the cite text
   */
  private extractYearFromEntry(element: HTMLElement): string | null {
    // Try to find year in dedicated year element
    const yearElement = element.querySelector('.year, [itemprop="datePublished"], time')
    if (yearElement) {
      const yearText = yearElement.textContent?.trim()
      if (yearText && /^(19|20)\d{2}$/.test(yearText)) {
        return yearText
      }
    }

    // Try to extract year from venue link URL
    const venueLinks = element.querySelectorAll('a[href*="/db/conf/"], a[href*="/db/journals/"]')
    for (const link of venueLinks) {
      const href = link.getAttribute('href') || ''
      const yearMatch = href.match(/(19|20)\d{2}/)
      if (yearMatch) {
        return yearMatch[0]
      }
    }

    // Try to extract from cite text
    const citeElement = element.querySelector('cite')
    if (citeElement) {
      const text = citeElement.textContent || ''
      const yearMatch = text.match(/\b(19|20)\d{2}\b/)
      if (yearMatch) {
        return yearMatch[0]
      }
    }

    // Try to extract from data-key attribute (often contains year)
    const dataKey = element.getAttribute('data-key')
    if (dataKey) {
      const yearMatch = dataKey.match(/(19|20)\d{2}/)
      if (yearMatch) {
        return yearMatch[0]
      }
    }

    return null
  }

  /**
   * Get all papers currently visible on the page
   */
  getPapers(): PaperInfo[] {
    const papers: PaperInfo[] = []
    
    // Search results page: li.entry elements
    const searchEntries = document.querySelectorAll('li.entry')
    if (searchEntries.length > 0) {
      searchEntries.forEach((element, index) => {
        const paper = this.processSearchEntry(element as HTMLElement, index)
        if (paper) {
          papers.push(paper)
        }
      })
      return papers
    }

    // Author page (pid): publ-list entries
    const publEntries = document.querySelectorAll('.publ-list li.entry, #publ-section li.entry')
    if (publEntries.length > 0) {
      publEntries.forEach((element, index) => {
        const paper = this.processPublEntry(element as HTMLElement, index)
        if (paper) {
          papers.push(paper)
        }
      })
      return papers
    }

    // Database page (db): article entries
    const dbEntries = document.querySelectorAll('article.entry, .entry.article, .entry.inproceedings')
    if (dbEntries.length > 0) {
      dbEntries.forEach((element, index) => {
        const paper = this.processDbEntry(element as HTMLElement, index)
        if (paper) {
          papers.push(paper)
        }
      })
      return papers
    }

    return papers
  }

  /**
   * Process a single paper element
   */
  processPaper(element: HTMLElement): PaperInfo | null {
    if (element.classList.contains('entry')) {
      // Determine entry type based on context
      if (element.closest('.publ-list') || element.closest('#publ-section')) {
        return this.processPublEntry(element, 0)
      }
      if (element.tagName === 'ARTICLE') {
        return this.processDbEntry(element, 0)
      }
      return this.processSearchEntry(element, 0)
    }
    return null
  }

  /**
   * Process a search result entry (li.entry)
   */
  private processSearchEntry(element: HTMLElement, index: number): PaperInfo | null {
    // Extract paper ID from data attribute or generate one
    const dataKey = element.getAttribute('data-key') || element.getAttribute('id')
    const id = dataKey || `dblp-search-${index}`

    // Extract title from .title element or cite > span.title
    const titleElement = element.querySelector('.title, cite .title, cite span.title')
    const title = titleElement?.textContent?.trim() || ''
    if (!title) {
      return null
    }

    // Extract venue from link
    const venue = this.extractVenueFromLink(element)
    const venueSource: VenueSource = venue ? 'page' : 'unknown'

    // Extract year from the entry
    const year = this.extractYearFromEntry(element)

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
   * Process an author page publication entry
   */
  private processPublEntry(element: HTMLElement, index: number): PaperInfo | null {
    // Extract paper ID
    const dataKey = element.getAttribute('data-key') || element.getAttribute('id')
    const id = dataKey || `dblp-publ-${index}`

    // Extract title
    const titleElement = element.querySelector('.title, cite .title, span.title')
    const title = titleElement?.textContent?.trim() || ''
    if (!title) {
      return null
    }

    // Extract venue from link
    const venue = this.extractVenueFromLink(element)
    const venueSource: VenueSource = venue ? 'page' : 'unknown'

    // Extract year from the entry
    const year = this.extractYearFromEntry(element)

    // Find insertion point
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
   * Process a database page entry (article.entry)
   */
  private processDbEntry(element: HTMLElement, index: number): PaperInfo | null {
    // Extract paper ID
    const dataKey = element.getAttribute('data-key') || element.getAttribute('id')
    const id = dataKey || `dblp-db-${index}`

    // Extract title
    const titleElement = element.querySelector('.title, cite .title, span.title')
    const title = titleElement?.textContent?.trim() || ''
    if (!title) {
      return null
    }

    // For db pages, venue is often in the URL path
    // Try to extract from current page URL or from entry links
    let venue = this.extractVenueFromLink(element)
    
    // If not found in entry, try to get from page URL
    if (!venue) {
      venue = this.extractVenueFromPageUrl()
    }

    const venueSource: VenueSource = venue ? 'page' : 'unknown'

    // Extract year from the entry
    const year = this.extractYearFromEntry(element)

    // Find insertion point
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
   * Extract venue from the current page URL (for db pages)
   */
  private extractVenueFromPageUrl(): string | null {
    const url = window.location.href
    return this.extractVenueFromHref(url)
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
      let hasNewPapers = false
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              // Check if it's a paper entry or contains paper entries
              if (
                node.classList?.contains('entry') ||
                node.querySelector?.('.entry, li.entry, article.entry')
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
    const targetNode = document.querySelector('#main, #completesearch-results, .publ-list, body')
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
export function createDblpAdapter(): DblpAdapter {
  return new DblpAdapter()
}

export default DblpAdapter
