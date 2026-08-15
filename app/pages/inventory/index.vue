<script setup lang="ts">
definePageMeta({
 middleware: 'auth',
 layout: 'admin',
})

type OptimizedUrls = {
 thumb?: string | null
 card?: string | null
 detail?: string | null
 zoom?: string | null
}

type ProductImage = {
 id: number
 image_url: string
 optimized_urls?: OptimizedUrls
 alt_text: string | null
}

type Brand = {
 id: number
 name: string
}

type Product = {
 id: number
 name: string
 slug: string
 is_active: boolean
 brand?: Brand | null
 primary_image?: ProductImage | null
 variants?: ProductVariant[]
}

type ProductVariant = {
 id: number
 product_id: number
 product?: Product | null
 sku: string | null
 barcode: string | null
 name: string | null
 option_summary: string | null
 track_inventory: boolean
 allow_backorder: boolean
 min_stock_level: number
 is_default: boolean
 is_active: boolean
 primary_image?: ProductImage | null
}

type InventoryLocation = {
 id: number
 name: string
 code: string
 type: string
 phone: string | null
 address: string | null
 is_default: boolean
 is_active: boolean
 sort_order: number
 created_at?: string | null
 updated_at?: string | null
}

type InventoryStock = {
 id: number
 product_variant_id: number
 variant?: ProductVariant | null
 inventory_location_id: number
 location?: InventoryLocation | null
 on_hand_quantity: number
 reserved_quantity: number
 available_quantity: number
 created_at?: string | null
 updated_at?: string | null
}

type InventoryMovement = {
 id: number
 product_variant_id: number
 variant?: ProductVariant | null
 inventory_location_id: number
 location?: InventoryLocation | null
 user_id: number | null
 user?: {
 id: number | null
 name: string | null
 email: string | null
 } | null
 type: string
 quantity_change: number
 quantity_before: number
 quantity_after: number
 reference_type: string | null
 reference_id: number | null
 note: string | null
 created_at: string | null
}

type PaginationMeta = {
 current_page: number
 from: number | null
 last_page: number
 per_page: number
 to: number | null
 total: number
}

type InventoryStockResponse = {
 data: InventoryStock[]
 meta: PaginationMeta
}

type InventoryMovementResponse = {
 data: InventoryMovement[]
 meta: PaginationMeta
}

type InventoryLocationResponse = {
 data: InventoryLocation[]
}

type ProductIndexResponse = {
 data: Product[]
 meta?: PaginationMeta
}

const { $api } = useNuxtApp()

const activeTab = ref<'stock' | 'movements' | 'locations'>('stock')

const inventoryTabs = [
 { label: 'Stock levels', value: 'stock' },
 { label: 'Movements', value: 'movements' },
 { label: 'Locations', value: 'locations' },
]

function setActiveTab(value: string) {
 activeTab.value = value as 'stock' | 'movements' | 'locations'
}
const filtersOpen = ref(true)

const stockSearch = ref('')
const debouncedStockSearch = ref('')
const stockLocationFilter = ref('all')
const stockStatusFilter = ref('all')
const stockTrackFilter = ref('all')
const stockSortBy = ref('updated')
const stockPerPage = ref(20)
const stockPage = ref(1)

const movementSearch = ref('')
const debouncedMovementSearch = ref('')
const movementLocationFilter = ref('all')
const movementTypeFilter = ref('all')
const movementDateFrom = ref('')
const movementDateTo = ref('')
const movementPerPage = ref(20)
const movementPage = ref(1)

const locationSearch = ref('')
const locationTypeFilter = ref('all')
const locationActiveFilter = ref('all')

const adjustmentOpen = ref(false)
const locationFormOpen = ref(false)
const locationFormMode = ref<'create' | 'edit'>('create')
const selectedLocation = ref<InventoryLocation | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const locationToDelete = ref<InventoryLocation | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let stockSearchTimer: ReturnType<typeof setTimeout> | null = null
let movementSearchTimer: ReturnType<typeof setTimeout> | null = null

const stockStatusOptions = [
 { label: 'All stock states', value: 'all' },
 { label: 'Healthy', value: 'healthy' },
 { label: 'Low stock', value: 'low_stock' },
 { label: 'Out of stock', value: 'out_of_stock' },
 { label: 'Has reserved stock', value: 'reserved' },
]

const trackInventoryOptions = [
 { label: 'All tracking states', value: 'all' },
 { label: 'Tracked variants', value: 'yes' },
 { label: 'Not tracked', value: 'no' },
]

const stockSortOptions = [
 { label: 'Recently updated', value: 'updated' },
 { label: 'Product name', value: 'product' },
 { label: 'Location', value: 'location' },
 { label: 'Available high first', value: 'available' },
 { label: 'On hand high first', value: 'on_hand' },
 { label: 'Reserved high first', value: 'reserved' },
]

const movementTypeOptions = [
 { label: 'All movement types', value: 'all' },
 { label: 'Opening', value: 'opening' },
 { label: 'Adjustment', value: 'adjustment' },
 { label: 'Damaged', value: 'damaged' },
 { label: 'Purchase', value: 'purchase' },
 { label: 'Sale', value: 'sale' },
 { label: 'Sale return', value: 'sale_return' },
 { label: 'Purchase return', value: 'purchase_return' },
 { label: 'Transfer in', value: 'transfer_in' },
 { label: 'Transfer out', value: 'transfer_out' },
]

const locationTypeOptions = [
 { label: 'All types', value: 'all' },
 { label: 'Warehouse', value: 'warehouse' },
 { label: 'Store', value: 'store' },
 { label: 'Online', value: 'online' },
]

const activeOptions = [
 { label: 'All statuses', value: 'all' },
 { label: 'Active', value: 'active' },
 { label: 'Inactive', value: 'inactive' },
]

const perPageOptions = [
 { label: '20 / page', value: 20 },
 { label: '50 / page', value: 50 },
 { label: '100 / page', value: 100 },
]

watch(stockSearch, (value) => {
 if (stockSearchTimer) clearTimeout(stockSearchTimer)

 stockSearchTimer = setTimeout(() => {
 stockPage.value = 1
 debouncedStockSearch.value = value.trim()
 }, 300)
})

watch(movementSearch, (value) => {
 if (movementSearchTimer) clearTimeout(movementSearchTimer)

 movementSearchTimer = setTimeout(() => {
 movementPage.value = 1
 debouncedMovementSearch.value = value.trim()
 }, 300)
})

watch([stockLocationFilter, stockStatusFilter, stockTrackFilter, stockSortBy, stockPerPage], () => {
 stockPage.value = 1
})

watch([movementLocationFilter, movementTypeFilter, movementDateFrom, movementDateTo, movementPerPage], () => {
 movementPage.value = 1
})

function stockQuery() {
 const query: Record<string, string | number> = {
 page: stockPage.value,
 per_page: stockPerPage.value,
 sort_by: stockSortBy.value,
 }

 if (debouncedStockSearch.value) query.search = debouncedStockSearch.value
 if (stockLocationFilter.value !== 'all') query.inventory_location_id = stockLocationFilter.value
 if (stockStatusFilter.value !== 'all') query.stock_status = stockStatusFilter.value
 if (stockTrackFilter.value !== 'all') query.track_inventory = stockTrackFilter.value === 'yes' ? 1 : 0

 return query
}

function movementQuery() {
 const query: Record<string, string | number> = {
 page: movementPage.value,
 per_page: movementPerPage.value,
 }

 if (debouncedMovementSearch.value) query.search = debouncedMovementSearch.value
 if (movementLocationFilter.value !== 'all') query.inventory_location_id = movementLocationFilter.value
 if (movementTypeFilter.value !== 'all') query.type = movementTypeFilter.value
 if (movementDateFrom.value) query.date_from = movementDateFrom.value
 if (movementDateTo.value) query.date_to = movementDateTo.value

 return query
}

const {
 data: bootstrap,
 pending: bootstrapPending,
 error: bootstrapError,
 refresh: refreshBootstrap,
} = useAsyncData(
 'inventory-bootstrap',
 async () => {
 const [locationsResponse, productsResponse] = await Promise.all([
 $api<InventoryLocationResponse>('/admin/inventory-locations'),
 $api<ProductIndexResponse>('/admin/products', {
 query: {
 include_variants: 1,
 is_active: 1,
 per_page: 100,
 sort_by: 'name',
 },
 }),
 ])

 return {
 locations: locationsResponse.data ?? [],
 products: productsResponse.data ?? [],
 }
 },
 { immediate: true },
)

const {
 data: stockData,
 pending: stockPending,
 error: stockError,
 refresh: refreshStocks,
} = useAsyncData(
 'inventory-stocks',
 () => $api<InventoryStockResponse>('/admin/inventory-stocks', {
 query: stockQuery(),
 }),
 {
 watch: [
 debouncedStockSearch,
 stockLocationFilter,
 stockStatusFilter,
 stockTrackFilter,
 stockSortBy,
 stockPerPage,
 stockPage,
 ],
 immediate: true,
 },
)

const {
 data: movementData,
 pending: movementPending,
 error: movementError,
 refresh: refreshMovements,
} = useAsyncData(
 'inventory-movements',
 () => $api<InventoryMovementResponse>('/admin/inventory-movements', {
 query: movementQuery(),
 }),
 {
 watch: [
 debouncedMovementSearch,
 movementLocationFilter,
 movementTypeFilter,
 movementDateFrom,
 movementDateTo,
 movementPerPage,
 movementPage,
 ],
 immediate: true,
 },
)

const locations = computed(() => bootstrap.value?.locations ?? [])
const products = computed(() => bootstrap.value?.products ?? [])
const stocks = computed(() => stockData.value?.data ?? [])
const stockMeta = computed(() => stockData.value?.meta)
const movements = computed(() => movementData.value?.data ?? [])
const movementMeta = computed(() => movementData.value?.meta)

const isInitialLoading = computed(() => {
 return (bootstrapPending.value || stockPending.value || movementPending.value) && !bootstrap.value && !stockData.value
})

const isRefreshing = computed(() => {
 return (bootstrapPending.value || stockPending.value || movementPending.value) && Boolean(bootstrap.value || stockData.value || movementData.value)
})

const hasError = computed(() => bootstrapError.value || stockError.value || movementError.value)

const locationOptions = computed(() => [
 { label: 'All locations', value: 'all' },
 ...locations.value.map((location) => ({
 label: `${location.name} (${location.code})`,
 value: String(location.id),
 })),
])

const filteredLocations = computed(() => {
 const search = locationSearch.value.trim().toLowerCase()

 return locations.value.filter((location) => {
 const matchesSearch = !search
 || location.name.toLowerCase().includes(search)
 || location.code.toLowerCase().includes(search)
 || String(location.phone || '').toLowerCase().includes(search)
 || String(location.address || '').toLowerCase().includes(search)

 const matchesType = locationTypeFilter.value === 'all' || location.type === locationTypeFilter.value
 const matchesActive = locationActiveFilter.value === 'all'
 || (locationActiveFilter.value === 'active' ? location.is_active : !location.is_active)

 return matchesSearch && matchesType && matchesActive
 })
})

const totalOnHand = computed(() => stocks.value.reduce((sum, stock) => sum + Number(stock.on_hand_quantity || 0), 0))
const totalAvailable = computed(() => stocks.value.reduce((sum, stock) => sum + Number(stock.available_quantity || 0), 0))
const totalReserved = computed(() => stocks.value.reduce((sum, stock) => sum + Number(stock.reserved_quantity || 0), 0))
const lowStockRows = computed(() => stocks.value.filter((stock) => stockStatus(stock) === 'low_stock' || stockStatus(stock) === 'out_of_stock').length)

const canGoPreviousStock = computed(() => stockPage.value > 1)
const canGoNextStock = computed(() => stockMeta.value ? stockPage.value < stockMeta.value.last_page : false)
const canGoPreviousMovement = computed(() => movementPage.value > 1)
const canGoNextMovement = computed(() => movementMeta.value ? movementPage.value < movementMeta.value.last_page : false)

function refreshAll() {
 return Promise.all([
 refreshBootstrap(),
 refreshStocks(),
 refreshMovements(),
 ])
}

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) clearTimeout(noticeTimer.value)

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

function productName(stockOrMovement: InventoryStock | InventoryMovement) {
 return stockOrMovement.variant?.product?.name || 'Unknown product'
}

function productBrand(stockOrMovement: InventoryStock | InventoryMovement) {
 return stockOrMovement.variant?.product?.brand?.name || 'No brand'
}

function variantName(variant?: ProductVariant | null) {
 if (!variant) return 'Unknown variant'

 return variant.option_summary || variant.name || (variant.is_default ? 'Default variant' : 'Variant')
}

function variantSku(variant?: ProductVariant | null) {
 if (!variant?.sku && !variant?.barcode) return 'No SKU / barcode'

 return [variant.sku ? `SKU ${variant.sku}` : null, variant.barcode ? `Barcode ${variant.barcode}` : null]
 .filter(Boolean)
 .join(' · ')
}

function productImage(stockOrMovement: InventoryStock | InventoryMovement) {
 const variantImage = stockOrMovement.variant?.primary_image
 const productImage = stockOrMovement.variant?.product?.primary_image

 return variantImage?.optimized_urls?.thumb
 || variantImage?.optimized_urls?.card
 || variantImage?.image_url
 || productImage?.optimized_urls?.thumb
 || productImage?.optimized_urls?.card
 || productImage?.image_url
 || ''
}

function stockStatus(stock: InventoryStock) {
 const available = Number(stock.available_quantity || 0)
 const min = Number(stock.variant?.min_stock_level || 0)

 if (available <= 0) return 'out_of_stock'
 if (available <= min) return 'low_stock'

 return 'healthy'
}

function stockBadgeVariant(stock: InventoryStock): 'green' | 'amber' | 'red' {
 const status = stockStatus(stock)

 if (status === 'out_of_stock') return 'red'
 if (status === 'low_stock') return 'amber'

 return 'green'
}

function stockLabel(stock: InventoryStock) {
 const status = stockStatus(stock)

 if (status === 'out_of_stock') return 'Out of stock'
 if (status === 'low_stock') return 'Low stock'

 return 'Healthy'
}

function movementBadgeVariant(movement: InventoryMovement): 'green' | 'red' | 'amber' | 'blue' | 'neutral' {
 if (movement.quantity_change > 0) return 'green'
 if (movement.type === 'damaged' || movement.quantity_change < 0) return 'red'
 if (movement.type.includes('transfer')) return 'blue'

 return 'neutral'
}

function movementTypeLabel(type: string) {
 return type
 .replaceAll('_', ' ')
 .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function locationTypeLabel(type: string) {
 return movementTypeLabel(type)
}

function dateLabel(value?: string | null) {
 if (!value) return 'Not set'

 return new Intl.DateTimeFormat('en', {
 year: 'numeric',
 month: 'short',
 day: '2-digit',
 hour: '2-digit',
 minute: '2-digit',
 }).format(new Date(value))
}

function clearStockFilters() {
 stockSearch.value = ''
 debouncedStockSearch.value = ''
 stockLocationFilter.value = 'all'
 stockStatusFilter.value = 'all'
 stockTrackFilter.value = 'all'
 stockSortBy.value = 'updated'
 stockPerPage.value = 20
 stockPage.value = 1
}

function clearMovementFilters() {
 movementSearch.value = ''
 debouncedMovementSearch.value = ''
 movementLocationFilter.value = 'all'
 movementTypeFilter.value = 'all'
 movementDateFrom.value = ''
 movementDateTo.value = ''
 movementPerPage.value = 20
 movementPage.value = 1
}

function clearLocationFilters() {
 locationSearch.value = ''
 locationTypeFilter.value = 'all'
 locationActiveFilter.value = 'all'
}

async function afterAdjustmentSaved(message?: string) {
 adjustmentOpen.value = false
 showNotice(message || 'Inventory adjusted successfully.')

 await Promise.all([
 refreshStocks(),
 refreshMovements(),
 ])
}

function openCreateLocation() {
 selectedLocation.value = null
 locationFormMode.value = 'create'
 locationFormOpen.value = true
}

function openEditLocation(location: InventoryLocation) {
 selectedLocation.value = location
 locationFormMode.value = 'edit'
 locationFormOpen.value = true
}

async function afterLocationSaved(message?: string) {
 locationFormOpen.value = false
 showNotice(message || 'Location saved successfully.')
 await refreshBootstrap()
}

function askDeleteLocation(location: InventoryLocation) {
 locationToDelete.value = location
 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDeleteLocation() {
 if (!locationToDelete.value) return

 deleting.value = true
 deleteError.value = ''

 try {
 await $api(`/admin/inventory-locations/${locationToDelete.value.id}`, {
 method: 'DELETE',
 })

 deleteOpen.value = false
 showNotice('Location deleted successfully.')
 await refreshBootstrap()
 } catch (error: any) {
 deleteError.value = extractApiErrorMessage(error, 'Could not delete location.')
 } finally {
 deleting.value = false
 }
}

function previousStockPage() {
 if (!canGoPreviousStock.value) return
 stockPage.value--
}

function nextStockPage() {
 if (!canGoNextStock.value) return
 stockPage.value++
}

function previousMovementPage() {
 if (!canGoPreviousMovement.value) return
 movementPage.value--
}

function nextMovementPage() {
 if (!canGoNextMovement.value) return
 movementPage.value++
}
</script>

<template>
 <section class="mx-auto max-w-[1600px]">
 <InventorySkeleton v-if="isInitialLoading" />

 <div
 v-else
 class="relative space-y-4 sm:space-y-5"
 >
 <div
 v-if="isRefreshing"
 class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-[#f4f5f7]/40 backdrop-blur-[1px] dark:bg-[#09090b]/30"
 />

 <AppPageHeader
 eyebrow="Operations"
 title="Inventory"
 description="Control stock levels, stock locations, low-stock checks and every movement that changes quantity."
 >
 <template #actions>
 <AppButton
 variant="secondary"
 :loading="bootstrapPending || stockPending || movementPending"
 @click="refreshAll"
 >
 {{ bootstrapPending || stockPending || movementPending ? 'Refreshing...' : 'Refresh' }}
 </AppButton>

 <AppButton @click="adjustmentOpen = true">
 Adjust stock
 </AppButton>
 </template>
 </AppPageHeader>

 <div
 v-if="notice"
 class="rounded-[12px] bg-emerald-500/[0.07] p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
 >
 {{ notice }}
 </div>

 <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Stock rows
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ stockMeta?.total ?? stocks.length }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Variant-location records
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 On hand on page
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ totalOnHand }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Physical stock
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Available on page
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ totalAvailable }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 After reserved stock
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Needs attention
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ lowStockRows }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Low or out on page
 </p>
 </AppCard>
 </div>

 <AppCard class="overflow-visible">
 <div class="flex flex-col gap-4 shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 lg:flex-row lg:items-center lg:justify-between">
 <div class="w-full lg:max-w-[560px]">
 <AppTabs
 :model-value="activeTab"
 :items="inventoryTabs"
 aria-label="Inventory views"
 @update:model-value="setActiveTab"
 />
 </div>

 <div class="flex flex-wrap gap-2">
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 @click="filtersOpen = !filtersOpen"
 >
 {{ filtersOpen ? 'Hide filters' : 'Show filters' }}
 </AppButton>

 <AppButton
 v-if="activeTab === 'locations'"
 type="button"
 size="sm"
 @click="openCreateLocation"
 >
 Add location
 </AppButton>
 </div>
 </div>

 <div
 v-if="filtersOpen && activeTab === 'stock'"
 class="space-y-4 shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 "
 >
 <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
 <AppInput
 v-model="stockSearch"
 placeholder="Search product, SKU, barcode, variant..."
 />

 <AppButton
 v-if="stockSearch || stockLocationFilter !== 'all' || stockStatusFilter !== 'all' || stockTrackFilter !== 'all' || stockSortBy !== 'updated'"
 type="button"
 variant="ghost"
 @click="clearStockFilters"
 >
 Clear filters
 </AppButton>
 </div>

 <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
 <AppSelect
 v-model="stockLocationFilter"
 label="Location"
 :options="locationOptions"
 />

 <AppSelect
 v-model="stockStatusFilter"
 label="Stock status"
 :options="stockStatusOptions"
 />

 <AppSelect
 v-model="stockTrackFilter"
 label="Tracking"
 :options="trackInventoryOptions"
 />

 <AppSelect
 v-model="stockSortBy"
 label="Sort"
 :options="stockSortOptions"
 />

 <AppSelect
 v-model="stockPerPage"
 label="Rows"
 :options="perPageOptions"
 />
 </div>
 </div>

 <div
 v-if="filtersOpen && activeTab === 'movements'"
 class="space-y-4 shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 "
 >
 <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
 <AppInput
 v-model="movementSearch"
 placeholder="Search product, SKU, barcode, note or reference..."
 />

 <AppButton
 v-if="movementSearch || movementLocationFilter !== 'all' || movementTypeFilter !== 'all' || movementDateFrom || movementDateTo"
 type="button"
 variant="ghost"
 @click="clearMovementFilters"
 >
 Clear filters
 </AppButton>
 </div>

 <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
 <AppSelect
 v-model="movementLocationFilter"
 label="Location"
 :options="locationOptions"
 />

 <AppSelect
 v-model="movementTypeFilter"
 label="Movement type"
 :options="movementTypeOptions"
 />

 <AppInput
 v-model="movementDateFrom"
 label="Date from"
 type="date"
 />

 <AppInput
 v-model="movementDateTo"
 label="Date to"
 type="date"
 />

 <AppSelect
 v-model="movementPerPage"
 label="Rows"
 :options="perPageOptions"
 />
 </div>
 </div>

 <div
 v-if="filtersOpen && activeTab === 'locations'"
 class="space-y-4 shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 "
 >
 <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
 <AppInput
 v-model="locationSearch"
 placeholder="Search location name, code, phone or address..."
 />

 <AppButton
 v-if="locationSearch || locationTypeFilter !== 'all' || locationActiveFilter !== 'all'"
 type="button"
 variant="ghost"
 @click="clearLocationFilters"
 >
 Clear filters
 </AppButton>
 </div>

 <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
 <AppSelect
 v-model="locationTypeFilter"
 label="Type"
 :options="locationTypeOptions"
 />

 <AppSelect
 v-model="locationActiveFilter"
 label="Status"
 :options="activeOptions"
 />
 </div>
 </div>
 </AppCard>

 <AppErrorState
 v-if="hasError"
 title="Inventory could not be loaded"
 message="Please check API permissions, backend routes, or inventory database tables."
 @retry="refreshAll"
 />

 <template v-else>
 <template v-if="activeTab === 'stock'">
 <AppEmptyState
 v-if="stocks.length === 0"
 title="No stock records found"
 message="Create stock records by adding variants and saving an opening stock adjustment."
 >
 <template #actions>
 <AppButton @click="adjustmentOpen = true">
 Adjust stock
 </AppButton>
 </template>
 </AppEmptyState>

 <template v-else>
 <AppCard class="hidden overflow-hidden xl:block">
 <div class="overflow-hidden">
 <table class="w-full table-fixed divide-y divide-gray-100 dark:divide-white/[0.055]">
 <thead class="bg-gray-950/[0.018] dark:bg-white/[0.025]">
 <tr>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">Product</th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">Location</th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">Status</th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">On hand</th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">Reserved</th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">Available</th>
 </tr>
 </thead>

 <tbody class="divide-y divide-gray-100 bg-white dark:divide-white/[0.055] dark:bg-[#111214]">
 <tr
 v-for="stock in stocks"
 :key="stock.id"
 class="transition hover:bg-gray-950/[0.018] dark:hover:bg-white/[0.025]"
 >
 <td class="min-w-0 px-4 py-3">
 <div class="flex items-center gap-3">
 <div class="h-14 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-white/[0.055]">
 <img
 v-if="productImage(stock)"
 :src="productImage(stock)"
 :alt="productName(stock)"
 class="h-full w-full object-cover"
 >
 <span
 v-else
 class="flex h-full w-full items-center justify-center text-[11px] font-semibold text-gray-400"
 >
 No image
 </span>
 </div>

 <div class="min-w-0">
 <p class="max-w-full truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ productName(stock) }}
 </p>
 <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
 {{ variantName(stock.variant) }} · {{ variantSku(stock.variant) }}
 </p>
 <p class="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">
 {{ productBrand(stock) }}
 </p>
 </div>
 </div>
 </td>

 <td class="px-4 py-3">
 <p class="text-sm font-semibold text-gray-900 dark:text-white">
 {{ stock.location?.name || 'Unknown' }}
 </p>
 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ stock.location?.code }} · {{ locationTypeLabel(stock.location?.type || '') }}
 </p>
 </td>

 <td class="px-4 py-3">
 <div class="flex flex-wrap gap-2">
 <AppBadge :variant="stockBadgeVariant(stock)">
 {{ stockLabel(stock) }}
 </AppBadge>
 <AppBadge
 v-if="stock.variant?.allow_backorder"
 variant="blue"
 >
 Backorder
 </AppBadge>
 </div>
 <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
 Min {{ stock.variant?.min_stock_level ?? 0 }}
 </p>
 </td>

 <td class="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
 {{ stock.on_hand_quantity }}
 </td>

 <td class="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
 {{ stock.reserved_quantity }}
 </td>

 <td class="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
 {{ stock.available_quantity }}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </AppCard>

 <div class="grid gap-3 xl:hidden">
 <AppCard
 v-for="stock in stocks"
 :key="stock.id"
 class="p-4"
 >
 <div class="flex gap-3">
 <div class="h-20 w-16 shrink-0 overflow-hidden rounded-[14px] bg-gray-950/[0.04] dark:bg-white/[0.055]">
 <img
 v-if="productImage(stock)"
 :src="productImage(stock)"
 :alt="productName(stock)"
 class="h-full w-full object-cover"
 >
 <span
 v-else
 class="flex h-full w-full items-center justify-center text-[11px] font-semibold text-gray-400"
 >
 No image
 </span>
 </div>

 <div class="min-w-0 flex-1">
 <p class="truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ productName(stock) }}
 </p>
 <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
 {{ variantName(stock.variant) }}
 </p>
 <div class="mt-3 flex flex-wrap gap-2">
 <AppBadge :variant="stockBadgeVariant(stock)">
 {{ stockLabel(stock) }}
 </AppBadge>
 <AppBadge variant="neutral">
 {{ stock.location?.code }}
 </AppBadge>
 </div>
 <div class="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400">
 <p><span class="block font-semibold text-gray-900 dark:text-white">{{ stock.on_hand_quantity }}</span>On hand</p>
 <p><span class="block font-semibold text-gray-900 dark:text-white">{{ stock.reserved_quantity }}</span>Reserved</p>
 <p><span class="block font-semibold text-gray-900 dark:text-white">{{ stock.available_quantity }}</span>Available</p>
 </div>
 </div>
 </div>
 </AppCard>
 </div>

 <AppCard class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
 <p class="text-[12px] text-gray-500 dark:text-gray-500">
 Showing
 <span class="font-medium text-gray-900 dark:text-white">{{ stockMeta?.from ?? 0 }}</span>
 to
 <span class="font-medium text-gray-900 dark:text-white">{{ stockMeta?.to ?? 0 }}</span>
 of
 <span class="font-medium text-gray-900 dark:text-white">{{ stockMeta?.total ?? 0 }}</span>
 stock rows
 </p>

 <div class="flex flex-wrap items-center gap-2">
 <AppButton
 variant="secondary"
 size="sm"
 :disabled="!canGoPreviousStock"
 @click="previousStockPage"
 >
 Previous
 </AppButton>

 <span class="rounded-[9px] bg-gray-950/[0.04] px-3 py-2 text-[12px] font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
 Page {{ stockMeta?.current_page ?? stockPage }} / {{ stockMeta?.last_page ?? 1 }}
 </span>

 <AppButton
 variant="secondary"
 size="sm"
 :disabled="!canGoNextStock"
 @click="nextStockPage"
 >
 Next
 </AppButton>
 </div>
 </AppCard>
 </template>
 </template>

 <template v-if="activeTab === 'movements'">
 <AppEmptyState
 v-if="movements.length === 0"
 title="No inventory movements found"
 message="Movements will appear after opening stock, adjustments, purchases, sales or returns."
 />

 <template v-else>
 <AppCard class="hidden overflow-hidden xl:block">
 <div class="overflow-hidden">
 <table class="w-full table-fixed divide-y divide-gray-100 dark:divide-white/[0.055]">
 <thead class="bg-gray-950/[0.018] dark:bg-white/[0.025]">
 <tr>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">Movement</th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">Product</th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">Location</th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">Change</th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">Before</th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">After</th>
 </tr>
 </thead>

 <tbody class="divide-y divide-gray-100 bg-white dark:divide-white/[0.055] dark:bg-[#111214]">
 <tr
 v-for="movement in movements"
 :key="movement.id"
 class="transition hover:bg-gray-950/[0.018] dark:hover:bg-white/[0.025]"
 >
 <td class="min-w-0 px-4 py-3">
 <AppBadge :variant="movementBadgeVariant(movement)">
 {{ movementTypeLabel(movement.type) }}
 </AppBadge>
 <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
 {{ dateLabel(movement.created_at) }}
 </p>
 <p
 v-if="movement.user?.name"
 class="mt-1 text-xs text-gray-400 dark:text-gray-500"
 >
 By {{ movement.user.name }}
 </p>
 </td>

 <td class="min-w-0 px-4 py-3">
 <p class="max-w-full truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ productName(movement) }}
 </p>
 <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
 {{ variantName(movement.variant) }} · {{ variantSku(movement.variant) }}
 </p>
 <p
 v-if="movement.note"
 class="mt-1 max-w-[420px] truncate text-xs text-gray-400 dark:text-gray-500"
 >
 {{ movement.note }}
 </p>
 </td>

 <td class="px-4 py-3">
 <p class="text-sm font-semibold text-gray-900 dark:text-white">
 {{ movement.location?.name || 'Unknown' }}
 </p>
 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ movement.location?.code }}
 </p>
 </td>

 <td
 class="px-4 py-3 text-right text-sm font-semibold"
 :class="movement.quantity_change >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'"
 >
 {{ movement.quantity_change > 0 ? `+${movement.quantity_change}` : movement.quantity_change }}
 </td>

 <td class="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
 {{ movement.quantity_before }}
 </td>

 <td class="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
 {{ movement.quantity_after }}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </AppCard>

 <div class="grid gap-3 xl:hidden">
 <AppCard
 v-for="movement in movements"
 :key="movement.id"
 class="p-4"
 >
 <div class="flex items-start justify-between gap-3">
 <div class="min-w-0">
 <AppBadge :variant="movementBadgeVariant(movement)">
 {{ movementTypeLabel(movement.type) }}
 </AppBadge>
 <p class="mt-3 truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ productName(movement) }}
 </p>
 <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
 {{ variantName(movement.variant) }} · {{ movement.location?.code }}
 </p>
 </div>

 <p
 class="shrink-0 text-lg font-semibold"
 :class="movement.quantity_change >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'"
 >
 {{ movement.quantity_change > 0 ? `+${movement.quantity_change}` : movement.quantity_change }}
 </p>
 </div>

 <p
 v-if="movement.note"
 class="mt-3 text-sm text-gray-500 dark:text-gray-400"
 >
 {{ movement.note }}
 </p>

 <div class="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
 <span>{{ dateLabel(movement.created_at) }}</span>
 <span>Before {{ movement.quantity_before }}</span>
 <span>After {{ movement.quantity_after }}</span>
 </div>
 </AppCard>
 </div>

 <AppCard class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
 <p class="text-[12px] text-gray-500 dark:text-gray-500">
 Showing
 <span class="font-medium text-gray-900 dark:text-white">{{ movementMeta?.from ?? 0 }}</span>
 to
 <span class="font-medium text-gray-900 dark:text-white">{{ movementMeta?.to ?? 0 }}</span>
 of
 <span class="font-medium text-gray-900 dark:text-white">{{ movementMeta?.total ?? 0 }}</span>
 movements
 </p>

 <div class="flex flex-wrap items-center gap-2">
 <AppButton
 variant="secondary"
 size="sm"
 :disabled="!canGoPreviousMovement"
 @click="previousMovementPage"
 >
 Previous
 </AppButton>

 <span class="rounded-[9px] bg-gray-950/[0.04] px-3 py-2 text-[12px] font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
 Page {{ movementMeta?.current_page ?? movementPage }} / {{ movementMeta?.last_page ?? 1 }}
 </span>

 <AppButton
 variant="secondary"
 size="sm"
 :disabled="!canGoNextMovement"
 @click="nextMovementPage"
 >
 Next
 </AppButton>
 </div>
 </AppCard>
 </template>
 </template>

 <template v-if="activeTab === 'locations'">
 <AppEmptyState
 v-if="filteredLocations.length === 0"
 title="No locations found"
 message="Create your first stock location or clear filters."
 >
 <template #actions>
 <AppButton @click="openCreateLocation">
 Add location
 </AppButton>
 </template>
 </AppEmptyState>

 <div
 v-else
 class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
 >
 <AppCard
 v-for="location in filteredLocations"
 :key="location.id"
 class="p-5"
 >
 <div class="flex items-start justify-between gap-4">
 <div class="min-w-0">
 <div class="flex flex-wrap gap-2">
 <AppBadge :variant="location.is_active ? 'green' : 'red'">
 {{ location.is_active ? 'Active' : 'Inactive' }}
 </AppBadge>

 <AppBadge
 v-if="location.is_default"
 variant="blue"
 >
 Default
 </AppBadge>

 <AppBadge variant="neutral">
 {{ locationTypeLabel(location.type) }}
 </AppBadge>
 </div>

 <h3 class="mt-4 truncate text-base font-semibold text-gray-950 dark:text-white">
 {{ location.name }}
 </h3>

 <p class="mt-1 text-[12px] font-medium text-gray-500 dark:text-gray-500">
 {{ location.code }}
 </p>
 </div>

 <AppActionMenu>
 <template #default="{ close }">
 <AppActionMenuItem
 @click="openEditLocation(location); close()"
 >
 Edit location
 </AppActionMenuItem>

 <AppActionMenuItem
 danger
 @click="askDeleteLocation(location); close()"
 >
 Delete location
 </AppActionMenuItem>
 </template>
 </AppActionMenu>
 </div>

 <div class="mt-5 space-y-2 text-sm text-gray-500 dark:text-gray-400">
 <p v-if="location.phone">
 {{ location.phone }}
 </p>

 <p v-if="location.address">
 {{ location.address }}
 </p>

 <p>
 Sort order: {{ location.sort_order }}
 </p>
 </div>

 <div class="mt-5 flex gap-2">
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 @click="openEditLocation(location)"
 >
 Edit
 </AppButton>
 </div>
 </AppCard>
 </div>
 </template>
 </template>
 </div>

 <InventoryAdjustmentModal
 :open="adjustmentOpen"
 :products="products"
 :locations="locations"
 @close="adjustmentOpen = false"
 @saved="afterAdjustmentSaved"
 />

 <InventoryLocationModal
 :open="locationFormOpen"
 :mode="locationFormMode"
 :location="selectedLocation"
 @close="locationFormOpen = false"
 @saved="afterLocationSaved"
 />

 <AppConfirmModal
 :open="deleteOpen"
 title="Delete location?"
 :message="`This will delete “${locationToDelete?.name || 'this location'}”. Locations with stock or movement history cannot be deleted.`"
 confirm-label="Delete location"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="confirmDeleteLocation"
 />
 </section>
</template>