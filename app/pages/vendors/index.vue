<script setup lang="ts">
definePageMeta({
 middleware: 'auth',
 layout: 'admin',
})

type Vendor = {
 id: number
 name: string
 code: string
 company_name: string | null
 contact_person: string | null
 email: string | null
 phone: string | null
 secondary_phone: string | null
 tax_number: string | null
 address: string | null
 city: string | null
 country: string | null
 opening_balance: string | number
 current_balance: string | number
 notes: string | null
 is_active: boolean
 sort_order: number
 purchase_invoices_count?: number
 purchase_returns_count?: number
 payments_count?: number
 purchase_invoices_sum_grand_total?: string | number | null
 payments_sum_amount?: string | number | null
 last_purchase_date?: string | null
 created_at?: string | null
 updated_at?: string | null
}

type PaginationMeta = {
 current_page: number
 from: number | null
 last_page: number
 per_page: number
 to: number | null
 total: number
}

type VendorIndexResponse = {
 data: Vendor[]
 meta: PaginationMeta
}

type VendorResponse = {
 data: Vendor
 message?: string
}

const { $api } = useNuxtApp()

const search = ref('')
const debouncedSearch = ref('')
const activeFilter = ref('all')
const balanceStatusFilter = ref('all')
const activityStatusFilter = ref('all')
const sortBy = ref('updated')
const perPage = ref(20)
const page = ref(1)
const filtersOpen = ref(true)
const editingVendorId = ref<number | null>(null)

const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const selectedVendor = ref<Vendor | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const vendorToDelete = ref<Vendor | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const activeOptions = [
 { label: 'All statuses', value: 'all' },
 { label: 'Active', value: 'active' },
 { label: 'Inactive', value: 'inactive' },
]

const balanceStatusOptions = [
 { label: 'All balances', value: 'all' },
 { label: 'Payable balance', value: 'payable' },
 { label: 'Vendor credit', value: 'credit' },
 { label: 'Settled', value: 'settled' },
]

const activityStatusOptions = [
 { label: 'All activity', value: 'all' },
 { label: 'Has purchases', value: 'has_purchases' },
 { label: 'No purchases', value: 'no_purchases' },
 { label: 'Has payments', value: 'has_payments' },
]

const sortOptions = [
 { label: 'Recently updated', value: 'updated' },
 { label: 'Sort order', value: 'sort_order' },
 { label: 'Name A-Z', value: 'name' },
 { label: 'Latest created', value: 'latest' },
 { label: 'Balance high first', value: 'balance_high' },
 { label: 'Balance low first', value: 'balance_low' },
 { label: 'Purchases high first', value: 'purchases_high' },
 { label: 'Last purchase', value: 'last_purchase' },
]

const perPageOptions = [
 { label: '20 / page', value: 20 },
 { label: '50 / page', value: 50 },
 { label: '100 / page', value: 100 },
]

watch(search, (value) => {
 if (searchTimer) clearTimeout(searchTimer)

 searchTimer = setTimeout(() => {
 page.value = 1
 debouncedSearch.value = value.trim()
 }, 300)
})

watch([
 activeFilter,
 balanceStatusFilter,
 activityStatusFilter,
 sortBy,
 perPage,
], () => {
 page.value = 1
})

function buildQuery() {
 const query: Record<string, string | number> = {
 page: page.value,
 per_page: perPage.value,
 sort_by: sortBy.value,
 }

 if (debouncedSearch.value) {
 query.search = debouncedSearch.value
 }

 if (activeFilter.value !== 'all') {
 query.is_active = activeFilter.value === 'active' ? 1 : 0
 }

 if (balanceStatusFilter.value !== 'all') {
 query.balance_status = balanceStatusFilter.value
 }

 if (activityStatusFilter.value !== 'all') {
 query.activity_status = activityStatusFilter.value
 }

 return query
}

const {
 data,
 pending,
 error,
 refresh,
} = useAsyncData(
 'admin-vendors',
 () => $api<VendorIndexResponse>('/admin/vendors', {
 query: buildQuery(),
 }),
 {
 watch: [
 debouncedSearch,
 activeFilter,
 balanceStatusFilter,
 activityStatusFilter,
 sortBy,
 perPage,
 page,
 ],
 immediate: true,
 },
)

const vendors = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)

const isInitialLoading = computed(() => pending.value && !data.value)
const isRefreshing = computed(() => pending.value && Boolean(data.value))

const hasActiveFilters = computed(() => {
 return Boolean(
 search.value
 || activeFilter.value !== 'all'
 || balanceStatusFilter.value !== 'all'
 || activityStatusFilter.value !== 'all'
 || sortBy.value !== 'updated'
 || perPage.value !== 20,
 )
})

const visibleFilterCount = computed(() => {
 return [
 search.value,
 activeFilter.value !== 'all',
 balanceStatusFilter.value !== 'all',
 activityStatusFilter.value !== 'all',
 sortBy.value !== 'updated',
 perPage.value !== 20,
 ].filter(Boolean).length
})

const activeVendors = computed(() => vendors.value.filter((vendor) => vendor.is_active).length)
const payableVendors = computed(() => vendors.value.filter((vendor) => Number(vendor.current_balance || 0) > 0).length)
const creditVendors = computed(() => vendors.value.filter((vendor) => Number(vendor.current_balance || 0) < 0).length)
const totalPayableOnPage = computed(() => vendors.value.reduce((sum, vendor) => {
 const balance = Number(vendor.current_balance || 0)
 return sum + (balance > 0 ? balance : 0)
}, 0))
const totalCreditOnPage = computed(() => vendors.value.reduce((sum, vendor) => {
 const balance = Number(vendor.current_balance || 0)
 return sum + (balance < 0 ? Math.abs(balance) : 0)
}, 0))

const canGoPrevious = computed(() => page.value > 1)
const canGoNext = computed(() => meta.value ? page.value < meta.value.last_page : false)

function formatAmount(value: string | number | null | undefined) {
 return Number(value || 0).toLocaleString('en', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })
}

function dateLabel(value: string | null | undefined) {
 if (!value) return 'Not set'

 return new Intl.DateTimeFormat('en', {
 year: 'numeric',
 month: 'short',
 day: '2-digit',
 }).format(new Date(value))
}

function balanceVariant(vendor: Vendor): 'green' | 'amber' | 'neutral' {
 const balance = Number(vendor.current_balance || 0)

 if (balance > 0) return 'amber'
 if (balance < 0) return 'green'

 return 'neutral'
}

function balanceLabel(vendor: Vendor) {
 const balance = Number(vendor.current_balance || 0)

 if (balance > 0) return `Payable ${formatAmount(balance)}`
 if (balance < 0) return `Credit ${formatAmount(Math.abs(balance))}`

 return 'Settled'
}

function contactLine(vendor: Vendor) {
 return [vendor.contact_person, vendor.phone, vendor.email]
 .filter(Boolean)
 .join(' · ') || 'No contact details'
}

function locationLine(vendor: Vendor) {
 return [vendor.city, vendor.country]
 .filter(Boolean)
 .join(', ') || 'No location'
}

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) clearTimeout(noticeTimer.value)

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

function setQuickView(view: 'all' | 'active' | 'inactive' | 'payable' | 'credit' | 'settled' | 'no_purchases') {
 if (view === 'all') {
 activeFilter.value = 'all'
 balanceStatusFilter.value = 'all'
 activityStatusFilter.value = 'all'
 return
 }

 activeFilter.value = 'all'
 balanceStatusFilter.value = 'all'
 activityStatusFilter.value = 'all'

 if (view === 'active') activeFilter.value = 'active'
 if (view === 'inactive') activeFilter.value = 'inactive'
 if (view === 'payable') balanceStatusFilter.value = 'payable'
 if (view === 'credit') balanceStatusFilter.value = 'credit'
 if (view === 'settled') balanceStatusFilter.value = 'settled'
 if (view === 'no_purchases') activityStatusFilter.value = 'no_purchases'
}

function quickViewIsActive(view: 'all' | 'active' | 'inactive' | 'payable' | 'credit' | 'settled' | 'no_purchases') {
 if (view === 'all') {
 return activeFilter.value === 'all' && balanceStatusFilter.value === 'all' && activityStatusFilter.value === 'all'
 }

 if (view === 'active') return activeFilter.value === 'active'
 if (view === 'inactive') return activeFilter.value === 'inactive'
 if (view === 'payable') return balanceStatusFilter.value === 'payable'
 if (view === 'credit') return balanceStatusFilter.value === 'credit'
 if (view === 'settled') return balanceStatusFilter.value === 'settled'
 if (view === 'no_purchases') return activityStatusFilter.value === 'no_purchases'

 return false
}

async function fetchVendor(vendorId: number) {
 const response = await $api<VendorResponse>(`/admin/vendors/${vendorId}`)

 return response.data
}

function openCreate() {
 selectedVendor.value = null
 formMode.value = 'create'
 formOpen.value = true
}

async function openEdit(vendor: Vendor) {
 editingVendorId.value = vendor.id
 selectedVendor.value = vendor
 formMode.value = 'edit'

 try {
 selectedVendor.value = await fetchVendor(vendor.id)
 formOpen.value = true
 } catch (error: any) {
 showNotice(extractApiErrorMessage(error, 'Could not load vendor details.'))
 } finally {
 editingVendorId.value = null
 }
}

async function afterSaved(vendor: Vendor, message?: string) {
 formOpen.value = false
 selectedVendor.value = vendor
 showNotice(message || 'Vendor saved successfully.')
 await refresh()
}

function askDelete(vendor: Vendor) {
 vendorToDelete.value = vendor
 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDelete() {
 if (!vendorToDelete.value) return

 deleting.value = true
 deleteError.value = ''

 try {
 await $api(`/admin/vendors/${vendorToDelete.value.id}`, {
 method: 'DELETE',
 })

 deleteOpen.value = false
 showNotice('Vendor deleted successfully.')
 await refresh()
 } catch (error: any) {
 deleteError.value = extractApiErrorMessage(error, 'Could not delete vendor.')
 } finally {
 deleting.value = false
 }
}

function clearFilters() {
 search.value = ''
 debouncedSearch.value = ''
 activeFilter.value = 'all'
 balanceStatusFilter.value = 'all'
 activityStatusFilter.value = 'all'
 sortBy.value = 'updated'
 perPage.value = 20
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
</script>

<template>
 <section class="mx-auto max-w-[1600px]">
 <VendorsSkeleton v-if="isInitialLoading" />

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
 title="Vendors"
 description="Manage supplier profiles, balances, purchase activity and contact details for buying and receiving stock."
 >
 <template #actions>
 <AppButton
 variant="secondary"
 :loading="pending"
 @click="refresh()"
 >
 {{ pending ? 'Refreshing...' : 'Refresh' }}
 </AppButton>

 <AppButton @click="openCreate">
 Add vendor
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
 Vendors
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ meta?.total ?? vendors.length }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Total matching records
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Active on page
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ activeVendors }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Available for purchasing
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Payable on page
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ formatAmount(totalPayableOnPage) }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ payableVendors }} vendors with balance
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Credit on page
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ formatAmount(totalCreditOnPage) }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ creditVendors }} vendors in credit
 </p>
 </AppCard>
 </div>

 <AppCard class="overflow-visible">
 <div class="shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 ">
 <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
 <AppInput
 v-model="search"
 placeholder="Search vendor, code, company, contact, phone, email, tax number..."
 />

 <AppButton
 type="button"
 variant="secondary"
 @click="filtersOpen = !filtersOpen"
 >
 {{ filtersOpen ? 'Hide filters' : 'Show filters' }}
 <span
 v-if="visibleFilterCount"
 class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-950 px-1.5 text-[11px] font-semibold text-white dark:bg-white dark:text-gray-950"
 >
 {{ visibleFilterCount }}
 </span>
 </AppButton>

 <AppButton
 v-if="hasActiveFilters"
 type="button"
 variant="ghost"
 @click="clearFilters"
 >
 Clear filters
 </AppButton>
 </div>

 <div class="mt-4 flex flex-wrap gap-2">
 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('all') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('all')"
 >
 All
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('active') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('active')"
 >
 Active
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('inactive') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('inactive')"
 >
 Inactive
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('payable') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('payable')"
 >
 Payable
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('credit') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('credit')"
 >
 Credit
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('settled') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('settled')"
 >
 Settled
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('no_purchases') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('no_purchases')"
 >
 No purchases
 </button>
 </div>
 </div>

 <div
 v-if="filtersOpen"
 class="grid gap-3 shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 sm:grid-cols-2 xl:grid-cols-5"
 >
 <AppSelect
 v-model="activeFilter"
 label="Status"
 :options="activeOptions"
 />

 <AppSelect
 v-model="balanceStatusFilter"
 label="Balance"
 :options="balanceStatusOptions"
 />

 <AppSelect
 v-model="activityStatusFilter"
 label="Activity"
 :options="activityStatusOptions"
 />

 <AppSelect
 v-model="sortBy"
 label="Sort"
 :options="sortOptions"
 />

 <AppSelect
 v-model="perPage"
 label="Rows"
 :options="perPageOptions"
 />
 </div>

 <div class="flex flex-wrap items-center gap-2 p-4">
 <AppBadge variant="neutral">
 {{ vendors.length }} shown
 </AppBadge>

 <AppBadge variant="neutral">
 {{ meta?.total ?? 0 }} total
 </AppBadge>

 <AppBadge variant="green">
 {{ activeVendors }} active on page
 </AppBadge>

 <AppBadge
 v-if="payableVendors"
 variant="amber"
 >
 {{ payableVendors }} payable
 </AppBadge>

 <AppBadge
 v-if="creditVendors"
 variant="green"
 >
 {{ creditVendors }} credit
 </AppBadge>
 </div>
 </AppCard>

 <AppErrorState
 v-if="error"
 title="Vendors could not be loaded"
 message="Please check backend API, authentication token, or route permissions."
 @retry="refresh"
 />

 <AppEmptyState
 v-else-if="vendors.length === 0"
 title="No vendors found"
 message="Create your first supplier or clear filters."
 >
 <template #actions>
 <div class="flex flex-col gap-2 sm:flex-row">
 <AppButton
 variant="secondary"
 @click="clearFilters"
 >
 Clear filters
 </AppButton>

 <AppButton @click="openCreate">
 Add vendor
 </AppButton>
 </div>
 </template>
 </AppEmptyState>

 <template v-else>
 <AppCard class="hidden overflow-visible xl:block">
 <div class="overflow-hidden">
 <table class="w-full table-fixed divide-y divide-gray-100 dark:divide-white/[0.055]">
 <thead class="bg-gray-950/[0.018] dark:bg-white/[0.025]">
 <tr>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Vendor
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Contact
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Status
 </th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Balance
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Activity
 </th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Actions
 </th>
 </tr>
 </thead>

 <tbody class="divide-y divide-gray-100 bg-white dark:divide-white/[0.055] dark:bg-[#111214]">
 <tr
 v-for="vendor in vendors"
 :key="vendor.id"
 class="transition hover:bg-gray-950/[0.018] dark:hover:bg-white/[0.025]"
 >
 <td class="min-w-0 px-4 py-3">
 <button
 type="button"
 class="block max-w-full truncate text-left text-sm font-semibold text-gray-950 transition hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
 @click="openEdit(vendor)"
 >
 {{ vendor.name }}
 </button>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ vendor.code }}
 <span v-if="vendor.company_name">
 · {{ vendor.company_name }}
 </span>
 </p>

 <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
 {{ locationLine(vendor) }}
 </p>
 </td>

 <td class="min-w-0 px-4 py-3">
 <p class="max-w-full truncate text-sm font-medium text-gray-800 dark:text-gray-200">
 {{ vendor.contact_person || 'No contact person' }}
 </p>

 <p class="mt-1 max-w-full truncate text-xs text-gray-500 dark:text-gray-400">
 {{ contactLine(vendor) }}
 </p>
 </td>

 <td class="px-4 py-3">
 <div class="flex flex-wrap gap-2">
 <AppBadge :variant="vendor.is_active ? 'green' : 'red'">
 {{ vendor.is_active ? 'Active' : 'Inactive' }}
 </AppBadge>

 <AppBadge
 v-if="vendor.tax_number"
 variant="blue"
 >
 Tax
 </AppBadge>
 </div>
 </td>

 <td class="px-4 py-3 text-right">
 <AppBadge :variant="balanceVariant(vendor)">
 {{ balanceLabel(vendor) }}
 </AppBadge>

 <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
 Opening {{ formatAmount(vendor.opening_balance) }}
 </p>
 </td>

 <td class="min-w-0 px-4 py-3">
 <p class="text-sm font-semibold text-gray-900 dark:text-white">
 {{ vendor.purchase_invoices_count ?? 0 }} purchases
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ vendor.payments_count ?? 0 }} payments · Last {{ dateLabel(vendor.last_purchase_date) }}
 </p>
 </td>

 <td class="px-4 py-3 text-right">
 <div class="flex items-center justify-end gap-2">
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="editingVendorId === vendor.id"
 @click="openEdit(vendor)"
 >
 Edit
 </AppButton>

 <AppActionMenu>
 <template #default="{ close }">
 <AppActionMenuItem
 @click="openEdit(vendor); close()"
 >
 Edit vendor
 </AppActionMenuItem>

 <AppActionMenuItem
 danger
 @click="askDelete(vendor); close()"
 >
 Delete vendor
 </AppActionMenuItem>
 </template>
 </AppActionMenu>
 </div>
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </AppCard>

 <div class="grid gap-3 xl:hidden">
 <AppCard
 v-for="vendor in vendors"
 :key="vendor.id"
 class="overflow-hidden p-4"
 >
 <div class="flex items-start justify-between gap-3">
 <button
 type="button"
 class="min-w-0 text-left"
 @click="openEdit(vendor)"
 >
 <h2 class="truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ vendor.name }}
 </h2>

 <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
 {{ vendor.code }} · {{ vendor.company_name || locationLine(vendor) }}
 </p>
 </button>

 <AppActionMenu>
 <template #default="{ close }">
 <AppActionMenuItem
 @click="openEdit(vendor); close()"
 >
 Edit vendor
 </AppActionMenuItem>

 <AppActionMenuItem
 danger
 @click="askDelete(vendor); close()"
 >
 Delete vendor
 </AppActionMenuItem>
 </template>
 </AppActionMenu>
 </div>

 <div class="mt-3 flex flex-wrap gap-2">
 <AppBadge :variant="vendor.is_active ? 'green' : 'red'">
 {{ vendor.is_active ? 'Active' : 'Inactive' }}
 </AppBadge>

 <AppBadge :variant="balanceVariant(vendor)">
 {{ balanceLabel(vendor) }}
 </AppBadge>

 <AppBadge variant="neutral">
 {{ vendor.purchase_invoices_count ?? 0 }} purchases
 </AppBadge>
 </div>

 <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
 {{ contactLine(vendor) }}
 </p>
 </AppCard>
 </div>

 <AppCard class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
 <p class="text-[12px] text-gray-500 dark:text-gray-500">
 Showing
 <span class="font-medium text-gray-900 dark:text-white">{{ meta?.from ?? 0 }}</span>
 to
 <span class="font-medium text-gray-900 dark:text-white">{{ meta?.to ?? 0 }}</span>
 of
 <span class="font-medium text-gray-900 dark:text-white">{{ meta?.total ?? 0 }}</span>
 vendors
 </p>

 <div class="flex flex-wrap items-center gap-2">
 <AppButton
 variant="secondary"
 size="sm"
 :disabled="!canGoPrevious"
 @click="previousPage"
 >
 Previous
 </AppButton>

 <span class="rounded-[9px] bg-gray-950/[0.04] px-3 py-2 text-[12px] font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
 Page {{ meta?.current_page ?? page }} / {{ meta?.last_page ?? 1 }}
 </span>

 <AppButton
 variant="secondary"
 size="sm"
 :disabled="!canGoNext"
 @click="nextPage"
 >
 Next
 </AppButton>
 </div>
 </AppCard>
 </template>
 </div>

 <VendorFormModal
 :open="formOpen"
 :mode="formMode"
 :vendor="selectedVendor"
 @close="formOpen = false"
 @saved="afterSaved"
 />

 <AppConfirmModal
 :open="deleteOpen"
 title="Delete vendor?"
 :message="`This will delete “${vendorToDelete?.name || 'this vendor'}”. Vendors with balance, purchases or payments cannot be deleted; set them inactive instead.`"
 confirm-label="Delete vendor"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="confirmDelete"
 />
 </section>
</template>