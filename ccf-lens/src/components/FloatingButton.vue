<script setup lang="ts">
/**
 * FloatingButton Component
 * 
 * Provides a floating button to access settings panel.
 * 
 * Requirements:
 * - 5.1: Show settings interface when user clicks settings button
 */

import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'click'): void
}>()

const isHovered = ref(false)

function handleClick() {
  emit('click')
}
</script>

<template>
  <button
    class="floating-button"
    :class="{ 'floating-button--hovered': isHovered }"
    @click="handleClick"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    aria-label="打开 CCF Rank 设置"
    title="CCF Rank 设置"
  >
    <span class="floating-button__icon">⚙️</span>
    <span v-if="isHovered" class="floating-button__text">设置</span>
  </button>
</template>

<style scoped>
.floating-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 48px;
  height: 48px;
  padding: 0 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 24px;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  cursor: pointer;
  z-index: 9998;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: transform 0.2s, box-shadow 0.2s, padding 0.2s;
}

.floating-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.floating-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.floating-button--hovered {
  padding: 0 20px;
}

.floating-button__icon {
  font-size: 20px;
  line-height: 1;
}

.floating-button__text {
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}
</style>
