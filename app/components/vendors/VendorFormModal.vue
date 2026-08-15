<script setup lang="ts">
type Vendor = {
 id: number
 name: string
 code: string
 company_name: string | null
 contact_person: string | null
 email: string | null
 phone: string | null
 secondary_phone: string | null
 tax_number: string | null
 address: string | null
 city: string | null
 country: string | null
 opening_balance: string | number
 current_balance: string | number
 notes: string | null
 is_active: boolean
 sort_order: number
}

type VendorResponse = {
 data: Vendor
 message?: string
}

const props = defineProps<{
 open: boolean
 mode: 'create' | 'edit'
 vendor?: Vendor | null
}>()

const emit = defineEmits<{
 close: []
 saved: [vendor: Vendor, message?: string]
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const form = reactive({
 name: '',
 code: '',
 company_name: '',
 contact_person: '',
 email: '',
 phone: '',
 secondary_phone: '',
 tax_number: '',
 address: '',
 city: '',
 country: 'United Arab Emirates',
 opening_balance: 0,
 current_balance: 0,
 notes: '',
 is_active: true,
 sort_order: 0,
})

const title = computed(() => props.mode === 'create' ? 'Add vendor' : 'Edit vendor')

const description = computed(() => {
 return props.mode === 'create'
 ? 'Create a supplier profile for purchasing, vendor payments and stock receiving.'
 : 'Update supplier profile, contact details and account balance.'
})

watch(
 () => [props.open, props.vendor, props.mode] as const,
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

 form.name = props.vendor?.name ?? ''
 form.code = props.vendor?.code ?? ''
 form.company_name = props.vendor?.company_name ?? ''
 form.contact_person = props.vendor?.contact_person ?? ''
 form.email = props.vendor?.email ?? ''
 form.phone = props.vendor?.phone ?? ''
 form.secondary_phone = props.vendor?.secondary_phone ?? ''
 form.tax_number = props.vendor?.tax_number ?? ''
 form.address = props.vendor?.address ?? ''
 form.city = props.vendor?.city ?? ''
 form.country = props.vendor?.country ?? 'United Arab Emirates'
 form.opening_balance = props.vendor?.opening_balance ?? 0
 form.current_balance = props.vendor?.current_balance ?? props.vendor?.opening_balance ?? 0
 form.notes = props.vendor?.notes ?? ''
 form.is_active = props.vendor?.is_active ?? true
 form.sort_order = props.vendor?.sort_order ?? 0
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

 if (
 message.toLowerCase().includes('duplicate entry')
 || message.toLowerCase().includes('vendors_code_unique')
 ) {
 return 'A vendor with this code already exists. Use a different code.'
 }

 if (firstFieldError) return String(firstFieldError)

 return message || 'Could not save vendor. Please check the form and try again.'
}

function payload() {
 return {
 name: form.name,
 code: normalizedCode(form.code),
 company_name: form.company_name || null,
 contact_person: form.contact_person || null,
 email: form.email || null,
 phone: form.phone || null,
 secondary_phone: form.secondary_phone || null,
 tax_number: form.tax_number || null,
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
 const response = await $api<VendorResponse>(
 props.mode === 'create' ? '/admin/vendors' : `/admin/vendors/${props.vendor?.id}`,
 {
 method: props.mode === 'create' ? 'POST' : 'PATCH',
 body: payload(),
 },
 )

 emit('saved', response.data, response.message || 'Vendor saved successfully.')
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
 <div class="flex flex-col gap-1">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Vendor identity
 </h3>

 <p class="text-[12px] text-gray-500 dark:text-gray-500">
 Basic supplier name, unique code and company details.
 </p>
 </div>

 <div class="mt-5 grid gap-5 lg:grid-cols-2">
 <AppInput
 v-model="form.name"
 label="Vendor name"
 placeholder="Example: Saaj Textile Supplier"
 :error="fieldErrors.name"
 required
 />

 <AppInput
 v-model="form.code"
 label="Vendor code"
 placeholder="Auto from name if empty"
 :error="fieldErrors.code"
 @blur="normalizeCode"
 />

 <AppInput
 v-model="form.company_name"
 label="Company name"
 placeholder="Registered company name"
 :error="fieldErrors.company_name"
 />

 <AppInput
 v-model="form.contact_person"
 label="Contact person"
 placeholder="Main contact name"
 :error="fieldErrors.contact_person"
 />
 </div>
 </section>

 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <div class="flex flex-col gap-1">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Contact and address
 </h3>

 <p class="text-[12px] text-gray-500 dark:text-gray-500">
 Used later for purchase orders, vendor statements and payment records.
 </p>
 </div>

 <div class="mt-5 grid gap-5 lg:grid-cols-2">
 <AppInput
 v-model="form.email"
 label="Email"
 type="email"
 placeholder="supplier@example.com"
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
 v-model="form.tax_number"
 label="Tax number"
 placeholder="TRN / VAT / GST number"
 :error="fieldErrors.tax_number"
 />

 <AppInput
 v-model="form.city"
 label="City"
 placeholder="Dubai"
 :error="fieldErrors.city"
 />

 <AppInput
 v-model="form.country"
 label="Country"
 placeholder="United Arab Emirates"
 :error="fieldErrors.country"
 />

 <AppTextarea
 v-model="form.address"
 class="lg:col-span-2"
 label="Address"
 placeholder="Supplier address"
 :rows="3"
 :error="fieldErrors.address"
 />
 </div>
 </section>

 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <div class="flex flex-col gap-1">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Account and controls
 </h3>

 <p class="text-[12px] text-gray-500 dark:text-gray-500">
 Opening balance is for previous supplier payable or credit before using this ERP.
 </p>
 </div>

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

 <AppInput
 v-model="form.sort_order"
 label="Sort order"
 type="number"
 :error="fieldErrors.sort_order"
 />

 <AppToggle
 v-model="form.is_active"
 label="Active vendor"
 description="Inactive vendors stay in history but are hidden from normal purchasing flows."
 />

 <AppTextarea
 v-model="form.notes"
 class="lg:col-span-2"
 label="Internal notes"
 placeholder="Payment terms, preferred contact time, quality notes, etc."
 :rows="3"
 :error="fieldErrors.notes"
 />
 </div>
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
 {{ saving ? 'Saving...' : 'Save vendor' }}
 </AppButton>
 </div>
 </form>
 </AppModal>
</template>