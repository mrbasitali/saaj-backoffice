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
 current_balance: string | number
 is_active: boolean
}

type SaleInvoice = {
 id: number
 customer_id: number | null
 customer?: Customer | null
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

type CustomerPayment = {
 id: number
 customer_id: number | null
 customer?: Customer | null
 sale_invoice_id: number | null
 sale_invoice?: SaleInvoice | null
 payment_number: string
 payment_date: string
 payment_method: string
 status: string
 amount: string | number
 reference_number: string | null
 received_at: string | null
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

type CustomerPaymentIndexResponse = {
 data: CustomerPayment[]
 meta: PaginationMeta
}

type CustomerPaymentResponse = {
 data: CustomerPayment
 message?: string
}

type CustomerIndexResponse = {
 data: Customer[]
}

type SaleInvoiceIndexResponse = {
 data: SaleInvoice[]
}

const { $api } = useNuxtApp()
const { openPdf: openSecurePdf, state: securePdfState } = useSecurePdf()

const search = ref('')
const debouncedSearch = ref('')

const selectedCustomerIds = ref<string[]>([])
const selectedStatuses = ref<string[]>([])
const selectedPaymentMethods = ref<string[]>([])

const dateFrom = ref('')
const dateTo = ref('')
const sortBy = ref('latest')
const perPage = ref(20)
const page = ref(1)
const filtersOpen = ref(false)

const formOpen = ref(false)

const receiveOpen = ref(false)
const receiving = ref(false)
const receiveError = ref('')
const paymentToReceive = ref<CustomerPayment | null>(null)
const receivedAtInput = ref('')
const { formatDate: formatAppDate, formatDateTime: formatAppDateTime, toDateTimeInput, dateTimeInputToIso, timezoneLabel } = useAppDateTime()

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const paymentToDelete = ref<CustomerPayment | null>(null)

const printingDocument = computed(() => securePdfState.value.status === 'loading')

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const statusOptions = [
 { label: 'Draft', value: 'draft' },
 { label: 'Received', value: 'received' },
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
 selectedCustomerIds,
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
 if (selectedCustomerIds.value.length) query.customer_ids = selectedCustomerIds.value.join(',')
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
 'customer-payments-bootstrap',
 async () => {
 const [customersResponse, invoicesResponse] = await Promise.all([
 $api<CustomerIndexResponse>('/admin/customers', {
 query: {
 is_active: 1,
 balance_status: 'receivable',
 per_page: 100,
 sort_by: 'name',
 },
 }),
 $api<SaleInvoiceIndexResponse>('/admin/sale-invoices', {
 query: {
 status: 'completed',
 balance_status: 'with_balance',
 per_page: 100,
 sort_by: 'latest',
 },
 }),
 ])

 return {
 customers: customersResponse.data ?? [],
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
 'admin-customer-payments',
 () => $api<CustomerPaymentIndexResponse>('/admin/customer-payments', {
 query: buildQuery(),
 }),
 {
 watch: [
 debouncedSearch,
 selectedCustomerIds,
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

const customers = computed(() => bootstrap.value?.customers ?? [])
const saleInvoices = computed(() => bootstrap.value?.saleInvoices ?? [])
const payments = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)

const customerOptions = computed(() => {
 return customers.value.map((customer) => ({
 label: `${customer.name} (${customer.code})`,
 value: String(customer.id),
 hint: [
 customer.phone,
 `Balance ${money(customer.current_balance)}`,
 ].filter(Boolean).join(' · '),
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
 if (selectedCustomerIds.value.length) count++
 if (selectedStatuses.value.length) count++
 if (selectedPaymentMethods.value.length) count++
 if (dateFrom.value) count++
 if (dateTo.value) count++
 if (sortBy.value !== 'latest') count++
 if (perPage.value !== 20) count++

 return count
})

const draftCount = computed(() => payments.value.filter((payment) => payment.status === 'draft').length)
const receivedCount = computed(() => payments.value.filter((payment) => payment.status === 'received').length)
const totalReceivedOnPage = computed(() => payments.value
 .filter((payment) => payment.status === 'received')
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
 return formatAppDate(value)
}

function dateTimeLabel(value: string | null | undefined) {
 return formatAppDateTime(value)
}

function statusVariant(status: string): 'neutral' | 'green' | 'red' | 'amber' | 'blue' {
 if (status === 'received') return 'green'
 if (status === 'draft') return 'amber'
 if (status === 'cancelled') return 'red'

 return 'neutral'
}

function label(value: string | null | undefined) {
 return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function isInvoiceOpeningPayment(payment: CustomerPayment) {
 return payment.status === 'received' && String(payment.notes || '').startsWith('Auto-recorded —')
}

function canDeletePayment(payment: CustomerPayment) {
 return !isInvoiceOpeningPayment(payment)
}

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) clearTimeout(noticeTimer.value)

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

function invoiceLabel(payment: CustomerPayment) {
 return payment.sale_invoice?.invoice_number || 'Customer balance payment'
}

function customerLabel(payment: CustomerPayment) {
 if (payment.customer?.name) return payment.customer.name
 if (payment.sale_invoice?.customer_name) return `${payment.sale_invoice.customer_name} (walk-in)`
 if (payment.sale_invoice_id) return 'Walk-in customer'

 return 'Unknown customer'
}

function setQuickView(view: 'all' | 'draft' | 'received' | 'cash' | 'card' | 'bank_transfer') {
 selectedStatuses.value = []
 selectedPaymentMethods.value = []

 if (view === 'all') return
 if (view === 'draft') selectedStatuses.value = ['draft']
 if (view === 'received') selectedStatuses.value = ['received']
 if (view === 'cash') selectedPaymentMethods.value = ['cash']
 if (view === 'card') selectedPaymentMethods.value = ['card']
 if (view === 'bank_transfer') selectedPaymentMethods.value = ['bank_transfer']
}

function quickViewIsActive(view: 'all' | 'draft' | 'received' | 'cash' | 'card' | 'bank_transfer') {
 if (view === 'all') {
 return selectedStatuses.value.length === 0 && selectedPaymentMethods.value.length === 0
 }

 if (view === 'draft') return selectedStatuses.value.length === 1 && selectedStatuses.value.includes('draft')
 if (view === 'received') return selectedStatuses.value.length === 1 && selectedStatuses.value.includes('received')
 if (view === 'cash') return selectedPaymentMethods.value.length === 1 && selectedPaymentMethods.value.includes('cash')
 if (view === 'card') return selectedPaymentMethods.value.length === 1 && selectedPaymentMethods.value.includes('card')
 if (view === 'bank_transfer') return selectedPaymentMethods.value.length === 1 && selectedPaymentMethods.value.includes('bank_transfer')

 return false
}

function openCreate() {
 formOpen.value = true
}

async function afterSaved(payment: CustomerPayment, message?: string) {
 formOpen.value = false
 showNotice(message || 'Customer payment saved successfully.')

 await Promise.all([
 refresh(),
 refreshBootstrap(),
 ])
}

function askReceive(payment: CustomerPayment) {
 paymentToReceive.value = payment
 receivedAtInput.value = toDateTimeInput()
 receiveError.value = ''
 receiveOpen.value = true
}

async function confirmReceive() {
 if (!paymentToReceive.value) return

 receiving.value = true
 receiveError.value = ''

 const receivedAt = dateTimeInputToIso(receivedAtInput.value)
 if (!receivedAt) {
 receiveError.value = 'Choose a valid payment receipt date and time.'
 receiving.value = false
 return
 }

 try {
 const response = await $api<CustomerPaymentResponse>(`/admin/customer-payments/${paymentToReceive.value.id}/receive`, {
 method: 'POST',
 body: {
 received_at: receivedAt,
 },
 })

 receiveOpen.value = false
 showNotice(response.message || 'Customer payment received successfully.')

 await Promise.all([
 refresh(),
 refreshBootstrap(),
 ])
 } catch (error: any) {
 receiveError.value = extractApiErrorMessage(error, 'Could not receive customer payment.')
 } finally {
 receiving.value = false
 }
}

function askDelete(payment: CustomerPayment) {
 paymentToDelete.value = payment
 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDelete() {
 if (!paymentToDelete.value) return

 deleting.value = true
 deleteError.value = ''

 try {
 const response = await $api<{ message?: string }>(`/admin/customer-payments/${paymentToDelete.value.id}`, {
 method: 'DELETE',
 })

 deleteOpen.value = false
 showNotice(response.message || 'Customer payment deleted successfully.')
 await Promise.all([
 refresh(),
 refreshBootstrap(),
 ])
 } catch (error: any) {
 deleteError.value = extractApiErrorMessage(error, 'Could not delete customer payment.')
 } finally {
 deleting.value = false
 }
}

function openProtectedPdf(path: string, fileName: string, title: string) {
 openSecurePdf({
 endpoint: path,
 filename: fileName,
 title,
 description: 'Private payment receipt — review before printing, sharing, or downloading.',
 errorFallback: `Could not open ${fileName}. Receive the payment first, then try again.`,
 })
}

function printReceipt(payment: CustomerPayment) {
 if (payment.status !== 'received') {
 showNotice('Receive this customer payment before printing receipt.')
 return
 }

 return openProtectedPdf(
 `/admin/customer-payments/${payment.id}/pdf`,
 `customer-payment-receipt-${payment.payment_number}.pdf`,
 `Customer payment ${payment.payment_number}`,
 )
}

function clearFilters() {
 search.value = ''
 debouncedSearch.value = ''
 selectedCustomerIds.value = []
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
 <CustomerPaymentsSkeleton v-if="isInitialLoading" />

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
 title="Customer payments"
 description="Receive customer payments, settle completed sale invoices, print receipts and reduce customer receivable balance."
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
 Received on page
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ money(totalReceivedOnPage) }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ receivedCount }} received payments
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
 {{ draftCount }} waiting to receive
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Receivable invoices
 </p>
 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ saleInvoices.length }}
 </p>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Completed invoices with balance
 </p>
 </AppCard>
 </div>

 <AppCard class="overflow-visible">
 <div class="shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 ">
 <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
 <AppInput
 v-model="search"
 placeholder="Search payment number, customer, invoice, reference or notes..."
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
 :class="quickViewIsActive('cash') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('cash')"
 >
 Cash
 </button>

 <button
 type="button"
 class="rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('card') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('card')"
 >
 Card
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
 v-model="selectedCustomerIds"
 label="Customers"
 placeholder="All customers"
 :options="customerOptions"
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
 v-if="receivedCount"
 variant="green"
 >
 {{ receivedCount }} received
 </AppBadge>
 </div>
 </AppCard>

 <AppErrorState
 v-if="hasError"
 title="Customer payments could not be loaded"
 message="Please check backend API, authentication token, or route permissions."
 @retry="refreshAll"
 />

 <AppEmptyState
 v-else-if="payments.length === 0"
 title="No customer payments found"
 message="Create your first customer payment or clear filters."
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
 Customer / invoice
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
 {{ customerLabel(payment) }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ invoiceLabel(payment) }}
 </p>
 </td>

 <td class="px-4 py-3">
 <AppBadge :variant="statusVariant(payment.status)">
 {{ label(payment.status) }}
 </AppBadge>

 <p
 v-if="payment.received_at"
 class="mt-2 text-xs text-gray-500 dark:text-gray-400"
 >
 Received {{ dateTimeLabel(payment.received_at) }}
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
 class="flex items-center justify-end gap-2"
 >
 <AppButton
 v-if="payment.status === 'draft'"
 type="button"
 size="sm"
 @click="askReceive(payment)"
 >
 Receive
 </AppButton>

 <AppButton
 v-if="payment.status === 'received'"
 type="button"
 variant="secondary"
 size="sm"
 :loading="printingDocument"
 @click="printReceipt(payment)"
 >
 Receipt
 </AppButton>

 <AppButton
 v-if="canDeletePayment(payment)"
 type="button"
 variant="danger"
 size="sm"
 @click="askDelete(payment)"
 >
 Delete
 </AppButton>

 <span
 v-if="!canDeletePayment(payment)"
 class="text-xs font-medium text-gray-400 dark:text-gray-500"
 >
 Invoice entry
 </span>
 </div>
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
 {{ customerLabel(payment) }} · {{ label(payment.payment_method) }}
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
 {{ invoiceLabel(payment) }}
 </AppBadge>
 </div>

 <div
 class="mt-4 grid gap-2"
 :class="canDeletePayment(payment) ? 'grid-cols-2' : 'grid-cols-1'"
 >
 <AppButton
 v-if="payment.status === 'draft'"
 type="button"
 size="sm"
 @click="askReceive(payment)"
 >
 Receive
 </AppButton>

 <AppButton
 v-if="payment.status === 'received'"
 type="button"
 variant="secondary"
 size="sm"
 :loading="printingDocument"
 @click="printReceipt(payment)"
 >
 Receipt
 </AppButton>

 <AppButton
 v-if="canDeletePayment(payment)"
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

 <CustomerPaymentModal
 :open="formOpen"
 :customers="customers"
 :sale-invoices="saleInvoices"
 @close="formOpen = false"
 @saved="afterSaved"
 />

 <AppConfirmModal
 :open="receiveOpen"
 title="Receive customer payment?"
 :message="`This will receive “${paymentToReceive?.payment_number || 'this payment'}”, reduce the customer balance, and update the linked sale invoice if selected.`"
 confirm-label="Receive payment"
 :loading="receiving"
 :error="receiveError"
 @close="receiveOpen = false"
 @confirm="confirmReceive"
 >
  <div class="rounded-[12px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
   <AppInput v-model="receivedAtInput" type="datetime-local" label="Payment received date & time" />
   <p class="mt-2 text-[11px] leading-5 text-gray-400 dark:text-gray-500">Shown in {{ timezoneLabel }}. Adjust it for a payment recorded later.</p>
  </div>
 </AppConfirmModal>

 <AppConfirmModal
 :open="deleteOpen"
 :title="paymentToDelete?.status === 'received' ? 'Delete received customer payment?' : 'Delete customer payment?'"
 :message="paymentToDelete?.status === 'received'
 ? `This deletes “${paymentToDelete?.payment_number || 'this customer payment'}” and restores its amount to the customer balance and linked sale invoice.`
 : `This deletes “${paymentToDelete?.payment_number || 'this customer payment'}”.`"
 confirm-label="Delete payment"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="confirmDelete"
 />
 </section>
</template>
