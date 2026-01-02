/**
 * usePaperProcessing - 论文处理逻辑
 * 
 * 负责处理论文信息、挂载徽章、DBLP查询等核心功能
 */

import { reactive, createApp, h, type App } from 'vue'
import type { ProcessedPaperInfo } from '../adapters/types'
import type { MatchConfidence } from '../core/venue-matcher'
import type { SettingsStore } from '../stores/settings-store'
import type { SiteManager } from '../adapters/site-manager'
import type { VenueMatcher } from '../core/venue-matcher'
import { DblpService } from '../services/dblp-service'
import RankBadge from '../components/RankBadge.vue'
import { useDblpQueue } from './useDblpQueue'
import { hasArxivPublicationSignal } from '../utils/page-visibility'

export function usePaperProcessing(
  settingsStore: SettingsStore,
  siteManager: SiteManager,
  venueMatcher: VenueMatcher,
  onUiUpdate: () => void
) {
  const mountedBadges = new Map<string, { element: HTMLElement; app: App }>()
  const dblpService = new DblpService()
  const dblpQueue = useDblpQueue()

  function shouldLookupDblp(paper: ProcessedPaperInfo): boolean {
    const currentSite = siteManager.getCurrentAdapter()?.siteId
    if (currentSite !== 'arxiv') return false
    if (paper.venue) return false
    if (!paper.title) return false
    // Avoid DBLP lookups for plain arXiv preprints to reduce unnecessary traffic.
    if (!hasArxivPublicationSignal(paper.element)) return false
    return true
  }

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
    if (shouldLookupDblp(paper) && !dblpQueue.isInFlight(paper.id)) {
      dblpQueue.addToInFlight(paper.id)
      badgeState.loading = true
      badgeState.error = undefined

      const epochAtEnqueue = dblpQueue.getCurrentEpoch()
      dblpQueue.enqueueDblpLookup(async () => {
        try {
          const result = await dblpService.queryByTitle(paper.title)
          if (epochAtEnqueue !== dblpQueue.getCurrentEpoch()) return

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

          onUiUpdate()
        } finally {
          dblpQueue.removeFromInFlight(paper.id)
        }
      })
    }
  }

  function processPapers(): void {
    const results = siteManager.processCurrentPage()
    
    for (const [, paper] of results) {
      if (!paper.processed) {
        mountBadge(paper)
      }
    }
  }

  function cleanup(): void {
    dblpQueue.clearQueue()

    for (const [, { element, app }] of mountedBadges) {
      app.unmount()
      element.remove()
    }
    mountedBadges.clear()
  }

  return {
    mountBadge,
    processPapers,
    cleanup,
  }
}
