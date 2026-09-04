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

type InventoryLocation = {
 id: number
 name: string
 code: string
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
 sale_price?: string | number | null
 track_inventory: boolean
 allow_backorder: boolean
 min_stock_level: number
 is_default: boolean
 is_active: boolean
}

type Product = {
 id: number
 name: string
 slug: string
 is_active: boolean
 variants?: ProductVariant[]
}

type InventoryStock = {
 id: number
 product_variant_id: number
 inventory_location_id: number
 on_hand_quantity: number
 reserved_quantity: number
 available_quantity: number
}

type SaleItem = {
 id?: number
 product_variant_id: number | null
 quantity: number
 unit_price: string | number
 discount_amount: string | number
 tax_amount: string | number
 line_total?: string | number
 notes: string | null
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
 fulfillment_status?: string
 payment_method?: string | null
 customer_name: string | null
 customer_phone: string | null
 customer_email?: string | null
 is_unread?: boolean
 read_at?: string | null
 shipping_recipient_name?: string | null
 shipping_recipient_phone?: string | null
 shipping_address_line1?: string | null
 shipping_address_line2?: string | null
 shipping_city?: string | null
 shipping_state?: string | null
 shipping_postal_code?: string | null
 tracking_number?: string | null
 shipping_carrier?: string | null
 status_history?: Array<{
 status: string
 note: string | null
 notify_email: boolean
 notify_sms: boolean
 email_sent: boolean
 sms_sent: boolean
 changed_by_name: string | null
 at: string | null
 }>
 subtotal: string | number
 discount_total: string | number
 invoice_discount_amount: string | number
 tax_total: string | number
 shipping_cost: string | number
 grand_total: string | number
 paid_amount: string | number
 balance_amount: string | number
 completed_at: string | null
 created_at?: string | null
 notes: string | null
 items_count?: number
 items_sum_quantity?: string | number | null
 items?: SaleItem[]
}

type PaginationMeta = {
 current_page: number
 from: number | null
 last_page: number
 per_page: number
 to: number | null
 total: number
}

type SaleInvoiceIndexResponse = {
 data: SaleInvoice[]
 meta: PaginationMeta
}

type SaleInvoiceResponse = {
 data: SaleInvoice
 message?: string
}

type CustomerIndexResponse = {
 data: Customer[]
}

type InventoryLocationResponse = {
 data: InventoryLocation[]
}

type ProductIndexResponse = {
 data: Product[]
}

type InventoryStockIndexResponse = {
 data: InventoryStock[]
}

const { $api } = useNuxtApp()
const { openPdf: openSecurePdf, state: securePdfState } = useSecurePdf()
const route = useRoute()
const unreadOnlineOrders = useState<number>('admin-unread-online-orders', () => 0)
const unreadOnly = ref(route.query.unread === '1')
const markingAllRead = ref(false)

watch(() => route.query.unread, value => {
 unreadOnly.value = value === '1'
})

async function refreshUnreadCount() {
 try {
  const response = await $api<{ unread_count: number }>('/admin/sale-invoices/unread-count')
  unreadOnlineOrders.value = Number(response.unread_count || 0)
 } catch {
  // Keep the last known count.
 }
}

const search = ref('')
const debouncedSearch = ref('')

const viewOpen = ref(false)
const viewingInvoiceId = ref<number | null>(null)
const printingDocument = computed(() => securePdfState.value.status === 'loading')

const selectedCustomerIds = ref<string[]>([])
const selectedLocationIds = ref<string[]>([])
const selectedStatuses = ref<string[]>([])
const selectedPaymentStatuses = ref<string[]>([])
const selectedChannels = ref<string[]>([])
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
const selectedInvoice = ref<SaleInvoice | null>(null)

const completeOpen = ref(false)
const completing = ref(false)
const completeError = ref('')
const invoiceToComplete = ref<SaleInvoice | null>(null)
const completedAtInput = ref('')
const { formatDate: formatAppDate, formatDateTime: formatAppDateTime, toDateTimeInput, dateTimeInputToIso, timezoneLabel } = useAppDateTime()

const statusModalOpen = ref(false)
const invoiceForStatusUpdate = ref<SaleInvoice | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const invoiceToDelete = ref<SaleInvoice | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const statusOptions = [
 { label: 'Draft', value: 'draft' },
 { label: 'Completed', value: 'completed' },
 { label: 'Cancelled', value: 'cancelled' },
]

const paymentStatusOptions = [
 { label: 'Unpaid', value: 'unpaid' },
 { label: 'Partial', value: 'partial' },
 { label: 'Paid', value: 'paid' },
]

const channelOptions = [
 { label: 'Manual', value: 'manual' },
 { label: 'POS', value: 'pos' },
 { label: 'Online', value: 'online' },
]

const balanceStatusOptions = [
 { label: 'With balance', value: 'with_balance' },
 { label: 'Paid in full', value: 'paid_full' },
]

const sortOptions = [
 { label: 'Latest sale date', value: 'latest' },
 { label: 'Oldest sale date', value: 'oldest' },
 { label: 'Amount high first', value: 'amount_high' },
 { label: 'Amount low first', value: 'amount_low' },
 { label: 'Balance high first', value: 'balance_high' },
 { label: 'Balance low first', value: 'balance_low' },
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
 selectedCustomerIds,
 selectedLocationIds,
 selectedStatuses,
 selectedPaymentStatuses,
 selectedChannels,
 selectedBalanceStatuses,
 dateFrom,
 dateTo,
 sortBy,
 perPage,
 unreadOnly,
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
 if (selectedPaymentStatuses.value.length) query.payment_statuses = selectedPaymentStatuses.value.join(',')
 if (selectedChannels.value.length) query.channels = selectedChannels.value.join(',')
 if (selectedBalanceStatuses.value.length) query.balance_statuses = selectedBalanceStatuses.value.join(',')
 if (dateFrom.value) query.date_from = dateFrom.value
 if (dateTo.value) query.date_to = dateTo.value
 if (unreadOnly.value) query.unread = 1

 return query
}

const {
 data: bootstrap,
 pending: bootstrapPending,
 error: bootstrapError,
 refresh: refreshBootstrap,
} = useAsyncData(
 'sale-invoices-bootstrap',
 async () => {
 const [customersResponse, locationsResponse, productsResponse, stocksResponse] = await Promise.all([
 $api<CustomerIndexResponse>('/admin/customers', {
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
 include_images: 1,
 ensure_default_variants: 1,
 is_active: 1,
 per_page: 100,
 sort_by: 'name',
 },
 }),
 $api<InventoryStockIndexResponse>('/admin/inventory-stocks', {
 query: {
 per_page: 100,
 },
 }),
 ])

 return {
 customers: customersResponse.data ?? [],
 locations: locationsResponse.data ?? [],
 products: productsResponse.data ?? [],
 stocks: stocksResponse.data ?? [],
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
 'admin-sale-invoices',
 () => $api<SaleInvoiceIndexResponse>('/admin/sale-invoices', {
 query: buildQuery(),
 }),
 {
 watch: [
 debouncedSearch,
 selectedCustomerIds,
 selectedLocationIds,
 selectedStatuses,
 selectedPaymentStatuses,
 selectedChannels,
 selectedBalanceStatuses,
 dateFrom,
 dateTo,
 sortBy,
 perPage,
 page,
 unreadOnly,
 ],
 immediate: true,
 },
)

const customers = computed(() => bootstrap.value?.customers ?? [])
const locations = computed(() => bootstrap.value?.locations ?? [])
const products = computed(() => bootstrap.value?.products ?? [])
const stocks = computed(() => bootstrap.value?.stocks ?? [])
const invoices = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)

const customerOptions = computed(() => {
 return customers.value.map((customer) => ({
 label: `${customer.name} (${customer.code})`,
 value: String(customer.id),
 hint: customer.phone || customer.email || undefined,
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
 || selectedPaymentStatuses.value.length
 || selectedChannels.value.length
 || selectedBalanceStatuses.value.length
 || dateFrom.value
 || dateTo.value
 || sortBy.value !== 'latest'
 || perPage.value !== 20
 || unreadOnly.value,
 )
})

const visibleFilterCount = computed(() => {
 let count = 0

 if (search.value) count++
 if (selectedCustomerIds.value.length) count++
 if (selectedLocationIds.value.length) count++
 if (selectedStatuses.value.length) count++
 if (selectedPaymentStatuses.value.length) count++
 if (selectedChannels.value.length) count++
 if (selectedBalanceStatuses.value.length) count++
 if (dateFrom.value) count++
 if (dateTo.value) count++
 if (sortBy.value !== 'latest') count++
 if (perPage.value !== 20) count++
 if (unreadOnly.value) count++

 return count
})

const draftCount = computed(() => invoices.value.filter((invoice) => invoice.status === 'draft').length)
const completedCount = computed(() => invoices.value.filter((invoice) => invoice.status === 'completed').length)
const totalSalesOnPage = computed(() => invoices.value.reduce((sum, invoice) => sum + Number(invoice.grand_total || 0), 0))
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
 return formatAppDate(value)
}

function dateTimeLabel(value: string | null | undefined) {
 return formatAppDateTime(value)
}

function statusVariant(status: string): 'neutral' | 'green' | 'red' | 'amber' | 'blue' {
 if (status === 'completed') return 'green'
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

function channelVariant(channel: string): 'neutral' | 'green' | 'red' | 'amber' | 'blue' {
 if (channel === 'online') return 'blue'
 if (channel === 'marketplace') return 'amber'

 return 'neutral'
}

function fulfillmentVariant(status?: string): 'neutral' | 'green' | 'red' | 'amber' | 'blue' {
 if (status === 'delivered') return 'green'
 if (status === 'returned') return 'red'
 if (status === 'shipped' || status === 'out_for_delivery') return 'blue'
 if (status === 'confirmed' || status === 'processing') return 'amber'

 return 'neutral'
}

function label(value: string) {
 return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function canEditInvoice(invoice: SaleInvoice) {
 return invoice.status === 'draft'
}

function customerDisplay(invoice: SaleInvoice) {
 return invoice.customer?.name || invoice.customer_name || 'Walk-in customer'
}

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) clearTimeout(noticeTimer.value)

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

async function fetchInvoice(invoiceId: number) {
 const response = await $api<SaleInvoiceResponse>(`/admin/sale-invoices/${invoiceId}`)
 return response.data
}

async function openView(invoice: SaleInvoice) {
 viewingInvoiceId.value = invoice.id
 selectedInvoice.value = invoice

 try {
 selectedInvoice.value = await fetchInvoice(invoice.id)
 viewOpen.value = true
 } catch (error: any) {
 showNotice(extractApiErrorMessage(error, 'Could not load invoice details.'))
 } finally {
 viewingInvoiceId.value = null
 }
}

function openProtectedPdf(path: string, fileName: string, title: string) {
 openSecurePdf({
 endpoint: path,
 filename: fileName,
 title,
 description: 'Private sales document — review before printing, sharing, or downloading.',
 errorFallback: `Could not open ${fileName}. Complete the invoice first, then try again.`,
 })
}

function printInvoicePdf(invoice: SaleInvoice) {
 if (invoice.status !== 'completed') {
 showNotice('Complete this invoice before printing.')
 return
 }

 return openProtectedPdf(
 `/admin/sale-invoices/${invoice.id}/pdf`,
 `sale-invoice-${invoice.invoice_number}.pdf`,
 `Sales invoice ${invoice.invoice_number}`,
 )
}

function printThermalReceipt(invoice: SaleInvoice, paper: '80' | '58' = '80') {
 if (invoice.status !== 'completed') {
 showNotice('Complete this invoice before printing a thermal receipt.')
 return
 }

 return openProtectedPdf(
 `/admin/sale-invoices/${invoice.id}/thermal-receipt?paper=${paper}`,
 `sales-receipt-${invoice.invoice_number}-${paper}mm.pdf`,
 `${paper}mm receipt ${invoice.invoice_number}`,
 )
}

function setQuickView(view: 'all' | 'new' | 'draft' | 'completed' | 'unpaid' | 'partial' | 'paid' | 'balance') {
 selectedStatuses.value = []
 selectedPaymentStatuses.value = []
 selectedBalanceStatuses.value = []
 unreadOnly.value = false

 if (view === 'all') return
 if (view === 'new') { unreadOnly.value = true; return }
 if (view === 'draft') selectedStatuses.value = ['draft']
 if (view === 'completed') selectedStatuses.value = ['completed']
 if (view === 'unpaid') selectedPaymentStatuses.value = ['unpaid']
 if (view === 'partial') selectedPaymentStatuses.value = ['partial']
 if (view === 'paid') selectedPaymentStatuses.value = ['paid']
 if (view === 'balance') selectedBalanceStatuses.value = ['with_balance']
}

function quickViewIsActive(view: 'all' | 'new' | 'draft' | 'completed' | 'unpaid' | 'partial' | 'paid' | 'balance') {
 if (view === 'new') return unreadOnly.value
 if (view === 'all') {
 return !unreadOnly.value
 && selectedStatuses.value.length === 0
 && selectedPaymentStatuses.value.length === 0
 && selectedBalanceStatuses.value.length === 0
 }

 if (view === 'draft') return selectedStatuses.value.length === 1 && selectedStatuses.value.includes('draft')
 if (view === 'completed') return selectedStatuses.value.length === 1 && selectedStatuses.value.includes('completed')
 if (view === 'unpaid') return selectedPaymentStatuses.value.length === 1 && selectedPaymentStatuses.value.includes('unpaid')
 if (view === 'partial') return selectedPaymentStatuses.value.length === 1 && selectedPaymentStatuses.value.includes('partial')
 if (view === 'paid') return selectedPaymentStatuses.value.length === 1 && selectedPaymentStatuses.value.includes('paid')
 if (view === 'balance') return selectedBalanceStatuses.value.length === 1 && selectedBalanceStatuses.value.includes('with_balance')

 return false
}

function openCreate() {
 selectedInvoice.value = null
 formMode.value = 'create'
 formOpen.value = true
}

async function openEdit(invoice: SaleInvoice) {
 if (!canEditInvoice(invoice)) return

 editingInvoiceId.value = invoice.id
 selectedInvoice.value = invoice
 formMode.value = 'edit'

 try {
 selectedInvoice.value = await fetchInvoice(invoice.id)
 formOpen.value = true
 } catch (error: any) {
 showNotice(extractApiErrorMessage(error, 'Could not load sale invoice.'))
 } finally {
 editingInvoiceId.value = null
 }
}

async function afterSaved(invoice: SaleInvoice, message?: string) {
 formOpen.value = false
 selectedInvoice.value = invoice
 showNotice(message || 'Sale invoice saved successfully.')
 await refresh()
}

function askComplete(invoice: SaleInvoice) {
 invoiceToComplete.value = invoice
 completedAtInput.value = toDateTimeInput()
 completeError.value = ''
 completeOpen.value = true
}

async function confirmComplete() {
 if (!invoiceToComplete.value) return

 completing.value = true
 completeError.value = ''

 const completedAt = dateTimeInputToIso(completedAtInput.value)
 if (!completedAt) {
 completeError.value = 'Choose a valid completion date and time.'
 completing.value = false
 return
 }

 try {
 const response = await $api<SaleInvoiceResponse>(`/admin/sale-invoices/${invoiceToComplete.value.id}/complete`, {
 method: 'POST',
 body: {
 completed_at: completedAt,
 note: `Sale completed from ${invoiceToComplete.value.invoice_number}`,
 },
 })

 completeOpen.value = false
 showNotice(response.message || 'Sale invoice completed successfully.')

 await Promise.all([
 refresh(),
 refreshBootstrap(),
 ])
 } catch (error: any) {
 completeError.value = extractApiErrorMessage(error, 'Could not complete sale invoice.')
 } finally {
 completing.value = false
 }
}

function askUpdateStatus(invoice: SaleInvoice) {
 invoiceForStatusUpdate.value = invoice
 statusModalOpen.value = true
}

async function afterStatusSaved() {
 statusModalOpen.value = false
 showNotice('Order status updated successfully.')
 await refresh()
}

function askDelete(invoice: SaleInvoice) {
 invoiceToDelete.value = invoice
 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDelete() {
 if (!invoiceToDelete.value) return

 deleting.value = true
 deleteError.value = ''

 try {
 const response = await $api<{ message?: string }>(`/admin/sale-invoices/${invoiceToDelete.value.id}`, {
 method: 'DELETE',
 })

 deleteOpen.value = false
 showNotice(response.message || 'Sale invoice deleted successfully.')
 await refresh()
 } catch (error: any) {
 deleteError.value = extractApiErrorMessage(error, 'Could not delete sale invoice.')
 } finally {
 deleting.value = false
 }
}

function clearFilters() {
 search.value = ''
 debouncedSearch.value = ''
 selectedCustomerIds.value = []
 selectedLocationIds.value = []
 selectedStatuses.value = []
 selectedPaymentStatuses.value = []
 selectedChannels.value = []
 selectedBalanceStatuses.value = []
 dateFrom.value = ''
 dateTo.value = ''
 sortBy.value = 'latest'
 perPage.value = 20
 unreadOnly.value = false
 page.value = 1
}

async function markOrderRead(invoice: SaleInvoice) {
 if (!invoice.is_unread) return
 try {
  const response = await $api<{ message: string, unread_count: number, data: SaleInvoice }>(`/admin/sale-invoices/${invoice.id}/mark-read`, { method: 'POST' })
  invoice.is_unread = false
  invoice.read_at = response.data?.read_at ?? new Date().toISOString()
  unreadOnlineOrders.value = Number(response.unread_count || 0)
  if (unreadOnly.value) await refresh()
 } catch (error: any) {
  showNotice(extractApiErrorMessage(error, 'Could not mark this order as read.'))
 }
}

async function markAllOnlineOrdersRead() {
 if (!unreadOnlineOrders.value || markingAllRead.value) return
 markingAllRead.value = true
 try {
  const response = await $api<{ message: string, unread_count: number }>('/admin/sale-invoices/mark-all-read', { method: 'POST' })
  unreadOnlineOrders.value = Number(response.unread_count || 0)
  showNotice(response.message || 'All online orders marked as read.')
  await refresh()
 } catch (error: any) {
  showNotice(extractApiErrorMessage(error, 'Could not mark orders as read.'))
 } finally {
  markingAllRead.value = false
 }
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
 <SaleInvoicesSkeleton v-if="isInitialLoading" />

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
 title="Sale invoices"
 description="Create sales for customers or walk-ins, complete invoices, deduct stock and update customer receivable balance."
 >
 <template #actions>
 <AppButton
 v-if="unreadOnlineOrders > 0"
 variant="secondary"
 :loading="markingAllRead"
 @click="markAllOnlineOrdersRead"
 >
 Mark all read · {{ unreadOnlineOrders }}
 </AppButton>

 <AppButton
 variant="secondary"
 :loading="pending || bootstrapPending"
 @click="refreshAll"
 >
 {{ pending || bootstrapPending ? 'Refreshing...' : 'Refresh' }}
 </AppButton>

 <AppButton @click="openCreate">
 New sale
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
 Sale invoices
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
 Sales on page
 </p>

 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ money(totalSalesOnPage) }}
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Grand total shown
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Receivable on page
 </p>

 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ money(totalBalanceOnPage) }}
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Customer balance from shown invoices
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
 Drafts · {{ completedCount }} completed
 </p>
 </AppCard>
 </div>

 <AppCard class="overflow-visible">
 <div class="shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 ">
 <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
 <AppInput
 v-model="search"
 placeholder="Search invoice, customer, phone, SKU, barcode, product or notes..."
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
 class="inline-flex items-center gap-2 rounded-[8px] px-3 py-2 text-[12px] font-medium transition"
 :class="quickViewIsActive('new') ? 'bg-rose-500 text-white' : 'bg-rose-500/[0.08] text-rose-700 hover:bg-rose-500/[0.13] dark:bg-rose-500/10 dark:text-rose-300'"
 @click="setQuickView('new')"
 >
 <span v-if="unreadOnlineOrders > 0" class="h-1.5 w-1.5 rounded-full bg-current" />
 New online
 <span v-if="unreadOnlineOrders > 0" class="tabular-nums">{{ unreadOnlineOrders }}</span>
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
 :class="quickViewIsActive('completed') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('completed')"
 >
 Completed
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
 </div>

 <div
 v-if="filtersOpen"
 class="grid gap-3 shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 sm:grid-cols-2 xl:grid-cols-6"
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
 v-model="selectedPaymentStatuses"
 label="Payment"
 placeholder="All payments"
 :options="paymentStatusOptions"
 :searchable="false"
 />

 <AppMultiSelect
 v-model="selectedChannels"
 label="Channel"
 placeholder="All channels"
 :options="channelOptions"
 :searchable="false"
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
 v-if="completedCount"
 variant="green"
 >
 {{ completedCount }} completed
 </AppBadge>
 </div>
 </AppCard>

 <AppErrorState
 v-if="hasError"
 title="Sale invoices could not be loaded"
 message="Please check backend API, authentication token, or route permissions."
 @retry="refreshAll"
 />

 <AppEmptyState
 v-else-if="invoices.length === 0"
 title="No sale invoices found"
 message="Create your first sale invoice or clear filters."
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
 New sale
 </AppButton>
 </div>
 </template>
 </AppEmptyState>

 <template v-else>
 <AppCard class="hidden overflow-visible xl:block">
 <div class="overflow-hidden">
 <table class="w-full table-fixed divide-y divide-gray-100 dark:divide-white/[0.055]">
 <colgroup>
 <col class="w-[18%]">
 <col class="w-[16%]">
 <col class="w-[14%]">
 <col class="w-[14%]">
 <col class="w-[13%]">
 <col class="w-[25%]">
 </colgroup>
 <thead class="bg-gray-950/[0.018] dark:bg-white/[0.025]">
 <tr>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Invoice
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Customer / location
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

 <p
 v-else
 class="block max-w-full truncate text-sm font-semibold text-gray-950 dark:text-white"
 >
 {{ invoice.invoice_number }}
 </p>

 <div class="mt-1.5 flex items-center gap-1.5">
 <AppBadge :variant="channelVariant(invoice.channel)">
 {{ label(invoice.channel) }}
 </AppBadge>
 <span v-if="invoice.is_unread" class="inline-flex items-center gap-1 rounded-full bg-rose-500/[0.09] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><span class="h-1.5 w-1.5 rounded-full bg-rose-500" />New</span>

 <span class="text-xs text-gray-400 dark:text-gray-500">
 {{ dateLabel(invoice.sale_date) }}
 </span>
 </div>

 <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
 {{ invoice.items_count ?? 0 }} lines · {{ invoice.items_sum_quantity ?? 0 }} units
 </p>

 <p
 v-if="invoice.channel === 'online' && invoice.created_at"
 class="mt-1 text-xs text-gray-500 dark:text-gray-400"
 >
 Order received {{ dateTimeLabel(invoice.created_at) }}
 </p>
 </td>

 <td class="min-w-0 px-4 py-3">
 <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
 {{ customerDisplay(invoice) }}
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

 <div
 v-if="invoice.channel === 'online' && invoice.fulfillment_status"
 class="mt-1.5"
 >
 <AppBadge :variant="fulfillmentVariant(invoice.fulfillment_status)">
 {{ label(invoice.fulfillment_status) }}
 </AppBadge>
 </div>

 <p
 v-if="invoice.completed_at"
 class="mt-2 text-xs text-gray-500 dark:text-gray-400"
 >
 Completed {{ dateTimeLabel(invoice.completed_at) }}
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
 <div class="flex flex-wrap items-center justify-end gap-2">
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="viewingInvoiceId === invoice.id"
 @click="openView(invoice)"
 >
 View
 </AppButton>

 <template v-if="invoice.status === 'draft'">
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
 @click="askComplete(invoice)"
 >
 Complete
 </AppButton>

 <AppButton
 type="button"
 variant="danger"
 size="sm"
 @click="askDelete(invoice)"
 >
 Delete
 </AppButton>
 </template>

 <template v-else-if="invoice.status === 'completed'">
 <AppButton
 type="button"
 size="sm"
 :loading="printingDocument"
 @click="printThermalReceipt(invoice, '80')"
 >
 Receipt
 </AppButton>

 <AppActionMenu>
 <template #default="{ close }">
 <AppActionMenuItem
 v-if="invoice.is_unread"
 @click="markOrderRead(invoice); close()"
 >
 Mark as read
 </AppActionMenuItem>
 <AppActionMenuItem
 v-if="invoice.channel === 'online'"
 @click="askUpdateStatus(invoice); close()"
 >
 Update status
 </AppActionMenuItem>

 <AppActionMenuItem @click="printInvoicePdf(invoice); close()">
 Invoice PDF
 </AppActionMenuItem>

 <AppActionMenuItem danger @click="askDelete(invoice); close()">
 Delete sale
 </AppActionMenuItem>
 </template>
 </AppActionMenu>
 </template>

 <AppButton
 v-else
 type="button"
 variant="danger"
 size="sm"
 @click="askDelete(invoice)"
 >
 Delete
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
 {{ customerDisplay(invoice) }} · {{ invoice.location?.code || 'No location' }}
 </p>
 </button>

 <div
 v-else
 class="min-w-0"
 >
 <h2 class="truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ invoice.invoice_number }}
 </h2>

 <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
 {{ customerDisplay(invoice) }} · {{ invoice.location?.code || 'No location' }}
 </p>
 </div>
 </div>

 <div class="mt-3 flex flex-wrap gap-2">
 <AppBadge :variant="channelVariant(invoice.channel)">
 {{ label(invoice.channel) }}
 </AppBadge>
 <span v-if="invoice.is_unread" class="inline-flex items-center gap-1 rounded-full bg-rose-500/[0.09] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><span class="h-1.5 w-1.5 rounded-full bg-rose-500" />New</span>

 <AppBadge :variant="statusVariant(invoice.status)">
 {{ label(invoice.status) }}
 </AppBadge>

 <AppBadge
 v-if="invoice.channel === 'online' && invoice.fulfillment_status"
 :variant="fulfillmentVariant(invoice.fulfillment_status)"
 >
 {{ label(invoice.fulfillment_status) }}
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

 <div class="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
  <p v-if="invoice.channel === 'online' && invoice.created_at">Order received {{ dateTimeLabel(invoice.created_at) }}</p>
  <p v-if="invoice.completed_at">Completed {{ dateTimeLabel(invoice.completed_at) }}</p>
 </div>

 <div
 v-if="invoice.status === 'draft'"
 class="mt-4 grid grid-cols-4 gap-2"
 >
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
 @click="askComplete(invoice)"
 >
 Complete
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
 v-else-if="invoice.status === 'completed'"
 class="mt-4 grid grid-cols-2 gap-2"
 >
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
 @click="printThermalReceipt(invoice, '80')"
 >
 Receipt
 </AppButton>

 <AppActionMenu class="col-span-2">
 <template #default="{ close }">
 <AppActionMenuItem
 v-if="invoice.is_unread"
 @click="markOrderRead(invoice); close()"
 >
 Mark as read
 </AppActionMenuItem>
 <AppActionMenuItem
 v-if="invoice.channel === 'online'"
 @click="askUpdateStatus(invoice); close()"
 >
 Update status
 </AppActionMenuItem>

 <AppActionMenuItem @click="printInvoicePdf(invoice); close()">
 Invoice PDF
 </AppActionMenuItem>

 <AppActionMenuItem danger @click="askDelete(invoice); close()">
 Delete sale
 </AppActionMenuItem>
 </template>
 </AppActionMenu>
 </div>

 <div
 v-else
 class="mt-4 grid grid-cols-2 gap-2"
 >
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
 variant="danger"
 size="sm"
 @click="askDelete(invoice)"
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
 sale invoices
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

 <SaleInvoiceDetailsModal
 :open="viewOpen"
 :invoice="selectedInvoice"
 :printing="printingDocument"
 @close="viewOpen = false"
 @print-invoice="printInvoicePdf"
 @print-thermal80="(invoice) => printThermalReceipt(invoice, '80')"
 @print-thermal58="(invoice) => printThermalReceipt(invoice, '58')"
 />

 <SaleInvoiceFormModal
 :open="formOpen"
 :mode="formMode"
 :invoice="selectedInvoice"
 :customers="customers"
 :locations="locations"
 :products="products"
 :stocks="stocks"
 @close="formOpen = false"
 @saved="afterSaved"
 />

 <AppConfirmModal
 :open="completeOpen"
 title="Complete sale?"
 :message="`This will complete “${invoiceToComplete?.invoice_number || 'this invoice'}”, deduct item quantities from inventory, create movement logs, and update customer receivable balance if unpaid or partial.`"
 confirm-label="Complete sale"
 :loading="completing"
 :error="completeError"
 @close="completeOpen = false"
 @confirm="confirmComplete"
 >
  <div class="rounded-[12px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
   <AppInput v-model="completedAtInput" type="datetime-local" label="Sale completion date & time" />
   <p class="mt-2 text-[11px] leading-5 text-gray-400 dark:text-gray-500">Shown in {{ timezoneLabel }}. You can adjust it when entering a sale later.</p>
  </div>
 </AppConfirmModal>

 <OrderStatusUpdateModal
 :open="statusModalOpen"
 :invoice="invoiceForStatusUpdate"
 @close="statusModalOpen = false"
 @saved="afterStatusSaved"
 />

 <AppConfirmModal
 :open="deleteOpen"
 :title="invoiceToDelete?.status === 'completed' ? 'Delete completed sale?' : 'Delete sale invoice?'"
 :message="invoiceToDelete?.status === 'completed'
 ? `This permanently deletes “${invoiceToDelete?.invoice_number || 'this sale'}” and its returns and payment records. Only the net quantity not already returned will be restored to stock, and the customer balance will be corrected.`
 : `This permanently deletes “${invoiceToDelete?.invoice_number || 'this sale invoice'}”.`"
 confirm-label="Delete sale"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="confirmDelete"
 />
 </section>
</template>
