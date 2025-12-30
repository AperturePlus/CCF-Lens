/**
 * Property-Based Tests for SiteManager Processing Idempotency
 * 
 * Tests correctness properties using fast-check for randomized input generation.
 * 
 * Feature: ccf-rank-userscript
 * Property 5: 处理幂等性
 * 
 * **Validates: Requirements 6.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { SiteManager, PROCESSED_MARKER } from '../../src/adapters/site-manager'
import type { SiteAdapter, PaperInfo } from '../../src/adapters/types'

/**
 * Create a mock paper with a unique DOM element
 */
function createMockPaper(id: string, venue: string | null = null): PaperInfo {
  const element = document.createElement('div')
  element.setAttribute('data-paper-id', id)
  return {
    id,
    title: `Paper ${id}`,
    venue,
    venueSource: venue ? 'page' : 'unknown',
    element,
    insertionPoint: element
  }
}

/**
 * Create a mock adapter that returns the given papers
 */
function createMockAdapter(papers: PaperInfo[]): SiteAdapter {
  return {
    siteId: 'test',
    siteName: 'Test Site',
    urlPatterns: [/test\.com/],
    isMatch: () => true,
    getPapers: () => papers,
    processPaper: () => null,
    getInsertionPoint: (paper: PaperInfo) => paper.insertionPoint,
    observeChanges: () => {},
    disconnect: () => {}
  }
}

/**
 * Generate a list of papers with unique IDs
 * Each call creates fresh DOM elements
 */
function generatePapers(count: number): PaperInfo[] {
  const papers: PaperInfo[] = []
  const venues = ['CVPR', 'NeurIPS', 'ICML', 'ICLR', 'AAAI', null]
  for (let i = 0; i < count; i++) {
    const venue = venues[i % venues.length]
    papers.push(createMockPaper(`paper-${i}`, venue))
  }
  return papers
}

describe('SiteManager Property Tests', () => {
  /**
   * Property 5: 处理幂等性
   * 
   * For any paper DOM element, multiple calls to the processing function
   * should only add one RankBadge, not duplicate badges.
   * 
   * This property ensures:
   * 1. Processing the same papers multiple times yields the same result count
   * 2. DOM elements are marked to prevent re-processing
   * 3. The processed elements set grows correctly on first pass only
   * 
   * **Validates: Requirements 6.3**
   */
  describe('Property 5: 处理幂等性', () => {
    it('should process each paper exactly once regardless of how many times processCurrentPage is called', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 1, max: 20 }),
            fc.integer({ min: 2, max: 10 })
          ),
          ([paperCount, numCalls]) => {
            // Create fresh manager and papers for each iteration
            const manager = new SiteManager()
            const papers = generatePapers(paperCount)
            const adapter = createMockAdapter(papers)
            
            manager.registerAdapter(adapter)
            manager['currentAdapter'] = adapter

            // First call should process all papers
            const firstResults = manager.processCurrentPage()
            const firstCount = firstResults.size

            // Subsequent calls should not add more papers
            for (let i = 1; i < numCalls; i++) {
              const results = manager.processCurrentPage()
              expect(results.size).toBe(firstCount)
            }

            // Final count should equal initial paper count
            expect(firstCount).toBe(paperCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should mark DOM elements with processed attribute on first processing', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (paperCount) => {
            // Create fresh manager and papers for each iteration
            const manager = new SiteManager()
            const papers = generatePapers(paperCount)
            const adapter = createMockAdapter(papers)
            
            manager.registerAdapter(adapter)
            manager['currentAdapter'] = adapter

            // Before processing, no elements should have the marker
            for (const paper of papers) {
              expect(paper.element.hasAttribute(PROCESSED_MARKER)).toBe(false)
            }

            // Process papers
            manager.processCurrentPage()

            // Simulate badge insertion (App.vue calls this after mounting)
            for (const paper of papers) {
              manager.markAsProcessed(paper.id)
            }

            // After processing, all elements should have the marker
            for (const paper of papers) {
              expect(paper.element.hasAttribute(PROCESSED_MARKER)).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should skip papers whose DOM elements already have processed marker', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          (paperCount) => {
            // Create fresh manager and papers for each iteration
            const manager = new SiteManager()
            const papers = generatePapers(paperCount)
            
            // Pre-mark half of the papers as processed
            const preMarkedCount = Math.floor(paperCount / 2)
            for (let i = 0; i < preMarkedCount; i++) {
              papers[i].element.setAttribute(PROCESSED_MARKER, 'true')
            }

            const adapter = createMockAdapter(papers)
            manager.registerAdapter(adapter)
            manager['currentAdapter'] = adapter

            // Process papers
            const results = manager.processCurrentPage()

            // Only unmarked papers should be processed
            const expectedCount = paperCount - preMarkedCount
            expect(results.size).toBe(expectedCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain consistent isProcessed state across multiple checks', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (paperCount) => {
            // Create fresh manager and papers for each iteration
            const manager = new SiteManager()
            const papers = generatePapers(paperCount)
            const adapter = createMockAdapter(papers)
            
            manager.registerAdapter(adapter)
            manager['currentAdapter'] = adapter

            // Process papers
            manager.processCurrentPage()

            // Simulate badge insertion
            for (const paper of papers) {
              manager.markAsProcessed(paper.id)
            }

            // Check isProcessed for each paper multiple times
            for (const paper of papers) {
              const check1 = manager.isProcessed(paper.id, paper.element)
              const check2 = manager.isProcessed(paper.id, paper.element)
              const check3 = manager.isProcessed(paper.id)

              expect(check1).toBe(true)
              expect(check2).toBe(true)
              expect(check3).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should sync in-memory state when DOM marker is found', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (paperCount) => {
            // Create a fresh manager (empty in-memory state)
            const manager = new SiteManager()
            const papers = generatePapers(paperCount)

            // Pre-mark all papers as processed in DOM only
            for (const paper of papers) {
              paper.element.setAttribute(PROCESSED_MARKER, 'true')
            }

            // Check each paper - should find DOM marker and sync to memory
            for (const paper of papers) {
              const result = manager.isProcessed(paper.id, paper.element)
              expect(result).toBe(true)
            }

            // Now check without element - should find in memory
            for (const paper of papers) {
              const result = manager.isProcessed(paper.id)
              expect(result).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should clear DOM markers when reset is called with clearDomMarkers=true', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (paperCount) => {
            // Create fresh manager and papers for each iteration
            const manager = new SiteManager()
            const papers = generatePapers(paperCount)
            const adapter = createMockAdapter(papers)
            
            manager.registerAdapter(adapter)
            manager['currentAdapter'] = adapter

            // First processing
            manager.processCurrentPage()
            expect(manager.getResults().size).toBe(paperCount)

            // Simulate badge insertion
            for (const paper of papers) {
              manager.markAsProcessed(paper.id)
            }

            // Verify markers are set
            for (const paper of papers) {
              expect(paper.element.hasAttribute(PROCESSED_MARKER)).toBe(true)
            }

            // Reset with clearing DOM markers
            manager.reset(true)

            // Verify markers are cleared
            for (const paper of papers) {
              expect(paper.element.hasAttribute(PROCESSED_MARKER)).toBe(false)
            }

            // Process again - should process all papers
            manager.processCurrentPage()
            expect(manager.getResults().size).toBe(paperCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not reprocess papers after reset without clearing DOM markers', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (paperCount) => {
            // Create fresh manager and papers for each iteration
            const manager = new SiteManager()
            const papers = generatePapers(paperCount)
            const adapter = createMockAdapter(papers)
            
            manager.registerAdapter(adapter)
            manager['currentAdapter'] = adapter

            // First processing
            manager.processCurrentPage()
            expect(manager.getResults().size).toBe(paperCount)

            // Simulate badge insertion (sets DOM markers)
            for (const paper of papers) {
              manager.markAsProcessed(paper.id)
            }

            // Reset without clearing DOM markers
            manager.reset(false)
            expect(manager.getResults().size).toBe(0)

            // Process again - should skip all because DOM markers exist
            manager.processCurrentPage()
            expect(manager.getResults().size).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
