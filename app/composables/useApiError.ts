/**
 * Every admin API error follows the same shape from the backend's
 * catch-all exception handler: a generic top-level `message`, and —
 * for validation-style errors — a more specific `errors` object keyed
 * by field (or a synthetic key like "stock" that has no matching form
 * input at all). Reading only `error.data.message` silently discards
 * that specific detail, which is exactly what happened with
 * "Insufficient stock for X. Available: 10, required: 50." collapsing
 * into a useless "Validation failed." on screen — the backend was
 * doing the right thing the whole time, the frontend just never looked
 * at where the real detail was.
 *
 * Use this anywhere an API error gets shown to the user, instead of
 * `error?.data?.message || 'fallback'` directly.
 */
export function extractApiErrorMessage(error: any, fallback: string): string {
  const fieldErrors = error?.data?.errors || {}
  const firstFieldError = Object.values(fieldErrors)[0]
  const specificMessage = Array.isArray(firstFieldError) ? firstFieldError[0] : firstFieldError

  return specificMessage || error?.data?.message || fallback
}

export async function extractBlobApiErrorMessage(error: any, fallback: string): Promise<string> {
  const data = error?.data

  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text())
      const firstFieldError = Object.values(parsed?.errors || {})[0]
      const specificMessage = Array.isArray(firstFieldError) ? firstFieldError[0] : firstFieldError

      return specificMessage || parsed?.message || fallback
    } catch {
      return fallback
    }
  }

  return extractApiErrorMessage(error, fallback)
}
