<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

type ExpenseCategory = {
  id: number
  name: string
  slug: string
  description: string | null
  is_active: boolean
  sort_order: number
  expenses_count?: number
}

type PaginationMeta = {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

type ExpenseCategoryIndexResponse = {
  data: ExpenseCategory[]
  meta: PaginationMeta
}

const { $api } = useNuxtApp()

const search = ref('')
const debouncedSearch = ref('')
const activeFilter = ref('all')
const sortBy = ref('sort_order')
const perPage = ref(50)
const page = ref(1)

const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const selectedCategory = ref<ExpenseCategory | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const categoryToDelete = ref<ExpenseCategory | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const activeOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

const sortOptions = [
  { label: 'Sort order', value: 'sort_order' },
  { label: 'Name A-Z', value: 'name' },
  { label: 'Latest first', value: 'latest' },
]

watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)

  searchTimer = setTimeout(() => {
    page.value = 1
    debouncedSearch.value = value.trim()
  }, 300)
})

watch([activeFilter, sortBy, perPage], () => {
  page.value = 1
})

function buildQuery() {
  const query: Record<string, string | number> = {
    page: page.value,
    per_page: perPage.value,
    sort_by: sortBy.value,
  }

  if (debouncedSearch.value) {
    query.search = debouncedSearch.value
  }

  if (activeFilter.value !== 'all') {
    query.is_active = activeFilter.value === 'active' ? 1 : 0
  }

  return query
}

const {
  data,
  pending,
  error,
  refresh,
} = useAsyncData(
  'admin-expense-categories',
  () => $api<ExpenseCategoryIndexResponse>('/admin/expense-categories', {
    query: buildQuery(),
  }),
  {
    watch: [debouncedSearch, activeFilter, sortBy, perPage, page],
    immediate: true,
  },
)

const categories = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)

const isInitialLoading = computed(() => pending.value && !data.value)
const isRefreshing = computed(() => pending.value && Boolean(data.value))

const hasActiveFilters = computed(() => {
  return Boolean(search.value || activeFilter.value !== 'all' || sortBy.value !== 'sort_order')
})

function showNotice(message: string) {
  notice.value = message

  if (noticeTimer.value) clearTimeout(noticeTimer.value)

  noticeTimer.value = setTimeout(() => {
    notice.value = ''
  }, 3000)
}

function openCreate() {
  selectedCategory.value = null
  formMode.value = 'create'
  formOpen.value = true
}

function openEdit(category: ExpenseCategory) {
  selectedCategory.value = category
  formMode.value = 'edit'
  formOpen.value = true
}

async function afterSaved() {
  formOpen.value = false
  await refresh()
  showNotice(formMode.value === 'create' ? 'Expense category created successfully.' : 'Expense category updated successfully.')
}

function askDelete(category: ExpenseCategory) {
  categoryToDelete.value = category
  deleteError.value = ''
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!categoryToDelete.value) return

  deleting.value = true
  deleteError.value = ''

  try {
    await $api(`/admin/expense-categories/${categoryToDelete.value.id}`, {
      method: 'DELETE',
    })

    deleteOpen.value = false
    showNotice('Expense category deleted successfully.')
    await refresh()
  } catch (error: any) {
    deleteError.value = extractApiErrorMessage(error, 'Could not delete this category.')
  } finally {
    deleting.value = false
  }
}

function clearFilters() {
  search.value = ''
  debouncedSearch.value = ''
  activeFilter.value = 'all'
  sortBy.value = 'sort_order'
  page.value = 1
}
</script>

<template>
  <section class="mx-auto max-w-[1200px]">
    <div class="relative space-y-4 sm:space-y-5">
      <div
        v-if="isRefreshing"
        class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-[#f4f5f7]/40 backdrop-blur-[1px] dark:bg-[#09090b]/30"
      />

      <AppPageHeader
        eyebrow="Transactions"
        title="Expense Categories"
        description="Group your expenses — Rent, Salaries, Utilities and whatever else applies to your store."
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
            Add category
          </AppButton>
        </template>
      </AppPageHeader>

      <div
        v-if="notice"
        class="rounded-[12px] bg-emerald-500/[0.07] p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      >
        {{ notice }}
      </div>

      <AppCard class="p-4">
        <div class="grid gap-4">
          <div class="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
            <AppInput
              v-model="search"
              placeholder="Search categories by name or slug..."
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

          <div class="grid gap-3 sm:grid-cols-2">
            <AppSelect
              v-model="activeFilter"
              label="Status"
              :options="activeOptions"
            />

            <AppSelect
              v-model="sortBy"
              label="Sort"
              :options="sortOptions"
            />
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-4 shadow-[0_-1px_0_rgba(17,24,39,0.05)]">
            <AppBadge variant="neutral">
              {{ categories.length }} shown
            </AppBadge>

            <AppBadge variant="neutral">
              {{ meta?.total ?? 0 }} total
            </AppBadge>

            <AppBadge
              v-if="hasActiveFilters"
              variant="blue"
            >
              Filters active
            </AppBadge>
          </div>
        </div>
      </AppCard>

      <AppErrorState
        v-if="error"
        title="Expense categories could not be loaded"
        message="Please check backend API, authentication token, or route permissions."
        @retry="refresh"
      />

      <AppEmptyState
        v-else-if="categories.length === 0"
        title="No expense categories found"
        message="Create your first category or clear filters."
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
              Add category
            </AppButton>
          </div>
        </template>
      </AppEmptyState>

      <template v-else>
        <AppCard class="overflow-hidden p-0">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Category</th>
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Expenses</th>
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Status</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="category in categories"
                :key="category.id"
                class="border-b border-gray-50 last:border-0 dark:border-white/5"
              >
                <td class="px-4 py-3">
                  <button
                    type="button"
                    class="text-left"
                    @click="openEdit(category)"
                  >
                    <p class="text-sm font-semibold text-gray-950 dark:text-white">
                      {{ category.name }}
                    </p>
                    <p class="mt-0.5 text-[12px] text-gray-400">
                      {{ category.slug }}
                    </p>
                  </button>
                </td>

                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {{ category.expenses_count ?? 0 }}
                </td>

                <td class="px-4 py-3">
                  <AppBadge :variant="category.is_active ? 'green' : 'red'">
                    {{ category.is_active ? 'Active' : 'Inactive' }}
                  </AppBadge>
                </td>

                <td class="px-4 py-3 text-right">
                  <AppActionMenu>
                    <template #default="{ close }">
                      <AppActionMenuItem @click="openEdit(category); close()">
                        Edit category
                      </AppActionMenuItem>

                      <AppActionMenuItem
                        danger
                        @click="askDelete(category); close()"
                      >
                        Delete category
                      </AppActionMenuItem>
                    </template>
                  </AppActionMenu>
                </td>
              </tr>
            </tbody>
          </table>
        </AppCard>
      </template>
    </div>

    <ExpenseCategoryFormModal
      :open="formOpen"
      :mode="formMode"
      :category="selectedCategory"
      @close="formOpen = false"
      @saved="afterSaved"
    />

    <AppConfirmModal
      :open="deleteOpen"
      title="Delete expense category?"
      :message="`This will delete “${categoryToDelete?.name || 'this category'}”. Categories with expenses recorded against them cannot be deleted until those expenses are moved or deleted.`"
      confirm-label="Delete category"
      :loading="deleting"
      :error="deleteError"
      @close="deleteOpen = false"
      @confirm="confirmDelete"
    />
  </section>
</template>
