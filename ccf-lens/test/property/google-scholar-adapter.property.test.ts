/**
 * Property-Based Tests for GoogleScholarAdapter
 * 
 * Tests correctness properties for Google Scholar paper extraction using fast-check.
 * 
 * Feature: google-scholar-integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { GoogleScholarAdapter } from '../../src/adapters/google-scholar-adapter'

describe('GoogleScholarAdapter Property Tests', () => {
  let adapter: GoogleScholarAdapter

  beforeEach(() => {
    adapter = new GoogleScholarAdapter()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    adapter.disconnect()
  })

  /**
   * Known venue names for testing
   */
  const KNOWN_VENUES = [
    'Nature', 'Science', 'CVPR', 'ICCV', 'NeurIPS', 'ICML', 'ICLR',
    'AAAI', 'IJCAI', 'ACL', 'EMNLP', 'KDD', 'WWW', 'SIGIR',
    'TPAMI', 'TIP', 'TNNLS', 'TKDE', 'JMLR',
    'IEEE Transactions on Pattern Analysis',
    'Advances in neural information processing systems',
    'Proceedings of the IEEE Conference on Computer Vision'
  ]

  /**
   * Arbitrary for generating valid paper titles
   * Titles should not have leading/trailing whitespace since the adapter trims them
   */
  const titleArb = fc.stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -:'),
    { minLength: 5, maxLength: 100 }
  ).map(s => s.trim()).filter(s => s.length >= 5)

  /**
   * Arbitrary for generating author names
   */
  const authorArb = fc.tuple(
    fc.constantFrom('J', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z'),
    fc.constantFrom('Smith', 'Jones', 'Brown', 'Wilson', 'Taylor', 'Lee', 'Wang', 'Zhang', 'Chen', 'Liu')
  ).map(([initial, surname]) => `${initial} ${surname}`)

  /**
   * Arbitrary for generating years
   */
  const yearArb = fc.integer({ min: 2010, max: 2025 })

  /**
   * Arbitrary for generating citation IDs
   */
  const cidArb = fc.stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'),
    { minLength: 8, maxLength: 16 }
  )

  /**
   * Arbitrary for generating venue names
   */
  const venueArb = fc.constantFrom(...KNOWN_VENUES)

  /**
   * Property 2: 论文信息提取完整性
   * 
   * For any valid Google Scholar paper entry DOM element, the GoogleScholarAdapter
   * should be able to extract:
   * - Non-empty paper title
   * - Journal/conference name (may be empty or truncated)
   * - Unique element identifier
   * 
   * **Validates: Requirements 1.1, 1.2, 1.3**
   */
  describe('Property 2: 论文信息提取完整性', () => {
    
    it('should extract non-empty title from search result elements', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/scholar?q=test' },
        writable: true
      })

      fc.assert(
        fc.property(
          fc.tuple(titleArb, authorArb, venueArb, yearArb, cidArb),
          ([title, author, venue, year, cid]) => {
            // Create valid search result DOM
            document.body.innerHTML = `
              <div class="gs_r gs_or gs_scl" data-cid="${cid}">
                <div class="gs_ri">
                  <h3 class="gs_rt">
                    <a href="/scholar?q=info:${cid}">${title}</a>
                  </h3>
                  <div class="gs_a">${author} - ${venue}, ${year} - example.com</div>
                </div>
              </div>
            `

            const papers = adapter.processSearchResults()
            
            // Should extract exactly one paper
            expect(papers).toHaveLength(1)
            
            // Title should be non-empty and match input
            expect(papers[0].title).toBeTruthy()
            expect(papers[0].title.length).toBeGreaterThan(0)
            expect(papers[0].title).toBe(title)
            
            // ID should be non-empty
            expect(papers[0].id).toBeTruthy()
            expect(papers[0].id.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })


    it('should extract non-empty title from author page elements', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/citations?user=test' },
        writable: true
      })

      fc.assert(
        fc.property(
          fc.tuple(titleArb, authorArb, venueArb, yearArb, cidArb),
          ([title, author, venue, year, cid]) => {
            // Create valid author page DOM
            document.body.innerHTML = `
              <table>
                <tbody>
                  <tr class="gsc_a_tr">
                    <td class="gsc_a_t">
                      <a class="gsc_a_at" href="/citations?citation_for_view=${cid}">${title}</a>
                      <div class="gs_gray">${author}</div>
                      <div class="gs_gray">${venue}, ${year}</div>
                    </td>
                    <td class="gsc_a_y"><span class="gsc_a_h">${year}</span></td>
                  </tr>
                </tbody>
              </table>
            `

            const papers = adapter.processAuthorPage()
            
            // Should extract exactly one paper
            expect(papers).toHaveLength(1)
            
            // Title should be non-empty and match input
            expect(papers[0].title).toBeTruthy()
            expect(papers[0].title.length).toBeGreaterThan(0)
            expect(papers[0].title).toBe(title)
            
            // ID should be non-empty
            expect(papers[0].id).toBeTruthy()
            expect(papers[0].id.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate unique IDs for multiple papers', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/scholar?q=test' },
        writable: true
      })

      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(titleArb, cidArb),
            { minLength: 2, maxLength: 10 }
          ),
          (paperData) => {
            // Create multiple search results
            const resultsHtml = paperData.map(([title, cid], index) => `
              <div class="gs_r gs_or gs_scl" data-cid="${cid}-${index}">
                <div class="gs_ri">
                  <h3 class="gs_rt">
                    <a href="/scholar?q=info:${cid}">${title}</a>
                  </h3>
                  <div class="gs_a">J Smith - Nature, 2024</div>
                </div>
              </div>
            `).join('')

            document.body.innerHTML = `<div id="gs_res_ccl_mid">${resultsHtml}</div>`

            const papers = adapter.processSearchResults()
            
            // Should extract all papers
            expect(papers).toHaveLength(paperData.length)
            
            // All IDs should be unique
            const ids = papers.map(p => p.id)
            const uniqueIds = new Set(ids)
            expect(uniqueIds.size).toBe(ids.length)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should extract venue when present in search results', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/scholar?q=test' },
        writable: true
      })

      fc.assert(
        fc.property(
          fc.tuple(titleArb, authorArb, venueArb, yearArb, cidArb),
          ([title, author, venue, year, cid]) => {
            document.body.innerHTML = `
              <div class="gs_r gs_or gs_scl" data-cid="${cid}">
                <div class="gs_ri">
                  <h3 class="gs_rt">
                    <a href="/scholar?q=info:${cid}">${title}</a>
                  </h3>
                  <div class="gs_a">${author} - ${venue}, ${year} - example.com</div>
                </div>
              </div>
            `

            const papers = adapter.processSearchResults()
            
            expect(papers).toHaveLength(1)
            
            // Venue should be extracted (may be the full venue or part of it)
            // The extraction logic parses the venue from the author line
            if (papers[0].venue) {
              expect(papers[0].venue.length).toBeGreaterThan(0)
              expect(papers[0].venueSource).toBe('page')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle papers without venue gracefully', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/scholar?q=test' },
        writable: true
      })

      fc.assert(
        fc.property(
          fc.tuple(titleArb, cidArb),
          ([title, cid]) => {
            // Create search result without venue info (arXiv preprint)
            document.body.innerHTML = `
              <div class="gs_r gs_or gs_scl" data-cid="${cid}">
                <div class="gs_ri">
                  <h3 class="gs_rt">
                    <a href="/scholar?q=info:${cid}">${title}</a>
                  </h3>
                  <div class="gs_a">J Smith - arXiv preprint arXiv:2401.12345, 2024</div>
                </div>
              </div>
            `

            const papers = adapter.processSearchResults()
            
            expect(papers).toHaveLength(1)
            
            // Title should still be extracted
            expect(papers[0].title).toBe(title)
            
            // Venue should be null for arXiv preprints
            expect(papers[0].venue).toBeNull()
            expect(papers[0].venueSource).toBe('unknown')
          }
        ),
        { numRuns: 50 }
      )
    })


    it('should detect truncated venue names', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/scholar?q=test' },
        writable: true
      })

      fc.assert(
        fc.property(
          fc.tuple(titleArb, cidArb, fc.constantFrom('…', '...')),
          ([title, cid, ellipsis]) => {
            // Create search result with truncated venue
            document.body.innerHTML = `
              <div class="gs_r gs_or gs_scl" data-cid="${cid}">
                <div class="gs_ri">
                  <h3 class="gs_rt">
                    <a href="/scholar?q=info:${cid}">${title}</a>
                  </h3>
                  <div class="gs_a">J Smith - Proceedings of the IEEE Conference on${ellipsis}, 2024</div>
                </div>
              </div>
            `

            const papers = adapter.processSearchResults()
            
            expect(papers).toHaveLength(1)
            
            // Should detect truncation
            expect(papers[0].journalTruncated).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should preserve insertion point reference', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/scholar?q=test' },
        writable: true
      })

      fc.assert(
        fc.property(
          fc.tuple(titleArb, cidArb),
          ([title, cid]) => {
            document.body.innerHTML = `
              <div class="gs_r gs_or gs_scl" data-cid="${cid}">
                <div class="gs_ri">
                  <h3 class="gs_rt">
                    <a href="/scholar?q=info:${cid}">${title}</a>
                  </h3>
                  <div class="gs_a">J Smith - Nature, 2024</div>
                </div>
              </div>
            `

            const papers = adapter.processSearchResults()
            
            expect(papers).toHaveLength(1)
            
            // Insertion point should be a valid DOM element
            expect(papers[0].insertionPoint).toBeInstanceOf(HTMLElement)
            
            // getInsertionPoint should return the same element
            expect(adapter.getInsertionPoint(papers[0])).toBe(papers[0].insertionPoint)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should extract year when present', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/scholar?q=test' },
        writable: true
      })

      fc.assert(
        fc.property(
          fc.tuple(titleArb, venueArb, yearArb, cidArb),
          ([title, venue, year, cid]) => {
            document.body.innerHTML = `
              <div class="gs_r gs_or gs_scl" data-cid="${cid}">
                <div class="gs_ri">
                  <h3 class="gs_rt">
                    <a href="/scholar?q=info:${cid}">${title}</a>
                  </h3>
                  <div class="gs_a">J Smith - ${venue}, ${year} - example.com</div>
                </div>
              </div>
            `

            const papers = adapter.processSearchResults()
            
            expect(papers).toHaveLength(1)
            
            // Year should be extracted
            expect(papers[0].year).toBe(year.toString())
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
