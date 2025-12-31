/**
 * Property-Based Tests for ArxivAdapter
 * 
 * Tests correctness properties for arXiv comments parsing using fast-check.
 * 
 * Feature: ccf-rank-userscript
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { ArxivAdapter } from '../../src/adapters/arxiv-adapter'

describe('ArxivAdapter Property Tests', () => {
  const adapter = new ArxivAdapter()

  /**
   * Known venue abbreviations that should be recognized
   */
  const KNOWN_VENUES = [
    // AI/ML conferences
    'CVPR', 'ICCV', 'ECCV', 'NEURIPS', 'NIPS', 'ICML', 'ICLR', 'AAAI', 'IJCAI',
    'ACL', 'EMNLP', 'NAACL', 'COLING', 'KDD', 'WWW', 'WSDM', 'SIGIR', 'CIKM',
    // Systems conferences
    'OSDI', 'SOSP', 'NSDI', 'SIGCOMM', 'MOBICOM', 'INFOCOM', 'IMC',
    // Security conferences
    'CCS', 'USENIX', 'NDSS',
    // SE/PL conferences
    'ICSE', 'FSE', 'ASE', 'ISSTA', 'PLDI', 'POPL', 'OOPSLA',
    // Database conferences
    'SIGMOD', 'VLDB', 'ICDE', 'PODS',
    // Graphics/HCI conferences
    'SIGGRAPH', 'CHI', 'UIST',
    // Theory conferences
    'STOC', 'FOCS', 'SODA',
    // Journals
    'TPAMI', 'TIP', 'TNNLS', 'TKDE', 'TOG', 'TOCHI', 'TSE', 'TOSEM',
    'JMLR', 'TACL',
  ]

  /**
   * Common comment patterns found in arXiv papers
   */
  const COMMENT_PATTERNS = [
    (venue: string, year: number) => `Accepted to ${venue} ${year}`,
    (venue: string, year: number) => `Accepted at ${venue} ${year}`,
    (venue: string, year: number) => `Accepted by ${venue} ${year}`,
    (venue: string, year: number) => `Published in ${venue} ${year}`,
    (venue: string, year: number) => `To appear in ${venue} ${year}`,
    (venue: string, year: number) => `Appears in ${venue} ${year}`,
    (venue: string, year: number) => `Presented at ${venue} ${year}`,
    (venue: string, year: number) => `${venue} ${year}`,
    (venue: string, year: number) => `${venue}'${year.toString().slice(-2)}`,
    (venue: string, year: number) => `(${venue} ${year})`,
    (venue: string, year: number) => `IEEE ${venue} ${year}`,
    (venue: string, year: number) => `ACM ${venue} ${year}`,
    (venue: string, _year: number) => `Accepted to ${venue}`,
    (venue: string, _year: number) => `Published in ${venue}`,
  ]

  /**
   * Property 8: Comments解析覆盖率
   * 
   * For any arXiv comments string containing a known conference/journal name
   * (e.g., "Accepted to CVPR 2024", "Published in NeurIPS"), the parsing function
   * should correctly extract the venue name.
   * 
   * **Validates: Requirements 2.1**
   */
  describe('Property 8: Comments解析覆盖率', () => {
    // Arbitrary for generating known venues
    const knownVenueArb = fc.constantFrom(...KNOWN_VENUES)
    
    // Arbitrary for generating years
    const yearArb = fc.integer({ min: 2015, max: 2025 })
    
    // Arbitrary for generating comment patterns
    const patternIndexArb = fc.integer({ min: 0, max: COMMENT_PATTERNS.length - 1 })

    it('should extract venue from comments with known venue names', () => {
      fc.assert(
        fc.property(
          fc.tuple(knownVenueArb, yearArb, patternIndexArb),
          ([venue, year, patternIndex]) => {
            const pattern = COMMENT_PATTERNS[patternIndex]
            const comment = pattern(venue, year)
            
            const extracted = adapter.parseVenueFromComments(comment)
            
            // Should extract something
            expect(extracted).not.toBeNull()
            
            // The extracted venue should contain the original venue abbreviation
            // (case-insensitive comparison)
            const extractedUpper = extracted!.toUpperCase()
            const venueUpper = venue.toUpperCase()
            
            expect(extractedUpper).toContain(venueUpper)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle case variations in venue names', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            knownVenueArb,
            yearArb,
            fc.constantFrom('lower', 'upper', 'mixed')
          ),
          ([venue, year, caseType]) => {
            // Apply case transformation
            let transformedVenue: string
            switch (caseType) {
              case 'lower':
                transformedVenue = venue.toLowerCase()
                break
              case 'upper':
                transformedVenue = venue.toUpperCase()
                break
              case 'mixed':
                transformedVenue = venue.split('').map((c, i) => 
                  i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
                ).join('')
                break
              default:
                transformedVenue = venue
            }
            
            const comment = `Accepted to ${transformedVenue} ${year}`
            const extracted = adapter.parseVenueFromComments(comment)
            
            // Should still extract the venue
            expect(extracted).not.toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should extract venue from comments with additional text', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            knownVenueArb,
            yearArb,
            fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '), { minLength: 5, maxLength: 30 })
          ),
          ([venue, year, additionalText]) => {
            // Create comment with additional text before and after
            const comment = `${additionalText.trim()}. Accepted to ${venue} ${year}. ${additionalText.trim()}`
            
            const extracted = adapter.parseVenueFromComments(comment)
            
            // Should extract the venue
            expect(extracted).not.toBeNull()
            expect(extracted!.toUpperCase()).toContain(venue.toUpperCase())
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return null for comments without venue information', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 ,.'), { minLength: 10, maxLength: 100 }),
          (randomText) => {
            // Ensure the random text doesn't accidentally contain a known venue
            const hasKnownVenue = KNOWN_VENUES.some(v => 
              randomText.toUpperCase().includes(v)
            )
            
            if (!hasKnownVenue) {
              const extracted = adapter.parseVenueFromComments(randomText)
              // Should return null for text without venue
              expect(extracted).toBeNull()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty and whitespace-only comments', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', '\t', '\n', '  \t  \n  '),
          (emptyComment) => {
            const extracted = adapter.parseVenueFromComments(emptyComment)
            expect(extracted).toBeNull()
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should extract venue from parenthetical patterns', () => {
      fc.assert(
        fc.property(
          fc.tuple(knownVenueArb, yearArb),
          ([venue, year]) => {
            const comment = `10 pages, 5 figures (${venue} ${year})`
            
            const extracted = adapter.parseVenueFromComments(comment)
            
            expect(extracted).not.toBeNull()
            expect(extracted!.toUpperCase()).toContain(venue.toUpperCase())
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
