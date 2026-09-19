<script setup lang="ts">
type Category = {
 id: number
 parent_id: number | null
 name: string
 slug: string
 full_slug: string
 is_active: boolean
 depth: number
 children?: Category[] | null
}

type FlatCategory = Category & {
 level: number
 ancestorIds: number[]
 pathNames: string[]
}

const props = defineProps<{
 categories: Category[]
 selectedIds: number[]
 primaryId: number | null
 error?: string
}>()

const emit = defineEmits<{
 'update:selectedIds': [ids: number[]]
 'update:primaryId': [id: number | null]
}>()

const search = ref('')
const selectionView = ref<'all' | 'selected'>('all')
const collapsedIds = ref<number[]>([])

function toggleBranch(id: number) {
 collapsedIds.value = collapsedIds.value.includes(id)
 ? collapsedIds.value.filter(value => value !== id)
 : [...collapsedIds.value, id]
}

const branchIds = computed(() => flatCategories.value.filter(category => category.children?.length).map(category => category.id))
function toggleAllBranches() {
 collapsedIds.value = collapsedIds.value.length ? [] : [...branchIds.value]
}

const flatCategories = computed(() => {
 return flattenCategories(
 props.categories,
 )
})

const primaryCategory = computed(() => {
 return flatCategories.value.find((category) => (
 category.id === props.primaryId
 && props.selectedIds.includes(category.id)
 )) ?? null
})

const filteredCategories = computed(() => {
 const query = search.value.trim().toLowerCase()
 let items = flatCategories.value
 if (selectionView.value === 'selected') {
 items = items.filter(category => props.selectedIds.includes(category.id))
 }
 if (query) {
 // Search across the whole tree, including collapsed branches.
 return items.filter(category => [category.name, category.slug, category.full_slug, ...category.pathNames]
 .join(' ').toLowerCase().includes(query))
 }
 if (selectionView.value === 'selected') return items
 return items.filter(category => !category.ancestorIds.some(id => collapsedIds.value.includes(id)))
})

function flattenCategories(
 items: Category[],
 level = 0,
 result: FlatCategory[] = [],
 ancestorIds: number[] = [],
 pathNames: string[] = [],
) {
 items.forEach((item) => {
 result.push({
 ...item,
 level,
 ancestorIds,
 pathNames: [...pathNames, item.name],
 })

 if (item.children?.length) {
 flattenCategories(
 item.children,
 level + 1,
 result,
 [...ancestorIds, item.id],
 [...pathNames, item.name],
 )
 }
 })

 return result
}

function isSelected(
 category: Category,
) {
 return props.selectedIds.includes(
 category.id,
 )
}

function toggleCategory(
 category: Category,
) {
 if (isSelected(category)) {
 const nextIds =
 props.selectedIds.filter(
 (id) =>
 id !== category.id,
 )

 emit(
 'update:selectedIds',
 nextIds,
 )

 if (
 props.primaryId
 === category.id
 ) {
 emit(
 'update:primaryId',
 nextIds[0] ?? null,
 )
 }

 return
 }

 const nextIds = [
 ...props.selectedIds,
 category.id,
 ]

 emit(
 'update:selectedIds',
 nextIds,
 )

 if (!props.primaryId) {
 emit(
 'update:primaryId',
 category.id,
 )
 }
}

function setPrimary(
 category: Category,
) {
 if (!isSelected(category)) {
 emit(
 'update:selectedIds',
 [
 ...props.selectedIds,
 category.id,
 ],
 )
 }

 emit(
 'update:primaryId',
 category.id,
 )
}
</script>

<template>
 <div>
 <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
 <div class="min-w-0">
 <h3 class="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
 Product categories
 </h3>
 <p class="mt-1 text-[11px] leading-5 text-gray-500 dark:text-gray-400" aria-live="polite" aria-atomic="true">
 <template v-if="primaryCategory">
 SKU source: <span class="font-medium text-gray-700 dark:text-gray-300">{{ primaryCategory.pathNames.join(' / ') }}</span>
 </template>
 <template v-else>Select categories. Your first selection becomes primary.</template>
 </p>
 </div>

 <label class="category-search flex h-9 w-full items-center gap-2 rounded-[9px] bg-gray-950/[0.035] px-2.5 transition-colors focus-within:bg-gray-950/[0.05] focus-within:ring-2 focus-within:ring-blue-500/20 dark:bg-white/[0.05] dark:focus-within:bg-white/[0.07] sm:w-60 sm:shrink-0">
 <span class="sr-only">Search categories</span>
 <svg class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="none" aria-hidden="true">
 <circle cx="8.5" cy="8.5" r="5" stroke="currentColor" stroke-width="1.5" />
 <path d="M12.5 12.5L17 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
 </svg>
 <input
 v-model="search"
 type="search"
 placeholder="Search categories"
 class="category-search-input h-full min-w-0 flex-1 bg-transparent text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-200 dark:placeholder:text-gray-500"
 >
 </label>
 </div>

 <p v-if="error" class="mt-3 text-[12px] text-red-600 dark:text-red-400" role="alert">
 {{ error }}
 </p>

 <div class="mt-3 flex items-center justify-between gap-2">
 <div class="flex items-center gap-1" role="group" aria-label="Category view">
 <button
 type="button"
 class="category-filter h-7 rounded-[7px] px-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/30"
 :class="selectionView === 'all' ? 'bg-gray-950/[0.05] text-gray-800 dark:bg-white/[0.07] dark:text-gray-200' : 'text-gray-500 hover:bg-gray-950/[0.025] dark:text-gray-400 dark:hover:bg-white/[0.035]'"
 :aria-pressed="selectionView === 'all'"
 @click="selectionView = 'all'"
 >All categories</button>
 <button
 type="button"
 class="category-filter h-7 rounded-[7px] px-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/30"
 :class="selectionView === 'selected' ? 'bg-gray-950/[0.05] text-gray-800 dark:bg-white/[0.07] dark:text-gray-200' : 'text-gray-500 hover:bg-gray-950/[0.025] dark:text-gray-400 dark:hover:bg-white/[0.035]'"
 :aria-pressed="selectionView === 'selected'"
 @click="selectionView = 'selected'"
 >Selected <span class="ml-1 tabular-nums">{{ selectedIds.length }}</span></button>
 </div>
 <button
 v-if="branchIds.length && selectionView === 'all' && !search.trim()"
 type="button"
 class="primary-category-action h-7 shrink-0 rounded-[6px] px-1.5 text-gray-500 outline-none hover:bg-gray-950/[0.025] focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-gray-400 dark:hover:bg-white/[0.035]"
 @click="toggleAllBranches"
 >{{ collapsedIds.length ? 'Expand all' : 'Collapse all' }}</button>
 </div>

 <!-- A compact, collapsible list; the modal owns scrolling. -->
 <div class="mt-2" role="group" aria-label="Product categories">
 <div
 v-for="category in filteredCategories"
 :key="category.id"
 class="category-row flex min-h-10 items-center gap-1 rounded-[8px] pr-2 transition-colors"
 :class="primaryId === category.id
 ? 'bg-gray-950/[0.025] dark:bg-white/[0.04]'
 : 'hover:bg-gray-950/[0.025] dark:hover:bg-white/[0.035]'"
 :style="{ '--category-level': search.trim() || selectionView === 'selected' ? 0 : Math.min(category.level, 5) }"
 >
 <template v-if="!search.trim() && selectionView === 'all'">
 <button
 v-if="category.children?.length"
 type="button"
 class="flex h-7 w-5 shrink-0 items-center justify-center rounded-[5px] text-gray-400 outline-none hover:bg-gray-950/[0.05] focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:hover:bg-white/[0.06]"
 :aria-expanded="!collapsedIds.includes(category.id)"
 :aria-label="`${collapsedIds.includes(category.id) ? 'Expand' : 'Collapse'} ${category.name}`"
 @click="toggleBranch(category.id)"
 >
 <svg class="h-3 w-3 transition-transform" :class="{ '-rotate-90': collapsedIds.includes(category.id) }" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
 <path d="m5 7 5 5 5-5" />
 </svg>
 </button>
 <span v-else class="w-5 shrink-0" aria-hidden="true" />
 </template>
 <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2.5" :title="category.pathNames.join(' / ')">
 <input
 type="checkbox"
 class="peer sr-only"
 :checked="isSelected(category)"
 :aria-label="`Select ${category.name}`"
 @change="toggleCategory(category)"
 >
 <span
 class="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] ring-1 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-500"
 :class="isSelected(category)
 ? 'bg-gray-950 text-white ring-gray-950 dark:bg-white dark:text-gray-950 dark:ring-white'
 : 'text-transparent ring-gray-300 dark:ring-white/25'"
 aria-hidden="true"
 >
 <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none">
 <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
 </svg>
 </span>
 <span class="min-w-0">
 <span
 class="block break-words text-[12px] leading-[18px] text-gray-800 dark:text-gray-200"
 :class="primaryId === category.id ? 'font-semibold' : 'font-medium'"
 >
 {{ category.name }}
 </span>
 <span v-if="(search.trim() || selectionView === 'selected') && category.ancestorIds.length" class="mt-0.5 block break-words text-[10px] leading-4 text-gray-400 dark:text-gray-500">
 {{ category.pathNames.slice(0, -1).join(' / ') }}
 </span>
 </span>
 </label>

 <span
 v-if="isSelected(category) && primaryId === category.id"
 class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400"
 >
 <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
 <path d="m10 2.5 2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.5-4.6 2.5.9-5.2L2.5 8l5.2-.8L10 2.5Z" />
 </svg>
 Primary
 </span>
 <button
 v-else-if="isSelected(category)"
 type="button"
 class="primary-category-action h-7 shrink-0 whitespace-nowrap rounded-[6px] bg-transparent px-1.5 text-blue-600 outline-none transition-colors hover:bg-blue-500/[0.07] focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-400/10"
 :aria-label="`Make ${category.name} the primary category`"
 @click="setPrimary(category)"
 >
 Make primary
 </button>
 </div>

 <div v-if="filteredCategories.length === 0" class="py-8 text-center">
 <p class="text-[12px] text-gray-500 dark:text-gray-400">
 {{ search.trim() ? 'No matching categories.' : selectionView === 'selected' ? 'No categories selected yet.' : 'No categories available.' }}
 </p>
 <button
 v-if="search.trim()"
 type="button"
 class="primary-category-action mt-1 rounded-[6px] px-2 py-1.5 text-blue-600 outline-none hover:bg-blue-500/[0.07] focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-blue-400"
 @click="search = ''"
 >
 Clear search
 </button>
 <button
 v-else-if="selectionView === 'selected'"
 type="button"
 class="primary-category-action mt-1 rounded-[6px] px-2 py-1.5 text-blue-600 outline-none hover:bg-blue-500/[0.07] focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-blue-400"
 @click="selectionView = 'all'"
 >Browse categories</button>
 </div>
 </div>
 </div>
</template>

<style scoped>
.category-row {
 padding-left: calc(8px + var(--category-level, 0) * 12px);
}

.category-filter {
 font-size: 11px;
 font-weight: 500;
}

.category-search-input {
 font-size: 12px;
}

.primary-category-action {
 border: 0;
 font-size: 11px;
 font-weight: 500;
 line-height: 1.25;
}

@media (max-width: 639px) {
 .category-row {
  padding-left: calc(8px + var(--category-level, 0) * 8px);
 }
}
</style>
