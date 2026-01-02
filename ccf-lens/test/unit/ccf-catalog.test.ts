/**
 * CCFCatalog Unit Tests
 * 
 * Tests for the CCF catalog data integrity and query functionality.
 * Requirements: 3.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CCFCatalog, getCCFCatalog, resetCCFCatalog } from '../../src/core/ccf-catalog'

describe('CCFCatalog', () => {
  let catalog: CCFCatalog

  beforeEach(() => {
    resetCCFCatalog()
    catalog = new CCFCatalog()
  })

  afterEach(() => {
    resetCCFCatalog()
  })

  describe('Data Integrity', () => {
    it('should load catalog data successfully', () => {
      expect(catalog.size).toBeGreaterThan(0)
    })

    it('should contain A-class entries', () => {
      const aClass = catalog.getByRank('A')
      expect(aClass.length).toBeGreaterThan(0)
    })

    it('should contain B-class entries', () => {
      const bClass = catalog.getByRank('B')
      expect(bClass.length).toBeGreaterThan(0)
    })

    it('should contain both journals and conferences', () => {
      const journals = catalog.getByType('journal')
      const conferences = catalog.getByType('conference')
      expect(journals.length).toBeGreaterThan(0)
      expect(conferences.length).toBeGreaterThan(0)
    })

    it('should have valid entry structure for all entries', () => {
      const entries = catalog.getAllEntries()
      for (const entry of entries) {
        expect(entry.name).toBeTruthy()
        expect(entry.abbr).toBeTruthy()
        expect(['A', 'B', 'C']).toContain(entry.rank)
        expect(['journal', 'conference']).toContain(entry.type)
        expect(entry.category).toBeTruthy()
        expect(Array.isArray(entry.aliases)).toBe(true)
      }
    })
  })


  describe('findByKey', () => {
    it('should find entry by abbreviation', () => {
      const entry = catalog.findByKey('CVPR')
      expect(entry).not.toBeNull()
      expect(entry?.rank).toBe('A')
    })

    it('should find entry by abbreviation (case-insensitive)', () => {
      const entry1 = catalog.findByKey('cvpr')
      const entry2 = catalog.findByKey('CVPR')
      const entry3 = catalog.findByKey('Cvpr')
      expect(entry1).toEqual(entry2)
      expect(entry2).toEqual(entry3)
    })

    it('should find entry by full name', () => {
      const entry = catalog.findByKey('IEEE/CVF Conference on Computer Vision and Pattern Recognition')
      expect(entry).not.toBeNull()
      expect(entry?.abbr).toBe('CVPR')
    })

    it('should find entry by alias', () => {
      const entry = catalog.findByKey('nips')
      expect(entry).not.toBeNull()
      expect(entry?.abbr).toBe('NeurIPS')
    })

    it('should return null for unknown key', () => {
      const entry = catalog.findByKey('UNKNOWN_VENUE_XYZ')
      expect(entry).toBeNull()
    })

    it('should return null for empty key', () => {
      expect(catalog.findByKey('')).toBeNull()
    })

    it('should handle whitespace in key', () => {
      const entry = catalog.findByKey('  CVPR  ')
      expect(entry).not.toBeNull()
      expect(entry?.abbr).toBe('CVPR')
    })
  })

  describe('getByRank', () => {
    it('should return only A-class entries when filtering by A', () => {
      const entries = catalog.getByRank('A')
      expect(entries.every(e => e.rank === 'A')).toBe(true)
    })

    it('should return only B-class entries when filtering by B', () => {
      const entries = catalog.getByRank('B')
      expect(entries.every(e => e.rank === 'B')).toBe(true)
    })
  })


  describe('getByType', () => {
    it('should return only journals when filtering by journal', () => {
      const entries = catalog.getByType('journal')
      expect(entries.every(e => e.type === 'journal')).toBe(true)
    })

    it('should return only conferences when filtering by conference', () => {
      const entries = catalog.getByType('conference')
      expect(entries.every(e => e.type === 'conference')).toBe(true)
    })
  })

  describe('has', () => {
    it('should return true for existing key', () => {
      expect(catalog.has('CVPR')).toBe(true)
    })

    it('should return false for non-existing key', () => {
      expect(catalog.has('UNKNOWN_XYZ')).toBe(false)
    })
  })

  describe('Known Venues', () => {
    const knownAClassVenues = [
      { abbr: 'CVPR', type: 'conference' },
      { abbr: 'ICCV', type: 'conference' },
      { abbr: 'NeurIPS', type: 'conference' },
      { abbr: 'ICML', type: 'conference' },
      { abbr: 'AAAI', type: 'conference' },
      { abbr: 'ACL', type: 'conference' },
      { abbr: 'IJCAI', type: 'conference' },
      { abbr: 'SIGMOD', type: 'conference' },
      { abbr: 'VLDB', type: 'conference' },
      { abbr: 'KDD', type: 'conference' },
      { abbr: 'ICSE', type: 'conference' },
      { abbr: 'FSE', type: 'conference' },
      { abbr: 'OSDI', type: 'conference' },
      { abbr: 'SOSP', type: 'conference' },
      { abbr: 'CCS', type: 'conference' },
      { abbr: 'S&P', type: 'conference' },
      { abbr: 'TPAMI', type: 'journal' },
      { abbr: 'IJCV', type: 'journal' },
      { abbr: 'JMLR', type: 'journal' },
      { abbr: 'TSE', type: 'journal' },
    ]

    it.each(knownAClassVenues)(
      'should contain A-class venue: $abbr',
      ({ abbr, type }) => {
        const entry = catalog.findByKey(abbr)
        expect(entry).not.toBeNull()
        expect(entry?.rank).toBe('A')
        expect(entry?.type).toBe(type)
      }
    )
  })

  describe('Singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getCCFCatalog()
      const instance2 = getCCFCatalog()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Metadata', () => {
    it('should have version information', () => {
      expect(catalog.version).toBe('2022')
    })

    it('should have lastUpdated information', () => {
      expect(catalog.lastUpdated).toBeTruthy()
    })
  })
})
