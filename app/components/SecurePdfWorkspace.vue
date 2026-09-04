<script setup lang="ts">
const { $api } = useNuxtApp()
const { state, closePdf } = useSecurePdf()

const pdfFile = shallowRef<File | null>(null)
const objectUrl = ref('')
const errorMessage = ref('')
const actionMessage = ref('')
const previewFrame = ref<HTMLIFrameElement | null>(null)
const previewReady = ref(false)
const sharing = ref(false)
const printing = ref(false)
let abortController: AbortController | null = null

const request = computed(() => state.value.request)
const fileSize = computed(() => {
  const bytes = pdfFile.value?.size || 0
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

const canShareFile = computed(() => {
  if (!import.meta.client || !pdfFile.value || !navigator.share || !navigator.canShare) return false

  try {
    return navigator.canShare({ files: [pdfFile.value] })
  } catch {
    return false
  }
})

watch(
  () => [state.value.open, state.value.nonce] as const,
  ([open]) => {
    if (open) loadPdf()
    else releasePdf()
  },
)

onBeforeUnmount(() => {
  releasePdf()
  closePdf()
})

function safeFilename(value: string) {
  const withoutExtension = value.replace(/\.pdf$/i, '')
  const safe = withoutExtension
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 150)

  return `${safe || 'document'}.pdf`
}

function releasePdf() {
  abortController?.abort()
  abortController = null

  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)

  objectUrl.value = ''
  pdfFile.value = null
  errorMessage.value = ''
  actionMessage.value = ''
  previewReady.value = false
  sharing.value = false
  printing.value = false
}

async function loadPdf() {
  const activeRequest = request.value
  const activeNonce = state.value.nonce
  if (!activeRequest) return

  releasePdf()
  state.value.status = 'loading'
  abortController = new AbortController()

  try {
    const result = await $api<Blob>(activeRequest.endpoint, {
      query: activeRequest.query,
      responseType: 'blob',
      cache: 'no-store',
      signal: abortController.signal,
    })

    if (!state.value.open || state.value.nonce !== activeNonce) return

    const blob = result instanceof Blob
      ? result
      : new Blob([result], { type: 'application/pdf' })

    if (blob.size === 0 || await blob.slice(0, 5).text() !== '%PDF-') {
      throw new Error('The server did not return a valid PDF document.')
    }

    const file = new File([blob], safeFilename(activeRequest.filename), {
      type: 'application/pdf',
      lastModified: Date.now(),
    })

    pdfFile.value = file
    objectUrl.value = URL.createObjectURL(file)
    state.value.status = 'ready'
  } catch (error: any) {
    if (error?.name === 'AbortError' || !state.value.open || state.value.nonce !== activeNonce) return

    errorMessage.value = error?.message === 'The server did not return a valid PDF document.'
      ? error.message
      : await extractBlobApiErrorMessage(
          error,
          activeRequest.errorFallback || 'Could not prepare this PDF. Please try again.',
        )
    state.value.status = 'error'
  } finally {
    if (state.value.nonce === activeNonce) abortController = null
  }
}

function close() {
  releasePdf()
  closePdf()
}

function openInNewTab() {
  if (!objectUrl.value) return

  const popup = window.open(objectUrl.value, '_blank')
  if (!popup) {
    actionMessage.value = 'Your browser blocked the new tab. You can still print, share, or download from this window.'
    return
  }

  try {
    popup.opener = null
  } catch {
    // The PDF still opened. Some browsers isolate the new tab before
    // JavaScript can explicitly clear its opener reference.
  }
}

function downloadPdf() {
  if (!objectUrl.value || !pdfFile.value) return

  const anchor = document.createElement('a')
  anchor.href = objectUrl.value
  anchor.download = pdfFile.value.name
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  actionMessage.value = `Downloaded as ${pdfFile.value.name}`
}

async function sharePdf() {
  if (!pdfFile.value) return

  if (!canShareFile.value) {
    downloadPdf()
    actionMessage.value = 'Your browser does not provide secure file sharing. The correctly named PDF was downloaded so you can attach it manually.'
    return
  }

  sharing.value = true
  actionMessage.value = ''

  try {
    await navigator.share({
      files: [pdfFile.value],
      title: request.value?.title || pdfFile.value.name,
    })
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      actionMessage.value = 'Sharing was not completed. You can download the PDF and attach it manually.'
    }
  } finally {
    sharing.value = false
  }
}

function printPdf() {
  if (!objectUrl.value) return

  printing.value = true
  actionMessage.value = ''

  try {
    const frameWindow = previewFrame.value?.contentWindow
    if (!frameWindow) throw new Error('PDF preview is unavailable.')

    frameWindow.focus()
    frameWindow.print()
  } catch {
    openInNewTab()
    actionMessage.value = 'The PDF opened in the browser viewer. Choose Print from the browser menu.'
  } finally {
    window.setTimeout(() => { printing.value = false }, 500)
  }
}
</script>

<template>
  <AppModal
    :open="state.open"
    :title="request?.title || 'PDF document'"
    :description="request?.description || 'Private document — review it before printing, sharing, or downloading.'"
    max-width="max-w-[1180px]"
    @close="close"
  >
    <div class="px-4 py-4 sm:px-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/[0.08] px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Session protected
          </span>
          <span class="text-[11px] text-gray-400 dark:text-gray-500">Not stored in browser cache</span>
          <span class="basis-full text-[11px] text-gray-400 dark:text-gray-500 sm:basis-auto">Downloads and shares create a device copy</span>
        </div>

        <div v-if="pdfFile" class="min-w-0 text-right">
          <p class="max-w-[420px] truncate text-[11px] font-medium text-gray-600 dark:text-gray-300">{{ pdfFile.name }}</p>
          <p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-600">{{ fileSize }}</p>
        </div>
      </div>

      <div
        v-if="state.status === 'loading'"
        class="flex min-h-[52dvh] items-center justify-center rounded-[16px] bg-gray-950/[0.025] dark:bg-white/[0.035]"
      >
        <div class="max-w-sm px-6 text-center">
          <span class="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-white/15 dark:border-t-white" />
          <p class="mt-4 text-[13px] font-semibold text-gray-800 dark:text-gray-200">Preparing secure PDF…</p>
          <p class="mt-1.5 text-[12px] leading-5 text-gray-400 dark:text-gray-500">The document stays inside your authenticated session.</p>
        </div>
      </div>

      <div
        v-else-if="state.status === 'error'"
        class="flex min-h-[42dvh] items-center justify-center rounded-[16px] bg-red-500/[0.045] px-6 text-center dark:bg-red-500/[0.07]"
      >
        <div class="max-w-md">
          <div class="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-300">
            <AppNavIcon name="document" :size="20" />
          </div>
          <p class="mt-3 text-[13px] font-semibold text-red-700 dark:text-red-300">PDF could not be prepared</p>
          <p class="mt-1.5 text-[12px] leading-5 text-red-600/80 dark:text-red-300/75">{{ errorMessage }}</p>
          <AppButton class="mt-4" variant="secondary" size="sm" @click="loadPdf">Try again</AppButton>
        </div>
      </div>

      <template v-else-if="state.status === 'ready' && objectUrl">
        <iframe
          ref="previewFrame"
          :src="objectUrl"
          :title="request?.title || 'PDF preview'"
          class="h-[56dvh] min-h-[360px] w-full rounded-[16px] bg-gray-100 dark:bg-white/[0.045]"
          referrerpolicy="no-referrer"
          @load="previewReady = true"
        />

        <p
          v-if="actionMessage"
          class="mt-3 rounded-[10px] bg-blue-500/[0.07] px-3 py-2.5 text-[12px] text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
        >
          {{ actionMessage }}
        </p>
      </template>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <AppButton variant="ghost" :disabled="sharing || printing" @click="close">Close</AppButton>

        <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <AppButton
            v-if="state.status === 'ready'"
            variant="secondary"
            :disabled="sharing || printing"
            @click="openInNewTab"
          >
            Open separately
          </AppButton>
          <AppButton
            v-if="state.status === 'ready'"
            variant="secondary"
            :disabled="sharing || printing"
            @click="downloadPdf"
          >
            Download
          </AppButton>
          <AppButton
            v-if="state.status === 'ready'"
            variant="secondary"
            :loading="sharing"
            :disabled="printing"
            @click="sharePdf"
          >
            {{ canShareFile ? 'Share' : 'Save to share' }}
          </AppButton>
          <AppButton
            v-if="state.status === 'ready'"
            :loading="printing"
            :disabled="sharing || !previewReady"
            @click="printPdf"
          >
            {{ previewReady ? 'Print' : 'Previewing…' }}
          </AppButton>
        </div>
      </div>
    </template>
  </AppModal>
</template>
