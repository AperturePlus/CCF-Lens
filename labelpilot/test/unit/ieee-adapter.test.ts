/**
 * IeeeAdapter Unit Tests
 * 
 * Tests for the IEEE Xplore site adapter functionality.
 * 
 * Requirements:
 * - 1.3: Recognize and process paper lists on IEEE Xplore search result pages
 * - 1.4: Auto-detect and process newly added paper entries when page dynamically loads
 * - 2.4: Extract venue info from publication-title or related elements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IeeeAdapter, createIeeeAdapter } from '../../src/adapters/ieee-adapter'

describe('IeeeAdapter', () => {
  let adapter: IeeeAdapter

  beforeEach(() => {
    adapter = new IeeeAdapter()
    // Reset DOM
    document.body.innerHTML = ''
  })

  afterEach(() => {
    adapter.disconnect()
  })

  describe('isMatch', () => {
    it('should match IEEE Xplore search URLs', () => {
      expect(adapter.isMatch('https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=machine+learning')).toBe(true)
      expect(adapter.isMatch('https://ieeexplore.ieee.org/search/')).toBe(true)
    })

    it('should match IEEE Xplore document URLs', () => {
      expect(adapter.isMatch('https://ieeexplore.ieee.org/document/12345678')).toBe(true)
      expect(adapter.isMatch('https://ieeexplore.ieee.org/document/9999999/')).toBe(true)
    })

    it('should match IEEE Xplore author URLs', () => {
      expect(adapter.isMatch('https://ieeexplore.ieee.org/author/37085432100')).toBe(true)
    })

    it('should match IEEE Xplore conference home URLs', () => {
      expect(adapter.isMatch('https://ieeexplore.ieee.org/xpl/conhome/9878378/proceeding')).toBe(true)
    })

    it('should match IEEE Xplore TOC result URLs', () => {
      expect(adapter.isMatch('https://ieeexplore.ieee.org/xpl/tocresult.jsp?isnumber=9878379')).toBe(true)
    })

    it('should not match non-IEEE URLs', () => {
      expect(adapter.isMatch('https://arxiv.org/search')).toBe(false)
      expect(adapter.isMatch('https://dblp.org/search')).toBe(false)
      expect(adapter.isMatch('https://google.com')).toBe(false)
    })
  })

  describe('extractVenueFromPublication', () => {
    it('should extract venue from conference link', () => {
      const element = document.createElement('div')
      element.innerHTML = `
        <div class="description">
          <a href="/xpl/conhome/9878378/proceeding">CVPR 2024</a>
        </div>
        <h3>Some Paper Title</h3>
      `
      
      const venue = adapter.extractVenueFromPublication(element)
      expect(venue).toBe('CVPR')
    })

    it('should extract venue from journal link', () => {
      const element = document.createElement('div')
      element.innerHTML = `
        <div class="description">
          <a href="/xpl/RecentIssue.jsp?punumber=34">IEEE Transactions on Pattern Analysis and Machine Intelligence</a>
        </div>
        <h3>Some Paper Title</h3>
      `
      
      const venue = adapter.extractVenueFromPublication(element)
      expect(venue).toBe('TPAMI')
    })

    it('should extract venue from publication-title element', () => {
      const element = document.createElement('div')
      element.innerHTML = `
        <div class="publication-title">IEEE/CVF Conference on Computer Vision and Pattern Recognition</div>
        <h3>Some Paper Title</h3>
      `
      
      const venue = adapter.extractVenueFromPublication(element)
      expect(venue).toBe('CVPR')
    })

    it('should return null when no venue found', () => {
      const element = document.createElement('div')
      element.innerHTML = `
        <h3>Some Paper Title</h3>
        <span>Author Name</span>
      `
      
      const venue = adapter.extractVenueFromPublication(element)
      expect(venue).toBeNull()
    })

    it('should normalize known IEEE journal names', () => {
      const element = document.createElement('div')
      element.innerHTML = `
        <div class="publication-title">IEEE Transactions on Neural Networks and Learning Systems</div>
      `
      
      const venue = adapter.extractVenueFromPublication(element)
      expect(venue).toBe('TNNLS')
    })

    it('should normalize known IEEE conference names', () => {
      const element = document.createElement('div')
      element.innerHTML = `
        <div class="publication-title">IEEE INFOCOM</div>
      `
      
      const venue = adapter.extractVenueFromPublication(element)
      expect(venue).toBe('INFOCOM')
    })
  })

  describe('getPapers', () => {
    it('should extract papers from search results with xpl-results-item', () => {
      document.body.innerHTML = `
        <xpl-results-item>
          <h2><a href="/document/12345678">Deep Learning for Vision</a></h2>
          <div class="description">
            <a href="/xpl/conhome/9878378/proceeding">CVPR 2024</a>
          </div>
        </xpl-results-item>
        <xpl-results-item>
          <h2><a href="/document/87654321">Neural Networks</a></h2>
          <div class="description">
            <a href="/xpl/RecentIssue.jsp?punumber=34">IEEE Transactions on Pattern Analysis and Machine Intelligence</a>
          </div>
        </xpl-results-item>
      `

      const papers = adapter.getPapers()
      
      expect(papers).toHaveLength(2)
      expect(papers[0].id).toBe('ieee-12345678')
      expect(papers[0].title).toBe('Deep Learning for Vision')
      expect(papers[0].venue).toBe('CVPR')
      expect(papers[0].venueSource).toBe('page')
      
      expect(papers[1].id).toBe('ieee-87654321')
      expect(papers[1].title).toBe('Neural Networks')
      expect(papers[1].venue).toBe('TPAMI')
    })

    it('should extract papers from result-item elements', () => {
      document.body.innerHTML = `
        <div class="result-item">
          <div class="result-item-title"><a href="/document/11111111">Paper One</a></div>
          <div class="description">
            <a href="/xpl/conhome/123/proceeding">ICML 2024</a>
          </div>
        </div>
      `

      const papers = adapter.getPapers()
      
      expect(papers).toHaveLength(1)
      expect(papers[0].id).toBe('ieee-11111111')
      expect(papers[0].title).toBe('Paper One')
    })

    it('should handle entries without venue info', () => {
      document.body.innerHTML = `
        <xpl-results-item>
          <h2><a href="/document/99999999">Preprint Paper</a></h2>
        </xpl-results-item>
      `

      const papers = adapter.getPapers()
      
      expect(papers).toHaveLength(1)
      expect(papers[0].venue).toBeNull()
      expect(papers[0].venueSource).toBe('unknown')
    })

    it('should skip entries without title', () => {
      document.body.innerHTML = `
        <xpl-results-item>
          <div class="description">
            <a href="/xpl/conhome/123/proceeding">CVPR 2024</a>
          </div>
        </xpl-results-item>
      `

      const papers = adapter.getPapers()
      expect(papers).toHaveLength(0)
    })

    it('should return empty array when no entries found', () => {
      document.body.innerHTML = '<div>No papers here</div>'
      
      const papers = adapter.getPapers()
      expect(papers).toHaveLength(0)
    })

    it('should extract papers from proceedings items', () => {
      document.body.innerHTML = `
        <div class="issue-item">
          <h3><a href="/document/22222222">Proceedings Paper</a></h3>
          <div class="publication-title">IEEE INFOCOM</div>
        </div>
      `

      const papers = adapter.getPapers()
      
      expect(papers).toHaveLength(1)
      expect(papers[0].id).toBe('ieee-22222222')
      expect(papers[0].title).toBe('Proceedings Paper')
      expect(papers[0].venue).toBe('INFOCOM')
    })
  })

  describe('processPaper', () => {
    it('should process xpl-results-item element', () => {
      const element = document.createElement('xpl-results-item')
      element.innerHTML = `
        <h2><a href="/document/33333333">Machine Learning Paper</a></h2>
        <div class="description">
          <a href="/xpl/conhome/456/proceeding">ICML 2024</a>
        </div>
      `

      const paper = adapter.processPaper(element)
      
      expect(paper).not.toBeNull()
      expect(paper!.id).toBe('ieee-33333333')
      expect(paper!.title).toBe('Machine Learning Paper')
    })

    it('should process result-item element', () => {
      const element = document.createElement('div')
      element.className = 'result-item'
      element.innerHTML = `
        <div class="result-item-title"><a href="/document/44444444">Another Paper</a></div>
      `

      const paper = adapter.processPaper(element)
      
      expect(paper).not.toBeNull()
      expect(paper!.id).toBe('ieee-44444444')
      expect(paper!.title).toBe('Another Paper')
    })

    it('should process issue-item element', () => {
      const element = document.createElement('div')
      element.className = 'issue-item'
      element.innerHTML = `
        <h3><a href="/document/55555555">Issue Paper</a></h3>
      `

      const paper = adapter.processPaper(element)
      
      expect(paper).not.toBeNull()
      expect(paper!.id).toBe('ieee-55555555')
      expect(paper!.title).toBe('Issue Paper')
    })

    it('should return null for non-paper elements', () => {
      const element = document.createElement('div')
      element.innerHTML = '<span>Not a paper</span>'

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
    it('should call callback when new xpl-results-item is added', async () => {
      const callback = vi.fn()
      
      document.body.innerHTML = '<div id="xplMainContent"></div>'
      
      adapter.observeChanges(callback)
      
      // Add new result item
      const main = document.getElementById('xplMainContent')!
      const newItem = document.createElement('xpl-results-item')
      newItem.innerHTML = '<h2>New Paper</h2>'
      main.appendChild(newItem)
      
      // Wait for mutation observer
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callback).toHaveBeenCalled()
    })

    it('should call callback when new result-item is added', async () => {
      const callback = vi.fn()
      
      document.body.innerHTML = '<div id="xplMainContent"></div>'
      
      adapter.observeChanges(callback)
      
      // Add new result item
      const main = document.getElementById('xplMainContent')!
      const newItem = document.createElement('div')
      newItem.className = 'result-item'
      main.appendChild(newItem)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callback).toHaveBeenCalled()
    })

    it('should not call callback for non-paper additions', async () => {
      const callback = vi.fn()
      
      document.body.innerHTML = '<div id="xplMainContent"></div>'
      
      adapter.observeChanges(callback)
      
      // Add non-paper element
      const main = document.getElementById('xplMainContent')!
      const div = document.createElement('div')
      div.textContent = 'Not a paper'
      main.appendChild(div)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('disconnect', () => {
    it('should stop observing changes', async () => {
      const callback = vi.fn()
      
      document.body.innerHTML = '<div id="xplMainContent"></div>'
      
      adapter.observeChanges(callback)
      adapter.disconnect()
      
      // Add new item after disconnect
      const main = document.getElementById('xplMainContent')!
      const newItem = document.createElement('xpl-results-item')
      main.appendChild(newItem)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('factory function', () => {
    it('should create a new IeeeAdapter instance', () => {
      const adapter = createIeeeAdapter()
      expect(adapter).toBeInstanceOf(IeeeAdapter)
      expect(adapter.siteId).toBe('ieee')
      expect(adapter.siteName).toBe('IEEE Xplore')
    })
  })
})
