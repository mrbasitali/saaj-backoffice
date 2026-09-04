type ApiOptions = Record<string, any>

type CsrfResponse = {
  csrf_token: string
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const loadingIndicator = useLoadingIndicator()
  const authStore = useAuthStore()
  const apiBase = String(config.public.apiBase).replace(/\/+$/, '')

  // Remove the former JavaScript-readable bearer token. It is no longer used
  // and the backend migration revokes its server-side credential as well.
  if (import.meta.client) {
    const legacyToken = useCookie<string | null>('saaj_token', {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    legacyToken.value = null
  }

  let activeRequests = 0
  let csrfToken: string | null = null
  let csrfRequest: Promise<string> | null = null

  function startLoading() {
    activeRequests++

    if (activeRequests === 1) {
      loadingIndicator.start({ force: true })
    }
  }

  function stopLoading(error = false) {
    activeRequests = Math.max(0, activeRequests - 1)

    if (activeRequests === 0) {
      error ? loadingIndicator.finish({ error: true }) : loadingIndicator.finish()
    }
  }

  function methodOf(options: ApiOptions) {
    return String(options.method ?? 'GET').toUpperCase()
  }

  async function getCsrfToken(force = false): Promise<string> {
    if (!force && csrfToken) return csrfToken
    if (csrfRequest) return await csrfRequest

    csrfRequest = $fetch<CsrfResponse>('/auth/csrf-token', {
      baseURL: apiBase,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    }).then((response) => {
      if (!response.csrf_token) {
        throw new Error('The API did not return a CSRF token.')
      }

      csrfToken = response.csrf_token
      return response.csrf_token
    }).finally(() => {
      csrfRequest = null
    })

    return await csrfRequest
  }

  const rawApi = $fetch.create({
    baseURL: apiBase,
    credentials: 'include',

    onRequest({ options }) {
      startLoading()

      const headers = new Headers(options.headers)
      headers.set('Accept', 'application/json')
      headers.set('X-Requested-With', 'XMLHttpRequest')

      if (!SAFE_METHODS.has(String(options.method ?? 'GET').toUpperCase()) && csrfToken) {
        headers.set('X-CSRF-TOKEN', csrfToken)
      }

      options.headers = headers
    },

    onResponse() {
      stopLoading()
    },

    async onResponseError({ response }) {
      stopLoading(true)

      if (response.status === 401) {
        authStore.clearSession()

        if (import.meta.client) {
          await navigateTo('/login')
        }
      }
    },
  })

  async function api<T = unknown>(request: string, options: ApiOptions = {}): Promise<T> {
    const unsafe = !SAFE_METHODS.has(methodOf(options))

    if (unsafe) {
      await getCsrfToken()
    }

    try {
      return await rawApi<T>(request, options)
    } catch (error: any) {
      const status = Number(error?.response?.status ?? error?.statusCode ?? error?.status ?? 0)

      // A session may rotate after login, logout, or password changes. Fetch a
      // fresh CSRF token and replay this one request once; never loop forever.
      if (unsafe && status === 419) {
        await getCsrfToken(true)
        return await rawApi<T>(request, options)
      }

      throw error
    }
  }

  return {
    provide: {
      api,
    },
  }
})
