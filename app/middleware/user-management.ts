export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()

  if (!auth.hasRole('super_admin', 'admin')) {
    return navigateTo('/')
  }
})
