<script setup lang="ts">
type LocationOption = { id: number, name: string }

type ZoneLocation = {
  id?: number
  country_id: number
  country_name?: string
  state_id: number | null
  state_name?: string | null
  city_id: number | null
  city_name?: string | null
  scope?: 'country' | 'state' | 'city'
}

type ShippingZone = {
  id: number
  name: string
  locations: ZoneLocation[]
  base_price: string | number
  price_per_item: string | number
  free_shipping_threshold: string | number | null
  is_default: boolean
  is_active: boolean
  sort_order: number
}

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  zone?: ShippingZone | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const form = reactive({
  name: '',
  base_price: '0',
  price_per_item: '0',
  free_shipping_threshold: '',
  is_default: false,
  is_active: true,
  sort_order: 0,
  locations: [] as ZoneLocation[],
})

// Rule builder — the location rule currently being configured, before
// it's added to form.locations.
const ruleCountryId = ref<number | null>(null)
const ruleStateId = ref<number | null>(null)
const ruleCityId = ref<number | null>(null)

const countries = ref<LocationOption[]>([])
const states = ref<LocationOption[]>([])
const cities = ref<LocationOption[]>([])
const loadingStates = ref(false)
const loadingCities = ref(false)

const title = computed(() => props.mode === 'create' ? 'Add shipping zone' : 'Edit shipping zone')

watch(
  () => [props.open, props.zone, props.mode] as const,
  async () => {
    if (!props.open) return
    await resetForm()
  },
  { immediate: true },
)

async function resetForm() {
  formError.value = ''
  fieldErrors.value = {}
  ruleCountryId.value = null
  ruleStateId.value = null
  ruleCityId.value = null
  states.value = []
  cities.value = []

  form.name = props.zone?.name ?? ''
  form.base_price = props.zone ? String(props.zone.base_price) : '0'
  form.price_per_item = props.zone ? String(props.zone.price_per_item) : '0'
  form.free_shipping_threshold = props.zone?.free_shipping_threshold != null ? String(props.zone.free_shipping_threshold) : ''
  form.is_default = props.zone?.is_default ?? false
  form.is_active = props.zone?.is_active ?? true
  form.sort_order = props.zone?.sort_order ?? 0
  form.locations = props.zone ? [...props.zone.locations] : []

  if (countries.value.length === 0) {
    await loadCountries()
  }

  // Only one country exists today — pick it automatically so the
  // admin doesn't have to click through a dropdown with one option.
  if (countries.value.length === 1) {
    ruleCountryId.value = countries.value[0].id
    await loadStates(ruleCountryId.value)
  }
}

async function loadCountries() {
  try {
    const response = await $api<{ data: LocationOption[] }>('/locations/countries')

    countries.value = response.data
  } catch {
    countries.value = []
  }
}

async function loadStates(countryId: number) {
  loadingStates.value = true
  states.value = []
  ruleStateId.value = null
  cities.value = []
  ruleCityId.value = null

  try {
    const response = await $api<{ data: LocationOption[] }>('/locations/states', {
      query: { country_id: countryId },
    })

    states.value = response.data
  } catch {
    states.value = []
  } finally {
    loadingStates.value = false
  }
}

async function loadCities(stateId: number) {
  loadingCities.value = true
  cities.value = []
  ruleCityId.value = null

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

watch(ruleCountryId, (value) => {
  if (value !== null) loadStates(value)
})

watch(ruleStateId, (value) => {
  if (value !== null) loadCities(value)
  else {
    cities.value = []
    ruleCityId.value = null
  }
})

const countryOptions = computed(() => countries.value.map((c) => ({ label: c.name, value: c.id })))

const stateOptions = computed(() => [
  { label: 'All provinces / territories', value: null },
  ...states.value.map((s) => ({ label: s.name, value: s.id })),
])

const cityOptions = computed(() => [
  { label: 'All cities in this province', value: null },
  ...cities.value.map((c) => ({ label: c.name, value: c.id })),
])

function ruleLabel(location: ZoneLocation): string {
  if (location.city_id) return `${location.city_name} (${location.state_name})`
  if (location.state_id) return `${location.state_name} — entire province`
  return `${location.country_name} — entire country`
}

function addRule() {
  if (!ruleCountryId.value) {
    formError.value = 'Choose a country before adding a location rule.'
    return
  }

  const country = countries.value.find((c) => c.id === ruleCountryId.value)
  const state = states.value.find((s) => s.id === ruleStateId.value)
  const city = cities.value.find((c) => c.id === ruleCityId.value)

  const alreadyExists = form.locations.some((l) =>
    l.country_id === ruleCountryId.value
    && l.state_id === ruleStateId.value
    && l.city_id === ruleCityId.value,
  )

  if (alreadyExists) {
    formError.value = 'That location is already added to this zone.'
    return
  }

  formError.value = ''

  form.locations.push({
    country_id: ruleCountryId.value,
    country_name: country?.name,
    state_id: ruleStateId.value,
    state_name: state?.name ?? null,
    city_id: ruleCityId.value,
    city_name: city?.name ?? null,
  })

  ruleStateId.value = null
  ruleCityId.value = null
}

function removeRule(index: number) {
  form.locations.splice(index, 1)
}

function normalizeErrors(error: any) {
  const errors = error?.data?.errors || {}
  const normalized: Record<string, string> = {}

  Object.keys(errors).forEach((key) => {
    normalized[key] = Array.isArray(errors[key]) ? errors[key][0] : String(errors[key])
  })

  return normalized
}

function buildPayload() {
  return {
    name: form.name,
    locations: form.locations.map((l) => ({
      country_id: l.country_id,
      state_id: l.state_id,
      city_id: l.city_id,
    })),
    base_price: Number(form.base_price || 0),
    price_per_item: Number(form.price_per_item || 0),
    free_shipping_threshold: form.free_shipping_threshold === '' ? null : Number(form.free_shipping_threshold),
    is_default: form.is_default,
    is_active: form.is_active,
    sort_order: Number(form.sort_order || 0),
  }
}

async function submit() {
  saving.value = true
  formError.value = ''
  fieldErrors.value = {}

  if (form.locations.length === 0) {
    formError.value = 'Add at least one location rule before saving.'
    saving.value = false
    return
  }

  try {
    if (props.mode === 'create') {
      await $api('/admin/shipping-zones', {
        method: 'POST',
        body: buildPayload(),
      })
    } else if (props.zone) {
      await $api(`/admin/shipping-zones/${props.zone.id}`, {
        method: 'PUT',
        body: buildPayload(),
      })
    }

    emit('saved')
  } catch (error: any) {
    fieldErrors.value = normalizeErrors(error)
    formError.value = extractApiErrorMessage(error, 'Could not save this shipping zone.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    description="Add one or more location rules — a whole country, a province, or a specific city. The most specific match wins at checkout."
    max-width="max-w-2xl"
    @close="emit('close')"
  >
    <form
      id="shipping-zone-form"
      @submit.prevent="submit"
    >
      <div class="px-4 py-5 sm:px-5">
        <div class="grid gap-5">
          <AppInput
            v-model="form.name"
            label="Zone name"
            placeholder="Example: Punjab, Lahore Express..."
            :error="fieldErrors.name"
            required
          />

          <div class="rounded-[14px] border border-gray-200 p-4 dark:border-white/10">
            <p class="text-[12px] font-semibold uppercase tracking-[0.06em] text-gray-400">
              Add a location
            </p>

            <div class="mt-3 grid gap-3 sm:grid-cols-3">
              <AppSelect
                v-model="ruleCountryId"
                label="Country"
                :options="countryOptions"
              />

              <AppSelect
                v-model="ruleStateId"
                label="Province / territory"
                :options="stateOptions"
                :loading="loadingStates"
                :disabled="!ruleCountryId"
              />

              <AppSelect
                v-model="ruleCityId"
                label="City"
                :options="cityOptions"
                :loading="loadingCities"
                :disabled="!ruleStateId"
                searchable
              />
            </div>

            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              class="mt-3"
              @click="addRule"
            >
              Add this location
            </AppButton>
          </div>

          <div v-if="form.locations.length > 0">
            <p class="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-gray-400">
              Locations in this zone
            </p>

            <ul class="space-y-2">
              <li
                v-for="(location, index) in form.locations"
                :key="`${location.country_id}-${location.state_id}-${location.city_id}`"
                class="flex items-center justify-between rounded-[10px] bg-gray-950/[0.03] px-3 py-2 text-sm dark:bg-white/[0.05]"
              >
                <span class="text-gray-700 dark:text-gray-300">{{ ruleLabel(location) }}</span>

                <button
                  type="button"
                  class="text-[12px] font-medium text-red-600 hover:underline dark:text-red-400"
                  @click="removeRule(index)"
                >
                  Remove
                </button>
              </li>
            </ul>
          </div>

          <div class="grid gap-5 sm:grid-cols-2">
            <AppInput
              v-model="form.base_price"
              type="number"
              label="Base price"
              placeholder="0.00"
              :error="fieldErrors.base_price"
            />

            <AppInput
              v-model="form.price_per_item"
              type="number"
              label="Price per item"
              placeholder="0.00"
              :error="fieldErrors.price_per_item"
            />
          </div>

          <AppInput
            v-model="form.free_shipping_threshold"
            type="number"
            label="Free shipping above (optional)"
            placeholder="Leave empty for no free-shipping threshold"
            :error="fieldErrors.free_shipping_threshold"
          />

          <div class="grid gap-5 sm:grid-cols-2">
            <AppToggle
              v-model="form.is_default"
              label="Default zone"
              description="Used when a customer's city doesn't match any location rule."
            />

            <AppToggle
              v-model="form.is_active"
              label="Active"
              description="Inactive zones are never matched at checkout."
            />
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <div
        v-if="formError"
        class="mb-4 rounded-[12px] bg-red-500/[0.07] p-4 text-sm leading-6 text-red-700 dark:bg-red-500/10 dark:text-red-300"
        aria-live="polite"
      >
        {{ formError }}
      </div>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AppButton
          type="button"
          variant="secondary"
          :disabled="saving"
          @click="emit('close')"
        >
          Cancel
        </AppButton>

        <AppButton
          type="submit"
          form="shipping-zone-form"
          :loading="saving"
        >
          {{ saving ? 'Saving...' : mode === 'create' ? 'Create zone' : 'Save changes' }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
