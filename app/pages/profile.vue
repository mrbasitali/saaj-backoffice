<script setup lang="ts">
import type { SaajUser } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

const { $api } = useNuxtApp()
const auth = useAuthStore()
const { formatDate } = useAppDateTime()

const detailsSaving = ref(false)
const passwordSaving = ref(false)
const sessionsSaving = ref(false)
const sessionsOpen = ref(false)

const detailsError = ref('')
const passwordError = ref('')
const sessionsError = ref('')
const detailsFieldErrors = ref<Record<string, string>>({})
const passwordFieldErrors = ref<Record<string, string>>({})
const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const detailsForm = reactive({
  name: '',
  email: '',
})

const passwordForm = reactive({
  current_password: '',
  password: '',
  password_confirmation: '',
})

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  sales_staff: 'Sales Staff',
  inventory_staff: 'Inventory Staff',
}

const initials = computed(() => (auth.user?.name || 'SA')
  .split(' ')
  .filter(Boolean)
  .map(part => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase())

const primaryRole = computed(() => auth.user?.roles[0] || '')
const roleLabel = computed(() => roleLabels[primaryRole.value] || primaryRole.value || 'Staff')
const canManageUsers = computed(() => auth.hasRole('super_admin', 'admin'))

watch(
  () => auth.user,
  (user) => {
    detailsForm.name = user?.name ?? ''
    detailsForm.email = user?.email ?? ''
  },
  { immediate: true, deep: true },
)

function normalizeErrors(error: any) {
  const errors = error?.data?.errors || {}
  const normalized: Record<string, string> = {}

  Object.keys(errors).forEach((key) => {
    normalized[key] = Array.isArray(errors[key]) ? errors[key][0] : String(errors[key])
  })

  return normalized
}

function showNotice(message: string) {
  notice.value = message
  if (noticeTimer.value) clearTimeout(noticeTimer.value)
  noticeTimer.value = setTimeout(() => { notice.value = '' }, 4000)
}

async function saveDetails() {
  detailsSaving.value = true
  detailsError.value = ''
  detailsFieldErrors.value = {}

  try {
    const response = await $api<{ message: string, user: SaajUser }>('/profile', {
      method: 'PATCH',
      body: detailsForm,
    })

    auth.setUser(response.user)
    showNotice(response.message)
  } catch (error: any) {
    detailsFieldErrors.value = normalizeErrors(error)
    detailsError.value = extractApiErrorMessage(error, 'Could not update your profile.')
  } finally {
    detailsSaving.value = false
  }
}

async function savePassword() {
  passwordSaving.value = true
  passwordError.value = ''
  passwordFieldErrors.value = {}

  try {
    const response = await $api<{ message: string }>('/profile/password', {
      method: 'PUT',
      body: passwordForm,
    })

    passwordForm.current_password = ''
    passwordForm.password = ''
    passwordForm.password_confirmation = ''
    showNotice(response.message)
  } catch (error: any) {
    passwordFieldErrors.value = normalizeErrors(error)
    passwordError.value = extractApiErrorMessage(error, 'Could not update your password.')
  } finally {
    passwordSaving.value = false
  }
}

async function closeOtherSessions() {
  sessionsSaving.value = true
  sessionsError.value = ''

  try {
    const response = await $api<{ message: string }>('/profile/sessions', { method: 'DELETE' })
    sessionsOpen.value = false
    showNotice(response.message)
  } catch (error: any) {
    sessionsError.value = extractApiErrorMessage(error, 'Could not close your other sessions.')
  } finally {
    sessionsSaving.value = false
  }
}

function openSessionsConfirmation() {
  sessionsError.value = ''
  sessionsOpen.value = true
}
</script>

<template>
  <section class="mx-auto max-w-[1180px]">
    <div class="space-y-4 sm:space-y-5">
      <AppPageHeader
        eyebrow="Account"
        title="My Profile"
        description="Keep your personal details, password, and signed-in sessions secure."
      >
        <template #actions>
          <AppButton v-if="canManageUsers" variant="secondary" to="/users">
            Manage users
          </AppButton>
        </template>
      </AppPageHeader>

      <div
        v-if="notice"
        class="rounded-[12px] bg-emerald-500/[0.07] p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      >
        {{ notice }}
      </div>

      <AppCard class="relative overflow-hidden">
        <div class="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-gray-950 via-gray-800 to-gray-700 dark:from-white/[0.12] dark:via-white/[0.07] dark:to-transparent" />
        <div class="relative px-5 pb-5 pt-14 sm:px-7 sm:pb-7 sm:pt-16">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div class="flex h-24 w-24 shrink-0 items-center justify-center rounded-[24px] bg-white text-[28px] font-semibold tracking-[-0.04em] text-gray-900 shadow-[0_8px_28px_rgba(17,24,39,0.16)] ring-4 ring-white dark:bg-[#17181b] dark:text-white dark:ring-[#111214]">
              {{ initials }}
            </div>
            <div class="min-w-0 flex-1 sm:pb-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="truncate text-xl font-semibold tracking-[-0.025em] text-gray-950 dark:text-white">
                  {{ auth.user?.name }}
                </h2>
                <AppBadge :variant="auth.user?.is_active ? 'green' : 'red'">
                  {{ auth.user?.is_active ? 'Active' : 'Inactive' }}
                </AppBadge>
              </div>
              <p class="mt-1 truncate text-[13px] text-gray-500 dark:text-gray-400">{{ auth.user?.email }}</p>
              <div class="mt-3 flex flex-wrap items-center gap-3">
                <AppBadge variant="blue">{{ roleLabel }}</AppBadge>
                <span class="text-[11px] text-gray-400 dark:text-gray-500">
                  Member since {{ formatDate(auth.user?.created_at) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </AppCard>

      <div class="grid gap-4 lg:grid-cols-2">
        <AppCard class="p-5 sm:p-6">
          <div>
            <p class="text-[15px] font-semibold text-gray-950 dark:text-white">Personal details</p>
            <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
              This name appears on invoices, receipts, and staff activity.
            </p>
          </div>

          <form class="mt-5 grid gap-4" @submit.prevent="saveDetails">
            <AppInput
              v-model="detailsForm.name"
              label="Full name"
              autocomplete="name"
              :error="detailsFieldErrors.name"
              required
            />
            <AppInput
              v-model="detailsForm.email"
              label="Email address"
              type="email"
              autocomplete="email"
              :error="detailsFieldErrors.email"
              required
            />

            <div
              v-if="detailsError"
              class="rounded-[10px] bg-red-500/[0.07] px-3 py-2.5 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300"
            >
              {{ detailsError }}
            </div>

            <div class="flex justify-end pt-1">
              <AppButton type="submit" :loading="detailsSaving">Save details</AppButton>
            </div>
          </form>
        </AppCard>

        <AppCard class="p-5 sm:p-6">
          <div>
            <p class="text-[15px] font-semibold text-gray-950 dark:text-white">Change password</p>
            <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
              Use at least 8 characters. Other signed-in sessions close after the change.
            </p>
          </div>

          <form class="mt-5 grid gap-4" @submit.prevent="savePassword">
            <AppPasswordInput
              v-model="passwordForm.current_password"
              label="Current password"
              autocomplete="current-password"
              :error="passwordFieldErrors.current_password"
              required
            />
            <div class="grid gap-4 sm:grid-cols-2">
              <AppPasswordInput
                v-model="passwordForm.password"
                label="New password"
                autocomplete="new-password"
                :error="passwordFieldErrors.password"
                required
              />
              <AppPasswordInput
                v-model="passwordForm.password_confirmation"
                label="Confirm password"
                autocomplete="new-password"
                :error="passwordFieldErrors.password_confirmation"
                required
              />
            </div>

            <div
              v-if="passwordError"
              class="rounded-[10px] bg-red-500/[0.07] px-3 py-2.5 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300"
            >
              {{ passwordError }}
            </div>

            <div class="flex justify-end pt-1">
              <AppButton type="submit" :loading="passwordSaving">Update password</AppButton>
            </div>
          </form>
        </AppCard>
      </div>

      <AppCard class="p-5 sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gray-950/[0.045] text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
              <AppNavIcon name="logout" :size="18" />
            </div>
            <div>
              <p class="text-[13px] font-semibold text-gray-900 dark:text-white">Signed-in sessions</p>
              <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
                Close every other backoffice session while keeping this device signed in.
              </p>
            </div>
          </div>
          <AppButton variant="secondary" @click="openSessionsConfirmation">Sign out other devices</AppButton>
        </div>
      </AppCard>
    </div>

    <AppConfirmModal
      :open="sessionsOpen"
      title="Sign out other devices?"
      message="Every other active backoffice session for your account will be revoked. This device will stay signed in."
      confirm-label="Sign out others"
      :loading="sessionsSaving"
      :error="sessionsError"
      @close="sessionsOpen = false"
      @confirm="closeOtherSessions"
    />
  </section>
</template>
