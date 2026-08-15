export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const token = useCookie<string | null>('saaj_token')
  const loadingIndicator = useLoadingIndicator()

  let activeRequests = 0

  function startLoading() {
    activeRequests++

    if (activeRequests === 1) {
      loadingIndicator.start({ force: true })
    }
  }

  function stopLoading(error = false) {
    activeRequests = Math.max(0, activeRequests - 1)

    if (activeRequests === 0) {
      if (error) {
        loadingIndicator.finish({ error: true })
      } else {
        loadingIndicator.finish()
      }
    }
  }

  const api = $fetch.create({
    baseURL: config.public.apiBase,

    onRequest({ options }) {
      startLoading()

      const headers = new Headers(options.headers)

      headers.set('Accept', 'application/json')

      if (token.value) {
        headers.set('Authorization', `Bearer ${token.value}`)
      }

      options.headers = headers
    },

    onResponse() {
      stopLoading()
    },

    async onResponseError({ response }) {
      stopLoading(true)

      if (response.status === 401) {
        token.value = null

        if (import.meta.client) {
          await navigateTo('/login')
        }
      }
    },
  })

  return {
    provide: {
      api,
    },
  }
})