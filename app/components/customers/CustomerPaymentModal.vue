<script setup lang="ts">
type Customer = {
 id: number
 code: string
 name: string
 phone: string | null
 email: string | null
 current_balance: string | number
 is_active: boolean
}

type SaleInvoice = {
 id: number
 customer_id: number | null
 customer?: Customer | null
 invoice_number: string
 channel: string
 sale_date: string
 status: string
 payment_status: string
 customer_name: string | null
 customer_phone: string | null
 grand_total: string | number
 paid_amount: string | number
 balance_amount: string | number
}

type CustomerPayment = {
 id: number
 customer_id: number
 sale_invoice_id: number | null
 payment_number: string
 payment_date: string
 payment_method: string
 status: string
 amount: string | number
 reference_number: string | null
 received_at: string | null
 notes: string | null
}

type CustomerPaymentResponse = {
 data: CustomerPayment
 message?: string
}

const props = defineProps<{
 open: boolean
 customers: Customer[]
 saleInvoices: SaleInvoice[]
}>()

const emit = defineEmits<{
 close: []
 saved: [payment: CustomerPayment, message?: string]
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const saveMode = ref<'draft' | 'received'>('draft')
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const form = reactive({
 customer_id: null as number | null,
 sale_invoice_id: null as number | null,
 payment_number: '',
 payment_date: todayDate(),
 payment_method: 'cash',
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

const customerOptions = computed(() => [
 { label: 'Select customer', value: null },
 ...props.customers
 .filter((customer) => customer.is_active && Number(customer.current_balance || 0) > 0)
 .map((customer) => ({
 label: `${customer.name} (${customer.code})`,
 value: customer.id,
 hint: [
 customer.phone,
 `Balance ${money(customer.current_balance)}`,
 ].filter(Boolean).join(' · '),
 })),
])

const selectedCustomer = computed(() => {
 return props.customers.find((customer) => Number(customer.id) === Number(form.customer_id)) || null
})

const customerInvoices = computed(() => {
 if (!form.customer_id) return []

 return props.saleInvoices.filter((invoice) => {
 return Number(invoice.customer_id) === Number(form.customer_id)
 && invoice.status === 'completed'
 && Number(invoice.balance_amount || 0) > 0
 })
})

const invoiceOptions = computed(() => [
 {
 label: 'Customer balance / opening balance',
 value: null,
 hint: 'Not linked to a specific sale invoice',
 },
 ...customerInvoices.value.map((invoice) => ({
 label: invoice.invoice_number,
 value: invoice.id,
 hint: [
 label(invoice.channel),
 `Balance ${money(invoice.balance_amount)}`,
 `Paid ${money(invoice.paid_amount)}`,
 ].filter(Boolean).join(' · '),
 })),
])

/**
 * Mirrors VendorPaymentModal.vue's identical fix. This used to default
 * to null (unlinked) every time, which is why a payment could reduce a
 * customer's balance while leaving the specific invoice it was meant to
 * settle still showing as unpaid.
 */
function defaultInvoiceIdForCustomer(customerId: number | null): number | null {
 if (!customerId) return null

 const invoices = props.saleInvoices
 .filter((invoice) => {
 return Number(invoice.customer_id) === Number(customerId)
 && invoice.status === 'completed'
 && Number(invoice.balance_amount || 0) > 0
 })
 .sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime())

 return invoices[0]?.id ?? null
}

const selectedInvoice = computed(() => {
 if (!form.sale_invoice_id) return null

 return customerInvoices.value.find((invoice) => Number(invoice.id) === Number(form.sale_invoice_id)) || null
})

const maxReceivable = computed(() => {
 if (selectedInvoice.value) {
 return Number(selectedInvoice.value.balance_amount || 0)
 }

 return Number(selectedCustomer.value?.current_balance || 0)
})

const canSubmit = computed(() => {
 return Boolean(
 form.customer_id
 && form.payment_date
 && form.payment_method
 && Number(form.amount || 0) > 0
 && Number(form.amount || 0) <= maxReceivable.value,
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
 () => form.customer_id,
 () => {
 form.sale_invoice_id = defaultInvoiceIdForCustomer(form.customer_id)
 form.amount = maxReceivable.value
 },
)

watch(
 () => form.sale_invoice_id,
 () => {
 form.amount = maxReceivable.value
 },
)

function todayDate() {
 return new Date().toISOString().slice(0, 10)
}

function resetForm() {
 formError.value = ''
 fieldErrors.value = {}

 const firstReceivableCustomer = props.customers.find((customer) => {
 return customer.is_active && Number(customer.current_balance || 0) > 0
 })

 form.customer_id = firstReceivableCustomer?.id || null
 form.sale_invoice_id = defaultInvoiceIdForCustomer(form.customer_id)
 form.payment_number = ''
 form.payment_date = todayDate()
 form.payment_method = 'cash'
 form.amount = maxReceivable.value
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

function label(value: string | null | undefined) {
 return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
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

 return error?.data?.message || 'Could not save customer payment.'
}

function payload() {
 return {
 customer_id: Number(form.customer_id),
 sale_invoice_id: form.sale_invoice_id ? Number(form.sale_invoice_id) : null,
 payment_number: form.payment_number || undefined,
 payment_date: form.payment_date,
 payment_method: form.payment_method,
 amount: Number(form.amount || 0),
 reference_number: form.reference_number || null,
 notes: form.notes || null,
 }
}

async function submit(mode: 'draft' | 'received') {
 saveMode.value = mode
 saving.value = true
 formError.value = ''
 fieldErrors.value = {}

 try {
 const created = await $api<CustomerPaymentResponse>('/admin/customer-payments', {
 method: 'POST',
 body: payload(),
 })

 if (mode === 'received') {
 const received = await $api<CustomerPaymentResponse>(`/admin/customer-payments/${created.data.id}/receive`, {
 method: 'POST',
 body: {
 received_at: new Date().toISOString(),
 },
 })

 emit('saved', received.data, received.message || 'Customer payment received successfully.')
 return
 }

 emit('saved', created.data, created.message || 'Customer payment draft created successfully.')
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
 title="New customer payment"
 description="Receive payment against customer balance or a specific completed sale invoice."
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
 v-if="customers.filter((customer) => customer.is_active && Number(customer.current_balance || 0) > 0).length === 0"
 class="rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
 >
 No customers currently have receivable balance. Complete an unpaid or partially-paid sale invoice first.
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
 Choose the customer and optionally link this payment to a completed sale invoice.
 </p>

 <div class="mt-5 grid gap-5 lg:grid-cols-2">
 <AppSelect
 v-model="form.customer_id"
 label="Customer"
 :options="customerOptions"
 searchable
 />

 <div>
 <AppSelect
 v-model="form.sale_invoice_id"
 label="Apply to invoice"
 :options="invoiceOptions"
 searchable
 />

 <p
 v-if="!form.sale_invoice_id && customerInvoices.length > 0"
 class="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300"
 >
 Not linked to an invoice — this will reduce the customer's overall balance, but no specific invoice will show as paid. Pick one above if this payment is meant to settle a particular sale.
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
 placeholder="Card auth, bank ref, cheque no..."
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
 Max receivable
 </p>

 <p class="mt-2 text-xl font-semibold text-gray-950 dark:text-white">
 {{ money(maxReceivable) }}
 </p>

 <button
 type="button"
 class="mt-3 rounded-full bg-gray-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950"
 @click="form.amount = maxReceivable"
 >
 Use full amount
 </button>
 </div>

 <AppTextarea
 v-model="form.notes"
 class="lg:col-span-2"
 label="Internal notes"
 placeholder="Payment notes, customer remarks, transfer details..."
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
 <span class="text-gray-500 dark:text-gray-400">Customer balance</span>
 <span class="font-semibold text-gray-950 dark:text-white">
 {{ money(selectedCustomer?.current_balance) }}
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
 If linked to a sale invoice, the invoice paid amount, balance and payment status are updated when received.
 </section>

 <section class="rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
 Draft payments do not reduce customer balance. Use “Create & receive now” or receive the draft from the list.
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
 :loading="saving && saveMode === 'received'"
 :disabled="!canSubmit || saving"
 @click="submit('received')"
 >
 Create & receive now
 </AppButton>
 </div>
 </form>
 </AppModal>
</template>