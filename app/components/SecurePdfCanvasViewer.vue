<script setup lang="ts">
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import type {
  PdfMarkupMode,
  PdfMarkupPoint,
  PdfMarkupStroke,
} from '~/utils/pdfMarkup'

type ViewerTool = 'view' | PdfMarkupMode | 'eraser'

type ScreenStroke = PdfMarkupStroke & {
  screenPoints: Array<{ x: number, y: number }>
  pointList: string
  screenWidth: number
}

const props = withDefaults(defineProps<{
  file: File
  disabled?: boolean
}>(), {
  disabled: false,
})

const strokes = defineModel<PdfMarkupStroke[]>({ default: () => [] })

const emit = defineEmits<{
  ready: []
  error: [message: string]
}>()

const PEN_COLORS = ['#111827', '#dc2626', '#2563eb'] as const
const HIGHLIGHT_COLORS = ['#facc15', '#fb7185', '#4ade80'] as const
const TOOL_OPTIONS = [
  { value: 'view', label: 'View' },
  { value: 'pen', label: 'Pen' },
  { value: 'highlight', label: 'Mark' },
  { value: 'eraser', label: 'Erase' },
] as const
const MAX_POINTS_PER_STROKE = 2_000
const MAX_STROKES = 500
const MAX_HISTORY = 40

const viewportElement = ref<HTMLDivElement | null>(null)
const canvasElement = ref<HTMLCanvasElement | null>(null)
const overlayElement = ref<SVGSVGElement | null>(null)
const pageNumber = ref(1)
const pageCount = ref(0)
const zoom = ref(1)
const loading = ref(true)
const rendering = ref(false)
const viewerError = ref('')
const displayWidth = ref(0)
const displayHeight = ref(0)
const viewportVersion = ref(0)
const tool = ref<ViewerTool>('view')
const penColor = ref<string>(PEN_COLORS[1])
const highlightColor = ref<string>(HIGHLIGHT_COLORS[0])
const activeStroke = ref<PdfMarkupStroke | null>(null)
const history = shallowRef<PdfMarkupStroke[][]>([])

let pdfDocument: any = null
let loadingTask: any = null
let renderTask: any = null
let cssViewport: any = null
let resizeObserver: ResizeObserver | null = null
let resizeFrame: number | null = null
let generation = 0
let renderGeneration = 0
let activePointerId: number | null = null
let eraserSnapshot: PdfMarkupStroke[] | null = null
let eraserChanged = false

const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`)
const canGoBack = computed(() => pageNumber.value > 1)
const canGoForward = computed(() => pageNumber.value < pageCount.value)
const canUndo = computed(() => history.value.length > 0)
const currentPageHasMarkup = computed(() => strokes.value.some(stroke => stroke.page === pageNumber.value))
const markupCount = computed(() => strokes.value.length)
const colourOptions = computed<readonly string[]>(() => (
  tool.value === 'highlight' ? HIGHLIGHT_COLORS : PEN_COLORS
))
const selectedColour = computed(() => (
  tool.value === 'highlight' ? highlightColor.value : penColor.value
))
const overlayCursor = computed(() => {
  if (props.disabled) return 'wait'
  if (tool.value === 'eraser') return 'cell'
  if (tool.value === 'pen' || tool.value === 'highlight') return 'crosshair'
  return 'default'
})

const screenStrokes = computed<ScreenStroke[]>(() => {
  viewportVersion.value
  if (!cssViewport) return []

  const pageStrokes = strokes.value.filter(stroke => stroke.page === pageNumber.value)
  if (activeStroke.value?.page === pageNumber.value) pageStrokes.push(activeStroke.value)

  return pageStrokes.map((stroke) => {
    const screenPoints = stroke.points.map((point) => {
      const [x, y] = cssViewport.convertToViewportPoint(point.x, point.y)
      return { x, y }
    })

    return {
      ...stroke,
      screenPoints,
      pointList: screenPoints.map(point => `${point.x},${point.y}`).join(' '),
      screenWidth: Math.max(1, stroke.width * Math.abs(Number(cssViewport.scale) || 1)),
    }
  })
})

watch(
  () => props.file,
  () => {
    history.value = []
    cancelMarkup()
    tool.value = 'view'
    void loadDocument()
  },
  { immediate: true },
)

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) finishMarkup()
  },
)

onMounted(() => {
  if (!viewportElement.value) return

  resizeObserver = new ResizeObserver(() => scheduleRender())
  resizeObserver.observe(viewportElement.value)
})

onBeforeUnmount(() => {
  generation++
  renderGeneration++
  cancelMarkup()
  resizeObserver?.disconnect()
  resizeObserver = null

  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)
  resizeFrame = null

  renderTask?.cancel?.()
  renderTask = null
  void loadingTask?.destroy?.()
  loadingTask = null
  pdfDocument = null
  cssViewport = null

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
  cssViewport = null

  pageNumber.value = 1
  pageCount.value = 0
  zoom.value = 1
  displayWidth.value = 0
  displayHeight.value = 0
  loading.value = true
  rendering.value = false
  viewerError.value = ''

  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    if (activeGeneration !== generation) return

    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

    const bytes = new Uint8Array(await props.file.arrayBuffer())
    if (activeGeneration !== generation) return

    loadingTask = pdfjs.getDocument({
      data: bytes,
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

    const viewportStyle = window.getComputedStyle(viewport)
    const horizontalPadding = (Number.parseFloat(viewportStyle.paddingLeft) || 0)
      + (Number.parseFloat(viewportStyle.paddingRight) || 0)
    const verticalPadding = (Number.parseFloat(viewportStyle.paddingTop) || 0)
      + (Number.parseFloat(viewportStyle.paddingBottom) || 0)
    const availableWidth = Math.max(1, viewport.clientWidth - horizontalPadding)
    const availableHeight = Math.max(1, viewport.clientHeight - verticalPadding)
    const fitPageScale = Math.min(
      availableWidth / naturalViewport.width,
      availableHeight / naturalViewport.height,
    )
    const cssScale = Math.max(Number.EPSILON, fitPageScale * zoom.value)
    const displayViewport = page.getViewport({ scale: cssScale })

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

    displayWidth.value = Math.floor(displayViewport.width)
    displayHeight.value = Math.floor(displayViewport.height)
    cssViewport = displayViewport
    viewportVersion.value++

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
  finishMarkup()
  const nextPage = Math.min(pageCount.value, Math.max(1, pageNumber.value + direction))
  if (nextPage === pageNumber.value) return

  pageNumber.value = nextPage
  viewportElement.value?.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  void renderCurrentPage()
}

function changeZoom(amount: number) {
  finishMarkup()
  zoom.value = Math.min(2.5, Math.max(0.6, Number((zoom.value + amount).toFixed(2))))
  scheduleRender()
}

function fitPage() {
  finishMarkup()
  zoom.value = 1
  scheduleRender()
  viewportElement.value?.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
}

function selectTool(nextTool: ViewerTool) {
  if (props.disabled) return
  finishMarkup()
  tool.value = nextTool
}

function selectColour(colour: string) {
  if (tool.value === 'highlight') highlightColor.value = colour
  else penColor.value = colour
}

function strokeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `markup-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function pointFromEvent(event: PointerEvent): PdfMarkupPoint | null {
  const overlay = overlayElement.value
  if (!overlay || !cssViewport || displayWidth.value <= 0 || displayHeight.value <= 0) return null

  const rect = overlay.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null

  const viewportX = Math.min(
    displayWidth.value,
    Math.max(0, (event.clientX - rect.left) * (displayWidth.value / rect.width)),
  )
  const viewportY = Math.min(
    displayHeight.value,
    Math.max(0, (event.clientY - rect.top) * (displayHeight.value / rect.height)),
  )
  const [x, y] = cssViewport.convertToPdfPoint(viewportX, viewportY)

  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
}

function pointDistanceOnScreen(first: PdfMarkupPoint, second: PdfMarkupPoint) {
  if (!cssViewport) return Number.POSITIVE_INFINITY
  const [firstX, firstY] = cssViewport.convertToViewportPoint(first.x, first.y)
  const [secondX, secondY] = cssViewport.convertToViewportPoint(second.x, second.y)
  return Math.hypot(firstX - secondX, firstY - secondY)
}

function beginMarkup(event: PointerEvent) {
  if (props.disabled || tool.value === 'view' || !cssViewport) return
  if (activePointerId !== null) return
  if (event.pointerType === 'mouse' && event.button !== 0) return

  const point = pointFromEvent(event)
  if (!point) return

  if (tool.value !== 'eraser' && strokes.value.length >= MAX_STROKES) {
    return
  }

  event.preventDefault()
  activePointerId = event.pointerId
  overlayElement.value?.setPointerCapture(event.pointerId)

  if (tool.value === 'eraser') {
    eraserSnapshot = strokes.value
    eraserChanged = false
    eraseAt(point)
    return
  }

  const screenWidth = tool.value === 'highlight' ? 14 : 3
  const pdfWidth = screenWidth / Math.max(Number.EPSILON, Math.abs(Number(cssViewport.scale) || 1))

  activeStroke.value = {
    id: strokeId(),
    page: pageNumber.value,
    mode: tool.value,
    color: tool.value === 'highlight' ? highlightColor.value : penColor.value,
    opacity: tool.value === 'highlight' ? 0.32 : 0.94,
    width: pdfWidth,
    points: [point],
  }
}

function continueMarkup(event: PointerEvent) {
  if (event.pointerId !== activePointerId || props.disabled) return
  const point = pointFromEvent(event)
  if (!point) return

  event.preventDefault()

  if (tool.value === 'eraser') {
    eraseAt(point)
    return
  }

  const stroke = activeStroke.value
  const previousPoint = stroke?.points[stroke.points.length - 1]
  if (!stroke || !previousPoint || stroke.points.length >= MAX_POINTS_PER_STROKE) return
  if (pointDistanceOnScreen(previousPoint, point) < 1.4) return

  activeStroke.value = {
    ...stroke,
    points: [...stroke.points, point],
  }
}

function finishMarkup(event?: PointerEvent) {
  if (event && activePointerId !== null && event.pointerId !== activePointerId) return

  const pointerId = activePointerId
  activePointerId = null

  if (pointerId !== null) {
    try {
      overlayElement.value?.releasePointerCapture(pointerId)
    } catch {
      // The browser may already have released capture after leaving the page.
    }
  }

  if (activeStroke.value?.points.length) {
    const previous = strokes.value
    pushHistory(previous)
    strokes.value = [...previous, activeStroke.value]
  } else if (eraserChanged && eraserSnapshot) {
    pushHistory(eraserSnapshot)
  }

  activeStroke.value = null
  eraserSnapshot = null
  eraserChanged = false
}

function cancelMarkup() {
  const pointerId = activePointerId
  activePointerId = null

  if (pointerId !== null) {
    try {
      overlayElement.value?.releasePointerCapture(pointerId)
    } catch {
      // Pointer capture may already be gone after a browser cancellation.
    }
  }

  if (tool.value === 'eraser' && eraserChanged && eraserSnapshot) {
    strokes.value = eraserSnapshot
  }

  activeStroke.value = null
  eraserSnapshot = null
  eraserChanged = false
}

function pushHistory(snapshot: PdfMarkupStroke[]) {
  history.value = [...history.value, snapshot].slice(-MAX_HISTORY)
}

function undoMarkup() {
  finishMarkup()
  const previous = history.value[history.value.length - 1]
  if (!previous) return

  history.value = history.value.slice(0, -1)
  strokes.value = previous
}

function clearCurrentPage() {
  finishMarkup()
  if (!currentPageHasMarkup.value) return

  const previous = strokes.value
  pushHistory(previous)
  strokes.value = previous.filter(stroke => stroke.page !== pageNumber.value)
}

function eraseAt(point: PdfMarkupPoint) {
  const strokeIdToRemove = findStrokeAt(point)
  if (!strokeIdToRemove) return

  strokes.value = strokes.value.filter(stroke => stroke.id !== strokeIdToRemove)
  eraserChanged = true
}

function findStrokeAt(point: PdfMarkupPoint) {
  if (!cssViewport) return null
  const [pointerX, pointerY] = cssViewport.convertToViewportPoint(point.x, point.y)
  const pageStrokes = strokes.value.filter(stroke => stroke.page === pageNumber.value)

  for (let strokeIndex = pageStrokes.length - 1; strokeIndex >= 0; strokeIndex--) {
    const stroke = pageStrokes[strokeIndex]
    const points = stroke.points.map((strokePoint) => {
      const [x, y] = cssViewport.convertToViewportPoint(strokePoint.x, strokePoint.y)
      return { x, y }
    })
    const screenWidth = stroke.width * Math.abs(Number(cssViewport.scale) || 1)
    const threshold = Math.max(10, screenWidth / 2 + 6)

    if (points.length === 1 && Math.hypot(pointerX - points[0].x, pointerY - points[0].y) <= threshold) {
      return stroke.id
    }

    for (let pointIndex = 1; pointIndex < points.length; pointIndex++) {
      if (distanceToSegment(pointerX, pointerY, points[pointIndex - 1], points[pointIndex]) <= threshold) {
        return stroke.id
      }
    }
  }

  return null
}

function distanceToSegment(
  x: number,
  y: number,
  start: { x: number, y: number },
  end: { x: number, y: number },
) {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const lengthSquared = deltaX * deltaX + deltaY * deltaY

  if (lengthSquared === 0) return Math.hypot(x - start.x, y - start.y)

  const position = Math.min(1, Math.max(0, (
    (x - start.x) * deltaX + (y - start.y) * deltaY
  ) / lengthSquared))

  return Math.hypot(
    x - (start.x + position * deltaX),
    y - (start.y + position * deltaY),
  )
}
</script>

<template>
  <section
    class="flex h-full min-h-0 flex-col overflow-hidden bg-gray-950/[0.035] dark:bg-white/[0.04]"
    aria-label="PDF document viewer"
    @keydown.left.prevent="changePage(-1)"
    @keydown.right.prevent="changePage(1)"
  >
    <div class="shrink-0 bg-white/90 p-2 shadow-[0_1px_0_rgba(17,24,39,0.06)] backdrop-blur-xl dark:bg-[#17181b]/90 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <div class="flex flex-wrap items-center gap-2">
        <div class="grid w-full grid-cols-4 gap-1 rounded-[11px] bg-gray-950/[0.035] p-1 dark:bg-white/[0.05] sm:w-auto" role="toolbar" aria-label="PDF markup tools">
          <button
            v-for="option in TOOL_OPTIONS"
            :key="option.value"
            type="button"
            :aria-pressed="tool === option.value"
            :disabled="disabled"
            class="h-9 min-w-[52px] rounded-[8px] px-2 text-[10px] font-semibold transition active:scale-[0.98] disabled:opacity-40"
            :class="tool === option.value
              ? 'bg-gray-950 text-white shadow-sm dark:bg-white dark:text-gray-950'
              : 'text-gray-500 hover:bg-white/80 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white'"
            @click="selectTool(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <div v-if="tool === 'pen' || tool === 'highlight'" class="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-gray-950/[0.035] px-2.5 py-2 dark:bg-white/[0.05]">
          <span class="mr-0.5 hidden text-[9px] font-semibold uppercase tracking-[0.1em] text-gray-400 md:inline dark:text-gray-500">Colour</span>
          <button
            v-for="colour in colourOptions"
            :key="colour"
            type="button"
            :aria-label="`Use ${colour} markup colour`"
            :aria-pressed="selectedColour === colour"
            class="h-6 w-6 shrink-0 rounded-full border-2 transition"
            :class="selectedColour === colour ? 'scale-105 border-gray-950 dark:border-white' : 'border-transparent opacity-65 hover:opacity-100'"
            :style="{ backgroundColor: colour }"
            @click="selectColour(colour)"
          />
        </div>

        <div class="grid shrink-0 grid-cols-2 gap-1">
          <button
            type="button"
            :disabled="!canUndo || disabled"
            class="h-9 rounded-[9px] bg-gray-950/[0.035] px-3 text-[10px] font-semibold text-gray-500 transition hover:bg-gray-950/[0.07] hover:text-gray-950 disabled:opacity-30 dark:bg-white/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.09] dark:hover:text-white"
            @click="undoMarkup"
          >
            Undo
          </button>
          <button
            type="button"
            :disabled="!currentPageHasMarkup || disabled"
            class="h-9 rounded-[9px] bg-gray-950/[0.035] px-3 text-[10px] font-semibold text-gray-500 transition hover:bg-red-500/[0.08] hover:text-red-600 disabled:opacity-30 dark:bg-white/[0.05] dark:text-gray-400 dark:hover:text-red-300"
            @click="clearCurrentPage"
          >
            Clear
          </button>
        </div>

        <div class="ml-auto flex shrink-0 items-center gap-1 rounded-[10px] bg-gray-950/[0.035] p-1 dark:bg-white/[0.05]">
          <button
            type="button"
            :disabled="zoom <= 0.6 || rendering || disabled"
            class="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[18px] font-light text-gray-500 transition hover:bg-white hover:text-gray-950 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
            aria-label="Zoom out"
            @click="changeZoom(-0.15)"
          >−</button>
          <button
            type="button"
            :disabled="disabled"
            class="h-8 min-w-[76px] rounded-[8px] px-2 text-[10px] font-semibold text-gray-600 transition hover:bg-white hover:text-gray-950 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
            title="Fit the complete PDF page inside the viewer"
            @click="fitPage"
          >
            {{ zoom === 1 ? 'Fit page' : zoomLabel }}
          </button>
          <button
            type="button"
            :disabled="zoom >= 2.5 || rendering || disabled"
            class="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[18px] font-light text-gray-500 transition hover:bg-white hover:text-gray-950 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
            aria-label="Zoom in"
            @click="changeZoom(0.15)"
          >+</button>
        </div>
      </div>

      <p
        v-if="tool !== 'view'"
        class="mt-2 rounded-[8px] bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-medium leading-4 text-amber-800 dark:text-amber-200"
      >
        {{ tool === 'eraser' ? 'Drag over a mark to erase it.' : 'Draw on the page. Switch to View to scroll.' }}
      </p>
    </div>

    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          ref="viewportElement"
          tabindex="0"
          class="relative min-h-0 flex-1 overflow-auto overscroll-contain p-2 outline-none sm:p-4"
        >
          <div v-if="loading" class="absolute inset-0 z-20 flex items-center justify-center bg-gray-100/90 dark:bg-[#17181b]/90">
            <div class="text-center">
              <span class="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-white/15 dark:border-t-white" />
              <p class="mt-3 text-[11px] font-medium text-gray-500 dark:text-gray-400">Fitting document to your screen…</p>
            </div>
          </div>

          <div v-if="viewerError" class="absolute inset-0 z-20 flex items-center justify-center bg-gray-100/95 px-6 text-center dark:bg-[#17181b]/95">
            <p class="max-w-sm text-[12px] leading-5 text-red-600 dark:text-red-300">{{ viewerError }}</p>
          </div>

          <div class="flex min-h-full min-w-full">
            <div class="relative m-auto shrink-0">
              <canvas
                ref="canvasElement"
                class="block bg-white shadow-[0_12px_38px_rgba(15,23,42,0.14)]"
                role="img"
                :aria-label="`PDF page ${pageNumber} of ${pageCount || 1}`"
              />

              <svg
                v-if="displayWidth && displayHeight"
                ref="overlayElement"
                class="absolute inset-0 z-10 h-full w-full select-none"
                :class="tool === 'view' ? 'pointer-events-none' : 'pointer-events-auto touch-none'"
                :style="{ cursor: overlayCursor }"
                :viewBox="`0 0 ${displayWidth} ${displayHeight}`"
                preserveAspectRatio="none"
                aria-label="PDF markup surface"
                @pointerdown="beginMarkup"
                @pointermove="continueMarkup"
                @pointerup="finishMarkup"
                @pointercancel="cancelMarkup"
              >
                <template v-for="stroke in screenStrokes" :key="stroke.id">
                  <circle
                    v-if="stroke.screenPoints.length === 1"
                    :cx="stroke.screenPoints[0].x"
                    :cy="stroke.screenPoints[0].y"
                    :r="stroke.screenWidth / 2"
                    :fill="stroke.color"
                    :fill-opacity="stroke.opacity"
                    :style="stroke.mode === 'highlight' ? { mixBlendMode: 'multiply' } : undefined"
                  />
                  <polyline
                    v-else
                    :points="stroke.pointList"
                    fill="none"
                    :stroke="stroke.color"
                    :stroke-opacity="stroke.opacity"
                    :stroke-width="stroke.screenWidth"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    :style="stroke.mode === 'highlight' ? { mixBlendMode: 'multiply' } : undefined"
                  />
                </template>
              </svg>

              <div v-if="rendering && !loading" class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
                <span class="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
              </div>
            </div>
          </div>
        </div>

        <nav
          v-if="pageCount > 1"
          class="flex shrink-0 items-center justify-center gap-2.5 bg-white/90 px-3 py-2.5 shadow-[0_-1px_0_rgba(17,24,39,0.06)] backdrop-blur-xl dark:bg-[#17181b]/90 dark:shadow-[0_-1px_0_rgba(255,255,255,0.06)]"
          aria-label="PDF page navigation"
        >
          <button
            type="button"
            :disabled="!canGoBack || rendering || disabled"
            class="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-gray-950/[0.045] px-2.5 text-[10px] font-semibold text-gray-600 transition hover:bg-gray-950/[0.08] hover:text-gray-950 active:scale-[0.98] disabled:opacity-30 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.1] dark:hover:text-white sm:px-3"
            aria-label="Previous PDF page"
            @click="changePage(-1)"
          >
            <svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" aria-hidden="true"><path d="m12 5-5 5 5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            <span class="hidden sm:inline">Previous</span>
          </button>

          <div class="w-[112px] text-center sm:w-[140px]">
            <p class="text-[11px] font-semibold tabular-nums text-gray-700 dark:text-gray-200">
              Page {{ pageNumber }} <span class="font-normal text-gray-400">of</span> {{ pageCount }}
            </p>
            <div class="mx-auto mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
              <div
                class="h-full rounded-full bg-gray-900 transition-[width] duration-200 dark:bg-white"
                :style="{ width: `${(pageNumber / pageCount) * 100}%` }"
              />
            </div>
          </div>

          <button
            type="button"
            :disabled="!canGoForward || rendering || disabled"
            class="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-gray-950/[0.045] px-2.5 text-[10px] font-semibold text-gray-600 transition hover:bg-gray-950/[0.08] hover:text-gray-950 active:scale-[0.98] disabled:opacity-30 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.1] dark:hover:text-white sm:px-3"
            aria-label="Next PDF page"
            @click="changePage(1)"
          >
            <span class="hidden sm:inline">Next</span>
            <svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
        </nav>
      </div>

    </div>
  </section>
</template>
