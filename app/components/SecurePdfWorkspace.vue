<script setup lang="ts">
const { $api } = useNuxtApp()
const { state, closePdf } = useSecurePdf()

const pdfFile = shallowRef<File | null>(null)
const exportFile = shallowRef<File | null>(null)
const objectUrl = ref('')
const errorMessage = ref('')
const actionMessage = ref('')
const printFrame = ref<HTMLIFrameElement | null>(null)
const printReady = ref(false)
const sharing = ref(false)
const printing = ref(false)
const downloadNameOpen = ref(false)
const downloadName = ref('')
const downloadNameError = ref('')
const downloadNameInput = ref<{ focus: () => void } | null>(null)
let abortController: AbortController | null = null

const request = computed(() => state.value.request)
const fileSize = computed(() => {
  const bytes = pdfFile.value?.size || 0
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

const preparedDownloadFilename = computed(() => safeFilename(downloadName.value))

const canShareFile = computed(() => {
  if (!import.meta.client || !exportFile.value || !navigator.share || !navigator.canShare) return false

  try {
    return navigator.canShare({ files: [exportFile.value] })
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
  window.removeEventListener('keydown', interceptDownloadEscape, true)
  releasePdf()
  closePdf()
})

onMounted(() => {
  window.addEventListener('keydown', interceptDownloadEscape, true)
})

function safeFilename(value: string) {
  let safe = value
    .replace(/\.pdf$/i, '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .trim()

  // Array.from truncates by Unicode code point, avoiding a broken surrogate
  // pair when an administrator uses Urdu text or emoji in a file name.
  safe = Array.from(safe).slice(0, 140).join('').trim()

  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe)) {
    safe = `document-${safe}`
  }

  return `${safe || 'document'}.pdf`
}

function filenameStem(value: string) {
  return value.replace(/\.pdf$/i, '')
}

function releasePdf() {
  abortController?.abort()
  abortController = null

  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)

  objectUrl.value = ''
  pdfFile.value = null
  exportFile.value = null
  errorMessage.value = ''
  actionMessage.value = ''
  printReady.value = false
  sharing.value = false
  printing.value = false
  downloadNameOpen.value = false
  downloadName.value = ''
  downloadNameError.value = ''
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
    exportFile.value = file
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
  if (downloadNameOpen.value) {
    closeDownloadDialog()
    return
  }

  releasePdf()
  closePdf()
}

function interceptDownloadEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !downloadNameOpen.value) return

  event.preventDefault()
  event.stopImmediatePropagation()
  closeDownloadDialog()
}

async function openDownloadDialog() {
  if (!exportFile.value) return

  downloadName.value = filenameStem(exportFile.value.name)
  downloadNameError.value = ''
  downloadNameOpen.value = true
  await nextTick()
  downloadNameInput.value?.focus()
}

function closeDownloadDialog() {
  downloadNameOpen.value = false
  downloadNameError.value = ''
}

function confirmDownload() {
  if (!objectUrl.value || !pdfFile.value) return

  const rawStem = downloadName.value.replace(/\.pdf$/i, '').trim()
  if (!rawStem) {
    downloadNameError.value = 'Enter a file name.'
    downloadNameInput.value?.focus()
    return
  }

  const filename = safeFilename(rawStem)
  exportFile.value = new File([pdfFile.value], filename, {
    type: 'application/pdf',
    lastModified: pdfFile.value.lastModified,
  })

  const anchor = document.createElement('a')
  anchor.href = objectUrl.value
  anchor.download = filename
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  closeDownloadDialog()
  actionMessage.value = `Downloaded as ${filename}`
}

async function sharePdf() {
  if (!exportFile.value) return

  if (!canShareFile.value) {
    actionMessage.value = 'Direct file sharing is unavailable in this browser. Download a named copy, then attach it in WhatsApp or your preferred app.'
    await openDownloadDialog()
    return
  }

  sharing.value = true
  actionMessage.value = ''

  try {
    // Supplying only the file avoids injecting document titles such as
    // "80mm receipt" into WhatsApp's message field. The File name remains
    // available to the receiving app.
    await navigator.share({
      files: [exportFile.value],
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
  if (!objectUrl.value || !printReady.value) return

  printing.value = true
  actionMessage.value = ''

  try {
    const frameWindow = printFrame.value?.contentWindow
    if (!frameWindow) throw new Error('PDF print frame is unavailable.')

    frameWindow.focus()
    frameWindow.print()
  } catch {
    actionMessage.value = 'This browser could not open its print sheet. Use Share and choose Print, or download the PDF and print it from Files.'
  } finally {
    window.setTimeout(() => { printing.value = false }, 500)
  }
}

function onPreviewError(message: string) {
  actionMessage.value = message
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

        <div v-if="exportFile" class="min-w-0 text-right">
          <p class="max-w-[420px] truncate text-[11px] font-medium text-gray-600 dark:text-gray-300">{{ exportFile.name }}</p>
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
        <SecurePdfCanvasViewer
          v-if="pdfFile"
          :file="pdfFile"
          @error="onPreviewError"
        />

        <!-- Kept off-screen solely for the browser's native multi-page print
             pipeline. The visible viewer never exposes the blob URL toolbar. -->
        <iframe
          ref="printFrame"
          :src="objectUrl"
          title="PDF print source"
          class="pointer-events-none fixed -left-[10000px] top-0 h-px w-px opacity-0"
          referrerpolicy="no-referrer"
          tabindex="-1"
          aria-hidden="true"
          @load="printReady = true"
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

        <div class="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <AppButton
            v-if="state.status === 'ready'"
            variant="secondary"
            :disabled="sharing || printing"
            @click="openDownloadDialog"
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
            :disabled="sharing || !printReady"
            @click="printPdf"
          >
            {{ printReady ? 'Print' : 'Preparing…' }}
          </AppButton>
        </div>
      </div>
    </template>
  </AppModal>

  <AppModal
    :open="downloadNameOpen"
    title="Download PDF"
    description="Confirm the suggested file name or enter a clearer one for this copy."
    max-width="max-w-md"
    @close="closeDownloadDialog"
  >
    <form class="px-4 py-5" @submit.prevent="confirmDownload">
      <AppInput
        ref="downloadNameInput"
        v-model="downloadName"
        label="File name"
        autocomplete="off"
        :error="downloadNameError"
        @input="downloadNameError = ''"
      >
        <template #suffix><span class="text-[12px] font-medium">.pdf</span></template>
      </AppInput>

      <div class="mt-3 rounded-[10px] bg-gray-950/[0.035] px-3 py-2.5 dark:bg-white/[0.045]">
        <p class="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">Download as</p>
        <p class="mt-1 break-all text-[12px] font-medium text-gray-700 dark:text-gray-300">{{ preparedDownloadFilename }}</p>
      </div>

      <button type="submit" class="sr-only">Download PDF</button>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <AppButton variant="ghost" @click="closeDownloadDialog">Cancel</AppButton>
        <AppButton @click="confirmDownload">Download</AppButton>
      </div>
    </template>
  </AppModal>
</template>
