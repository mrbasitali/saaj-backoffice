<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

type ProfitReportRow = {
  id: number
  invoice_number: string
  sale_date: string
  customer_name: string
  location_name: string | null
  channel: string
  net_sales: string | number
  net_cogs: string | number
  gross_profit: string | number
  margin_percent: string | number
}

type ExpenseCategoryTotal = {
  category_id: number
  category_name: string
  total: number
}

type ProfitReportSummary = {
  gross_sales: string | number
  sales_returns: string | number
  net_sales: string | number
  net_cogs: string | number
  gross_profit: string | number
  margin_percent: string | number
  total_expenses: string | number
  expenses_by_category: ExpenseCategoryTotal[]
  net_profit: string | number
  net_margin_percent: string | number
}

type PaginationMeta = {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

type ProfitReportResponse = {
  period: { date_from: string, date_to: string }
  summary: ProfitReportSummary
  data: ProfitReportRow[]
  meta: PaginationMeta
}

const { $api } = useNuxtApp()
const { todayDateInput, startOfMonthInput, startOfYearInput } = useAppDateTime()

const periodPreset = ref('month')
const dateFrom = ref(startOfMonthInput())
const dateTo = ref(todayDateInput())
const sortBy = ref('latest')
const perPage = ref(20)
const page = ref(1)
const exportingPdf = ref(false)
const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const periodOptions = [
  { label: 'This month', value: 'month' },
  { label: 'This year', value: 'year' },
  { label: 'Custom range', value: 'custom' },
]

const sortOptions = [
  { label: 'Latest first', value: 'latest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Amount: high to low', value: 'amount_high' },
  { label: 'Amount: low to high', value: 'amount_low' },
]

function applyPreset(preset: string) {
  if (preset === 'month') {
    dateFrom.value = startOfMonthInput()
    dateTo.value = todayDateInput()
  } else if (preset === 'year') {
    dateFrom.value = startOfYearInput()
    dateTo.value = todayDateInput()
  }
}

watch(periodPreset, (value) => {
  if (value !== 'custom') applyPreset(value)
  page.value = 1
})

watch([dateFrom, dateTo, sortBy, perPage], () => {
  page.value = 1
})

function buildQuery() {
  return {
    date_from: dateFrom.value,
    date_to: dateTo.value,
    page: page.value,
    per_page: perPage.value,
    sort_by: sortBy.value,
  }
}

const {
  data,
  pending,
  error,
  refresh,
} = useAsyncData(
  'profit-report',
  () => $api<ProfitReportResponse>('/admin/reports/profit', { query: buildQuery() }),
  {
    watch: [dateFrom, dateTo, sortBy, perPage, page],
    immediate: true,
  },
)

const rows = computed(() => data.value?.data ?? [])
const summary = computed(() => data.value?.summary)
const meta = computed(() => data.value?.meta)

const isRefreshing = computed(() => pending.value && Boolean(data.value))

const canGoPrevious = computed(() => page.value > 1)
const canGoNext = computed(() => meta.value ? page.value < meta.value.last_page : false)

const maxCategoryTotal = computed(() => {
  return Math.max(1, ...(summary.value?.expenses_by_category.map((row) => Number(row.total)) ?? [0]))
})

function money(value: string | number | null | undefined) {
  return Number(value || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function label(value: string | null | undefined) {
  return String(value || '-').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function showNotice(message: string) {
  notice.value = message

  if (noticeTimer.value) clearTimeout(noticeTimer.value)

  noticeTimer.value = setTimeout(() => { notice.value = '' }, 3000)
}

async function exportPdf() {
  if (!import.meta.client) return

  exportingPdf.value = true

  try {
    const blob = await $api<Blob>('/admin/reports/profit/pdf', {
      query: buildQuery(),
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
    showNotice(error?.data?.message || 'Could not generate the profit and loss PDF.')
  } finally {
    exportingPdf.value = false
  }
}

function previousPage() {
  if (canGoPrevious.value) page.value--
}

function nextPage() {
  if (canGoNext.value) page.value++
}
</script>

<template>
  <section class="mx-auto max-w-[1600px]">
    <div class="relative space-y-4 sm:space-y-5">
      <div
        v-if="isRefreshing"
        class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-[#f4f5f7]/40 backdrop-blur-[1px] dark:bg-[#09090b]/30"
      />

      <AppPageHeader
        eyebrow="Reports"
        title="Profit &amp; Loss"
        description="Net sales, cost of goods, expenses and what's actually left over — real net profit, not just margin on goods sold."
      >
        <template #actions>
          <AppButton
            variant="secondary"
            :loading="pending"
            @click="refresh"
          >
            {{ pending ? 'Refreshing...' : 'Refresh' }}
          </AppButton>

          <AppButton
            variant="secondary"
            :loading="exportingPdf"
            @click="exportPdf"
          >
            Export PDF
          </AppButton>
        </template>
      </AppPageHeader>

      <div
        v-if="notice"
        class="rounded-[12px] bg-gray-950/[0.04] p-4 text-sm font-medium text-gray-800 dark:bg-white/[0.06] dark:text-gray-100"
      >
        {{ notice }}
      </div>

      <AppCard class="p-4">
        <div class="grid gap-4">
          <div class="grid gap-3 sm:grid-cols-3">
            <AppSelect
              v-model="periodPreset"
              label="Period"
              :options="periodOptions"
            />

            <AppInput
              v-model="dateFrom"
              type="date"
              label="From"
              @update:model-value="periodPreset = 'custom'"
            />

            <AppInput
              v-model="dateTo"
              type="date"
              label="To"
              @update:model-value="periodPreset = 'custom'"
            />
          </div>

          <AppSelect
            v-model="sortBy"
            label="Sort"
            :options="sortOptions"
            class="sm:w-[220px]"
          />
        </div>
      </AppCard>

      <template v-if="summary">
        <div class="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <AppStatCard
            label="Net sales"
            :value="money(summary.net_sales)"
            :helper="`Returns: ${money(summary.sales_returns)}`"
          />
          <AppStatCard
            label="Net COGS"
            :value="money(summary.net_cogs)"
          />
          <AppStatCard
            label="Gross profit"
            :value="money(summary.gross_profit)"
            :helper="`${summary.margin_percent}% margin`"
          />
          <AppStatCard
            label="Total expenses"
            :value="money(summary.total_expenses)"
          />
          <AppStatCard
            label="Net profit"
            :value="money(summary.net_profit)"
            :helper="`${summary.net_margin_percent}% net margin`"
          />
        </div>

        <AppCard
          v-if="summary.expenses_by_category.length"
          class="p-4"
        >
          <p class="text-sm font-semibold text-gray-950 dark:text-white">
            Expenses by category
          </p>

          <div class="mt-4 space-y-3">
            <div
              v-for="row in summary.expenses_by_category"
              :key="row.category_id"
              class="grid grid-cols-[140px_1fr_90px] items-center gap-3"
            >
              <p class="truncate text-sm text-gray-600 dark:text-gray-400">{{ row.category_name }}</p>

              <div class="h-2 overflow-hidden rounded-full bg-gray-950/[0.05] dark:bg-white/[0.08]">
                <div
                  class="h-full rounded-full bg-gray-950 dark:bg-white"
                  :style="{ width: `${Math.max(4, (Number(row.total) / maxCategoryTotal) * 100)}%` }"
                />
              </div>

              <p class="text-right text-sm font-semibold text-gray-950 dark:text-white">{{ money(row.total) }}</p>
            </div>
          </div>
        </AppCard>
      </template>

      <AppErrorState
        v-if="error"
        title="Profit and loss report could not be loaded"
        message="Please check backend API, authentication token, or route permissions."
        @retry="refresh"
      />

      <AppEmptyState
        v-else-if="rows.length === 0"
        title="No sales in this period"
        message="Try a wider date range."
      />

      <template v-else>
        <AppCard class="overflow-hidden p-0">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Invoice</th>
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Customer</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Net sales</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Net COGS</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Profit</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Margin</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="row in rows"
                :key="row.id"
                class="border-b border-gray-50 last:border-0 dark:border-white/5"
              >
                <td class="px-4 py-3">
                  <p class="text-sm font-semibold text-gray-950 dark:text-white">{{ row.invoice_number }}</p>
                  <p class="mt-0.5 text-[12px] text-gray-400">{{ row.sale_date }} &middot; {{ label(row.channel) }}</p>
                </td>

                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {{ row.customer_name }}
                </td>

                <td class="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                  {{ money(row.net_sales) }}
                </td>

                <td class="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                  {{ money(row.net_cogs) }}
                </td>

                <td class="px-4 py-3 text-right text-sm font-semibold text-gray-950 dark:text-white">
                  {{ money(row.gross_profit) }}
                </td>

                <td class="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                  {{ row.margin_percent }}%
                </td>
              </tr>
            </tbody>
          </table>
        </AppCard>

        <AppCard class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-[12px] text-gray-500 dark:text-gray-500">
            Showing <span class="font-medium text-gray-900 dark:text-white">{{ meta?.from ?? 0 }}</span>
            to <span class="font-medium text-gray-900 dark:text-white">{{ meta?.to ?? 0 }}</span>
            of <span class="font-medium text-gray-900 dark:text-white">{{ meta?.total ?? 0 }}</span> invoices
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
  </section>
</template>
