<script setup lang="ts">
definePageMeta({
 middleware: 'auth',
 layout: 'admin',
})

type Customer = {
 id: number
 code: string
 name: string
 phone: string | null
 email: string | null
 current_balance?: string | number
 is_active?: boolean
}

type InventoryLocation = {
 id: number
 name: string
 code: string
 is_active?: boolean
}

type SaleInvoice = {
 id: number
 customer_id: number | null
 customer?: Customer | null
 inventory_location_id: number
 location?: InventoryLocation | null
 invoice_number: string
 channel: string
 sale_date: string
 status: string
 payment_status: string
 customer_name: string | null
 customer_phone: string | null
 grand_total: string | number
 paid_amount: string | number
 balance_amount: string | number
}

type SaleReturn = {
 id: number
 sale_invoice_id: number
 sale_invoice?: SaleInvoice | null
 customer_id: number | null
 customer?: Customer | null
 inventory_location_id: number
 location?: InventoryLocation | null
 return_number: string
 return_date: string
 status: string
 refund_status: string
 subtotal: string | number
 deduction_total: string | number
 refund_total: string | number
 refunded_amount: string | number
 balance_amount: string | number
 approved_at: string | null
 reason: string | null
 notes: string | null
 items_count?: number
 items_sum_quantity?: string | number | null
}

type PaginationMeta = {
 current_page: number
 from: number | null
 last_page: number
 per_page: number
 to: number | null
 total: number
}

type SaleReturnIndexResponse = {
 data: SaleReturn[]
 meta: PaginationMeta
}

type SaleReturnResponse = {
 data: SaleReturn
 message?: string
}

type CustomerIndexResponse = {
 data: Customer[]
}

type SaleInvoiceIndexResponse = {
 data: SaleInvoice[]
}

type InventoryLocationResponse = {
 data: InventoryLocation[]
}

const { $api } = useNuxtApp()

const search = ref('')
const debouncedSearch = ref('')

const selectedCustomerIds = ref<string[]>([])
const selectedLocationIds = ref<string[]>([])
const selectedStatuses = ref<string[]>([])
const selectedRefundStatuses = ref<string[]>([])

const dateFrom = ref('')
const dateTo = ref('')
const sortBy = ref('latest')
const perPage = ref(20)
const page = ref(1)
const filtersOpen = ref(false)

const formOpen = ref(false)

const approveOpen = ref(false)
const approving = ref(false)
const approveError = ref('')
const returnToApprove = ref<SaleReturn | null>(null)
const approvedAtInput = ref('')
const { formatDate: formatAppDate, formatDateTime: formatAppDateTime, toDateTimeInput, dateTimeInputToIso, timezoneLabel } = useAppDateTime()

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const returnToDelete = ref<SaleReturn | null>(null)

const printingDocument = ref(false)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const statusOptions = [
 { label: 'Draft', value: 'draft' },
 { label: 'Approved', value: 'approved' },
 { label: 'Cancelled', value: 'cancelled' },
]

const refundStatusOptions = [
 { label: 'No refund', value: 'none' },
 { label: 'Partial refund', value: 'partial' },
 { label: 'Refunded', value: 'refunded' },
]

const sortOptions = [
 { label: 'Latest return date', value: 'latest' },
 { label: 'Oldest return date', value: 'oldest' },
 { label: 'Amount high first', value: 'amount_high' },
 { label: 'Amount low first', value: 'amount_low' },
 { label: 'Balance high first', value: 'balance_high' },
 { label: 'Balance low first', value: 'balance_low' },
 { label: 'Return number', value: 'return_number' },
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
 selectedCustomerIds,
 selectedLocationIds,
 selectedStatuses,
 selectedRefundStatuses,
 dateFrom,
 dateTo,
 sortBy,
 perPage,
], () => {
 page.value = 1
}, { deep: true })

function buildQuery() {
 const query: Record<string, string | number> = {
 page: page.value,
 per_page: perPage.value,
 sort_by: sortBy.value,
 }

 if (debouncedSearch.value) query.search = debouncedSearch.value
 if (selectedCustomerIds.value.length) query.customer_ids = selectedCustomerIds.value.join(',')
 if (selectedLocationIds.value.length) query.inventory_location_ids = selectedLocationIds.value.join(',')
 if (selectedStatuses.value.length) query.statuses = selectedStatuses.value.join(',')
 if (selectedRefundStatuses.value.length) query.refund_statuses = selectedRefundStatuses.value.join(',')
 if (dateFrom.value) query.date_from = dateFrom.value
 if (dateTo.value) query.date_to = dateTo.value

 return query
}

const {
 data: bootstrap,
 pending: bootstrapPending,
 error: bootstrapError,
 refresh: refreshBootstrap,
} = useAsyncData(
 'sale-returns-bootstrap',
 async () => {
 const [customersResponse, locationsResponse, invoicesResponse] = await Promise.all([
 $api<CustomerIndexResponse>('/admin/customers', {
 query: {
 is_active: 1,
 per_page: 100,
 sort_by: 'name',
 },
 }),
 $api<InventoryLocationResponse>('/admin/inventory-locations'),
 $api<SaleInvoiceIndexResponse>('/admin/sale-invoices', {
 query: {
 status: 'completed',
 per_page: 100,
 sort_by: 'latest',
 },
 }),
 ])

 return {
 customers: customersResponse.data ?? [],
 locations: locationsResponse.data ?? [],
 saleInvoices: invoicesResponse.data ?? [],
 }
 },
 { immediate: true },
)

const {
 data,
 pending,
 error,
 refresh,
} = useAsyncData(
 'admin-sale-returns',
 () => $api<SaleReturnIndexResponse>('/admin/sale-returns', {
 query: buildQuery(),
 }),
 {
 watch: [
 debouncedSearch,
 selectedCustomerIds,
 selectedLocationIds,
 selectedStatuses,
 selectedRefundStatuses,
 dateFrom,
 dateTo,
 sortBy,
 perPage,
 page,
 ],
 immediate: true,
 },
)

const customers = computed(() => bootstrap.value?.customers ?? [])
const locations = computed(() => bootstrap.value?.locations ?? [])
const saleInvoices = computed(() => bootstrap.value?.saleInvoices ?? [])
const returns = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)

const customerOptions = computed(() => {
 return customers.value.map((customer) => ({
 label: `${customer.name} (${customer.code})`,
 value: String(customer.id),
 }))
})

const locationOptions = computed(() => {
 return locations.value.map((location) => ({
 label: `${location.name} (${location.code})`,
 value: String(location.id),
 }))
})

const isInitialLoading = computed(() => {
 return (pending.value || bootstrapPending.value) && (!data.value || !bootstrap.value)
})

const isRefreshing = computed(() => {
 return (pending.value || bootstrapPending.value) && Boolean(data.value && bootstrap.value)
})

const hasError = computed(() => error.value || bootstrapError.value)

const hasActiveFilters = computed(() => {
 return Boolean(
 search.value
 || selectedCustomerIds.value.length
 || selectedLocationIds.value.length
 || selectedStatuses.value.length
 || selectedRefundStatuses.value.length
 || dateFrom.value
 || dateTo.value
 || sortBy.value !== 'latest'
 || perPage.value !== 20,
 )
})

const visibleFilterCount = computed(() => {
 let count = 0

 if (search.value) count++
 if (selectedCustomerIds.value.length) count++
 if (selectedLocationIds.value.length) count++
 if (selectedStatuses.value.length) count++
 if (selectedRefundStatuses.value.length) count++
 if (dateFrom.value) count++
 if (dateTo.value) count++
 if (sortBy.value !== 'latest') count++
 if (perPage.value !== 20) count++

 return count
})

const draftCount = computed(() => returns.value.filter((item) => item.status === 'draft').length)
const approvedCount = computed(() => returns.value.filter((item) => item.status === 'approved').length)
const totalRefundOnPage = computed(() => returns.value.reduce((sum, item) => sum + Number(item.refund_total || 0), 0))
const totalBalanceOnPage = computed(() => returns.value.reduce((sum, item) => sum + Number(item.balance_amount || 0), 0))

const canGoPrevious = computed(() => page.value > 1)
const canGoNext = computed(() => meta.value ? page.value < meta.value.last_page : false)

function money(value: string | number | null | undefined) {
 return Number(value || 0).toLocaleString('en', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })
}

function dateLabel(value: string | null | undefined) {
 return formatAppDate(value)
}

function dateTimeLabel(value: string | null | undefined) {
 return formatAppDateTime(value)
}

function statusVariant(status: string): 'neutral' | 'green' | 'red' | 'amber' | 'blue' {
 if (status === 'approved') return 'green'
 if (status === 'draft') return 'amber'
 if (status === 'cancelled') return 'red'

 return 'neutral'
}

function refundVariant(status: string): 'neutral' | 'green' | 'red' | 'amber' | 'blue' {
 if (status === 'refunded') return 'green'
 if (status === 'partial') return 'amber'
 if (status === 'none') return 'neutral'

 return 'neutral'
}

function label(value: string) {
 return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function customerDisplay(saleReturn: SaleReturn) {
 return saleReturn.customer?.name
 || saleReturn.sale_invoice?.customer?.name
 || saleReturn.sale_invoice?.customer_name
 || 'Walk-in customer'
}

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) clearTimeout(noticeTimer.value)

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

function setQuickView(view: 'all' | 'draft' | 'approved' | 'none' | 'partial' | 'refunded') {
 selectedStatuses.value = []
 selectedRefundStatuses.value = []

 if (view === 'all') return
 if (view === 'draft') selectedStatuses.value = ['draft']
 if (view === 'approved') selectedStatuses.value = ['approved']
 if (view === 'none') selectedRefundStatuses.value = ['none']
 if (view === 'partial') selectedRefundStatuses.value = ['partial']
 if (view === 'refunded') selectedRefundStatuses.value = ['refunded']
}

function quickViewIsActive(view: 'all' | 'draft' | 'approved' | 'none' | 'partial' | 'refunded') {
 if (view === 'all') {
 return selectedStatuses.value.length === 0 && selectedRefundStatuses.value.length === 0
 }

 if (view === 'draft') return selectedStatuses.value.length === 1 && selectedStatuses.value.includes('draft')
 if (view === 'approved') return selectedStatuses.value.length === 1 && selectedStatuses.value.includes('approved')
 if (view === 'none') return selectedRefundStatuses.value.length === 1 && selectedRefundStatuses.value.includes('none')
 if (view === 'partial') return selectedRefundStatuses.value.length === 1 && selectedRefundStatuses.value.includes('partial')
 if (view === 'refunded') return selectedRefundStatuses.value.length === 1 && selectedRefundStatuses.value.includes('refunded')

 return false
}

function openCreate() {
 formOpen.value = true
}

async function afterSaved(saleReturn: SaleReturn, message?: string) {
 formOpen.value = false
 showNotice(message || 'Sale return saved successfully.')
 await refresh()
}

function askApprove(saleReturn: SaleReturn) {
 returnToApprove.value = saleReturn
 approvedAtInput.value = toDateTimeInput()
 approveError.value = ''
 approveOpen.value = true
}

async function confirmApprove() {
 if (!returnToApprove.value) return

 approving.value = true
 approveError.value = ''

 const approvedAt = dateTimeInputToIso(approvedAtInput.value)
 if (!approvedAt) {
 approveError.value = 'Choose a valid approval date and time.'
 approving.value = false
 return
 }

 try {
 const response = await $api<SaleReturnResponse>(`/admin/sale-returns/${returnToApprove.value.id}/approve`, {
 method: 'POST',
 body: {
 approved_at: approvedAt,
 refunded_amount: Number(returnToApprove.value.refunded_amount || 0),
 note: `Sale return approved: ${returnToApprove.value.return_number}`,
 },
 })

 approveOpen.value = false
 showNotice(response.message || 'Sale return approved successfully.')

 await Promise.all([
 refresh(),
 refreshBootstrap(),
 ])
 } catch (error: any) {
 approveError.value = extractApiErrorMessage(error, 'Could not approve sale return.')
 } finally {
 approving.value = false
 }
}

function askDelete(saleReturn: SaleReturn) {
 returnToDelete.value = saleReturn
 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDelete() {
 if (!returnToDelete.value) return

 deleting.value = true
 deleteError.value = ''

 try {
 await $api(`/admin/sale-returns/${returnToDelete.value.id}`, {
 method: 'DELETE',
 })

 deleteOpen.value = false
 showNotice('Sale return deleted successfully.')
 await refresh()
 } catch (error: any) {
 deleteError.value = extractApiErrorMessage(error, 'Could not delete sale return.')
 } finally {
 deleting.value = false
 }
}

async function openProtectedPdf(path: string, fileName: string) {
 if (!import.meta.client) return

 printingDocument.value = true

 try {
 const blob = await $api<Blob>(path, {
 responseType: 'blob',
 })

 const pdfBlob = blob instanceof Blob
 ? blob
 : new Blob([blob], { type: 'application/pdf' })

 const url = URL.createObjectURL(pdfBlob)
 const popup = window.open(url, '_blank', 'noopener,noreferrer')

 if (!popup) {
 showNotice('Popup blocked. Please allow popups for this site and try again.')
 URL.revokeObjectURL(url)
 return
 }

 setTimeout(() => {
 URL.revokeObjectURL(url)
 }, 60_000)
 } catch (error: any) {
 showNotice(extractApiErrorMessage(error, `Could not open ${fileName}. Approve the return first, then try again.`))
 } finally {
 printingDocument.value = false
 }
}

function printReturnPdf(saleReturn: SaleReturn) {
 if (saleReturn.status !== 'approved') {
 showNotice('Approve this sale return before printing PDF.')
 return
 }

 return openProtectedPdf(
 `/admin/sale-returns/${saleReturn.id}/pdf`,
 `sale-return-${saleReturn.return_number}.pdf`,
 )
}

function clearFilters() {
 search.value = ''
 debouncedSearch.value = ''
 selectedCustomerIds.value = []
 selectedLocationIds.value = []
 selectedStatuses.value = []
 selectedRefundStatuses.value = []
 dateFrom.value = ''
 dateTo.value = ''
 sortBy.value = 'latest'
 perPage.value = 20
 page.value = 1
}

async function refreshAll() {
 await Promise.all([
 refreshBootstrap(),
 refresh(),
 ])
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
 <SaleReturnsSkeleton v-if="isInitialLoading" />

 <div
 v-else
 class="relative space-y-4 sm:space-y-5"
 >
 <div
 v-if="isRefreshing"
 class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-[#f4f5f7]/40 backdrop-blur-[1px] dark:bg-[#09090b]/30"
 />

 <AppPageHeader
 eyebrow="Transactions"
 title="Sale returns"
 description="Return customer items, increase stock, reduce receivable balance and print sale return documents."
 >
 <template #actions>
 <AppButton
 variant="secondary"
 :loading="pending || bootstrapPending"
 @click="refreshAll"
 >
 {{ pending || bootstrapPending ? 'Refreshing...' : 'Refresh' }}
 </AppButton>

 <AppButton @click="openCreate">
 New return
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
 Returns
 </p>

 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ meta?.total ?? returns.length }}
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Total matching records
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Refund total on page
 </p>

 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ money(totalRefundOnPage) }}
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Customer receivable reduction
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Refund balance
 </p>

 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ money(totalBalanceOnPage) }}
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Remaining customer refund balance
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Workflow
 </p>

 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ draftCount }}
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Drafts · {{ approvedCount }} approved
 </p>
 </AppCard>
 </div>

 <AppCard class="overflow-visible">
 <div class="shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 ">
 <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
 <AppInput
 v-model="search"
 placeholder="Search return number, customer, invoice, product, reason or notes..."
 />

 <AppButton
 type="button"
 variant="secondary"
 @click="filtersOpen = !filtersOpen"
 >
 {{ filtersOpen ? 'Hide filters' : 'Filters' }}
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
 Clear
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
 :class="quickViewIsActive('draft') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('draft')"
 >
 Draft
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('approved') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('approved')"
 >
 Approved
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('none') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('none')"
 >
 No refund
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('partial') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('partial')"
 >
 Partial
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('refunded') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('refunded')"
 >
 Refunded
 </button>
 </div>
 </div>

 <div
 v-if="filtersOpen"
 class="grid gap-3 shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 sm:grid-cols-2 xl:grid-cols-5"
 >
 <AppMultiSelect
 v-model="selectedCustomerIds"
 label="Customers"
 placeholder="All customers"
 :options="customerOptions"
 />

 <AppMultiSelect
 v-model="selectedLocationIds"
 label="Locations"
 placeholder="All locations"
 :options="locationOptions"
 />

 <AppMultiSelect
 v-model="selectedStatuses"
 label="Status"
 placeholder="All statuses"
 :options="statusOptions"
 :searchable="false"
 />

 <AppMultiSelect
 v-model="selectedRefundStatuses"
 label="Refund"
 placeholder="All refund states"
 :options="refundStatusOptions"
 :searchable="false"
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

 <div class="grid grid-cols-2 gap-3 xl:col-span-2">
 <AppInput
 v-model="dateFrom"
 label="Date from"
 type="date"
 />

 <AppInput
 v-model="dateTo"
 label="Date to"
 type="date"
 />
 </div>
 </div>

 <div class="flex flex-wrap items-center gap-2 p-4">
 <AppBadge variant="neutral">
 {{ returns.length }} shown
 </AppBadge>

 <AppBadge variant="neutral">
 {{ meta?.total ?? 0 }} total
 </AppBadge>

 <AppBadge
 v-if="draftCount"
 variant="amber"
 >
 {{ draftCount }} draft
 </AppBadge>

 <AppBadge
 v-if="approvedCount"
 variant="green"
 >
 {{ approvedCount }} approved
 </AppBadge>
 </div>
 </AppCard>

 <AppErrorState
 v-if="hasError"
 title="Sale returns could not be loaded"
 message="Please check backend API, authentication token, or route permissions."
 @retry="refreshAll"
 />

 <AppEmptyState
 v-else-if="returns.length === 0"
 title="No sale returns found"
 message="Create your first sale return or clear filters."
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
 New return
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
 Return
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Customer / invoice
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Status
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Refund
 </th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Amount
 </th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Actions
 </th>
 </tr>
 </thead>

 <tbody class="divide-y divide-gray-100 bg-white dark:divide-white/[0.055] dark:bg-[#111214]">
 <tr
 v-for="saleReturn in returns"
 :key="saleReturn.id"
 class="transition hover:bg-gray-950/[0.018] dark:hover:bg-white/[0.025]"
 >
 <td class="min-w-0 px-4 py-3">
 <p class="max-w-full truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ saleReturn.return_number }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ dateLabel(saleReturn.return_date) }}
 </p>

 <p class="mt-1 max-w-full truncate text-xs text-gray-400 dark:text-gray-500">
 {{ saleReturn.reason || 'No reason' }}
 </p>
 </td>

 <td class="min-w-0 px-4 py-3">
 <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
 {{ customerDisplay(saleReturn) }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ saleReturn.sale_invoice?.invoice_number || 'No invoice' }}
 <span v-if="saleReturn.location?.code">
 · {{ saleReturn.location.code }}
 </span>
 </p>
 </td>

 <td class="px-4 py-3">
 <AppBadge :variant="statusVariant(saleReturn.status)">
 {{ label(saleReturn.status) }}
 </AppBadge>

 <p
 v-if="saleReturn.approved_at"
 class="mt-2 text-xs text-gray-500 dark:text-gray-400"
 >
 Approved {{ dateTimeLabel(saleReturn.approved_at) }}
 </p>
 </td>

 <td class="px-4 py-3">
 <AppBadge :variant="refundVariant(saleReturn.refund_status)">
 {{ label(saleReturn.refund_status) }}
 </AppBadge>

 <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
 {{ saleReturn.items_count ?? 0 }} lines · {{ saleReturn.items_sum_quantity ?? 0 }} units
 </p>
 </td>

 <td class="px-4 py-3 text-right">
 <p class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 {{ money(saleReturn.refund_total) }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 Balance {{ money(saleReturn.balance_amount) }}
 </p>
 </td>

 <td class="px-4 py-3 text-right">
 <div
 v-if="saleReturn.status === 'draft'"
 class="flex items-center justify-end gap-2"
 >
 <AppButton
 type="button"
 size="sm"
 @click="askApprove(saleReturn)"
 >
 Approve
 </AppButton>

 <AppButton
 type="button"
 variant="danger"
 size="sm"
 @click="askDelete(saleReturn)"
 >
 Delete
 </AppButton>
 </div>

 <div
 v-else-if="saleReturn.status === 'approved'"
 class="flex items-center justify-end gap-2"
 >
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="printingDocument"
 @click="printReturnPdf(saleReturn)"
 >
 PDF
 </AppButton>
 </div>

 <span
 v-else
 class="text-xs font-medium text-gray-400 dark:text-gray-500"
 >
 Locked
 </span>
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </AppCard>

 <div class="grid gap-3 xl:hidden">
 <AppCard
 v-for="saleReturn in returns"
 :key="saleReturn.id"
 class="overflow-hidden p-4"
 >
 <div class="flex items-start justify-between gap-3">
 <div class="min-w-0">
 <h2 class="truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ saleReturn.return_number }}
 </h2>

 <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
 {{ customerDisplay(saleReturn) }} · {{ saleReturn.sale_invoice?.invoice_number || 'No invoice' }}
 </p>
 </div>

 <p class="shrink-0 text-sm font-semibold text-gray-950 dark:text-white">
 {{ money(saleReturn.refund_total) }}
 </p>
 </div>

 <div class="mt-3 flex flex-wrap gap-2">
 <AppBadge :variant="statusVariant(saleReturn.status)">
 {{ label(saleReturn.status) }}
 </AppBadge>

 <AppBadge :variant="refundVariant(saleReturn.refund_status)">
 {{ label(saleReturn.refund_status) }}
 </AppBadge>

 <AppBadge variant="neutral">
 {{ saleReturn.items_sum_quantity ?? 0 }} units
 </AppBadge>
 </div>

 <div
 v-if="saleReturn.status === 'draft'"
 class="mt-4 grid grid-cols-2 gap-2"
 >
 <AppButton
 type="button"
 size="sm"
 @click="askApprove(saleReturn)"
 >
 Approve
 </AppButton>

 <AppButton
 type="button"
 variant="danger"
 size="sm"
 @click="askDelete(saleReturn)"
 >
 Delete
 </AppButton>
 </div>

 <div
 v-else-if="saleReturn.status === 'approved'"
 class="mt-4"
 >
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="printingDocument"
 @click="printReturnPdf(saleReturn)"
 >
 PDF
 </AppButton>
 </div>
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
 returns
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

 <SaleReturnFormModal
 :open="formOpen"
 :sale-invoices="saleInvoices"
 @close="formOpen = false"
 @saved="afterSaved"
 />

 <AppConfirmModal
 :open="approveOpen"
 title="Approve sale return?"
 :message="`This will approve “${returnToApprove?.return_number || 'this return'}”, increase inventory stock, create movement logs, and reduce customer receivable balance.`"
 confirm-label="Approve return"
 :loading="approving"
 :error="approveError"
 @close="approveOpen = false"
 @confirm="confirmApprove"
 >
  <div class="rounded-[12px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
   <AppInput v-model="approvedAtInput" type="datetime-local" label="Return approval date & time" />
   <p class="mt-2 text-[11px] leading-5 text-gray-400 dark:text-gray-500">Shown in {{ timezoneLabel }}. Adjust it for a return processed earlier.</p>
  </div>
 </AppConfirmModal>

 <AppConfirmModal
 :open="deleteOpen"
 title="Delete draft sale return?"
 :message="`This will delete “${returnToDelete?.return_number || 'this draft return'}”. Only draft returns can be deleted.`"
 confirm-label="Delete draft"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="confirmDelete"
 />
 </section>
</template>
