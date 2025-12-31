/**
 * Venue Matcher Module
 * 
 * Provides venue string matching against CCF catalog with multi-level matching strategy.
 * Supports exact match, cleaned match, partial match, and acronym match.
 * 
 * Requirements: 2.5, 3.2, 3.3, 3.4, 3.5
 */

import { CCFCatalog, CCFEntry, getCCFCatalog } from './ccf-catalog'

/**
 * Match confidence levels in order of priority
 */
export type MatchConfidence = 'exact' | 'cleaned' | 'partial' | 'acronym' | 'none'

/**
 * Result of a venue matching operation
 */
export interface MatchResult {
  /** Whether a match was found */
  matched: boolean
  /** The matched CCF entry, or null if not found */
  entry: CCFEntry | null
  /** Confidence level of the match */
  confidence: MatchConfidence
  /** Original venue string before processing */
  originalVenue: string
  /** Venue string after cleaning */
  cleanedVenue: string
}

/**
 * Patterns for cleaning venue strings
 */
const CLEAN_PATTERNS = {
  // Year patterns: 2024, '24, (2024), etc.
  year: /\b(19|20)\d{2}\b|'\d{2}\b/g,
  // Volume patterns: vol. 1, volume 12, v.1
  volume: /\b(vol\.?|volume)\s*\d+\b/gi,
  // Issue/Number patterns: no. 1, issue 12, iss. 1
  issue: /\b(no\.?|number|issue|iss\.?)\s*\d+\b/gi,
  // Page patterns: pp. 1-10, pages 100-200, p. 50
  pages: /\b(pp?\.?|pages?)\s*\d+(-\d+)?\b/gi,
  // Edition patterns: 1st, 2nd, 3rd, 4th, etc.
  edition: /\b\d+(st|nd|rd|th)\s*(edition|ed\.?)?\b/gi,
  // Proceedings prefix
  proceedings: /^proceedings\s+(of\s+)?(the\s+)?/gi,
  // Common suffixes
  suffixes: /\s*[-–—]\s*(proceedings|workshop|symposium|conference)?\s*$/gi,
  // Parenthetical content (often contains year or location)
  parenthetical: /\([^)]*\)/g,
  // Multiple spaces
  multipleSpaces: /\s+/g,
  // Leading/trailing punctuation
  punctuation: /^[\s,.:;-]+|[\s,.:;-]+$/g,
}

/**
 * VenueMatcher class for matching venue strings to CCF catalog entries
 */
export class VenueMatcher {
  private catalog: CCFCatalog

  constructor(catalog?: CCFCatalog) {
    this.catalog = catalog || getCCFCatalog()
  }

  /**
   * Clean a venue string by removing year, volume, page numbers, etc.
   * This operation is idempotent - multiple applications yield the same result.
   * 
   * @param venue - The raw venue string
   * @returns Cleaned venue string
   */
  cleanVenue(venue: string): string {
    if (!venue) return ''

    let cleaned = venue
      // Remove parenthetical content first (often contains year/location)
      .replace(CLEAN_PATTERNS.parenthetical, ' ')
      // Remove year patterns
      .replace(CLEAN_PATTERNS.year, ' ')
      // Remove volume patterns
      .replace(CLEAN_PATTERNS.volume, ' ')
      // Remove issue patterns
      .replace(CLEAN_PATTERNS.issue, ' ')
      // Remove page patterns
      .replace(CLEAN_PATTERNS.pages, ' ')
      // Remove edition patterns
      .replace(CLEAN_PATTERNS.edition, ' ')
      // Remove proceedings prefix
      .replace(CLEAN_PATTERNS.proceedings, '')
      // Remove common suffixes
      .replace(CLEAN_PATTERNS.suffixes, '')
      // Normalize spaces
      .replace(CLEAN_PATTERNS.multipleSpaces, ' ')
      // Trim punctuation
      .replace(CLEAN_PATTERNS.punctuation, '')

    return cleaned.trim()
  }

  /**
   * Generate an acronym from a venue name by taking first letters of significant words.
   * 
   * @param venue - The venue name
   * @returns Generated acronym
   */
  generateAcronym(venue: string): string {
    if (!venue) return ''

    // Words to skip when generating acronym
    const skipWords = new Set([
      'a', 'an', 'the', 'of', 'on', 'in', 'for', 'and', 'or', 'to', 'with',
      'proceedings', 'international', 'annual', 'conference', 'symposium',
      'workshop', 'journal', 'transactions', 'ieee', 'acm'
    ])

    const words = venue
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0 && !skipWords.has(word))

    // Take first letter of each significant word
    return words
      .map(word => word[0])
      .join('')
      .toUpperCase()
  }

  /**
   * Match a venue string against the CCF catalog using multi-level strategy.
   * 
   * Matching order (Requirements 3.2, 3.3, 3.4, 3.5):
   * 1. Exact match (case-insensitive)
   * 2. Cleaned string match
   * 3. Partial match (venue contains known abbreviation)
   * 4. Acronym match
   * 
   * @param venue - The venue string to match
   * @returns MatchResult with match details
   */
  match(venue: string): MatchResult {
    const originalVenue = venue
    const cleanedVenue = this.cleanVenue(venue)

    // Base result for no match
    const noMatch: MatchResult = {
      matched: false,
      entry: null,
      confidence: 'none',
      originalVenue,
      cleanedVenue,
    }

    if (!venue || !venue.trim()) {
      return noMatch
    }

    // Strategy 1: Exact match (case-insensitive) - Requirement 3.2
    const exactEntry = this.catalog.findByKey(venue.trim())
    if (exactEntry) {
      return {
        matched: true,
        entry: exactEntry,
        confidence: 'exact',
        originalVenue,
        cleanedVenue,
      }
    }

    // Strategy 2: Cleaned string match - Requirement 3.3
    if (cleanedVenue && cleanedVenue !== venue.trim().toLowerCase()) {
      const cleanedEntry = this.catalog.findByKey(cleanedVenue)
      if (cleanedEntry) {
        return {
          matched: true,
          entry: cleanedEntry,
          confidence: 'cleaned',
          originalVenue,
          cleanedVenue,
        }
      }
    }

    // Strategy 3: Partial match - Requirement 3.4
    // Check if venue contains any known abbreviation
    const partialEntry = this.findPartialMatch(venue)
    if (partialEntry) {
      return {
        matched: true,
        entry: partialEntry,
        confidence: 'partial',
        originalVenue,
        cleanedVenue,
      }
    }

    // Strategy 4: Acronym match - Requirement 3.5
    const acronym = this.generateAcronym(cleanedVenue || venue)
    if (acronym && acronym.length >= 2) {
      const acronymEntry = this.catalog.findByKey(acronym)
      if (acronymEntry) {
        return {
          matched: true,
          entry: acronymEntry,
          confidence: 'acronym',
          originalVenue,
          cleanedVenue,
        }
      }
    }

    return noMatch
  }

  /**
   * Find a partial match by checking if the venue contains any known abbreviation.
   * 
   * @param venue - The venue string to search
   * @returns Matched CCFEntry or null
   */
  private findPartialMatch(venue: string): CCFEntry | null {
    const normalizedVenue = venue.toLowerCase()
    const allEntries = this.catalog.getAllEntries()

    // Sort by abbreviation length (longer first) to prefer more specific matches
    const sortedEntries = [...allEntries].sort(
      (a, b) => b.abbr.length - a.abbr.length
    )

    for (const entry of sortedEntries) {
      // Check if venue contains the abbreviation as a word boundary
      const abbrLower = entry.abbr.toLowerCase()
      const abbrPattern = new RegExp(`\\b${this.escapeRegex(abbrLower)}\\b`, 'i')
      
      if (abbrPattern.test(normalizedVenue)) {
        return entry
      }

      // Also check aliases
      for (const alias of entry.aliases) {
        const aliasLower = alias.toLowerCase()
        if (aliasLower.length >= 3) { // Only check aliases with 3+ chars
          const aliasPattern = new RegExp(`\\b${this.escapeRegex(aliasLower)}\\b`, 'i')
          if (aliasPattern.test(normalizedVenue)) {
            return entry
          }
        }
      }
    }

    return null
  }

  /**
   * Escape special regex characters in a string.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

// Singleton instance
let matcherInstance: VenueMatcher | null = null

/**
 * Get the singleton VenueMatcher instance
 */
export function getVenueMatcher(): VenueMatcher {
  if (!matcherInstance) {
    matcherInstance = new VenueMatcher()
  }
  return matcherInstance
}

export default getVenueMatcher
