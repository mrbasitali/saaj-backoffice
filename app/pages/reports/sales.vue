<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

type Customer = {
  id: number
  name: string
  code: string
  is_active: boolean
}

type InventoryLocation = {
  id: number
  name: string
  code: string
  is_active: boolean
}

type SalesReportRow = {
  id: number
  invoice_number: string
  sale_date: string
  customer_name: string
  location_name: string | null
  channel: string
  payment_status: string
  grand_total: string | number
  paid_amount: string | number
  balance_amount: string | number
  cogs: string | number
  gross_profit: string | number
}

type SalesReportSummary = {
  invoices_count: number
  subtotal: string | number
  discount_total: string | number
  tax_total: string | number
  shipping_total: string | number
  gross_sales: string | number
  paid_amount: string | number
  balance_amount: string | number
  cogs: string | number
  gross_profit: string | number
}

type PaginationMeta = {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

type SalesReportResponse = {
  period: { date_from: string, date_to: string }
  summary: SalesReportSummary
  data: SalesReportRow[]
  meta: PaginationMeta
}

type CustomerIndexResponse = { data: Customer[] }
type LocationIndexResponse = { data: InventoryLocation[] }

const { $api } = useNuxtApp()

const periodPreset = ref('month')
const dateFrom = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
const dateTo = ref(new Date().toISOString().slice(0, 10))
const customerFilter = ref('all')
const locationFilter = ref('all')
const channelFilter = ref('all')
const search = ref('')
const debouncedSearch = ref('')
const sortBy = ref('latest')
const perPage = ref(20)
const page = ref(1)
const exportingPdf = ref(false)
const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const periodOptions = [
  { label: 'This month', value: 'month' },
  { label: 'This year', value: 'year' },
  { label: 'Custom range', value: 'custom' },
]

const channelOptions = [
  { label: 'All channels', value: 'all' },
  { label: 'Manual', value: 'manual' },
  { label: 'Online', value: 'online' },
  { label: 'Marketplace', value: 'marketplace' },
]

const sortOptions = [
  { label: 'Latest first', value: 'latest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Amount: high to low', value: 'amount_high' },
  { label: 'Amount: low to high', value: 'amount_low' },
]

function applyPreset(preset: string) {
  const now = new Date()

  if (preset === 'month') {
    dateFrom.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    dateTo.value = now.toISOString().slice(0, 10)
  } else if (preset === 'year') {
    dateFrom.value = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
    dateTo.value = now.toISOString().slice(0, 10)
  }
}

watch(periodPreset, (value) => {
  if (value !== 'custom') applyPreset(value)
  page.value = 1
})

watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)

  searchTimer = setTimeout(() => {
    page.value = 1
    debouncedSearch.value = value.trim()
  }, 300)
})

watch([dateFrom, dateTo, customerFilter, locationFilter, channelFilter, sortBy, perPage], () => {
  page.value = 1
})

const {
  data: bootstrap,
} = useAsyncData(
  'sales-report-bootstrap',
  async () => {
    const [customersResponse, locationsResponse] = await Promise.all([
      $api<CustomerIndexResponse>('/admin/customers', { query: { is_active: 1, per_page: 100, sort_by: 'name' } }),
      $api<LocationIndexResponse>('/admin/inventory-locations'),
    ])

    return {
      customers: customersResponse.data ?? [],
      locations: locationsResponse.data ?? [],
    }
  },
  { immediate: true },
)

function buildQuery() {
  const query: Record<string, string | number> = {
    date_from: dateFrom.value,
    date_to: dateTo.value,
    page: page.value,
    per_page: perPage.value,
    sort_by: sortBy.value,
  }

  if (debouncedSearch.value) query.search = debouncedSearch.value
  if (customerFilter.value !== 'all') query.customer_id = customerFilter.value
  if (locationFilter.value !== 'all') query.inventory_location_id = locationFilter.value
  if (channelFilter.value !== 'all') query.channel = channelFilter.value

  return query
}

const {
  data,
  pending,
  error,
  refresh,
} = useAsyncData(
  'sales-report',
  () => $api<SalesReportResponse>('/admin/reports/sales', { query: buildQuery() }),
  {
    watch: [dateFrom, dateTo, customerFilter, locationFilter, channelFilter, debouncedSearch, sortBy, perPage, page],
    immediate: true,
  },
)

const customers = computed(() => bootstrap.value?.customers ?? [])
const locations = computed(() => bootstrap.value?.locations ?? [])
const rows = computed(() => data.value?.data ?? [])
const summary = computed(() => data.value?.summary)
const meta = computed(() => data.value?.meta)

const customerOptions = computed(() => [
  { label: 'All customers', value: 'all' },
  ...customers.value.map((customer) => ({ label: customer.name, value: String(customer.id) })),
])

const locationOptions = computed(() => [
  { label: 'All locations', value: 'all' },
  ...locations.value.map((location) => ({ label: location.name, value: String(location.id) })),
])

const isInitialLoading = computed(() => pending.value && !data.value)
const isRefreshing = computed(() => pending.value && Boolean(data.value))

const canGoPrevious = computed(() => page.value > 1)
const canGoNext = computed(() => meta.value ? page.value < meta.value.last_page : false)

function money(value: string | number | null | undefined) {
  return Number(value || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function label(value: string | null | undefined) {
  return String(value || '-').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusVariant(status: string): 'neutral' | 'green' | 'red' | 'amber' | 'blue' {
  if (status === 'paid') return 'green'
  if (status === 'partial') return 'amber'
  if (status === 'unpaid') return 'red'

  return 'neutral'
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
    const blob = await $api<Blob>('/admin/reports/sales/pdf', {
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
    showNotice(error?.data?.message || 'Could not generate the sales report PDF.')
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
        title="Sales Report"
        description="Completed sale invoices for the selected period, with gross profit per invoice."
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

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AppSelect
              v-model="customerFilter"
              label="Customer"
              :options="customerOptions"
              searchable
            />

            <AppSelect
              v-model="locationFilter"
              label="Location"
              :options="locationOptions"
            />

            <AppSelect
              v-model="channelFilter"
              label="Channel"
              :options="channelOptions"
            />

            <AppSelect
              v-model="sortBy"
              label="Sort"
              :options="sortOptions"
            />
          </div>

          <AppInput
            v-model="search"
            placeholder="Search invoice number, customer name or phone..."
          />
        </div>
      </AppCard>

      <div
        v-if="summary"
        class="grid gap-4 sm:grid-cols-3 xl:grid-cols-5"
      >
        <AppStatCard
          label="Gross sales"
          :value="money(summary.gross_sales)"
          :helper="`${summary.invoices_count} invoices`"
        />
        <AppStatCard
          label="COGS"
          :value="money(summary.cogs)"
        />
        <AppStatCard
          label="Gross profit"
          :value="money(summary.gross_profit)"
        />
        <AppStatCard
          label="Paid"
          :value="money(summary.paid_amount)"
        />
        <AppStatCard
          label="Balance"
          :value="money(summary.balance_amount)"
        />
      </div>

      <AppErrorState
        v-if="error"
        title="Sales report could not be loaded"
        message="Please check backend API, authentication token, or route permissions."
        @retry="refresh"
      />

      <AppEmptyState
        v-else-if="rows.length === 0"
        title="No sales in this period"
        message="Try a wider date range or clear filters."
      />

      <template v-else>
        <AppCard class="overflow-hidden p-0">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Invoice</th>
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Customer</th>
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Status</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Total</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Balance</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Profit</th>
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

                <td class="px-4 py-3">
                  <p class="text-sm text-gray-700 dark:text-gray-300">{{ row.customer_name }}</p>
                  <p class="mt-0.5 text-[12px] text-gray-400">{{ row.location_name || '-' }}</p>
                </td>

                <td class="px-4 py-3">
                  <AppBadge :variant="statusVariant(row.payment_status)">
                    {{ label(row.payment_status) }}
                  </AppBadge>
                </td>

                <td class="px-4 py-3 text-right text-sm font-semibold text-gray-950 dark:text-white">
                  {{ money(row.grand_total) }}
                </td>

                <td class="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                  {{ money(row.balance_amount) }}
                </td>

                <td class="px-4 py-3 text-right text-sm font-semibold text-gray-950 dark:text-white">
                  {{ money(row.gross_profit) }}
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
