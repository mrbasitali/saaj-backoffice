<script setup lang="ts">
definePageMeta({
 middleware: 'auth',
 layout: 'admin',
})

type ProductAttribute = {
 id: number
 name: string
 code: string
 type: string
 is_filterable: boolean
 is_variant: boolean
 is_required: boolean
 is_active: boolean
 sort_order: number
 values_count?: number
}

type PaginationMeta = {
 current_page: number
 from: number | null
 last_page: number
 per_page: number
 to: number | null
 total: number
}

type AttributeIndexResponse = {
 data: ProductAttribute[]
 meta: PaginationMeta
}

const { $api } = useNuxtApp()

const search = ref('')
const debouncedSearch = ref('')
const typeFilter = ref('all')
const activeFilter = ref('all')
const variantFilter = ref('all')
const filterableFilter = ref('all')
const perPage = ref(20)
const page = ref(1)

const filtersOpen = ref(false)

const selectedAttributeId = ref<number | null>(null)
const valuesRefreshKey = ref(0)

const attributeFormOpen = ref(false)
const attributeFormMode = ref<'create' | 'edit'>('create')
const attributeToEdit = ref<ProductAttribute | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const attributeToDelete = ref<ProductAttribute | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const typeOptions = [
 { label: 'All types', value: 'all' },
 { label: 'Select', value: 'select' },
 { label: 'Color', value: 'color' },
 { label: 'Text', value: 'text' },
 { label: 'Number', value: 'number' },
 { label: 'Boolean', value: 'boolean' },
]

const activeOptions = [
 { label: 'All statuses', value: 'all' },
 { label: 'Active', value: 'active' },
 { label: 'Inactive', value: 'inactive' },
]

const variantOptions = [
 { label: 'All variant use', value: 'all' },
 { label: 'Variant attributes', value: 'yes' },
 { label: 'Not for variants', value: 'no' },
]

const filterableOptions = [
 { label: 'All filter use', value: 'all' },
 { label: 'Filterable', value: 'yes' },
 { label: 'Not filterable', value: 'no' },
]

watch(search, (value) => {
 if (searchTimer) clearTimeout(searchTimer)

 searchTimer = setTimeout(() => {
 page.value = 1
 debouncedSearch.value = value.trim()
 }, 300)
})

watch([typeFilter, activeFilter, variantFilter, filterableFilter, perPage], () => {
 page.value = 1
})

function buildQuery() {
 const query: Record<string, string | number> = {
 page: page.value,
 per_page: perPage.value,
 include_values: 1,
 }

 if (debouncedSearch.value) query.search = debouncedSearch.value
 if (typeFilter.value !== 'all') query.type = typeFilter.value
 if (activeFilter.value !== 'all') query.is_active = activeFilter.value === 'active' ? 1 : 0
 if (variantFilter.value !== 'all') query.is_variant = variantFilter.value === 'yes' ? 1 : 0
 if (filterableFilter.value !== 'all') query.is_filterable = filterableFilter.value === 'yes' ? 1 : 0

 return query
}

const {
 data,
 pending,
 error,
 refresh,
} = useAsyncData(
 'admin-attributes',
 () => $api<AttributeIndexResponse>('/admin/attributes', {
 query: buildQuery(),
 }),
 {
 watch: [
 debouncedSearch,
 typeFilter,
 activeFilter,
 variantFilter,
 filterableFilter,
 perPage,
 page,
 ],
 immediate: true,
 },
)

const attributes = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)

const selectedAttribute = computed(() => {
 return attributes.value.find((item) => item.id === selectedAttributeId.value) ?? null
})

const isInitialLoading = computed(() => pending.value && !data.value)
const isRefreshing = computed(() => pending.value && Boolean(data.value))

const hasActiveFilters = computed(() => {
 return Boolean(
 search.value ||
 typeFilter.value !== 'all' ||
 activeFilter.value !== 'all' ||
 variantFilter.value !== 'all' ||
 filterableFilter.value !== 'all',
 )
})

const visibleFilterCount = computed(() => {
 return [
 typeFilter.value !== 'all',
 activeFilter.value !== 'all',
 variantFilter.value !== 'all',
 filterableFilter.value !== 'all',
 ].filter(Boolean).length
})

const canGoPrevious = computed(() => page.value > 1)

const canGoNext = computed(() => {
 if (!meta.value) return false
 return page.value < meta.value.last_page
})

watch(attributes, (items) => {
 if (!items.length) {
 selectedAttributeId.value = null
 return
 }

 const selectedStillExists = items.some((item) => item.id === selectedAttributeId.value)

 if (!selectedStillExists) {
 selectedAttributeId.value = items[0].id
 }
}, { immediate: true })

function typeLabel(type: string) {
 return {
 select: 'Select',
 color: 'Color',
 text: 'Text',
 number: 'Number',
 boolean: 'Boolean',
 }[type] || type
}

function typeBadgeVariant(type: string): 'neutral' | 'blue' | 'amber' {
 if (type === 'color') return 'blue'
 if (type === 'boolean') return 'amber'

 return 'neutral'
}

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) clearTimeout(noticeTimer.value)

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

function openCreateAttribute() {
 attributeToEdit.value = null
 attributeFormMode.value = 'create'
 attributeFormOpen.value = true
}

function openEditAttribute(attribute: ProductAttribute) {
 attributeToEdit.value = attribute
 attributeFormMode.value = 'edit'
 attributeFormOpen.value = true
}

async function afterAttributeSaved() {
 attributeFormOpen.value = false

 await refresh()

 showNotice(
 attributeFormMode.value === 'create'
 ? 'Attribute created successfully.'
 : 'Attribute updated successfully.',
 )
}

function askDeleteAttribute(attribute: ProductAttribute) {
 attributeToDelete.value = attribute
 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDeleteAttribute() {
 if (!attributeToDelete.value) return

 deleting.value = true
 deleteError.value = ''

 try {
 await $api(`/admin/attributes/${attributeToDelete.value.id}`, {
 method: 'DELETE',
 })

 deleteOpen.value = false
 showNotice('Attribute deleted successfully.')

 await refresh()
 } catch (err: any) {
 deleteError.value = err?.data?.message || 'Could not delete attribute.'
 } finally {
 deleting.value = false
 }
}

function clearFilters() {
 search.value = ''
 debouncedSearch.value = ''
 typeFilter.value = 'all'
 activeFilter.value = 'all'
 variantFilter.value = 'all'
 filterableFilter.value = 'all'
 page.value = 1
}

function previousPage() {
 if (!canGoPrevious.value) return
 page.value--
}

function nextPage() {
 if (!canGoNext.value) return
 page.value++
}

async function onValuesChanged() {
 valuesRefreshKey.value++
 await refresh()
}
</script>

<template>
 <section class="mx-auto max-w-[1600px]">
 <AttributesSkeleton
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
 Define reusable product options such as
 size, color, material and other structured
 product data.
 </p>

 <div
 class="
 flex
 items-center
 gap-1.5
 "
 >
 <button
 type="button"
 title="Refresh attributes"
 aria-label="Refresh attributes"
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
 @click="openCreateAttribute"
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

 Add attribute
 </AppButton>
 </div>
 </div>

 <!-- Notice -->
 <Transition
 enter-active-class="
 transition
 duration-180
 "
 enter-from-class="
 -translate-y-1
 opacity-0
 "
 leave-active-class="
 transition
 duration-120
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
 placeholder="Search attributes by name or code..."
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
 v-if="
 visibleFilterCount
 "
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

 hover:bg-gray-950/[0.045]
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
 duration-180
 ease-out
 "
 enter-from-class="
 -translate-y-1
 opacity-0
 "
 leave-active-class="
 transition
 duration-120
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

 xl:grid-cols-4
 "
 >
 <AppSelect
 v-model="typeFilter"
 label="Type"
 :options="typeOptions"
 />

 <AppSelect
 v-model="activeFilter"
 label="Status"
 :options="activeOptions"
 />

 <AppSelect
 v-model="variantFilter"
 label="Variant use"
 :options="variantOptions"
 />

 <AppSelect
 v-model="filterableFilter"
 label="Filter use"
 :options="filterableOptions"
 />
 </div>
 </Transition>

 <div
 class="
 mt-3

 flex
 flex-wrap
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
 {{ attributes.length }}
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
 {{ meta?.total ?? 0 }}
 </strong>

 total
 </span>
 </div>
 </section>

 <AppErrorState
 v-if="error"
 title="Attributes could not be loaded"
 message="Please check backend API, authentication token, or route permissions."
 @retry="refresh"
 />

 <AppEmptyState
 v-else-if="
 attributes.length === 0
 "
 title="No attributes found"
 message="Create your first product attribute or clear the current filters."
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
 @click="openCreateAttribute"
 >
 Add attribute
 </AppButton>
 </div>
 </template>
 </AppEmptyState>

 <!-- Workspace -->
 <div
 v-else
 class="
 grid
 gap-4

 xl:grid-cols-[minmax(0,1fr)_420px]
 "
 >
 <!-- Attributes -->
 <div
 class="
 min-w-0
 space-y-3
 "
 >
 <section
 class="
 overflow-visible

 rounded-[18px]

 bg-white

 shadow-[0_1px_2px_rgba(17,24,39,0.025)]

 dark:bg-[#111214]
 dark:shadow-none
 "
 >
 <!-- Desktop headings -->
 <div
 class="
 hidden

 grid-cols-[minmax(220px,1.7fr)_minmax(180px,1fr)_90px_80px_44px]
 items-center
 gap-4

 px-4
 py-3

 text-[11px]
 font-semibold
 uppercase
 tracking-[0.08em]
 text-gray-400

 dark:text-gray-600

 md:grid
 "
 >
 <span>
 Attribute
 </span>

 <span>
 Usage
 </span>

 <span class="text-right">
 Values
 </span>

 <span class="text-right">
 Order
 </span>

 <span />
 </div>

 <div
 class="
 divide-y
 divide-gray-100

 dark:divide-white/[0.055]
 "
 >
 <div
 v-for="attribute in attributes"
 :key="attribute.id"
 class="
 group

 relative

 transition

 hover:bg-gray-950/[0.018]

 dark:hover:bg-white/[0.025]
 "
 :class="
 selectedAttributeId
 === attribute.id
 ? `
 bg-gray-950/[0.035]

 dark:bg-white/[0.055]
 `
 : ''
 "
 >
 <div
 class="
 flex
 items-center
 gap-3

 px-3
 py-3

 md:grid
 md:grid-cols-[minmax(220px,1.7fr)_minmax(180px,1fr)_90px_80px_44px]
 md:gap-4
 md:px-4
 "
 >
 <!-- Attribute -->
 <button
 type="button"
 class="
 flex
 min-w-0
 flex-1
 items-center
 gap-3

 text-left

 md:flex-none
 "
 @click="
 selectedAttributeId =
 attribute.id
 "
 >
 <div
 class="
 flex
 h-9
 w-9
 shrink-0
 items-center
 justify-center

 rounded-[9px]

 bg-gray-950/[0.045]

 text-[12px]
 font-semibold
 text-gray-500

 dark:bg-white/[0.065]
 dark:text-gray-400
 "
 >
 <span
 v-if="
 attribute.type
 !== 'color'
 "
 >
 {{
 typeLabel(
 attribute.type,
 )
 .slice(0, 1)
 .toUpperCase()
 }}
 </span>

 <span
 v-else
 class="
 grid
 h-4
 w-4
 grid-cols-2
 overflow-hidden

 rounded-full
 "
 >
 <span
 class="
 bg-red-400
 "
 />
 <span
 class="
 bg-blue-400
 "
 />
 <span
 class="
 bg-emerald-400
 "
 />
 <span
 class="
 bg-amber-400
 "
 />
 </span>
 </div>

 <div
 class="
 min-w-0
 "
 >
 <div
 class="
 flex
 min-w-0
 items-center
 gap-2
 "
 >
 <p
 class="
 truncate

 text-[13px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 {{ attribute.name }}
 </p>

 <span
 class="
 flex
 shrink-0
 items-center
 gap-1.5

 text-[11px]
 text-gray-500

 dark:text-gray-500
 "
 >
 <span
 class="
 h-1.5
 w-1.5
 rounded-full
 "
 :class="
 attribute.is_active
 ? 'bg-emerald-500'
 : 'bg-gray-300 dark:bg-gray-700'
 "
 />

 {{
 attribute.is_active
 ? 'Active'
 : 'Inactive'
 }}
 </span>
 </div>

 <p
 class="
 mt-0.5
 truncate

 font-mono
 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ attribute.code }}

 <span
 class="
 font-sans
 "
 >
 ·
 {{
 typeLabel(
 attribute.type,
 )
 }}
 </span>
 </p>
 </div>
 </button>

 <!-- Usage -->
 <button
 type="button"
 class="
 hidden
 min-w-0

 text-left

 md:block
 "
 @click="
 selectedAttributeId =
 attribute.id
 "
 >
 <p
 class="
 truncate

 text-[12px]
 text-gray-600

 dark:text-gray-400
 "
 >
 {{
 [
 attribute.is_variant
 ? 'Variant'
 : null,

 attribute.is_filterable
 ? 'Filter'
 : null,

 attribute.is_required
 ? 'Required'
 : null,
 ]
 .filter(Boolean)
 .join(' · ')
 || 'Product data'
 }}
 </p>

 <p
 class="
 mt-0.5

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{
 attribute.is_variant
 ? 'Creates variant options'
 : attribute.is_filterable
 ? 'Available for filtering'
 : 'Standard attribute'
 }}
 </p>
 </button>

 <!-- Values -->
 <button
 type="button"
 class="
 hidden

 text-right

 md:block
 "
 @click="
 selectedAttributeId =
 attribute.id
 "
 >
 <p
 class="
 text-[12px]
 font-medium
 tabular-nums
 text-gray-700

 dark:text-gray-300
 "
 >
 {{
 attribute.values_count
 ?? 0
 }}
 </p>

 <p
 class="
 mt-0.5

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 values
 </p>
 </button>

 <!-- Sort -->
 <button
 type="button"
 class="
 hidden

 text-right

 md:block
 "
 @click="
 selectedAttributeId =
 attribute.id
 "
 >
 <span
 class="
 text-[12px]
 font-medium
 tabular-nums
 text-gray-600

 dark:text-gray-400
 "
 >
 {{ attribute.sort_order }}
 </span>
 </button>

 <!-- Action -->
 <AppActionMenu>
 <template #default="{ close }">
 <AppActionMenuItem
 @click="
 selectedAttributeId =
 attribute.id;
 close()
 "
 >
 Manage values
 </AppActionMenuItem>

 <AppActionMenuItem
 @click="
 openEditAttribute(
 attribute,
 );
 close()
 "
 >
 Edit attribute
 </AppActionMenuItem>

 <AppActionMenuItem
 danger
 @click="
 askDeleteAttribute(
 attribute,
 );
 close()
 "
 >
 Delete attribute
 </AppActionMenuItem>
 </template>
 </AppActionMenu>
 </div>

 <!-- Mobile metadata -->
 <button
 type="button"
 class="
 flex
 w-full
 flex-wrap
 gap-x-3
 gap-y-1

 px-3
 pb-3
 pl-[60px]

 text-left
 text-[11px]
 text-gray-400

 dark:text-gray-600

 md:hidden
 "
 @click="
 selectedAttributeId =
 attribute.id
 "
 >
 <span>
 {{
 attribute.values_count
 ?? 0
 }}
 values
 </span>

 <span
 v-if="
 attribute.is_variant
 "
 >
 Variant
 </span>

 <span
 v-if="
 attribute.is_filterable
 "
 >
 Filterable
 </span>

 <span>
 Sort
 {{ attribute.sort_order }}
 </span>
 </button>
 </div>
 </div>
 </section>

 <!-- Pagination -->
 <section
 class="
 flex
 flex-col
 gap-3

 rounded-[16px]

 bg-white

 px-3
 py-3

 dark:bg-[#111214]

 sm:flex-row
 sm:items-center
 sm:justify-between
 "
 >
 <p
 class="
 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 Showing

 <span
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ meta?.from ?? 0 }}
 </span>

 –

 <span
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ meta?.to ?? 0 }}
 </span>

 of

 <span
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ meta?.total ?? 0 }}
 </span>
 </p>

 <div
 class="
 flex
 items-center
 justify-between
 gap-1

 sm:justify-end
 "
 >
 <button
 type="button"
 title="Previous page"
 class="
 flex
 h-8
 w-8
 items-center
 justify-center

 rounded-[8px]

 text-gray-500

 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-900

 disabled:pointer-events-none
 disabled:opacity-30

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-white
 "
 :disabled="!canGoPrevious"
 @click="previousPage"
 >
 <svg
 class="h-4 w-4"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M12 5L7 10L12 15"
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </button>

 <span
 class="
 min-w-[76px]

 text-center
 text-[11px]
 font-medium
 text-gray-500

 dark:text-gray-500
 "
 >
 {{
 meta?.current_page
 ?? page
 }}
 /
 {{
 meta?.last_page
 ?? 1
 }}
 </span>

 <button
 type="button"
 title="Next page"
 class="
 flex
 h-8
 w-8
 items-center
 justify-center

 rounded-[8px]

 text-gray-500

 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-900

 disabled:pointer-events-none
 disabled:opacity-30

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-white
 "
 :disabled="!canGoNext"
 @click="nextPage"
 >
 <svg
 class="h-4 w-4"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M8 5L13 10L8 15"
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </button>
 </div>
 </section>
 </div>

 <!-- Values -->
 <div
 class="
 min-w-0

 xl:sticky
 xl:top-20
 xl:self-start
 "
 >
 <AttributeValuesPanel
 :attribute="selectedAttribute"
 :refresh-key="valuesRefreshKey"
 @changed="onValuesChanged"
 />
 </div>
 </div>
 </div>

 <AttributeFormModal
 :open="attributeFormOpen"
 :mode="attributeFormMode"
 :attribute="attributeToEdit"
 @close="
 attributeFormOpen = false
 "
 @saved="afterAttributeSaved"
 />

 <AppConfirmModal
 :open="deleteOpen"
 title="Delete attribute?"
 :message="`This will delete “${attributeToDelete?.name || 'this attribute'}”. Attributes with values or category mappings cannot be deleted until those are removed.`"
 confirm-label="Delete attribute"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="
 confirmDeleteAttribute
 "
 />
 </section>
</template>