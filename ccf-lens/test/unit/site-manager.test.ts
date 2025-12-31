/**
 * SiteManager Unit Tests
 * 
 * Tests for adapter registration, site detection, and paper processing.
 * Requirements: 
 * - 1.5 - Extensible plugin mechanism
 * - 6.3 - Avoid duplicate processing (idempotency)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SiteManager, PROCESSED_MARKER } from '../../src/adapters/site-manager'
import type { SiteAdapter, PaperInfo } from '../../src/adapters/types'

/**
 * Create a mock adapter for testing
 */
function createMockAdapter(
  siteId: string,
  urlPatterns: RegExp[],
  papers: PaperInfo[] = []
): SiteAdapter {
  return {
    siteId,
    siteName: `Mock ${siteId}`,
    urlPatterns,
    isMatch: (url: string) => urlPatterns.some(p => p.test(url)),
    getPapers: () => papers,
    processPaper: vi.fn().mockReturnValue(null),
    getInsertionPoint: (paper: PaperInfo) => paper.insertionPoint,
    observeChanges: vi.fn(),
    disconnect: vi.fn()
  }
}

/**
 * Create a mock paper for testing
 */
function createMockPaper(id: string, venue: string | null = null): PaperInfo {
  const element = document.createElement('div')
  return {
    id,
    title: `Paper ${id}`,
    venue,
    venueSource: venue ? 'page' : 'unknown',
    element,
    insertionPoint: element
  }
}

describe('SiteManager', () => {
  let manager: SiteManager

  beforeEach(() => {
    manager = new SiteManager()
  })

  describe('registerAdapter', () => {
    it('should register an adapter', () => {
      const adapter = createMockAdapter('test', [/test\.com/])
      manager.registerAdapter(adapter)
      
      expect(manager.getRegisteredSiteIds()).toContain('test')
    })

    it('should replace existing adapter with same ID', () => {
      const adapter1 = createMockAdapter('test', [/test1\.com/])
      const adapter2 = createMockAdapter('test', [/test2\.com/])
      
      manager.registerAdapter(adapter1)
      manager.registerAdapter(adapter2)
      
      const registered = manager.getAdapter('test')
      expect(registered?.urlPatterns[0].source).toBe('test2\\.com')
    })
  })

  describe('registerAdapterFactory', () => {
    it('should register a factory for lazy instantiation', () => {
      const factory = vi.fn(() => createMockAdapter('lazy', [/lazy\.com/]))
      manager.registerAdapterFactory('lazy', factory)
      
      expect(manager.getRegisteredSiteIds()).toContain('lazy')
      expect(factory).not.toHaveBeenCalled()
    })

    it('should instantiate adapter from factory on first access', () => {
      const adapter = createMockAdapter('lazy', [/lazy\.com/])
      const factory = vi.fn(() => adapter)
      manager.registerAdapterFactory('lazy', factory)
      
      const result = manager.getAdapter('lazy')
      
      expect(factory).toHaveBeenCalledOnce()
      expect(result).toBe(adapter)
    })

    it('should not reinstantiate adapter on subsequent access', () => {
      const factory = vi.fn(() => createMockAdapter('lazy', [/lazy\.com/]))
      manager.registerAdapterFactory('lazy', factory)
      
      manager.getAdapter('lazy')
      manager.getAdapter('lazy')
      
      expect(factory).toHaveBeenCalledOnce()
    })
  })

  describe('detectCurrentSite', () => {
    it('should return matching adapter for URL', () => {
      const arxivAdapter = createMockAdapter('arxiv', [/arxiv\.org/])
      const dblpAdapter = createMockAdapter('dblp', [/dblp\.org/])
      
      manager.registerAdapter(arxivAdapter)
      manager.registerAdapter(dblpAdapter)
      
      const result = manager.detectCurrentSite('https://arxiv.org/search')
      expect(result?.siteId).toBe('arxiv')
    })

    it('should return null for non-matching URL', () => {
      const adapter = createMockAdapter('test', [/test\.com/])
      manager.registerAdapter(adapter)
      
      const result = manager.detectCurrentSite('https://other.com')
      expect(result).toBeNull()
    })

    it('should instantiate from factory if URL matches', () => {
      const factory = vi.fn(() => createMockAdapter('lazy', [/lazy\.com/]))
      manager.registerAdapterFactory('lazy', factory)
      
      const result = manager.detectCurrentSite('https://lazy.com/page')
      
      expect(result?.siteId).toBe('lazy')
      expect(factory).toHaveBeenCalled()
    })
  })

  describe('processCurrentPage', () => {
    it('should process papers and return results', () => {
      const papers = [
        createMockPaper('paper1', 'CVPR'),
        createMockPaper('paper2', 'NeurIPS')
      ]
      const adapter = createMockAdapter('test', [/test\.com/], papers)
      
      manager.registerAdapter(adapter)
      manager['currentAdapter'] = adapter
      
      const results = manager.processCurrentPage()
      
      expect(results.size).toBe(2)
      expect(results.has('paper1')).toBe(true)
      expect(results.has('paper2')).toBe(true)
    })

    it('should not reprocess already processed papers (idempotency)', () => {
      const papers = [createMockPaper('paper1', 'CVPR')]
      const adapter = createMockAdapter('test', [/test\.com/], papers)
      
      manager.registerAdapter(adapter)
      manager['currentAdapter'] = adapter
      
      manager.processCurrentPage()
      const initialSize = manager.getResults().size
      
      manager.processCurrentPage()
      const finalSize = manager.getResults().size
      
      expect(finalSize).toBe(initialSize)
    })

    it('should skip papers with DOM marker even if not in memory', () => {
      const paper = createMockPaper('paper1', 'CVPR')
      // Pre-mark the element as processed
      paper.element.setAttribute(PROCESSED_MARKER, 'true')
      
      const adapter = createMockAdapter('test', [/test\.com/], [paper])
      
      manager.registerAdapter(adapter)
      manager['currentAdapter'] = adapter
      
      const results = manager.processCurrentPage()
      
      // Paper should be skipped because DOM marker exists
      expect(results.size).toBe(0)
    })

    it('should not add DOM marker until marked as processed', () => {
      const papers = [createMockPaper('paper1', 'CVPR')]
      const adapter = createMockAdapter('test', [/test\.com/], papers)
      
      manager.registerAdapter(adapter)
      manager['currentAdapter'] = adapter
      
      manager.processCurrentPage()
      
      // Processing extracts/matches but does not mark the DOM as processed
      expect(papers[0].element.hasAttribute(PROCESSED_MARKER)).toBe(false)

      manager.markAsProcessed('paper1')
      expect(papers[0].element.hasAttribute(PROCESSED_MARKER)).toBe(true)
    })

    it('should return empty map if no adapter is set', () => {
      const results = manager.processCurrentPage()
      expect(results.size).toBe(0)
    })
  })

  describe('isProcessed', () => {
    it('should return true for processed papers', () => {
      const papers = [createMockPaper('paper1', 'CVPR')]
      const adapter = createMockAdapter('test', [/test\.com/], papers)
      
      manager.registerAdapter(adapter)
      manager['currentAdapter'] = adapter
      manager.processCurrentPage()

      manager.markAsProcessed('paper1')
      expect(manager.isProcessed('paper1')).toBe(true)
    })

    it('should return false for unprocessed papers', () => {
      expect(manager.isProcessed('unknown')).toBe(false)
    })

    it('should return true when element has DOM marker', () => {
      const element = document.createElement('div')
      element.setAttribute(PROCESSED_MARKER, 'true')
      
      expect(manager.isProcessed('paper1', element)).toBe(true)
    })

    it('should sync in-memory set when DOM marker is found', () => {
      const element = document.createElement('div')
      element.setAttribute(PROCESSED_MARKER, 'true')
      
      // First call should find DOM marker and sync
      expect(manager.isProcessed('paper1', element)).toBe(true)
      // Second call should find in memory
      expect(manager.isProcessed('paper1')).toBe(true)
    })
  })

  describe('hasElementBeenProcessed', () => {
    it('should return true when paper ID is in memory', () => {
      const element = document.createElement('div')
      manager['processedElements'].add('paper1')
      
      expect(manager.hasElementBeenProcessed('paper1', element)).toBe(true)
    })

    it('should return true when element has DOM marker', () => {
      const element = document.createElement('div')
      element.setAttribute(PROCESSED_MARKER, 'true')
      
      expect(manager.hasElementBeenProcessed('paper1', element)).toBe(true)
    })

    it('should return false when neither memory nor DOM has marker', () => {
      const element = document.createElement('div')
      
      expect(manager.hasElementBeenProcessed('paper1', element)).toBe(false)
    })
  })

  describe('markElementAsProcessed', () => {
    it('should add paper ID to memory set', () => {
      const element = document.createElement('div')
      
      manager.markElementAsProcessed('paper1', element)
      
      expect(manager['processedElements'].has('paper1')).toBe(true)
    })

    it('should add DOM marker to element', () => {
      const element = document.createElement('div')
      
      manager.markElementAsProcessed('paper1', element)
      
      expect(element.hasAttribute(PROCESSED_MARKER)).toBe(true)
      expect(element.getAttribute(PROCESSED_MARKER)).toBe('true')
    })
  })

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      const papers = [
        createMockPaper('paper1', 'CVPR'),
        createMockPaper('paper2', 'Unknown Venue'),
        createMockPaper('paper3', null)
      ]
      const adapter = createMockAdapter('test', [/test\.com/], papers)
      
      manager.registerAdapter(adapter)
      manager['currentAdapter'] = adapter
      manager.processCurrentPage()
      
      const stats = manager.getStatistics()
      
      expect(stats.total).toBe(3)
      expect(stats.byRank.A + stats.byRank.B + stats.byRank.C + stats.byRank.unknown).toBe(3)
    })
  })

  describe('reset', () => {
    it('should clear all processed papers', () => {
      const papers = [createMockPaper('paper1', 'CVPR')]
      const adapter = createMockAdapter('test', [/test\.com/], papers)
      
      manager.registerAdapter(adapter)
      manager['currentAdapter'] = adapter
      manager.processCurrentPage()
      manager.markAsProcessed('paper1')
      
      expect(manager.getResults().size).toBe(1)
      
      manager.reset()
      
      expect(manager.getResults().size).toBe(0)
      expect(manager.isProcessed('paper1')).toBe(false)
    })

    it('should clear DOM markers when clearDomMarkers is true', () => {
      const papers = [createMockPaper('paper1', 'CVPR')]
      const adapter = createMockAdapter('test', [/test\.com/], papers)
      
      manager.registerAdapter(adapter)
      manager['currentAdapter'] = adapter
      manager.processCurrentPage()
      manager.markAsProcessed('paper1')
      
      const paper = manager.getResults().get('paper1')
      expect(paper?.element.hasAttribute(PROCESSED_MARKER)).toBe(true)
      
      manager.reset(true)
      
      expect(paper?.element.hasAttribute(PROCESSED_MARKER)).toBe(false)
    })

    it('should keep DOM markers when clearDomMarkers is false', () => {
      const papers = [createMockPaper('paper1', 'CVPR')]
      const adapter = createMockAdapter('test', [/test\.com/], papers)
      
      manager.registerAdapter(adapter)
      manager['currentAdapter'] = adapter
      manager.processCurrentPage()
      manager.markAsProcessed('paper1')
      
      const paper = manager.getResults().get('paper1')
      const element = paper?.element
      
      manager.reset(false)
      
      // Element still has marker even though memory is cleared
      expect(element?.hasAttribute(PROCESSED_MARKER)).toBe(true)
    })
  })

  describe('unregisterAdapter', () => {
    it('should remove adapter and call disconnect', () => {
      const adapter = createMockAdapter('test', [/test\.com/])
      manager.registerAdapter(adapter)
      
      manager.unregisterAdapter('test')
      
      expect(manager.getAdapter('test')).toBeNull()
      expect(adapter.disconnect).toHaveBeenCalled()
    })
  })
})
