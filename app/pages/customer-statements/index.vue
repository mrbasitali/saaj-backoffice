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
 secondary_phone?: string | null
 city?: string | null
 country?: string | null
 opening_balance?: string | number
 current_balance: string | number
 is_active: boolean
}

type StatementCustomer = {
 id: number
 code: string
 name: string
 phone: string | null
 email: string | null
 secondary_phone: string | null
 city: string | null
 country: string | null
 opening_balance: string | number
 current_balance: string | number
}

type StatementPeriod = {
 date_from: string
 date_to: string
}

type StatementSummary = {
 opening_balance: number
 total_increase: number
 total_decrease: number
 closing_balance: number
 current_balance: number
}

type StatementEntry = {
 source_id: number
 sort_order: number
 date: string
 type: string
 reference: string
 description: string
 increase: number
 decrease: number
 running_balance: number
 meta?: Record<string, any>
}

type CustomerIndexResponse = {
 data: Customer[]
}

type CustomerStatementResponse = {
 period: StatementPeriod
 customer: StatementCustomer
 summary: StatementSummary
 data: StatementEntry[]
}

const { $api } = useNuxtApp()
const { formatDate: formatAppDate, todayDateInput, startOfMonthInput, startOfYearInput, previousMonthRangeInput } = useAppDateTime()

const selectedCustomerId = ref('')
const dateFrom = ref(startOfCurrentMonth())
const dateTo = ref(todayDate())

const {
 data: customerData,
 pending: customersPending,
 error: customersError,
 refresh: refreshCustomers,
} = useAsyncData(
 'customer-statement-customers',
 () => $api<CustomerIndexResponse>('/admin/customers', {
 query: {
 per_page: 100,
 sort_by: 'name',
 },
 }),
 { immediate: true },
)

const customers = computed(() => customerData.value?.data ?? [])

watch(
 customers,
 (items) => {
 if (selectedCustomerId.value || !items.length) return

 const receivableCustomer = items.find((customer) => Number(customer.current_balance || 0) > 0)
 selectedCustomerId.value = String(receivableCustomer?.id || items[0].id)
 },
 { immediate: true },
)

const customerOptions = computed(() => [
 { label: 'Select customer', value: '' },
 ...customers.value.map((customer) => ({
 label: `${customer.name} (${customer.code})`,
 value: String(customer.id),
 hint: [
 customer.phone,
 `Balance ${money(customer.current_balance)}`,
 ].filter(Boolean).join(' · '),
 })),
])

const selectedCustomer = computed(() => {
 return customers.value.find((customer) => String(customer.id) === String(selectedCustomerId.value)) || null
})

const {
 data: statementData,
 pending: statementPending,
 error: statementError,
 refresh: refreshStatement,
} = useAsyncData(
 'customer-statement-report',
 async () => {
 if (!selectedCustomerId.value) return null

 return await $api<CustomerStatementResponse>(`/admin/reports/customers/${selectedCustomerId.value}/statement`, {
 query: {
 date_from: dateFrom.value,
 date_to: dateTo.value,
 },
 })
 },
 {
 watch: [
 selectedCustomerId,
 dateFrom,
 dateTo,
 ],
 immediate: true,
 },
)

const statement = computed(() => statementData.value)
const entries = computed(() => statement.value?.data ?? [])
const summary = computed(() => statement.value?.summary)
const period = computed(() => statement.value?.period)
const statementCustomer = computed(() => statement.value?.customer)

const isInitialLoading = computed(() => {
 return (customersPending.value || statementPending.value) && !customerData.value
})

const isRefreshing = computed(() => {
 return (customersPending.value || statementPending.value) && Boolean(customerData.value)
})

const hasError = computed(() => customersError.value || statementError.value)

const increaseEntries = computed(() => entries.value.filter((entry) => Number(entry.increase || 0) > 0).length)
const decreaseEntries = computed(() => entries.value.filter((entry) => Number(entry.decrease || 0) > 0).length)

function todayDate() {
 return todayDateInput()
}

function startOfCurrentMonth() {
 return startOfMonthInput()
}

function startOfYear() {
 return startOfYearInput()
}

function previousMonthRange() {
 return previousMonthRangeInput()
}

function setRange(range: 'this_month' | 'last_month' | 'year_to_date' | 'today') {
 if (range === 'this_month') {
 dateFrom.value = startOfCurrentMonth()
 dateTo.value = todayDate()
 }

 if (range === 'last_month') {
 const previous = previousMonthRange()
 dateFrom.value = previous.from
 dateTo.value = previous.to
 }

 if (range === 'year_to_date') {
 dateFrom.value = startOfYear()
 dateTo.value = todayDate()
 }

 if (range === 'today') {
 dateFrom.value = todayDate()
 dateTo.value = todayDate()
 }
}

function money(value: string | number | null | undefined) {
 return Number(value || 0).toLocaleString('en', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })
}

function dateLabel(value: string | null | undefined) {
 return formatAppDate(value)
}

function entryVariant(type: string): 'neutral' | 'green' | 'red' | 'amber' | 'blue' {
 if (type === 'sale_invoice') return 'amber'
 if (type === 'customer_payment') return 'green'
 if (type === 'sale_return') return 'red'
 if (type === 'sale_paid_at_invoice') return 'blue'

 return 'neutral'
}

function entryTypeLabel(type: string) {
 const labels: Record<string, string> = {
 sale_invoice: 'Sale',
 sale_paid_at_invoice: 'Direct paid',
 customer_payment: 'Payment',
 sale_return: 'Return',
 }

 return labels[type] || type.replaceAll('_', ' ')
}

function balanceDiff() {
 if (!summary.value) return 0

 return Number(summary.value.closing_balance || 0) - Number(summary.value.current_balance || 0)
}

async function refreshAll() {
 await Promise.all([
 refreshCustomers(),
 refreshStatement(),
 ])
}

function printStatement() {
 if (!import.meta.client) return

 window.print()
}
</script>

<template>
 <section class="mx-auto max-w-[1600px]">
 <CustomerStatementsSkeleton v-if="isInitialLoading" />

 <div
 v-else
 class="relative space-y-4 sm:space-y-5"
 >
 <div
 v-if="isRefreshing"
 class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-[#f4f5f7]/40 backdrop-blur-[1px] dark:bg-[#09090b]/30 print:hidden"
 />

 <AppPageHeader
 eyebrow="Reports"
 title="Customer statement"
 description="View customer ledger with opening balance, sales, direct paid amounts, payments, returns and running receivable balance."
 >
 <template #actions>
 <AppButton
 variant="secondary"
 :loading="customersPending || statementPending"
 @click="refreshAll"
 >
 {{ customersPending || statementPending ? 'Refreshing...' : 'Refresh' }}
 </AppButton>

 <AppButton
 variant="secondary"
 @click="printStatement"
 >
 Print
 </AppButton>
 </template>
 </AppPageHeader>

 <AppCard class="overflow-visible p-4 print:hidden">
 <div class="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_170px_170px_auto] lg:items-end">
 <AppSelect
 v-model="selectedCustomerId"
 label="Customer"
 :options="customerOptions"
 searchable
 />

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

 <AppButton
 type="button"
 class="w-full lg:w-auto"
 :disabled="!selectedCustomerId"
 :loading="statementPending"
 @click="refreshStatement"
 >
 Apply
 </AppButton>
 </div>

 <div class="mt-4 flex flex-wrap gap-2">
 <button
 type="button"
 class="rounded-[8px] bg-gray-950/[0.04] px-3 py-2 text-[12px] font-medium text-gray-500 transition hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200"
 @click="setRange('today')"
 >
 Today
 </button>

 <button
 type="button"
 class="rounded-[8px] bg-gray-950/[0.04] px-3 py-2 text-[12px] font-medium text-gray-500 transition hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200"
 @click="setRange('this_month')"
 >
 This month
 </button>

 <button
 type="button"
 class="rounded-[8px] bg-gray-950/[0.04] px-3 py-2 text-[12px] font-medium text-gray-500 transition hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200"
 @click="setRange('last_month')"
 >
 Last month
 </button>

 <button
 type="button"
 class="rounded-[8px] bg-gray-950/[0.04] px-3 py-2 text-[12px] font-medium text-gray-500 transition hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200"
 @click="setRange('year_to_date')"
 >
 Year to date
 </button>
 </div>
 </AppCard>

 <AppErrorState
 v-if="hasError"
 title="Customer statement could not be loaded"
 message="Please check backend API, authentication token, or report permissions."
 @retry="refreshAll"
 />

 <AppEmptyState
 v-else-if="!selectedCustomerId"
 title="Select a customer"
 message="Choose a customer to view receivable statement."
 />

 <template v-else>
 <AppCard class="overflow-visible">
 <div class="shadow-[0_1px_0_rgba(17,24,39,0.05)] p-5 ">
 <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
 <div>
 <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">
 Customer statement
 </p>

 <h2 class="mt-2 text-xl font-semibold text-gray-950 dark:text-white">
 {{ statementCustomer?.name || selectedCustomer?.name }}
 </h2>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ statementCustomer?.code || selectedCustomer?.code }}
 <span v-if="statementCustomer?.phone || selectedCustomer?.phone">
 · {{ statementCustomer?.phone || selectedCustomer?.phone }}
 </span>
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ statementCustomer?.email || selectedCustomer?.email || 'No email' }}
 <span v-if="statementCustomer?.city || selectedCustomer?.city">
 · {{ statementCustomer?.city || selectedCustomer?.city }}
 </span>
 </p>
 </div>

 <div class="rounded-[12px] bg-gray-950/[0.035] p-4 text-[12px] dark:bg-white/[0.055]">
 <p class="font-semibold text-gray-950 dark:text-white">
 {{ dateLabel(period?.date_from || dateFrom) }} — {{ dateLabel(period?.date_to || dateTo) }}
 </p>

 <p class="mt-1 text-gray-500 dark:text-gray-400">
 Current customer balance: {{ money(summary?.current_balance ?? statementCustomer?.current_balance) }}
 </p>
 </div>
 </div>
 </div>

 <div class="grid gap-4 p-5 md:grid-cols-4">
 <div class="rounded-[14px] bg-gray-950/[0.025] p-4 ">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Opening balance
 </p>

 <p class="mt-3 text-2xl font-semibold text-gray-950 dark:text-white">
 {{ money(summary?.opening_balance) }}
 </p>
 </div>

 <div class="rounded-[14px] bg-gray-950/[0.025] p-4 ">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Sales / increases
 </p>

 <p class="mt-3 text-2xl font-semibold text-gray-950 dark:text-white">
 {{ money(summary?.total_increase) }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ increaseEntries }} entries
 </p>
 </div>

 <div class="rounded-[14px] bg-gray-950/[0.025] p-4 ">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Payments / returns
 </p>

 <p class="mt-3 text-2xl font-semibold text-gray-950 dark:text-white">
 {{ money(summary?.total_decrease) }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ decreaseEntries }} entries
 </p>
 </div>

 <div class="rounded-[14px] bg-gray-950/[0.025] p-4 ">
 <p class="text-[12px] font-medium text-gray-500 dark:text-gray-500">
 Closing balance
 </p>

 <p class="mt-3 text-2xl font-semibold text-gray-950 dark:text-white">
 {{ money(summary?.closing_balance) }}
 </p>

 <p
 v-if="Math.abs(balanceDiff()) > 0.01"
 class="mt-1 text-xs text-amber-600 dark:text-amber-300"
 >
 Diff from current balance: {{ money(balanceDiff()) }}
 </p>
 </div>
 </div>
 </AppCard>

 <AppEmptyState
 v-if="entries.length === 0"
 title="No statement entries"
 message="No sales, returns or received customer payments found for this date range."
 />

 <template v-else>
 <AppCard class="hidden overflow-hidden xl:block">
 <div class="overflow-hidden">
 <table class="w-full table-fixed divide-y divide-gray-100 dark:divide-white/[0.055]">
 <thead class="bg-gray-950/[0.018] dark:bg-white/[0.025]">
 <tr>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Date
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Details
 </th>
 <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Type
 </th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Increase
 </th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Decrease
 </th>
 <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 Running balance
 </th>
 </tr>
 </thead>

 <tbody class="divide-y divide-gray-100 bg-white dark:divide-white/[0.055] dark:bg-[#111214]">
 <tr
 v-for="entry in entries"
 :key="`${entry.type}-${entry.source_id}-${entry.sort_order}`"
 class="transition hover:bg-gray-950/[0.018] dark:hover:bg-white/[0.025]"
 >
 <td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
 {{ dateLabel(entry.date) }}
 </td>

 <td class="min-w-0 px-4 py-3">
 <p class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 {{ entry.reference }}
 </p>

 <p class="mt-1 max-w-[520px] truncate text-xs text-gray-500 dark:text-gray-400">
 {{ entry.description }}
 </p>
 </td>

 <td class="px-4 py-3">
 <AppBadge :variant="entryVariant(entry.type)">
 {{ entryTypeLabel(entry.type) }}
 </AppBadge>
 </td>

 <td class="px-4 py-3 text-right text-sm font-semibold text-amber-600 dark:text-amber-300">
 {{ Number(entry.increase || 0) > 0 ? money(entry.increase) : '—' }}
 </td>

 <td class="px-4 py-3 text-right text-sm font-semibold text-emerald-600 dark:text-emerald-300">
 {{ Number(entry.decrease || 0) > 0 ? money(entry.decrease) : '—' }}
 </td>

 <td class="px-4 py-3 text-right text-sm font-semibold text-gray-950 dark:text-white">
 {{ money(entry.running_balance) }}
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </AppCard>

 <div class="grid gap-3 xl:hidden">
 <AppCard
 v-for="entry in entries"
 :key="`${entry.type}-${entry.source_id}-${entry.sort_order}`"
 class="p-4"
 >
 <div class="flex items-start justify-between gap-3">
 <div class="min-w-0">
 <AppBadge :variant="entryVariant(entry.type)">
 {{ entryTypeLabel(entry.type) }}
 </AppBadge>

 <h3 class="mt-3 truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ entry.reference }}
 </h3>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ dateLabel(entry.date) }}
 </p>
 </div>

 <p class="shrink-0 text-sm font-semibold text-gray-950 dark:text-white">
 {{ money(entry.running_balance) }}
 </p>
 </div>

 <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
 {{ entry.description }}
 </p>

 <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
 <p>
 <span class="block font-semibold text-amber-600 dark:text-amber-300">
 {{ Number(entry.increase || 0) > 0 ? money(entry.increase) : '—' }}
 </span>
 Increase
 </p>

 <p>
 <span class="block font-semibold text-emerald-600 dark:text-emerald-300">
 {{ Number(entry.decrease || 0) > 0 ? money(entry.decrease) : '—' }}
 </span>
 Decrease
 </p>
 </div>
 </AppCard>
 </div>
 </template>
 </template>
 </div>
 </section>
</template>
