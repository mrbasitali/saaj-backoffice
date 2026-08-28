<script setup lang="ts">
type Vendor = {
 id: number
 name: string
 code: string
 company_name: string | null
}

type InventoryLocation = {
 id: number
 name: string
 code: string
}

type Brand = {
 id: number
 name: string
}

type Product = {
 id: number
 name: string
 slug: string
 brand?: Brand | null
}

type ProductVariant = {
 id: number
 sku: string | null
 barcode: string | null
 name: string | null
 option_summary: string | null
 product?: Product | null
}

type PurchaseItem = {
 id: number
 purchase_invoice_id: number
 product_variant_id: number
 variant?: ProductVariant | null
 quantity: number
 returned_quantity?: number
 returnable_quantity?: number
 unit_cost: string | number
 discount_amount: string | number
 tax_amount: string | number
 line_total: string | number
 notes: string | null
}

type PurchaseInvoice = {
 id: number
 vendor_id: number
 vendor?: Vendor | null
 inventory_location_id: number
 location?: InventoryLocation | null
 invoice_number: string
 vendor_invoice_number: string | null
 purchase_date: string
 status: string
 payment_status: string
 grand_total: string | number
 paid_amount: string | number
 balance_amount: string | number
 items?: PurchaseItem[]
}

type PurchaseReturnItemForm = {
 purchase_item_id: number | null
 quantity: number
 deduction_amount: number
 reason: string
 notes: string
}

type PurchaseReturn = {
 id: number
 purchase_invoice_id: number
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

type PurchaseInvoiceResponse = {
 data: PurchaseInvoice
}

type PurchaseReturnResponse = {
 data: PurchaseReturn
 message?: string
}

const props = defineProps<{
 open: boolean
 purchaseInvoices: PurchaseInvoice[]
}>()

const emit = defineEmits<{
 close: []
 saved: [purchaseReturn: PurchaseReturn, message?: string]
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const fetchingInvoice = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})
const invoiceDetail = ref<PurchaseInvoice | null>(null)

const form = reactive({
 purchase_invoice_id: null as number | null,
 return_number: '',
 return_date: todayDate(),
 refunded_amount: 0,
 reason: '',
 notes: '',
 items: [] as PurchaseReturnItemForm[],
})

const invoiceOptions = computed(() => [
 { label: 'Select received purchase invoice', value: null },
 ...props.purchaseInvoices
 .filter((invoice) => invoice.status === 'received')
 .map((invoice) => ({
 label: invoice.invoice_number,
 value: invoice.id,
 hint: [
 invoice.vendor?.name || 'Unknown vendor',
 invoice.location?.code || null,
 `Total ${money(invoice.grand_total)}`,
 ].filter(Boolean).join(' · '),
 })),
])

const invoiceItems = computed(() => invoiceDetail.value?.items ?? [])
const returnableInvoiceItems = computed(() => invoiceItems.value.filter((item) => returnableQuantity(item) > 0))

const subtotal = computed(() => {
 return form.items.reduce((sum, item) => {
 const purchaseItem = selectedPurchaseItem(item.purchase_item_id)
 return sum + Number(item.quantity || 0) * Number(purchaseItem?.unit_cost || 0)
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
 form.purchase_invoice_id
 && form.return_date
 && form.items.length
 && form.items.every((item) => item.purchase_item_id && Number(item.quantity) > 0 && Number(item.deduction_amount || 0) >= 0),
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
 () => form.purchase_invoice_id,
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

function resetForm() {
 const previousInvoiceId = form.purchase_invoice_id

 formError.value = ''
 fieldErrors.value = {}
 invoiceDetail.value = null

 const firstInvoice = props.purchaseInvoices.find((invoice) => invoice.status === 'received')

 form.purchase_invoice_id = firstInvoice?.id || null
 form.return_number = ''
 form.return_date = todayDate()
 form.refunded_amount = 0
 form.reason = ''
 form.notes = ''
 form.items = []

 if (form.purchase_invoice_id && Number(previousInvoiceId) === Number(form.purchase_invoice_id)) {
 void fetchInvoice(Number(form.purchase_invoice_id))
 }
}

async function fetchInvoice(invoiceId: number) {
 fetchingInvoice.value = true
 formError.value = ''
 fieldErrors.value = {}

 try {
 const response = await $api<PurchaseInvoiceResponse>(`/admin/purchase-invoices/${invoiceId}`)
 invoiceDetail.value = response.data
 populateAllItems()
 } catch (error: any) {
 formError.value = error?.data?.message || 'Could not load purchase invoice items.'
 } finally {
 fetchingInvoice.value = false
 }
}

function purchaseItemOptions(currentItem?: PurchaseReturnItemForm) {
 const selectedIds = form.items
 .filter((item) => item !== currentItem)
 .map((item) => Number(item.purchase_item_id))
 .filter(Boolean)

 return [
 { label: 'Select invoice item', value: null },
 ...invoiceItems.value
 .filter((item) => !selectedIds.includes(Number(item.id)))
 .map((item) => ({
 label: purchaseItemLabel(item),
 value: item.id,
 hint: `Returnable ${returnableQuantity(item)} of ${item.quantity} · Cost ${money(item.unit_cost)}`,
 })),
 ]
}

function purchaseItemLabel(item: PurchaseItem) {
 const variant = item.variant
 const productName = variant?.product?.name || 'Product'
 const option = variant?.option_summary || variant?.name || 'Default'
 const sku = variant?.sku ? `SKU ${variant.sku}` : null

 return [productName, option, sku].filter(Boolean).join(' · ')
}

function selectedPurchaseItem(purchaseItemId: number | null) {
 if (!purchaseItemId) return null

 return invoiceItems.value.find((item) => Number(item.id) === Number(purchaseItemId)) || null
}

function lineTotal(item: PurchaseReturnItemForm) {
 const purchaseItem = selectedPurchaseItem(item.purchase_item_id)
 const gross = Number(item.quantity || 0) * Number(purchaseItem?.unit_cost || 0)

 return Math.max(0, gross - Number(item.deduction_amount || 0))
}

function money(value: string | number | null | undefined) {
 return Number(value || 0).toLocaleString('en', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })
}

function returnableQuantity(purchaseItem: PurchaseItem) {
 const explicit = Number(purchaseItem.returnable_quantity)

 if (Number.isFinite(explicit)) {
 return Math.max(0, explicit)
 }

 return Math.max(0, Number(purchaseItem.quantity || 0) - Number(purchaseItem.returned_quantity || 0))
}

function populateAllItems() {
 form.items = invoiceItems.value
 .filter((purchaseItem) => returnableQuantity(purchaseItem) > 0)
 .map((purchaseItem) => ({
 purchase_item_id: purchaseItem.id,
 quantity: returnableQuantity(purchaseItem),
 deduction_amount: 0,
 reason: '',
 notes: '',
 }))
}

function addItem() {
 const firstUnused = invoiceItems.value.find((purchaseItem) => {
 return returnableQuantity(purchaseItem) > 0
 && !form.items.some((item) => Number(item.purchase_item_id) === Number(purchaseItem.id))
 })

 if (!firstUnused) return

 form.items.push({
 purchase_item_id: firstUnused.id,
 quantity: returnableQuantity(firstUnused),
 deduction_amount: 0,
 reason: '',
 notes: '',
 })
}

function removeItem(index: number) {
 form.items.splice(index, 1)
}

function useFullQuantity(item: PurchaseReturnItemForm) {
 const purchaseItem = selectedPurchaseItem(item.purchase_item_id)
 item.quantity = purchaseItem ? returnableQuantity(purchaseItem) : 1
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

 return error?.data?.message || 'Could not save purchase return.'
}

function payload() {
 return {
 purchase_invoice_id: Number(form.purchase_invoice_id),
 return_number: form.return_number || undefined,
 return_date: form.return_date,
 refunded_amount: Number(form.refunded_amount || 0),
 reason: form.reason || null,
 notes: form.notes || null,
 items: form.items.map((item) => ({
 purchase_item_id: Number(item.purchase_item_id),
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
 const response = await $api<PurchaseReturnResponse>('/admin/purchase-returns', {
 method: 'POST',
 body: payload(),
 })

 emit('saved', response.data, response.message || 'Purchase return created successfully.')
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
 title="New purchase return"
 description="Create a draft return from a received purchase invoice. Stock is reduced only after approval."
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
 v-if="purchaseInvoices.filter((invoice) => invoice.status === 'received').length === 0"
 class="rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
 >
 No received purchase invoices found. Create and receive a purchase invoice first, then create a return from it.
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
 Select the received purchase invoice and describe why stock is being returned.
 </p>

 <div class="mt-5 grid gap-5 lg:grid-cols-2">
 <AppSelect
 v-model="form.purchase_invoice_id"
 label="Purchase invoice"
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
 placeholder="Damaged stock, wrong item, supplier replacement, etc."
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
 {{ invoiceDetail.vendor?.name || 'Unknown vendor' }}
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
 All remaining invoice items are selected automatically. Remove lines or reduce quantities if you only want a partial return.
 </p>
 </div>

 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 :disabled="fetchingInvoice || returnableInvoiceItems.length === form.items.length"
 @click="addItem"
 >
 Add item
 </AppButton>
 </div>

 <div
 v-if="fetchingInvoice"
 class="mt-5 rounded-[14px] bg-gray-950/[0.025] p-4 text-sm text-gray-500 dark:text-gray-400"
 >
 Loading invoice items...
 </div>

 <div
 v-else-if="returnableInvoiceItems.length === 0"
 class="mt-5 rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
 >
 This invoice has no remaining items available for return. Any quantities already used in another active return are excluded.
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
 v-model="item.purchase_item_id"
 label="Invoice item"
 :options="purchaseItemOptions(item)"
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
 Save creates a draft only. Approval reduces inventory and lowers vendor payable balance.
 </section>

 <section class="rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
 Backend will prevent returning more than the remaining invoice quantity or available stock.
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