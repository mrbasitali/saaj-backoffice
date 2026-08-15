<script setup lang="ts">
type Customer = {
 id: number
 code: string
 name: string
 phone: string | null
 email: string | null
}

type InventoryLocation = {
 id: number
 name: string
 code: string
}

type Product = {
 id: number
 name: string
 slug: string
}

type ProductVariant = {
 id: number
 sku: string | null
 barcode: string | null
 name: string | null
 option_summary: string | null
 product?: Product | null
}

type SaleItem = {
 id: number
 sale_invoice_id: number
 product_variant_id: number
 variant?: ProductVariant | null
 quantity: number
 unit_price: string | number
 cost_price?: string | number | null
 discount_amount: string | number
 tax_amount: string | number
 line_total: string | number
 notes: string | null
}

type SaleInvoice = {
 id: number
 customer_id: number | null
 customer?: Customer | null
 inventory_location_id: number
 location?: InventoryLocation | null
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
 items?: SaleItem[]
}

type SaleReturnItemForm = {
 sale_item_id: number | null
 quantity: number
 deduction_amount: number
 reason: string
 notes: string
}

type SaleReturn = {
 id: number
 sale_invoice_id: number
 return_number: string
 return_date: string
 status: string
 refund_status: string
 subtotal: string | number
 deduction_total: string | number
 refund_total: string | number
 refunded_amount: string | number
 balance_amount: string | number
 reason: string | null
 notes: string | null
}

type SaleInvoiceResponse = {
 data: SaleInvoice
}

type SaleReturnResponse = {
 data: SaleReturn
 message?: string
}

const props = defineProps<{
 open: boolean
 saleInvoices: SaleInvoice[]
}>()

const emit = defineEmits<{
 close: []
 saved: [saleReturn: SaleReturn, message?: string]
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const fetchingInvoice = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})
const invoiceDetail = ref<SaleInvoice | null>(null)

const form = reactive({
 sale_invoice_id: null as number | null,
 return_number: '',
 return_date: todayDate(),
 refunded_amount: 0,
 reason: '',
 notes: '',
 items: [] as SaleReturnItemForm[],
})

const invoiceOptions = computed(() => [
 { label: 'Select completed sale invoice', value: null },
 ...props.saleInvoices
 .filter((invoice) => invoice.status === 'completed')
 .map((invoice) => ({
 label: invoice.invoice_number,
 value: invoice.id,
 hint: [
 customerName(invoice),
 invoice.location?.code || null,
 `Total ${money(invoice.grand_total)}`,
 ].filter(Boolean).join(' · '),
 })),
])

const invoiceItems = computed(() => invoiceDetail.value?.items ?? [])

const subtotal = computed(() => {
 return form.items.reduce((sum, item) => {
 const saleItem = selectedSaleItem(item.sale_item_id)
 return sum + Number(item.quantity || 0) * Number(saleItem?.unit_price || 0)
 }, 0)
})

const deductionTotal = computed(() => {
 return form.items.reduce((sum, item) => sum + Number(item.deduction_amount || 0), 0)
})

const refundTotal = computed(() => {
 return Math.max(0, subtotal.value - deductionTotal.value)
})

const balanceAmount = computed(() => {
 return Math.max(0, refundTotal.value - Number(form.refunded_amount || 0))
})

const canSubmit = computed(() => {
 return Boolean(
 form.sale_invoice_id
 && form.return_date
 && form.items.length
 && form.items.every((item) => item.sale_item_id && Number(item.quantity) > 0 && Number(item.deduction_amount || 0) >= 0),
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
 () => form.sale_invoice_id,
 async (invoiceId) => {
 if (!props.open || !invoiceId) {
 invoiceDetail.value = null
 form.items = []
 return
 }

 await fetchInvoice(Number(invoiceId))
 },
)

function todayDate() {
 return new Date().toISOString().slice(0, 10)
}

function customerName(invoice: SaleInvoice) {
 return invoice.customer?.name || invoice.customer_name || 'Walk-in customer'
}

function resetForm() {
 formError.value = ''
 fieldErrors.value = {}
 invoiceDetail.value = null

 const firstInvoice = props.saleInvoices.find((invoice) => invoice.status === 'completed')

 form.sale_invoice_id = firstInvoice?.id || null
 form.return_number = ''
 form.return_date = todayDate()
 form.refunded_amount = 0
 form.reason = ''
 form.notes = ''
 form.items = []
}

async function fetchInvoice(invoiceId: number) {
 fetchingInvoice.value = true
 formError.value = ''
 fieldErrors.value = {}

 try {
 const response = await $api<SaleInvoiceResponse>(`/admin/sale-invoices/${invoiceId}`)
 invoiceDetail.value = response.data
 form.items = []

 addItem()
 } catch (error: any) {
 formError.value = error?.data?.message || 'Could not load sale invoice items.'
 } finally {
 fetchingInvoice.value = false
 }
}

function saleItemOptions(currentItem?: SaleReturnItemForm) {
 const selectedIds = form.items
 .filter((item) => item !== currentItem)
 .map((item) => Number(item.sale_item_id))
 .filter(Boolean)

 return [
 { label: 'Select sold item', value: null },
 ...invoiceItems.value
 .filter((item) => !selectedIds.includes(Number(item.id)))
 .map((item) => ({
 label: saleItemLabel(item),
 value: item.id,
 hint: `Sold ${item.quantity} · Price ${money(item.unit_price)}`,
 })),
 ]
}

function saleItemLabel(item: SaleItem) {
 const variant = item.variant
 const productName = variant?.product?.name || 'Product'
 const option = variant?.option_summary || variant?.name || 'Default'
 const sku = variant?.sku ? `SKU ${variant.sku}` : null

 return [productName, option, sku].filter(Boolean).join(' · ')
}

function selectedSaleItem(saleItemId: number | null) {
 if (!saleItemId) return null

 return invoiceItems.value.find((item) => Number(item.id) === Number(saleItemId)) || null
}

function lineTotal(item: SaleReturnItemForm) {
 const saleItem = selectedSaleItem(item.sale_item_id)
 const gross = Number(item.quantity || 0) * Number(saleItem?.unit_price || 0)

 return Math.max(0, gross - Number(item.deduction_amount || 0))
}

function money(value: string | number | null | undefined) {
 return Number(value || 0).toLocaleString('en', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })
}

function addItem() {
 const firstUnused = invoiceItems.value.find((saleItem) => {
 return !form.items.some((item) => Number(item.sale_item_id) === Number(saleItem.id))
 })

 if (!firstUnused) return

 form.items.push({
 sale_item_id: firstUnused.id,
 quantity: 1,
 deduction_amount: 0,
 reason: '',
 notes: '',
 })
}

function removeItem(index: number) {
 form.items.splice(index, 1)
}

function useFullQuantity(item: SaleReturnItemForm) {
 const saleItem = selectedSaleItem(item.sale_item_id)
 item.quantity = Number(saleItem?.quantity || 1)
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

 return error?.data?.message || 'Could not save sale return.'
}

function payload() {
 return {
 sale_invoice_id: Number(form.sale_invoice_id),
 return_number: form.return_number || undefined,
 return_date: form.return_date,
 refunded_amount: Number(form.refunded_amount || 0),
 reason: form.reason || null,
 notes: form.notes || null,
 items: form.items.map((item) => ({
 sale_item_id: Number(item.sale_item_id),
 quantity: Number(item.quantity || 0),
 deduction_amount: Number(item.deduction_amount || 0),
 reason: item.reason || null,
 notes: item.notes || null,
 })),
 }
}

async function submit() {
 saving.value = true
 formError.value = ''
 fieldErrors.value = {}

 try {
 const response = await $api<SaleReturnResponse>('/admin/sale-returns', {
 method: 'POST',
 body: payload(),
 })

 emit('saved', response.data, response.message || 'Sale return created successfully.')
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
 title="New sale return"
 description="Create a draft return from a completed sale invoice. Stock is increased only after approval."
 max-width="max-w-[96vw]"
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

 <div
 v-if="saleInvoices.filter((invoice) => invoice.status === 'completed').length === 0"
 class="rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
 >
 No completed sale invoices found. Complete a sale invoice first, then create a return from it.
 </div>

 <div
 v-else
 class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
 >
 <div class="space-y-6">
 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Return details
 </h3>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Select the completed sale invoice and describe why the customer is returning items.
 </p>

 <div class="mt-5 grid gap-5 lg:grid-cols-2">
 <AppSelect
 v-model="form.sale_invoice_id"
 label="Sale invoice"
 :options="invoiceOptions"
 searchable
 />

 <AppInput
 v-model="form.return_number"
 label="Return number"
 placeholder="Auto generated if empty"
 :error="fieldErrors.return_number"
 />

 <AppInput
 v-model="form.return_date"
 label="Return date"
 type="date"
 :error="fieldErrors.return_date"
 />

 <AppInput
 v-model="form.refunded_amount"
 label="Refunded amount"
 type="number"
 :error="fieldErrors.refunded_amount"
 />

 <AppInput
 v-model="form.reason"
 class="lg:col-span-2"
 label="Reason"
 placeholder="Wrong size, damaged item, changed mind, exchange, etc."
 :error="fieldErrors.reason"
 />

 <AppTextarea
 v-model="form.notes"
 class="lg:col-span-2"
 label="Internal notes"
 placeholder="Optional internal notes"
 :rows="3"
 :error="fieldErrors.notes"
 />
 </div>

 <div
 v-if="invoiceDetail"
 class="mt-5 rounded-[12px] bg-gray-950/[0.035] p-4 dark:bg-white/[0.055]"
 >
 <p class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 {{ invoiceDetail.invoice_number }}
 </p>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ customerName(invoiceDetail) }}
 <span v-if="invoiceDetail.location?.code">
 · {{ invoiceDetail.location.code }}
 </span>
 · Invoice total {{ money(invoiceDetail.grand_total) }}
 </p>
 </div>
 </section>

 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
 <div>
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Returned items
 </h3>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Choose sold items from the selected sale invoice. Approval increases stock at the invoice location.
 </p>
 </div>

 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :disabled="fetchingInvoice || invoiceItems.length === form.items.length"
 @click="addItem"
 >
 Add item
 </AppButton>
 </div>

 <div
 v-if="fetchingInvoice"
 class="mt-5 rounded-[14px] bg-gray-950/[0.025] p-4 text-sm text-gray-500 dark:text-gray-400"
 >
 Loading sale invoice items...
 </div>

 <div
 v-else-if="invoiceItems.length === 0"
 class="mt-5 rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
 >
 This invoice has no items available for return.
 </div>

 <div
 v-else
 class="mt-5 space-y-4"
 >
 <div
 v-for="(item, index) in form.items"
 :key="index"
 class="rounded-[14px] bg-gray-950/[0.025] p-4 "
 >
 <div class="grid gap-4 xl:grid-cols-[minmax(260px,1.4fr)_110px_130px_140px_120px] xl:items-start">
 <AppSelect
 v-model="item.sale_item_id"
 label="Sold item"
 :options="saleItemOptions(item)"
 searchable
 />

 <AppInput
 v-model="item.quantity"
 label="Qty"
 type="number"
 />

 <AppInput
 v-model="item.deduction_amount"
 label="Deduction"
 type="number"
 />

 <div>
 <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
 Refund line
 </p>

 <div class="flex h-11 items-center rounded-[14px] bg-gray-950/[0.035] px-3 text-sm font-semibold text-gray-950 dark:bg-white/[0.055] dark:text-white">
 {{ money(lineTotal(item)) }}
 </div>
 </div>

 <div class="flex items-end gap-2 pt-7">
 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 @click="useFullQuantity(item)"
 >
 Full qty
 </AppButton>

 <AppButton
 type="button"
 variant="ghost"
 size="sm"
 @click="removeItem(index)"
 >
 Remove
 </AppButton>
 </div>
 </div>

 <div class="mt-4 grid gap-3 lg:grid-cols-2">
 <AppInput
 v-model="item.reason"
 placeholder="Line reason, optional"
 />

 <AppInput
 v-model="item.notes"
 placeholder="Line note, optional"
 />
 </div>
 </div>
 </div>
 </section>
 </div>

 <aside class="space-y-5">
 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Return totals
 </h3>

 <div class="mt-5 space-y-3 text-sm">
 <div class="flex items-center justify-between">
 <span class="text-gray-500 dark:text-gray-400">Subtotal</span>
 <span class="font-semibold text-gray-950 dark:text-white">{{ money(subtotal) }}</span>
 </div>

 <div class="flex items-center justify-between">
 <span class="text-gray-500 dark:text-gray-400">Deduction</span>
 <span class="font-semibold text-gray-950 dark:text-white">-{{ money(deductionTotal) }}</span>
 </div>

 <div class="shadow-[0_-1px_0_rgba(17,24,39,0.05)] pt-4 ">
 <div class="flex items-center justify-between">
 <span class="font-semibold text-gray-950 dark:text-white">Refund total</span>
 <span class="text-xl font-semibold text-gray-950 dark:text-white">{{ money(refundTotal) }}</span>
 </div>
 </div>

 <div class="rounded-[12px] bg-gray-950/[0.035] p-4 dark:bg-white/[0.055]">
 <div class="flex items-center justify-between">
 <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
 Refund balance
 </span>
 <span class="text-lg font-semibold text-gray-950 dark:text-white">
 {{ money(balanceAmount) }}
 </span>
 </div>
 </div>
 </div>
 </section>

 <section class="rounded-[12px] bg-blue-500/[0.07] p-4 text-sm leading-6 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
 Save creates a draft only. Approval increases inventory and lowers customer receivable balance.
 </section>

 <section class="rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
 Backend prevents returning more than the remaining sold quantity.
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
 type="submit"
 :loading="saving"
 :disabled="!canSubmit || saving"
 >
 {{ saving ? 'Saving...' : 'Save draft return' }}
 </AppButton>
 </div>
 </form>
 </AppModal>
</template>