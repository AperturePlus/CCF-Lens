/**
 * DblpService Unit Tests
 * 
 * Tests for DBLP query functionality, cache integration, and error handling.
 * Requirements: 2.2, 6.1, 8.1, 8.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DblpService, DBLP_TIMEOUT } from '../../src/services/dblp-service'
import { CacheManager } from '../../src/core/cache-manager'
import { clearGMStorage } from '../setup'

// Helper to create mock DBLP API response
function createMockDblpResponse(hits: Array<{
  title: string
  venue?: string
  year?: string
  url?: string
}>) {
  return {
    result: {
      hits: {
        '@total': String(hits.length),
        hit: hits.map(h => ({
          info: {
            title: h.title,
            venue: h.venue,
            year: h.year,
            url: h.url,
          },
        })),
      },
    },
  }
}

// Helper to mock GM_xmlhttpRequest
function mockGMXmlHttpRequest(
  response: object | null,
  options: {
    status?: number
    shouldError?: boolean
    shouldTimeout?: boolean
    delay?: number
  } = {}
) {
  const { status = 200, shouldError = false, shouldTimeout = false, delay = 0 } = options

  globalThis.GM_xmlhttpRequest = vi.fn((details) => {
    setTimeout(() => {
      if (shouldTimeout && details.ontimeout) {
        details.ontimeout()
      } else if (shouldError && details.onerror) {
        details.onerror(new Error('Network error'))
      } else if (details.onload) {
        details.onload({
          responseText: response ? JSON.stringify(response) : '',
          status,
        })
      }
    }, delay)
    return { abort: vi.fn() }
  }) as typeof GM_xmlhttpRequest
}

describe('DblpService', () => {
  let service: DblpService
  let cacheManager: CacheManager

  beforeEach(() => {
    clearGMStorage()
    cacheManager = new CacheManager()
    service = new DblpService(cacheManager)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('queryByTitle - Basic Functionality', () => {
    it('should return found result when DBLP has matching paper', async () => {
      const mockResponse = createMockDblpResponse([
        {
          title: 'Deep Learning for Computer Vision',
          venue: 'CVPR',
          year: '2023',
          url: 'https://dblp.org/rec/conf/cvpr/2023',
        },
      ])
      mockGMXmlHttpRequest(mockResponse)

      const result = await service.queryByTitle('Deep Learning for Computer Vision')

      expect(result.found).toBe(true)
      expect(result.venue).toBe('CVPR')
      expect(result.year).toBe('2023')
      expect(result.dblpUrl).toBe('https://dblp.org/rec/conf/cvpr/2023')
    })

    it('should return not found when DBLP has no matching papers', async () => {
      const mockResponse = createMockDblpResponse([])
      mockGMXmlHttpRequest(mockResponse)

      const result = await service.queryByTitle('Nonexistent Paper Title XYZ')

      expect(result.found).toBe(false)
      expect(result.venue).toBeNull()
      expect(result.year).toBeNull()
    })

    it('should return not found when title similarity is too low', async () => {
      const mockResponse = createMockDblpResponse([
        {
          title: 'Completely Different Paper About Something Else',
          venue: 'ICML',
          year: '2022',
        },
      ])
      mockGMXmlHttpRequest(mockResponse)

      const result = await service.queryByTitle('Deep Learning for Computer Vision')

      expect(result.found).toBe(false)
    })

    it('should find best matching paper from multiple results', async () => {
      const mockResponse = createMockDblpResponse([
        {
          title: 'Some Other Paper',
          venue: 'ICML',
          year: '2021',
        },
        {
          title: 'Deep Learning for Computer Vision Applications',
          venue: 'CVPR',
          year: '2023',
        },
        {
          title: 'Another Unrelated Paper',
          venue: 'NeurIPS',
          year: '2022',
        },
      ])
      mockGMXmlHttpRequest(mockResponse)

      const result = await service.queryByTitle('Deep Learning for Computer Vision')

      expect(result.found).toBe(true)
      expect(result.venue).toBe('CVPR')
    })

    it('should handle empty title', async () => {
      const result = await service.queryByTitle('')

      expect(result.found).toBe(false)
      expect(result.error).toBe('Empty title provided')
    })

    it('should handle whitespace-only title', async () => {
      const result = await service.queryByTitle('   ')

      expect(result.found).toBe(false)
      expect(result.error).toBe('Empty title provided')
    })
  })

  describe('Cache Integration', () => {
    it('should cache successful query results', async () => {
      const mockResponse = createMockDblpResponse([
        {
          title: 'Test Paper',
          venue: 'CVPR',
          year: '2023',
        },
      ])
      mockGMXmlHttpRequest(mockResponse)

      // First query
      await service.queryByTitle('Test Paper')

      // Second query should use cache (GM_xmlhttpRequest should only be called once)
      const result = await service.queryByTitle('Test Paper')

      expect(result.found).toBe(true)
      expect(result.venue).toBe('CVPR')
      expect(GM_xmlhttpRequest).toHaveBeenCalledTimes(1)
    })

    it('should cache not-found results', async () => {
      const mockResponse = createMockDblpResponse([])
      mockGMXmlHttpRequest(mockResponse)

      // First query
      await service.queryByTitle('Nonexistent Paper')

      // Second query should use cache
      const result = await service.queryByTitle('Nonexistent Paper')

      expect(result.found).toBe(false)
      expect(GM_xmlhttpRequest).toHaveBeenCalledTimes(1)
    })

    it('should not cache error results', async () => {
      mockGMXmlHttpRequest(null, { shouldError: true })

      // First query - error
      const result1 = await service.queryByTitle('Error Paper')
      expect(result1.error).toBeTruthy()

      // Setup successful response for retry
      const mockResponse = createMockDblpResponse([
        { title: 'Error Paper', venue: 'ICML', year: '2023' },
      ])
      mockGMXmlHttpRequest(mockResponse)

      // Second query should retry (not use cached error)
      const result2 = await service.queryByTitle('Error Paper')
      expect(result2.found).toBe(true)
      expect(result2.venue).toBe('ICML')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockGMXmlHttpRequest(null, { shouldError: true })

      const result = await service.queryByTitle('Test Paper')

      expect(result.found).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('should handle timeout errors', async () => {
      mockGMXmlHttpRequest(null, { shouldTimeout: true })

      const result = await service.queryByTitle('Test Paper')

      expect(result.found).toBe(false)
      expect(result.timedOut).toBe(true)
      expect(result.error).toContain('timeout')
    })

    it('should handle non-200 status codes', async () => {
      mockGMXmlHttpRequest({}, { status: 500 })

      const result = await service.queryByTitle('Test Paper')

      expect(result.found).toBe(false)
      expect(result.error).toContain('500')
    })

    it('should handle invalid JSON response', async () => {
      globalThis.GM_xmlhttpRequest = vi.fn((details) => {
        setTimeout(() => {
          if (details.onload) {
            details.onload({
              responseText: 'not valid json',
              status: 200,
            })
          }
        }, 0)
        return { abort: vi.fn() }
      }) as typeof GM_xmlhttpRequest

      const result = await service.queryByTitle('Test Paper')

      expect(result.found).toBe(false)
      expect(result.error).toContain('parse')
    })

    it('should handle rate limiting (429 status)', async () => {
      mockGMXmlHttpRequest({}, { status: 429 })

      const result = await service.queryByTitle('Test Paper')

      expect(result.found).toBe(false)
      expect(result.error).toContain('429')
    })
  })

  describe('queryBatch', () => {
    it('should query multiple titles', async () => {
      const mockResponse = createMockDblpResponse([
        { title: 'Paper 1', venue: 'CVPR', year: '2023' },
      ])
      mockGMXmlHttpRequest(mockResponse)

      const results = await service.queryBatch(['Paper 1', 'Paper 2'], 10)

      expect(results.size).toBe(2)
      expect(results.has('Paper 1')).toBe(true)
      expect(results.has('Paper 2')).toBe(true)
    })

    it('should use cache for repeated titles in batch', async () => {
      const mockResponse = createMockDblpResponse([
        { title: 'Same Paper', venue: 'ICML', year: '2022' },
      ])
      mockGMXmlHttpRequest(mockResponse)

      const results = await service.queryBatch(['Same Paper', 'Same Paper'], 10)

      // Map stores unique keys, so size is 1 for duplicate titles
      expect(results.size).toBe(1)
      expect(results.get('Same Paper')?.venue).toBe('ICML')
      // Should only make one API call due to caching
      expect(GM_xmlhttpRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('Configuration', () => {
    it('should use default timeout', () => {
      expect(DBLP_TIMEOUT).toBe(10000) // 10 seconds
    })

    it('should allow custom timeout', async () => {
      const customService = new DblpService(cacheManager, 5000)
      const mockResponse = createMockDblpResponse([
        { title: 'Test', venue: 'CVPR', year: '2023' },
      ])
      mockGMXmlHttpRequest(mockResponse)

      const result = await customService.queryByTitle('Test')
      expect(result.found).toBe(true)
    })
  })

  describe('clearCache', () => {
    it('should clear all cached results', async () => {
      const mockResponse = createMockDblpResponse([
        { title: 'Cached Paper', venue: 'CVPR', year: '2023' },
      ])
      mockGMXmlHttpRequest(mockResponse)

      // Cache a result
      await service.queryByTitle('Cached Paper')
      expect(GM_xmlhttpRequest).toHaveBeenCalledTimes(1)

      // Clear cache
      service.clearCache()

      // Query again - should make new request
      await service.queryByTitle('Cached Paper')
      expect(GM_xmlhttpRequest).toHaveBeenCalledTimes(2)
    })
  })
})
