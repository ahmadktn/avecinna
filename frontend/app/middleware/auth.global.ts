export default defineNuxtRouteMiddleware(async (to) => {
  // 1. Allow unauthenticated access to the login page
  if (to.path === '/login') {
    return
  }

  // 2. On client-side navigation, enforce authentication
  if (import.meta.client) {
    const auth = useAuth()
    const savedToken = localStorage.getItem('avecinna_token')

    // If no token exists in local storage, redirect immediately to login
    if (!savedToken) {
      return navigateTo('/login')
    }

    // If token exists but user session state is not loaded, initialize session
    if (!auth.isAuthenticated.value) {
      await auth.initSession()
    }

    // If session verification failed or token expired, redirect to login
    if (!auth.isAuthenticated.value) {
      return navigateTo('/login')
    }
  }
})
