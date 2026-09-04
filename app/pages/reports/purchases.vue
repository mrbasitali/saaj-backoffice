<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

type Vendor = {
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

type PurchaseReportRow = {
  id: number
  invoice_number: string
  vendor_invoice_number: string | null
  purchase_date: string
  vendor_name: string | null
  location_name: string | null
  payment_status: string
  grand_total: string | number
  paid_amount: string | number
  balance_amount: string | number
}

type PurchaseReportSummary = {
  invoices_count: number
  subtotal: string | number
  discount_total: string | number
  tax_total: string | number
  shipping_total: string | number
  gross_purchases: string | number
  paid_amount: string | number
  balance_amount: string | number
}

type PaginationMeta = {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

type PurchaseReportResponse = {
  period: { date_from: string, date_to: string }
  summary: PurchaseReportSummary
  data: PurchaseReportRow[]
  meta: PaginationMeta
}

type VendorIndexResponse = { data: Vendor[] }
type LocationIndexResponse = { data: InventoryLocation[] }

const { $api } = useNuxtApp()
const { todayDateInput, startOfMonthInput, startOfYearInput } = useAppDateTime()
const { openPdf: openSecurePdf, state: securePdfState } = useSecurePdf()

const periodPreset = ref('month')
const dateFrom = ref(startOfMonthInput())
const dateTo = ref(todayDateInput())
const vendorFilter = ref('all')
const locationFilter = ref('all')
const search = ref('')
const debouncedSearch = ref('')
const sortBy = ref('latest')
const perPage = ref(20)
const page = ref(1)
const exportingPdf = computed(() => securePdfState.value.status === 'loading')
const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

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

watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)

  searchTimer = setTimeout(() => {
    page.value = 1
    debouncedSearch.value = value.trim()
  }, 300)
})

watch([dateFrom, dateTo, vendorFilter, locationFilter, sortBy, perPage], () => {
  page.value = 1
})

const {
  data: bootstrap,
} = useAsyncData(
  'purchase-report-bootstrap',
  async () => {
    const [vendorsResponse, locationsResponse] = await Promise.all([
      $api<VendorIndexResponse>('/admin/vendors', { query: { is_active: 1, per_page: 100, sort_by: 'name' } }),
      $api<LocationIndexResponse>('/admin/inventory-locations'),
    ])

    return {
      vendors: vendorsResponse.data ?? [],
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
  if (vendorFilter.value !== 'all') query.vendor_id = vendorFilter.value
  if (locationFilter.value !== 'all') query.inventory_location_id = locationFilter.value

  return query
}

const {
  data,
  pending,
  error,
  refresh,
} = useAsyncData(
  'purchase-report',
  () => $api<PurchaseReportResponse>('/admin/reports/purchases', { query: buildQuery() }),
  {
    watch: [dateFrom, dateTo, vendorFilter, locationFilter, debouncedSearch, sortBy, perPage, page],
    immediate: true,
  },
)

const vendors = computed(() => bootstrap.value?.vendors ?? [])
const locations = computed(() => bootstrap.value?.locations ?? [])
const rows = computed(() => data.value?.data ?? [])
const summary = computed(() => data.value?.summary)
const meta = computed(() => data.value?.meta)

const vendorOptions = computed(() => [
  { label: 'All vendors', value: 'all' },
  ...vendors.value.map((vendor) => ({ label: vendor.name, value: String(vendor.id) })),
])

const locationOptions = computed(() => [
  { label: 'All locations', value: 'all' },
  ...locations.value.map((location) => ({ label: location.name, value: String(location.id) })),
])

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

function exportPdf() {
  const period = data.value?.period

  openSecurePdf({
    endpoint: '/admin/reports/purchases/pdf',
    query: buildQuery(),
    filename: `purchase-report-${period?.date_from || dateFrom.value}-to-${period?.date_to || dateTo.value}.pdf`,
    title: 'Purchase report',
    description: `${period?.date_from || dateFrom.value} to ${period?.date_to || dateTo.value}`,
    errorFallback: 'Could not generate the purchase report PDF.',
  })
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
        title="Purchase Report"
        description="Received purchase invoices for the selected period."
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

          <div class="grid gap-3 sm:grid-cols-3">
            <AppSelect
              v-model="vendorFilter"
              label="Vendor"
              :options="vendorOptions"
              searchable
            />

            <AppSelect
              v-model="locationFilter"
              label="Location"
              :options="locationOptions"
            />

            <AppSelect
              v-model="sortBy"
              label="Sort"
              :options="sortOptions"
            />
          </div>

          <AppInput
            v-model="search"
            placeholder="Search invoice number, vendor reference or vendor name..."
          />
        </div>
      </AppCard>

      <div
        v-if="summary"
        class="grid gap-4 sm:grid-cols-3 xl:grid-cols-4"
      >
        <AppStatCard
          label="Gross purchases"
          :value="money(summary.gross_purchases)"
          :helper="`${summary.invoices_count} invoices`"
        />
        <AppStatCard
          label="Paid"
          :value="money(summary.paid_amount)"
        />
        <AppStatCard
          label="Balance"
          :value="money(summary.balance_amount)"
        />
        <AppStatCard
          label="Tax"
          :value="money(summary.tax_total)"
        />
      </div>

      <AppErrorState
        v-if="error"
        title="Purchase report could not be loaded"
        message="Please check backend API, authentication token, or route permissions."
        @retry="refresh"
      />

      <AppEmptyState
        v-else-if="rows.length === 0"
        title="No purchases in this period"
        message="Try a wider date range or clear filters."
      />

      <template v-else>
        <AppCard class="overflow-hidden p-0">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Invoice</th>
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Vendor</th>
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Status</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Total</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Balance</th>
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
                  <p class="mt-0.5 text-[12px] text-gray-400">{{ row.purchase_date }} &middot; {{ row.vendor_invoice_number || 'No vendor ref' }}</p>
                </td>

                <td class="px-4 py-3">
                  <p class="text-sm text-gray-700 dark:text-gray-300">{{ row.vendor_name || '-' }}</p>
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
