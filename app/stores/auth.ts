export type SaajUser = {
  id: number
  name: string
  email: string
  is_active: boolean
  roles: string[]
  created_at: string | null
  updated_at: string | null
}

type LoginResponse = {
  message: string
  user: SaajUser
}

type MeResponse = {
  user: SaajUser
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<SaajUser | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => user.value !== null)

  function clearSession() {
    user.value = null
  }

  async function login(email: string, password: string) {
    const { $api } = useNuxtApp()

    loading.value = true

    try {
      const response = await $api<LoginResponse>('/login', {
        method: 'POST',
        body: {
          email,
          password,
        },
      })

      user.value = response.user
      return response
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    const { $api } = useNuxtApp()
    const response = await $api<MeResponse>('/me')

    user.value = response.user
    return response.user
  }

  async function logout() {
    const { $api } = useNuxtApp()

    try {
      await $api('/logout', {
        method: 'POST',
      })
    } catch (error: any) {
      const status = Number(error?.response?.status ?? error?.statusCode ?? error?.status ?? 0)

      // A 401 means the server-side login is already gone. Network/server
      // failures are rethrown so the UI never claims a live session ended.
      if (status !== 401) throw error
    }

    clearSession()
    await navigateTo('/login')
  }

  function hasRole(...roles: string[]) {
    return user.value?.roles.some(role => roles.includes(role)) ?? false
  }

  function setUser(nextUser: SaajUser) {
    user.value = nextUser
  }

  return {
    user,
    loading,
    isLoggedIn,
    login,
    fetchMe,
    logout,
    hasRole,
    setUser,
    clearSession,
  }
})
