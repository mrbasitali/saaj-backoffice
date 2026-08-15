<script setup lang="ts">
type LocationOption = { id: number, name: string }

type CustomerAddress = {
  id: number
  label: string | null
  recipient_name: string
  recipient_phone: string
  address_line1: string
  address_line2: string | null
  country_id?: number
  country_name?: string | null
  state_id?: number
  state_name?: string | null
  city_id?: number
  city_name?: string | null
  postal_code: string | null
  is_default: boolean
}

const props = defineProps<{
  customerId: number
  addresses: CustomerAddress[]
}>()

const emit = defineEmits<{
  changed: []
}>()

const { $api } = useNuxtApp()

const formOpen = ref(false)
const editingAddress = ref<CustomerAddress | null>(null)
const saving = ref(false)
const formError = ref('')

const deleteTarget = ref<CustomerAddress | null>(null)
const deleting = ref(false)
const deleteError = ref('')

const form = reactive({
  label: '',
  recipient_name: '',
  recipient_phone: '',
  address_line1: '',
  address_line2: '',
  country_id: null as number | null,
  state_id: null as number | null,
  city_id: null as number | null,
  postal_code: '',
  is_default: false,
})

const countries = ref<LocationOption[]>([])
const states = ref<LocationOption[]>([])
const cities = ref<LocationOption[]>([])
const loadingStates = ref(false)
const loadingCities = ref(false)

async function loadCountries() {
  try {
    const response = await $api<{ data: LocationOption[] }>('/locations/countries')

    countries.value = response.data

    if (countries.value.length === 1 && !form.country_id) {
      form.country_id = countries.value[0].id
    }
  } catch {
    countries.value = []
  }
}

async function loadStates(countryId: number, keepStateId?: number | null) {
  loadingStates.value = true
  states.value = []
  cities.value = []

  try {
    const response = await $api<{ data: LocationOption[] }>('/locations/states', {
      query: { country_id: countryId },
    })

    states.value = response.data

    if (keepStateId) await loadCities(keepStateId)
  } catch {
    states.value = []
  } finally {
    loadingStates.value = false
  }
}

async function loadCities(stateId: number) {
  loadingCities.value = true
  cities.value = []

  try {
    const response = await $api<{ data: LocationOption[] }>('/locations/cities', {
      query: { state_id: stateId },
    })

    cities.value = response.data
  } catch {
    cities.value = []
  } finally {
    loadingCities.value = false
  }
}

watch(() => form.country_id, (value, oldValue) => {
  if (value && value !== oldValue) {
    form.state_id = null
    form.city_id = null
    loadStates(value)
  }
})

watch(() => form.state_id, (value, oldValue) => {
  if (value && value !== oldValue) {
    form.city_id = null
    loadCities(value)
  }
})

const countryOptions = computed(() => countries.value.map((c) => ({ label: c.name, value: c.id })))
const stateOptions = computed(() => states.value.map((s) => ({ label: s.name, value: s.id })))
const cityOptions = computed(() => cities.value.map((c) => ({ label: c.name, value: c.id })))

async function openAdd() {
  editingAddress.value = null
  formError.value = ''
  form.label = ''
  form.recipient_name = ''
  form.recipient_phone = ''
  form.address_line1 = ''
  form.address_line2 = ''
  form.country_id = null
  form.state_id = null
  form.city_id = null
  form.postal_code = ''
  form.is_default = false

  if (countries.value.length === 0) await loadCountries()

  formOpen.value = true
}

async function openEdit(address: CustomerAddress) {
  editingAddress.value = address
  formError.value = ''
  form.label = address.label ?? ''
  form.recipient_name = address.recipient_name
  form.recipient_phone = address.recipient_phone
  form.address_line1 = address.address_line1
  form.address_line2 = address.address_line2 ?? ''
  form.postal_code = address.postal_code ?? ''
  form.is_default = address.is_default

  if (countries.value.length === 0) await loadCountries()

  form.country_id = address.country_id ?? countries.value[0]?.id ?? null

  if (form.country_id) await loadStates(form.country_id, address.state_id)

  form.state_id = address.state_id ?? null
  form.city_id = address.city_id ?? null

  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
}

async function submit() {
  saving.value = true
  formError.value = ''

  const payload = {
    label: form.label || null,
    recipient_name: form.recipient_name,
    recipient_phone: form.recipient_phone,
    address_line1: form.address_line1,
    address_line2: form.address_line2 || null,
    country_id: form.country_id,
    state_id: form.state_id,
    city_id: form.city_id,
    postal_code: form.postal_code || null,
    is_default: form.is_default,
  }

  try {
    if (editingAddress.value) {
      await $api(`/admin/customers/${props.customerId}/addresses/${editingAddress.value.id}`, {
        method: 'PUT',
        body: payload,
      })
    } else {
      await $api(`/admin/customers/${props.customerId}/addresses`, {
        method: 'POST',
        body: payload,
      })
    }

    formOpen.value = false
    emit('changed')
  } catch (error: any) {
    formError.value = extractApiErrorMessage(error, 'Could not save this address.')
  } finally {
    saving.value = false
  }
}

function askDelete(address: CustomerAddress) {
  deleteTarget.value = address
  deleteError.value = ''
}

async function confirmDelete() {
  if (!deleteTarget.value) return

  deleting.value = true
  deleteError.value = ''

  try {
    await $api(`/admin/customers/${props.customerId}/addresses/${deleteTarget.value.id}`, {
      method: 'DELETE',
    })

    deleteTarget.value = null
    emit('changed')
  } catch (error: any) {
    deleteError.value = extractApiErrorMessage(error, 'Could not delete this address.')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-semibold text-gray-950 dark:text-white">
          Delivery addresses
        </h3>
        <p class="mt-1 text-[12px] text-gray-400">
          Used for shipping online orders — separate from the general address/city fields above.
        </p>
      </div>

      <AppButton
        type="button"
        variant="secondary"
        size="sm"
        @click="openAdd"
      >
        Add address
      </AppButton>
    </div>

    <AppEmptyState
      v-if="addresses.length === 0"
      class="mt-4"
      title="No delivery addresses yet"
      message="Add one so this customer's online orders have somewhere to ship."
    />

    <div
      v-else
      class="mt-4 grid gap-3 sm:grid-cols-2"
    >
      <div
        v-for="saved in addresses"
        :key="saved.id"
        class="rounded-[12px] border border-gray-200 p-3 text-[13px] dark:border-white/10"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="font-semibold text-gray-950 dark:text-white">
            {{ saved.label || saved.recipient_name }}
          </p>

          <AppBadge
            v-if="saved.is_default"
            variant="blue"
          >
            Default
          </AppBadge>
        </div>

        <p class="mt-1 text-gray-500 dark:text-gray-400">{{ saved.recipient_name }} · {{ saved.recipient_phone }}</p>
        <p class="mt-1 text-gray-500 dark:text-gray-400">
          {{ saved.address_line1 }}<span v-if="saved.address_line2">, {{ saved.address_line2 }}</span>
        </p>
        <p class="text-gray-500 dark:text-gray-400">
          {{ [saved.city_name, saved.state_name, saved.postal_code].filter(Boolean).join(', ') }}
        </p>

        <div class="mt-3 flex gap-3">
          <button
            type="button"
            class="text-[12px] font-medium text-gray-700 hover:underline dark:text-gray-300"
            @click="openEdit(saved)"
          >
            Edit
          </button>

          <button
            type="button"
            class="text-[12px] font-medium text-red-600 hover:underline dark:text-red-400"
            @click="askDelete(saved)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <AppModal
      :open="formOpen"
      :title="editingAddress ? 'Edit delivery address' : 'Add delivery address'"
      max-width="max-w-lg"
      @close="closeForm"
    >
      <form
        id="customer-address-form"
        @submit.prevent="submit"
      >
        <div class="px-4 py-5 sm:px-5">
          <div class="grid gap-4">
            <AppInput
              v-model="form.label"
              label="Label (optional)"
              placeholder="Home, Office..."
            />

            <div class="grid gap-4 sm:grid-cols-2">
              <AppInput
                v-model="form.recipient_name"
                label="Recipient name"
                required
              />

              <AppInput
                v-model="form.recipient_phone"
                label="Recipient phone"
                required
              />
            </div>

            <AppInput
              v-model="form.address_line1"
              label="Address line 1"
              required
            />

            <AppInput
              v-model="form.address_line2"
              label="Address line 2 (optional)"
            />

            <div class="grid gap-4 sm:grid-cols-3">
              <AppSelect
                v-model="form.country_id"
                label="Country"
                :options="countryOptions"
              />

              <AppSelect
                v-model="form.state_id"
                label="Province"
                :options="stateOptions"
                :loading="loadingStates"
                :disabled="!form.country_id"
              />

              <AppSelect
                v-model="form.city_id"
                label="City"
                :options="cityOptions"
                :loading="loadingCities"
                :disabled="!form.state_id"
                searchable
              />
            </div>

            <AppInput
              v-model="form.postal_code"
              label="Postal code (optional)"
            />

            <AppToggle
              v-model="form.is_default"
              label="Default address"
            />
          </div>
        </div>
      </form>

      <template #footer>
        <div
          v-if="formError"
          class="mb-4 rounded-[12px] bg-red-500/[0.07] p-4 text-sm leading-6 text-red-700 dark:bg-red-500/10 dark:text-red-300"
        >
          {{ formError }}
        </div>

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AppButton
            type="button"
            variant="secondary"
            :disabled="saving"
            @click="closeForm"
          >
            Cancel
          </AppButton>

          <AppButton
            type="submit"
            form="customer-address-form"
            :loading="saving"
          >
            {{ saving ? 'Saving...' : editingAddress ? 'Save changes' : 'Add address' }}
          </AppButton>
        </div>
      </template>
    </AppModal>

    <AppConfirmModal
      :open="!!deleteTarget"
      title="Delete address?"
      :message="`This will delete “${deleteTarget?.label || deleteTarget?.recipient_name || 'this address'}”.`"
      confirm-label="Delete address"
      :loading="deleting"
      :error="deleteError"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
