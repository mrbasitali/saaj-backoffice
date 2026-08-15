type SaajUser = {
  id: number
  name: string
  email: string
  roles: string[]
}

type LoginResponse = {
  message: string
  token: string
  user: SaajUser
}

type MeResponse = {
  user: SaajUser
}

export const useAuthStore = defineStore('auth', () => {
  const token = useCookie<string | null>('saaj_token', {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  const user = ref<SaajUser | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => Boolean(token.value && user.value))

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

        token.value = response.token
        user.value = response.user

        return response
    } finally {
        loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) {
      user.value = null
      return null
    }

    const { $api } = useNuxtApp()

    const response = await $api<MeResponse>('/me')

    user.value = response.user

    return response.user
  }

  async function logout() {
    const { $api } = useNuxtApp()

    try {
      if (token.value) {
        await $api('/logout', {
          method: 'POST',
        })
      }
    } finally {
      token.value = null
      user.value = null
      await navigateTo('/login')
    }
  }

  function hasRole(...roles: string[]) {
    return user.value?.roles.some((role) => roles.includes(role)) ?? false
  }

  return {
    token,
    user,
    loading,
    isLoggedIn,
    login,
    fetchMe,
    logout,
    hasRole,
  }
})