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
 current_balance: string | number
 is_active: boolean
}

type PurchaseInvoice = {
 id: number
 vendor_id: number
 vendor?: Vendor | null
 invoice_number: string
 vendor_invoice_number: string | null
 purchase_date: string
 status: string
 payment_status: string
 grand_total: string | number
 paid_amount: string | number
 balance_amount: string | number
}

type VendorPayment = {
 id: number
 vendor_id: number
 vendor?: Vendor | null
 purchase_invoice_id: number | null
 purchase_invoice?: PurchaseInvoice | null
 payment_number: string
 payment_date: string
 payment_method: string
 status: string
 amount: string | number
 reference_number: string | null
 paid_at: string | null
 notes: string | null
 creator?: {
 id: number | null
 name: string | null
 email: string | null
 } | null
}

type PaginationMeta = {
 current_page: number
 from: number | null
 last_page: number
 per_page: number
 to: number | null
 total: number
}

type VendorPaymentIndexResponse = {
 data: VendorPayment[]
 meta: PaginationMeta
}

type VendorPaymentResponse = {
 data: VendorPayment
 message?: string
}

type VendorIndexResponse = {
 data: Vendor[]
}

type PurchaseInvoiceIndexResponse = {
 data: PurchaseInvoice[]
}

const { $api } = useNuxtApp()

const search = ref('')
const debouncedSearch = ref('')

const selectedVendorIds = ref<string[]>([])
const selectedStatuses = ref<string[]>([])
const selectedPaymentMethods = ref<string[]>([])

const dateFrom = ref('')
const dateTo = ref('')
const sortBy = ref('latest')
const perPage = ref(20)
const page = ref(1)
const filtersOpen = ref(false)

const formOpen = ref(false)

const payOpen = ref(false)
const paying = ref(false)
const payError = ref('')
const paymentToPay = ref<VendorPayment | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const paymentToDelete = ref<VendorPayment | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const statusOptions = [
 { label: 'Draft', value: 'draft' },
 { label: 'Paid', value: 'paid' },
 { label: 'Cancelled', value: 'cancelled' },
]

const paymentMethodOptions = [
 { label: 'Cash', value: 'cash' },
 { label: 'Card', value: 'card' },
 { label: 'Bank transfer', value: 'bank_transfer' },
 { label: 'Cheque', value: 'cheque' },
 { label: 'Easypaisa', value: 'easypaisa' },
 { label: 'JazzCash', value: 'jazzcash' },
 { label: 'Other', value: 'other' },
]

const sortOptions = [
 { label: 'Latest payment date', value: 'latest' },
 { label: 'Oldest payment date', value: 'oldest' },
 { label: 'Amount high first', value: 'amount_high' },
 { label: 'Amount low first', value: 'amount_low' },
 { label: 'Payment number', value: 'payment_number' },
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
 selectedStatuses,
 selectedPaymentMethods,
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
 if (selectedVendorIds.value.length) query.vendor_ids = selectedVendorIds.value.join(',')
 if (selectedStatuses.value.length) query.statuses = selectedStatuses.value.join(',')
 if (selectedPaymentMethods.value.length) query.payment_methods = selectedPaymentMethods.value.join(',')
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
 'vendor-payments-bootstrap',
 async () => {
 const [vendorsResponse, invoicesResponse] = await Promise.all([
 $api<VendorIndexResponse>('/admin/vendors', {
 query: {
 is_active: 1,
 per_page: 100,
 sort_by: 'name',
 },
 }),
 $api<PurchaseInvoiceIndexResponse>('/admin/purchase-invoices', {
 query: {
 status: 'received',
 balance_status: 'with_balance',
 per_page: 100,
 sort_by: 'latest',
 },
 }),
 ])

 return {
 vendors: vendorsResponse.data ?? [],
 purchaseInvoices: invoicesResponse.data ?? [],
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
 'admin-vendor-payments',
 () => $api<VendorPaymentIndexResponse>('/admin/vendor-payments', {
 query: buildQuery(),
 }),
 {
 watch: [
 debouncedSearch,
 selectedVendorIds,
 selectedStatuses,
 selectedPaymentMethods,
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
const purchaseInvoices = computed(() => bootstrap.value?.purchaseInvoices ?? [])
const payments = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)

const vendorOptions = computed(() => {
 return vendors.value.map((vendor) => ({
 label: `${vendor.name} (${vendor.code})`,
 value: String(vendor.id),
 hint: `Balance ${money(vendor.current_balance)}`,
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
 || selectedStatuses.value.length
 || selectedPaymentMethods.value.length
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
 if (selectedStatuses.value.length) count++
 if (selectedPaymentMethods.value.length) count++
 if (dateFrom.value) count++
 if (dateTo.value) count++
 if (sortBy.value !== 'latest') count++
 if (perPage.value !== 20) count++

 return count
})

const draftCount = computed(() => payments.value.filter((payment) => payment.status === 'draft').length)
const paidCount = computed(() => payments.value.filter((payment) => payment.status === 'paid').length)
const totalPaidOnPage = computed(() => payments.value
 .filter((payment) => payment.status === 'paid')
 .reduce((sum, payment) => sum + Number(payment.amount || 0), 0))
const totalDraftOnPage = computed(() => payments.value
 .filter((payment) => payment.status === 'draft')
 .reduce((sum, payment) => sum + Number(payment.amount || 0), 0))

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
 if (status === 'paid') return 'green'
 if (status === 'draft') return 'amber'
 if (status === 'cancelled') return 'red'

 return 'neutral'
}

function label(value: string) {
 return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function isInvoiceOpeningPayment(payment: VendorPayment) {
 return payment.status === 'paid' && String(payment.notes || '').startsWith('Auto-recorded —')
}

function canDeletePayment(payment: VendorPayment) {
 return !isInvoiceOpeningPayment(payment)
}

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) clearTimeout(noticeTimer.value)

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

function setQuickView(view: 'all' | 'draft' | 'paid' | 'cash' | 'bank_transfer') {
 selectedStatuses.value = []
 selectedPaymentMethods.value = []

 if (view === 'all') return
 if (view === 'draft') selectedStatuses.value = ['draft']
 if (view === 'paid') selectedStatuses.value = ['paid']
 if (view === 'cash') selectedPaymentMethods.value = ['cash']
 if (view === 'bank_transfer') selectedPaymentMethods.value = ['bank_transfer']
}

function quickViewIsActive(view: 'all' | 'draft' | 'paid' | 'cash' | 'bank_transfer') {
 if (view === 'all') {
 return selectedStatuses.value.length === 0 && selectedPaymentMethods.value.length === 0
 }

 if (view === 'draft') return selectedStatuses.value.length === 1 && selectedStatuses.value.includes('draft')
 if (view === 'paid') return selectedStatuses.value.length === 1 && selectedStatuses.value.includes('paid')
 if (view === 'cash') return selectedPaymentMethods.value.length === 1 && selectedPaymentMethods.value.includes('cash')
 if (view === 'bank_transfer') return selectedPaymentMethods.value.length === 1 && selectedPaymentMethods.value.includes('bank_transfer')

 return false
}

function openCreate() {
 formOpen.value = true
}

async function afterSaved(payment: VendorPayment, message?: string) {
 formOpen.value = false
 showNotice(message || 'Vendor payment saved successfully.')

 await Promise.all([
 refresh(),
 refreshBootstrap(),
 ])
}

function askPay(payment: VendorPayment) {
 paymentToPay.value = payment
 payError.value = ''
 payOpen.value = true
}

async function confirmPay() {
 if (!paymentToPay.value) return

 paying.value = true
 payError.value = ''

 try {
 const response = await $api<VendorPaymentResponse>(`/admin/vendor-payments/${paymentToPay.value.id}/pay`, {
 method: 'POST',
 body: {
 paid_at: new Date().toISOString(),
 },
 })

 payOpen.value = false
 showNotice(response.message || 'Vendor payment marked as paid.')

 await Promise.all([
 refresh(),
 refreshBootstrap(),
 ])
 } catch (error: any) {
 payError.value = extractApiErrorMessage(error, 'Could not pay vendor payment.')
 } finally {
 paying.value = false
 }
}

function askDelete(payment: VendorPayment) {
 paymentToDelete.value = payment
 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDelete() {
 if (!paymentToDelete.value) return

 deleting.value = true
 deleteError.value = ''

 try {
 const response = await $api<{ message?: string }>(`/admin/vendor-payments/${paymentToDelete.value.id}`, {
 method: 'DELETE',
 })

 deleteOpen.value = false
 showNotice(response.message || 'Vendor payment deleted successfully.')
 await Promise.all([
 refresh(),
 refreshBootstrap(),
 ])
 } catch (error: any) {
 deleteError.value = extractApiErrorMessage(error, 'Could not delete vendor payment.')
 } finally {
 deleting.value = false
 }
}

function clearFilters() {
 search.value = ''
 debouncedSearch.value = ''
 selectedVendorIds.value = []
 selectedStatuses.value = []
 selectedPaymentMethods.value = []
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
 <VendorPaymentsSkeleton v-if="isInitialLoading" />

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
 title="Vendor payments"
 description="Pay supplier balances, link payments to received purchase invoices, and keep vendor payable balances accurate."
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
 New payment
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
 Payments
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ meta?.total ?? payments.length }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Total matching records
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Paid on page
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ money(totalPaidOnPage) }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ paidCount }} paid payments
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Draft on page
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ money(totalDraftOnPage) }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ draftCount }} waiting to pay
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Payable invoices
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ purchaseInvoices.length }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Received invoices with balance
 </p>
 </AppCard>
 </div>

 <AppCard class="overflow-visible">
 <div class="shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 ">
 <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
 <AppInput
 v-model="search"
 placeholder="Search payment number, vendor, invoice, reference or notes..."
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
 :class="quickViewIsActive('paid') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('paid')"
 >
 Paid
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('cash') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('cash')"
 >
 Cash
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('bank_transfer') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('bank_transfer')"
 >
 Bank transfer
 </button>
 </div>
 </div>

 <div
 v-if="filtersOpen"
 class="grid gap-3 shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 sm:grid-cols-2 xl:grid-cols-5"
 >
 <AppMultiSelect
 v-model="selectedVendorIds"
 label="Vendors"
 placeholder="All vendors"
 :options="vendorOptions"
 />

 <AppMultiSelect
 v-model="selectedStatuses"
 label="Status"
 placeholder="All statuses"
 :options="statusOptions"
 :searchable="false"
 />

 <AppMultiSelect
 v-model="selectedPaymentMethods"
 label="Method"
 placeholder="All methods"
 :options="paymentMethodOptions"
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
 {{ payments.length }} shown
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
 v-if="paidCount"
 variant="green"
 >
 {{ paidCount }} paid
 </AppBadge>
 </div>
 </AppCard>

 <AppErrorState
 v-if="hasError"
 title="Vendor payments could not be loaded"
 message="Please check backend API, authentication token, or route permissions."
 @retry="refreshAll"
 />

 <AppEmptyState
 v-else-if="payments.length === 0"
 title="No vendor payments found"
 message="Create your first vendor payment or clear filters."
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
 New payment
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
 Payment
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Vendor / invoice
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Status
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Method
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
 v-for="payment in payments"
 :key="payment.id"
 class="transition hover:bg-gray-950/[0.018] dark:hover:bg-white/[0.025]"
 >
 <td class="min-w-0 px-4 py-3">
 <p class="max-w-full truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ payment.payment_number }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ dateLabel(payment.payment_date) }}
 </p>

 <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
 Ref: {{ payment.reference_number || 'Not set' }}
 </p>
 </td>

 <td class="min-w-0 px-4 py-3">
 <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
 {{ payment.vendor?.name || 'Unknown vendor' }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ payment.purchase_invoice?.invoice_number || 'Vendor balance payment' }}
 </p>
 </td>

 <td class="px-4 py-3">
 <AppBadge :variant="statusVariant(payment.status)">
 {{ label(payment.status) }}
 </AppBadge>

 <p
 v-if="payment.paid_at"
 class="mt-2 text-xs text-gray-500 dark:text-gray-400"
 >
 Paid {{ dateLabel(payment.paid_at) }}
 </p>
 </td>

 <td class="px-4 py-3">
 <AppBadge variant="neutral">
 {{ label(payment.payment_method) }}
 </AppBadge>

 <p
 v-if="payment.creator?.name"
 class="mt-2 text-xs text-gray-500 dark:text-gray-400"
 >
 By {{ payment.creator.name }}
 </p>
 </td>

 <td class="px-4 py-3 text-right">
 <p class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 {{ money(payment.amount) }}
 </p>
 </td>

 <td class="px-4 py-3 text-right">
 <div
 v-if="canDeletePayment(payment)"
 class="flex items-center justify-end gap-2"
 >
 <AppButton
 v-if="payment.status === 'draft'"
 type="button"
 size="sm"
 @click="askPay(payment)"
 >
 Pay
 </AppButton>

 <AppButton
 type="button"
 variant="danger"
 size="sm"
 @click="askDelete(payment)"
 >
 Delete
 </AppButton>
 </div>

 <span
 v-else
 class="text-xs font-medium text-gray-400 dark:text-gray-500"
 >
 Invoice entry
 </span>
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </AppCard>

 <div class="grid gap-3 xl:hidden">
 <AppCard
 v-for="payment in payments"
 :key="payment.id"
 class="overflow-hidden p-4"
 >
 <div class="flex items-start justify-between gap-3">
 <div class="min-w-0">
 <h2 class="truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ payment.payment_number }}
 </h2>

 <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
 {{ payment.vendor?.name || 'Unknown vendor' }} · {{ label(payment.payment_method) }}
 </p>
 </div>

 <p class="shrink-0 text-sm font-semibold text-gray-950 dark:text-white">
 {{ money(payment.amount) }}
 </p>
 </div>

 <div class="mt-3 flex flex-wrap gap-2">
 <AppBadge :variant="statusVariant(payment.status)">
 {{ label(payment.status) }}
 </AppBadge>

 <AppBadge variant="neutral">
 {{ payment.purchase_invoice?.invoice_number || 'Vendor balance' }}
 </AppBadge>
 </div>

 <div
 v-if="canDeletePayment(payment)"
 class="mt-4 grid gap-2"
 :class="payment.status === 'draft' ? 'grid-cols-2' : 'grid-cols-1'"
 >
 <AppButton
 v-if="payment.status === 'draft'"
 type="button"
 size="sm"
 @click="askPay(payment)"
 >
 Pay
 </AppButton>

 <AppButton
 type="button"
 variant="danger"
 size="sm"
 @click="askDelete(payment)"
 >
 Delete
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
 payments
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

 <VendorPaymentModal
 :open="formOpen"
 :vendors="vendors"
 :purchase-invoices="purchaseInvoices"
 @close="formOpen = false"
 @saved="afterSaved"
 />

 <AppConfirmModal
 :open="payOpen"
 title="Mark payment as paid?"
 :message="`This will mark “${paymentToPay?.payment_number || 'this payment'}” as paid and reduce the vendor balance.`"
 confirm-label="Pay now"
 :loading="paying"
 :error="payError"
 @close="payOpen = false"
 @confirm="confirmPay"
 />

 <AppConfirmModal
 :open="deleteOpen"
 :title="paymentToDelete?.status === 'paid' ? 'Delete paid vendor payment?' : 'Delete vendor payment?'"
 :message="paymentToDelete?.status === 'paid'
 ? `This deletes “${paymentToDelete?.payment_number || 'this vendor payment'}” and restores its amount to the vendor balance and linked purchase invoice.`
 : `This deletes “${paymentToDelete?.payment_number || 'this vendor payment'}”.`"
 confirm-label="Delete payment"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="confirmDelete"
 />
 </section>
</template>
