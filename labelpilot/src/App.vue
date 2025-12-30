<script setup lang="ts">
/**
 * App.vue - Main Application Component
 * 
 * Integrates all UI components and coordinates communication between them.
 * Manages the overall application state and user interactions.
 * 
 * Requirements: All - This is the main entry point that ties everything together
 */

import { ref, reactive, computed, onMounted, onUnmounted, watch, createApp, h, type App } from 'vue'
import FloatingButton from './components/FloatingButton.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import StatsPanel, { type StatsData } from './components/StatsPanel.vue'
import RankBadge from './components/RankBadge.vue'
import { getSettingsStore } from './stores/settings-store'
import { getSiteManager } from './adapters/site-manager'
import type { ProcessedPaperInfo } from './adapters/types'
import type { MatchConfidence } from './core/venue-matcher'

// State management
const showSettings = ref(false)
const settingsStore = getSettingsStore()
const siteManager = getSiteManager()

// Statistics data
const stats = reactive<StatsData>({
  total: 0,
  byRank: {
    A: 0,
    B: 0,
    C: 0,
    unknown: 0,
  },
})

// Active filter for highlighting papers
const activeFilter = ref<'A' | 'B' | 'C' | 'unknown' | null>(null)

// Track mounted badges for cleanup
const mountedBadges = new Map<string, { element: HTMLElement; app: App }>()

/**
 * Check if stats panel should be expanded by default
 */
const statsExpanded = computed(() => settingsStore.settings.statsExpanded)

/**
 * Toggle settings panel visibility
 */
function toggleSettings() {
  showSettings.value = !showSettings.value
}

/**
 * Close settings panel
 */
function closeSettings() {
  showSettings.value = false
}

/**
 * Handle stats panel toggle
 */
function handleStatsToggle() {
  // Stats panel manages its own expanded state
}

/**
 * Handle filter change from stats panel
 */
function handleFilter(rank: 'A' | 'B' | 'C' | 'unknown' | null) {
  activeFilter.value = rank
  applyFilterHighlight(rank)
}

/**
 * Apply highlight/filter to papers based on rank
 */
function applyFilterHighlight(rank: 'A' | 'B' | 'C' | 'unknown' | null) {
  const results = siteManager.getResults()
  
  for (const [, paper] of results) {
    const paperRank = paper.matchResult.entry?.rank || null
    const isUnknown = !paper.matchResult.matched
    
    // Determine if this paper matches the filter
    let shouldHighlight = false
    if (rank === null) {
      // No filter - show all normally
      shouldHighlight = false
    } else if (rank === 'unknown') {
      shouldHighlight = isUnknown
    } else {
      shouldHighlight = paperRank === rank
    }
    
    // Apply visual highlight to paper element
    if (paper.element) {
      if (rank === null) {
        paper.element.style.opacity = ''
        paper.element.style.backgroundColor = ''
      } else if (shouldHighlight) {
        paper.element.style.opacity = '1'
        paper.element.style.backgroundColor = 'rgba(255, 255, 0, 0.1)'
      } else {
        paper.element.style.opacity = '0.4'
        paper.element.style.backgroundColor = ''
      }
    }
  }
}

/**
 * Update statistics from processed papers
 */
function updateStats() {
  const siteStats = siteManager.getStatistics()
  stats.total = siteStats.total
  stats.byRank.A = siteStats.byRank.A
  stats.byRank.B = siteStats.byRank.B
  stats.byRank.C = siteStats.byRank.C
  stats.byRank.unknown = siteStats.byRank.unknown
}

/**
 * Create and mount a RankBadge for a paper
 */
function mountBadge(paper: ProcessedPaperInfo): void {
  // Skip if already mounted
  if (mountedBadges.has(paper.id)) {
    return
  }
  
  // Check if rank should be displayed based on settings
  const rank = paper.matchResult.entry?.rank || null
  const showRanks = settingsStore.settings.showRanks
  
  if (rank === 'A' && !showRanks.A) return
  if (rank === 'B' && !showRanks.B) return
  if (rank === 'C' && !showRanks.C) return
  if (!rank && !showRanks.unknown) return
  
  // Create badge container
  const badgeContainer = document.createElement('span')
  badgeContainer.className = 'ccf-rank-badge-container'
  badgeContainer.setAttribute('data-paper-id', paper.id)
  
  // Insert badge at insertion point
  const insertionPoint = paper.insertionPoint
  if (insertionPoint) {
    insertionPoint.appendChild(badgeContainer)
  }
  
  // Create Vue app for badge
  const badgeApp = createApp({
    render() {
      const entry = paper.matchResult.entry
      const venueShort = entry?.abbr || paper.venue || paper.matchResult.cleanedVenue || '未知'
      const venueFull = entry?.name || paper.venue || paper.matchResult.cleanedVenue || '未知'
      const year = paper.year || undefined

      return h(RankBadge, {
        rank: paper.matchResult.entry?.rank || null,
        venue: venueShort,
        venueFull,
        year,
        venueSource: paper.venueSource,
        confidence: paper.matchResult.confidence as MatchConfidence,
        loading: false,
        error: undefined,
      })
    }
  })
  
  badgeApp.mount(badgeContainer)
  mountedBadges.set(paper.id, { element: badgeContainer, app: badgeApp })
  
  // Mark as processed
  siteManager.markAsProcessed(paper.id)
}

/**
 * Process papers and mount badges
 */
function processPapers(): void {
  const results = siteManager.processCurrentPage()
  
  for (const [, paper] of results) {
    if (!paper.processed) {
      mountBadge(paper)
    }
  }
  
  updateStats()
}

/**
 * Handle page changes (new papers loaded)
 */
function handlePageChange(): void {
  // Use debounce to avoid excessive processing
  processPapers()
}

/**
 * Cleanup mounted badges
 */
function cleanup(): void {
  for (const [, { element, app }] of mountedBadges) {
    app.unmount()
    element.remove()
  }
  mountedBadges.clear()
  siteManager.disconnect()
}

// Watch for settings changes to re-process papers
watch(
  () => settingsStore.settings.showRanks,
  () => {
    // Re-process papers when rank display settings change
    cleanup()
    siteManager.reset(true)
    processPapers()
    // Resume observing after cleanup/reset
    siteManager.startObserving(handlePageChange)
  },
  { deep: true }
)

// Lifecycle hooks
onMounted(async () => {
  // Load settings
  await settingsStore.load()
  
  // Initialize site manager and start processing
  if (siteManager.initialize()) {
    // Start observing for page changes
    siteManager.startObserving(handlePageChange)
    
    // Process initial papers
    processPapers()
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div class="ccf-rank-app">
    <!-- Floating Settings Button (Requirement 5.1) -->
    <FloatingButton @click="toggleSettings" />
    
    <!-- Settings Panel (Requirements 5.1-5.4) -->
    <Teleport to="body">
      <div v-if="showSettings" class="ccf-rank-overlay" @click.self="closeSettings">
        <SettingsPanel @close="closeSettings" />
      </div>
    </Teleport>
    
    <!-- Statistics Panel (Requirements 7.1-7.5) -->
    <StatsPanel
      :stats="stats"
      :expanded="statsExpanded"
      @toggle="handleStatsToggle"
      @filter="handleFilter"
    />
  </div>
</template>

<style scoped>
.ccf-rank-app {
  /* Container for the app - doesn't affect page layout */
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  z-index: 9997;
  pointer-events: none;
}

.ccf-rank-app > * {
  pointer-events: auto;
}

.ccf-rank-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

<style>
/* Global styles for badge containers */
.ccf-rank-badge-container {
  display: inline-block;
  vertical-align: middle;
}
</style>
