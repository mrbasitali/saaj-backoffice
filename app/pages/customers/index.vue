<script setup lang="ts">
definePageMeta({
 middleware: 'auth',
 layout: 'admin',
})

type CustomerAddress = {
 id: number
 label: string | null
 recipient_name: string
 recipient_phone: string
 address_line1: string
 address_line2: string | null
 country_name?: string | null
 state_name?: string | null
 city_name?: string | null
 postal_code: string | null
 is_default: boolean
}

type Customer = {
 id: number
 code: string
 name: string
 email: string | null
 phone: string | null
 secondary_phone: string | null
 gender: string | null
 date_of_birth: string | null
 address: string | null
 city: string | null
 country: string | null
 opening_balance: string | number
 current_balance: string | number
 notes: string | null
 is_active: boolean
 sort_order: number
 addresses?: CustomerAddress[]
 sale_invoices_count?: number
 sale_returns_count?: number
 payments_count?: number
 sale_invoices_sum_grand_total?: string | number | null
 payments_sum_amount?: string | number | null
 last_sale_date?: string | null
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

type CustomerIndexResponse = {
 data: Customer[]
 meta: PaginationMeta
}

type CustomerResponse = {
 data: Customer
 message?: string
}

const { $api } = useNuxtApp()

const search = ref('')
const debouncedSearch = ref('')

const selectedActiveStatuses = ref<string[]>([])
const selectedGenders = ref<string[]>([])
const selectedBalanceStatuses = ref<string[]>([])
const selectedActivityStatuses = ref<string[]>([])

const sortBy = ref('updated')
const perPage = ref(20)
const page = ref(1)
const filtersOpen = ref(false)
const editingCustomerId = ref<number | null>(null)

const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const selectedCustomer = ref<Customer | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const customerToDelete = ref<Customer | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const activeStatusOptions = [
 { label: 'Active', value: 'active' },
 { label: 'Inactive', value: 'inactive' },
]

const genderOptions = [
 { label: 'Male', value: 'male' },
 { label: 'Female', value: 'female' },
 { label: 'Other', value: 'other' },
]

const balanceStatusOptions = [
 { label: 'Receivable', value: 'receivable', hint: 'Customer owes money' },
 { label: 'Customer credit', value: 'credit', hint: 'You owe or credit customer' },
 { label: 'Settled', value: 'settled', hint: 'Zero balance' },
]

const activityStatusOptions = [
 { label: 'Has sales', value: 'has_sales' },
 { label: 'No sales', value: 'no_sales' },
 { label: 'Has payments', value: 'has_payments' },
 { label: 'Has returns', value: 'has_returns' },
]

const sortOptions = [
 { label: 'Recently updated', value: 'updated' },
 { label: 'Sort order', value: 'sort_order' },
 { label: 'Name A-Z', value: 'name' },
 { label: 'Latest created', value: 'latest' },
 { label: 'Oldest created', value: 'oldest' },
 { label: 'Balance high first', value: 'balance_high' },
 { label: 'Balance low first', value: 'balance_low' },
 { label: 'Sales high first', value: 'sales_high' },
 { label: 'Last sale', value: 'last_sale' },
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
 selectedActiveStatuses,
 selectedGenders,
 selectedBalanceStatuses,
 selectedActivityStatuses,
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
 if (selectedActiveStatuses.value.length) query.active_statuses = selectedActiveStatuses.value.join(',')
 if (selectedGenders.value.length) query.genders = selectedGenders.value.join(',')
 if (selectedBalanceStatuses.value.length) query.balance_statuses = selectedBalanceStatuses.value.join(',')
 if (selectedActivityStatuses.value.length) query.activity_statuses = selectedActivityStatuses.value.join(',')

 return query
}

const {
 data,
 pending,
 error,
 refresh,
} = useAsyncData(
 'admin-customers',
 () => $api<CustomerIndexResponse>('/admin/customers', {
 query: buildQuery(),
 }),
 {
 watch: [
 debouncedSearch,
 selectedActiveStatuses,
 selectedGenders,
 selectedBalanceStatuses,
 selectedActivityStatuses,
 sortBy,
 perPage,
 page,
 ],
 immediate: true,
 },
)

const customers = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)

const isInitialLoading = computed(() => pending.value && !data.value)
const isRefreshing = computed(() => pending.value && Boolean(data.value))

const hasActiveFilters = computed(() => {
 return Boolean(
 search.value
 || selectedActiveStatuses.value.length
 || selectedGenders.value.length
 || selectedBalanceStatuses.value.length
 || selectedActivityStatuses.value.length
 || sortBy.value !== 'updated'
 || perPage.value !== 20,
 )
})

const visibleFilterCount = computed(() => {
 let count = 0

 if (search.value) count++
 if (selectedActiveStatuses.value.length) count++
 if (selectedGenders.value.length) count++
 if (selectedBalanceStatuses.value.length) count++
 if (selectedActivityStatuses.value.length) count++
 if (sortBy.value !== 'updated') count++
 if (perPage.value !== 20) count++

 return count
})

const activeCustomers = computed(() => customers.value.filter((customer) => customer.is_active).length)
const receivableCustomers = computed(() => customers.value.filter((customer) => Number(customer.current_balance || 0) > 0).length)
const creditCustomers = computed(() => customers.value.filter((customer) => Number(customer.current_balance || 0) < 0).length)

const totalReceivableOnPage = computed(() => customers.value.reduce((sum, customer) => {
 const balance = Number(customer.current_balance || 0)
 return sum + (balance > 0 ? balance : 0)
}, 0))

const totalCreditOnPage = computed(() => customers.value.reduce((sum, customer) => {
 const balance = Number(customer.current_balance || 0)
 return sum + (balance < 0 ? Math.abs(balance) : 0)
}, 0))

const totalSalesOnPage = computed(() => customers.value.reduce((sum, customer) => {
 return sum + Number(customer.sale_invoices_sum_grand_total || 0)
}, 0))

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

function balanceVariant(customer: Customer): 'green' | 'amber' | 'neutral' {
 const balance = Number(customer.current_balance || 0)

 if (balance > 0) return 'amber'
 if (balance < 0) return 'green'

 return 'neutral'
}

function balanceLabel(customer: Customer) {
 const balance = Number(customer.current_balance || 0)

 if (balance > 0) return `Receivable ${money(balance)}`
 if (balance < 0) return `Credit ${money(Math.abs(balance))}`

 return 'Settled'
}

function contactLine(customer: Customer) {
 return [customer.phone, customer.email, customer.secondary_phone ? `Alt ${customer.secondary_phone}` : null]
 .filter(Boolean)
 .join(' · ') || 'No contact details'
}

function locationLine(customer: Customer) {
 return [customer.city, customer.country]
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

function setQuickView(view: 'all' | 'active' | 'inactive' | 'receivable' | 'credit' | 'settled' | 'no_sales') {
 selectedActiveStatuses.value = []
 selectedBalanceStatuses.value = []
 selectedActivityStatuses.value = []

 if (view === 'all') return
 if (view === 'active') selectedActiveStatuses.value = ['active']
 if (view === 'inactive') selectedActiveStatuses.value = ['inactive']
 if (view === 'receivable') selectedBalanceStatuses.value = ['receivable']
 if (view === 'credit') selectedBalanceStatuses.value = ['credit']
 if (view === 'settled') selectedBalanceStatuses.value = ['settled']
 if (view === 'no_sales') selectedActivityStatuses.value = ['no_sales']
}

function quickViewIsActive(view: 'all' | 'active' | 'inactive' | 'receivable' | 'credit' | 'settled' | 'no_sales') {
 if (view === 'all') {
 return selectedActiveStatuses.value.length === 0
 && selectedBalanceStatuses.value.length === 0
 && selectedActivityStatuses.value.length === 0
 }

 if (view === 'active') return selectedActiveStatuses.value.length === 1 && selectedActiveStatuses.value.includes('active')
 if (view === 'inactive') return selectedActiveStatuses.value.length === 1 && selectedActiveStatuses.value.includes('inactive')
 if (view === 'receivable') return selectedBalanceStatuses.value.length === 1 && selectedBalanceStatuses.value.includes('receivable')
 if (view === 'credit') return selectedBalanceStatuses.value.length === 1 && selectedBalanceStatuses.value.includes('credit')
 if (view === 'settled') return selectedBalanceStatuses.value.length === 1 && selectedBalanceStatuses.value.includes('settled')
 if (view === 'no_sales') return selectedActivityStatuses.value.length === 1 && selectedActivityStatuses.value.includes('no_sales')

 return false
}

async function fetchCustomer(customerId: number) {
 const response = await $api<CustomerResponse>(`/admin/customers/${customerId}`)

 return response.data
}

function openCreate() {
 selectedCustomer.value = null
 formMode.value = 'create'
 formOpen.value = true
}

async function openEdit(customer: Customer) {
 editingCustomerId.value = customer.id
 selectedCustomer.value = customer
 formMode.value = 'edit'

 try {
 selectedCustomer.value = await fetchCustomer(customer.id)
 formOpen.value = true
 } catch (error: any) {
 showNotice(extractApiErrorMessage(error, 'Could not load customer details.'))
 } finally {
 editingCustomerId.value = null
 }
}

async function refreshSelectedCustomer() {
 if (!selectedCustomer.value) return

 try {
 selectedCustomer.value = await fetchCustomer(selectedCustomer.value.id)
 await refresh()
 } catch (error: any) {
 showNotice(extractApiErrorMessage(error, 'Could not refresh customer details.'))
 }
}

async function afterSaved(customer: Customer, message?: string) {
 formOpen.value = false
 selectedCustomer.value = customer
 showNotice(message || 'Customer saved successfully.')
 await refresh()
}

function askDelete(customer: Customer) {
 customerToDelete.value = customer
 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDelete() {
 if (!customerToDelete.value) return

 deleting.value = true
 deleteError.value = ''

 try {
 await $api(`/admin/customers/${customerToDelete.value.id}`, {
 method: 'DELETE',
 })

 deleteOpen.value = false
 showNotice('Customer deleted successfully.')
 await refresh()
 } catch (error: any) {
 deleteError.value = extractApiErrorMessage(error, 'Could not delete customer.')
 } finally {
 deleting.value = false
 }
}

function clearFilters() {
 search.value = ''
 debouncedSearch.value = ''
 selectedActiveStatuses.value = []
 selectedGenders.value = []
 selectedBalanceStatuses.value = []
 selectedActivityStatuses.value = []
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
 <CustomersSkeleton v-if="isInitialLoading" />

 <div
 v-else
 class="relative space-y-4 sm:space-y-5"
 >
 <div
 v-if="isRefreshing"
 class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-[#f4f5f7]/40 backdrop-blur-[1px] dark:bg-[#09090b]/30"
 />

 <AppPageHeader
 eyebrow="CRM"
 title="Customers"
 description="Manage customer profiles, contact details, balances and activity before sales invoices and customer payments."
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
 Add customer
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
 Customers
 </p>

 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ meta?.total ?? customers.length }}
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
 {{ activeCustomers }}
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Available for sales
 </p>
 </AppCard>

 <AppCard class="p-4">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Receivable on page
 </p>

 <p class="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
 {{ money(totalReceivableOnPage) }}
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ receivableCustomers }} customers with balance
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
 Credit {{ money(totalCreditOnPage) }}
 </p>
 </AppCard>
 </div>

 <AppCard class="overflow-visible">
 <div class="shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 ">
 <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
 <AppInput
 v-model="search"
 placeholder="Search name, code, phone, email, city, address or notes..."
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
 :class="quickViewIsActive('receivable') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('receivable')"
 >
 Receivable
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
 :class="quickViewIsActive('no_sales') ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-950/[0.04] text-gray-500 hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200'"
 @click="setQuickView('no_sales')"
 >
 No sales
 </button>
 </div>
 </div>

 <div
 v-if="filtersOpen"
 class="grid gap-3 shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 sm:grid-cols-2 xl:grid-cols-5"
 >
 <AppMultiSelect
 v-model="selectedActiveStatuses"
 label="Status"
 placeholder="All statuses"
 :options="activeStatusOptions"
 :searchable="false"
 />

 <AppMultiSelect
 v-model="selectedBalanceStatuses"
 label="Balance"
 placeholder="All balances"
 :options="balanceStatusOptions"
 :searchable="false"
 />

 <AppMultiSelect
 v-model="selectedActivityStatuses"
 label="Activity"
 placeholder="All activity"
 :options="activityStatusOptions"
 :searchable="false"
 />

 <AppMultiSelect
 v-model="selectedGenders"
 label="Gender"
 placeholder="All genders"
 :options="genderOptions"
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
 </div>

 <div class="flex flex-wrap items-center gap-2 p-4">
 <AppBadge variant="neutral">
 {{ customers.length }} shown
 </AppBadge>

 <AppBadge variant="neutral">
 {{ meta?.total ?? 0 }} total
 </AppBadge>

 <AppBadge variant="green">
 {{ activeCustomers }} active on page
 </AppBadge>

 <AppBadge
 v-if="receivableCustomers"
 variant="amber"
 >
 {{ receivableCustomers }} receivable
 </AppBadge>

 <AppBadge
 v-if="creditCustomers"
 variant="green"
 >
 {{ creditCustomers }} credit
 </AppBadge>
 </div>
 </AppCard>

 <AppErrorState
 v-if="error"
 title="Customers could not be loaded"
 message="Please check backend API, authentication token, customer routes, or database fields."
 @retry="refresh"
 />

 <AppEmptyState
 v-else-if="customers.length === 0"
 title="No customers found"
 message="Create your first customer or clear filters."
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
 Add customer
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
 Customer
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
 v-for="customer in customers"
 :key="customer.id"
 class="transition hover:bg-gray-950/[0.018] dark:hover:bg-white/[0.025]"
 >
 <td class="min-w-0 px-4 py-3">
 <button
 type="button"
 class="block max-w-full truncate text-left text-sm font-semibold text-gray-950 transition hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
 @click="openEdit(customer)"
 >
 {{ customer.name }}
 </button>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ customer.code }}
 <span v-if="customer.gender">
 · {{ customer.gender }}
 </span>
 </p>

 <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
 {{ locationLine(customer) }}
 </p>
 </td>

 <td class="min-w-0 px-4 py-3">
 <p class="max-w-full truncate text-sm font-medium text-gray-800 dark:text-gray-200">
 {{ customer.phone || 'No phone' }}
 </p>

 <p class="mt-1 max-w-full truncate text-xs text-gray-500 dark:text-gray-400">
 {{ contactLine(customer) }}
 </p>
 </td>

 <td class="px-4 py-3">
 <div class="flex flex-wrap gap-2">
 <AppBadge :variant="customer.is_active ? 'green' : 'red'">
 {{ customer.is_active ? 'Active' : 'Inactive' }}
 </AppBadge>

 <AppBadge
 v-if="customer.email"
 variant="blue"
 >
 Email
 </AppBadge>
 </div>
 </td>

 <td class="px-4 py-3 text-right">
 <AppBadge :variant="balanceVariant(customer)">
 {{ balanceLabel(customer) }}
 </AppBadge>

 <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
 Opening {{ money(customer.opening_balance) }}
 </p>
 </td>

 <td class="min-w-0 px-4 py-3">
 <p class="text-sm font-semibold text-gray-900 dark:text-white">
 {{ customer.sale_invoices_count ?? 0 }} sales
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ customer.payments_count ?? 0 }} payments · Last {{ dateLabel(customer.last_sale_date) }}
 </p>
 </td>

 <td class="px-4 py-3 text-right">
 <div class="flex items-center justify-end gap-2">
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="editingCustomerId === customer.id"
 @click="openEdit(customer)"
 >
 Edit
 </AppButton>

 <AppButton
 type="button"
 variant="danger"
 size="sm"
 @click="askDelete(customer)"
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
 v-for="customer in customers"
 :key="customer.id"
 class="overflow-hidden p-4"
 >
 <div class="flex items-start justify-between gap-3">
 <button
 type="button"
 class="min-w-0 text-left"
 @click="openEdit(customer)"
 >
 <h2 class="truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ customer.name }}
 </h2>

 <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
 {{ customer.code }} · {{ locationLine(customer) }}
 </p>
 </button>

 <AppBadge :variant="customer.is_active ? 'green' : 'red'">
 {{ customer.is_active ? 'Active' : 'Inactive' }}
 </AppBadge>
 </div>

 <div class="mt-3 flex flex-wrap gap-2">
 <AppBadge :variant="balanceVariant(customer)">
 {{ balanceLabel(customer) }}
 </AppBadge>

 <AppBadge variant="neutral">
 {{ customer.sale_invoices_count ?? 0 }} sales
 </AppBadge>

 <AppBadge variant="neutral">
 {{ customer.payments_count ?? 0 }} payments
 </AppBadge>
 </div>

 <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
 {{ contactLine(customer) }}
 </p>

 <div class="mt-4 grid grid-cols-2 gap-2">
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :loading="editingCustomerId === customer.id"
 @click="openEdit(customer)"
 >
 Edit
 </AppButton>

 <AppButton
 type="button"
 variant="danger"
 size="sm"
 @click="askDelete(customer)"
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
 customers
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

 <CustomerFormModal
 :open="formOpen"
 :mode="formMode"
 :customer="selectedCustomer"
 @close="formOpen = false"
 @saved="afterSaved"
 @addresses-changed="refreshSelectedCustomer"
 />

 <AppConfirmModal
 :open="deleteOpen"
 title="Delete customer?"
 :message="`This will delete “${customerToDelete?.name || 'this customer'}”. Customers with balance, sales, returns or payments cannot be deleted; set them inactive instead.`"
 confirm-label="Delete customer"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="confirmDelete"
 />
 </section>
</template>