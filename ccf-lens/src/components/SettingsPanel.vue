<script setup lang="ts">
/**
 * SettingsPanel Component
 * 
 * Provides user settings interface for CCF rank display configuration.
 * 
 * Requirements:
 * - 5.1: Show settings interface when user clicks settings button
 * - 5.2: Allow user to select which CCF ranks to display (A/B/C/all)
 * - 5.3: Allow user to enable/disable specific site support
 * - 5.4: Allow user to select badge display position
 */

import { ref, watch, onMounted } from 'vue'
import { getSettingsStore, type BadgePosition } from '../stores/settings-store'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const settingsStore = getSettingsStore()

// Local reactive copies for form binding
const showRanks = ref({
  A: true,
  B: true,
  C: true,
  unknown: true,
})

const enabledSites = ref({
  arxiv: true,
  dblp: true,
  ieee: true,
})

const badgePosition = ref<BadgePosition>('after-title')
const debugMode = ref(false)
const statsExpanded = ref(false)

// Load settings on mount
onMounted(async () => {
  await settingsStore.load()
  syncFromStore()
})

/**
 * Sync local state from store
 */
function syncFromStore() {
  const settings = settingsStore.settings
  showRanks.value = { ...settings.showRanks }
  enabledSites.value = { ...settings.enabledSites }
  badgePosition.value = settings.badgePosition
  debugMode.value = settings.debugMode
  statsExpanded.value = settings.statsExpanded
}

/**
 * Save settings to store (batch update to avoid multiple saves)
 */
function saveSettings() {
  settingsStore.batchUpdate({
    showRanks: { ...showRanks.value },
    enabledSites: { ...enabledSites.value },
    badgePosition: badgePosition.value,
    debugMode: debugMode.value,
    statsExpanded: statsExpanded.value,
  })
}

/**
 * Reset to default settings
 */
function resetSettings() {
  settingsStore.reset()
  syncFromStore()
}

/**
 * Handle close button click
 */
function handleClose() {
  emit('close')
}

// Auto-save on changes (Requirement 5.5)
watch([showRanks, enabledSites, badgePosition, debugMode, statsExpanded], () => {
  saveSettings()
}, { deep: true })

/**
 * Badge position options
 */
const positionOptions = [
  { value: 'after-title', label: '标题后' },
  { value: 'after-authors', label: '作者后' },
  { value: 'inline', label: '行内' },
]

/**
 * Site options with display names
 */
const siteOptions = [
  { key: 'arxiv', label: 'arXiv' },
  { key: 'dblp', label: 'DBLP' },
  { key: 'ieee', label: 'IEEE Xplore' },
] as const

/**
 * Rank options with colors
 */
const rankOptions = [
  { key: 'A', label: 'CCF-A', color: '#dc3545' },
  { key: 'B', label: 'CCF-B', color: '#fd7e14' },
  { key: 'C', label: 'CCF-C', color: '#0d6efd' },
  { key: 'unknown', label: '未知', color: '#6c757d' },
] as const
</script>

<template>
  <div class="settings-panel">
    <div class="settings-panel__header">
      <h3 class="settings-panel__title">CCF Rank 设置</h3>
      <button
        class="settings-panel__close"
        @click="handleClose"
        aria-label="关闭设置"
      >
        ×
      </button>
    </div>

    <div class="settings-panel__content">
      <!-- Rank Filter Section (Requirement 5.2) -->
      <section class="settings-section">
        <h4 class="settings-section__title">显示等级</h4>
        <div class="settings-section__options">
          <label
            v-for="rank in rankOptions"
            :key="rank.key"
            class="checkbox-label"
          >
            <input
              v-model="showRanks[rank.key]"
              type="checkbox"
              class="checkbox-input"
            />
            <span
              class="checkbox-badge"
              :style="{ backgroundColor: rank.color }"
            >
              {{ rank.label }}
            </span>
          </label>
        </div>
      </section>

      <!-- Site Enable Section (Requirement 5.3) -->
      <section class="settings-section">
        <h4 class="settings-section__title">启用站点</h4>
        <div class="settings-section__options">
          <label
            v-for="site in siteOptions"
            :key="site.key"
            class="checkbox-label"
          >
            <input
              v-model="enabledSites[site.key]"
              type="checkbox"
              class="checkbox-input"
            />
            <span class="checkbox-text">{{ site.label }}</span>
          </label>
        </div>
      </section>

      <!-- Badge Position Section (Requirement 5.4) -->
      <section class="settings-section">
        <h4 class="settings-section__title">显示位置</h4>
        <div class="settings-section__options settings-section__options--vertical">
          <label
            v-for="option in positionOptions"
            :key="option.value"
            class="radio-label"
          >
            <input
              v-model="badgePosition"
              type="radio"
              :value="option.value"
              class="radio-input"
            />
            <span class="radio-text">{{ option.label }}</span>
          </label>
        </div>
      </section>

      <!-- Advanced Settings -->
      <section class="settings-section">
        <h4 class="settings-section__title">高级设置</h4>
        <div class="settings-section__options settings-section__options--vertical">
          <label class="checkbox-label">
            <input
              v-model="statsExpanded"
              type="checkbox"
              class="checkbox-input"
            />
            <span class="checkbox-text">默认展开统计面板</span>
          </label>
          <label class="checkbox-label">
            <input
              v-model="debugMode"
              type="checkbox"
              class="checkbox-input"
            />
            <span class="checkbox-text">调试模式</span>
          </label>
        </div>
      </section>
    </div>

    <div class="settings-panel__footer">
      <button
        class="settings-btn settings-btn--secondary"
        @click="resetSettings"
      >
        重置默认
      </button>
      <button
        class="settings-btn settings-btn--primary"
        @click="handleClose"
      >
        完成
      </button>
    </div>
  </div>
</template>


<style scoped>
.settings-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 360px;
  max-width: 90vw;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 10001;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.settings-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.settings-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #212529;
}

.settings-panel__close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 20px;
  color: #6c757d;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, color 0.2s;
}

.settings-panel__close:hover {
  background: #e9ecef;
  color: #212529;
}

.settings-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.settings-section {
  margin-bottom: 20px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section__title {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.settings-section__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings-section__options--vertical {
  flex-direction: column;
  gap: 10px;
}

.checkbox-label,
.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-input,
.radio-input {
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
  accent-color: #0d6efd;
}

.checkbox-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
}

.checkbox-text,
.radio-text {
  font-size: 14px;
  color: #212529;
}

.settings-panel__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.settings-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.settings-btn--primary {
  background: #0d6efd;
  color: #ffffff;
  border: 1px solid #0d6efd;
}

.settings-btn--primary:hover {
  background: #0b5ed7;
  border-color: #0b5ed7;
}

.settings-btn--secondary {
  background: #ffffff;
  color: #6c757d;
  border: 1px solid #dee2e6;
}

.settings-btn--secondary:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}
</style>
