/**
 * useStatsManagement - 统计数据管理
 * 
 * 管理论文统计数据、过滤和高亮功能
 */

import { ref, reactive } from 'vue'
import type { StatsData } from '../components/StatsPanel.vue'
import type { SiteManager } from '../adapters/site-manager'
import { shouldShowStatsPanelForCurrentPage } from '../utils/page-visibility'

export function useStatsManagement(siteManager: SiteManager) {
  const stats = reactive<StatsData>({
    total: 0,
    byRank: {
      A: 0,
      B: 0,
      C: 0,
      unknown: 0,
    },
  })

  const showStatsPanel = ref(false)
  const activeFilter = ref<'A' | 'B' | 'C' | 'unknown' | null>(null)
  let pendingUiUpdate: number | null = null

  function scheduleUiUpdate(callback: () => void): void {
    if (pendingUiUpdate !== null) return
    pendingUiUpdate = window.setTimeout(() => {
      pendingUiUpdate = null
      updateStats()
      applyFilterHighlight(activeFilter.value)
      callback()
    }, 0)
  }

  function updateStats() {
    const siteStats = siteManager.getStatistics()
    stats.total = siteStats.total
    stats.byRank.A = siteStats.byRank.A
    stats.byRank.B = siteStats.byRank.B
    stats.byRank.C = siteStats.byRank.C
    stats.byRank.unknown = siteStats.byRank.unknown
  }

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

  function handleFilter(rank: 'A' | 'B' | 'C' | 'unknown' | null) {
    activeFilter.value = rank
    applyFilterHighlight(rank)
  }

  function refreshStatsPanelVisibility(): void {
    const adapter = siteManager.getCurrentAdapter()
    const nextVisible = shouldShowStatsPanelForCurrentPage(adapter)
    if (!nextVisible && showStatsPanel.value) {
      activeFilter.value = null
      applyFilterHighlight(null)
    }
    showStatsPanel.value = nextVisible
  }

  function clearPendingUpdate(): void {
    if (pendingUiUpdate !== null) {
      window.clearTimeout(pendingUiUpdate)
      pendingUiUpdate = null
    }
  }

  return {
    stats,
    showStatsPanel,
    activeFilter,
    scheduleUiUpdate,
    updateStats,
    applyFilterHighlight,
    handleFilter,
    refreshStatsPanelVisibility,
    clearPendingUpdate,
  }
}
