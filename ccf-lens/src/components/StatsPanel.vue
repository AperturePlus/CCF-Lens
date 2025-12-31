<script setup lang="ts">
/**
 * StatsPanel Component
 * 
 * Displays statistics about CCF rank distribution on the current page.
 * 
 * Requirements:
 * - 7.1: Display a collapsible statistics panel on the page
 * - 7.2: Show count of papers for each CCF rank
 * - 7.3: Show percentage for each rank
 * - 7.5: Allow clicking a rank to filter/highlight corresponding papers
 */

import { computed, ref, watch } from 'vue'

export interface StatsData {
  /** Total number of papers */
  total: number
  /** Count by rank */
  byRank: {
    A: number
    B: number
    C: number
    unknown: number
  }
}

const props = withDefaults(defineProps<{
  /** Statistics data */
  stats: StatsData
  /** Whether panel is expanded */
  expanded?: boolean
}>(), {
  expanded: false,
})

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'filter', rank: 'A' | 'B' | 'C' | 'unknown' | null): void
}>()

const isExpanded = ref(props.expanded)
const activeFilter = ref<'A' | 'B' | 'C' | 'unknown' | null>(null)

// Watch for external changes to expanded prop
watch(() => props.expanded, (newValue) => {
  isExpanded.value = newValue
})

/**
 * Calculate percentage for a rank
 */
function calculatePercentage(count: number): string {
  if (props.stats.total === 0) return '0'
  const percentage = (count / props.stats.total) * 100
  // Round to 1 decimal place, but show integer if it's a whole number
  return percentage % 1 === 0 ? percentage.toString() : percentage.toFixed(1)
}

/**
 * Rank display configuration
 */
const rankConfig = [
  { key: 'A' as const, label: 'CCF-A', color: '#dc3545', bgColor: '#f8d7da' },
  { key: 'B' as const, label: 'CCF-B', color: '#fd7e14', bgColor: '#fff3cd' },
  { key: 'C' as const, label: 'CCF-C', color: '#0d6efd', bgColor: '#cfe2ff' },
  { key: 'unknown' as const, label: '未知', color: '#6c757d', bgColor: '#e9ecef' },
]

/**
 * Toggle panel expansion
 */
function toggleExpanded() {
  isExpanded.value = !isExpanded.value
  emit('toggle')
}

/**
 * Handle rank click for filtering
 */
function handleRankClick(rank: 'A' | 'B' | 'C' | 'unknown') {
  if (activeFilter.value === rank) {
    // Clear filter if clicking the same rank
    activeFilter.value = null
    emit('filter', null)
  } else {
    activeFilter.value = rank
    emit('filter', rank)
  }
}

/**
 * Check if a rank is active (for highlighting)
 */
function isRankActive(rank: 'A' | 'B' | 'C' | 'unknown'): boolean {
  return activeFilter.value === rank
}

/**
 * Summary text for collapsed state
 */
const summaryText = computed(() => {
  const { A, B, C } = props.stats.byRank
  const parts: string[] = []
  if (A > 0) parts.push(`A:${A}`)
  if (B > 0) parts.push(`B:${B}`)
  if (C > 0) parts.push(`C:${C}`)
  return parts.length > 0 ? parts.join(' ') : '无数据'
})
</script>

<template>
  <div class="stats-panel" :class="{ 'stats-panel--expanded': isExpanded }">
    <!-- Header (always visible) -->
    <div class="stats-panel__header" @click="toggleExpanded">
      <span class="stats-panel__title">
        📊 CCF 统计
        <span class="stats-panel__total">({{ stats.total }}篇)</span>
      </span>
      <span v-if="!isExpanded" class="stats-panel__summary">
        {{ summaryText }}
      </span>
      <span class="stats-panel__toggle">
        {{ isExpanded ? '▼' : '▶' }}
      </span>
    </div>

    <!-- Content (collapsible) -->
    <div v-if="isExpanded" class="stats-panel__content">
      <div
        v-for="rank in rankConfig"
        :key="rank.key"
        class="stats-item"
        :class="{ 'stats-item--active': isRankActive(rank.key) }"
        :style="{ '--rank-color': rank.color, '--rank-bg': rank.bgColor }"
        @click="handleRankClick(rank.key)"
      >
        <span class="stats-item__label">{{ rank.label }}</span>
        <span class="stats-item__count">{{ stats.byRank[rank.key] }}</span>
        <span class="stats-item__percentage">
          {{ calculatePercentage(stats.byRank[rank.key]) }}%
        </span>
        <div
          class="stats-item__bar"
          :style="{
            width: `${stats.total > 0 ? (stats.byRank[rank.key] / stats.total) * 100 : 0}%`,
            backgroundColor: rank.color,
          }"
        />
      </div>

      <!-- Clear filter button -->
      <button
        v-if="activeFilter"
        class="stats-panel__clear"
        @click.stop="handleRankClick(activeFilter)"
      >
        清除筛选
      </button>
    </div>
  </div>
</template>


<style scoped>
.stats-panel {
  position: fixed;
  top: 10px;
  right: 10px;
  min-width: 180px;
  max-width: 280px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.stats-panel:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.stats-panel__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f8f9fa;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid transparent;
  transition: background-color 0.2s;
}

.stats-panel--expanded .stats-panel__header {
  border-bottom-color: #e9ecef;
}

.stats-panel__header:hover {
  background: #e9ecef;
}

.stats-panel__title {
  font-weight: 600;
  color: #212529;
  flex-shrink: 0;
}

.stats-panel__total {
  font-weight: 400;
  color: #6c757d;
  font-size: 12px;
}

.stats-panel__summary {
  flex: 1;
  text-align: right;
  color: #495057;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stats-panel__toggle {
  color: #6c757d;
  font-size: 10px;
  flex-shrink: 0;
}

.stats-panel__content {
  padding: 8px 12px 12px;
}

.stats-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 6px;
  border-radius: 6px;
  background: var(--rank-bg);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  overflow: hidden;
}

.stats-item:last-of-type {
  margin-bottom: 0;
}

.stats-item:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stats-item--active {
  box-shadow: 0 0 0 2px var(--rank-color);
}

.stats-item__label {
  font-weight: 600;
  color: var(--rank-color);
  min-width: 50px;
}

.stats-item__count {
  font-weight: 700;
  color: #212529;
  min-width: 24px;
  text-align: right;
}

.stats-item__percentage {
  color: #6c757d;
  font-size: 12px;
  min-width: 40px;
  text-align: right;
}

.stats-item__bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  border-radius: 0 3px 3px 0;
  transition: width 0.3s ease;
}

.stats-panel__clear {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 6px 12px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 12px;
  color: #6c757d;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.stats-panel__clear:hover {
  background: #e9ecef;
  color: #495057;
}
</style>
