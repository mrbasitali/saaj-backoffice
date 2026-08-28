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
 is_active: boolean
}

type InventoryLocation = {
 id: number
 name: string
 code: string
 type: string
 is_default: boolean
 is_active: boolean
}

type ProductVariant = {
 id: number
 product_id: number
 sku: string | null
 barcode: string | null
 name: string | null
 option_summary: string | null
 cost_price?: string | number | null
 price?: string | number | null
 track_inventory: boolean
 min_stock_level: number
 is_default: boolean
 is_active: boolean
 product?: { id: number, name: string, slug: string } | null
}

type Product = {
 id: number
 name: string
 slug: string
 is_active: boolean
 variants?: ProductVariant[]
}

type PurchaseItem = {
 id?: number
 product_variant_id: number | null
 variant?: ProductVariant | null
 quantity: number
 unit_cost: string | number
 discount_amount: string | number
 tax_amount: string | number
 line_total?: string | number
 notes: string | null
}

type PurchaseInvoice = {
 id: number
 vendor_id: number
 vendor?: Vendor | null
 inventory_location_id: number
 location?: InventoryLocation | null
 invoice_number: string
 vendor_invoice_number: string | null
 purchase_date: string
 due_date: string | null
 status: string
 payment_status: string
 subtotal: string | number
 discount_total: string | number
 invoice_discount_amount: string | number
 tax_total: string | number
 shipping_cost: string | number
 grand_total: string | number
 paid_amount: string | number
 balance_amount: string | number
 received_at: string | null
 notes: string | null
 items_count?: number
 items_sum_quantity?: string | number | null
 items?: PurchaseItem[]
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

type PurchaseInvoiceIndexResponse = {
 data: PurchaseInvoice[]
 meta: PaginationMeta
}

type PurchaseInvoiceResponse = {
 data: PurchaseInvoice
 message?: string
}

type VendorIndexResponse = {
 data: Vendor[]
}

type InventoryLocationResponse = {
 data: InventoryLocation[]
}

type ProductIndexResponse = {
 data: Product[]
}

const { $api } = useNuxtApp()

const search = ref('')
const debouncedSearch = ref('')

const selectedVendorIds = ref<string[]>([])
const selectedLocationIds = ref<string[]>([])
const selectedStatuses = ref<string[]>([])
const selectedPaymentStatuses = ref<string[]>([])
const selectedBalanceStatuses = ref<string[]>([])

const dateFrom = ref('')
const dateTo = ref('')
const sortBy = ref('latest')
const perPage = ref(20)
const page = ref(1)
const filtersOpen = ref(false)
const editingInvoiceId = ref<number | null>(null)

const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const selectedInvoice = ref<PurchaseInvoice | null>(null)

const viewOpen = ref(false)
const viewingInvoiceId = ref<number | null>(null)
const viewedInvoice = ref<PurchaseInvoice | null>(null)
const printingDocument = ref(false)

const receiveOpen = ref(false)
const receiving = ref(false)
const receiveError = ref('')
const invoiceToReceive = ref<PurchaseInvoice | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const invoiceToDelete = ref<PurchaseInvoice | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const statusOptions = [
 { label: 'Draft', value: 'draft' },
 { label: 'Received', value: 'received' },
 { label: 'Cancelled', value: 'cancelled' },
]

const paymentStatusOptions = [
 { label: 'Unpaid', value: 'unpaid' },
 { label: 'Partial', value: 'partial' },
 { label: 'Paid', value: 'paid' },
]

const balanceStatusOptions = [
 { label: 'With balance', value: 'with_balance' },
 { label: 'Paid in full', value: 'paid_full' },
]

const sortOptions = [
 { label: 'Latest purchase date', value: 'latest' },
 { label: 'Oldest purchase date', value: 'oldest' },
 { label: 'Amount high first', value: 'amount_high' },
 { label: 'Amount low first', value: 'amount_low' },
 { label: 'Balance high first', value: 'balance_high' },
 { label: 'Balance low first', value: 'balance_low' },
 { label: 'Due date', value: 'due_date' },
 { label: 'Invoice number', value: 'invoice_number' },
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
 selectedVendorIds,
 selectedLocationIds,
 selectedStatuses,
 selectedPaymentStatuses,
 selectedBalanceStatuses,
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

 if (selectedVendorIds.value.length) {
 query.vendor_ids = selectedVendorIds.value.join(',')
 }

 if (selectedLocationIds.value.length) {
 query.inventory_location_ids = selectedLocationIds.value.join(',')
 }

 if (selectedStatuses.value.length) {
 query.statuses = selectedStatuses.value.join(',')
 }

 if (selectedPaymentStatuses.value.length) {
 query.payment_statuses = selectedPaymentStatuses.value.join(',')
 }

 if (selectedBalanceStatuses.value.length) {
 query.balance_statuses = selectedBalanceStatuses.value.join(',')
 }

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
 'purchase-invoices-bootstrap',
 async () => {
 const [vendorsResponse, locationsResponse, productsResponse] = await Promise.all([
 $api<VendorIndexResponse>('/admin/vendors', {
 query: {
 is_active: 1,
 per_page: 100,
 sort_by: 'name',
 },
 }),
 $api<InventoryLocationResponse>('/admin/inventory-locations'),
 $api<ProductIndexResponse>('/admin/products', {
 query: {
 include_variants: 1,
 ensure_default_variants: 1,
 is_active: 1,
 per_page: 100,
 sort_by: 'name',
 },
 }),
 ])

 return {
 vendors: vendorsResponse.data ?? [],
 locations: locationsResponse.data ?? [],
 products: productsResponse.data ?? [],
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
 'admin-purchase-invoices',
 () => $api<PurchaseInvoiceIndexResponse>('/admin/purchase-invoices', {
 query: buildQuery(),
 }),
 {
 watch: [
 debouncedSearch,
 selectedVendorIds,
 selectedLocationIds,
 selectedStatuses,
 selectedPaymentStatuses,
 selectedBalanceStatuses,
 dateFrom,
 dateTo,
 sortBy,
 perPage,
 page,
 ],
 immediate: true,
 },
)

const vendors = computed(() => bootstrap.value?.vendors ?? [])
const locations = computed(() => bootstrap.value?.locations ?? [])
const products = computed(() => bootstrap.value?.products ?? [])
const invoices = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)

const vendorOptions = computed(() => {
 return vendors.value.map((vendor) => ({
 label: `${vendor.name} (${vendor.code})`,
 value: String(vendor.id),
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
 || selectedVendorIds.value.length
 || selectedLocationIds.value.length
 || selectedStatuses.value.length
 || selectedPaymentStatuses.value.length
 || selectedBalanceStatuses.value.length
 || dateFrom.value
 || dateTo.value
 || sortBy.value !== 'latest'
 || perPage.value !== 20,
 )
})

const visibleFilterCount = computed(() => {
 let count = 0

 if (search.value) count++
 if (selectedVendorIds.value.length) count++
 if (selectedLocationIds.value.length) count++
 if (selectedStatuses.value.length) count++
 if (selectedPaymentStatuses.value.length) count++
 if (selectedBalanceStatuses.value.length) count++
 if (dateFrom.value) count++
 if (dateTo.value) count++
 if (sortBy.value !== 'latest') count++
 if (perPage.value !== 20) count++

 return count
})

const selectedFilterSummary = computed(() => {
 const parts = []

 if (selectedVendorIds.value.length) parts.push(`${selectedVendorIds.value.length} vendors`)
 if (selectedLocationIds.value.length) parts.push(`${selectedLocationIds.value.length} locations`)
 if (selectedStatuses.value.length) parts.push(`${selectedStatuses.value.length} statuses`)
 if (selectedPaymentStatuses.value.length) parts.push(`${selectedPaymentStatuses.value.length} payments`)
 if (selectedBalanceStatuses.value.length) parts.push(`${selectedBalanceStatuses.value.length} balances`)
 if (dateFrom.value || dateTo.value) parts.push('date range')

 return parts.join(' · ')
})

const draftCount = computed(() => invoices.value.filter((invoice) => invoice.status === 'draft').length)
const receivedCount = computed(() => invoices.value.filter((invoice) => invoice.status === 'received').length)
const totalPurchasesOnPage = computed(() => invoices.value.reduce((sum, invoice) => sum + Number(invoice.grand_total || 0), 0))
const totalBalanceOnPage = computed(() => invoices.value.reduce((sum, invoice) => sum + Number(invoice.balance_amount || 0), 0))

const canGoPrevious = computed(() => page.value > 1)
const canGoNext = computed(() => meta.value ? page.value < meta.value.last_page : false)

function money(value: string | number | null | undefined) {
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

function statusVariant(status: string): 'neutral' | 'green' | 'red' | 'amber' | 'blue' {
 if (status === 'received') return 'green'
 if (status === 'draft') return 'amber'
 if (status === 'cancelled') return 'red'

 return 'neutral'
}

function paymentVariant(status: string): 'neutral' | 'green' | 'red' | 'amber' | 'blue' {
 if (status === 'paid') return 'green'
 if (status === 'partial') return 'amber'
 if (status === 'unpaid') return 'red'

 return 'neutral'
}

function label(value: string) {
 return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function canEditInvoice(invoice: PurchaseInvoice) {
 return invoice.status === 'draft' || invoice.status === 'received'
}

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) clearTimeout(noticeTimer.value)

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

function setQuickView(view: 'all' | 'draft' | 'received' | 'unpaid' | 'partial' | 'paid' | 'balance') {
 selectedStatuses.value = []
 selectedPaymentStatuses.value = []
 selectedBalanceStatuses.value = []

 if (view === 'all') return
 if (view === 'draft') selectedStatuses.value = ['draft']
 if (view === 'received') selectedStatuses.value = ['received']
 if (view === 'unpaid') selectedPaymentStatuses.value = ['unpaid']
 if (view === 'partial') selectedPaymentStatuses.value = ['partial']
 if (view === 'paid') selectedPaymentStatuses.value = ['paid']
 if (view === 'balance') selectedBalanceStatuses.value = ['with_balance']
}

function quickViewIsActive(view: 'all' | 'draft' | 'received' | 'unpaid' | 'partial' | 'paid' | 'balance') {
 if (view === 'all') {
 return selectedStatuses.value.length === 0
 && selectedPaymentStatuses.value.length === 0
 && selectedBalanceStatuses.value.length === 0
 }

 if (view === 'draft') return selectedStatuses.value.length === 1 && selectedStatuses.value.includes('draft')
 if (view === 'received') return selectedStatuses.value.length === 1 && selectedStatuses.value.includes('received')
 if (view === 'unpaid') return selectedPaymentStatuses.value.length === 1 && selectedPaymentStatuses.value.includes('unpaid')
 if (view === 'partial') return selectedPaymentStatuses.value.length === 1 && selectedPaymentStatuses.value.includes('partial')
 if (view === 'paid') return selectedPaymentStatuses.value.length === 1 && selectedPaymentStatuses.value.includes('paid')
 if (view === 'balance') return selectedBalanceStatuses.value.length === 1 && selectedBalanceStatuses.value.includes('with_balance')

 return false
}

async function fetchInvoice(invoiceId: number) {
 const response = await $api<PurchaseInvoiceResponse>(`/admin/purchase-invoices/${invoiceId}`)

 return response.data
}

function openCreate() {
 selectedInvoice.value = null
 formMode.value = 'create'
 formOpen.value = true
}

async function openEdit(invoice: PurchaseInvoice) {
 if (!canEditInvoice(invoice)) return

 editingInvoiceId.value = invoice.id
 selectedInvoice.value = invoice
 formMode.value = 'edit'

 try {
 selectedInvoice.value = await fetchInvoice(invoice.id)
 formOpen.value = true
 } catch (error: any) {
 showNotice(extractApiErrorMessage(error, 'Could not load purchase invoice.'))
 } finally {
 editingInvoiceId.value = null
 }
}

async function openView(invoice: PurchaseInvoice) {
 viewingInvoiceId.value = invoice.id
 viewedInvoice.value = invoice

 try {
 viewedInvoice.value = await fetchInvoice(invoice.id)
 viewOpen.value = true
 } catch (error: any) {
 showNotice(extractApiErrorMessage(error, 'Could not load purchase invoice.'))
 } finally {
 viewingInvoiceId.value = null
 }
}

async function printPurchasePdf(invoice: PurchaseInvoice) {
 if (invoice.status !== 'received') {
 showNotice('Receive this invoice before printing.')
 return
 }

 if (!import.meta.client) return

 printingDocument.value = true

 try {
 const blob = await $api<Blob>(`/admin/purchase-invoices/${invoice.id}/pdf`, {
 responseType: 'blob',
 })

 const pdfBlob = blob instanceof Blob ? blob : new Blob([blob], { type: 'application/pdf' })
 const url = URL.createObjectURL(pdfBlob)
 const popup = window.open(url, '_blank', 'noopener,noreferrer')

 if (!popup) {
 showNotice('Popup blocked. Please allow popups for this site and try again.')
 URL.revokeObjectURL(url)
 return
 }

 setTimeout(() => URL.revokeObjectURL(url), 60_000)
 } catch (error: any) {
 showNotice(extractApiErrorMessage(error, 'Could not generate the purchase invoice PDF.'))
 } finally {
 printingDocument.value = false
 }
}

async function afterSaved(invoice: PurchaseInvoice, message?: string) {
 formOpen.value = false
 selectedInvoice.value = invoice
 showNotice(message || 'Purchase invoice saved successfully.')
 await refresh()
}

function askReceive(invoice: PurchaseInvoice) {
 invoiceToReceive.value = invoice
 receiveError.value = ''
 receiveOpen.value = true
}

async function confirmReceive() {
 if (!invoiceToReceive.value) return

 receiving.value = true
 receiveError.value = ''

 try {
 const response = await $api<PurchaseInvoiceResponse>(`/admin/purchase-invoices/${invoiceToReceive.value.id}/receive`, {
 method: 'POST',
 body: {
 received_at: new Date().toISOString(),
 note: `Stock received from ${invoiceToReceive.value.invoice_number}`,
 },
 })

 receiveOpen.value = false
 showNotice(response.message || 'Purchase invoice received successfully.')

 await Promise.all([
 refresh(),
 refreshBootstrap(),
 ])
 } catch (error: any) {
 receiveError.value = extractApiErrorMessage(error, 'Could not receive purchase invoice.')
 } finally {
 receiving.value = false
 }
}

function askDelete(invoice: PurchaseInvoice) {
 invoiceToDelete.value = invoice
 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDelete() {
 if (!invoiceToDelete.value) return

 deleting.value = true
 deleteError.value = ''

 try {
 const response = await $api<{ message?: string }>(`/admin/purchase-invoices/${invoiceToDelete.value.id}`, {
 method: 'DELETE',
 })

 deleteOpen.value = false
 showNotice(response.message || 'Purchase invoice deleted successfully.')
 await Promise.all([
 refresh(),
 refreshBootstrap(),
 ])
 } catch (error: any) {
 deleteError.value = extractApiErrorMessage(error, 'Could not delete purchase invoice.')
 } finally {
 deleting.value = false
 }
}

function clearFilters() {
 search.value = ''
 debouncedSearch.value = ''
 selectedVendorIds.value = []
 selectedLocationIds.value = []
 selectedStatuses.value = []
 selectedPaymentStatuses.value = []
 selectedBalanceStatuses.value = []
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
 <PurchaseInvoicesSkeleton v-if="isInitialLoading" />

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
 title="Purchase invoices"
 description="Create supplier purchase invoices, receive stock into inventory, update item costs and track vendor payable balance."
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
 New purchase
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
 Purchase invoices
 </p>

 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ meta?.total ?? invoices.length }}
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Total matching records
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Purchases on page
 </p>

 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ money(totalPurchasesOnPage) }}
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Grand total shown
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Payable on page
 </p>

 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ money(totalBalanceOnPage) }}
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Supplier balance from shown invoices
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
 Drafts · {{ receivedCount }} received
 </p>
 </AppCard>
 </div>

 <AppCard class="overflow-visible">
 <div class="shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 ">
 <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
 <AppInput
 v-model="search"
 placeholder="Search invoice number, vendor, SKU, barcode, product or notes..."
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
 :class="quickViewIsActive('received') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('received')"
 >
 Received
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('unpaid') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('unpaid')"
 >
 Unpaid
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
 :class="quickViewIsActive('paid') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('paid')"
 >
 Paid
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('balance') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('balance')"
 >
 With balance
 </button>
 </div>

 <p
 v-if="selectedFilterSummary && !filtersOpen"
 class="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400"
 >
 Active filters: {{ selectedFilterSummary }}
 </p>
 </div>

 <div
 v-if="filtersOpen"
 class="grid gap-3 shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 sm:grid-cols-2 xl:grid-cols-4"
 >
 <AppMultiSelect
 v-model="selectedVendorIds"
 label="Vendors"
 placeholder="All vendors"
 :options="vendorOptions"
 />

 <AppMultiSelect
 v-model="selectedLocationIds"
 label="Locations"
 placeholder="All locations"
 :options="locationOptions"
 />

 <AppMultiSelect
 v-model="selectedStatuses"
 label="Invoice status"
 placeholder="All statuses"
 :options="statusOptions"
 />

 <AppMultiSelect
 v-model="selectedPaymentStatuses"
 label="Payment status"
 placeholder="All payment states"
 :options="paymentStatusOptions"
 />

 <AppMultiSelect
 v-model="selectedBalanceStatuses"
 label="Balance"
 placeholder="All balances"
 :options="balanceStatusOptions"
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

 <div class="grid grid-cols-2 gap-3">
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
 {{ invoices.length }} shown
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
 v-if="receivedCount"
 variant="green"
 >
 {{ receivedCount }} received
 </AppBadge>
 </div>
 </AppCard>

 <AppErrorState
 v-if="hasError"
 title="Purchase invoices could not be loaded"
 message="Please check backend API, authentication token, or route permissions."
 @retry="refreshAll"
 />

 <AppEmptyState
 v-else-if="invoices.length === 0"
 title="No purchase invoices found"
 message="Create your first purchase invoice or clear filters."
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
 New purchase
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
 Invoice
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Vendor / location
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Status
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Payment
 </th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Total / balance
 </th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Actions
 </th>
 </tr>
 </thead>

 <tbody class="divide-y divide-gray-100 bg-white dark:divide-white/[0.055] dark:bg-[#111214]">
 <tr
 v-for="invoice in invoices"
 :key="invoice.id"
 class="transition hover:bg-gray-950/[0.018] dark:hover:bg-white/[0.025]"
 >
 <td class="min-w-0 px-4 py-3">
 <button
 v-if="canEditInvoice(invoice)"
 type="button"
 class="block max-w-full truncate text-left text-sm font-semibold text-gray-950 transition hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
 @click="openEdit(invoice)"
 >
 {{ invoice.invoice_number }}
 </button>

 <button
 v-else
 type="button"
 class="block max-w-full truncate text-left text-sm font-semibold text-gray-950 transition hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
 @click="openView(invoice)"
 >
 {{ invoice.invoice_number }}
 </button>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 Vendor ref: {{ invoice.vendor_invoice_number || 'Not set' }}
 </p>

 <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
 {{ dateLabel(invoice.purchase_date) }} · Due {{ dateLabel(invoice.due_date) }}
 </p>
 </td>

 <td class="min-w-0 px-4 py-3">
 <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
 {{ invoice.vendor?.name || 'Unknown vendor' }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ invoice.location?.name || 'Unknown location' }}
 <span v-if="invoice.location?.code">
 · {{ invoice.location.code }}
 </span>
 </p>
 </td>

 <td class="px-4 py-3">
 <AppBadge :variant="statusVariant(invoice.status)">
 {{ label(invoice.status) }}
 </AppBadge>

 <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
 {{ invoice.items_count ?? 0 }} lines · {{ invoice.items_sum_quantity ?? 0 }} units
 </p>
 </td>

 <td class="px-4 py-3">
 <AppBadge :variant="paymentVariant(invoice.payment_status)">
 {{ label(invoice.payment_status) }}
 </AppBadge>

 <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
 Paid {{ money(invoice.paid_amount) }}
 </p>
 </td>

 <td class="px-4 py-3 text-right">
 <p class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 {{ money(invoice.grand_total) }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 Balance {{ money(invoice.balance_amount) }}
 </p>
 </td>

 <td class="px-4 py-3 text-right">
 <div
 v-if="invoice.status === 'draft'"
 class="flex items-center justify-end gap-2"
 >
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="editingInvoiceId === invoice.id"
 @click="openEdit(invoice)"
 >
 Edit
 </AppButton>

 <AppButton
 type="button"
 size="sm"
 @click="askReceive(invoice)"
 >
 Receive
 </AppButton>

 <AppButton
 type="button"
 variant="danger"
 size="sm"
 @click="askDelete(invoice)"
 >
 Delete
 </AppButton>
 </div>

 <div
 v-else-if="invoice.status === 'received'"
 class="flex items-center justify-end gap-2"
 >
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="editingInvoiceId === invoice.id"
 @click="openEdit(invoice)"
 >
 Edit
 </AppButton>

 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="viewingInvoiceId === invoice.id"
 @click="openView(invoice)"
 >
 View
 </AppButton>

 <AppButton
 type="button"
 size="sm"
 :loading="printingDocument"
 @click="printPurchasePdf(invoice)"
 >
 Print
 </AppButton>

 <AppButton
 type="button"
 variant="danger"
 size="sm"
 @click="askDelete(invoice)"
 >
 Delete
 </AppButton>
 </div>

 <div v-else class="flex items-center justify-end gap-2">
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="viewingInvoiceId === invoice.id"
 @click="openView(invoice)"
 >
 View
 </AppButton>
 </div>
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </AppCard>

 <div class="grid gap-3 xl:hidden">
 <AppCard
 v-for="invoice in invoices"
 :key="invoice.id"
 class="overflow-hidden p-4"
 >
 <div class="flex items-start justify-between gap-3">
 <button
 v-if="canEditInvoice(invoice)"
 type="button"
 class="min-w-0 text-left"
 @click="openEdit(invoice)"
 >
 <h2 class="truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ invoice.invoice_number }}
 </h2>

 <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
 {{ invoice.vendor?.name || 'Unknown vendor' }} · {{ invoice.location?.code || 'No location' }}
 </p>
 </button>

 <div
 v-else
 class="min-w-0"
 >
 <button
 type="button"
 class="min-w-0 text-left"
 @click="openView(invoice)"
 >
 <h2 class="truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ invoice.invoice_number }}
 </h2>

 <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
 {{ invoice.vendor?.name || 'Unknown vendor' }} · {{ invoice.location?.code || 'No location' }}
 </p>
 </button>
 </div>
 </div>

 <div class="mt-3 flex flex-wrap gap-2">
 <AppBadge :variant="statusVariant(invoice.status)">
 {{ label(invoice.status) }}
 </AppBadge>

 <AppBadge :variant="paymentVariant(invoice.payment_status)">
 {{ label(invoice.payment_status) }}
 </AppBadge>

 <AppBadge variant="neutral">
 {{ invoice.items_sum_quantity ?? 0 }} units
 </AppBadge>
 </div>

 <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
 <p>
 <span class="block font-semibold text-gray-950 dark:text-white">{{ money(invoice.grand_total) }}</span>
 Total
 </p>

 <p>
 <span class="block font-semibold text-gray-950 dark:text-white">{{ money(invoice.balance_amount) }}</span>
 Balance
 </p>
 </div>

 <div
 v-if="invoice.status === 'draft'"
 class="mt-4 grid grid-cols-3 gap-2"
 >
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="editingInvoiceId === invoice.id"
 @click="openEdit(invoice)"
 >
 Edit
 </AppButton>

 <AppButton
 type="button"
 size="sm"
 @click="askReceive(invoice)"
 >
 Receive
 </AppButton>

 <AppButton
 type="button"
 variant="danger"
 size="sm"
 @click="askDelete(invoice)"
 >
 Delete
 </AppButton>
 </div>

 <div
 v-else-if="invoice.status === 'received'"
 class="mt-4 grid grid-cols-2 gap-2"
 >
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="editingInvoiceId === invoice.id"
 @click="openEdit(invoice)"
 >
 Edit
 </AppButton>

 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="viewingInvoiceId === invoice.id"
 @click="openView(invoice)"
 >
 View
 </AppButton>

 <AppButton
 type="button"
 size="sm"
 :loading="printingDocument"
 @click="printPurchasePdf(invoice)"
 >
 Print
 </AppButton>

 <AppButton
 type="button"
 variant="danger"
 size="sm"
 @click="askDelete(invoice)"
 >
 Delete
 </AppButton>
 </div>

 <div v-else class="mt-4 grid grid-cols-1 gap-2">
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="viewingInvoiceId === invoice.id"
 @click="openView(invoice)"
 >
 View
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
 purchase invoices
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

 <PurchaseInvoiceFormModal
 :open="formOpen"
 :mode="formMode"
 :invoice="selectedInvoice"
 :vendors="vendors"
 :locations="locations"
 :products="products"
 @close="formOpen = false"
 @saved="afterSaved"
 />

 <PurchaseInvoiceDetailsModal
 :open="viewOpen"
 :invoice="viewedInvoice"
 :printing="printingDocument"
 @close="viewOpen = false"
 @print-pdf="printPurchasePdf"
 />

 <AppConfirmModal
 :open="receiveOpen"
 title="Receive stock?"
 :message="`This will receive “${invoiceToReceive?.invoice_number || 'this invoice'}”, add item quantities into inventory, update variant costs, create inventory movement logs, and update vendor payable balance.`"
 confirm-label="Receive stock"
 :loading="receiving"
 :error="receiveError"
 @close="receiveOpen = false"
 @confirm="confirmReceive"
 />

 <AppConfirmModal
 :open="deleteOpen"
 :title="invoiceToDelete?.status === 'received' ? 'Delete received purchase?' : 'Delete purchase invoice?'"
 :message="invoiceToDelete?.status === 'received'
 ? `This permanently deletes “${invoiceToDelete?.invoice_number || 'this purchase'}”, its purchase returns, linked vendor payments and inventory movements. Received stock is reversed first. If any quantity has already been sold, reserved, or otherwise cannot be safely reversed, deletion will be blocked.`
 : `This permanently deletes “${invoiceToDelete?.invoice_number || 'this purchase'}” and its related draft records.`"
 :confirm-label="invoiceToDelete?.status === 'received' ? 'Delete & reverse stock' : 'Delete purchase'"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="confirmDelete"
 />
 </section>
</template>