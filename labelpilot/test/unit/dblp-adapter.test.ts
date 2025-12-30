/**
 * DblpAdapter Unit Tests
 * 
 * Tests for the DBLP site adapter functionality.
 * 
 * Requirements:
 * - 1.2: Recognize and process paper lists on DBLP.org search results or author pages
 * - 1.4: Auto-detect and process newly added paper entries when page dynamically loads
 * - 2.3: Extract venue info from venue link or text on DBLP pages
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DblpAdapter, createDblpAdapter } from '../../src/adapters/dblp-adapter'

describe('DblpAdapter', () => {
  let adapter: DblpAdapter

  beforeEach(() => {
    adapter = new DblpAdapter()
    // Reset DOM
    document.body.innerHTML = ''
  })

  afterEach(() => {
    adapter.disconnect()
  })

  describe('isMatch', () => {
    it('should match DBLP search URLs', () => {
      expect(adapter.isMatch('https://dblp.org/search?q=machine+learning')).toBe(true)
      expect(adapter.isMatch('https://dblp.org/search/')).toBe(true)
    })

    it('should match DBLP database URLs', () => {
      expect(adapter.isMatch('https://dblp.org/db/conf/cvpr/cvpr2024.html')).toBe(true)
      expect(adapter.isMatch('https://dblp.org/db/journals/tpami/tpami47.html')).toBe(true)
    })

    it('should match DBLP author/person URLs', () => {
      expect(adapter.isMatch('https://dblp.org/pid/123/456.html')).toBe(true)
      expect(adapter.isMatch('https://dblp.org/pers/hd/h/Hinton:Geoffrey_E=')).toBe(true)
    })

    it('should not match non-DBLP URLs', () => {
      expect(adapter.isMatch('https://arxiv.org/search')).toBe(false)
      expect(adapter.isMatch('https://ieeexplore.ieee.org/search')).toBe(false)
      expect(adapter.isMatch('https://google.com')).toBe(false)
    })
  })

  describe('extractVenueFromLink', () => {
    it('should extract venue from conference link', () => {
      const element = document.createElement('div')
      element.innerHTML = `
        <a href="/db/conf/cvpr/cvpr2024.html">CVPR 2024</a>
        <span class="title">Some Paper Title</span>
      `
      
      const venue = adapter.extractVenueFromLink(element)
      expect(venue).toBe('CVPR')
    })

    it('should extract venue from journal link', () => {
      const element = document.createElement('div')
      element.innerHTML = `
        <a href="/db/journals/tpami/tpami47.html">TPAMI</a>
        <span class="title">Some Paper Title</span>
      `
      
      const venue = adapter.extractVenueFromLink(element)
      expect(venue).toBe('TPAMI')
    })

    it('should return null when no venue link found', () => {
      const element = document.createElement('div')
      element.innerHTML = `
        <a href="/author/123">Author Name</a>
        <span class="title">Some Paper Title</span>
      `
      
      const venue = adapter.extractVenueFromLink(element)
      expect(venue).toBeNull()
    })

    it('should handle multiple links and extract first venue', () => {
      const element = document.createElement('div')
      element.innerHTML = `
        <a href="/author/123">Author</a>
        <a href="/db/conf/nips/neurips2023.html">NeurIPS 2023</a>
        <a href="/db/conf/icml/icml2023.html">ICML 2023</a>
      `
      
      const venue = adapter.extractVenueFromLink(element)
      expect(venue).toBe('NIPS')
    })
  })

  describe('getPapers', () => {
    it('should extract papers from search results', () => {
      document.body.innerHTML = `
        <ul>
          <li class="entry" data-key="conf/cvpr/Paper2024">
            <span class="title">Deep Learning for Vision</span>
            <a href="/db/conf/cvpr/cvpr2024.html">CVPR 2024</a>
          </li>
          <li class="entry" data-key="conf/nips/Paper2023">
            <span class="title">Neural Networks</span>
            <a href="/db/conf/nips/neurips2023.html">NeurIPS 2023</a>
          </li>
        </ul>
      `

      const papers = adapter.getPapers()
      
      expect(papers).toHaveLength(2)
      expect(papers[0].id).toBe('conf/cvpr/Paper2024')
      expect(papers[0].title).toBe('Deep Learning for Vision')
      expect(papers[0].venue).toBe('CVPR')
      expect(papers[0].venueSource).toBe('page')
      
      expect(papers[1].id).toBe('conf/nips/Paper2023')
      expect(papers[1].title).toBe('Neural Networks')
      expect(papers[1].venue).toBe('NIPS')
    })

    it('should handle entries without venue links', () => {
      document.body.innerHTML = `
        <ul>
          <li class="entry" data-key="arxiv/Paper2024">
            <span class="title">Preprint Paper</span>
          </li>
        </ul>
      `

      const papers = adapter.getPapers()
      
      expect(papers).toHaveLength(1)
      expect(papers[0].venue).toBeNull()
      expect(papers[0].venueSource).toBe('unknown')
    })

    it('should skip entries without title', () => {
      document.body.innerHTML = `
        <ul>
          <li class="entry" data-key="conf/cvpr/Paper2024">
            <a href="/db/conf/cvpr/cvpr2024.html">CVPR 2024</a>
          </li>
        </ul>
      `

      const papers = adapter.getPapers()
      expect(papers).toHaveLength(0)
    })

    it('should return empty array when no entries found', () => {
      document.body.innerHTML = '<div>No papers here</div>'
      
      const papers = adapter.getPapers()
      expect(papers).toHaveLength(0)
    })
  })

  describe('processPaper', () => {
    it('should process a single entry element', () => {
      const element = document.createElement('li')
      element.className = 'entry'
      element.setAttribute('data-key', 'conf/icml/Paper2024')
      element.innerHTML = `
        <span class="title">Machine Learning Paper</span>
        <a href="/db/conf/icml/icml2024.html">ICML 2024</a>
      `

      const paper = adapter.processPaper(element)
      
      expect(paper).not.toBeNull()
      expect(paper!.id).toBe('conf/icml/Paper2024')
      expect(paper!.title).toBe('Machine Learning Paper')
      expect(paper!.venue).toBe('ICML')
    })

    it('should return null for non-entry elements', () => {
      const element = document.createElement('div')
      element.innerHTML = '<span>Not an entry</span>'

      const paper = adapter.processPaper(element)
      expect(paper).toBeNull()
    })
  })

  describe('getInsertionPoint', () => {
    it('should return the insertion point from paper info', () => {
      const insertionPoint = document.createElement('span')
      const paper = {
        id: 'test',
        title: 'Test',
        venue: null,
        venueSource: 'unknown' as const,
        element: document.createElement('div'),
        insertionPoint,
      }

      expect(adapter.getInsertionPoint(paper)).toBe(insertionPoint)
    })
  })

  describe('observeChanges', () => {
    it('should call callback when new entries are added', async () => {
      const callback = vi.fn()
      
      // Set up initial DOM
      document.body.innerHTML = '<div id="main"></div>'
      
      adapter.observeChanges(callback)
      
      // Add new entry
      const main = document.getElementById('main')!
      const newEntry = document.createElement('li')
      newEntry.className = 'entry'
      newEntry.innerHTML = '<span class="title">New Paper</span>'
      main.appendChild(newEntry)
      
      // Wait for mutation observer
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callback).toHaveBeenCalled()
    })

    it('should not call callback for non-entry additions', async () => {
      const callback = vi.fn()
      
      document.body.innerHTML = '<div id="main"></div>'
      
      adapter.observeChanges(callback)
      
      // Add non-entry element
      const main = document.getElementById('main')!
      const div = document.createElement('div')
      div.textContent = 'Not an entry'
      main.appendChild(div)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('disconnect', () => {
    it('should stop observing changes', async () => {
      const callback = vi.fn()
      
      document.body.innerHTML = '<div id="main"></div>'
      
      adapter.observeChanges(callback)
      adapter.disconnect()
      
      // Add new entry after disconnect
      const main = document.getElementById('main')!
      const newEntry = document.createElement('li')
      newEntry.className = 'entry'
      main.appendChild(newEntry)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('factory function', () => {
    it('should create a new DblpAdapter instance', () => {
      const adapter = createDblpAdapter()
      expect(adapter).toBeInstanceOf(DblpAdapter)
      expect(adapter.siteId).toBe('dblp')
    })
  })
})
