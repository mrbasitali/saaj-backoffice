<script setup lang="ts">
type Vendor = {
 id: number
 name: string
 code: string
 company_name: string | null
 current_balance: string | number
 is_active: boolean
}

type PurchaseInvoice = {
 id: number
 vendor_id: number
 invoice_number: string
 vendor_invoice_number: string | null
 purchase_date: string
 status: string
 payment_status: string
 grand_total: string | number
 paid_amount: string | number
 balance_amount: string | number
 vendor?: Vendor | null
}

type VendorPayment = {
 id: number
 vendor_id: number
 purchase_invoice_id: number | null
 payment_number: string
 payment_date: string
 payment_method: string
 status: string
 amount: string | number
 reference_number: string | null
 paid_at: string | null
 notes: string | null
}

type VendorPaymentResponse = {
 data: VendorPayment
 message?: string
}

const props = defineProps<{
 open: boolean
 vendors: Vendor[]
 purchaseInvoices: PurchaseInvoice[]
}>()

const emit = defineEmits<{
 close: []
 saved: [payment: VendorPayment, message?: string]
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const saveMode = ref<'draft' | 'paid'>('draft')
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const form = reactive({
 vendor_id: null as number | null,
 purchase_invoice_id: null as number | null,
 payment_number: '',
 payment_date: todayDate(),
 payment_method: 'bank_transfer',
 amount: 0,
 reference_number: '',
 notes: '',
})

const paymentMethodOptions = [
 { label: 'Cash', value: 'cash' },
 { label: 'Card', value: 'card' },
 { label: 'Bank transfer', value: 'bank_transfer' },
 { label: 'Cheque', value: 'cheque' },
 { label: 'Easypaisa', value: 'easypaisa' },
 { label: 'JazzCash', value: 'jazzcash' },
 { label: 'Other', value: 'other' },
]

const vendorOptions = computed(() => [
 { label: 'Select vendor', value: null },
 ...props.vendors
 .filter((vendor) => vendor.is_active && Number(vendor.current_balance || 0) > 0)
 .map((vendor) => ({
 label: `${vendor.name} (${vendor.code})`,
 value: vendor.id,
 hint: `Balance ${money(vendor.current_balance)}`,
 })),
])

const selectedVendor = computed(() => {
 return props.vendors.find((vendor) => Number(vendor.id) === Number(form.vendor_id)) || null
})

const vendorInvoices = computed(() => {
 if (!form.vendor_id) return []

 return props.purchaseInvoices.filter((invoice) => {
 return Number(invoice.vendor_id) === Number(form.vendor_id)
 && invoice.status === 'received'
 && Number(invoice.balance_amount || 0) > 0
 })
})

const invoiceOptions = computed(() => [
 {
 label: 'Vendor balance / opening balance',
 value: null,
 hint: 'Not linked to a specific invoice',
 },
 ...vendorInvoices.value.map((invoice) => ({
 label: invoice.invoice_number,
 value: invoice.id,
 hint: [
 invoice.vendor_invoice_number ? `Vendor ref ${invoice.vendor_invoice_number}` : null,
 `Balance ${money(invoice.balance_amount)}`,
 ].filter(Boolean).join(' · '),
 })),
])

/**
 * The whole reason a payment can appear "still unpaid" on its invoice
 * despite the vendor's balance genuinely dropping: this field used to
 * default to null (unlinked) every time, silently. Most payments in
 * practice are meant to settle a specific bill, so default to the
 * oldest outstanding one instead — still fully overridable via the
 * dropdown, including back to "not linked" if that's really what's
 * intended (e.g. an advance payment).
 */
function defaultInvoiceIdForVendor(vendorId: number | null): number | null {
 if (!vendorId) return null

 const invoices = props.purchaseInvoices
 .filter((invoice) => {
 return Number(invoice.vendor_id) === Number(vendorId)
 && invoice.status === 'received'
 && Number(invoice.balance_amount || 0) > 0
 })
 .sort((a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime())

 return invoices[0]?.id ?? null
}

const selectedInvoice = computed(() => {
 if (!form.purchase_invoice_id) return null

 return vendorInvoices.value.find((invoice) => Number(invoice.id) === Number(form.purchase_invoice_id)) || null
})

const maxPayable = computed(() => {
 if (selectedInvoice.value) {
 return Number(selectedInvoice.value.balance_amount || 0)
 }

 return Number(selectedVendor.value?.current_balance || 0)
})

const canSubmit = computed(() => {
 return Boolean(
 form.vendor_id
 && form.payment_date
 && form.payment_method
 && Number(form.amount || 0) > 0
 && Number(form.amount || 0) <= maxPayable.value,
 )
})

watch(
 () => props.open,
 (open) => {
 if (!open) return
 resetForm()
 },
)

watch(
 () => form.vendor_id,
 () => {
 form.purchase_invoice_id = defaultInvoiceIdForVendor(form.vendor_id)
 form.amount = maxPayable.value
 },
)

watch(
 () => form.purchase_invoice_id,
 () => {
 form.amount = maxPayable.value
 },
)

function todayDate() {
 return new Date().toISOString().slice(0, 10)
}

function resetForm() {
 formError.value = ''
 fieldErrors.value = {}

 const firstPayableVendor = props.vendors.find((vendor) => vendor.is_active && Number(vendor.current_balance || 0) > 0)

 form.vendor_id = firstPayableVendor?.id || null
 form.purchase_invoice_id = defaultInvoiceIdForVendor(form.vendor_id)
 form.payment_number = ''
 form.payment_date = todayDate()
 form.payment_method = 'bank_transfer'
 form.amount = maxPayable.value
 form.reference_number = ''
 form.notes = ''
 saveMode.value = 'draft'
}

function money(value: string | number | null | undefined) {
 return Number(value || 0).toLocaleString('en', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })
}

function normalizeErrors(error: any) {
 const errors = error?.data?.errors || {}
 const normalized: Record<string, string> = {}

 Object.keys(errors).forEach((key) => {
 normalized[key] = Array.isArray(errors[key]) ? errors[key][0] : String(errors[key])
 })

 return normalized
}

function friendlyError(error: any) {
 const firstError = Object.values(fieldErrors.value)[0]

 if (firstError) return String(firstError)

 return error?.data?.message || 'Could not save vendor payment.'
}

function payload() {
 return {
 vendor_id: Number(form.vendor_id),
 purchase_invoice_id: form.purchase_invoice_id ? Number(form.purchase_invoice_id) : null,
 payment_number: form.payment_number || undefined,
 payment_date: form.payment_date,
 payment_method: form.payment_method,
 amount: Number(form.amount || 0),
 reference_number: form.reference_number || null,
 notes: form.notes || null,
 }
}

async function submit(mode: 'draft' | 'paid') {
 saveMode.value = mode
 saving.value = true
 formError.value = ''
 fieldErrors.value = {}

 try {
 const created = await $api<VendorPaymentResponse>('/admin/vendor-payments', {
 method: 'POST',
 body: payload(),
 })

 if (mode === 'paid') {
 const paid = await $api<VendorPaymentResponse>(`/admin/vendor-payments/${created.data.id}/pay`, {
 method: 'POST',
 body: {
 paid_at: new Date().toISOString(),
 },
 })

 emit('saved', paid.data, paid.message || 'Vendor payment paid successfully.')
 return
 }

 emit('saved', created.data, created.message || 'Vendor payment draft created successfully.')
 } catch (error: any) {
 fieldErrors.value = normalizeErrors(error)
 formError.value = friendlyError(error)
 } finally {
 saving.value = false
 }
}
</script>

<template>
 <AppModal
 :open="open"
 title="New vendor payment"
 description="Create a payment against a vendor balance or a specific received purchase invoice."
 max-width="max-w-4xl"
 @close="emit('close')"
 >
 <form>
 <div class="p-4 sm:p-5">
 <div
 v-if="formError"
 class="mb-5 rounded-[12px] bg-red-500/[0.07] p-4 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
 >
 {{ formError }}
 </div>

 <div
 v-if="vendors.filter((vendor) => vendor.is_active && Number(vendor.current_balance || 0) > 0).length === 0"
 class="rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
 >
 No vendors currently have payable balance. Receive a purchase invoice first, or add an opening balance on a vendor.
 </div>

 <div
 v-else
 class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"
 >
 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Payment details
 </h3>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Choose the vendor and optionally link this payment to a received purchase invoice.
 </p>

 <div class="mt-5 grid gap-5 lg:grid-cols-2">
 <AppSelect
 v-model="form.vendor_id"
 label="Vendor"
 :options="vendorOptions"
 searchable
 />

 <div>
 <AppSelect
 v-model="form.purchase_invoice_id"
 label="Apply to invoice"
 :options="invoiceOptions"
 searchable
 />

 <p
 v-if="!form.purchase_invoice_id && vendorInvoices.length > 0"
 class="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300"
 >
 Not linked to an invoice — this will reduce the vendor's overall balance, but no specific invoice will show as paid. Pick one above if this payment is meant to settle a particular bill.
 </p>
 </div>

 <AppInput
 v-model="form.payment_number"
 label="Payment number"
 placeholder="Auto generated if empty"
 :error="fieldErrors.payment_number"
 />

 <AppInput
 v-model="form.payment_date"
 label="Payment date"
 type="date"
 :error="fieldErrors.payment_date"
 />

 <AppSelect
 v-model="form.payment_method"
 label="Payment method"
 :options="paymentMethodOptions"
 />

 <AppInput
 v-model="form.reference_number"
 label="Reference number"
 placeholder="Bank ref, cheque no, transaction ID..."
 :error="fieldErrors.reference_number"
 />

 <AppInput
 v-model="form.amount"
 label="Amount"
 type="number"
 :error="fieldErrors.amount"
 />

 <div class="rounded-[12px] bg-gray-950/[0.035] p-4 dark:bg-white/[0.055]">
 <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">
 Max payable
 </p>

 <p class="mt-2 text-xl font-semibold text-gray-950 dark:text-white">
 {{ money(maxPayable) }}
 </p>

 <button
 type="button"
 class="mt-3 rounded-full bg-gray-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950"
 @click="form.amount = maxPayable"
 >
 Use full amount
 </button>
 </div>

 <AppTextarea
 v-model="form.notes"
 class="lg:col-span-2"
 label="Internal notes"
 placeholder="Payment notes, transfer details, cheque remarks..."
 :rows="3"
 :error="fieldErrors.notes"
 />
 </div>
 </section>

 <aside class="space-y-4">
 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 ">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Summary
 </h3>

 <div class="mt-4 space-y-3 text-sm">
 <div class="flex items-center justify-between gap-4">
 <span class="text-gray-500 dark:text-gray-400">Vendor balance</span>
 <span class="font-semibold text-gray-950 dark:text-white">
 {{ money(selectedVendor?.current_balance) }}
 </span>
 </div>

 <div class="flex items-center justify-between gap-4">
 <span class="text-gray-500 dark:text-gray-400">Invoice balance</span>
 <span class="font-semibold text-gray-950 dark:text-white">
 {{ selectedInvoice ? money(selectedInvoice.balance_amount) : 'Not linked' }}
 </span>
 </div>

 <div class="shadow-[0_-1px_0_rgba(17,24,39,0.05)] pt-3 ">
 <div class="flex items-center justify-between gap-4">
 <span class="font-semibold text-gray-950 dark:text-white">Payment</span>
 <span class="text-xl font-semibold text-gray-950 dark:text-white">
 {{ money(form.amount) }}
 </span>
 </div>
 </div>
 </div>
 </section>

 <section class="rounded-[12px] bg-blue-500/[0.07] p-4 text-sm leading-6 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
 If you link a purchase invoice, the invoice paid amount and balance are updated when this payment is marked paid.
 </section>

 <section class="rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
 Draft payments do not reduce vendor balance. Use “Create & pay now” or pay the draft from the list.
 </section>
 </aside>
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
 type="button"
 variant="secondary"
 :loading="saving && saveMode === 'draft'"
 :disabled="!canSubmit || saving"
 @click="submit('draft')"
 >
 Save draft
 </AppButton>

 <AppButton
 type="button"
 :loading="saving && saveMode === 'paid'"
 :disabled="!canSubmit || saving"
 @click="submit('paid')"
 >
 Create & pay now
 </AppButton>
 </div>
 </form>
 </AppModal>
</template>