<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

type InventoryLocation = {
  id: number
  name: string
  code: string
  is_active: boolean
}

type InventoryReportRow = {
  product_variant_id: number
  sku: string | null
  barcode: string | null
  product_name: string | null
  brand_name: string | null
  option_summary: string | null
  location_name: string | null
  on_hand_quantity: number
  reserved_quantity: number
  available_quantity: number
  min_stock_level: number
  cost_price: string | number
  price: string | number
  stock_cost_value: string | number
  stock_sale_value: string | number
  stock_status: 'out' | 'low' | 'in_stock'
}

type InventoryReportSummary = {
  total_on_hand: number
  total_reserved: number
  total_available: number
  stock_cost_value: string | number
  stock_sale_value: string | number
}

type PaginationMeta = {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

type InventoryReportResponse = {
  summary: InventoryReportSummary
  data: InventoryReportRow[]
  meta: PaginationMeta
}

type LocationIndexResponse = { data: InventoryLocation[] }

const { $api } = useNuxtApp()

const locationFilter = ref('all')
const stockStatusFilter = ref('all')
const search = ref('')
const debouncedSearch = ref('')
const sortBy = ref('available_low')
const perPage = ref(20)
const page = ref(1)
const exportingPdf = ref(false)
const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const stockStatusOptions = [
  { label: 'All stock levels', value: 'all' },
  { label: 'Out of stock', value: 'out' },
  { label: 'Low stock', value: 'low' },
  { label: 'In stock', value: 'in_stock' },
]

const sortOptions = [
  { label: 'Available: low to high', value: 'available_low' },
  { label: 'Available: high to low', value: 'available_high' },
  { label: 'On hand: high to low', value: 'on_hand_high' },
  { label: 'On hand: low to high', value: 'on_hand_low' },
  { label: 'Stock value: high to low', value: 'value_high' },
  { label: 'Stock value: low to high', value: 'value_low' },
]

watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)

  searchTimer = setTimeout(() => {
    page.value = 1
    debouncedSearch.value = value.trim()
  }, 300)
})

watch([locationFilter, stockStatusFilter, sortBy, perPage], () => {
  page.value = 1
})

const {
  data: bootstrap,
} = useAsyncData(
  'inventory-report-bootstrap',
  () => $api<LocationIndexResponse>('/admin/inventory-locations'),
  { immediate: true },
)

function buildQuery() {
  const query: Record<string, string | number> = {
    page: page.value,
    per_page: perPage.value,
    sort_by: sortBy.value,
  }

  if (debouncedSearch.value) query.search = debouncedSearch.value
  if (locationFilter.value !== 'all') query.inventory_location_id = locationFilter.value
  if (stockStatusFilter.value !== 'all') query.stock_status = stockStatusFilter.value

  return query
}

const {
  data,
  pending,
  error,
  refresh,
} = useAsyncData(
  'inventory-report',
  () => $api<InventoryReportResponse>('/admin/reports/inventory', { query: buildQuery() }),
  {
    watch: [locationFilter, stockStatusFilter, debouncedSearch, sortBy, perPage, page],
    immediate: true,
  },
)

const locations = computed(() => bootstrap.value?.data ?? [])
const rows = computed(() => data.value?.data ?? [])
const summary = computed(() => data.value?.summary)
const meta = computed(() => data.value?.meta)

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

function stockStatusVariant(status: string): 'neutral' | 'green' | 'red' | 'amber' | 'blue' {
  if (status === 'out') return 'red'
  if (status === 'low') return 'amber'

  return 'green'
}

function stockStatusLabel(status: string) {
  if (status === 'out') return 'Out of stock'
  if (status === 'low') return 'Low stock'

  return 'In stock'
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
    const blob = await $api<Blob>('/admin/reports/inventory/pdf', {
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
    showNotice(error?.data?.message || 'Could not generate the inventory report PDF.')
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
        title="Inventory Report"
        description="Current stock on hand, reserved and available across all locations — a snapshot, not tied to a date range."
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
              v-model="locationFilter"
              label="Location"
              :options="locationOptions"
            />

            <AppSelect
              v-model="stockStatusFilter"
              label="Stock status"
              :options="stockStatusOptions"
            />

            <AppSelect
              v-model="sortBy"
              label="Sort"
              :options="sortOptions"
            />
          </div>

          <AppInput
            v-model="search"
            placeholder="Search product name, SKU, barcode or option..."
          />
        </div>
      </AppCard>

      <div
        v-if="summary"
        class="grid gap-4 sm:grid-cols-3 xl:grid-cols-5"
      >
        <AppStatCard
          label="On hand"
          :value="String(summary.total_on_hand)"
        />
        <AppStatCard
          label="Available"
          :value="String(summary.total_available)"
        />
        <AppStatCard
          label="Reserved"
          :value="String(summary.total_reserved)"
        />
        <AppStatCard
          label="Stock value (cost)"
          :value="money(summary.stock_cost_value)"
        />
        <AppStatCard
          label="Stock value (retail)"
          :value="money(summary.stock_sale_value)"
        />
      </div>

      <AppErrorState
        v-if="error"
        title="Inventory report could not be loaded"
        message="Please check backend API, authentication token, or route permissions."
        @retry="refresh"
      />

      <AppEmptyState
        v-else-if="rows.length === 0"
        title="No matching stock"
        message="Try different filters."
      />

      <template v-else>
        <AppCard class="overflow-hidden p-0">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Product</th>
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Location</th>
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Status</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">On hand</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Available</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Cost value</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="row in rows"
                :key="`${row.product_variant_id}`"
                class="border-b border-gray-50 last:border-0 dark:border-white/5"
              >
                <td class="px-4 py-3">
                  <p class="text-sm font-semibold text-gray-950 dark:text-white">{{ row.product_name || 'Product' }}</p>
                  <p class="mt-0.5 text-[12px] text-gray-400">
                    {{ [row.option_summary, row.sku ? `SKU ${row.sku}` : null].filter(Boolean).join(' · ') || '-' }}
                  </p>
                </td>

                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {{ row.location_name || '-' }}
                </td>

                <td class="px-4 py-3">
                  <AppBadge :variant="stockStatusVariant(row.stock_status)">
                    {{ stockStatusLabel(row.stock_status) }}
                  </AppBadge>
                </td>

                <td class="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                  {{ row.on_hand_quantity }}
                </td>

                <td class="px-4 py-3 text-right text-sm font-semibold text-gray-950 dark:text-white">
                  {{ row.available_quantity }}
                </td>

                <td class="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                  {{ money(row.stock_cost_value) }}
                </td>
              </tr>
            </tbody>
          </table>
        </AppCard>

        <AppCard class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-[12px] text-gray-500 dark:text-gray-500">
            Showing <span class="font-medium text-gray-900 dark:text-white">{{ meta?.from ?? 0 }}</span>
            to <span class="font-medium text-gray-900 dark:text-white">{{ meta?.to ?? 0 }}</span>
            of <span class="font-medium text-gray-900 dark:text-white">{{ meta?.total ?? 0 }}</span> variants
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
