export type SecurePdfQueryValue = string | number | boolean | null | undefined

export type SecurePdfRequest = {
  endpoint: string
  filename: string
  title: string
  description?: string
  errorFallback?: string
  query?: Record<string, SecurePdfQueryValue>
}

type SecurePdfStatus = 'idle' | 'loading' | 'ready' | 'error'

type SecurePdfState = {
  open: boolean
  nonce: number
  status: SecurePdfStatus
  request: SecurePdfRequest | null
}

export function useSecurePdf() {
  const state = useState<SecurePdfState>('secure-pdf-workspace', () => ({
    open: false,
    nonce: 0,
    status: 'idle',
    request: null,
  }))

  function openPdf(request: SecurePdfRequest) {
    if (!import.meta.client) return

    state.value = {
      open: true,
      nonce: state.value.nonce + 1,
      status: 'loading',
      request,
    }
  }

  function closePdf() {
    state.value.open = false
    state.value.status = 'idle'
    state.value.request = null
  }

  return {
    state,
    openPdf,
    closePdf,
  }
}
