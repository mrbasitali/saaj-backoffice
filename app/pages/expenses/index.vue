<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

type ExpenseCategory = {
  id: number
  name: string
  is_active: boolean
}

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

type Expense = {
  id: number
  expense_category_id: number
  category?: ExpenseCategory | null
  vendor_id: number | null
  vendor?: Vendor | null
  inventory_location_id: number | null
  location?: { id: number, name: string, code: string } | null
  expense_number: string
  title: string
  payee: string | null
  expense_date: string
  amount: string | number
  payment_method: string
  status: string
  paid_at: string | null
  reference_number: string | null
  receipt_url: string | null
  notes: string | null
}

type PaginationMeta = {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

type ExpenseIndexResponse = {
  data: Expense[]
  meta: PaginationMeta
}

type ExpenseCategoryIndexResponse = { data: ExpenseCategory[] }
type VendorIndexResponse = { data: Vendor[] }
type LocationIndexResponse = { data: InventoryLocation[] }

const { $api } = useNuxtApp()
const { formatDate: formatAppDate, formatDateTime: formatAppDateTime, toDateTimeInput, dateTimeInputToIso, timezoneLabel } = useAppDateTime()

const search = ref('')
const debouncedSearch = ref('')
const categoryFilter = ref('all')
const statusFilter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const sortBy = ref('latest')
const perPage = ref(20)
const page = ref(1)

const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const selectedExpense = ref<Expense | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const expenseToDelete = ref<Expense | null>(null)

const cancelOpen = ref(false)
const cancelling = ref(false)
const cancelError = ref('')
const expenseToCancel = ref<Expense | null>(null)

const markingPaidId = ref<number | null>(null)
const markPaidOpen = ref(false)
const markPaidError = ref('')
const expenseToMarkPaid = ref<Expense | null>(null)
const paidAtInput = ref('')

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Cancelled', value: 'cancelled' },
]

const sortOptions = [
  { label: 'Latest first', value: 'latest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Amount: high to low', value: 'amount_high' },
  { label: 'Amount: low to high', value: 'amount_low' },
]

watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)

  searchTimer = setTimeout(() => {
    page.value = 1
    debouncedSearch.value = value.trim()
  }, 300)
})

watch([categoryFilter, statusFilter, dateFrom, dateTo, sortBy, perPage], () => {
  page.value = 1
})

function buildQuery() {
  const query: Record<string, string | number> = {
    page: page.value,
    per_page: perPage.value,
    sort_by: sortBy.value,
  }

  if (debouncedSearch.value) query.search = debouncedSearch.value
  if (categoryFilter.value !== 'all') query.expense_category_id = categoryFilter.value
  if (statusFilter.value !== 'all') query.status = statusFilter.value
  if (dateFrom.value) query.date_from = dateFrom.value
  if (dateTo.value) query.date_to = dateTo.value

  return query
}

const {
  data: bootstrap,
  pending: bootstrapPending,
  error: bootstrapError,
} = useAsyncData(
  'expenses-bootstrap',
  async () => {
    const [categoriesResponse, vendorsResponse, locationsResponse] = await Promise.all([
      $api<ExpenseCategoryIndexResponse>('/admin/expense-categories', {
        query: { is_active: 1, per_page: 100, sort_by: 'name' },
      }),
      $api<VendorIndexResponse>('/admin/vendors', {
        query: { is_active: 1, per_page: 100, sort_by: 'name' },
      }),
      $api<LocationIndexResponse>('/admin/inventory-locations'),
    ])

    return {
      categories: categoriesResponse.data ?? [],
      vendors: vendorsResponse.data ?? [],
      locations: locationsResponse.data ?? [],
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
  'admin-expenses',
  () => $api<ExpenseIndexResponse>('/admin/expenses', {
    query: buildQuery(),
  }),
  {
    watch: [debouncedSearch, categoryFilter, statusFilter, dateFrom, dateTo, sortBy, perPage, page],
    immediate: true,
  },
)

const categories = computed(() => bootstrap.value?.categories ?? [])
const vendors = computed(() => bootstrap.value?.vendors ?? [])
const locations = computed(() => bootstrap.value?.locations ?? [])
const expenses = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)

const categoryOptions = computed(() => [
  { label: 'All categories', value: 'all' },
  ...categories.value.map((category) => ({ label: category.name, value: String(category.id) })),
])

const isInitialLoading = computed(() => (pending.value || bootstrapPending.value) && (!data.value || !bootstrap.value))
const isRefreshing = computed(() => (pending.value || bootstrapPending.value) && Boolean(data.value && bootstrap.value))
const hasError = computed(() => error.value || bootstrapError.value)

const hasActiveFilters = computed(() => {
  return Boolean(
    search.value
    || categoryFilter.value !== 'all'
    || statusFilter.value !== 'all'
    || dateFrom.value
    || dateTo.value
    || sortBy.value !== 'latest',
  )
})

const pageTotal = computed(() => expenses.value.reduce((sum, expense) => sum + Number(expense.amount || 0), 0))
const pagePending = computed(() => expenses.value.filter((expense) => expense.status === 'pending').length)
const pagePendingTotal = computed(() => {
  return expenses.value
    .filter((expense) => expense.status === 'pending')
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
})

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

function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusVariant(status: string): 'neutral' | 'green' | 'red' | 'amber' | 'blue' {
  if (status === 'paid') return 'green'
  if (status === 'pending') return 'amber'
  if (status === 'cancelled') return 'red'

  return 'neutral'
}

function payeeLabel(expense: Expense) {
  return expense.vendor?.name || expense.payee || '—'
}

function showNotice(message: string) {
  notice.value = message

  if (noticeTimer.value) clearTimeout(noticeTimer.value)

  noticeTimer.value = setTimeout(() => {
    notice.value = ''
  }, 3000)
}

function openCreate() {
  selectedExpense.value = null
  formMode.value = 'create'
  formOpen.value = true
}

function openEdit(expense: Expense) {
  selectedExpense.value = expense
  formMode.value = 'edit'
  formOpen.value = true
}

async function afterSaved() {
  formOpen.value = false
  await refresh()
  showNotice(formMode.value === 'create' ? 'Expense recorded successfully.' : 'Expense updated successfully.')
}

function askMarkPaid(expense: Expense) {
  expenseToMarkPaid.value = expense
  paidAtInput.value = toDateTimeInput()
  markPaidError.value = ''
  markPaidOpen.value = true
}

async function confirmMarkPaid() {
  const expense = expenseToMarkPaid.value
  if (!expense || markingPaidId.value) return

  const paidAt = dateTimeInputToIso(paidAtInput.value)
  if (!paidAt) {
    markPaidError.value = 'Choose a valid paid date and time.'
    return
  }

  markingPaidId.value = expense.id

  try {
    await $api(`/admin/expenses/${expense.id}/mark-paid`, {
      method: 'POST',
      body: { paid_at: paidAt },
    })
    markPaidOpen.value = false
    showNotice(`${expense.expense_number} marked as paid.`)
    await refresh()
  } catch (error: any) {
    markPaidError.value = extractApiErrorMessage(error, 'Could not mark this expense as paid.')
  } finally {
    markingPaidId.value = null
  }
}

function askCancel(expense: Expense) {
  expenseToCancel.value = expense
  cancelError.value = ''
  cancelOpen.value = true
}

async function confirmCancel() {
  if (!expenseToCancel.value) return

  cancelling.value = true
  cancelError.value = ''

  try {
    await $api(`/admin/expenses/${expenseToCancel.value.id}/cancel`, { method: 'POST' })
    cancelOpen.value = false
    showNotice('Expense cancelled.')
    await refresh()
  } catch (error: any) {
    cancelError.value = extractApiErrorMessage(error, 'Could not cancel this expense.')
  } finally {
    cancelling.value = false
  }
}

function askDelete(expense: Expense) {
  expenseToDelete.value = expense
  deleteError.value = ''
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!expenseToDelete.value) return

  deleting.value = true
  deleteError.value = ''

  try {
    await $api(`/admin/expenses/${expenseToDelete.value.id}`, { method: 'DELETE' })
    deleteOpen.value = false
    showNotice('Expense deleted successfully.')
    await refresh()
  } catch (error: any) {
    deleteError.value = extractApiErrorMessage(error, 'Could not delete this expense.')
  } finally {
    deleting.value = false
  }
}

function clearFilters() {
  search.value = ''
  debouncedSearch.value = ''
  categoryFilter.value = 'all'
  statusFilter.value = 'all'
  dateFrom.value = ''
  dateTo.value = ''
  sortBy.value = 'latest'
  page.value = 1
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
    <ExpensesSkeleton v-if="isInitialLoading" />

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
        title="Expenses"
        description="Record rent, salaries, utilities and anything else it costs to run the store — feeds directly into net profit."
      >
        <template #actions>
          <AppButton
            variant="secondary"
            :loading="pending"
            @click="refresh"
          >
            {{ pending ? 'Refreshing...' : 'Refresh' }}
          </AppButton>

          <AppButton @click="openCreate">
            Record expense
          </AppButton>
        </template>
      </AppPageHeader>

      <div
        v-if="notice"
        class="rounded-[12px] bg-emerald-500/[0.07] p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      >
        {{ notice }}
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <AppStatCard
          label="Expenses on page"
          :value="money(pageTotal)"
          helper="Total for the rows currently shown"
        />

        <AppStatCard
          label="Pending on page"
          :value="String(pagePending)"
          :helper="`${money(pagePendingTotal)} not yet paid`"
        />

        <AppStatCard
          label="Total matching"
          :value="String(meta?.total ?? 0)"
          helper="Across all pages for the current filters"
        />
      </div>

      <AppCard class="p-4">
        <div class="grid gap-4">
          <div class="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
            <AppInput
              v-model="search"
              placeholder="Search title, payee, reference or notes..."
            />

            <AppButton
              v-if="hasActiveFilters"
              variant="ghost"
              size="sm"
              @click="clearFilters"
            >
              Clear filters
            </AppButton>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AppSelect
              v-model="categoryFilter"
              label="Category"
              :options="categoryOptions"
            />

            <AppSelect
              v-model="statusFilter"
              label="Status"
              :options="statusOptions"
            />

            <AppInput
              v-model="dateFrom"
              type="date"
              label="From"
            />

            <AppInput
              v-model="dateTo"
              type="date"
              label="To"
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

      <AppErrorState
        v-if="hasError"
        title="Expenses could not be loaded"
        message="Please check backend API, authentication token, or route permissions."
        @retry="refresh"
      />

      <AppEmptyState
        v-else-if="expenses.length === 0"
        title="No expenses found"
        message="Record your first expense or clear filters."
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
              Record expense
            </AppButton>
          </div>
        </template>
      </AppEmptyState>

      <template v-else>
        <AppCard class="overflow-hidden p-0">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Expense</th>
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Category / Paid to</th>
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Status</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Amount</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="expense in expenses"
                :key="expense.id"
                class="border-b border-gray-50 last:border-0 dark:border-white/5"
              >
                <td class="min-w-[220px] px-4 py-3">
                  <button
                    v-if="expense.status === 'pending'"
                    type="button"
                    class="text-left"
                    @click="openEdit(expense)"
                  >
                    <p class="text-sm font-semibold text-gray-950 dark:text-white">
                      {{ expense.title }}
                    </p>
                    <p class="mt-0.5 text-[12px] text-gray-400">
                      {{ expense.expense_number }} &middot; {{ dateLabel(expense.expense_date) }}
                    </p>
                  </button>

                  <div v-else>
                    <p class="text-sm font-semibold text-gray-950 dark:text-white">
                      {{ expense.title }}
                    </p>
                    <p class="mt-0.5 text-[12px] text-gray-400">
                      {{ expense.expense_number }} &middot; {{ dateLabel(expense.expense_date) }}
                    </p>
                  </div>
                </td>

                <td class="px-4 py-3">
                  <p class="text-sm text-gray-700 dark:text-gray-300">
                    {{ expense.category?.name || 'Uncategorized' }}
                  </p>
                  <p class="mt-0.5 text-[12px] text-gray-400">
                    {{ payeeLabel(expense) }}
                  </p>
                </td>

                <td class="px-4 py-3">
                  <AppBadge :variant="statusVariant(expense.status)">
                    {{ label(expense.status) }}
                  </AppBadge>
                  <p v-if="expense.paid_at" class="mt-1.5 text-[11px] text-gray-400">
                    {{ dateTimeLabel(expense.paid_at) }}
                  </p>
                </td>

                <td class="px-4 py-3 text-right text-sm font-semibold text-gray-950 dark:text-white">
                  {{ money(expense.amount) }}
                </td>

                <td class="px-4 py-3 text-right">
                  <AppActionMenu>
                    <template #default="{ close }">
                      <AppActionMenuItem
                        v-if="expense.status === 'pending'"
                        @click="openEdit(expense); close()"
                      >
                        Edit expense
                      </AppActionMenuItem>

                      <AppActionMenuItem
                        v-if="expense.status === 'pending'"
                        :disabled="markingPaidId === expense.id"
                        @click="askMarkPaid(expense); close()"
                      >
                        {{ markingPaidId === expense.id ? 'Marking paid...' : 'Mark as paid' }}
                      </AppActionMenuItem>

                      <AppActionMenuItem
                        v-if="expense.receipt_url"
                        @click="() => { window.open(expense.receipt_url as string, '_blank', 'noopener,noreferrer'); close() }"
                      >
                        View receipt
                      </AppActionMenuItem>

                      <AppActionMenuItem
                        v-if="expense.status !== 'cancelled'"
                        danger
                        @click="askCancel(expense); close()"
                      >
                        Cancel expense
                      </AppActionMenuItem>

                      <AppActionMenuItem
                        v-if="expense.status !== 'paid'"
                        danger
                        @click="askDelete(expense); close()"
                      >
                        Delete expense
                      </AppActionMenuItem>
                    </template>
                  </AppActionMenu>
                </td>
              </tr>
            </tbody>
          </table>
        </AppCard>

        <AppCard class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-[12px] text-gray-500 dark:text-gray-500">
            Showing
            <span class="font-medium text-gray-900 dark:text-white">{{ meta?.from ?? 0 }}</span>
            to
            <span class="font-medium text-gray-900 dark:text-white">{{ meta?.to ?? 0 }}</span>
            of
            <span class="font-medium text-gray-900 dark:text-white">{{ meta?.total ?? 0 }}</span>
            expenses
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

    <ExpenseFormModal
      :open="formOpen"
      :mode="formMode"
      :expense="selectedExpense"
      :categories="categories"
      :vendors="vendors"
      :locations="locations"
      @close="formOpen = false"
      @saved="afterSaved"
    />

    <AppConfirmModal
      :open="markPaidOpen"
      title="Mark expense as paid?"
      :message="`This will mark “${expenseToMarkPaid?.title || 'this expense'}” as settled at the date and time below.`"
      confirm-label="Mark paid"
      :loading="Boolean(markingPaidId)"
      :error="markPaidError"
      @close="markPaidOpen = false"
      @confirm="confirmMarkPaid"
    >
      <div class="rounded-[12px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
        <AppInput v-model="paidAtInput" type="datetime-local" label="Paid date & time" />
        <p class="mt-2 text-[11px] leading-5 text-gray-400 dark:text-gray-500">
          Shown in {{ timezoneLabel }}. Adjust it when recording an expense later.
        </p>
      </div>
    </AppConfirmModal>

    <AppConfirmModal
      :open="cancelOpen"
      title="Cancel this expense?"
      :message="`This will mark “${expenseToCancel?.title || 'this expense'}” as cancelled. It stays in the record for reference but no longer counts toward totals or net profit.`"
      confirm-label="Cancel expense"
      :loading="cancelling"
      :error="cancelError"
      @close="cancelOpen = false"
      @confirm="confirmCancel"
    />

    <AppConfirmModal
      :open="deleteOpen"
      title="Delete this expense?"
      :message="`This will permanently delete “${expenseToDelete?.title || 'this expense'}”. Paid expenses cannot be deleted — cancel them instead.`"
      confirm-label="Delete expense"
      :loading="deleting"
      :error="deleteError"
      @close="deleteOpen = false"
      @confirm="confirmDelete"
    />
  </section>
</template>
