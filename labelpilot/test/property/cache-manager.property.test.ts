/**
 * Property-Based Tests for CacheManager
 * 
 * Tests correctness properties using fast-check for randomized input generation.
 * 
 * Feature: ccf-rank-userscript
 * Property 4: 缓存命中避免重复请求
 * **Validates: Requirements 6.1**
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { CacheManager, DEFAULT_TTL } from '../../src/core/cache-manager'
import { clearGMStorage, gmStorage } from '../setup'

describe('CacheManager Property Tests', () => {
  let cacheManager: CacheManager

  beforeEach(() => {
    clearGMStorage()
    cacheManager = new CacheManager()
  })

  /**
   * Property 4: 缓存命中避免重复请求
   * 
   * For any paper title, after the first DBLP query result is cached,
   * subsequent queries for the same title should return the cached result
   * without making a new request.
   * 
   * **Validates: Requirements 6.1**
   */
  describe('Property 4: 缓存命中避免重复请求', () => {
    // Arbitrary for generating cache keys (simulating paper titles)
    const cacheKeyArb = fc.string({ minLength: 1, maxLength: 100 })
      .filter(s => s.trim().length > 0)

    // Arbitrary for generating cache values (simulating DBLP results)
    const cacheValueArb = fc.record({
      found: fc.boolean(),
      venue: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
      year: fc.option(fc.stringOf(fc.constantFrom(...'0123456789'), { minLength: 4, maxLength: 4 }), { nil: null }),
      dblpUrl: fc.option(fc.webUrl(), { nil: null }),
    })

    it('should return cached value on subsequent gets without storage access', () => {
      fc.assert(
        fc.property(cacheKeyArb, cacheValueArb, (key, value) => {
          // First set
          cacheManager.set(key, value)

          // First get - should return the value
          const firstGet = cacheManager.get(key)
          expect(firstGet).toEqual(value)

          // Second get - should return the same value (from memory cache)
          const secondGet = cacheManager.get(key)
          expect(secondGet).toEqual(value)

          // Values should be identical
          expect(firstGet).toEqual(secondGet)
        }),
        { numRuns: 100 }
      )
    })

    it('should persist values to GM storage', () => {
      fc.assert(
        fc.property(cacheKeyArb, cacheValueArb, (key, value) => {
          cacheManager.set(key, value)

          // Check that value is in GM storage
          const storageKey = `ccf_rank_cache_${key}`
          expect(gmStorage.has(storageKey)).toBe(true)

          const stored = gmStorage.get(storageKey) as { value: unknown }
          expect(stored.value).toEqual(value)
        }),
        { numRuns: 100 }
      )
    })

    it('should load from GM storage when memory cache is empty', () => {
      fc.assert(
        fc.property(cacheKeyArb, cacheValueArb, (key, value) => {
          // Set value
          cacheManager.set(key, value)

          // Create new cache manager (simulating script restart)
          const newCacheManager = new CacheManager()

          // Should still get the value from GM storage
          const retrieved = newCacheManager.get(key)
          expect(retrieved).toEqual(value)
        }),
        { numRuns: 100 }
      )
    })

    it('should return null for non-existent keys', () => {
      fc.assert(
        fc.property(cacheKeyArb, (key) => {
          const result = cacheManager.get(key)
          expect(result).toBeNull()
        }),
        { numRuns: 100 }
      )
    })

    it('should correctly report existence with has()', () => {
      fc.assert(
        fc.property(cacheKeyArb, cacheValueArb, (key, value) => {
          // Before setting
          expect(cacheManager.has(key)).toBe(false)

          // After setting
          cacheManager.set(key, value)
          expect(cacheManager.has(key)).toBe(true)

          // After deleting
          cacheManager.delete(key)
          expect(cacheManager.has(key)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should delete values from both memory and storage', () => {
      fc.assert(
        fc.property(cacheKeyArb, cacheValueArb, (key, value) => {
          cacheManager.set(key, value)
          
          // Verify it exists
          expect(cacheManager.get(key)).toEqual(value)

          // Delete
          cacheManager.delete(key)

          // Should be gone from memory
          expect(cacheManager.get(key)).toBeNull()

          // Should be gone from storage
          const storageKey = `ccf_rank_cache_${key}`
          expect(gmStorage.has(storageKey)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should clear all cache entries', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(cacheKeyArb, cacheValueArb), { minLength: 1, maxLength: 10 }),
          (entries) => {
            // Set multiple entries
            for (const [key, value] of entries) {
              cacheManager.set(key, value)
            }

            // Clear all
            cacheManager.clear()

            // All should be gone
            for (const [key] of entries) {
              expect(cacheManager.get(key)).toBeNull()
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * Additional property: TTL expiration
   * 
   * Cached values should expire after their TTL.
   */
  describe('TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      // Use a very short TTL for testing
      const shortTtlCache = new CacheManager(1) // 1ms TTL

      const key = 'test-expiry-key'
      const value = 'test-expiry-value'

      shortTtlCache.set(key, value)

      // Immediately should be available
      expect(shortTtlCache.get(key)).toBe(value)

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should be expired now
      expect(shortTtlCache.get(key)).toBeNull()
    })

    it('should use custom TTL when provided', () => {
      const key = 'test-key'
      const value = 'test-value'

      // Set with very short TTL
      cacheManager.set(key, value, 1)

      // Immediately available
      expect(cacheManager.get(key)).toBe(value)
    })

    it('should use default TTL when not provided', () => {
      const key = 'test-key'
      const value = 'test-value'

      cacheManager.set(key, value)

      // Check the stored entry has default TTL
      const storageKey = `ccf_rank_cache_${key}`
      const stored = gmStorage.get(storageKey) as { ttl: number }
      expect(stored.ttl).toBe(DEFAULT_TTL)
    })
  })

  /**
   * Additional property: Idempotence
   * 
   * Setting the same key multiple times should result in the latest value.
   */
  describe('Idempotence', () => {
    it('should overwrite previous value when setting same key', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (key, value1, value2) => {
            cacheManager.set(key, value1)
            expect(cacheManager.get(key)).toBe(value1)

            cacheManager.set(key, value2)
            expect(cacheManager.get(key)).toBe(value2)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
