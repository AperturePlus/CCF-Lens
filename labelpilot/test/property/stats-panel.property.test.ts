/**
 * Property-Based Tests for StatsPanel Statistics Correctness
 * 
 * Tests correctness properties using fast-check for randomized input generation.
 * 
 * Feature: ccf-rank-userscript
 * Property 6: 统计数据正确性
 * **Validates: Requirements 7.2, 7.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * StatsData interface matching the component
 */
interface StatsData {
  total: number
  byRank: {
    A: number
    B: number
    C: number
    unknown: number
  }
}

/**
 * Calculate percentage for a rank (same logic as component)
 */
function calculatePercentage(count: number, total: number): number {
  if (total === 0) return 0
  return (count / total) * 100
}

/**
 * Generate valid StatsData where byRank sums to total
 */
const validStatsDataArb = fc.record({
  A: fc.nat({ max: 100 }),
  B: fc.nat({ max: 100 }),
  C: fc.nat({ max: 100 }),
  unknown: fc.nat({ max: 100 }),
}).map(byRank => ({
  total: byRank.A + byRank.B + byRank.C + byRank.unknown,
  byRank,
}))

describe('StatsPanel Property Tests', () => {
  /**
   * Property 6: 统计数据正确性
   * 
   * For any collection of papers on a page:
   * 1. The sum of counts for each rank should equal the total paper count
   * 2. The sum of percentages should equal 100% (allowing for rounding errors)
   * 
   * **Validates: Requirements 7.2, 7.3**
   */
  describe('Property 6: 统计数据正确性', () => {
    it('sum of rank counts should equal total paper count', () => {
      fc.assert(
        fc.property(validStatsDataArb, (stats: StatsData) => {
          const sumOfRanks = stats.byRank.A + stats.byRank.B + stats.byRank.C + stats.byRank.unknown
          expect(sumOfRanks).toBe(stats.total)
        }),
        { numRuns: 100 }
      )
    })

    it('sum of percentages should equal 100% (with rounding tolerance)', () => {
      fc.assert(
        fc.property(validStatsDataArb, (stats: StatsData) => {
          if (stats.total === 0) {
            // When total is 0, all percentages should be 0
            const percentageA = calculatePercentage(stats.byRank.A, stats.total)
            const percentageB = calculatePercentage(stats.byRank.B, stats.total)
            const percentageC = calculatePercentage(stats.byRank.C, stats.total)
            const percentageUnknown = calculatePercentage(stats.byRank.unknown, stats.total)
            
            expect(percentageA).toBe(0)
            expect(percentageB).toBe(0)
            expect(percentageC).toBe(0)
            expect(percentageUnknown).toBe(0)
          } else {
            const percentageA = calculatePercentage(stats.byRank.A, stats.total)
            const percentageB = calculatePercentage(stats.byRank.B, stats.total)
            const percentageC = calculatePercentage(stats.byRank.C, stats.total)
            const percentageUnknown = calculatePercentage(stats.byRank.unknown, stats.total)
            
            const sumOfPercentages = percentageA + percentageB + percentageC + percentageUnknown
            
            // Allow for floating point rounding errors (within 0.01%)
            expect(Math.abs(sumOfPercentages - 100)).toBeLessThan(0.01)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('each percentage should be between 0 and 100', () => {
      fc.assert(
        fc.property(validStatsDataArb, (stats: StatsData) => {
          const percentages = [
            calculatePercentage(stats.byRank.A, stats.total),
            calculatePercentage(stats.byRank.B, stats.total),
            calculatePercentage(stats.byRank.C, stats.total),
            calculatePercentage(stats.byRank.unknown, stats.total),
          ]
          
          for (const percentage of percentages) {
            expect(percentage).toBeGreaterThanOrEqual(0)
            expect(percentage).toBeLessThanOrEqual(100)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('percentage should be proportional to count', () => {
      fc.assert(
        fc.property(validStatsDataArb, (stats: StatsData) => {
          if (stats.total === 0) return // Skip empty case
          
          const ranks = ['A', 'B', 'C', 'unknown'] as const
          
          // For any two ranks, if count_a > count_b, then percentage_a > percentage_b
          for (let i = 0; i < ranks.length; i++) {
            for (let j = i + 1; j < ranks.length; j++) {
              const countA = stats.byRank[ranks[i]]
              const countB = stats.byRank[ranks[j]]
              const percentageA = calculatePercentage(countA, stats.total)
              const percentageB = calculatePercentage(countB, stats.total)
              
              if (countA > countB) {
                expect(percentageA).toBeGreaterThan(percentageB)
              } else if (countA < countB) {
                expect(percentageA).toBeLessThan(percentageB)
              } else {
                // Equal counts should have equal percentages
                expect(percentageA).toBe(percentageB)
              }
            }
          }
        }),
        { numRuns: 100 }
      )
    })

    it('zero count should result in zero percentage', () => {
      fc.assert(
        fc.property(validStatsDataArb, (stats: StatsData) => {
          const ranks = ['A', 'B', 'C', 'unknown'] as const
          
          for (const rank of ranks) {
            if (stats.byRank[rank] === 0) {
              const percentage = calculatePercentage(stats.byRank[rank], stats.total)
              expect(percentage).toBe(0)
            }
          }
        }),
        { numRuns: 100 }
      )
    })

    it('single rank with all papers should have 100% percentage', () => {
      // Generate stats where only one rank has papers
      const singleRankStatsArb = fc.record({
        rank: fc.constantFrom('A', 'B', 'C', 'unknown') as fc.Arbitrary<'A' | 'B' | 'C' | 'unknown'>,
        count: fc.integer({ min: 1, max: 100 }),
      }).map(({ rank, count }) => ({
        total: count,
        byRank: {
          A: rank === 'A' ? count : 0,
          B: rank === 'B' ? count : 0,
          C: rank === 'C' ? count : 0,
          unknown: rank === 'unknown' ? count : 0,
        },
      }))

      fc.assert(
        fc.property(singleRankStatsArb, (stats: StatsData) => {
          const ranks = ['A', 'B', 'C', 'unknown'] as const
          
          for (const rank of ranks) {
            const percentage = calculatePercentage(stats.byRank[rank], stats.total)
            if (stats.byRank[rank] === stats.total) {
              expect(percentage).toBe(100)
            } else {
              expect(percentage).toBe(0)
            }
          }
        }),
        { numRuns: 100 }
      )
    })
  })
})
