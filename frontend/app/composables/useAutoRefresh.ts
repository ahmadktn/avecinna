import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useAuth } from './useAuth'

// Global reactive refresh counter triggered when sensitive EMR state changes
// (e.g. Ward switch, Break-Glass unlock, Vitals saved, Encounter signed, Bed reallocated)
export const globalRefreshCounter = ref(0)
export const lastRefreshTimestamp = ref(Date.now())

/**
 * Trigger an immediate data re-fetch across all active views and components
 */
export const triggerGlobalRefresh = () => {
  globalRefreshCounter.value++
  lastRefreshTimestamp.value = Date.now()
}

export interface AutoRefreshOptions {
  /**
   * Background polling interval in milliseconds.
   * Default: 20000ms (20 seconds). Set to 0 or null to disable polling.
   */
  interval?: number | null
  /**
   * Run the load function immediately on component mount. Default: true.
   */
  immediate?: boolean
  /**
   * Automatically re-fetch data when user switches back to this browser tab. Default: true.
   */
  refreshOnVisibility?: boolean
  /**
   * Automatically re-fetch data when active ward is switched. Default: true.
   */
  refreshOnWardChange?: boolean
}

/**
 * Composable that keeps pages and components synchronized with real-time EMR changes:
 * 1. Immediate re-fetch when active ward changes
 * 2. Instant re-fetch when global refresh events fire (vitals recorded, break-glass, consult grants)
 * 3. Tab focus/visibility restoration re-fetch
 * 4. Periodic background polling while tab is visible
 */
export const useAutoRefresh = (
  loadFn: () => Promise<any> | any,
  options: AutoRefreshOptions = {}
) => {
  const {
    interval = 20000,
    immediate = true,
    refreshOnVisibility = true,
    refreshOnWardChange = true,
  } = options

  const auth = useAuth()
  let timer: ReturnType<typeof setInterval> | null = null
  let isFetching = false

  const safeExecute = async () => {
    if (isFetching) return
    isFetching = true
    try {
      await loadFn()
    } catch {
      // Individual loadFn handles its own errors
    } finally {
      isFetching = false
    }
  }

  const onVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      safeExecute()
    }
  }

  onMounted(() => {
    if (immediate) {
      safeExecute()
    }

    // Background interval polling (only runs when tab is actively visible)
    if (interval && interval > 0 && typeof window !== 'undefined') {
      timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          safeExecute()
        }
      }, interval)
    }

    // Re-sync when switching back to tab
    if (refreshOnVisibility && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  })

  // Watch for active ward changes (immediate re-fetch)
  if (refreshOnWardChange) {
    watch(
      () => auth.activeWard.value?.id,
      (newId, oldId) => {
        if (newId && newId !== oldId) {
          safeExecute()
        }
      }
    )
  }

  // Watch for global refresh signals (break-glass, admissions, vitals)
  watch(
    () => globalRefreshCounter.value,
    () => {
      safeExecute()
    }
  )

  // Cleanup timers & listeners on unmount
  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (refreshOnVisibility && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })

  return {
    refresh: safeExecute,
    triggerGlobalRefresh,
  }
}
