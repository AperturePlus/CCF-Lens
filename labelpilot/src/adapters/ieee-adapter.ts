/**
 * IEEE Xplore Site Adapter Module
 * 
 * Implements the SiteAdapter interface for ieeexplore.ieee.org.
 * Extracts paper information from IEEE Xplore search results and author pages.
 * 
 * Requirements:
 * - 1.3: Recognize and process paper lists on IEEE Xplore search result pages
 * - 1.4: Auto-detect and process newly added paper entries when page dynamically loads
 * - 2.4: Extract venue info from publication-title or related elements
 */

import type { SiteAdapter, PaperInfo, VenueSource } from './types'

/**
 * Known IEEE publication name mappings to standard abbreviations
 * Maps common IEEE publication names to their CCF catalog abbreviations
 */
const IEEE_VENUE_MAPPINGS: Record<string, string> = {
  // Journals
  'ieee transactions on pattern analysis and machine intelligence': 'TPAMI',
  'ieee trans. pattern anal. mach. intell.': 'TPAMI',
  'tpami': 'TPAMI',
  'ieee transactions on image processing': 'TIP',
  'ieee trans. image process.': 'TIP',
  'ieee transactions on neural networks and learning systems': 'TNNLS',
  'ieee trans. neural netw. learn. syst.': 'TNNLS',
  'ieee transactions on knowledge and data engineering': 'TKDE',
  'ieee trans. knowl. data eng.': 'TKDE',
  'ieee transactions on software engineering': 'TSE',
  'ieee trans. softw. eng.': 'TSE',
  'ieee transactions on visualization and computer graphics': 'TVCG',
  'ieee trans. vis. comput. graph.': 'TVCG',
  'ieee transactions on computers': 'TC',
  'ieee trans. comput.': 'TC',
  'ieee transactions on parallel and distributed systems': 'TPDS',
  'ieee trans. parallel distrib. syst.': 'TPDS',
  'ieee transactions on mobile computing': 'TMC',
  'ieee trans. mob. comput.': 'TMC',
  'ieee transactions on information forensics and security': 'TIFS',
  'ieee trans. inf. forensics secur.': 'TIFS',
  'ieee transactions on multimedia': 'TMM',
  'ieee trans. multimedia': 'TMM',
  'ieee transactions on circuits and systems for video technology': 'TCSVT',
  'ieee trans. circuits syst. video technol.': 'TCSVT',
  'ieee transactions on cybernetics': 'TCYB',
  'ieee trans. cybern.': 'TCYB',
  'ieee transactions on information theory': 'TIT',
  'ieee trans. inf. theory': 'TIT',
  'ieee transactions on automatic control': 'TAC',
  'ieee trans. autom. control': 'TAC',
  'ieee transactions on signal processing': 'TSP',
  'ieee trans. signal process.': 'TSP',
  'ieee transactions on communications': 'TCOM',
  'ieee trans. commun.': 'TCOM',
  'ieee transactions on wireless communications': 'TWC',
  'ieee trans. wirel. commun.': 'TWC',
  'ieee/acm transactions on networking': 'TON',
  'ieee/acm trans. netw.': 'TON',
  'proceedings of the ieee': 'PIEEE',
  'proc. ieee': 'PIEEE',
  
  // Conferences
  'ieee/cvf conference on computer vision and pattern recognition': 'CVPR',
  'cvpr': 'CVPR',
  'ieee/cvf international conference on computer vision': 'ICCV',
  'iccv': 'ICCV',
  'ieee international conference on computer vision': 'ICCV',
  'ieee symposium on security and privacy': 'S&P',
  'ieee s&p': 'S&P',
  's&p': 'S&P',
  'ieee infocom': 'INFOCOM',
  'infocom': 'INFOCOM',
  'ieee international conference on data engineering': 'ICDE',
  'icde': 'ICDE',
  'ieee international conference on robotics and automation': 'ICRA',
  'icra': 'ICRA',
  'ieee/rsj international conference on intelligent robots and systems': 'IROS',
  'iros': 'IROS',
  'ieee international conference on acoustics, speech and signal processing': 'ICASSP',
  'icassp': 'ICASSP',
  'ieee visualization': 'VIS',
  'ieee vis': 'VIS',
  'ieee virtual reality': 'VR',
  'ieee vr': 'VR',
  'ieee international symposium on high-performance computer architecture': 'HPCA',
  'hpca': 'HPCA',
  'ieee international symposium on microarchitecture': 'MICRO',
  'micro': 'MICRO',
  'ieee real-time systems symposium': 'RTSS',
  'rtss': 'RTSS',
  'ieee international conference on software engineering': 'ICSE',
  'icse': 'ICSE',
  'ieee/acm international conference on automated software engineering': 'ASE',
  'ase': 'ASE',
  'ieee international symposium on software testing and analysis': 'ISSTA',
  'issta': 'ISSTA',
}

/**
 * IeeeAdapter class for extracting paper information from ieeexplore.ieee.org
 */
export class IeeeAdapter implements SiteAdapter {
  readonly siteId = 'ieee'
  readonly siteName = 'IEEE Xplore'
  readonly urlPatterns = [
    /ieeexplore\.ieee\.org\/search/,
    /ieeexplore\.ieee\.org\/author/,
    /ieeexplore\.ieee\.org\/document/,
    /ieeexplore\.ieee\.org\/xpl\/conhome/,
    /ieeexplore\.ieee\.org\/xpl\/tocresult/,
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
   * Extract venue information from publication element
   * IEEE Xplore uses various elements to display publication info
   * 
   * @param element - The paper entry element
   * @returns Extracted venue name or null
   */
  extractVenueFromPublication(element: HTMLElement): string | null {
    // Try multiple selectors for publication info
    const selectors = [
      '.description a[href*="/xpl/conhome"]',  // Conference link
      '.description a[href*="/xpl/RecentIssue"]',  // Journal link
      '.publisher-info-container a',  // Publisher info
      '.publication-title',  // Publication title
      '.stats-document-abstract-publishedIn a',  // Published in link
      '.doc-abstract-pubinfo a',  // Abstract page pub info
      'xpl-document-details .publication-title',  // Document details
    ]

    for (const selector of selectors) {
      const pubElement = element.querySelector(selector)
      if (pubElement) {
        const text = pubElement.textContent?.trim()
        if (text) {
          const venue = this.normalizeVenueName(text)
          if (venue) {
            return venue
          }
        }
      }
    }

    // Fallback: try to find venue in description text
    const descElement = element.querySelector('.description, .doc-abstract-pubinfo')
    if (descElement) {
      const text = descElement.textContent || ''
      const venue = this.extractVenueFromText(text)
      if (venue) {
        return venue
      }
    }

    return null
  }

  /**
   * Normalize venue name to standard abbreviation
   * @param name - The raw venue name from the page
   * @returns Normalized venue abbreviation or cleaned name
   */
  private normalizeVenueName(name: string): string | null {
    if (!name || name.trim().length === 0) {
      return null
    }

    const lowerName = name.toLowerCase().trim()
    
    // Check direct mapping
    if (IEEE_VENUE_MAPPINGS[lowerName]) {
      return IEEE_VENUE_MAPPINGS[lowerName]
    }

    // Check partial matches
    for (const [key, value] of Object.entries(IEEE_VENUE_MAPPINGS)) {
      // Only match when the page text contains a known key.
      // Avoid reverse substring matches (e.g., "ieee" matching everything).
      if (lowerName.includes(key)) {
        return value
      }
    }

    // Clean up the name and return
    return this.cleanVenueName(name)
  }

  /**
   * Clean venue name by removing year, volume info, etc.
   */
  private cleanVenueName(name: string): string | null {
    let cleaned = name
      // Remove year patterns
      .replace(/\s*\(\d{4}\)\s*/g, ' ')
      .replace(/\s*\d{4}\s*/g, ' ')
      // Remove volume/issue info
      .replace(/\s*vol\.\s*\d+/gi, '')
      .replace(/\s*no\.\s*\d+/gi, '')
      .replace(/\s*pp?\.\s*\d+[-–]\d+/gi, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim()

    if (cleaned.length < 2) {
      return null
    }

    return cleaned
  }

  /**
   * Extract venue from text content as fallback
   */
  private extractVenueFromText(text: string): string | null {
    // Look for common patterns
    const patterns = [
      /(?:published\s+in|appears\s+in|in)\s*:\s*([^,\n]+)/i,
      /(?:conference|journal|proceedings)\s*:\s*([^,\n]+)/i,
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const venue = this.normalizeVenueName(match[1].trim())
        if (venue) {
          return venue
        }
      }
    }

    return null
  }

  /**
   * Get all papers currently visible on the page
   */
  getPapers(): PaperInfo[] {
    const papers: PaperInfo[] = []
    
    // Search results page: xpl-results-item elements
    const searchResults = document.querySelectorAll('xpl-results-item')
    if (searchResults.length > 0) {
      searchResults.forEach((element, index) => {
        const paper = this.processSearchResultItem(element as HTMLElement, index)
        if (paper) {
          papers.push(paper)
        }
      })
      return papers
    }

    // Search results container: List-results-items (process child items)
    const listContainers = document.querySelectorAll('.List-results-items')
    if (listContainers.length > 0) {
      listContainers.forEach((container) => {
        const items = container.querySelectorAll('xpl-results-item, .result-item, .document-result')
        items.forEach((element, index) => {
          const paper = element.tagName.toLowerCase() === 'xpl-results-item'
            ? this.processSearchResultItem(element as HTMLElement, index)
            : this.processResultItem(element as HTMLElement, index)
          if (paper) {
            papers.push(paper)
          }
        })
      })
      if (papers.length > 0) {
        return papers
      }
    }

    // Alternative search results structure
    const resultItems = document.querySelectorAll('.result-item, .document-result')
    if (resultItems.length > 0) {
      resultItems.forEach((element, index) => {
        const paper = this.processResultItem(element as HTMLElement, index)
        if (paper) {
          papers.push(paper)
        }
      })
      return papers
    }

    // Document/abstract page: single paper
    const docPage = document.querySelector('.document-main, xpl-document-details')
    if (docPage) {
      const paper = this.processDocumentPage(docPage as HTMLElement)
      if (paper) {
        papers.push(paper)
      }
    }

    // Conference proceedings page
    const proceedingsItems = document.querySelectorAll('.issue-item, .toc-item')
    if (proceedingsItems.length > 0) {
      proceedingsItems.forEach((element, index) => {
        const paper = this.processProceedingsItem(element as HTMLElement, index)
        if (paper) {
          papers.push(paper)
        }
      })
    }

    return papers
  }

  /**
   * Process a single paper element
   */
  processPaper(element: HTMLElement): PaperInfo | null {
    // Determine the type of element and process accordingly
    if (element.tagName.toLowerCase() === 'xpl-results-item' || 
        element.classList.contains('List-results-items')) {
      return this.processSearchResultItem(element, 0)
    }
    if (element.classList.contains('result-item') || 
        element.classList.contains('document-result')) {
      return this.processResultItem(element, 0)
    }
    if (element.classList.contains('document-main') ||
        element.tagName.toLowerCase() === 'xpl-document-details') {
      return this.processDocumentPage(element)
    }
    if (element.classList.contains('issue-item') ||
        element.classList.contains('toc-item')) {
      return this.processProceedingsItem(element, 0)
    }
    return null
  }

  /**
   * Process a search result item (xpl-results-item)
   */
  private processSearchResultItem(element: HTMLElement, index: number): PaperInfo | null {
    // Extract document ID from link
    const docLink = element.querySelector('a[href*="/document/"]')
    const idMatch = docLink?.getAttribute('href')?.match(/\/document\/(\d+)/)
    const id = idMatch ? `ieee-${idMatch[1]}` : `ieee-search-${index}`

    // Extract title
    const titleElement = element.querySelector('h2 a, h3 a, .result-item-title a, .document-title a')
    const title = titleElement?.textContent?.trim() || ''
    if (!title) {
      return null
    }

    // Extract venue from publication info
    const venue = this.extractVenueFromPublication(element)
    const venueSource: VenueSource = venue ? 'page' : 'unknown'

    // Find insertion point (after title)
    const insertionPoint = titleElement?.parentElement as HTMLElement || element

    return {
      id,
      title,
      venue,
      venueSource,
      element,
      insertionPoint,
    }
  }

  /**
   * Process a generic result item
   */
  private processResultItem(element: HTMLElement, index: number): PaperInfo | null {
    // Extract document ID
    const docLink = element.querySelector('a[href*="/document/"]')
    const idMatch = docLink?.getAttribute('href')?.match(/\/document\/(\d+)/)
    const id = idMatch ? `ieee-${idMatch[1]}` : `ieee-result-${index}`

    // Extract title
    const titleElement = element.querySelector('.result-item-title, .document-title, h2, h3')
    const title = titleElement?.textContent?.trim() || ''
    if (!title) {
      return null
    }

    // Extract venue
    const venue = this.extractVenueFromPublication(element)
    const venueSource: VenueSource = venue ? 'page' : 'unknown'

    // Find insertion point
    const insertionPoint = titleElement as HTMLElement || element

    return {
      id,
      title,
      venue,
      venueSource,
      element,
      insertionPoint,
    }
  }

  /**
   * Process a document/abstract page
   */
  private processDocumentPage(element: HTMLElement): PaperInfo | null {
    // Extract document ID from URL
    const urlMatch = window.location.pathname.match(/\/document\/(\d+)/)
    const id = urlMatch ? `ieee-${urlMatch[1]}` : 'ieee-doc-0'

    // Extract title
    const titleElement = document.querySelector(
      '.document-title, h1.document-title, .title-text, xpl-document-details h1'
    )
    const title = titleElement?.textContent?.trim() || ''
    if (!title) {
      return null
    }

    // Extract venue from publication info
    const venue = this.extractVenueFromPublication(element)
    const venueSource: VenueSource = venue ? 'page' : 'unknown'

    // Find insertion point (after title)
    const insertionPoint = titleElement as HTMLElement || element

    return {
      id,
      title,
      venue,
      venueSource,
      element,
      insertionPoint,
    }
  }

  /**
   * Process a proceedings/TOC item
   */
  private processProceedingsItem(element: HTMLElement, index: number): PaperInfo | null {
    // Extract document ID
    const docLink = element.querySelector('a[href*="/document/"]')
    const idMatch = docLink?.getAttribute('href')?.match(/\/document\/(\d+)/)
    const id = idMatch ? `ieee-${idMatch[1]}` : `ieee-proc-${index}`

    // Extract title
    const titleElement = element.querySelector('.issue-item-title, .toc-item-title, h3, h4')
    const title = titleElement?.textContent?.trim() || ''
    if (!title) {
      return null
    }

    // For proceedings pages, venue is often in the page header
    let venue = this.extractVenueFromPublication(element)
    if (!venue) {
      venue = this.extractVenueFromPageHeader()
    }
    const venueSource: VenueSource = venue ? 'page' : 'unknown'

    // Find insertion point
    const insertionPoint = titleElement as HTMLElement || element

    return {
      id,
      title,
      venue,
      venueSource,
      element,
      insertionPoint,
    }
  }

  /**
   * Extract venue from page header (for proceedings pages)
   */
  private extractVenueFromPageHeader(): string | null {
    const headerSelectors = [
      '.xpl-conhome-header h1',
      '.conference-title',
      '.publication-title',
      'xpl-issue-header h1',
    ]

    for (const selector of headerSelectors) {
      const headerElement = document.querySelector(selector)
      if (headerElement) {
        const text = headerElement.textContent?.trim()
        if (text) {
          return this.normalizeVenueName(text)
        }
      }
    }

    return null
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
              // Check if it's a paper element or contains paper elements
              if (
                node.tagName?.toLowerCase() === 'xpl-results-item' ||
                node.classList?.contains('result-item') ||
                node.classList?.contains('document-result') ||
                node.classList?.contains('issue-item') ||
                node.classList?.contains('List-results-items') ||
                node.querySelector?.('xpl-results-item, .result-item, .issue-item')
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
    const targetNode = document.querySelector(
      '#xplMainContent, .main-content, .search-results, body'
    )
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
export function createIeeeAdapter(): IeeeAdapter {
  return new IeeeAdapter()
}

export default IeeeAdapter
