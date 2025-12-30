/**
 * RankBadge Component Unit Tests
 * 
 * Tests for the RankBadge Vue component rendering and behavior.
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RankBadge from '../../src/components/RankBadge.vue'

describe('RankBadge', () => {
  describe('Rank Display (Requirements 4.1-4.4)', () => {
    it('should display "CCF-A" for A rank (Requirement 4.1)', () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: 'A',
          venue: 'CVPR',
          venueSource: 'page',
          confidence: 'exact',
        },
      })

      expect(wrapper.text()).toContain('CCF-A')
      expect(wrapper.find('.rank-badge--a').exists()).toBe(true)
    })

    it('should display "CCF-B" for B rank (Requirement 4.2)', () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: 'B',
          venue: 'ECCV',
          venueSource: 'page',
          confidence: 'exact',
        },
      })

      expect(wrapper.text()).toContain('CCF-B')
      expect(wrapper.find('.rank-badge--b').exists()).toBe(true)
    })

    it('should display "CCF-C" for C rank (Requirement 4.3)', () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: 'C',
          venue: 'ACCV',
          venueSource: 'page',
          confidence: 'exact',
        },
      })

      expect(wrapper.text()).toContain('CCF-C')
      expect(wrapper.find('.rank-badge--c').exists()).toBe(true)
    })

    it('should display venue name for unknown rank (Requirement 4.4)', () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: null,
          venue: 'Unknown Conference',
          venueSource: 'page',
          confidence: 'none',
        },
      })

      expect(wrapper.text()).toContain('Unknown Conference')
      expect(wrapper.find('.rank-badge--unknown').exists()).toBe(true)
    })

    it('should display "未知" when venue is empty and rank is null', () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: null,
          venue: '',
          venueSource: 'unknown',
          confidence: 'none',
        },
      })

      expect(wrapper.text()).toContain('未知')
    })
  })

  describe('Loading State', () => {
    it('should display loading indicator when loading', () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: null,
          venue: '',
          venueSource: 'unknown',
          confidence: 'none',
          loading: true,
        },
      })

      expect(wrapper.text()).toContain('...')
      expect(wrapper.find('.rank-badge--loading').exists()).toBe(true)
    })
  })

  describe('Error State', () => {
    it('should display error indicator when error occurs', () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: null,
          venue: '',
          venueSource: 'unknown',
          confidence: 'none',
          error: 'Network error',
        },
      })

      expect(wrapper.text()).toContain('!')
      expect(wrapper.find('.rank-badge--error').exists()).toBe(true)
    })
  })

  describe('Tooltip (Requirement 4.6)', () => {
    it('should show tooltip on mouseenter', async () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: 'A',
          venue: 'CVPR',
          venueSource: 'page',
          confidence: 'exact',
        },
      })

      // Initially tooltip should not be visible
      expect(wrapper.find('.rank-badge__tooltip').exists()).toBe(false)

      // Trigger mouseenter
      await wrapper.trigger('mouseenter')

      // Tooltip should now be visible
      expect(wrapper.find('.rank-badge__tooltip').exists()).toBe(true)
    })

    it('should hide tooltip on mouseleave', async () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: 'A',
          venue: 'CVPR',
          venueSource: 'page',
          confidence: 'exact',
        },
      })

      // Show tooltip
      await wrapper.trigger('mouseenter')
      expect(wrapper.find('.rank-badge__tooltip').exists()).toBe(true)

      // Hide tooltip
      await wrapper.trigger('mouseleave')
      expect(wrapper.find('.rank-badge__tooltip').exists()).toBe(false)
    })

    it('should display venue in tooltip', async () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: 'A',
          venue: 'CVPR 2024',
          venueSource: 'comment',
          confidence: 'exact',
        },
      })

      await wrapper.trigger('mouseenter')
      const tooltip = wrapper.find('.rank-badge__tooltip')
      expect(tooltip.text()).toContain('CVPR 2024')
    })

    it('should display source in tooltip (Requirement 4.5)', async () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: 'A',
          venue: 'CVPR',
          venueSource: 'comment',
          confidence: 'exact',
        },
      })

      await wrapper.trigger('mouseenter')
      const tooltip = wrapper.find('.rank-badge__tooltip')
      expect(tooltip.text()).toContain('Comments')
    })

    it('should display DBLP source correctly', async () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: 'A',
          venue: 'CVPR',
          venueSource: 'dblp',
          confidence: 'exact',
        },
      })

      await wrapper.trigger('mouseenter')
      const tooltip = wrapper.find('.rank-badge__tooltip')
      expect(tooltip.text()).toContain('DBLP')
    })

    it('should display confidence level in tooltip', async () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: 'A',
          venue: 'CVPR',
          venueSource: 'page',
          confidence: 'partial',
        },
      })

      await wrapper.trigger('mouseenter')
      const tooltip = wrapper.find('.rank-badge__tooltip')
      expect(tooltip.text()).toContain('部分匹配')
    })

    it('should display DBLP link when dblpUrl is provided', async () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: 'A',
          venue: 'CVPR',
          venueSource: 'dblp',
          confidence: 'exact',
          dblpUrl: 'https://dblp.org/rec/conf/cvpr/2024',
        },
      })

      await wrapper.trigger('mouseenter')
      const link = wrapper.find('.rank-badge__tooltip-link')
      expect(link.exists()).toBe(true)
      expect(link.attributes('href')).toBe('https://dblp.org/rec/conf/cvpr/2024')
    })

    it('should display loading message in tooltip when loading', async () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: null,
          venue: '',
          venueSource: 'unknown',
          confidence: 'none',
          loading: true,
        },
      })

      await wrapper.trigger('mouseenter')
      const tooltip = wrapper.find('.rank-badge__tooltip')
      expect(tooltip.text()).toContain('正在查询')
    })

    it('should display error message in tooltip when error', async () => {
      const wrapper = mount(RankBadge, {
        props: {
          rank: null,
          venue: '',
          venueSource: 'unknown',
          confidence: 'none',
          error: 'Connection timeout',
        },
      })

      await wrapper.trigger('mouseenter')
      const tooltip = wrapper.find('.rank-badge__tooltip')
      expect(tooltip.text()).toContain('Connection timeout')
    })
  })

  describe('CSS Classes', () => {
    it('should apply correct class for each rank', () => {
      const ranks = ['A', 'B', 'C'] as const
      const expectedClasses = ['rank-badge--a', 'rank-badge--b', 'rank-badge--c']

      ranks.forEach((rank, index) => {
        const wrapper = mount(RankBadge, {
          props: {
            rank,
            venue: 'Test',
            venueSource: 'page',
            confidence: 'exact',
          },
        })

        expect(wrapper.find(`.${expectedClasses[index]}`).exists()).toBe(true)
      })
    })
  })
})
