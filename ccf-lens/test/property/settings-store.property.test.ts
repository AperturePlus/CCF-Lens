/**
 * Property-Based Tests for SettingsStore
 * 
 * Tests correctness properties using fast-check for randomized input generation.
 * 
 * Feature: ccf-rank-userscript
 * Property 7: 设置持久化一致性
 * **Validates: Requirements 5.5**
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import {
  SettingsStore,
  resetSettingsStore,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type Settings,
  type BadgePosition,
} from '../../src/stores/settings-store'
import { clearGMStorage, gmStorage } from '../setup'

describe('SettingsStore Property Tests', () => {
  let settingsStore: SettingsStore

  beforeEach(() => {
    clearGMStorage()
    resetSettingsStore()
    settingsStore = new SettingsStore()
  })

  /**
   * Property 7: 设置持久化一致性
   * 
   * For any user settings modification, after saving and reloading,
   * the settings should be identical to what was saved.
   * 
   * **Validates: Requirements 5.5**
   */
  describe('Property 7: 设置持久化一致性', () => {
    // Arbitrary for generating valid badge positions
    const badgePositionArb: fc.Arbitrary<BadgePosition> = fc.constantFrom(
      'after-title',
      'after-authors',
      'inline'
    )

    // Arbitrary for generating rank display settings
    const rankDisplayArb = fc.record({
      A: fc.boolean(),
      B: fc.boolean(),
      C: fc.boolean(),
      unknown: fc.boolean(),
    })

    // Arbitrary for generating site enable settings
    const siteEnableArb = fc.record({
      arxiv: fc.boolean(),
      dblp: fc.boolean(),
      ieee: fc.boolean(),
      'google-scholar': fc.boolean(),
    })

    // Arbitrary for generating complete settings
    const settingsArb: fc.Arbitrary<Settings> = fc.record({
      showRanks: rankDisplayArb,
      enabledSites: siteEnableArb,
      badgePosition: badgePositionArb,
      debugMode: fc.boolean(),
      statsExpanded: fc.boolean(),
    })

    it('should persist and reload settings correctly (round-trip)', async () => {
      await fc.assert(
        fc.asyncProperty(settingsArb, async (settings) => {
          // Apply settings
          settingsStore.update('showRanks', settings.showRanks)
          settingsStore.update('enabledSites', settings.enabledSites)
          settingsStore.update('badgePosition', settings.badgePosition)
          settingsStore.update('debugMode', settings.debugMode)
          settingsStore.update('statsExpanded', settings.statsExpanded)

          // Wait for async save to complete
          await new Promise(resolve => setTimeout(resolve, 10))

          // Create new store instance (simulating page reload)
          const newStore = new SettingsStore()
          await newStore.load()

          // Verify all settings match
          const loaded = newStore.toJSON()
          expect(loaded.showRanks).toEqual(settings.showRanks)
          expect(loaded.enabledSites).toEqual(settings.enabledSites)
          expect(loaded.badgePosition).toBe(settings.badgePosition)
          expect(loaded.debugMode).toBe(settings.debugMode)
          expect(loaded.statsExpanded).toBe(settings.statsExpanded)
        }),
        { numRuns: 100 }
      )
    })

    it('should persist individual rank display settings correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('A', 'B', 'C', 'unknown') as fc.Arbitrary<'A' | 'B' | 'C' | 'unknown'>,
          fc.boolean(),
          async (rank, enabled) => {
            settingsStore.setRankDisplay(rank, enabled)

            // Wait for async save
            await new Promise(resolve => setTimeout(resolve, 10))

            // Reload in new store
            const newStore = new SettingsStore()
            await newStore.load()

            expect(newStore.settings.showRanks[rank]).toBe(enabled)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist individual site enable settings correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('arxiv', 'dblp', 'ieee', 'google-scholar') as fc.Arbitrary<'arxiv' | 'dblp' | 'ieee' | 'google-scholar'>,
          fc.boolean(),
          async (site, enabled) => {
            settingsStore.setSiteEnabled(site, enabled)

            // Wait for async save
            await new Promise(resolve => setTimeout(resolve, 10))

            // Reload in new store
            const newStore = new SettingsStore()
            await newStore.load()

            expect(newStore.settings.enabledSites[site]).toBe(enabled)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist badge position correctly', async () => {
      await fc.assert(
        fc.asyncProperty(badgePositionArb, async (position) => {
          settingsStore.update('badgePosition', position)

          // Wait for async save
          await new Promise(resolve => setTimeout(resolve, 10))

          // Reload in new store
          const newStore = new SettingsStore()
          await newStore.load()

          expect(newStore.settings.badgePosition).toBe(position)
        }),
        { numRuns: 100 }
      )
    })

    it('should store settings in GM storage', async () => {
      await fc.assert(
        fc.asyncProperty(settingsArb, async (settings) => {
          settingsStore.update('showRanks', settings.showRanks)
          settingsStore.update('enabledSites', settings.enabledSites)
          settingsStore.update('badgePosition', settings.badgePosition)
          settingsStore.update('debugMode', settings.debugMode)
          settingsStore.update('statsExpanded', settings.statsExpanded)

          // Wait for async save
          await new Promise(resolve => setTimeout(resolve, 10))

          // Verify storage contains the settings
          expect(gmStorage.has(SETTINGS_STORAGE_KEY)).toBe(true)

          const stored = gmStorage.get(SETTINGS_STORAGE_KEY) as {
            version: number
            settings: Settings
            lastModified: number
          }

          expect(stored.version).toBe(1)
          expect(stored.settings.showRanks).toEqual(settings.showRanks)
          expect(stored.settings.enabledSites).toEqual(settings.enabledSites)
          expect(stored.settings.badgePosition).toBe(settings.badgePosition)
          expect(stored.settings.debugMode).toBe(settings.debugMode)
          expect(stored.settings.statsExpanded).toBe(settings.statsExpanded)
          expect(typeof stored.lastModified).toBe('number')
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional property: Reset restores defaults
   */
  describe('Reset Behavior', () => {
    it('should reset to default settings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            showRanks: fc.record({
              A: fc.boolean(),
              B: fc.boolean(),
              C: fc.boolean(),
              unknown: fc.boolean(),
            }),
            enabledSites: fc.record({
              arxiv: fc.boolean(),
              dblp: fc.boolean(),
              ieee: fc.boolean(),
              'google-scholar': fc.boolean(),
            }),
            badgePosition: fc.constantFrom('after-title', 'after-authors', 'inline') as fc.Arbitrary<BadgePosition>,
            debugMode: fc.boolean(),
            statsExpanded: fc.boolean(),
          }),
          async (settings) => {
            // Apply random settings
            settingsStore.update('showRanks', settings.showRanks)
            settingsStore.update('enabledSites', settings.enabledSites)
            settingsStore.update('badgePosition', settings.badgePosition)
            settingsStore.update('debugMode', settings.debugMode)
            settingsStore.update('statsExpanded', settings.statsExpanded)

            // Wait for save
            await new Promise(resolve => setTimeout(resolve, 10))

            // Reset
            settingsStore.reset()

            // Wait for save
            await new Promise(resolve => setTimeout(resolve, 10))

            // Verify defaults are restored
            const current = settingsStore.toJSON()
            expect(current).toEqual(DEFAULT_SETTINGS)

            // Verify persisted defaults
            const newStore = new SettingsStore()
            await newStore.load()
            expect(newStore.toJSON()).toEqual(DEFAULT_SETTINGS)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * Additional property: Default settings on first load
   */
  describe('Default Settings', () => {
    it('should use default settings when storage is empty', async () => {
      await settingsStore.load()
      expect(settingsStore.toJSON()).toEqual(DEFAULT_SETTINGS)
    })

    it('should use default settings when storage contains invalid data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.string(),
            fc.integer(),
            fc.array(fc.anything()),
            fc.record({ invalid: fc.anything() }),
          ),
          async (invalidData) => {
            // Store invalid data
            gmStorage.set(SETTINGS_STORAGE_KEY, invalidData)

            // Load should fall back to defaults
            const store = new SettingsStore()
            await store.load()

            expect(store.toJSON()).toEqual(DEFAULT_SETTINGS)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * Additional property: Idempotence of save
   */
  describe('Save Idempotence', () => {
    it('should produce same storage state when saved multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            showRanks: fc.record({
              A: fc.boolean(),
              B: fc.boolean(),
              C: fc.boolean(),
              unknown: fc.boolean(),
            }),
            enabledSites: fc.record({
              arxiv: fc.boolean(),
              dblp: fc.boolean(),
              ieee: fc.boolean(),
              'google-scholar': fc.boolean(),
            }),
            badgePosition: fc.constantFrom('after-title', 'after-authors', 'inline') as fc.Arbitrary<BadgePosition>,
            debugMode: fc.boolean(),
            statsExpanded: fc.boolean(),
          }),
          async (settings) => {
            // Apply settings
            settingsStore.update('showRanks', settings.showRanks)
            settingsStore.update('enabledSites', settings.enabledSites)
            settingsStore.update('badgePosition', settings.badgePosition)
            settingsStore.update('debugMode', settings.debugMode)
            settingsStore.update('statsExpanded', settings.statsExpanded)

            // Wait for save
            await new Promise(resolve => setTimeout(resolve, 10))

            // Get first storage state
            const firstState = gmStorage.get(SETTINGS_STORAGE_KEY) as {
              settings: Settings
            }

            // Save again
            await settingsStore.save()

            // Get second storage state
            const secondState = gmStorage.get(SETTINGS_STORAGE_KEY) as {
              settings: Settings
            }

            // Settings should be identical (lastModified may differ)
            expect(secondState.settings).toEqual(firstState.settings)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
