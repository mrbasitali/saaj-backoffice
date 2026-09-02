<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'user-management'],
  layout: 'admin',
})

type StaffUser = {
  id: number
  name: string
  email: string
  is_active: boolean
  roles: string[]
  created_at: string | null
  updated_at: string | null
}

type PaginationMeta = {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

type UsersResponse = {
  data: StaffUser[]
  meta: PaginationMeta
  summary: {
    total: number
    active: number
    inactive: number
    administrators: number
  }
  available_roles: string[]
}

const { $api } = useNuxtApp()
const auth = useAuthStore()
const { formatDate } = useAppDateTime()

const search = ref('')
const debouncedSearch = ref('')
const status = ref('all')
const role = ref('all')
const sortBy = ref('latest')
const perPage = ref(20)
const page = ref(1)

const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const selectedUser = ref<StaffUser | null>(null)

const statusOpen = ref(false)
const statusSaving = ref(false)
const statusError = ref('')
const userForStatus = ref<StaffUser | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  sales_staff: 'Sales Staff',
  inventory_staff: 'Inventory Staff',
}

const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

const sortOptions = [
  { label: 'Latest first', value: 'latest' },
  { label: 'Name A-Z', value: 'name' },
  { label: 'Oldest first', value: 'oldest' },
]

watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)

  searchTimer = setTimeout(() => {
    page.value = 1
    debouncedSearch.value = value.trim()
  }, 300)
})

watch([status, role, sortBy, perPage], () => {
  page.value = 1
})

function buildQuery() {
  const query: Record<string, string | number> = {
    page: page.value,
    per_page: perPage.value,
    status: status.value,
    role: role.value,
    sort_by: sortBy.value,
  }

  if (debouncedSearch.value) query.search = debouncedSearch.value

  return query
}

const {
  data,
  pending,
  error,
  refresh,
} = useAsyncData(
  'admin-users',
  () => $api<UsersResponse>('/admin/users', { query: buildQuery() }),
  {
    watch: [debouncedSearch, status, role, sortBy, perPage, page],
    immediate: true,
  },
)

const users = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)
const summary = computed(() => data.value?.summary ?? {
  total: 0,
  active: 0,
  inactive: 0,
  administrators: 0,
})
const availableRoles = computed(() => data.value?.available_roles ?? [])
const roleOptions = computed(() => [
  { label: 'All roles', value: 'all' },
  ...availableRoles.value.map((item) => ({
    label: roleLabels[item] || item,
    value: item,
  })),
])

const isInitialLoading = computed(() => pending.value && !data.value)
const isRefreshing = computed(() => pending.value && Boolean(data.value))
const canGoPrevious = computed(() => page.value > 1)
const canGoNext = computed(() => page.value < (meta.value?.last_page ?? 1))
const hasFilters = computed(() => Boolean(
  search.value
  || status.value !== 'all'
  || role.value !== 'all'
  || sortBy.value !== 'latest',
))

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function roleLabel(user: StaffUser) {
  const userRole = user.roles[0]
  return userRole ? (roleLabels[userRole] || userRole) : 'No role'
}

function roleBadge(user: StaffUser): 'red' | 'blue' | 'amber' | 'neutral' {
  const userRole = user.roles[0]
  if (userRole === 'super_admin') return 'red'
  if (userRole === 'admin') return 'blue'
  if (userRole === 'manager') return 'amber'
  return 'neutral'
}

function isSelf(user: StaffUser) {
  return user.id === auth.user?.id
}

function showNotice(message: string) {
  notice.value = message
  if (noticeTimer.value) clearTimeout(noticeTimer.value)
  noticeTimer.value = setTimeout(() => { notice.value = '' }, 3500)
}

function openCreate() {
  selectedUser.value = null
  formMode.value = 'create'
  formOpen.value = true
}

function openEdit(user: StaffUser) {
  if (isSelf(user)) {
    navigateTo('/profile')
    return
  }

  selectedUser.value = user
  formMode.value = 'edit'
  formOpen.value = true
}

async function afterSaved(message: string) {
  formOpen.value = false
  showNotice(message)
  await refresh()
}

function askStatus(user: StaffUser) {
  if (isSelf(user)) return
  userForStatus.value = user
  statusError.value = ''
  statusOpen.value = true
}

async function confirmStatus() {
  if (!userForStatus.value) return

  statusSaving.value = true
  statusError.value = ''
  const activate = !userForStatus.value.is_active

  try {
    const response = await $api<{ message: string }>(`/admin/users/${userForStatus.value.id}`, {
      method: 'PATCH',
      body: { is_active: activate },
    })

    statusOpen.value = false
    showNotice(activate ? 'User account activated.' : 'User account deactivated and signed out.')
    await refresh()
    return response
  } catch (err: any) {
    statusError.value = extractApiErrorMessage(err, 'Could not update this account.')
  } finally {
    statusSaving.value = false
  }
}

function clearFilters() {
  search.value = ''
  debouncedSearch.value = ''
  status.value = 'all'
  role.value = 'all'
  sortBy.value = 'latest'
  page.value = 1
}
</script>

<template>
  <section class="mx-auto max-w-[1600px]">
    <div class="relative space-y-4 sm:space-y-5">
      <div
        v-if="isRefreshing"
        class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-[#f4f5f7]/35 backdrop-blur-[1px] dark:bg-[#09090b]/25"
      />

      <AppPageHeader
        eyebrow="Administration"
        title="Users"
        description="Create staff accounts, assign the right access role, reset passwords, and control who can sign in."
      >
        <template #actions>
          <AppButton variant="secondary" :loading="pending" @click="refresh">
            Refresh
          </AppButton>
          <AppButton :disabled="availableRoles.length === 0" @click="openCreate">
            Add user
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
        <AppStatCard label="Staff accounts" :value="summary.total" helper="Accounts visible to your role" />
        <AppStatCard label="Active" :value="summary.active" helper="Can currently sign in" />
        <AppStatCard label="Inactive" :value="summary.inactive" helper="Access is paused" />
        <AppStatCard label="Assignable roles" :value="availableRoles.length" helper="Roles available to your account" />
      </div>

      <AppCard class="p-4">
        <div class="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_180px_180px_180px_auto] xl:items-end">
          <AppInput v-model="search" label="Search" placeholder="Search by name or email..." />
          <AppSelect v-model="status" label="Status" :options="statusOptions" />
          <AppSelect v-model="role" label="Role" :options="roleOptions" />
          <AppSelect v-model="sortBy" label="Sort" :options="sortOptions" />
          <AppButton v-if="hasFilters" variant="ghost" size="sm" @click="clearFilters">
            Clear filters
          </AppButton>
        </div>
      </AppCard>

      <AppErrorState
        v-if="error"
        title="Users could not be loaded"
        message="Please check the API connection and your account permissions."
        @retry="refresh"
      />

      <AppCard v-else-if="isInitialLoading" class="overflow-hidden p-5">
        <div class="space-y-4 animate-pulse">
          <div v-for="item in 5" :key="item" class="flex items-center gap-4">
            <div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-white/10" />
            <div class="flex-1 space-y-2">
              <div class="h-3 w-44 rounded bg-gray-200 dark:bg-white/10" />
              <div class="h-2.5 w-56 rounded bg-gray-100 dark:bg-white/5" />
            </div>
          </div>
        </div>
      </AppCard>

      <AppEmptyState
        v-else-if="users.length === 0"
        title="No users found"
        message="Create a staff account or clear the current filters."
      >
        <template #actions>
          <div class="flex gap-2">
            <AppButton v-if="hasFilters" variant="secondary" @click="clearFilters">Clear filters</AppButton>
            <AppButton @click="openCreate">Add user</AppButton>
          </div>
        </template>
      </AppEmptyState>

      <template v-else>
        <AppCard class="overflow-visible">
          <div class="hidden overflow-x-auto md:block">
            <table class="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr class="text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
                  <th class="px-5 py-3">User</th>
                  <th class="px-4 py-3">Role</th>
                  <th class="px-4 py-3">Status</th>
                  <th class="px-4 py-3">Added</th>
                  <th class="w-16 px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/[0.055]">
                <tr v-for="user in users" :key="user.id" class="group transition hover:bg-gray-950/[0.018] dark:hover:bg-white/[0.025]">
                  <td class="px-5 py-4">
                    <div class="flex items-center gap-3">
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-950/[0.055] text-[12px] font-semibold text-gray-700 dark:bg-white/[0.08] dark:text-gray-200">
                        {{ initials(user.name) }}
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <p class="truncate text-[13px] font-semibold text-gray-900 dark:text-white">{{ user.name }}</p>
                          <AppBadge v-if="isSelf(user)" variant="blue">You</AppBadge>
                        </div>
                        <p class="mt-0.5 truncate text-[12px] text-gray-400 dark:text-gray-500">{{ user.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-4"><AppBadge :variant="roleBadge(user)">{{ roleLabel(user) }}</AppBadge></td>
                  <td class="px-4 py-4"><AppBadge :variant="user.is_active ? 'green' : 'red'">{{ user.is_active ? 'Active' : 'Inactive' }}</AppBadge></td>
                  <td class="px-4 py-4 text-[12px] text-gray-500 dark:text-gray-400">{{ formatDate(user.created_at) }}</td>
                  <td class="px-5 py-4 text-right">
                    <AppActionMenu>
                      <template #default="{ close }">
                        <AppActionMenuItem @click="openEdit(user); close()">
                          {{ isSelf(user) ? 'Open my profile' : 'Edit account' }}
                        </AppActionMenuItem>
                        <AppActionMenuItem v-if="!isSelf(user)" :danger="user.is_active" @click="askStatus(user); close()">
                          {{ user.is_active ? 'Deactivate account' : 'Activate account' }}
                        </AppActionMenuItem>
                      </template>
                    </AppActionMenu>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divide-y divide-gray-100 md:hidden dark:divide-white/[0.055]">
            <div v-for="user in users" :key="user.id" class="p-4">
              <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-950/[0.055] text-[12px] font-semibold text-gray-700 dark:bg-white/[0.08] dark:text-gray-200">
                  {{ initials(user.name) }}
                </div>
                <button type="button" class="min-w-0 flex-1 text-left" @click="openEdit(user)">
                  <p class="truncate text-[13px] font-semibold text-gray-900 dark:text-white">{{ user.name }}</p>
                  <p class="mt-0.5 truncate text-[12px] text-gray-400 dark:text-gray-500">{{ user.email }}</p>
                </button>
                <AppActionMenu>
                  <template #default="{ close }">
                    <AppActionMenuItem @click="openEdit(user); close()">
                      {{ isSelf(user) ? 'Open my profile' : 'Edit account' }}
                    </AppActionMenuItem>
                    <AppActionMenuItem v-if="!isSelf(user)" :danger="user.is_active" @click="askStatus(user); close()">
                      {{ user.is_active ? 'Deactivate account' : 'Activate account' }}
                    </AppActionMenuItem>
                  </template>
                </AppActionMenu>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-3 pl-[52px]">
                <AppBadge :variant="roleBadge(user)">{{ roleLabel(user) }}</AppBadge>
                <AppBadge :variant="user.is_active ? 'green' : 'red'">{{ user.is_active ? 'Active' : 'Inactive' }}</AppBadge>
                <span class="text-[11px] text-gray-400">Added {{ formatDate(user.created_at) }}</span>
              </div>
            </div>
          </div>
        </AppCard>

        <AppCard class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-[12px] text-gray-500 dark:text-gray-500">
            Showing <span class="font-medium text-gray-900 dark:text-white">{{ meta?.from ?? 0 }}</span>
            to <span class="font-medium text-gray-900 dark:text-white">{{ meta?.to ?? 0 }}</span>
            of <span class="font-medium text-gray-900 dark:text-white">{{ meta?.total ?? 0 }}</span> users
          </p>
          <div class="flex items-center gap-2">
            <AppButton variant="secondary" size="sm" :disabled="!canGoPrevious" @click="page--">Previous</AppButton>
            <span class="rounded-[9px] bg-gray-950/[0.04] px-3 py-2 text-[12px] font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
              Page {{ meta?.current_page ?? 1 }} / {{ meta?.last_page ?? 1 }}
            </span>
            <AppButton variant="secondary" size="sm" :disabled="!canGoNext" @click="page++">Next</AppButton>
          </div>
        </AppCard>
      </template>
    </div>

    <UserFormModal
      :open="formOpen"
      :mode="formMode"
      :user="selectedUser"
      :available-roles="availableRoles"
      @close="formOpen = false"
      @saved="afterSaved"
    />

    <AppConfirmModal
      :open="statusOpen"
      :title="userForStatus?.is_active ? 'Deactivate account?' : 'Activate account?'"
      :message="userForStatus?.is_active
        ? `“${userForStatus?.name || 'This user'}” will be signed out everywhere and will not be able to log in.`
        : `“${userForStatus?.name || 'This user'}” will be able to sign in to the backoffice again.`"
      :confirm-label="userForStatus?.is_active ? 'Deactivate' : 'Activate'"
      :loading="statusSaving"
      :error="statusError"
      @close="statusOpen = false"
      @confirm="confirmStatus"
    />
  </section>
</template>
