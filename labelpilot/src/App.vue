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
import { getVenueMatcher, type MatchConfidence } from './core/venue-matcher'
import { DblpService } from './services/dblp-service'

// State management
const showSettings = ref(false)
const settingsStore = getSettingsStore()
const siteManager = getSiteManager()
const venueMatcher = getVenueMatcher()
const dblpService = new DblpService()

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

// DBLP lookup queue (avoid too many concurrent requests)
const DBLP_LOOKUP_CONCURRENCY = 2
let dblpActiveCount = 0
const dblpQueue: Array<() => Promise<void>> = []
const dblpInFlight = new Set<string>()
let processingEpoch = 0

function enqueueDblpLookup(task: () => Promise<void>): void {
  dblpQueue.push(task)
  void drainDblpQueue()
}

function drainDblpQueue(): void {
  while (dblpActiveCount < DBLP_LOOKUP_CONCURRENCY && dblpQueue.length > 0) {
    const task = dblpQueue.shift()
    if (!task) continue

    const epochAtStart = processingEpoch
    dblpActiveCount++
    task()
      .catch(error => {
        console.warn('[CCF Rank] DBLP task failed:', error)
      })
      .finally(() => {
        dblpActiveCount--
        // Only continue draining if epoch hasn't changed (not cancelled)
        // Use setTimeout to avoid potential stack overflow with many tasks
        if (epochAtStart === processingEpoch && dblpQueue.length > 0) {
          setTimeout(drainDblpQueue, 0)
        }
      })
  }
}

let pendingUiUpdate: number | null = null
function scheduleUiUpdate(): void {
  if (pendingUiUpdate !== null) return
  pendingUiUpdate = window.setTimeout(() => {
    pendingUiUpdate = null
    updateStats()
    applyFilterHighlight(activeFilter.value)
  }, 0)
}

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

function shouldLookupDblp(paper: ProcessedPaperInfo): boolean {
  const currentSite = siteManager.getCurrentAdapter()?.siteId
  if (currentSite !== 'arxiv') return false
  if (paper.venue) return false
  if (!paper.title) return false
  return true
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
  const badgeState = reactive({
    rank: paper.matchResult.entry?.rank || null,
    venue: '',
    venueFull: '',
    year: paper.year || null,
    venueSource: paper.venueSource,
    confidence: paper.matchResult.confidence as MatchConfidence,
    dblpUrl: undefined as string | undefined,
    loading: false,
    error: undefined as string | undefined,
  })

  {
    const entry = paper.matchResult.entry
    badgeState.venue = entry?.abbr || paper.venue || paper.matchResult.cleanedVenue || '未知'
    badgeState.venueFull = entry?.name || paper.venue || paper.matchResult.cleanedVenue || '未知'
  }

  const badgeApp = createApp({
    render() {
      return h(RankBadge, {
        rank: badgeState.rank,
        venue: badgeState.venue,
        venueFull: badgeState.venueFull,
        year: badgeState.year ?? undefined,
        venueSource: badgeState.venueSource,
        confidence: badgeState.confidence,
        dblpUrl: badgeState.dblpUrl,
        loading: badgeState.loading,
        error: badgeState.error,
      })
    }
  })
  
  badgeApp.mount(badgeContainer)
  mountedBadges.set(paper.id, { element: badgeContainer, app: badgeApp })
  
  // Mark as processed
  siteManager.markAsProcessed(paper.id)

  // DBLP fallback (arXiv only): query by title when comments don't contain venue.
  if (shouldLookupDblp(paper) && !dblpInFlight.has(paper.id)) {
    dblpInFlight.add(paper.id)
    badgeState.loading = true
    badgeState.error = undefined

    const epochAtEnqueue = processingEpoch
    enqueueDblpLookup(async () => {
      try {
        const result = await dblpService.queryByTitle(paper.title)
        if (epochAtEnqueue !== processingEpoch) return

        if (result.error) {
          badgeState.loading = false
          badgeState.error = result.timedOut ? 'DBLP 查询超时' : `DBLP 查询失败: ${result.error}`
          return
        }

        if (!result.found || !result.venue) {
          badgeState.loading = false
          return
        }

        // Update paper data for stats/filtering.
        paper.venue = result.venue
        paper.venueSource = 'dblp'
        if (!paper.year && result.year) {
          paper.year = result.year
        }
        const matchResult = venueMatcher.match(result.venue)
        paper.matchResult = matchResult

        // Update badge UI.
        const entry = matchResult.entry
        badgeState.rank = entry?.rank || null
        badgeState.venue = entry?.abbr || result.venue
        badgeState.venueFull = entry?.name || result.venue
        badgeState.year = paper.year || result.year || null
        badgeState.venueSource = 'dblp'
        badgeState.confidence = matchResult.confidence as MatchConfidence
        badgeState.dblpUrl = result.dblpUrl || undefined
        badgeState.loading = false
        badgeState.error = undefined

        scheduleUiUpdate()
      } finally {
        dblpInFlight.delete(paper.id)
      }
    })
  }
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
  // Invalidate any in-flight async tasks (DBLP lookup, etc.)
  processingEpoch++
  dblpQueue.length = 0
  dblpInFlight.clear()
  if (pendingUiUpdate !== null) {
    window.clearTimeout(pendingUiUpdate)
    pendingUiUpdate = null
  }

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
