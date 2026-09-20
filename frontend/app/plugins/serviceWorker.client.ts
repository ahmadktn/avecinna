import { defineNuxtPlugin } from '#app'
import { useOfflineStorage } from '../composables/useOfflineStorage'

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  const offlineStorage = useOfflineStorage()

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      // Register Background Sync tag if supported by browser
      if ('sync' in registration) {
        window.addEventListener('online', async () => {
          try {
            await (registration as any).sync.register('avecinna-sync-audit-branch')
          } catch (syncErr) {
            // Fallback: direct composable trigger if sync registration fails
            offlineStorage.triggerBackgroundSync()
          }
        })
      }

      // Listen for messages dispatched by Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'TRIGGER_OFFLINE_SYNC') {
          offlineStorage.triggerBackgroundSync()
        }
      })
    } catch (err: any) {
      console.warn('Service Worker registration skipped or failed:', err.message)
    }
  })
})
