<script setup lang="ts">
definePageMeta({
 middleware: 'auth',
 layout: 'admin',
})

type CategoryFaq = {
 id?: number
 question: string
 answer: string
 is_active: boolean
 sort_order: number
}

type Category = {
 id: number
 parent_id: number | null
 name: string
 slug: string
 full_slug: string
 code?: string | null
 sku_year_enabled?: boolean
 description: string | null
 icon_url: string | null
 icon_public_id?: string | null
 image_url: string | null
 image_public_id?: string | null
 banner_image_url: string | null
 banner_image_public_id?: string | null
 meta_title: string | null
 meta_description: string | null
 seo_content?: string | null
 seo_is_published?: boolean
 faqs_is_published?: boolean
 faqs?: CategoryFaq[] | null
 is_active: boolean
 show_in_menu: boolean
 show_on_home: boolean
 sort_order: number
 depth: number
 children?: Category[] | null
 created_at?: string | null
 updated_at?: string | null
}

type CategoryResponse = {
 data: Category
}

type CategoryTreeResponse = {
 data: Category[]
}

const { $api } = useNuxtApp()

const search = ref('')
const debouncedSearch = ref('')
const activeFilter = ref('all')
const menuFilter = ref('all')
const homeFilter = ref('all')
const levelFilter = ref('all')
const sortBy = ref('sort_order')

const expandedIds = ref<number[]>([])

const filtersOpen = ref(false)

const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const selectedCategory = ref<Category | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const categoryToDelete = ref<Category | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const activeOptions = [
 { label: 'All statuses', value: 'all' },
 { label: 'Active', value: 'active' },
 { label: 'Inactive', value: 'inactive' },
]

const menuOptions = [
 { label: 'All navigation visibility', value: 'all' },
 { label: 'Visible in navigation', value: 'yes' },
 { label: 'Hidden from navigation', value: 'no' },
]

const homeOptions = [
 { label: 'All home visibility', value: 'all' },
 { label: 'Visible on home', value: 'yes' },
 { label: 'Hidden from home', value: 'no' },
]

const levelOptions = [
 { label: 'All levels', value: 'all' },
 { label: 'Root categories', value: 'root' },
 { label: 'Level 1', value: 1 },
 { label: 'Level 2', value: 2 },
 { label: 'Level 3', value: 3 },
 { label: 'Level 4+', value: 4 },
]

const sortOptions = [
 { label: 'Sort order', value: 'sort_order' },
 { label: 'Name A-Z', value: 'name' },
 { label: 'Latest first', value: 'latest' },
]

watch(search, (value) => {
 if (searchTimer) {
 clearTimeout(searchTimer)
 }

 searchTimer = setTimeout(() => {
 debouncedSearch.value = value.trim().toLowerCase()
 }, 300)
})

const {
 data,
 pending,
 error,
 refresh,
} = useAsyncData(
 'admin-categories-tree',
 () => $api<CategoryTreeResponse>('/admin/categories/tree'),
 {
 immediate: true,
 },
)

const treeCategories = computed(() => data.value?.data ?? [])
const flatCategories = computed(() => flattenCategories(treeCategories.value))

const isInitialLoading = computed(() => pending.value && !data.value)
const isRefreshing = computed(() => pending.value && Boolean(data.value))

const hasActiveFilters = computed(() => {
 return Boolean(
 search.value ||
 activeFilter.value !== 'all' ||
 menuFilter.value !== 'all' ||
 homeFilter.value !== 'all' ||
 levelFilter.value !== 'all' ||
 sortBy.value !== 'sort_order',
 )
})

const visibleFilterCount = computed(() => {
 return [
 activeFilter.value !== 'all',
 menuFilter.value !== 'all',
 homeFilter.value !== 'all',
 levelFilter.value !== 'all',
 sortBy.value !== 'sort_order',
 ].filter(Boolean).length
})

const filteredTree = computed(() => {
 const prepared = sortTree(treeCategories.value)

 return filterTree(prepared)
})

const totalCategories = computed(() => flatCategories.value.length)
const visibleCount = computed(() => flattenCategories(filteredTree.value).length)

const parentOptions = computed(() => {
 const excludedIds = selectedCategory.value && formMode.value === 'edit'
 ? [selectedCategory.value.id, ...getDescendantIds(selectedCategory.value)]
 : []

 const options = [
 {
 label: 'No parent — root category',
 value: null as number | null,
 },
 ]

 flatCategories.value
 .filter((item) => !excludedIds.includes(item.id))
 .forEach((item) => {
 options.push({
 label: `${'— '.repeat(item.depth)}${item.name}`,
 value: item.id,
 })
 })

 return options
})

watch(
 filteredTree,
 (items) => {
 const expandableIds = flattenCategories(items)
 .filter((item) => item.children?.length)
 .map((item) => item.id)

 if (hasActiveFilters.value) {
 expandedIds.value = expandableIds
 return
 }

 if (expandedIds.value.length === 0 && expandableIds.length) {
 expandedIds.value = expandableIds
 }
 },
 { immediate: true },
)

function flattenCategories(items: Category[], result: Category[] = []) {
 items.forEach((item) => {
 result.push(item)

 if (item.children?.length) {
 flattenCategories(item.children, result)
 }
 })

 return result
}

function getDescendantIds(category: Category) {
 return flattenCategories(category.children ?? []).map((item) => item.id)
}

function sortTree(items: Category[]): Category[] {
 const copied = items.map((item) => ({
 ...item,
 children: item.children?.length ? sortTree(item.children) : [],
 }))

 if (sortBy.value === 'name') {
 return copied.sort((a, b) => a.name.localeCompare(b.name))
 }

 if (sortBy.value === 'latest') {
 return copied.sort((a, b) => Number(b.id) - Number(a.id))
 }

 return copied.sort((a, b) => {
 const sortA = Number(a.sort_order || 0)
 const sortB = Number(b.sort_order || 0)

 if (sortA === sortB) {
 return a.name.localeCompare(b.name)
 }

 return sortA - sortB
 })
}

function matchesFilters(category: Category) {
 if (debouncedSearch.value) {
 const haystack = [
 category.name,
 category.slug,
 category.full_slug,
 category.description || '',
 ].join(' ').toLowerCase()

 if (!haystack.includes(debouncedSearch.value)) {
 return false
 }
 }

 if (activeFilter.value !== 'all') {
 const expected = activeFilter.value === 'active'

 if (category.is_active !== expected) {
 return false
 }
 }

 if (menuFilter.value !== 'all') {
 const expected = menuFilter.value === 'yes'

 if (category.show_in_menu !== expected) {
 return false
 }
 }

 if (homeFilter.value !== 'all') {
 const expected = homeFilter.value === 'yes'

 if (category.show_on_home !== expected) {
 return false
 }
 }

 if (levelFilter.value === 'root') {
 if (category.parent_id !== null) {
 return false
 }
 } else if (levelFilter.value !== 'all') {
 const selectedLevel = Number(levelFilter.value)

 if (selectedLevel === 4) {
 if (category.depth < 4) {
 return false
 }
 } else if (category.depth !== selectedLevel) {
 return false
 }
 }

 return true
}

function filterTree(items: Category[]): Category[] {
 return items
 .map((item) => {
 const children = filterTree(item.children ?? [])
 const selfMatches = matchesFilters(item)

 if (selfMatches || children.length > 0) {
 return {
 ...item,
 children,
 }
 }

 return null
 })
 .filter(Boolean) as Category[]
}

function childCount(category: Category) {
 return flattenCategories(category.children ?? []).length
}

function isExpanded(category: Category) {
 return expandedIds.value.includes(category.id)
}

function toggleExpanded(category: Category) {
 if (isExpanded(category)) {
 expandedIds.value = expandedIds.value.filter((id) => id !== category.id)
 return
 }

 expandedIds.value = [...expandedIds.value, category.id]
}

function expandAll() {
 expandedIds.value = flattenCategories(filteredTree.value)
 .filter((item) => item.children?.length)
 .map((item) => item.id)
}

function collapseAll() {
 expandedIds.value = []
}

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) {
 clearTimeout(noticeTimer.value)
 }

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

function openCreate(parent?: Category) {
 selectedCategory.value = parent
 ? {
 id: 0,
 parent_id: parent.id,
 name: '',
 slug: '',
 full_slug: '',
 description: null,
 icon_url: null,
 image_url: null,
 banner_image_url: null,
 meta_title: null,
 meta_description: null,
 is_active: true,
 show_in_menu: true,
 sort_order: 0,
 depth: parent.depth + 1,
 children: [],
 }
 : null

 formMode.value = 'create'
 formOpen.value = true
}

function openEdit(category: Category) {
 selectedCategory.value = category
 formMode.value = 'edit'
 formOpen.value = true

 // The tree/list payload doesn't carry FAQ rows at every depth, so pull
 // the full record (which does) before the admin starts editing.
 $api<CategoryResponse>(`/admin/categories/${category.id}`)
 .then((response) => {
 if (
 selectedCategory.value?.id === category.id
 ) {
 selectedCategory.value = response.data
 }
 })
 .catch(() => {
 // Keep the tree data already shown; the form still works,
 // just without the FAQ rows pre-filled.
 })
}

async function afterSaved() {
 formOpen.value = false

 await refresh()

 expandAll()

 showNotice(
 formMode.value === 'create'
 ? 'Category created successfully.'
 : 'Category updated successfully.',
 )
}

function askDelete(category: Category) {
 categoryToDelete.value = category
 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDelete() {
 if (!categoryToDelete.value) return

 deleting.value = true
 deleteError.value = ''

 try {
 await $api(`/admin/categories/${categoryToDelete.value.id}`, {
 method: 'DELETE',
 })

 deleteOpen.value = false
 showNotice('Category deleted successfully.')

 await refresh()
 } catch (error: any) {
 deleteError.value =
 extractApiErrorMessage(error, 'Could not delete category. Please try again.')
 } finally {
 deleting.value = false
 }
}

function clearFilters() {
 search.value = ''
 debouncedSearch.value = ''
 activeFilter.value = 'all'
 menuFilter.value = 'all'
 homeFilter.value = 'all'
 levelFilter.value = 'all'
 sortBy.value = 'sort_order'
}
</script>

<template>
 <section class="mx-auto max-w-[1600px]">
 <CategoriesSkeleton
 v-if="isInitialLoading"
 />

 <div
 v-else
 class="
 relative
 space-y-4

 sm:space-y-5
 "
 >
 <!-- Refresh overlay -->
 <div
 v-if="isRefreshing"
 class="
 pointer-events-none
 absolute
 inset-0
 z-10

 rounded-[18px]

 bg-[#f4f5f7]/40

 backdrop-blur-[1px]

 dark:bg-[#09090b]/30
 "
 />

 <!-- Intro -->
 <div
 class="
 flex
 flex-col
 gap-3

 sm:flex-row
 sm:items-center
 sm:justify-between
 "
 >
 <p
 class="
 max-w-2xl

 text-[12px]
 leading-5
 text-gray-400

 dark:text-gray-500
 "
 >
 Organize the catalog into parent categories and nested subcategories. Navigation visibility and sort order here directly control the storefront menu, and visible descendants are nested automatically under their parent.
 </p>

 <div
 class="
 flex
 shrink-0
 items-center
 gap-1.5
 "
 >
 <button
 type="button"
 aria-label="Refresh categories"
 title="Refresh categories"
 class="
 flex
 h-9
 w-9
 items-center
 justify-center

 rounded-[10px]

 text-gray-400

 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-900

 active:scale-95

 disabled:pointer-events-none
 disabled:opacity-50

 dark:text-gray-600
 dark:hover:bg-white/[0.07]
 dark:hover:text-white
 "
 :disabled="pending"
 @click="refresh"
 >
 <svg
 class="h-4 w-4"
 :class="
 pending
 ? 'animate-spin'
 : ''
 "
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M16 7A6.5 6.5 0 1 0 16.2 13"
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 />

 <path
 d="M13.5 4.5H16.5V7.5"
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </button>

 <AppButton
 size="sm"
 @click="openCreate()"
 >
 <svg
 class="h-3.5 w-3.5"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M10 4V16M4 10H16"
 stroke="currentColor"
 stroke-width="1.7"
 stroke-linecap="round"
 />
 </svg>

 Add category
 </AppButton>
 </div>
 </div>

 <!-- Notice -->
 <Transition
 enter-active-class="
 transition
 duration-200
 "
 enter-from-class="
 -translate-y-1
 opacity-0
 "
 leave-active-class="
 transition
 duration-150
 "
 leave-to-class="
 -translate-y-1
 opacity-0
 "
 >
 <div
 v-if="notice"
 class="
 flex
 items-center
 gap-2.5

 rounded-[12px]

 bg-emerald-500/[0.08]

 px-3.5
 py-2.5

 text-[12px]
 font-medium
 text-emerald-700

 dark:bg-emerald-500/10
 dark:text-emerald-300
 "
 >
 <span
 class="
 h-1.5
 w-1.5
 shrink-0
 rounded-full

 bg-emerald-500
 "
 />

 {{ notice }}
 </div>
 </Transition>

 <!-- Controls -->
 <section
 class="
 rounded-[18px]

 bg-white

 p-3

 shadow-[0_1px_2px_rgba(17,24,39,0.025)]

 dark:bg-[#111214]
 dark:shadow-none

 sm:p-4
 "
 >
 <div
 class="
 grid
 gap-2.5

 lg:grid-cols-[minmax(0,1fr)_auto]
 lg:items-center
 "
 >
 <AppInput
 v-model="search"
 placeholder="Search categories, slug or description..."
 >
 <template #prefix>
 <svg
 class="h-4 w-4"
 viewBox="0 0 20 20"
 fill="none"
 >
 <circle
 cx="8.5"
 cy="8.5"
 r="5"
 stroke="currentColor"
 stroke-width="1.5"
 />

 <path
 d="M12.5 12.5L17 17"
 stroke="currentColor"
 stroke-width="1.5"
 stroke-linecap="round"
 />
 </svg>
 </template>
 </AppInput>

 <div
 class="
 flex
 flex-wrap
 items-center
 gap-1.5
 "
 >
 <button
 type="button"
 class="
 flex
 h-10
 items-center
 gap-2

 rounded-[10px]

 bg-gray-950/[0.04]

 px-3

 text-[12px]
 font-medium
 text-gray-600

 transition

 hover:bg-gray-950/[0.065]
 hover:text-gray-900

 active:scale-[0.98]

 dark:bg-white/[0.06]
 dark:text-gray-400
 dark:hover:bg-white/[0.09]
 dark:hover:text-white
 "
 :class="
 filtersOpen
 ? `
 bg-gray-950/[0.07]
 text-gray-900

 dark:bg-white/[0.09]
 dark:text-white
 `
 : ''
 "
 @click="
 filtersOpen =
 !filtersOpen
 "
 >
 <svg
 class="h-4 w-4"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="
 M3 5H17
 M5.5 10H14.5
 M8 15H12
 "
 stroke="currentColor"
 stroke-width="1.5"
 stroke-linecap="round"
 />
 </svg>

 Filters

 <span
 v-if="visibleFilterCount"
 class="
 flex
 h-5
 min-w-5
 items-center
 justify-center

 rounded-full

 bg-gray-950

 px-1.5

 text-[11px]
 font-semibold
 text-white

 dark:bg-white
 dark:text-gray-950
 "
 >
 {{ visibleFilterCount }}
 </span>
 </button>

 <button
 type="button"
 class="
 h-10

 rounded-[10px]

 px-3

 text-[12px]
 font-medium
 text-gray-500

 transition

 hover:bg-gray-950/[0.045]
 hover:text-gray-800

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-200
 "
 @click="expandAll"
 >
 Expand
 </button>

 <button
 type="button"
 class="
 h-10

 rounded-[10px]

 px-3

 text-[12px]
 font-medium
 text-gray-500

 transition

 hover:bg-gray-950/[0.045]
 hover:text-gray-800

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-200
 "
 @click="collapseAll"
 >
 Collapse
 </button>

 <button
 v-if="hasActiveFilters"
 type="button"
 class="
 h-10

 rounded-[10px]

 px-3

 text-[11px]
 font-medium
 text-gray-400

 transition

 hover:bg-gray-950/[0.04]
 hover:text-gray-700

 dark:text-gray-600
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-300
 "
 @click="clearFilters"
 >
 Clear
 </button>
 </div>
 </div>

 <Transition
 enter-active-class="
 transition
 duration-200
 ease-out
 "
 enter-from-class="
 -translate-y-1
 opacity-0
 "
 leave-active-class="
 transition
 duration-150
 ease-in
 "
 leave-to-class="
 -translate-y-1
 opacity-0
 "
 >
 <div
 v-if="filtersOpen"
 class="
 mt-3

 grid
 gap-3

 sm:grid-cols-2

 xl:grid-cols-5
 "
 >
 <AppSelect
 v-model="activeFilter"
 label="Status"
 :options="activeOptions"
 />

 <AppSelect
 v-model="menuFilter"
 label="Menu"
 :options="menuOptions"
 />

 <AppSelect
 v-model="homeFilter"
 label="Home page"
 :options="homeOptions"
 />

 <AppSelect
 v-model="levelFilter"
 label="Level"
 :options="levelOptions"
 />

 <AppSelect
 v-model="sortBy"
 label="Sort"
 :options="sortOptions"
 />
 </div>
 </Transition>

 <!-- Summary -->
 <div
 class="
 mt-3

 flex
 flex-wrap
 items-center
 gap-x-4
 gap-y-1.5

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 <span>
 <strong
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ visibleCount }}
 </strong>

 shown
 </span>

 <span>
 <strong
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ totalCategories }}
 </strong>

 total
 </span>
 </div>
 </section>

 <AppErrorState
 v-if="error"
 title="Categories could not be loaded"
 message="Please check backend API, authentication token, or category route permissions."
 @retry="refresh"
 />

 <AppEmptyState
 v-else-if="filteredTree.length === 0"
 title="No categories found"
 message="Create a category or clear the current filters."
 >
 <template #actions>
 <div
 class="
 flex
 items-center
 gap-2
 "
 >
 <AppButton
 v-if="hasActiveFilters"
 variant="secondary"
 size="sm"
 @click="clearFilters"
 >
 Clear filters
 </AppButton>

 <AppButton
 size="sm"
 @click="openCreate()"
 >
 Add category
 </AppButton>
 </div>
 </template>
 </AppEmptyState>

 <!-- Tree -->
 <div
 v-else
 class="space-y-2.5"
 >
 <CategoryTreeItem
 v-for="category in filteredTree"
 :key="category.id"
 :category="category"
 :expanded-ids="expandedIds"
 @toggle-expanded="toggleExpanded"
 @open-create="openCreate"
 @open-edit="openEdit"
 @ask-delete="askDelete"
 />
 </div>
 </div>

 <CategoryFormModal
 :open="formOpen"
 :mode="formMode"
 :category="selectedCategory"
 :parent-options="parentOptions"
 @close="formOpen = false"
 @saved="afterSaved"
 />

 <AppConfirmModal
 :open="deleteOpen"
 title="Delete category?"
 :message="
 categoryToDelete &&
 childCount(categoryToDelete) > 0
 ? `“${categoryToDelete.name}” has ${childCount(categoryToDelete)} subcategories. Move or delete subcategories first.`
 : `This will delete “${categoryToDelete?.name || 'this category'}”. This action cannot be undone.`
 "
 confirm-label="Delete category"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="confirmDelete"
 />
 </section>
</template>