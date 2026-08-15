<script setup lang="ts">
definePageMeta({
 middleware: 'auth',
 layout: 'admin',
})

const { $api } = useNuxtApp()

const selectedPeriod = ref('month')
const customDateFrom = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
const customDateTo = ref(new Date().toISOString().slice(0, 10))

const periodOptions = [
 {
 label: 'Today',
 value: 'today',
 },
 {
 label: 'This week',
 value: 'week',
 },
 {
 label: 'This month',
 value: 'month',
 },
 {
 label: 'This year',
 value: 'year',
 },
 {
 label: 'Custom range',
 value: 'custom',
 },
]

const {
 data,
 pending,
 error,
 refresh,
} = useAsyncData(
 'dashboard',
 () => {
 return $api<any>(
 '/admin/reports/dashboard',
 {
 query: selectedPeriod.value === 'custom'
 ? { date_from: customDateFrom.value, date_to: customDateTo.value }
 : { period: selectedPeriod.value },
 },
 )
 },
 {
 watch: [selectedPeriod, customDateFrom, customDateTo],
 immediate: true,
 },
)

const sales = computed(() => {
 return data.value?.sales || {}
})

const balances = computed(() => {
 return data.value?.balances || {}
})

const inventory = computed(() => {
 return data.value?.inventory || {}
})

const selectedPeriodLabel = computed(() => {
 return periodOptions.find(
 (option) =>
 option.value ===
 selectedPeriod.value,
 )?.label || 'This month'
})

const kpiCards = computed(() => [
 {
 label: 'Net sales',
 value: money(
 sales.value.net_sales,
 ),
 helper:
 'Revenue after returns and discounts',
 },

 {
 label: 'Gross profit',
 value: money(
 sales.value.gross_profit,
 ),
 helper:
 'Estimated completed-sales profit',
 },

 {
 label: 'Receivables',
 value: money(
 balances.value
 .customer_receivables,
 ),
 helper:
 'Outstanding customer balance',
 },

 {
 label: 'Payables',
 value: money(
 balances.value.vendor_payables,
 ),
 helper:
 'Outstanding vendor balance',
 },
])

const inventoryCards = computed(() => [
 {
 label: 'Stock on hand',
 value: numberFormat(
 inventory.value.total_on_hand,
 ),
 helper:
 'Physical units currently held',
 },

 {
 label: 'Available',
 value: numberFormat(
 inventory.value.total_available,
 ),
 helper:
 'Units available for sale',
 },

 {
 label: 'Stock value',
 value: money(
 inventory.value.stock_cost_value,
 ),
 helper:
 'Current inventory cost value',
 },
])

const quickActions = [
 {
 title: 'New sale',
 description:
 'Create a sale or POS invoice',
 to: '/sale-invoices',
 },

 {
 title: 'Products',
 description:
 'Manage catalog, variants and pricing',
 to: '/products',
 },

 {
 title: 'Inventory',
 description:
 'Review stock and locations',
 to: '/inventory',
 },

 {
 title: 'Purchases',
 description:
 'Create or review purchase invoices',
 to: '/purchase-invoices',
 },
]

function money(value: unknown) {
 const number =
 Number(value || 0)

 return new Intl.NumberFormat(
 'en-US',
 {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 },
 ).format(number)
}

function numberFormat(value: unknown) {
 return new Intl.NumberFormat(
 'en-US',
 ).format(
 Number(value || 0),
 )
}

const exportingPdf = ref(false)
const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) clearTimeout(noticeTimer.value)

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

async function exportPdf() {
 if (!import.meta.client) return

 exportingPdf.value = true

 try {
 const query = selectedPeriod.value === 'custom'
 ? { date_from: customDateFrom.value, date_to: customDateTo.value }
 : { period: selectedPeriod.value }

 const blob = await $api<Blob>('/admin/reports/dashboard/pdf', {
 query,
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
 showNotice(error?.data?.message || 'Could not generate the dashboard PDF.')
 } finally {
 exportingPdf.value = false
 }
}
</script>

<template>
 <section
 class="
 mx-auto
 max-w-[1600px]
 "
 >
 <DashboardSkeleton
 v-if="pending && !data"
 />

 <div
 v-else
 class="
 relative
 space-y-4

 sm:space-y-5
 "
 >
 <!-- Refresh overlay -->
 <div
 v-if="pending"
 class="
 pointer-events-none

 absolute
 inset-0
 z-10

 bg-[#f4f5f7]/35

 backdrop-blur-[1px]

 dark:bg-[#09090b]/30
 "
 />

 <!-- Dashboard context -->
 <div
 class="
 flex
 flex-col
 gap-3

 sm:flex-row
 sm:items-center
 sm:justify-between
 "
 >
 <div>
 <h2
 class="
 text-[18px]
 font-semibold
 tracking-[-0.02em]
 text-gray-950

 dark:text-white
 "
 >
 Overview
 </h2>

 <p
 class="
 mt-0.5

 text-[12px]
 text-gray-400

 dark:text-gray-500
 "
 >
 Sales, balances and inventory
 across Saaj.
 </p>
 </div>

 <div
 class="
 flex
 items-center
 gap-1.5
 "
 >
 <AppSelect
 v-model="selectedPeriod"
 :options="periodOptions"
 class="
 w-[145px]
 "
 />

 <button
 type="button"
 title="Refresh dashboard"
 aria-label="Refresh dashboard"
 class="
 flex
 h-10
 w-10
 shrink-0
 items-center
 justify-center

 rounded-[10px]

 bg-gray-950/[0.04]

 text-gray-500

 transition

 hover:bg-gray-950/[0.065]
 hover:text-gray-900

 active:scale-95

 disabled:pointer-events-none
 disabled:opacity-50

 dark:bg-white/[0.06]
 dark:text-gray-500
 dark:hover:bg-white/[0.09]
 dark:hover:text-white
 "
 :disabled="pending"
 @click="refresh"
 >
 <svg
 class="h-4 w-4"
 :class="
 pending
 ? 'animate-spin'
 : ''
 "
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M16 7A6.5 6.5 0 1 0 16.2 13"
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 />

 <path
 d="M13.5 4.5H16.5V7.5"
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </button>

 <AppButton
 type="button"
 variant="secondary"
 :loading="exportingPdf"
 @click="exportPdf"
 >
 Export PDF
 </AppButton>
 </div>
 </div>

 <div
 v-if="selectedPeriod === 'custom'"
 class="
 flex
 flex-col
 gap-3

 sm:flex-row
 sm:items-end
 "
 >
 <AppInput
 v-model="customDateFrom"
 type="date"
 label="From"
 class="sm:w-[200px]"
 />

 <AppInput
 v-model="customDateTo"
 type="date"
 label="To"
 class="sm:w-[200px]"
 />
 </div>

 <div
 v-if="notice"
 class="
 rounded-[12px]

 bg-gray-950/[0.04]

 px-4
 py-3

 text-[13px]
 font-medium
 text-gray-800

 dark:bg-white/[0.06]
 dark:text-gray-100
 "
 >
 {{ notice }}
 </div>

 <AppErrorState
 v-if="error"
 title="Dashboard could not be loaded"
 message="
 Please check backend API,
 authentication token,
 or route permissions.
 "
 @retry="refresh"
 />

 <template v-else>
 <!-- Period indicator -->
 <div
 class="
 flex
 items-center
 gap-2

 text-[12px]
 text-gray-400

 dark:text-gray-500
 "
 >
 <span
 class="
 h-1.5
 w-1.5
 rounded-full

 bg-emerald-500
 "
 />

 {{ selectedPeriodLabel }}
 performance
 </div>

 <!-- KPIs -->
 <div
 class="
 grid
 gap-3

 sm:grid-cols-2

 xl:grid-cols-4
 "
 >
 <AppStatCard
 v-for="card in kpiCards"
 :key="card.label"
 :label="card.label"
 :value="card.value"
 :helper="card.helper"
 />
 </div>

 <!-- Main row -->
 <div
 class="
 grid
 gap-3

 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]
 "
 >
 <!-- Inventory -->
 <section
 class="
 overflow-hidden

 rounded-[18px]

 bg-white

 shadow-[0_1px_2px_rgba(17,24,39,0.025)]

 dark:bg-[#111214]
 dark:shadow-none
 "
 >
 <div
 class="
 flex
 items-start
 justify-between
 gap-4

 px-4
 pb-3
 pt-4

 sm:px-5
 sm:pt-5
 "
 >
 <div>
 <h3
 class="
 text-[14px]
 font-semibold
 tracking-[-0.01em]
 text-gray-900

 dark:text-gray-100
 "
 >
 Inventory
 </h3>

 <p
 class="
 mt-1

 text-[12px]
 text-gray-400

 dark:text-gray-500
 "
 >
 Current position across
 all locations
 </p>
 </div>

 <NuxtLink
 to="/inventory"
 class="
 rounded-lg

 px-2
 py-1.5

 text-[12px]
 font-medium
 text-gray-500

 transition

 hover:bg-gray-950/[0.045]
 hover:text-gray-900

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-white
 "
 >
 View inventory
 </NuxtLink>
 </div>

 <!-- One surface, not 3 cards -->
 <div
 class="
 grid

 divide-y
 divide-gray-100

 sm:grid-cols-3
 sm:divide-x
 sm:divide-y-0

 dark:divide-white/[0.06]
 "
 >
 <div
 v-for="card in inventoryCards"
 :key="card.label"
 class="
 px-4
 py-4

 sm:px-5
 sm:py-5
 "
 >
 <p
 class="
 text-[12px]
 font-medium
 text-gray-400

 dark:text-gray-500
 "
 >
 {{ card.label }}
 </p>

 <p
 class="
 mt-2

 text-[20px]
 font-semibold
 tabular-nums
 tracking-[-0.02em]
 text-gray-950

 dark:text-white
 "
 >
 {{ card.value }}
 </p>

 <p
 class="
 mt-1.5

 text-[11px]
 leading-4
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ card.helper }}
 </p>
 </div>
 </div>
 </section>

 <!-- Quick actions -->
 <section
 class="
 overflow-hidden

 rounded-[18px]

 bg-white

 shadow-[0_1px_2px_rgba(17,24,39,0.025)]

 dark:bg-[#111214]
 dark:shadow-none
 "
 >
 <div
 class="
 px-4
 pb-2
 pt-4

 sm:px-5
 sm:pt-5
 "
 >
 <h3
 class="
 text-[14px]
 font-semibold
 tracking-[-0.01em]
 text-gray-900

 dark:text-gray-100
 "
 >
 Quick actions
 </h3>

 <p
 class="
 mt-1

 text-[12px]
 text-gray-400

 dark:text-gray-500
 "
 >
 Jump into common tasks
 </p>
 </div>

 <div
 class="
 divide-y
 divide-gray-100

 dark:divide-white/[0.06]
 "
 >
 <NuxtLink
 v-for="action in quickActions"
 :key="action.to"
 :to="action.to"
 class="
 group

 flex
 min-h-[58px]
 items-center
 justify-between
 gap-4

 px-4
 py-3

 transition

 hover:bg-gray-950/[0.025]

 active:bg-gray-950/[0.045]

 dark:hover:bg-white/[0.035]
 dark:active:bg-white/[0.055]

 sm:px-5
 "
 >
 <div class="min-w-0">
 <p
 class="
 truncate

 text-[12px]
 font-medium
 text-gray-800

 dark:text-gray-200
 "
 >
 {{ action.title }}
 </p>

 <p
 class="
 mt-0.5
 truncate

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ action.description }}
 </p>
 </div>

 <svg
 class="
 h-4
 w-4
 shrink-0

 text-gray-300

 transition
 duration-150

 group-hover:translate-x-0.5
 group-hover:text-gray-600

 dark:text-gray-700
 dark:group-hover:text-gray-300
 "
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M7 5L12 10L7 15"
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </NuxtLink>
 </div>
 </section>
 </div>
 </template>
 </div>
 </section>
</template>