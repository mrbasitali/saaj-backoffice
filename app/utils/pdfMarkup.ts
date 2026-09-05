export type PdfMarkupMode = 'pen' | 'highlight'

export type PdfMarkupPoint = {
  x: number
  y: number
}

export type PdfMarkupStroke = {
  id: string
  page: number
  mode: PdfMarkupMode
  color: string
  opacity: number
  width: number
  points: PdfMarkupPoint[]
}

const MAX_EXPORT_STROKES = 500
const MAX_EXPORT_POINTS = 30_000

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function colourChannels(value: string): [number, number, number] {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value)
  if (!match) return [0.86, 0.15, 0.15]

  return [
    Number.parseInt(match[1], 16) / 255,
    Number.parseInt(match[2], 16) / 255,
    Number.parseInt(match[3], 16) / 255,
  ]
}

function validPoints(points: PdfMarkupPoint[]) {
  return points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
}

/**
 * Creates an exported copy with the visible markup flattened into the PDF.
 * The source document is never uploaded or replaced; all work stays in this
 * browser session and the returned File is used only for download/share/print.
 */
export async function createMarkedPdfFile(
  source: File,
  strokes: PdfMarkupStroke[],
  filename: string,
): Promise<File> {
  if (strokes.length === 0) {
    return new File([source], filename, {
      type: 'application/pdf',
      lastModified: source.lastModified,
    })
  }

  if (strokes.length > MAX_EXPORT_STROKES) {
    throw new Error('This document contains too many markup strokes to export safely.')
  }

  const pointCount = strokes.reduce((total, stroke) => total + stroke.points.length, 0)
  if (pointCount > MAX_EXPORT_POINTS) {
    throw new Error('This document contains too many markup points to export safely.')
  }

  const { BlendMode, LineCapStyle, PDFDocument, rgb } = await import('pdf-lib')
  const document = await PDFDocument.load(await source.arrayBuffer(), {
    updateMetadata: false,
  })
  const pages = document.getPages()

  for (const stroke of strokes) {
    const page = pages[stroke.page - 1]
    const points = validPoints(stroke.points)
    if (!page || points.length === 0) continue

    const [red, green, blue] = colourChannels(stroke.color)
    const color = rgb(red, green, blue)
    const opacity = clamp(stroke.opacity, 0.08, 1)
    const thickness = clamp(stroke.width, 0.5, 72)
    const blendMode = stroke.mode === 'highlight' ? BlendMode.Multiply : BlendMode.Normal

    if (points.length === 1) {
      page.drawCircle({
        x: points[0].x,
        y: points[0].y,
        size: thickness / 2,
        color,
        opacity,
        blendMode,
      })
      continue
    }

    for (let index = 1; index < points.length; index++) {
      const start = points[index - 1]
      const end = points[index]
      if (start.x === end.x && start.y === end.y) continue

      page.drawLine({
        start,
        end,
        thickness,
        color,
        opacity,
        lineCap: LineCapStyle.Round,
        blendMode,
      })
    }
  }

  const output = await document.save({
    useObjectStreams: true,
    objectsPerTick: 50,
  })
  const bytes = output.buffer.slice(
    output.byteOffset,
    output.byteOffset + output.byteLength,
  ) as ArrayBuffer

  return new File([bytes], filename, {
    type: 'application/pdf',
    lastModified: Date.now(),
  })
}
