/**
 * Property-Based Tests for VenueMatcher
 * 
 * Tests correctness properties using fast-check for randomized input generation.
 * 
 * Feature: ccf-rank-userscript
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { VenueMatcher } from '../../src/core/venue-matcher'
import { getCCFCatalog } from '../../src/core/ccf-catalog'

describe('VenueMatcher Property Tests', () => {
  const matcher = new VenueMatcher()
  const catalog = getCCFCatalog()
  const allEntries = catalog.getAllEntries()

  // Find entries where abbreviation lookup returns the same entry
  // This filters out entries with duplicate abbreviations where the lookup
  // returns a different entry (due to CCFCatalog storing first occurrence in lookupIndex)
  const entriesWithConsistentAbbr = allEntries.filter(e => {
    const lookedUp = catalog.findByKey(e.abbr)
    return lookedUp && lookedUp.name === e.name
  })

  /**
   * Property 1: Venue字符串清理一致性
   * 
   * For any venue string, cleanVenue should:
   * 1. Remove all years (2024, '23, etc.)
   * 2. Remove volume numbers (vol.X)
   * 3. Remove page numbers (pp.X-Y)
   * 4. Remove issue numbers (no.X)
   * 5. Be idempotent (multiple cleanings yield same result)
   * 
   * **Validates: Requirements 2.5**
   */
  describe('Property 1: Venue字符串清理一致性', () => {
    // Arbitrary for generating venue-like strings with noise
    const venueWithNoiseArb = fc.record({
      baseName: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '), { minLength: 1, maxLength: 50 }),
      year: fc.option(fc.integer({ min: 1990, max: 2030 }), { nil: undefined }),
      shortYear: fc.option(fc.integer({ min: 0, max: 99 }), { nil: undefined }),
      volume: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
      issue: fc.option(fc.integer({ min: 1, max: 12 }), { nil: undefined }),
      pageStart: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
      pageEnd: fc.option(fc.integer({ min: 1001, max: 2000 }), { nil: undefined }),
    }).map(({ baseName, year, shortYear, volume, issue, pageStart, pageEnd }) => {
      let venue = baseName.trim() || 'Conference'
      if (year !== undefined) venue += ` ${year}`
      if (shortYear !== undefined) venue += ` '${shortYear.toString().padStart(2, '0')}`
      if (volume !== undefined) venue += ` vol. ${volume}`
      if (issue !== undefined) venue += ` no. ${issue}`
      if (pageStart !== undefined && pageEnd !== undefined) venue += ` pp. ${pageStart}-${pageEnd}`
      return venue
    })

    it('should be idempotent - cleaning twice equals cleaning once', () => {
      fc.assert(
        fc.property(venueWithNoiseArb, (venue) => {
          const cleanedOnce = matcher.cleanVenue(venue)
          const cleanedTwice = matcher.cleanVenue(cleanedOnce)
          expect(cleanedTwice).toBe(cleanedOnce)
        }),
        { numRuns: 100 }
      )
    })

    it('should remove year patterns from venue strings', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '), { minLength: 1, maxLength: 30 }),
            fc.integer({ min: 1990, max: 2030 })
          ),
          ([baseName, year]) => {
            const venue = `${baseName.trim() || 'Conf'} ${year}`
            const cleaned = matcher.cleanVenue(venue)
            // Should not contain the year
            expect(cleaned).not.toMatch(new RegExp(`\\b${year}\\b`))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remove volume patterns from venue strings', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '), { minLength: 1, maxLength: 30 }),
            fc.integer({ min: 1, max: 100 }),
            fc.constantFrom('vol.', 'Vol.', 'volume', 'Volume')
          ),
          ([baseName, volNum, volPrefix]) => {
            const venue = `${baseName.trim() || 'Journal'} ${volPrefix} ${volNum}`
            const cleaned = matcher.cleanVenue(venue)
            // Should not contain volume pattern
            expect(cleaned.toLowerCase()).not.toMatch(/\bvol\.?\s*\d+\b/)
            expect(cleaned.toLowerCase()).not.toMatch(/\bvolume\s*\d+\b/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remove page patterns from venue strings', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '), { minLength: 1, maxLength: 30 }),
            fc.integer({ min: 1, max: 500 }),
            fc.integer({ min: 501, max: 1000 }),
            fc.constantFrom('pp.', 'pp', 'pages', 'p.')
          ),
          ([baseName, pageStart, pageEnd, pagePrefix]) => {
            const venue = `${baseName.trim() || 'Conf'} ${pagePrefix} ${pageStart}-${pageEnd}`
            const cleaned = matcher.cleanVenue(venue)
            // Should not contain page pattern
            expect(cleaned.toLowerCase()).not.toMatch(/\bpp?\.?\s*\d+/)
            expect(cleaned.toLowerCase()).not.toMatch(/\bpages?\s*\d+/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remove issue/number patterns from venue strings', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '), { minLength: 1, maxLength: 30 }),
            fc.integer({ min: 1, max: 12 }),
            fc.constantFrom('no.', 'No.', 'number', 'issue', 'iss.')
          ),
          ([baseName, issueNum, issuePrefix]) => {
            const venue = `${baseName.trim() || 'Journal'} ${issuePrefix} ${issueNum}`
            const cleaned = matcher.cleanVenue(venue)
            // Should not contain issue pattern
            expect(cleaned.toLowerCase()).not.toMatch(/\bno\.?\s*\d+\b/)
            expect(cleaned.toLowerCase()).not.toMatch(/\bnumber\s*\d+\b/)
            expect(cleaned.toLowerCase()).not.toMatch(/\bissue\s*\d+\b/)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 2: CCF等级匹配正确性
   * 
   * For any CCF catalog entry, matching by its abbreviation, full name, or any alias
   * should return the correct CCF rank.
   * 
   * Note: Tests that match by abbreviation use entries with unique abbreviations
   * to avoid conflicts (e.g., TAC, FSE have multiple entries with different ranks).
   * 
   * **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**
   */
  describe('Property 2: CCF等级匹配正确性', () => {
    // Use entries with consistent abbreviation lookup for abbreviation-based tests
    const consistentAbbrEntryArb = fc.constantFrom(...entriesWithConsistentAbbr)
    // Use all entries for full name tests (full names are unique)
    const ccfEntryArb = fc.constantFrom(...allEntries)

    it('should correctly match by abbreviation and return correct rank', () => {
      fc.assert(
        fc.property(consistentAbbrEntryArb, (entry) => {
          const result = matcher.match(entry.abbr)
          expect(result.matched).toBe(true)
          expect(result.entry).not.toBeNull()
          expect(result.entry!.rank).toBe(entry.rank)
          expect(result.entry!.abbr).toBe(entry.abbr)
        }),
        { numRuns: 100 }
      )
    })

    it('should correctly match by full name and return correct rank', () => {
      fc.assert(
        fc.property(ccfEntryArb, (entry) => {
          const result = matcher.match(entry.name)
          expect(result.matched).toBe(true)
          expect(result.entry).not.toBeNull()
          expect(result.entry!.rank).toBe(entry.rank)
          expect(result.entry!.abbr).toBe(entry.abbr)
        }),
        { numRuns: 100 }
      )
    })

    it('should correctly match by any alias and return correct rank', () => {
      // Filter entries that have aliases
      const entriesWithAliases = allEntries.filter(e => e.aliases.length > 0)
      if (entriesWithAliases.length === 0) {
        // Skip if no entries have aliases
        return
      }

      const entryWithAliasArb = fc.constantFrom(...entriesWithAliases)

      fc.assert(
        fc.property(entryWithAliasArb, (entry) => {
          // Test each alias
          for (const alias of entry.aliases) {
            const result = matcher.match(alias)
            expect(result.matched).toBe(true)
            expect(result.entry).not.toBeNull()
            expect(result.entry!.rank).toBe(entry.rank)
            expect(result.entry!.abbr).toBe(entry.abbr)
          }
        }),
        { numRuns: 50 }
      )
    })

    it('should match venue with noise (year, volume) and return correct rank', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            consistentAbbrEntryArb,
            fc.integer({ min: 2000, max: 2025 }),
            fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined })
          ),
          ([entry, year, volume]) => {
            // Create venue with noise
            let venue = entry.abbr
            venue += ` ${year}`
            if (volume !== undefined) {
              venue += ` vol. ${volume}`
            }

            const result = matcher.match(venue)
            // Should still match (either exact, cleaned, or partial)
            expect(result.matched).toBe(true)
            expect(result.entry).not.toBeNull()
            expect(result.entry!.rank).toBe(entry.rank)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 3: 匹配大小写不敏感
   * 
   * For any venue string, regardless of case variations (uppercase, lowercase, mixed),
   * the matching result should be the same.
   * 
   * **Validates: Requirements 3.2**
   */
  describe('Property 3: 匹配大小写不敏感', () => {
    const ccfEntryArb = fc.constantFrom(...allEntries)
    const consistentAbbrEntryArb = fc.constantFrom(...entriesWithConsistentAbbr)

    it('should return same match result regardless of abbreviation case', () => {
      fc.assert(
        fc.property(ccfEntryArb, (entry) => {
          const lowerResult = matcher.match(entry.abbr.toLowerCase())
          const upperResult = matcher.match(entry.abbr.toUpperCase())
          const mixedResult = matcher.match(
            entry.abbr.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('')
          )

          // All should match
          expect(lowerResult.matched).toBe(true)
          expect(upperResult.matched).toBe(true)
          expect(mixedResult.matched).toBe(true)

          // All should return the same entry (by abbreviation)
          expect(lowerResult.entry?.abbr).toBe(upperResult.entry?.abbr)
          expect(upperResult.entry?.abbr).toBe(mixedResult.entry?.abbr)
        }),
        { numRuns: 100 }
      )
    })

    it('should return same match result regardless of full name case', () => {
      fc.assert(
        fc.property(ccfEntryArb, (entry) => {
          const lowerResult = matcher.match(entry.name.toLowerCase())
          const upperResult = matcher.match(entry.name.toUpperCase())

          // All should match
          expect(lowerResult.matched).toBe(true)
          expect(upperResult.matched).toBe(true)

          // All should return the same entry (by abbreviation)
          expect(lowerResult.entry?.abbr).toBe(upperResult.entry?.abbr)
        }),
        { numRuns: 100 }
      )
    })

    it('should return same rank regardless of venue case variations', () => {
      fc.assert(
        fc.property(consistentAbbrEntryArb, (entry) => {
          const variations = [
            entry.abbr.toLowerCase(),
            entry.abbr.toUpperCase(),
            entry.name.toLowerCase(),
            entry.name.toUpperCase(),
          ]

          const results = variations.map(v => matcher.match(v))
          
          // All should match
          for (const result of results) {
            expect(result.matched).toBe(true)
          }

          // All should return the same rank
          const ranks = results.map(r => r.entry?.rank)
          const uniqueRanks = [...new Set(ranks)]
          expect(uniqueRanks.length).toBe(1)
        }),
        { numRuns: 100 }
      )
    })
  })
})
