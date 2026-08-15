<script setup lang="ts">
defineOptions({
  name: 'CategoryFilterTreeItem',
})

type Category = {
  id: number
  parent_id: number | null
  name: string
  slug: string
  full_slug: string
  is_active: boolean
  show_in_menu: boolean
  depth: number
  children?: Category[] | null
}

const props = withDefaults(defineProps<{
  category: Category
  selectedId: number | null
  expandedIds: number[]
  level?: number
}>(), {
  level: 0,
})

const emit = defineEmits<{
  select: [category: Category]
  toggle: [category: Category]
}>()

const hasChildren = computed(() => Boolean(props.category.children?.length))
const isExpanded = computed(() => props.expandedIds.includes(props.category.id))
const isSelected = computed(() => props.selectedId === props.category.id)
const paddingLeft = computed(() => `${8 + Math.min(props.level, 6) * 18}px`)
</script>

<template>
  <div>
    <div
      class="group flex items-center gap-2 rounded-[10px] px-2 py-2 transition"
      :class="isSelected
        ? 'bg-gray-950/[0.06] text-gray-950 dark:bg-white/[0.08] dark:text-white'
        : 'text-gray-700 hover:bg-gray-950/[0.035] dark:text-gray-300 dark:hover:bg-white/[0.05]'"
      :style="{ paddingLeft }"
    >
      <button
        type="button"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-gray-400 transition hover:bg-gray-950/[0.05] hover:text-gray-700 disabled:opacity-25 dark:text-gray-600 dark:hover:bg-white/[0.07] dark:hover:text-gray-300"
        :disabled="!hasChildren"
        @click.stop="emit('toggle', category)"
      >
        <svg
          v-if="hasChildren"
          class="h-3.5 w-3.5 transition-transform"
          :class="isExpanded ? 'rotate-90' : ''"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M7 5L12 10L7 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span v-else class="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
      </button>

      <button type="button" class="min-w-0 flex-1 text-left" @click="emit('select', category)">
        <div class="flex min-w-0 items-center gap-2">
          <p class="truncate text-[12px] font-semibold">{{ category.name }}</p>
          <span
            class="h-1.5 w-1.5 shrink-0 rounded-full"
            :class="category.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'"
          />
        </div>
        <p class="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-600">
          {{ category.full_slug }}
        </p>
      </button>

      <span v-if="hasChildren" class="shrink-0 text-[11px] font-medium text-gray-400 dark:text-gray-600">
        {{ category.children?.length }}
      </span>
    </div>

    <div v-if="hasChildren && isExpanded">
      <CategoryFilterTreeItem
        v-for="child in category.children"
        :key="child.id"
        :category="child"
        :selected-id="selectedId"
        :expanded-ids="expandedIds"
        :level="level + 1"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
      />
    </div>
  </div>
</template>
