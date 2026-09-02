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
 contact_person?: string | null
 phone?: string | null
 email?: string | null
 city?: string | null
 country?: string | null
 opening_balance?: string | number
 current_balance: string | number
 is_active: boolean
}

type StatementVendor = {
 id: number
 code: string
 name: string
 company_name: string | null
 contact_person: string | null
 phone: string | null
 email: string | null
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

type VendorIndexResponse = {
 data: Vendor[]
}

type VendorStatementResponse = {
 period: StatementPeriod
 vendor: StatementVendor
 summary: StatementSummary
 data: StatementEntry[]
}

const { $api } = useNuxtApp()
const { formatDate: formatAppDate, todayDateInput, startOfMonthInput, startOfYearInput, previousMonthRangeInput } = useAppDateTime()

const selectedVendorId = ref('')
const dateFrom = ref(startOfCurrentMonth())
const dateTo = ref(todayDate())

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const {
 data: vendorData,
 pending: vendorsPending,
 error: vendorsError,
 refresh: refreshVendors,
} = useAsyncData(
 'vendor-statement-vendors',
 () => $api<VendorIndexResponse>('/admin/vendors', {
 query: {
 per_page: 100,
 sort_by: 'name',
 },
 }),
 { immediate: true },
)

const vendors = computed(() => vendorData.value?.data ?? [])

watch(
 vendors,
 (items) => {
 if (selectedVendorId.value || !items.length) return

 const payableVendor = items.find((vendor) => Number(vendor.current_balance || 0) > 0)
 selectedVendorId.value = String(payableVendor?.id || items[0].id)
 },
 { immediate: true },
)

const vendorOptions = computed(() => [
 { label: 'Select vendor', value: '' },
 ...vendors.value.map((vendor) => ({
 label: `${vendor.name} (${vendor.code})`,
 value: String(vendor.id),
 hint: `Balance ${money(vendor.current_balance)}`,
 })),
])

const selectedVendor = computed(() => {
 return vendors.value.find((vendor) => String(vendor.id) === String(selectedVendorId.value)) || null
})

const {
 data: statementData,
 pending: statementPending,
 error: statementError,
 refresh: refreshStatement,
} = useAsyncData(
 'vendor-statement-report',
 async () => {
 if (!selectedVendorId.value) return null

 return await $api<VendorStatementResponse>(`/admin/reports/vendors/${selectedVendorId.value}/statement`, {
 query: {
 date_from: dateFrom.value,
 date_to: dateTo.value,
 },
 })
 },
 {
 watch: [
 selectedVendorId,
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
const statementVendor = computed(() => statement.value?.vendor)

const isInitialLoading = computed(() => {
 return (vendorsPending.value || statementPending.value) && !vendorData.value
})

const isRefreshing = computed(() => {
 return (vendorsPending.value || statementPending.value) && Boolean(vendorData.value)
})

const hasError = computed(() => vendorsError.value || statementError.value)

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
 if (type === 'purchase_invoice') return 'amber'
 if (type === 'vendor_payment') return 'green'
 if (type === 'purchase_return') return 'red'
 if (type === 'purchase_paid_at_invoice') return 'blue'

 return 'neutral'
}

function entryTypeLabel(type: string) {
 const labels: Record<string, string> = {
 purchase_invoice: 'Purchase',
 purchase_paid_at_invoice: 'Direct paid',
 vendor_payment: 'Payment',
 purchase_return: 'Return',
 }

 return labels[type] || type.replaceAll('_', ' ')
}

function balanceDiff() {
 if (!summary.value) return 0

 return Number(summary.value.closing_balance || 0) - Number(summary.value.current_balance || 0)
}

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) clearTimeout(noticeTimer.value)

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

async function refreshAll() {
 await Promise.all([
 refreshVendors(),
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
 <VendorStatementsSkeleton v-if="isInitialLoading" />

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
 title="Vendor statement"
 description="View supplier ledger with opening balance, purchases, direct paid amounts, payments, returns and running balance."
 >
 <template #actions>
 <AppButton
 variant="secondary"
 :loading="vendorsPending || statementPending"
 @click="refreshAll"
 >
 {{ vendorsPending || statementPending ? 'Refreshing...' : 'Refresh' }}
 </AppButton>

 <AppButton
 variant="secondary"
 @click="printStatement"
 >
 Print
 </AppButton>
 </template>
 </AppPageHeader>

 <div
 v-if="notice"
 class="rounded-[12px] bg-emerald-500/[0.07] p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 print:hidden"
 >
 {{ notice }}
 </div>

 <AppCard class="overflow-visible p-4 print:hidden">
 <div class="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_170px_170px_auto] lg:items-end">
 <AppSelect
 v-model="selectedVendorId"
 label="Vendor"
 :options="vendorOptions"
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
 :disabled="!selectedVendorId"
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
 title="Vendor statement could not be loaded"
 message="Please check backend API, authentication token, or report permissions."
 @retry="refreshAll"
 />

 <AppEmptyState
 v-else-if="!selectedVendorId"
 title="Select a vendor"
 message="Choose a vendor to view supplier statement."
 />

 <template v-else>
 <AppCard class="overflow-visible">
 <div class="shadow-[0_1px_0_rgba(17,24,39,0.05)] p-5 ">
 <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
 <div>
 <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">
 Supplier statement
 </p>

 <h2 class="mt-2 text-xl font-semibold text-gray-950 dark:text-white">
 {{ statementVendor?.name || selectedVendor?.name }}
 </h2>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ statementVendor?.code || selectedVendor?.code }}
 <span v-if="statementVendor?.company_name || selectedVendor?.company_name">
 · {{ statementVendor?.company_name || selectedVendor?.company_name }}
 </span>
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ statementVendor?.phone || selectedVendor?.phone || 'No phone' }}
 <span v-if="statementVendor?.email || selectedVendor?.email">
 · {{ statementVendor?.email || selectedVendor?.email }}
 </span>
 </p>
 </div>

 <div class="rounded-[12px] bg-gray-950/[0.035] p-4 text-[12px] dark:bg-white/[0.055]">
 <p class="font-semibold text-gray-950 dark:text-white">
 {{ dateLabel(period?.date_from || dateFrom) }} — {{ dateLabel(period?.date_to || dateTo) }}
 </p>

 <p class="mt-1 text-gray-500 dark:text-gray-400">
 Current vendor balance: {{ money(summary?.current_balance ?? statementVendor?.current_balance) }}
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
 Purchases / increases
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
 message="No purchases, returns or paid vendor payments found for this date range."
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
