<script setup lang="ts">
/**
 * App.vue - Main Application Component
 * 
 * Integrates all UI components and coordinates communication between them.
 * Manages the overall application state and user interactions.
 * 
 * Requirements: All - This is the main entry point that ties everything together
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import FloatingButton from './components/FloatingButton.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import StatsPanel from './components/StatsPanel.vue'
import { getSettingsStore } from './stores/settings-store'
import { getSiteManager } from './adapters/site-manager'
import { getVenueMatcher } from './core/venue-matcher'
import { usePaperProcessing } from './composables/usePaperProcessing'
import { useStatsManagement } from './composables/useStatsManagement'
import { installUrlChangeListener } from './utils/page-visibility'

// State management
const showSettings = ref(false)
const settingsStore = getSettingsStore()
const siteManager = getSiteManager()
const venueMatcher = getVenueMatcher()

// Statistics management
const statsManager = useStatsManagement(siteManager)
const { stats, showStatsPanel, handleFilter, updateStats, refreshStatsPanelVisibility } = statsManager

// Paper processing
const paperProcessor = usePaperProcessing(
  settingsStore,
  siteManager,
  venueMatcher,
  () => statsManager.scheduleUiUpdate(() => {})
)

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
 * Process papers and mount badges
 */
function processPapers(): void {
  paperProcessor.processPapers()
  updateStats()
  refreshStatsPanelVisibility()
}

/**
 * Handle page changes (new papers loaded)
 */
function handlePageChange(): void {
  processPapers()
}

/**
 * Cleanup mounted badges
 */
function cleanup(): void {
  statsManager.clearPendingUpdate()
  paperProcessor.cleanup()
  siteManager.disconnect()
}

let uninstallUrlChangeListener: (() => void) | null = null

function handleNavigationChange(): void {
  showSettings.value = false
  statsManager.activeFilter.value = null

  cleanup()
  siteManager.reset(true)

  if (siteManager.initialize()) {
    siteManager.startObserving(handlePageChange)
    processPapers()
  } else {
    refreshStatsPanelVisibility()
  }
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

  refreshStatsPanelVisibility()
  uninstallUrlChangeListener = installUrlChangeListener(handleNavigationChange)
})

onUnmounted(() => {
  uninstallUrlChangeListener?.()
  uninstallUrlChangeListener = null
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
      v-if="showStatsPanel"
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
