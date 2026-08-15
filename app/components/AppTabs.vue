<script setup lang="ts">
type TabItem = {
  label: string
  value: string
  count?: number | null
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: string
  items: TabItem[]
  ariaLabel?: string
  equal?: boolean
}>(), {
  ariaLabel: 'Sections',
  equal: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const tabRefs = ref<HTMLButtonElement[]>([])
const fitsMobile = computed(() => props.equal && props.items.length <= 4)

function selectTab(item: TabItem) {
  if (item.disabled) return
  emit('update:modelValue', item.value)
}

function onKeydown(event: KeyboardEvent, index: number) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return

  event.preventDefault()

  const enabledIndexes = props.items
    .map((item, itemIndex) => item.disabled ? -1 : itemIndex)
    .filter((itemIndex) => itemIndex >= 0)

  if (!enabledIndexes.length) return

  const currentPosition = enabledIndexes.indexOf(index)
  let nextIndex = index

  if (event.key === 'Home') {
    nextIndex = enabledIndexes[0]
  } else if (event.key === 'End') {
    nextIndex = enabledIndexes[enabledIndexes.length - 1]
  } else if (event.key === 'ArrowRight') {
    const nextPosition = currentPosition < 0
      ? 0
      : (currentPosition + 1) % enabledIndexes.length
    nextIndex = enabledIndexes[nextPosition]
  } else if (event.key === 'ArrowLeft') {
    const nextPosition = currentPosition <= 0
      ? enabledIndexes.length - 1
      : currentPosition - 1
    nextIndex = enabledIndexes[nextPosition]
  }

  const item = props.items[nextIndex]
  if (!item) return

  selectTab(item)
  nextTick(() => tabRefs.value[nextIndex]?.focus())
}

function setTabRef(element: unknown, index: number) {
  if (element) tabRefs.value[index] = element as HTMLButtonElement
}
</script>

<template>
  <div
    class="w-full overflow-x-auto rounded-[13px] bg-gray-950/[0.045] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:bg-white/[0.065]"
  >
    <div
      role="tablist"
      :aria-label="ariaLabel"
      class="gap-1"
      :class="[
        equal ? 'sm:grid sm:w-full' : 'flex',
        fitsMobile ? 'grid w-full min-w-0' : 'flex min-w-max sm:min-w-0',
      ]"
      :style="equal
        ? { gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }
        : undefined"
    >
      <button
        v-for="(item, index) in items"
        :key="item.value"
        :ref="(element) => setTabRef(element, index)"
        type="button"
        role="tab"
        :aria-selected="modelValue === item.value"
        :tabindex="modelValue === item.value ? 0 : -1"
        :disabled="item.disabled"
        class="group flex h-9 min-w-[108px] items-center justify-center gap-2 rounded-[10px] px-3 text-[13px] font-semibold tracking-[-0.01em] outline-none transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:ring-2 focus-visible:ring-gray-950/10 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40 sm:min-w-0 dark:focus-visible:ring-white/10"
        :class="modelValue === item.value
          ? 'bg-white text-gray-950 shadow-[0_1px_2px_rgba(17,24,39,0.08),0_0_0_1px_rgba(17,24,39,0.035)] dark:bg-[#202126] dark:text-white dark:shadow-[0_1px_2px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,255,255,0.055)]'
          : 'text-gray-500 hover:bg-white/[0.55] hover:text-gray-900 dark:text-gray-500 dark:hover:bg-white/[0.055] dark:hover:text-gray-200'"
        @click="selectTab(item)"
        @keydown="onKeydown($event, index)"
      >
        <span class="truncate">{{ item.label }}</span>

        <span
          v-if="item.count !== undefined && item.count !== null && item.count > 0"
          class="flex h-[19px] min-w-[19px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums"
          :class="modelValue === item.value
            ? 'bg-gray-950/[0.07] text-gray-600 dark:bg-white/[0.09] dark:text-gray-300'
            : 'bg-gray-950/[0.05] text-gray-400 dark:bg-white/[0.055] dark:text-gray-500'"
        >
          {{ item.count }}
        </span>
      </button>
    </div>
  </div>
</template>
