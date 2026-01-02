/**
 * GoogleScholarAdapter Unit Tests
 * 
 * Tests for the Google Scholar site adapter functionality.
 * 
 * Requirements:
 * - 1.1: Recognize and process paper lists on Google Scholar search result pages
 * - 1.2: Recognize and process paper lists on Google Scholar author profile pages
 * - 1.3: Extract title and venue information from paper entries
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GoogleScholarAdapter, createGoogleScholarAdapter } from '../../src/adapters/google-scholar-adapter'

describe('GoogleScholarAdapter', () => {
  let adapter: GoogleScholarAdapter

  beforeEach(() => {
    adapter = new GoogleScholarAdapter()
    // Reset DOM
    document.body.innerHTML = ''
  })

  afterEach(() => {
    adapter.disconnect()
  })

  describe('isMatch', () => {
    it('should match Google Scholar search URLs', () => {
      expect(adapter.isMatch('https://scholar.google.com/scholar?q=machine+learning')).toBe(true)
      expect(adapter.isMatch('https://scholar.google.com/scholar?hl=en&q=deep+learning')).toBe(true)
    })

    it('should match Google Scholar HK mirror search URLs', () => {
      expect(adapter.isMatch('https://scholar.google.com.hk/scholar?q=neural+networks')).toBe(true)
    })

    it('should match Google Scholar author/citations URLs', () => {
      expect(adapter.isMatch('https://scholar.google.com/citations?user=JicYPdAAAAAJ')).toBe(true)
      expect(adapter.isMatch('https://scholar.google.com/citations?hl=en&user=abc123')).toBe(true)
    })

    it('should match Google Scholar HK mirror citations URLs', () => {
      expect(adapter.isMatch('https://scholar.google.com.hk/citations?user=xyz789')).toBe(true)
    })

    it('should match other Google Scholar regional domains', () => {
      expect(adapter.isMatch('https://scholar.google.co.uk/scholar?q=graph+neural+networks')).toBe(true)
      expect(adapter.isMatch('https://scholar.google.com.sg/citations?user=JicYPdAAAAAJ')).toBe(true)
    })

    it('should match Google Scholar proxy site (lanfanshu.cn) search URLs', () => {
      expect(adapter.isMatch('https://scholar.lanfanshu.cn/scholar?hl=zh-CN&as_sdt=0%2C5&q=aigc+detect&btnG=')).toBe(true)
      expect(adapter.isMatch('http://scholar.lanfanshu.cn/scholar?q=machine+learning')).toBe(true)
    })

    it('should match Google Scholar proxy site (lanfanshu.cn) citations URLs', () => {
      expect(adapter.isMatch('https://scholar.lanfanshu.cn/citations?user=JicYPdAAAAAJ')).toBe(true)
    })

    it('should not match non-Google Scholar URLs', () => {
      expect(adapter.isMatch('https://arxiv.org/search')).toBe(false)
      expect(adapter.isMatch('https://dblp.org/search')).toBe(false)
      expect(adapter.isMatch('https://ieeexplore.ieee.org/search')).toBe(false)
      expect(adapter.isMatch('https://google.com/search?q=test')).toBe(false)
    })
  })

  describe('extractJournalInfo', () => {
    it('should extract journal from standard venue text', () => {
      const result = adapter.extractJournalInfo('J Smith, A Jones - Nature, 2024 - nature.com')
      expect(result.journal).toBe('Nature')
      expect(result.truncated).toBe(false)
    })

    it('should extract conference from venue text', () => {
      const result = adapter.extractJournalInfo('J Smith - CVPR, 2023 - openaccess.thecvf.com')
      expect(result.journal).toBe('CVPR')
      expect(result.truncated).toBe(false)
    })

    it('should detect truncated journal names with ellipsis', () => {
      const result = adapter.extractJournalInfo('J Smith - Proceedings of the IEEE Conference on…, 2023')
      expect(result.truncated).toBe(true)
      expect(result.journal).toBeTruthy()
    })

    it('should detect truncated names with three dots', () => {
      const result = adapter.extractJournalInfo('J Smith - IEEE Transactions on Pattern Analysis..., 2023')
      expect(result.truncated).toBe(true)
    })

    it('should return empty for arXiv preprints', () => {
      const result = adapter.extractJournalInfo('J Smith - arXiv preprint arXiv:2401.12345, 2024')
      expect(result.journal).toBe('')
      expect(result.truncated).toBe(false)
    })

    it('should handle empty venue text', () => {
      const result = adapter.extractJournalInfo('')
      expect(result.journal).toBe('')
      expect(result.truncated).toBe(false)
    })

    it('should handle venue text without clear separator', () => {
      const result = adapter.extractJournalInfo('Some Journal Name')
      expect(result.journal).toBeTruthy()
    })
  })


  describe('processSearchResults', () => {
    beforeEach(() => {
      // Mock window.location for search results page
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/scholar?q=test' },
        writable: true
      })
    })

    it('should extract papers from search results', () => {
      document.body.innerHTML = `
        <div id="gs_res_ccl_mid">
          <div class="gs_r gs_or gs_scl" data-cid="abc123">
            <div class="gs_ri">
              <h3 class="gs_rt">
                <a href="/scholar?q=info:abc123">Deep Learning for Vision</a>
              </h3>
              <div class="gs_a">J Smith, A Jones - CVPR, 2024 - openaccess.thecvf.com</div>
            </div>
          </div>
          <div class="gs_r gs_or gs_scl" data-cid="def456">
            <div class="gs_ri">
              <h3 class="gs_rt">
                <a href="/scholar?q=info:def456">Neural Networks</a>
              </h3>
              <div class="gs_a">B Brown - Nature, 2023 - nature.com</div>
            </div>
          </div>
        </div>
      `

      const papers = adapter.processSearchResults()
      
      expect(papers).toHaveLength(2)
      expect(papers[0].id).toBe('abc123')
      expect(papers[0].title).toBe('Deep Learning for Vision')
      expect(papers[0].venue).toBe('CVPR')
      expect(papers[0].venueSource).toBe('page')
      
      expect(papers[1].id).toBe('def456')
      expect(papers[1].title).toBe('Neural Networks')
      expect(papers[1].venue).toBe('Nature')
    })

    it('should handle entries without venue info', () => {
      document.body.innerHTML = `
        <div class="gs_r gs_or gs_scl" data-cid="xyz789">
          <div class="gs_ri">
            <h3 class="gs_rt">
              <a href="/scholar?q=info:xyz789">Preprint Paper</a>
            </h3>
            <div class="gs_a">J Smith - arXiv preprint arXiv:2401.12345, 2024</div>
          </div>
        </div>
      `

      const papers = adapter.processSearchResults()
      
      expect(papers).toHaveLength(1)
      expect(papers[0].venue).toBeNull()
      expect(papers[0].venueSource).toBe('unknown')
    })

    it('should skip entries without title', () => {
      document.body.innerHTML = `
        <div class="gs_r gs_or gs_scl" data-cid="notitle">
          <div class="gs_ri">
            <div class="gs_a">J Smith - CVPR, 2024</div>
          </div>
        </div>
      `

      const papers = adapter.processSearchResults()
      expect(papers).toHaveLength(0)
    })

    it('should return empty array when no results found', () => {
      document.body.innerHTML = '<div>No papers here</div>'
      
      const papers = adapter.processSearchResults()
      expect(papers).toHaveLength(0)
    })

    it('should detect truncated journal names', () => {
      document.body.innerHTML = `
        <div class="gs_r gs_or gs_scl" data-cid="trunc123">
          <div class="gs_ri">
            <h3 class="gs_rt">
              <a href="#">Long Conference Paper</a>
            </h3>
            <div class="gs_a">J Smith - Proceedings of the IEEE Conference on…, 2023</div>
          </div>
        </div>
      `

      const papers = adapter.processSearchResults()
      
      expect(papers).toHaveLength(1)
      expect(papers[0].journalTruncated).toBe(true)
    })

    it('should generate fallback ID when data-cid is missing', () => {
      document.body.innerHTML = `
        <div class="gs_r gs_or gs_scl">
          <div class="gs_ri">
            <h3 class="gs_rt">
              <a href="#">Paper Without CID</a>
            </h3>
            <div class="gs_a">J Smith - ICML, 2024</div>
          </div>
        </div>
      `

      const papers = adapter.processSearchResults()
      
      expect(papers).toHaveLength(1)
      expect(papers[0].id).toBe('gs-search-0')
    })
  })


  describe('processAuthorPage', () => {
    beforeEach(() => {
      // Mock window.location for author page
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/citations?user=JicYPdAAAAAJ' },
        writable: true
      })
    })

    it('should extract papers from author page', () => {
      document.body.innerHTML = `
        <table id="gsc_a_t">
          <tbody id="gsc_a_b">
            <tr class="gsc_a_tr">
              <td class="gsc_a_t">
                <a class="gsc_a_at" href="/citations?view_op=view_citation&citation_for_view=user123:paper1">ImageNet Classification</a>
                <div class="gs_gray">A Krizhevsky, I Sutskever, GE Hinton</div>
                <div class="gs_gray">Advances in neural information processing systems, 2012</div>
              </td>
              <td class="gsc_a_c"><a href="#">12345</a></td>
              <td class="gsc_a_y"><span class="gsc_a_h">2012</span></td>
            </tr>
            <tr class="gsc_a_tr">
              <td class="gsc_a_t">
                <a class="gsc_a_at" href="/citations?view_op=view_citation&citation_for_view=user123:paper2">Deep Residual Learning</a>
                <div class="gs_gray">K He, X Zhang, S Ren, J Sun</div>
                <div class="gs_gray">CVPR, 2016</div>
              </td>
              <td class="gsc_a_c"><a href="#">9876</a></td>
              <td class="gsc_a_y"><span class="gsc_a_h">2016</span></td>
            </tr>
          </tbody>
        </table>
      `

      const papers = adapter.processAuthorPage()
      
      expect(papers).toHaveLength(2)
      expect(papers[0].id).toBe('user123:paper1')
      expect(papers[0].title).toBe('ImageNet Classification')
      expect(papers[0].venue).toBe('Advances in neural information processing systems')
      expect(papers[0].year).toBe('2012')
      
      expect(papers[1].id).toBe('user123:paper2')
      expect(papers[1].title).toBe('Deep Residual Learning')
      expect(papers[1].venue).toBe('CVPR')
      expect(papers[1].year).toBe('2016')
    })

    it('should handle entries without venue info', () => {
      document.body.innerHTML = `
        <table>
          <tbody>
            <tr class="gsc_a_tr">
              <td class="gsc_a_t">
                <a class="gsc_a_at" href="/citations?citation_for_view=user:paper">Preprint Paper</a>
                <div class="gs_gray">J Smith</div>
                <div class="gs_gray">arXiv preprint arXiv:2401.12345</div>
              </td>
              <td class="gsc_a_y"><span class="gsc_a_h">2024</span></td>
            </tr>
          </tbody>
        </table>
      `

      const papers = adapter.processAuthorPage()
      
      expect(papers).toHaveLength(1)
      expect(papers[0].venue).toBeNull()
      expect(papers[0].venueSource).toBe('unknown')
    })

    it('should skip entries without title', () => {
      document.body.innerHTML = `
        <tr class="gsc_a_tr">
          <td class="gsc_a_t">
            <div class="gs_gray">J Smith</div>
            <div class="gs_gray">CVPR, 2024</div>
          </td>
        </tr>
      `

      const papers = adapter.processAuthorPage()
      expect(papers).toHaveLength(0)
    })

    it('should return empty array when no papers found', () => {
      document.body.innerHTML = '<div>No papers here</div>'
      
      const papers = adapter.processAuthorPage()
      expect(papers).toHaveLength(0)
    })

    it('should detect truncated venue names', () => {
      document.body.innerHTML = `
        <table>
          <tbody>
            <tr class="gsc_a_tr">
              <td class="gsc_a_t">
                <a class="gsc_a_at" href="/citations?citation_for_view=user:paper">Long Paper</a>
                <div class="gs_gray">J Smith</div>
                <div class="gs_gray">IEEE Transactions on Pattern Analysis and Machine…</div>
              </td>
            </tr>
          </tbody>
        </table>
      `

      const papers = adapter.processAuthorPage()
      
      expect(papers).toHaveLength(1)
      expect(papers[0].journalTruncated).toBe(true)
    })

    it('should generate fallback ID when citation_for_view is missing', () => {
      document.body.innerHTML = `
        <table>
          <tbody>
            <tr class="gsc_a_tr">
              <td class="gsc_a_t">
                <a class="gsc_a_at" href="/citations?view_op=view_citation">Paper Without ID</a>
                <div class="gs_gray">J Smith</div>
                <div class="gs_gray">ICML, 2024</div>
              </td>
            </tr>
          </tbody>
        </table>
      `

      const papers = adapter.processAuthorPage()
      
      expect(papers).toHaveLength(1)
      expect(papers[0].id).toBe('gs-author-0')
    })
  })


  describe('getPapers', () => {
    it('should call processSearchResults for search page', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/scholar?q=test' },
        writable: true
      })

      document.body.innerHTML = `
        <div class="gs_r gs_or gs_scl" data-cid="test1">
          <div class="gs_ri">
            <h3 class="gs_rt"><a href="#">Test Paper</a></h3>
            <div class="gs_a">J Smith - CVPR, 2024</div>
          </div>
        </div>
      `

      const papers = adapter.getPapers()
      expect(papers).toHaveLength(1)
      expect(papers[0].title).toBe('Test Paper')
    })

    it('should call processAuthorPage for citations page', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/citations?user=abc123' },
        writable: true
      })

      document.body.innerHTML = `
        <table>
          <tbody>
            <tr class="gsc_a_tr">
              <td class="gsc_a_t">
                <a class="gsc_a_at" href="/citations?citation_for_view=abc:123">Author Paper</a>
                <div class="gs_gray">J Smith</div>
                <div class="gs_gray">Nature, 2024</div>
              </td>
            </tr>
          </tbody>
        </table>
      `

      const papers = adapter.getPapers()
      expect(papers).toHaveLength(1)
      expect(papers[0].title).toBe('Author Paper')
    })

    it('should return empty array for unknown page type', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/intl/en/scholar/about.html' },
        writable: true
      })

      const papers = adapter.getPapers()
      expect(papers).toHaveLength(0)
    })

    it('should call processSearchResults for proxy site search page', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.lanfanshu.cn/scholar?hl=zh-CN&as_sdt=0%2C5&q=aigc+detect&btnG=' },
        writable: true
      })

      document.body.innerHTML = `
        <div class="gs_r gs_or gs_scl" data-cid="proxy1">
          <div class="gs_ri">
            <h3 class="gs_rt"><a href="#">AIGC Detection Paper</a></h3>
            <div class="gs_a">J Smith - CVPR, 2024</div>
          </div>
        </div>
      `

      const papers = adapter.getPapers()
      expect(papers).toHaveLength(1)
      expect(papers[0].title).toBe('AIGC Detection Paper')
    })

    it('should call processAuthorPage for proxy site citations page', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.lanfanshu.cn/citations?user=abc123' },
        writable: true
      })

      document.body.innerHTML = `
        <table>
          <tbody>
            <tr class="gsc_a_tr">
              <td class="gsc_a_t">
                <a class="gsc_a_at" href="/citations?citation_for_view=abc:123">Proxy Author Paper</a>
                <div class="gs_gray">J Smith</div>
                <div class="gs_gray">Nature, 2024</div>
              </td>
            </tr>
          </tbody>
        </table>
      `

      const papers = adapter.getPapers()
      expect(papers).toHaveLength(1)
      expect(papers[0].title).toBe('Proxy Author Paper')
    })
  })

  describe('processPaper', () => {
    it('should process search result element', () => {
      const element = document.createElement('div')
      element.className = 'gs_r gs_or gs_scl'
      element.setAttribute('data-cid', 'single123')
      element.innerHTML = `
        <div class="gs_ri">
          <h3 class="gs_rt"><a href="#">Single Paper</a></h3>
          <div class="gs_a">J Smith - ICLR, 2024</div>
        </div>
      `

      const paper = adapter.processPaper(element)
      
      expect(paper).not.toBeNull()
      expect(paper!.id).toBe('single123')
      expect(paper!.title).toBe('Single Paper')
      expect(paper!.venue).toBe('ICLR')
    })

    it('should process author page row element', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/citations?user=test' },
        writable: true
      })

      const element = document.createElement('tr')
      element.className = 'gsc_a_tr'
      element.innerHTML = `
        <td class="gsc_a_t">
          <a class="gsc_a_at" href="/citations?citation_for_view=user:paper">Row Paper</a>
          <div class="gs_gray">J Smith</div>
          <div class="gs_gray">NeurIPS, 2023</div>
        </td>
      `

      const paper = adapter.processPaper(element)
      
      expect(paper).not.toBeNull()
      expect(paper!.title).toBe('Row Paper')
      expect(paper!.venue).toBe('NeurIPS')
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
    it('should call callback when new search results are added', async () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/scholar?q=test' },
        writable: true
      })

      const callback = vi.fn()
      
      document.body.innerHTML = '<div id="gs_res_ccl_mid"></div>'
      
      adapter.observeChanges(callback)
      
      // Add new search result
      const container = document.getElementById('gs_res_ccl_mid')!
      const newResult = document.createElement('div')
      newResult.className = 'gs_r gs_or gs_scl'
      newResult.innerHTML = '<div class="gs_ri"><h3 class="gs_rt">New Paper</h3></div>'
      container.appendChild(newResult)
      
      // Wait for mutation observer
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callback).toHaveBeenCalled()
    })

    it('should call callback when new author page rows are added', async () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/citations?user=test' },
        writable: true
      })

      const callback = vi.fn()
      
      document.body.innerHTML = '<table><tbody id="gsc_a_b"></tbody></table>'
      
      adapter.observeChanges(callback)
      
      // Add new paper row
      const container = document.getElementById('gsc_a_b')!
      const newRow = document.createElement('tr')
      newRow.className = 'gsc_a_tr'
      container.appendChild(newRow)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callback).toHaveBeenCalled()
    })

    it('should not call callback for non-paper additions', async () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/scholar?q=test' },
        writable: true
      })

      const callback = vi.fn()
      
      document.body.innerHTML = '<div id="gs_res_ccl_mid"></div>'
      
      adapter.observeChanges(callback)
      
      // Add non-paper element
      const container = document.getElementById('gs_res_ccl_mid')!
      const div = document.createElement('div')
      div.textContent = 'Not a paper'
      container.appendChild(div)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('disconnect', () => {
    it('should stop observing changes', async () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://scholar.google.com/scholar?q=test' },
        writable: true
      })

      const callback = vi.fn()
      
      document.body.innerHTML = '<div id="gs_res_ccl_mid"></div>'
      
      adapter.observeChanges(callback)
      adapter.disconnect()
      
      // Add new result after disconnect
      const container = document.getElementById('gs_res_ccl_mid')!
      const newResult = document.createElement('div')
      newResult.className = 'gs_r gs_or gs_scl'
      container.appendChild(newResult)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('factory function', () => {
    it('should create a new GoogleScholarAdapter instance', () => {
      const adapter = createGoogleScholarAdapter()
      expect(adapter).toBeInstanceOf(GoogleScholarAdapter)
      expect(adapter.siteId).toBe('google-scholar')
      expect(adapter.siteName).toBe('Google Scholar')
    })
  })
})
