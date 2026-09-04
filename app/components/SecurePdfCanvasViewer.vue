<script setup lang="ts">
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

const props = defineProps<{
  file: File
}>()

const emit = defineEmits<{
  ready: []
  error: [message: string]
}>()

const viewportElement = ref<HTMLDivElement | null>(null)
const canvasElement = ref<HTMLCanvasElement | null>(null)
const pageNumber = ref(1)
const pageCount = ref(0)
const zoom = ref(1)
const loading = ref(true)
const rendering = ref(false)
const viewerError = ref('')

let pdfDocument: any = null
let loadingTask: any = null
let renderTask: any = null
let resizeObserver: ResizeObserver | null = null
let resizeFrame: number | null = null
let generation = 0
let renderGeneration = 0

const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`)
const canGoBack = computed(() => pageNumber.value > 1)
const canGoForward = computed(() => pageNumber.value < pageCount.value)

watch(
  () => props.file,
  () => { void loadDocument() },
  { immediate: true },
)

onMounted(() => {
  if (!viewportElement.value) return

  resizeObserver = new ResizeObserver(() => scheduleRender())
  resizeObserver.observe(viewportElement.value)
})

onBeforeUnmount(() => {
  generation++
  renderGeneration++
  resizeObserver?.disconnect()
  resizeObserver = null

  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)
  resizeFrame = null

  renderTask?.cancel?.()
  renderTask = null
  void loadingTask?.destroy?.()
  loadingTask = null
  pdfDocument = null

  if (canvasElement.value) {
    canvasElement.value.width = 0
    canvasElement.value.height = 0
  }
})

function scheduleRender() {
  if (!pdfDocument || loading.value) return
  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)

  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = null
    void renderCurrentPage(generation)
  })
}

async function loadDocument() {
  const activeGeneration = ++generation
  renderGeneration++

  renderTask?.cancel?.()
  renderTask = null
  void loadingTask?.destroy?.()
  loadingTask = null
  pdfDocument = null

  pageNumber.value = 1
  pageCount.value = 0
  zoom.value = 1
  loading.value = true
  rendering.value = false
  viewerError.value = ''

  try {
    // Mozilla's legacy bundle is translated/polyfilled for a wider Safari
    // range. It remains lazy-loaded, so normal backoffice screens do not pay
    // the renderer cost until an administrator opens a PDF.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    if (activeGeneration !== generation) return

    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

    const bytes = new Uint8Array(await props.file.arrayBuffer())
    if (activeGeneration !== generation) return

    loadingTask = pdfjs.getDocument({
      data: bytes,
      // Invoices do not need PDF-embedded JavaScript. Keeping eval disabled
      // narrows the parser surface for documents containing unexpected data.
      isEvalSupported: false,
      useSystemFonts: true,
    })

    const loadedDocument = await loadingTask.promise
    if (activeGeneration !== generation) {
      await loadedDocument.loadingTask.destroy()
      return
    }

    pdfDocument = loadedDocument
    pageCount.value = loadedDocument.numPages
    loading.value = false

    await nextTick()
    await renderCurrentPage(activeGeneration)
  } catch (error: any) {
    if (activeGeneration !== generation || error?.name === 'RenderingCancelledException') return

    loading.value = false
    rendering.value = false
    viewerError.value = 'This PDF could not be displayed in the in-app viewer. You can still download or share the original file.'
    emit('error', viewerError.value)
  }
}

async function renderCurrentPage(activeGeneration = generation) {
  const activeRenderGeneration = ++renderGeneration
  const canvas = canvasElement.value
  const viewport = viewportElement.value
  const document = pdfDocument

  if (!canvas || !viewport || !document || loading.value) return

  renderTask?.cancel?.()
  renderTask = null
  rendering.value = true
  viewerError.value = ''

  try {
    const page = await document.getPage(pageNumber.value)
    if (activeGeneration !== generation || activeRenderGeneration !== renderGeneration) return

    const naturalViewport = page.getViewport({ scale: 1 })
    if (
      !Number.isFinite(naturalViewport.width)
      || !Number.isFinite(naturalViewport.height)
      || naturalViewport.width <= 0
      || naturalViewport.height <= 0
    ) throw new Error('The PDF page has invalid dimensions.')

    const availableWidth = Math.max(180, viewport.clientWidth - 32)
    const fitWidthScale = availableWidth / naturalViewport.width
    const cssScale = Math.max(Number.EPSILON, fitWidthScale * zoom.value)
    const displayViewport = page.getViewport({ scale: cssScale })

    // Keep canvases sharp without crossing iPhone/Safari canvas limits on
    // unusually long thermal receipts or highly zoomed pages.
    const deviceScale = Math.min(window.devicePixelRatio || 1, 2)
    const maxPixels = 12_000_000
    const maxDimension = 8192
    const areaScale = Math.sqrt(maxPixels / Math.max(1, displayViewport.width * displayViewport.height))
    const outputScale = Math.min(
      deviceScale,
      areaScale,
      maxDimension / Math.max(1, displayViewport.width),
      maxDimension / Math.max(1, displayViewport.height),
    )
    const renderViewport = page.getViewport({ scale: cssScale * outputScale })

    canvas.width = Math.max(1, Math.floor(renderViewport.width))
    canvas.height = Math.max(1, Math.floor(renderViewport.height))
    canvas.style.width = `${Math.floor(displayViewport.width)}px`
    canvas.style.height = `${Math.floor(displayViewport.height)}px`

    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Canvas rendering is unavailable.')

    context.save()
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.restore()

    const activeRenderTask = page.render({
      canvas,
      viewport: renderViewport,
      background: '#ffffff',
    })
    renderTask = activeRenderTask
    await activeRenderTask.promise

    if (activeGeneration !== generation || activeRenderGeneration !== renderGeneration) return
    if (renderTask === activeRenderTask) renderTask = null
    rendering.value = false
    emit('ready')
  } catch (error: any) {
    if (
      activeGeneration !== generation
      || activeRenderGeneration !== renderGeneration
      || error?.name === 'RenderingCancelledException'
    ) return

    renderTask = null
    rendering.value = false
    viewerError.value = 'This page could not be rendered. Download the original PDF if you need to review it now.'
    emit('error', viewerError.value)
  }
}

function changePage(direction: -1 | 1) {
  const nextPage = Math.min(pageCount.value, Math.max(1, pageNumber.value + direction))
  if (nextPage === pageNumber.value) return

  pageNumber.value = nextPage
  viewportElement.value?.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  void renderCurrentPage()
}

function changeZoom(amount: number) {
  zoom.value = Math.min(2.5, Math.max(0.6, Number((zoom.value + amount).toFixed(2))))
  scheduleRender()
}

function fitWidth() {
  zoom.value = 1
  scheduleRender()
  viewportElement.value?.scrollTo({ left: 0, behavior: 'smooth' })
}
</script>

<template>
  <section
    class="overflow-hidden rounded-[16px] bg-gray-950/[0.035] dark:bg-white/[0.04]"
    aria-label="PDF document viewer"
    @keydown.left.prevent="changePage(-1)"
    @keydown.right.prevent="changePage(1)"
  >
    <div class="flex min-h-11 flex-wrap items-center justify-between gap-2 bg-white/90 px-2.5 py-2 shadow-[0_1px_0_rgba(17,24,39,0.06)] backdrop-blur-xl dark:bg-[#17181b]/90 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          :disabled="!canGoBack || rendering"
          class="inline-flex h-8 w-8 items-center justify-center rounded-[9px] text-gray-500 transition hover:bg-gray-950/[0.06] hover:text-gray-950 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
          aria-label="Previous PDF page"
          @click="changePage(-1)"
        >
          <svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" aria-hidden="true"><path d="m12 5-5 5 5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <span class="min-w-[72px] text-center text-[11px] font-medium tabular-nums text-gray-500 dark:text-gray-400">
          {{ pageCount ? `${pageNumber} / ${pageCount}` : '— / —' }}
        </span>
        <button
          type="button"
          :disabled="!canGoForward || rendering"
          class="inline-flex h-8 w-8 items-center justify-center rounded-[9px] text-gray-500 transition hover:bg-gray-950/[0.06] hover:text-gray-950 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
          aria-label="Next PDF page"
          @click="changePage(1)"
        >
          <svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          type="button"
          :disabled="zoom <= 0.6 || rendering"
          class="inline-flex h-8 w-8 items-center justify-center rounded-[9px] text-[18px] font-light text-gray-500 transition hover:bg-gray-950/[0.06] hover:text-gray-950 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
          aria-label="Zoom out"
          @click="changeZoom(-0.15)"
        >−</button>
        <button
          type="button"
          class="h-8 min-w-[76px] rounded-[9px] px-2 text-[10px] font-semibold text-gray-600 transition hover:bg-gray-950/[0.06] hover:text-gray-950 dark:text-gray-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
          title="Fit PDF to viewer width"
          @click="fitWidth"
        >
          {{ zoom === 1 ? 'Fit width' : zoomLabel }}
        </button>
        <button
          type="button"
          :disabled="zoom >= 2.5 || rendering"
          class="inline-flex h-8 w-8 items-center justify-center rounded-[9px] text-[18px] font-light text-gray-500 transition hover:bg-gray-950/[0.06] hover:text-gray-950 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
          aria-label="Zoom in"
          @click="changeZoom(0.15)"
        >+</button>
      </div>
    </div>

    <div
      ref="viewportElement"
      tabindex="0"
      class="relative h-[54dvh] min-h-[350px] overflow-auto overscroll-contain p-4 outline-none sm:h-[62dvh]"
    >
      <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-gray-100/90 dark:bg-[#17181b]/90">
        <div class="text-center">
          <span class="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-white/15 dark:border-t-white" />
          <p class="mt-3 text-[11px] font-medium text-gray-500 dark:text-gray-400">Fitting document to your screen…</p>
        </div>
      </div>

      <div v-if="viewerError" class="absolute inset-0 z-10 flex items-center justify-center bg-gray-100/95 px-6 text-center dark:bg-[#17181b]/95">
        <p class="max-w-sm text-[12px] leading-5 text-red-600 dark:text-red-300">{{ viewerError }}</p>
      </div>

      <div class="flex min-h-full min-w-full items-start justify-center">
        <div class="relative shrink-0">
          <canvas
            ref="canvasElement"
            class="block bg-white shadow-[0_12px_38px_rgba(15,23,42,0.14)]"
            role="img"
            :aria-label="`PDF page ${pageNumber} of ${pageCount || 1}`"
          />
          <div v-if="rendering && !loading" class="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
            <span class="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
