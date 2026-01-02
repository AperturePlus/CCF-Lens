/**
 * useDblpQueue - DBLP查询队列管理
 * 
 * 管理DBLP API请求的并发控制和队列处理
 */

import { ref } from 'vue'

const DBLP_LOOKUP_CONCURRENCY = 2

export function useDblpQueue() {
  const dblpActiveCount = ref(0)
  const dblpQueue: Array<() => Promise<void>> = []
  const dblpInFlight = new Set<string>()
  let processingEpoch = 0

  function enqueueDblpLookup(task: () => Promise<void>): void {
    dblpQueue.push(task)
    void drainDblpQueue()
  }

  function drainDblpQueue(): void {
    while (dblpActiveCount.value < DBLP_LOOKUP_CONCURRENCY && dblpQueue.length > 0) {
      const task = dblpQueue.shift()
      if (!task) continue

      const epochAtStart = processingEpoch
      dblpActiveCount.value++
      task()
        .catch(error => {
          console.warn('[CCF Rank] DBLP task failed:', error)
        })
        .finally(() => {
          dblpActiveCount.value--
          // Only continue draining if epoch hasn't changed (not cancelled)
          // Use setTimeout to avoid potential stack overflow with many tasks
          if (epochAtStart === processingEpoch && dblpQueue.length > 0) {
            setTimeout(drainDblpQueue, 0)
          }
        })
    }
  }

  function clearQueue(): void {
    processingEpoch++
    dblpQueue.length = 0
    dblpInFlight.clear()
  }

  function isInFlight(id: string): boolean {
    return dblpInFlight.has(id)
  }

  function addToInFlight(id: string): void {
    dblpInFlight.add(id)
  }

  function removeFromInFlight(id: string): void {
    dblpInFlight.delete(id)
  }

  function getCurrentEpoch(): number {
    return processingEpoch
  }

  return {
    dblpActiveCount,
    enqueueDblpLookup,
    clearQueue,
    isInFlight,
    addToInFlight,
    removeFromInFlight,
    getCurrentEpoch,
  }
}
