export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  if (!auth.token) {
    return navigateTo('/login')
  }

  if (!auth.user) {
    try {
      await auth.fetchMe()
    } catch {
      auth.token = null
      auth.user = null

      return navigateTo('/login')
    }
  }
})