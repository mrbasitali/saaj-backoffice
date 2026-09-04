export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  if (!auth.user) {
    try {
      await auth.fetchMe()
    } catch {
      auth.clearSession()
    }
  }

  if (auth.user) {
    return navigateTo('/')
  }
})
