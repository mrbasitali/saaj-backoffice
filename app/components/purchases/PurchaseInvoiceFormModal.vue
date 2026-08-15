<script setup lang="ts">
type Vendor = {
 id: number
 name: string
 code: string
 company_name: string | null
 is_active: boolean
}

type InventoryLocation = {
 id: number
 name: string
 code: string
 type: string
 is_default: boolean
 is_active: boolean
}

type ProductVariant = {
 id: number
 product_id: number
 sku: string | null
 barcode: string | null
 name: string | null
 option_summary: string | null
 cost_price?: string | number | null
 price?: string | number | null
 track_inventory: boolean
 min_stock_level: number
 is_default: boolean
 is_active: boolean
}

type Product = {
 id: number
 name: string
 slug: string
 is_active: boolean
 variants?: ProductVariant[]
}

type PurchaseItem = {
 id?: number
 _uid?: string
 product_variant_id: number | null
 variant?: (ProductVariant & { product_name?: string | null }) | null
 quantity: number
 unit_cost: number
 discount_amount: number
 tax_amount: number
 line_total?: string | number
 notes: string
}

type PurchaseInvoice = {
 id: number
 vendor_id: number
 inventory_location_id: number
 invoice_number: string
 vendor_invoice_number: string | null
 purchase_date: string
 due_date: string | null
 status: string
 payment_status: string
 subtotal: string | number
 discount_total: string | number
 tax_total: string | number
 shipping_cost: string | number
 grand_total: string | number
 paid_amount: string | number
 balance_amount: string | number
 notes: string | null
 items?: PurchaseItem[]
}

type PurchaseInvoiceResponse = {
 data: PurchaseInvoice
 message?: string
}

const props = defineProps<{
 open: boolean
 mode: 'create' | 'edit'
 invoice?: PurchaseInvoice | null
 vendors: Vendor[]
 locations: InventoryLocation[]
 products: Product[]
}>()

const emit = defineEmits<{
 close: []
 saved: [invoice: PurchaseInvoice, message?: string]
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const form = reactive({
 vendor_id: null as number | null,
 inventory_location_id: null as number | null,
 invoice_number: '',
 vendor_invoice_number: '',
 purchase_date: todayDate(),
 due_date: '',
 shipping_cost: 0,
 paid_amount: 0,
 notes: '',
 items: [] as PurchaseItem[],
})

const title = computed(() => props.mode === 'create' ? 'New purchase invoice' : 'Edit purchase invoice')

const description = computed(() => {
 return props.mode === 'create'
 ? 'Create a draft purchase invoice. Stock is added only when you receive the invoice.'
 : 'Edit this draft purchase invoice before receiving stock.'
})

const extraVendors = ref<Record<number, Vendor>>({})
const vendorQuickAddOpen = ref(false)

const vendorOptions = computed(() => {
 const merged = new Map<number, Vendor>()

 props.vendors.forEach((vendor) => merged.set(vendor.id, vendor))
 Object.values(extraVendors.value).forEach((vendor) => merged.set(vendor.id, vendor))

 return [
 { label: 'Select vendor', value: null },
 ...Array.from(merged.values())
 .filter((vendor) => vendor.is_active || vendor.id === props.invoice?.vendor_id)
 .map((vendor) => ({
 label: `${vendor.name} (${vendor.code})`,
 value: vendor.id,
 })),
 ]
})

function onVendorCreated(vendor: Vendor) {
 extraVendors.value = { ...extraVendors.value, [vendor.id]: vendor }
 form.vendor_id = vendor.id
 vendorQuickAddOpen.value = false
 showScanFeedback('success', `Vendor added — ${vendor.name}`)
}

const locationOptions = computed(() => [
 { label: 'Select location', value: null },
 ...props.locations
 .filter((location) => location.is_active || location.id === props.invoice?.inventory_location_id)
 .map((location) => ({
 label: `${location.name} (${location.code})`,
 value: location.id,
 })),
])

const scannedVariants = ref<Record<number, ProductVariant & { product_name?: string | null }>>({})

const flatVariants = computed(() => {
 const fromProducts = props.products.flatMap((product) => {
 return (product.variants || [])
 .filter((variant) => variant.is_active)
 .map((variant) => ({
 ...variant,
 product_name: product.name,
 product_slug: product.slug,
 product_is_active: product.is_active,
 }))
 })

 const knownIds = new Set(fromProducts.map((variant) => variant.id))
 const extra = Object.values(scannedVariants.value).filter((variant) => !knownIds.has(variant.id))

 return [...fromProducts, ...extra]
})

const cartRows = computed(() => {
 return form.items.map((item) => ({
 item,
 variant: selectedVariant(item.product_variant_id),
 }))
})

const scanCode = ref('')
const scanning = ref(false)
const scanFeedback = ref<{ type: 'success' | 'error', message: string } | null>(null)
const scanFeedbackTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const scanInputRef = ref<InstanceType<typeof AppInput> | null>(null)

const nameSearchOpen = ref(false)
const nameSearchValue = ref<number | null>(null)
const nameSearchResults = ref<(ProductVariant & { product_name?: string | null })[]>([])
const nameSearchLoading = ref(false)

const subtotal = computed(() => {
 return form.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_cost || 0)), 0)
})

const discountTotal = computed(() => {
 return form.items.reduce((sum, item) => sum + Number(item.discount_amount || 0), 0)
})

const taxTotal = computed(() => {
 return form.items.reduce((sum, item) => sum + Number(item.tax_amount || 0), 0)
})

const grandTotal = computed(() => {
 return subtotal.value - discountTotal.value + taxTotal.value + Number(form.shipping_cost || 0)
})

const balanceAmount = computed(() => {
 return Math.max(0, grandTotal.value - Number(form.paid_amount || 0))
})

const canSubmit = computed(() => {
 return Boolean(
 form.vendor_id
 && form.inventory_location_id
 && form.purchase_date
 && form.items.length
 && form.items.every((item) => item.product_variant_id && Number(item.quantity) > 0 && Number(item.unit_cost) >= 0),
 )
})

watch(
 () => [props.open, props.invoice, props.mode] as const,
 () => {
 if (!props.open) return
 resetForm()
 },
 { immediate: true },
)

function todayDate() {
 return new Date().toISOString().slice(0, 10)
}

let uidCounter = 0
function nextUid() {
 uidCounter += 1
 return `item-${uidCounter}`
}

function resetForm() {
 formError.value = ''
 fieldErrors.value = {}
 scanCode.value = ''
 scanFeedback.value = null
 nameSearchOpen.value = false

 form.vendor_id = props.invoice?.vendor_id ?? props.vendors.find((vendor) => vendor.is_active)?.id ?? null
 form.inventory_location_id = props.invoice?.inventory_location_id
 ?? props.locations.find((location) => location.is_default && location.is_active)?.id
 ?? props.locations.find((location) => location.is_active)?.id
 ?? null
 form.invoice_number = props.invoice?.invoice_number ?? ''
 form.vendor_invoice_number = props.invoice?.vendor_invoice_number ?? ''
 form.purchase_date = props.invoice?.purchase_date ?? todayDate()
 form.due_date = props.invoice?.due_date ?? ''
 form.shipping_cost = Number(props.invoice?.shipping_cost ?? 0)
 form.paid_amount = Number(props.invoice?.paid_amount ?? 0)
 form.notes = props.invoice?.notes ?? ''

 form.items = props.invoice?.items?.length
 ? props.invoice.items.map((item) => ({
 _uid: nextUid(),
 product_variant_id: Number(item.product_variant_id),
 quantity: Number(item.quantity || 1),
 unit_cost: Number(item.unit_cost || 0),
 discount_amount: Number(item.discount_amount || 0),
 tax_amount: Number(item.tax_amount || 0),
 notes: item.notes || '',
 }))
 : []

 focusScanInput()
}

function variantLabel(variant: ProductVariant & { product_name?: string | null }) {
 const option = variant.option_summary || variant.name || (variant.is_default ? 'Default' : 'Variant')

 const parts = [
 variant.product_name || 'Product',
 option,
 variant.sku ? `SKU ${variant.sku}` : null,
 ].filter(Boolean)

 return parts.join(' · ')
}

function selectedVariant(variantId: number | null) {
 if (!variantId) return null

 return flatVariants.value.find((variant) => Number(variant.id) === Number(variantId)) || null
}

function lineTotal(item: PurchaseItem) {
 const gross = Number(item.quantity || 0) * Number(item.unit_cost || 0)

 return gross - Number(item.discount_amount || 0) + Number(item.tax_amount || 0)
}

function money(value: string | number | null | undefined) {
 return Number(value || 0).toLocaleString('en', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })
}

function removeItem(index: number) {
 form.items.splice(index, 1)
}

function showScanFeedback(type: 'success' | 'error', message: string) {
 scanFeedback.value = { type, message }

 if (scanFeedbackTimer.value) clearTimeout(scanFeedbackTimer.value)

 scanFeedbackTimer.value = setTimeout(() => {
 scanFeedback.value = null
 }, 3000)
}

function focusScanInput() {
 nextTick(() => scanInputRef.value?.focus?.())
}

function rememberVariant(found: ProductVariant & { product?: { name?: string, slug?: string, is_active?: boolean } | null }) {
 scannedVariants.value = {
 ...scannedVariants.value,
 [found.id]: {
 ...found,
 product_name: found.product?.name,
 product_slug: found.product?.slug,
 product_is_active: found.product?.is_active,
 },
 }
}

/** Shared by scanning, SKU entry, and "Search by name" — one consistent
 * add-or-increment behavior, and unit_cost pre-fills from the variant's
 * last-known cost_price (still fully editable — this invoice's own
 * receive() action is what will actually update cost_price going
 * forward, this is just a sensible starting point). */
function addVariantToCart(variantId: number) {
 const variant = selectedVariant(variantId)
 if (!variant) return

 const existingItem = form.items.find((item) => Number(item.product_variant_id) === Number(variantId))
 const label = variantLabel(variant)

 if (existingItem) {
 existingItem.quantity = Number(existingItem.quantity || 0) + 1
 showScanFeedback('success', `+1 — ${label} (now ${existingItem.quantity})`)
 return
 }

 form.items.push({
 _uid: nextUid(),
 product_variant_id: variantId,
 quantity: 1,
 unit_cost: Number(variant.cost_price || 0),
 discount_amount: 0,
 tax_amount: 0,
 notes: '',
 })

 showScanFeedback('success', `Added — ${label}`)
}

type LookupResponse = {
 data: ProductVariant & {
 product?: { name?: string, slug?: string, is_active?: boolean } | null
 }
}

async function handleScan() {
 const code = scanCode.value.trim()

 if (!code) return

 scanning.value = true

 try {
 const response = await $api<LookupResponse>('/admin/product-variants/lookup', {
 query: { code },
 })

 rememberVariant(response.data)
 addVariantToCart(response.data.id)
 } catch (error: any) {
 showScanFeedback('error', error?.data?.message || `No active product found for "${code}".`)
 } finally {
 scanCode.value = ''
 scanning.value = false
 focusScanInput()
 }
}

type VariantSearchResponse = {
 data: (ProductVariant & {
 product?: { name?: string, slug?: string, is_active?: boolean } | null
 })[]
}

async function searchByName(term: string) {
 nameSearchLoading.value = true

 try {
 const response = await $api<VariantSearchResponse>('/admin/product-variants/search', {
 query: { q: term, limit: 20 },
 })

 const results = (response.data || []).map((variant) => ({
 ...variant,
 product_name: variant.product?.name,
 product_slug: variant.product?.slug,
 product_is_active: variant.product?.is_active,
 }))

 nameSearchResults.value = results

 const merged = { ...scannedVariants.value }
 results.forEach((variant) => { merged[variant.id] = variant })
 scannedVariants.value = merged
 } catch {
 nameSearchResults.value = []
 } finally {
 nameSearchLoading.value = false
 }
}

const nameSearchOptions = computed(() => {
 return nameSearchResults.value.map((variant) => ({
 label: variantLabel(variant),
 value: variant.id,
 hint: variant.sku ? `SKU ${variant.sku}` : undefined,
 }))
})

function openNameSearch() {
 nameSearchOpen.value = true
 nameSearchResults.value = []
}

function onNameSearchPick(value: number | string | boolean | null) {
 if (value === null) return

 addVariantToCart(Number(value))
 nextTick(() => {
 nameSearchValue.value = null
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

 return error?.data?.message || 'Could not save purchase invoice.'
}

function payload() {
 return {
 vendor_id: Number(form.vendor_id),
 inventory_location_id: Number(form.inventory_location_id),
 invoice_number: form.invoice_number || undefined,
 vendor_invoice_number: form.vendor_invoice_number || null,
 purchase_date: form.purchase_date,
 due_date: form.due_date || null,
 shipping_cost: Number(form.shipping_cost || 0),
 paid_amount: Number(form.paid_amount || 0),
 notes: form.notes || null,
 items: form.items.map((item) => ({
 product_variant_id: Number(item.product_variant_id),
 quantity: Number(item.quantity || 0),
 unit_cost: Number(item.unit_cost || 0),
 discount_amount: Number(item.discount_amount || 0),
 tax_amount: Number(item.tax_amount || 0),
 notes: item.notes || null,
 })),
 }
}

async function submit() {
 saving.value = true
 formError.value = ''
 fieldErrors.value = {}

 try {
 const response = await $api<PurchaseInvoiceResponse>(
 props.mode === 'create' ? '/admin/purchase-invoices' : `/admin/purchase-invoices/${props.invoice?.id}`,
 {
 method: props.mode === 'create' ? 'POST' : 'PATCH',
 body: payload(),
 },
 )

 emit('saved', response.data, response.message || 'Purchase invoice saved successfully.')
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
 :title="title"
 :description="description"
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

 <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
 <div class="space-y-6">
 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <div>
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Invoice details
 </h3>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Select supplier, receiving location and invoice dates.
 </p>
 </div>

 <div class="mt-5 grid gap-5 lg:grid-cols-2">
 <div class="flex items-end gap-2">
 <div class="flex-1">
 <AppSelect
 v-model="form.vendor_id"
 label="Vendor"
 :options="vendorOptions"
 />
 </div>

 <AppButton
 type="button"
 variant="secondary"
 @click="vendorQuickAddOpen = true"
 >
 New
 </AppButton>
 </div>

 <AppSelect
 v-model="form.inventory_location_id"
 label="Receive into location"
 :options="locationOptions"
 />

 <AppInput
 v-model="form.invoice_number"
 label="Internal invoice number"
 placeholder="Auto generated if empty"
 :error="fieldErrors.invoice_number"
 />

 <AppInput
 v-model="form.vendor_invoice_number"
 label="Vendor invoice number"
 placeholder="Supplier invoice / bill number"
 :error="fieldErrors.vendor_invoice_number"
 />

 <AppInput
 v-model="form.purchase_date"
 label="Purchase date"
 type="date"
 :error="fieldErrors.purchase_date"
 required
 />

 <AppInput
 v-model="form.due_date"
 label="Due date"
 type="date"
 :error="fieldErrors.due_date"
 />

 <AppTextarea
 v-model="form.notes"
 class="lg:col-span-2"
 label="Internal notes"
 placeholder="Buying notes, delivery notes, supplier terms..."
 :rows="3"
 :error="fieldErrors.notes"
 />
 </div>
 </section>

 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
 <div>
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Purchase items
 </h3>

 <p class="mt-2 rounded-[12px] bg-blue-500/[0.07] p-3 text-sm leading-6 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
 Scan or type a barcode/SKU below — fastest way to add a line.
 </p>
 </div>

 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 @click="openNameSearch"
 >
 Search by name
 </AppButton>
 </div>

 <div class="mt-4 flex items-end gap-2">
 <div class="flex-1">
 <AppInput
 ref="scanInputRef"
 v-model="scanCode"
 label="Scan barcode"
 placeholder="Scan or type a barcode / SKU, then press Enter"
 :disabled="scanning"
 @keydown.enter.prevent="handleScan"
 />
 </div>

 <AppButton
 type="button"
 variant="secondary"
 :loading="scanning"
 @click="handleScan"
 >
 Add
 </AppButton>
 </div>

 <div
 v-if="nameSearchOpen"
 class="mt-4 rounded-[14px] bg-gray-950/[0.035] p-4 dark:bg-white/[0.03]"
 >
 <div class="flex items-center justify-between gap-3">
 <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">
 Worst case, no tag to scan — find it by name instead
 </p>

 <button
 type="button"
 class="text-xs font-semibold text-gray-400 transition hover:text-gray-950 dark:hover:text-white"
 @click="nameSearchOpen = false"
 >
 Close
 </button>
 </div>

 <div class="mt-2">
 <AppSelect
 v-model="nameSearchValue"
 placeholder="Type a product name..."
 :options="nameSearchOptions"
 remote
 :loading="nameSearchLoading"
 searchable
 @search="searchByName"
 @change="onNameSearchPick"
 />
 </div>
 </div>

 <div
 v-if="scanFeedback"
 class="mt-2 rounded-xl px-3 py-2 text-xs font-semibold"
 :class="scanFeedback.type === 'success'
 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
 : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'"
 >
 {{ scanFeedback.message }}
 </div>

 <div
 v-if="flatVariants.length === 0"
 class="mt-5 rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
 >
 No product variants are available yet. Save or refresh products once so default variants can be created, then reopen this purchase invoice.
 </div>

 <div
 v-else-if="form.items.length === 0"
 class="mt-5 rounded-[13px] bg-gray-950/[0.025] p-6 text-center text-[12px] text-gray-500 dark:bg-white/[0.035] dark:text-gray-500"
 >
 No items yet — scan a barcode above, or "Search by name" if there's no tag.
 </div>

 <div v-else class="mt-5 space-y-4">
 <div
 v-for="({ item, variant }, index) in cartRows"
 :key="item._uid || index"
 class="rounded-[14px] bg-gray-950/[0.025] p-4 "
 >
 <div class="grid gap-4 xl:grid-cols-[minmax(260px,1.5fr)_110px_130px_130px_130px_110px] xl:items-start">
 <div>
 <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
 Product
 </p>

 <div class="flex min-h-11 items-center rounded-[10px] bg-gray-950/[0.035] px-3 py-2 dark:bg-white/[0.055]">
 <span class="min-w-0">
 <span class="block truncate text-sm font-semibold text-gray-950 dark:text-white">
 {{ variant?.product_name || 'Unknown product' }}
 </span>
 <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
 {{ [variant?.option_summary, variant?.sku ? `SKU ${variant.sku}` : null].filter(Boolean).join(' · ') }}
 </span>
 </span>
 </div>
 </div>

 <AppInput
 v-model="item.quantity"
 label="Qty"
 type="number"
 />

 <AppInput
 v-model="item.unit_cost"
 label="Unit cost"
 type="number"
 />

 <AppInput
 v-model="item.discount_amount"
 label="Discount"
 type="number"
 />

 <AppInput
 v-model="item.tax_amount"
 label="Tax"
 type="number"
 />

 <div>
 <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
 Line total
 </p>

 <div class="flex h-11 items-center rounded-[10px] bg-gray-950/[0.035] px-3 text-[13px] font-semibold text-gray-950 dark:bg-white/[0.055] dark:text-white">
 {{ money(lineTotal(item)) }}
 </div>
 </div>
 </div>

 <div class="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
 <AppInput
 v-model="item.notes"
 placeholder="Line note, optional"
 />

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
 </div>
 </section>
 </div>

 <aside class="space-y-5">
 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Totals
 </h3>

 <div class="mt-5 space-y-3">
 <div class="flex items-center justify-between text-sm">
 <span class="text-gray-500 dark:text-gray-400">Subtotal</span>
 <span class="font-semibold text-gray-950 dark:text-white">{{ money(subtotal) }}</span>
 </div>

 <div class="flex items-center justify-between text-sm">
 <span class="text-gray-500 dark:text-gray-400">Discount</span>
 <span class="font-semibold text-gray-950 dark:text-white">-{{ money(discountTotal) }}</span>
 </div>

 <div class="flex items-center justify-between text-sm">
 <span class="text-gray-500 dark:text-gray-400">Tax</span>
 <span class="font-semibold text-gray-950 dark:text-white">{{ money(taxTotal) }}</span>
 </div>

 <AppInput
 v-model="form.shipping_cost"
 label="Shipping cost"
 type="number"
 :error="fieldErrors.shipping_cost"
 />

 <div class="shadow-[0_-1px_0_rgba(17,24,39,0.05)] pt-4 ">
 <div class="flex items-center justify-between">
 <span class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">Grand total</span>
 <span class="text-xl font-semibold text-gray-950 dark:text-white">{{ money(grandTotal) }}</span>
 </div>
 </div>

 <AppInput
 v-model="form.paid_amount"
 label="Paid amount"
 type="number"
 :error="fieldErrors.paid_amount"
 />

 <div class="rounded-[12px] bg-gray-950/[0.035] p-4 dark:bg-white/[0.055]">
 <div class="flex items-center justify-between">
 <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
 Balance
 </span>
 <span class="text-lg font-semibold text-gray-950 dark:text-white">
 {{ money(balanceAmount) }}
 </span>
 </div>

 <p class="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
 Vendor payable balance is updated only when the invoice is received.
 </p>
 </div>
 </div>
 </section>

 <section class="rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
 Save creates a draft only. Use “Receive stock” from the list after checking quantities and costs.
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
 :disabled="!canSubmit"
 >
 {{ saving ? 'Saving...' : 'Save draft invoice' }}
 </AppButton>
 </div>
 </form>
 </AppModal>

 <VendorFormModal
 :open="vendorQuickAddOpen"
 mode="create"
 @close="vendorQuickAddOpen = false"
 @saved="onVendorCreated"
 />
</template>