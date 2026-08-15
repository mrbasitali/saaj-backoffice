import { onBeforeUnmount, reactive, ref, watch, type Ref } from 'vue'

export type FloatingAlign = 'left' | 'right'

export interface FloatingPanelOptions {
  /** Which edge of the trigger the panel's edge lines up with. Default 'left'. */
  align?: FloatingAlign
  /** Minimum panel width in px. Default 240. */
  minWidth?: number
  /** If set, panel width always matches the trigger's width instead of minWidth/content. */
  matchTriggerWidth?: boolean
  /** Gap between trigger and panel in px. Default 8. */
  gap?: number
  /** Viewport edge margin in px. Default 12. */
  margin?: number
  /** Cap on how tall the panel is allowed to grow. Default 460. */
  maxHeightCap?: number
  /** Floor on how tall the panel is allowed to shrink before flipping/clamping. Default 200. */
  maxHeightFloor?: number
}

/**
 * Every dropdown in this app (AppSelect, AppMultiSelect, AppActionMenu) used
 * to duplicate this positioning logic slightly differently, and all three
 * shared the same bug: the panel's reactive style starts at `{ top: 0,
 * left: 0 }`, and gets corrected inside `nextTick(updatePosition)` — but
 * Vue can paint that first frame at (0,0) *before* the correction runs,
 * so the menu visibly flashes at the top-left of the page for a frame.
 * That's the "opens on top sometimes" bug.
 *
 * Fix: the panel starts `visibility: hidden` at a neutral position, and
 * only becomes visible once `measure()` has actually placed it correctly.
 * There is no code path where the panel can paint before it's positioned.
 *
 * This also unifies the flip-up-when-no-room-below and viewport-clamping
 * behaviour, which previously only AppSelect had — AppMultiSelect and
 * AppActionMenu could render partly off-screen near the bottom of a page.
 */
export function useFloatingPanel(
  triggerRef: Ref<HTMLElement | null>,
  panelRef: Ref<HTMLElement | null>,
  isOpen: Ref<boolean>,
  options: FloatingPanelOptions = {},
) {
  const {
    align = 'left',
    minWidth = 240,
    matchTriggerWidth = false,
    gap = 8,
    margin = 12,
    maxHeightCap = 460,
    maxHeightFloor = 200,
  } = options

  const style = reactive({
    position: 'fixed' as const,
    top: '-9999px',
    left: '-9999px',
    width: `${minWidth}px`,
    visibility: 'hidden' as 'hidden' | 'visible',
  })

  const availableHeight = ref(maxHeightCap)

  function measure() {
    if (!triggerRef.value) return

    const rect = triggerRef.value.getBoundingClientRect()

    const width = matchTriggerWidth
      ? Math.min(Math.max(rect.width, minWidth), window.innerWidth - margin * 2)
      : Math.min(Math.max(minWidth, rect.width), window.innerWidth - margin * 2)

    const spaceBelow = window.innerHeight - rect.bottom - margin
    const spaceAbove = rect.top - margin
    const openUp = spaceBelow < maxHeightFloor && spaceAbove > spaceBelow

    const height = Math.max(
      maxHeightFloor,
      Math.min(openUp ? spaceAbove - gap : spaceBelow - gap, maxHeightCap),
    )

    availableHeight.value = height

    const rawTop = openUp ? rect.top - gap - height : rect.bottom + gap
    const top = Math.min(Math.max(margin, rawTop), window.innerHeight - height - margin)

    const rawLeft = align === 'right' ? rect.right - width : rect.left
    const left = Math.min(Math.max(margin, rawLeft), window.innerWidth - width - margin)

    style.top = `${top}px`
    style.left = `${left}px`
    style.width = `${width}px`
    style.visibility = 'visible'
  }

  function onScrollOrResize() {
    measure()
  }

  function onDocumentClick(event: MouseEvent) {
    const target = event.target as Node

    if (triggerRef.value?.contains(target)) return
    if (panelRef.value?.contains(target)) return

    isOpen.value = false
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') isOpen.value = false
  }

  watch(isOpen, (value) => {
    if (!import.meta.client) return

    if (value) {
      // Synchronous, not nextTick/rAF: measure() only reads triggerRef,
      // which is always mounted regardless of isOpen. By the time Vue
      // actually paints the v-if'd panel, `style` already holds the
      // final correct coordinates and visibility:visible — there is no
      // frame where the panel can render at the wrong place.
      measure()
      window.addEventListener('scroll', onScrollOrResize, true)
      window.addEventListener('resize', onScrollOrResize)
      document.addEventListener('click', onDocumentClick)
      document.addEventListener('keydown', onKeydown)
    } else {
      style.visibility = 'hidden'
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      document.removeEventListener('click', onDocumentClick)
      document.removeEventListener('keydown', onKeydown)
    }
  })

  onBeforeUnmount(() => {
    if (!import.meta.client) return

    window.removeEventListener('scroll', onScrollOrResize, true)
    window.removeEventListener('resize', onScrollOrResize)
    document.removeEventListener('click', onDocumentClick)
    document.removeEventListener('keydown', onKeydown)
  })

  return { style, availableHeight }
}
