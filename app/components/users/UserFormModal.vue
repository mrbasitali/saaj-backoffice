<script setup lang="ts">
type StaffUser = {
  id: number
  name: string
  email: string
  is_active: boolean
  roles: string[]
  created_at: string | null
  updated_at: string | null
}

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  user?: StaffUser | null
  availableRoles: string[]
}>()

const emit = defineEmits<{
  close: []
  saved: [message: string]
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const form = reactive({
  name: '',
  email: '',
  role: '',
  is_active: true,
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

const roleHints: Record<string, string> = {
  super_admin: 'Full access, including administrators and account security.',
  admin: 'Store configuration and day-to-day administration.',
  manager: 'Catalog, operations, transactions, and reports.',
  sales_staff: 'Sales, customer payments, and related workflows.',
  inventory_staff: 'Purchasing, receiving, stock, and inventory workflows.',
}

const roleOptions = computed(() => props.availableRoles.map((role) => ({
  label: roleLabels[role] || role,
  value: role,
  hint: roleHints[role] || null,
})))

const title = computed(() => props.mode === 'create' ? 'Add staff user' : 'Edit staff user')
const description = computed(() => props.mode === 'create'
  ? 'Create a secure backoffice account and choose the right access level.'
  : 'Update account details, permissions, status, or set a new password.')

watch(
  () => [props.open, props.mode, props.user, props.availableRoles] as const,
  () => {
    if (!props.open) return
    resetForm()
  },
  { immediate: true },
)

function resetForm() {
  formError.value = ''
  fieldErrors.value = {}
  form.name = props.user?.name ?? ''
  form.email = props.user?.email ?? ''
  form.role = props.user?.roles[0] ?? props.availableRoles[0] ?? ''
  form.is_active = props.user?.is_active ?? true
  form.password = ''
  form.password_confirmation = ''
}

function normalizeErrors(error: any) {
  const errors = error?.data?.errors || {}
  const normalized: Record<string, string> = {}

  Object.keys(errors).forEach((key) => {
    normalized[key] = Array.isArray(errors[key]) ? errors[key][0] : String(errors[key])
  })

  return normalized
}

async function submit() {
  saving.value = true
  formError.value = ''
  fieldErrors.value = {}

  const body: Record<string, string | boolean> = {
    name: form.name,
    email: form.email,
    role: form.role,
    is_active: form.is_active,
  }

  if (props.mode === 'create' || form.password) {
    body.password = form.password
    body.password_confirmation = form.password_confirmation
  }

  try {
    const response = props.mode === 'create'
      ? await $api<{ message: string }>('/admin/users', { method: 'POST', body })
      : await $api<{ message: string }>(`/admin/users/${props.user?.id}`, { method: 'PATCH', body })

    emit('saved', response.message)
  } catch (error: any) {
    fieldErrors.value = normalizeErrors(error)
    formError.value = extractApiErrorMessage(error, 'Could not save this user.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    :description="description"
    max-width="max-w-2xl"
    @close="emit('close')"
  >
    <form @submit.prevent="submit">
      <div class="grid gap-5 px-4 py-5 sm:px-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <AppInput
            v-model="form.name"
            label="Full name"
            placeholder="Staff member name"
            autocomplete="name"
            :error="fieldErrors.name"
            required
          />

          <AppInput
            v-model="form.email"
            label="Email address"
            type="email"
            placeholder="name@example.com"
            autocomplete="email"
            :error="fieldErrors.email"
            required
          />
        </div>

        <AppSelect
          v-model="form.role"
          label="Access role"
          :options="roleOptions"
          :error="fieldErrors.role"
          placeholder="Choose a role"
        />

        <div class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
          <AppToggle
            v-model="form.is_active"
            label="Account active"
            description="Inactive users are signed out and cannot log in until reactivated."
          />
          <p v-if="fieldErrors.is_active" class="mt-2 text-[12px] font-medium text-red-600 dark:text-red-400">
            {{ fieldErrors.is_active }}
          </p>
        </div>

        <div class="shadow-[0_-1px_0_rgba(17,24,39,0.06)] pt-5 dark:shadow-[0_-1px_0_rgba(255,255,255,0.06)]">
          <div class="mb-4">
            <p class="text-[13px] font-semibold text-gray-900 dark:text-white">
              {{ mode === 'create' ? 'Temporary password' : 'Reset password' }}
            </p>
            <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
              {{ mode === 'create'
                ? 'Use at least 8 characters and share it securely with the staff member.'
                : 'Leave both fields empty to keep the current password. Changing it signs the user out everywhere.' }}
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <AppPasswordInput
              v-model="form.password"
              :label="mode === 'create' ? 'Password' : 'New password'"
              autocomplete="new-password"
              :required="mode === 'create'"
              :error="fieldErrors.password"
            />

            <AppPasswordInput
              v-model="form.password_confirmation"
              label="Confirm password"
              autocomplete="new-password"
              :required="mode === 'create'"
              :error="fieldErrors.password_confirmation"
            />
          </div>
        </div>

        <div
          v-if="formError"
          class="rounded-[12px] bg-red-500/[0.07] px-3 py-2.5 text-[12px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
        >
          {{ formError }}
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <AppButton variant="ghost" :disabled="saving" @click="emit('close')">
          Cancel
        </AppButton>
        <AppButton :loading="saving" @click="submit">
          {{ mode === 'create' ? 'Create user' : 'Save changes' }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
