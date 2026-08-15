<script setup lang="ts">
defineOptions({
  name: 'CategoryTreeItem',
})

type Category = {
  id: number
  parent_id: number | null
  name: string
  slug: string
  full_slug: string
  description: string | null
  icon_url: string | null
  image_url: string | null
  banner_image_url: string | null
  meta_title: string | null
  meta_description: string | null
  is_active: boolean
  show_in_menu: boolean
  sort_order: number
  depth: number
  children?: Category[] | null
}

const props = withDefaults(defineProps<{
  category: Category
  level?: number
  expandedIds: number[]
}>(), {
  level: 0,
})

const emit = defineEmits<{
  'toggle-expanded': [category: Category]
  'open-create': [category: Category]
  'open-edit': [category: Category]
  'ask-delete': [category: Category]
}>()

const hasChildren = computed(() => Boolean(props.category.children?.length))
const isExpanded = computed(() => props.expandedIds.includes(props.category.id))
const indent = computed(() => Math.min(props.level, 5) * 22)

function categoryImage(category: Category) {
  return category.image_url || category.icon_url || category.banner_image_url
}

function flattenCategories(items: Category[], result: Category[] = []) {
  items.forEach((item) => {
    result.push(item)
    if (item.children?.length) flattenCategories(item.children, result)
  })
  return result
}

function childCount(category: Category) {
  return flattenCategories(category.children ?? []).length
}

function directChildCount(category: Category) {
  return category.children?.length ?? 0
}
</script>

<template>
  <article
    class="overflow-visible"
    :class="level === 0 ? 'rounded-[16px] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.025)] dark:bg-[#111214] dark:shadow-none' : ''"
  >
    <div
      class="group relative flex min-w-0 items-center gap-3 px-3 py-2.5 transition hover:bg-gray-950/[0.018] dark:hover:bg-white/[0.025] sm:px-4"
      :class="level === 0 ? 'rounded-[16px]' : 'rounded-[10px]'"
      :style="{ paddingLeft: level > 0 ? `${16 + indent}px` : undefined }"
    >
      <span
        v-if="level > 0"
        class="absolute bottom-0 top-0 w-px bg-gray-100 dark:bg-white/[0.055]"
        :style="{ left: `${10 + indent - 11}px` }"
      />

      <button
        v-if="hasChildren"
        type="button"
        :aria-label="isExpanded ? 'Collapse category' : 'Expand category'"
        class="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-gray-400 transition hover:bg-gray-950/[0.05] hover:text-gray-800 active:scale-95 dark:text-gray-600 dark:hover:bg-white/[0.07] dark:hover:text-white"
        @click="emit('toggle-expanded', category)"
      >
        <svg
          class="h-3.5 w-3.5 transition-transform duration-150"
          :class="isExpanded ? 'rotate-90' : ''"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M7 5L12 10L7 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <span v-else class="h-7 w-7 shrink-0" />

      <button
        type="button"
        class="h-10 w-10 shrink-0 overflow-hidden rounded-[10px] bg-gray-100 text-[13px] font-semibold text-gray-400 transition hover:opacity-85 dark:bg-white/[0.06] dark:text-gray-600"
        @click="emit('open-edit', category)"
      >
        <img
          v-if="categoryImage(category)"
          :src="categoryImage(category)"
          :alt="category.name"
          class="h-full w-full object-cover"
        >
        <span v-else class="flex h-full w-full items-center justify-center">
          {{ category.name.slice(0, 1).toUpperCase() }}
        </span>
      </button>

      <button
        type="button"
        class="min-w-0 flex-1 text-left"
        @click="emit('open-edit', category)"
      >
        <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h2 class="min-w-0 truncate text-[13px] font-semibold tracking-[-0.005em] text-gray-900 dark:text-gray-100">
            {{ category.name }}
          </h2>

          <span v-if="category.parent_id === null" class="text-[11px] font-medium text-gray-400 dark:text-gray-600">
            Root
          </span>

          <span class="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-500">
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="category.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'"
            />
            {{ category.is_active ? 'Active' : 'Inactive' }}
          </span>
        </div>

        <p class="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-600">
          {{ category.full_slug }}
        </p>
      </button>

      <div class="hidden shrink-0 items-center gap-5 lg:flex">
        <div class="min-w-[82px] text-right">
          <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">{{ directChildCount(category) }}</p>
          <p class="text-[11px] text-gray-400 dark:text-gray-600">children</p>
        </div>
        <div class="min-w-[72px] text-right">
          <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">{{ category.sort_order }}</p>
          <p class="text-[11px] text-gray-400 dark:text-gray-600">order</p>
        </div>
        <div class="min-w-[78px] text-right">
          <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">
            {{ category.show_in_menu ? 'Visible' : 'Hidden' }}
          </p>
          <p class="text-[11px] text-gray-400 dark:text-gray-600">menu</p>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          title="Add subcategory"
          aria-label="Add subcategory"
          class="hidden h-8 w-8 items-center justify-center rounded-[8px] text-gray-400 opacity-0 transition hover:bg-gray-950/[0.05] hover:text-gray-800 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-white/[0.07] dark:hover:text-white sm:flex"
          @click="emit('open-create', category)"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
            <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>

        <AppActionMenu>
          <template #default="{ close }">
            <AppActionMenuItem @click="emit('open-create', category); close()">
              Add subcategory
            </AppActionMenuItem>
            <AppActionMenuItem @click="emit('open-edit', category); close()">
              Edit category
            </AppActionMenuItem>
            <AppActionMenuItem danger @click="emit('ask-delete', category); close()">
              Delete category
            </AppActionMenuItem>
          </template>
        </AppActionMenu>
      </div>
    </div>

    <div
      class="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-2.5 text-[11px] text-gray-400 dark:text-gray-600 lg:hidden"
      :style="{ paddingLeft: level > 0 ? `${68 + indent}px` : '68px' }"
    >
      <span>{{ directChildCount(category) }} children</span>
      <span>{{ childCount(category) }} nested</span>
      <span>Sort {{ category.sort_order }}</span>
      <span>{{ category.show_in_menu ? 'Menu visible' : 'Menu hidden' }}</span>
    </div>

    <Transition
      enter-active-class="transition duration-180 ease-out"
      enter-from-class="-translate-y-1 opacity-0"
      leave-active-class="transition duration-120 ease-in"
      leave-to-class="-translate-y-1 opacity-0"
    >
      <div v-if="hasChildren && isExpanded" class="overflow-visible pb-1">
        <CategoryTreeItem
          v-for="child in category.children"
          :key="child.id"
          :category="child"
          :level="level + 1"
          :expanded-ids="expandedIds"
          @toggle-expanded="emit('toggle-expanded', $event)"
          @open-create="emit('open-create', $event)"
          @open-edit="emit('open-edit', $event)"
          @ask-delete="emit('ask-delete', $event)"
        />
      </div>
    </Transition>
  </article>
</template>
