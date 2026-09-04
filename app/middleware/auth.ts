export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  if (!auth.user) {
    try {
      await auth.fetchMe()
    } catch (error: any) {
      const status = Number(error?.response?.status ?? error?.statusCode ?? error?.status ?? 0)

      // Only an authentication response proves the session ended. A temporary
      // network/server failure must not masquerade as a forced sign-in.
      if (status !== 401) throw error

      auth.clearSession()
      return navigateTo('/login')
    }
  }
})
