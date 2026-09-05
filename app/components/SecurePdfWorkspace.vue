<script setup lang="ts">
import type { PdfMarkupStroke } from '~/utils/pdfMarkup'
import { createMarkedPdfFile } from '~/utils/pdfMarkup'

const { $api } = useNuxtApp()
const { state, closePdf } = useSecurePdf()

const pdfFile = shallowRef<File | null>(null)
const exportFile = shallowRef<File | null>(null)
const markupStrokes = ref<PdfMarkupStroke[]>([])
const exportFilename = ref('')
const objectUrl = ref('')
const printObjectUrl = ref('')
const errorMessage = ref('')
const actionMessage = ref('')
const printFrame = ref<HTMLIFrameElement | null>(null)
const printReady = ref(false)
const sharing = ref(false)
const printing = ref(false)
const preparingFile = ref(false)
const downloadNameOpen = ref(false)
const downloadName = ref('')
const downloadNameError = ref('')
const downloadNameInput = ref<{ focus: () => void } | null>(null)

let abortController: AbortController | null = null
let exportRevision = 0
let preparedRevision = -1
let releasing = false
let printLoadResolve: (() => void) | null = null
let printLoadReject: ((error: Error) => void) | null = null
let printLoadTimer: ReturnType<typeof setTimeout> | null = null

const request = computed(() => state.value.request)
const displayedFile = computed(() => exportFile.value || pdfFile.value)
const displayedFilename = computed(() => exportFilename.value || pdfFile.value?.name || '')
const markupCount = computed(() => markupStrokes.value.length)
const busy = computed(() => sharing.value || printing.value || preparingFile.value)
const fileSize = computed(() => {
  const bytes = displayedFile.value?.size || 0
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

const preparedDownloadFilename = computed(() => safeFilename(downloadName.value))

const canShareFile = computed(() => {
  const candidate = displayedFile.value
  if (!import.meta.client || !candidate || !navigator.share || !navigator.canShare) return false

  try {
    return navigator.canShare({ files: [candidate] })
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

watch(
  markupStrokes,
  () => {
    if (releasing) return

    exportRevision++
    preparedRevision = -1
    exportFile.value = null
    resetPrintSource()
  },
  { flush: 'sync' },
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
  releasing = true
  abortController?.abort()
  abortController = null
  clearPrintWaiter(new Error('PDF workspace closed.'))

  if (printObjectUrl.value && printObjectUrl.value !== objectUrl.value) {
    URL.revokeObjectURL(printObjectUrl.value)
  }
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)

  objectUrl.value = ''
  printObjectUrl.value = ''
  pdfFile.value = null
  exportFile.value = null
  markupStrokes.value = []
  exportFilename.value = ''
  errorMessage.value = ''
  actionMessage.value = ''
  printReady.value = false
  sharing.value = false
  printing.value = false
  preparingFile.value = false
  downloadNameOpen.value = false
  downloadName.value = ''
  downloadNameError.value = ''
  exportRevision = 0
  preparedRevision = -1
  releasing = false
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
    exportFilename.value = file.name
    objectUrl.value = URL.createObjectURL(file)
    printObjectUrl.value = objectUrl.value
    printReady.value = false
    exportRevision = 0
    preparedRevision = 0
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

function openDownloadDialog() {
  if (!pdfFile.value) return

  downloadName.value = filenameStem(displayedFilename.value)
  downloadNameError.value = ''
  downloadNameOpen.value = true
  // Intentionally do not focus the field here. On iPhone that immediately
  // opens the keyboard and covers most of this confirmation dialog.
}

function closeDownloadDialog() {
  if (preparingFile.value) return
  downloadNameOpen.value = false
  downloadNameError.value = ''
}

async function prepareExportFile(filename = displayedFilename.value) {
  const source = pdfFile.value
  if (!source) throw new Error('The source PDF is unavailable.')

  const safeName = safeFilename(filename)
  if (
    exportFile.value
    && preparedRevision === exportRevision
    && exportFile.value.name === safeName
  ) return exportFile.value

  const activeRevision = exportRevision
  const strokeSnapshot = markupStrokes.value.map(stroke => ({
    ...stroke,
    points: stroke.points.map(point => ({ ...point })),
  }))

  preparingFile.value = true

  try {
    const prepared = await createMarkedPdfFile(source, strokeSnapshot, safeName)
    if (activeRevision !== exportRevision) {
      throw new Error('Markup changed while the PDF was being prepared. Please try again.')
    }

    exportFilename.value = safeName
    exportFile.value = prepared
    preparedRevision = activeRevision
    return prepared
  } finally {
    preparingFile.value = false
  }
}

async function confirmDownload() {
  if (!pdfFile.value) return

  const rawStem = downloadName.value.replace(/\.pdf$/i, '').trim()
  if (!rawStem) {
    downloadNameError.value = 'Enter a file name.'
    downloadNameInput.value?.focus()
    return
  }

  const filename = safeFilename(rawStem)
  downloadNameError.value = ''

  try {
    const file = await prepareExportFile(filename)
    const downloadUrl = URL.createObjectURL(file)
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    anchor.download = filename
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000)

    closeDownloadDialog()
    actionMessage.value = markupCount.value
      ? `Downloaded ${filename} with ${markupCount.value} ${markupCount.value === 1 ? 'mark' : 'marks'}.`
      : `Downloaded as ${filename}`
  } catch {
    downloadNameError.value = 'The PDF copy could not be prepared. Your original document is unchanged; please try again.'
  }
}

async function sharePdf() {
  if (!pdfFile.value) return

  if (!canShareFile.value) {
    actionMessage.value = 'Direct file sharing is unavailable in this browser. Download a named copy, then attach it in WhatsApp or your preferred app.'
    openDownloadDialog()
    return
  }

  sharing.value = true
  actionMessage.value = ''

  try {
    const file = await prepareExportFile(displayedFilename.value)
    if (!navigator.canShare?.({ files: [file] })) {
      throw new Error('Prepared file sharing is unavailable.')
    }

    await navigator.share({ files: [file] })
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      actionMessage.value = 'Sharing was not completed. Your original remains unchanged; you can download the marked PDF and attach it manually.'
    }
  } finally {
    sharing.value = false
  }
}

async function printPdf() {
  if (!pdfFile.value) return

  printing.value = true
  actionMessage.value = ''

  try {
    const file = await prepareExportFile(displayedFilename.value)
    await preparePrintFrame(file)

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

function resetPrintSource() {
  clearPrintWaiter(new Error('PDF markup changed.'))

  if (printObjectUrl.value && printObjectUrl.value !== objectUrl.value) {
    URL.revokeObjectURL(printObjectUrl.value)
  }

  printReady.value = false
  printObjectUrl.value = markupStrokes.value.length === 0 ? objectUrl.value : ''
}

async function preparePrintFrame(file: File) {
  if (
    markupStrokes.value.length === 0
    && printObjectUrl.value === objectUrl.value
    && printReady.value
  ) return

  clearPrintWaiter(new Error('A newer print source replaced this one.'))
  if (printObjectUrl.value && printObjectUrl.value !== objectUrl.value) {
    URL.revokeObjectURL(printObjectUrl.value)
  }

  printReady.value = false

  await new Promise<void>((resolve, reject) => {
    printLoadResolve = resolve
    printLoadReject = reject
    printLoadTimer = window.setTimeout(() => {
      clearPrintWaiter(new Error('The browser took too long to prepare the print view.'))
    }, 12_000)
    printObjectUrl.value = URL.createObjectURL(file)
  })
}

function onPrintFrameLoad() {
  if (!printObjectUrl.value) return
  if (printFrame.value?.getAttribute('src') !== printObjectUrl.value) return

  printReady.value = true
  clearPrintWaiter()
}

function onPrintFrameError() {
  printReady.value = false
  clearPrintWaiter(new Error('The browser could not load the print view.'))
}

function clearPrintWaiter(error?: Error) {
  if (printLoadTimer) clearTimeout(printLoadTimer)
  printLoadTimer = null

  const resolve = printLoadResolve
  const reject = printLoadReject
  printLoadResolve = null
  printLoadReject = null

  if (error) reject?.(error)
  else resolve?.()
}

function onPreviewError(message: string) {
  actionMessage.value = message
}
</script>

<template>
  <AppModal
    :open="state.open"
    :title="request?.title || 'PDF document'"
    full-screen
    hide-header
    @close="close"
  >
    <div class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-1 xl:grid-cols-[minmax(0,1fr)_400px]">
      <aside class="relative z-10 flex max-h-[42dvh] min-h-0 flex-col overflow-hidden bg-white/95 shadow-[0_8px_28px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:bg-[#111214]/95 dark:shadow-[0_8px_28px_rgba(0,0,0,0.35)] lg:col-start-2 lg:row-start-1 lg:max-h-none lg:shadow-[-1px_0_0_rgba(17,24,39,0.08)] dark:lg:shadow-[-1px_0_0_rgba(255,255,255,0.07)]">
        <div class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-3 sm:p-4 lg:p-6">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Private document</p>
              <h2 class="mt-1.5 truncate text-[18px] font-semibold tracking-[-0.025em] text-gray-950 dark:text-white lg:mt-2 lg:text-[22px]">
                {{ request?.title || 'PDF document' }}
              </h2>
              <p class="mt-2 hidden text-[12px] leading-5 text-gray-400 dark:text-gray-500 sm:block">
                {{ request?.description || 'Review, mark, print, share, or download this document.' }}
              </p>
            </div>

            <button
              type="button"
              aria-label="Close PDF workspace"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-gray-400 transition hover:bg-gray-950/[0.05] hover:text-gray-900 active:scale-95 dark:text-gray-500 dark:hover:bg-white/[0.07] dark:hover:text-white"
              @click="close"
            >
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2 lg:mt-6 lg:grid-cols-1">
            <div class="rounded-[12px] bg-emerald-500/[0.07] px-3 py-2.5 dark:bg-emerald-500/[0.09]">
              <p class="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Session protected
              </p>
              <p class="mt-1 hidden text-[10px] leading-4 text-emerald-700/65 dark:text-emerald-300/60 lg:block">
                Loaded through your authenticated session and not stored in browser cache.
              </p>
            </div>

            <div class="min-w-0 rounded-[12px] bg-gray-950/[0.035] px-3 py-2.5 dark:bg-white/[0.045]">
              <p class="text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">File</p>
              <p class="mt-1 truncate text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                {{ displayedFilename || 'Preparing document…' }}
              </p>
              <p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                {{ pdfFile ? fileSize : 'Secure PDF' }}
              </p>
            </div>
          </div>

          <div
            v-if="markupCount"
            class="mt-2 rounded-[10px] bg-amber-400/10 px-3 py-2 text-[10px] font-medium text-amber-800 dark:text-amber-200"
          >
            {{ markupCount }} {{ markupCount === 1 ? 'mark' : 'marks' }} will be included when you download, share, or print.
          </div>

          <p
            v-if="actionMessage"
            class="mt-2 rounded-[10px] bg-blue-500/[0.07] px-3 py-2 text-[11px] leading-4 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
          >
            {{ actionMessage }}
          </p>

          <div v-if="state.status === 'ready'" class="mt-3 grid grid-cols-3 gap-2 lg:mt-auto lg:grid-cols-2 lg:pt-6">
            <AppButton
              variant="secondary"
              :disabled="busy"
              @click="openDownloadDialog"
            >
              Download
            </AppButton>
            <AppButton
              variant="secondary"
              :loading="sharing"
              :disabled="printing || preparingFile"
              @click="sharePdf"
            >
              {{ canShareFile ? 'Share' : 'Save' }}
            </AppButton>
            <AppButton
              class="lg:col-span-2"
              :loading="printing"
              :disabled="sharing || preparingFile"
              @click="printPdf"
            >
              Print
            </AppButton>
          </div>

          <p v-if="state.status === 'ready'" class="mt-3 hidden text-[10px] leading-4 text-gray-400 dark:text-gray-600 lg:block">
            Your annotations are applied only to the copy you export. The original PDF remains unchanged.
          </p>
        </div>
      </aside>

      <main class="relative min-h-0 overflow-hidden bg-gray-950/[0.035] dark:bg-white/[0.04] lg:col-start-1 lg:row-start-1">
        <div
          v-if="state.status === 'loading'"
          class="flex h-full min-h-0 items-center justify-center"
        >
          <div class="max-w-sm px-6 text-center">
            <span class="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-white/15 dark:border-t-white" />
            <p class="mt-4 text-[13px] font-semibold text-gray-800 dark:text-gray-200">Preparing secure PDF…</p>
            <p class="mt-1.5 text-[12px] leading-5 text-gray-400 dark:text-gray-500">The document stays inside your authenticated session.</p>
          </div>
        </div>

        <div
          v-else-if="state.status === 'error'"
          class="flex h-full min-h-0 items-center justify-center bg-red-500/[0.045] px-6 text-center dark:bg-red-500/[0.07]"
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

        <SecurePdfCanvasViewer
          v-else-if="state.status === 'ready' && objectUrl && pdfFile"
          v-model="markupStrokes"
          :file="pdfFile"
          :disabled="busy"
          class="h-full min-h-0"
          @error="onPreviewError"
        />

        <iframe
          v-if="printObjectUrl"
          ref="printFrame"
          :src="printObjectUrl"
          title="PDF print source"
          class="pointer-events-none fixed -left-[10000px] top-0 h-px w-px opacity-0"
          referrerpolicy="no-referrer"
          tabindex="-1"
          aria-hidden="true"
          @load="onPrintFrameLoad"
          @error="onPrintFrameError"
        />
      </main>
    </div>
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
        :disabled="preparingFile"
        :error="downloadNameError"
        @input="downloadNameError = ''"
      >
        <template #suffix><span class="text-[12px] font-medium">.pdf</span></template>
      </AppInput>

      <div class="mt-3 rounded-[10px] bg-gray-950/[0.035] px-3 py-2.5 dark:bg-white/[0.045]">
        <p class="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">Download as</p>
        <p class="mt-1 break-all text-[12px] font-medium text-gray-700 dark:text-gray-300">{{ preparedDownloadFilename }}</p>
        <p v-if="markupCount" class="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
          The downloaded copy will include {{ markupCount }} {{ markupCount === 1 ? 'mark' : 'marks' }}.
        </p>
      </div>

      <button type="submit" class="sr-only">Download PDF</button>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <AppButton variant="ghost" :disabled="preparingFile" @click="closeDownloadDialog">Cancel</AppButton>
        <AppButton :loading="preparingFile" @click="confirmDownload">Download</AppButton>
      </div>
    </template>
  </AppModal>
</template>
