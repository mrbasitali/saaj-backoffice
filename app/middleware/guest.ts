export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  if (auth.token && !auth.user) {
    try {
      await auth.fetchMe()
    } catch {
      auth.token = null
      auth.user = null
    }
  }

  if (auth.user) {
    return navigateTo('/')
  }
})