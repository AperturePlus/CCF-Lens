<script setup lang="ts">
/**
 * RankBadge Component
 * 
 * Displays CCF rank badge with color-coded styling and tooltip.
 * 
 * Requirements:
 * - 4.1: A rank shows red background "CCF-A"
 * - 4.2: B rank shows orange background "CCF-B"
 * - 4.3: C rank shows blue background "CCF-C"
 * - 4.4: Known venue without CCF rank shows gray venue info
 * - 4.5: Shows venue source info (comment/DBLP/page)
 * - 4.6: Hover shows detailed tooltip with venue and source
 */

import { computed, ref } from 'vue'
import type { VenueSource } from '../adapters/types'
import type { MatchConfidence } from '../core/venue-matcher'

export interface RankBadgeProps {
  /** CCF rank: A, B, C, or null for unknown */
  rank: 'A' | 'B' | 'C' | null
  /** Venue short name (for badge display) */
  venue: string
  /** Venue full name (for tooltip display) */
  venueFull?: string
  /** Publication year (best-effort) */
  year?: string | null
  /** Source of venue information */
  venueSource: VenueSource
  /** Match confidence level */
  confidence: MatchConfidence
  /** DBLP URL if available */
  dblpUrl?: string
  /** Loading state */
  loading?: boolean
  /** Error message if any */
  error?: string
}

const props = withDefaults(defineProps<RankBadgeProps>(), {
  dblpUrl: undefined,
  venueFull: undefined,
  year: undefined,
  loading: false,
  error: undefined,
})

const showTooltip = ref(false)

const venueWithYear = computed(() => {
  const venue = props.venue?.trim() ?? ''
  const year = typeof props.year === 'string' ? props.year.trim() : ''

  if (venue && year) return `${venue} ${year}`
  return venue || year
})

/**
 * Badge text based on rank
 */
const badgeText = computed(() => {
  if (props.loading) return '...'
  if (props.error) return '!'
  const venueLabel = venueWithYear.value
  if (props.rank) return venueLabel ? `CCF-${props.rank} ${venueLabel}` : `CCF-${props.rank}`
  return venueLabel || '未知'
})

/**
 * CSS class for badge based on rank
 */
const badgeClass = computed(() => {
  if (props.loading) return 'rank-badge--loading'
  if (props.error) return 'rank-badge--error'
  if (!props.rank) return 'rank-badge--unknown'
  return `rank-badge--${props.rank.toLowerCase()}`
})

/**
 * Venue source display text
 */
const sourceText = computed(() => {
  const sourceMap: Record<VenueSource, string> = {
    comment: 'Comments',
    dblp: 'DBLP',
    page: '页面提取',
    unknown: '未知来源',
  }
  return sourceMap[props.venueSource] || '未知来源'
})

/**
 * Confidence level display text
 */
const confidenceText = computed(() => {
  const confidenceMap: Record<MatchConfidence, string> = {
    exact: '精确匹配',
    cleaned: '清理后匹配',
    partial: '部分匹配',
    acronym: '缩写匹配',
    none: '未匹配',
  }
  return confidenceMap[props.confidence] || '未知'
})
</script>

<template>
  <span
    class="rank-badge"
    :class="badgeClass"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
  >
    <span class="rank-badge__text">{{ badgeText }}</span>
    
    <!-- Tooltip -->
    <span
      v-if="showTooltip"
      class="rank-badge__tooltip"
    >
      <span class="rank-badge__tooltip-content">
        <template v-if="loading">正在查询...</template>
        <template v-else-if="error">错误: {{ error }}</template>
        <template v-else>
          <span v-if="venueFull || venue" class="rank-badge__tooltip-line">
            <strong>Venue:</strong> {{ venueFull || venue }}
          </span>
          <span v-if="venueFull && venue && venueFull !== venue" class="rank-badge__tooltip-line">
            <strong>简称:</strong> {{ venue }}
          </span>
          <span v-if="year" class="rank-badge__tooltip-line">
            <strong>年份:</strong> {{ year }}
          </span>
          <span v-if="rank" class="rank-badge__tooltip-line">
            <strong>等级:</strong> CCF-{{ rank }}
          </span>
          <span class="rank-badge__tooltip-line">
            <strong>来源:</strong> {{ sourceText }}
          </span>
          <span v-if="confidence !== 'none'" class="rank-badge__tooltip-line">
            <strong>匹配:</strong> {{ confidenceText }}
          </span>
          <a
            v-if="dblpUrl"
            :href="dblpUrl"
            target="_blank"
            class="rank-badge__tooltip-link"
            @click.stop
          >
            查看 DBLP
          </a>
        </template>
      </span>
    </span>
  </span>
</template>


<style scoped>
.rank-badge {
  display: inline-flex;
  align-items: center;
  position: relative;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  cursor: default;
  white-space: nowrap;
  vertical-align: middle;
  margin-left: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Rank A - Red (Requirement 4.1) */
.rank-badge--a {
  background-color: #dc3545;
  color: #ffffff;
}

/* Rank B - Orange (Requirement 4.2) */
.rank-badge--b {
  background-color: #fd7e14;
  color: #ffffff;
}

/* Rank C - Blue (Requirement 4.3) */
.rank-badge--c {
  background-color: #0d6efd;
  color: #ffffff;
}

/* Unknown - Gray (Requirement 4.4) */
.rank-badge--unknown {
  background-color: #6c757d;
  color: #ffffff;
}

/* Loading state */
.rank-badge--loading {
  background-color: #e9ecef;
  color: #6c757d;
  animation: pulse 1.5s ease-in-out infinite;
}

/* Error state */
.rank-badge--error {
  background-color: #f8d7da;
  color: #842029;
  border: 1px solid #f5c2c7;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.rank-badge__text {
  display: inline-block;
  min-width: 0;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Tooltip (Requirement 4.6) */
.rank-badge__tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  z-index: 10000;
  pointer-events: none;
}

.rank-badge__tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background-color: #1a1a1a;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}

.rank-badge__tooltip-content::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #1a1a1a;
}

.rank-badge__tooltip-line {
  display: block;
  line-height: 1.4;
}

.rank-badge__tooltip-line strong {
  color: #a0a0a0;
  margin-right: 4px;
}

.rank-badge__tooltip-link {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 8px;
  background-color: #0d6efd;
  color: #ffffff;
  text-decoration: none;
  border-radius: 3px;
  font-size: 11px;
  text-align: center;
}

.rank-badge__tooltip-link:hover {
  background-color: #0b5ed7;
}
</style>
