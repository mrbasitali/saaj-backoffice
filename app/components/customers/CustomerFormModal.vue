<script setup lang="ts">
type CustomerAddress = {
 id: number
 label: string | null
 recipient_name: string
 recipient_phone: string
 address_line1: string
 address_line2: string | null
 country_name?: string | null
 state_name?: string | null
 city_name?: string | null
 postal_code: string | null
 is_default: boolean
}

type Customer = {
 id: number
 code: string
 name: string
 email: string | null
 phone: string | null
 secondary_phone: string | null
 gender: string | null
 date_of_birth: string | null
 address: string | null
 city: string | null
 country: string | null
 opening_balance: string | number
 current_balance: string | number
 notes: string | null
 is_active: boolean
 sort_order: number
 addresses?: CustomerAddress[]
}

type CustomerResponse = {
 data: Customer
 message?: string
}

const props = defineProps<{
 open: boolean
 mode: 'create' | 'edit'
 customer?: Customer | null
}>()

const emit = defineEmits<{
 close: []
 saved: [customer: Customer, message?: string]
 'addresses-changed': []
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const form = reactive({
 code: '',
 name: '',
 email: '',
 phone: '',
 secondary_phone: '',
 gender: null as string | null,
 date_of_birth: '',
 address: '',
 city: '',
 country: 'Pakistan',
 opening_balance: 0,
 current_balance: 0,
 notes: '',
 is_active: true,
 sort_order: 0,
})

const title = computed(() => props.mode === 'create' ? 'Add customer' : 'Edit customer')

const description = computed(() => {
 return props.mode === 'create'
 ? 'Create a customer profile for sales, payments, statements and future ecommerce accounts.'
 : 'Update customer profile, contact details and account balance.'
})

const genderOptions = [
 { label: 'Not specified', value: null },
 { label: 'Male', value: 'male' },
 { label: 'Female', value: 'female' },
 { label: 'Other', value: 'other' },
]

watch(
 () => [props.open, props.customer, props.mode] as const,
 () => {
 if (!props.open) return
 resetForm()
 },
 { immediate: true },
)

watch(
 () => form.opening_balance,
 () => {
 if (props.mode === 'create') {
 form.current_balance = Number(form.opening_balance || 0)
 }
 },
)

function resetForm() {
 formError.value = ''
 fieldErrors.value = {}

 form.code = props.customer?.code ?? ''
 form.name = props.customer?.name ?? ''
 form.email = props.customer?.email ?? ''
 form.phone = props.customer?.phone ?? ''
 form.secondary_phone = props.customer?.secondary_phone ?? ''
 form.gender = props.customer?.gender ?? null
 form.date_of_birth = props.customer?.date_of_birth ?? ''
 form.address = props.customer?.address ?? ''
 form.city = props.customer?.city ?? ''
 form.country = props.customer?.country ?? 'Pakistan'
 form.opening_balance = props.customer?.opening_balance ?? 0
 form.current_balance = props.customer?.current_balance ?? props.customer?.opening_balance ?? 0
 form.notes = props.customer?.notes ?? ''
 form.is_active = props.customer?.is_active ?? true
 form.sort_order = props.customer?.sort_order ?? 0
}

function normalizedCode(value: string) {
 return value
 .toLowerCase()
 .replace(/[^a-z0-9_\s-]/g, '')
 .trim()
 .replace(/[\s-]+/g, '_')
}

function normalizeCode() {
 form.code = normalizedCode(form.code)
}

function syncOpeningBalance() {
 if (props.mode === 'create') {
 form.current_balance = Number(form.opening_balance || 0)
 }
}

function normalizeErrors(error: any) {
 const errors = error?.data?.errors || {}
 const normalized: Record<string, string> = {}

 Object.keys(errors).forEach((key) => {
 normalized[key] = Array.isArray(errors[key]) ? errors[key][0] : String(errors[key])
 })

 return normalized
}

function friendlyErrorMessage(error: any) {
 const message = String(error?.data?.message || '')
 const firstFieldError = Object.values(fieldErrors.value)[0]

 if (message.toLowerCase().includes('duplicate entry')) {
 return 'A customer with this code, email or phone already exists.'
 }

 if (firstFieldError) return String(firstFieldError)

 return message || 'Could not save customer. Please check the form and try again.'
}

function payload() {
 return {
 code: form.code ? normalizedCode(form.code) : undefined,
 name: form.name,
 email: form.email || null,
 phone: form.phone || null,
 secondary_phone: form.secondary_phone || null,
 gender: form.gender || null,
 date_of_birth: form.date_of_birth || null,
 address: form.address || null,
 city: form.city || null,
 country: form.country || null,
 opening_balance: Number(form.opening_balance || 0),
 current_balance: Number(form.current_balance || 0),
 notes: form.notes || null,
 is_active: form.is_active,
 sort_order: Number(form.sort_order || 0),
 }
}

async function submit() {
 saving.value = true
 formError.value = ''
 fieldErrors.value = {}

 try {
 const response = await $api<CustomerResponse>(
 props.mode === 'create' ? '/admin/customers' : `/admin/customers/${props.customer?.id}`,
 {
 method: props.mode === 'create' ? 'POST' : 'PATCH',
 body: payload(),
 },
 )

 emit('saved', response.data, response.message || 'Customer saved successfully.')
 } catch (error: any) {
 fieldErrors.value = normalizeErrors(error)
 formError.value = friendlyErrorMessage(error)
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
 max-width="max-w-5xl"
 @close="emit('close')"
 >
 <form @submit.prevent="submit">
 <div class="p-4 sm:p-5">
 <div
 v-if="formError"
 class="mb-5 rounded-[12px] bg-red-500/[0.07] p-4 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
 >
 {{ formError }}
 </div>

 <div class="grid gap-6">
 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Customer identity
 </h3>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Customer name, internal code and optional profile information.
 </p>

 <div class="mt-5 grid gap-5 lg:grid-cols-2">
 <AppInput
 v-model="form.name"
 label="Customer name"
 placeholder="Example: Basit Ali"
 :error="fieldErrors.name"
 required
 />

 <AppInput
 v-model="form.code"
 label="Customer code"
 placeholder="Auto generated if empty"
 :error="fieldErrors.code"
 @blur="normalizeCode"
 />

 <AppSelect
 v-model="form.gender"
 label="Gender"
 :options="genderOptions"
 />

 <AppInput
 v-model="form.date_of_birth"
 label="Date of birth"
 type="date"
 :error="fieldErrors.date_of_birth"
 />
 </div>
 </section>

 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Contact and address
 </h3>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Used later for sales invoices, deliveries, customer statements and customer support.
 </p>

 <div class="mt-5 grid gap-5 lg:grid-cols-2">
 <AppInput
 v-model="form.email"
 label="Email"
 type="email"
 placeholder="customer@example.com"
 :error="fieldErrors.email"
 />

 <AppInput
 v-model="form.phone"
 label="Phone"
 placeholder="+971..."
 :error="fieldErrors.phone"
 />

 <AppInput
 v-model="form.secondary_phone"
 label="Secondary phone"
 placeholder="Optional"
 :error="fieldErrors.secondary_phone"
 />

 <AppInput
 v-model="form.city"
 label="City"
 placeholder="e.g. Chichawatni"
 :error="fieldErrors.city"
 />

 <AppInput
 v-model="form.country"
 label="Country"
 placeholder="Pakistan"
 :error="fieldErrors.country"
 />

 <AppInput
 v-model="form.sort_order"
 label="Sort order"
 type="number"
 :error="fieldErrors.sort_order"
 />

 <AppTextarea
 v-model="form.address"
 class="lg:col-span-2"
 label="Address"
 placeholder="Customer address"
 :rows="3"
 :error="fieldErrors.address"
 />
 </div>
 </section>

 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Account and controls
 </h3>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Opening balance is for any existing receivable before using this ERP.
 </p>

 <div class="mt-5 grid gap-5 lg:grid-cols-2">
 <AppInput
 v-model="form.opening_balance"
 label="Opening balance"
 type="number"
 :error="fieldErrors.opening_balance"
 @blur="syncOpeningBalance"
 />

 <AppInput
 v-model="form.current_balance"
 label="Current balance"
 type="number"
 :error="fieldErrors.current_balance"
 />

 <AppToggle
 v-model="form.is_active"
 label="Active customer"
 description="Inactive customers stay in history but are hidden from normal sales flows."
 />

 <AppTextarea
 v-model="form.notes"
 class="lg:col-span-2"
 label="Internal notes"
 placeholder="Preferences, delivery notes, customer support notes, sizing notes..."
 :rows="3"
 :error="fieldErrors.notes"
 />
 </div>
 </section>

 <section
 v-if="mode === 'edit' && customer"
 class="border-t border-gray-100 px-4 py-5 dark:border-white/10 sm:px-5"
 >
 <CustomerAddressManager
 :customer-id="customer.id"
 :addresses="customer.addresses || []"
 @changed="emit('addresses-changed')"
 />
 </section>
 </div>
 </div>

 <div class="sticky bottom-0 z-10 flex flex-col-reverse gap-2 bg-white/95 px-4 py-3 shadow-[0_-1px_0_rgba(17,24,39,0.055)] backdrop-blur-xl dark:bg-[#111214]/95 dark:shadow-[0_-1px_0_rgba(255,255,255,0.055)] sm:flex-row sm:justify-end sm:px-5">
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
 :loading="saving"
 >
 {{ saving ? 'Saving...' : 'Save customer' }}
 </AppButton>
 </div>
 </form>
 </AppModal>
</template>