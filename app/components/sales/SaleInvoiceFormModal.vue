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

type InventoryLocation = {
 id: number
 name: string
 code: string
 is_default: boolean
 is_active: boolean
}

type ProductImage = {
 id?: number
 image_url?: string | null
 optimized_urls?: {
 thumb?: string | null
 card?: string | null
 detail?: string | null
 } | null
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
 sale_price?: string | number | null
 track_inventory: boolean
 allow_backorder: boolean
 min_stock_level: number
 is_default: boolean
 is_active: boolean
 primary_image?: ProductImage | null
}

type Product = {
 id: number
 name: string
 slug: string
 is_active: boolean
 primary_image?: ProductImage | null
 variants?: ProductVariant[]
}

type FlatVariant = ProductVariant & {
 product_name?: string
 product_slug?: string
 product_is_active?: boolean
 product_primary_image?: ProductImage | null
}

type InventoryStock = {
 id: number
 product_variant_id: number
 inventory_location_id: number
 on_hand_quantity: number
 reserved_quantity: number
 available_quantity: number
}

type SaleItem = {
 id?: number
 /** Client-only stable key for this row — never sent to the backend. */
 _uid?: string
 product_variant_id: number | null
 quantity: number
 unit_price: number
 discount_amount: number
 tax_amount: number
 line_total?: string | number
 notes: string | null
}

type SaleInvoice = {
 id: number
 customer_id: number | null
 inventory_location_id: number
 invoice_number: string
 channel: string
 sale_date: string
 status: string
 payment_status: string
 customer_name: string | null
 customer_phone: string | null
 subtotal: string | number
 discount_total: string | number
 invoice_discount_amount: string | number
 tax_total: string | number
 shipping_cost: string | number
 grand_total: string | number
 paid_amount: string | number
 balance_amount: string | number
 notes: string | null
 items?: SaleItem[]
}

type SaleInvoiceResponse = {
 data: SaleInvoice
 message?: string
}

const props = defineProps<{
 open: boolean
 mode: 'create' | 'edit'
 invoice?: SaleInvoice | null
 customers: Customer[]
 locations: InventoryLocation[]
 products: Product[]
 stocks: InventoryStock[]
}>()

const emit = defineEmits<{
 close: []
 saved: [invoice: SaleInvoice, message?: string]
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const form = reactive({
 customer_id: null as number | null,
 inventory_location_id: null as number | null,
 invoice_number: '',
 channel: 'manual',
 sale_date: todayDate(),
 customer_name: '',
 customer_phone: '',
 invoice_discount_amount: 0,
 shipping_cost: 0,
 paid_amount: 0,
 notes: '',
 items: [] as SaleItem[],
})

const channelOptions = [
 { label: 'Manual sale', value: 'manual', hint: 'Back-office sale invoice' },
 { label: 'POS', value: 'pos', hint: 'In-store counter sale' },
 { label: 'Online', value: 'online', hint: 'Website or marketplace order' },
]

const title = computed(() => props.mode === 'create' ? 'New sale invoice' : 'Edit sale invoice')

const description = computed(() => {
 return props.mode === 'create'
 ? 'Create a draft sale. Stock is deducted only when you complete the invoice.'
 : 'Edit this draft sale invoice before completing it.'
})

function customerLabel(customer: Customer) {
 return `${customer.name} (${customer.code})`
}

function customerHint(customer: Customer) {
 return [
 customer.phone,
 Number(customer.current_balance || 0) > 0 ? `Balance ${money(customer.current_balance)}` : null,
 ].filter(Boolean).join(' · ')
}

function customerOption(customer: Customer) {
 return {
 label: customerLabel(customer),
 value: customer.id,
 hint: customerHint(customer),
 }
}

const allKnownCustomers = computed(() => {
 const merged = new Map<number, Customer>()

 props.customers.forEach((customer) => merged.set(customer.id, customer))
 Object.values(extraCustomers.value).forEach((customer) => merged.set(customer.id, customer))

 return merged
})

const customerOptions = computed(() => {
 // Before the first search resolves (a fraction of a second after
 // opening — AppSelect fires an empty search immediately on open),
 // fall back to a small slice of the bootstrap list rather than
 // however many were loaded at startup — keeps this dropdown honestly
 // bounded to "a few, or search," never "everything."
 const results = customerSearchResults.value.length > 0 || customerSearchQuery.value.trim()
 ? customerSearchResults.value
 : props.customers
 .filter((customer) => customer.is_active || customer.id === props.invoice?.customer_id)
 .slice(0, 20)

 const selectedId = form.customer_id
 const options = [...results]

 if (selectedId && !options.some((customer) => Number(customer.id) === Number(selectedId))) {
 const selected = allKnownCustomers.value.get(Number(selectedId))
 if (selected) options.unshift(selected)
 }

 return [
 { label: 'Walk-in / guest customer', value: null, hint: 'No customer account linked' },
 ...options.map(customerOption),
 ]
})

const locationOptions = computed(() => [
 { label: 'Select location', value: null },
 ...props.locations
 .filter((location) => location.is_active || location.id === props.invoice?.inventory_location_id)
 .map((location) => ({
 label: `${location.name} (${location.code})`,
 value: location.id,
 })),
])

// Variants found via barcode scan OR the item-picker's live search that
// weren't already in props.products (e.g. the catalog has more than the
// 100 products loaded into this form's bootstrap) — merged into
// flatVariants below so a scanned/searched item still displays correctly
// (name, price, barcode) regardless of catalog size. Available-stock
// display can still be inaccurate for these until a variant's own
// location/stock row happens to already be loaded — see SETUP notes.
const scannedVariants = ref<Record<number, FlatVariant>>({})

const scanCode = ref('')
const scanning = ref(false)
const scanFeedback = ref<{ type: 'success' | 'error', message: string } | null>(null)
const scanFeedbackTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const scanInputRef = ref<InstanceType<typeof AppInput> | null>(null)

let uidCounter = 0
function nextUid() {
 uidCounter += 1
 return `item-${uidCounter}`
}

// "Search by name" is a single, explicit, on-demand fallback for when
// there's no barcode/SKU to scan or type — not a per-row dropdown.
// Deliberately not the default interaction: opening N independent
// search dropdowns (one per cart row) is both slower to use than
// scanning and unnecessary complexity most sales never need.
const nameSearchOpen = ref(false)
const nameSearchValue = ref<number | null>(null)
const nameSearchResults = ref<FlatVariant[]>([])
const nameSearchLoading = ref(false)

// Same "found outside the initially-loaded page" merge pattern as
// scannedVariants above, but for customers.
const extraCustomers = ref<Record<number, Customer>>({})
const customerQuickAddOpen = ref(false)
const customerSearchQuery = ref('')
const customerSearchResults = ref<Customer[]>([])
const customerSearchLoading = ref(false)

// Debounced check: does this walk-in's typed phone already belong to a
// registered customer? Nothing did this before — see SETUP notes.
const phoneMatch = ref<Customer | null>(null)
const phoneMatchChecking = ref(false)
const phoneMatchTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const flatVariants = computed<FlatVariant[]>(() => {
 const fromProducts = props.products.flatMap((product) => {
 return (product.variants || [])
 .filter((variant) => variant.is_active)
 .map((variant) => ({
 ...variant,
 product_name: product.name,
 product_slug: product.slug,
 product_is_active: product.is_active,
 product_primary_image: product.primary_image || null,
 }))
 })

 const knownIds = new Set(fromProducts.map((variant) => variant.id))
 const extra = Object.values(scannedVariants.value).filter((variant) => !knownIds.has(variant.id))

 return [...fromProducts, ...extra]
})

const selectedCustomer = computed(() => {
 return allKnownCustomers.value.get(Number(form.customer_id)) || null
})

const subtotal = computed(() => {
 return form.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0)
})

const itemDiscountTotal = computed(() => {
 return form.items.reduce((sum, item) => sum + Number(item.discount_amount || 0), 0)
})

const overallDiscountAmount = computed(() => Math.max(0, Number(form.invoice_discount_amount || 0)))

const discountTotal = computed(() => itemDiscountTotal.value + overallDiscountAmount.value)

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
 const linesAreValid = form.items.every((item) => {
 const gross = Number(item.quantity || 0) * Number(item.unit_price || 0)
 return item.product_variant_id
 && Number(item.quantity) > 0
 && Number(item.unit_price) >= 0
 && Number(item.discount_amount || 0) >= 0
 && Number(item.discount_amount || 0) <= gross
 && Number(item.tax_amount || 0) >= 0
 })
 const discountableAmount = Math.max(0, subtotal.value - itemDiscountTotal.value)
 const rawOverallDiscount = Number(form.invoice_discount_amount || 0)

 return Boolean(
 form.inventory_location_id
 && form.channel
 && form.sale_date
 && form.items.length
 && linesAreValid
 && rawOverallDiscount >= 0
 && overallDiscountAmount.value <= discountableAmount
 && Number(form.shipping_cost || 0) >= 0
 && Number(form.paid_amount || 0) >= 0
 && Number(form.paid_amount || 0) <= grandTotal.value,
 )
})

watch(
 () => [props.open, props.invoice, props.mode] as const,
 () => {
 if (!props.open) return
 resetForm()
 scanCode.value = ''
 scanFeedback.value = null
 phoneMatch.value = null
 customerSearchQuery.value = ''
 customerSearchResults.value = []
 focusScanInput()
 },
 { immediate: true },
)

watch(
 () => form.customer_id,
 () => {
 phoneMatch.value = null

 if (!selectedCustomer.value) return

 form.customer_name = selectedCustomer.value.name
 form.customer_phone = selectedCustomer.value.phone || ''
 },
)

watch(() => form.customer_phone, checkPhoneMatch)

watch(
 () => form.inventory_location_id,
 () => {
 form.items = form.items.map((item) => ({ ...item }))
 },
)

function todayDate() {
 return new Date().toISOString().slice(0, 10)
}

function resetForm() {
 formError.value = ''
 fieldErrors.value = {}

 form.customer_id = props.invoice?.customer_id ?? null
 form.inventory_location_id = props.invoice?.inventory_location_id
 ?? props.locations.find((location) => location.is_default && location.is_active)?.id
 ?? props.locations.find((location) => location.is_active)?.id
 ?? null
 form.invoice_number = props.invoice?.invoice_number ?? ''
 form.channel = props.invoice?.channel ?? 'manual'
 form.sale_date = props.invoice?.sale_date ?? todayDate()
 form.customer_name = props.invoice?.customer_name ?? ''
 form.customer_phone = props.invoice?.customer_phone ?? ''
 form.invoice_discount_amount = Number(props.invoice?.invoice_discount_amount ?? 0)
 form.shipping_cost = Number(props.invoice?.shipping_cost ?? 0)
 form.paid_amount = Number(props.invoice?.paid_amount ?? 0)
 form.notes = props.invoice?.notes ?? ''

 form.items = props.invoice?.items?.length
 ? props.invoice.items.map((item) => ({
 _uid: nextUid(),
 product_variant_id: Number(item.product_variant_id),
 quantity: Number(item.quantity || 1),
 unit_price: Number(item.unit_price || 0),
 discount_amount: Number(item.discount_amount || 0),
 tax_amount: Number(item.tax_amount || 0),
 notes: item.notes || '',
 }))
 : []
}

function imageUrl(image?: ProductImage | null) {
 return image?.optimized_urls?.thumb
 || image?.optimized_urls?.card
 || image?.image_url
 || null
}

function variantImageUrl(variant: FlatVariant) {
 return imageUrl(variant.primary_image) || imageUrl(variant.product_primary_image)
}

function variantLabel(variant: FlatVariant) {
 const option = variant.option_summary || variant.name || (variant.is_default ? 'Default' : 'Variant')

 return [
 variant.product_name || 'Product',
 option,
 variant.sku ? `SKU ${variant.sku}` : null,
 ].filter(Boolean).join(' · ')
}

function variantHint(variant: FlatVariant) {
 const stock = stockForVariant(variant.id)
 const available = variant.track_inventory ? Number(stock?.available_quantity || 0) : null

 return [
 `Price ${money(variant.sale_price || variant.price || 0)}`,
 variant.track_inventory ? `Available ${available}` : 'No stock tracking',
 variant.allow_backorder ? 'Backorder allowed' : null,
 ].filter(Boolean).join(' · ')
}

function selectedVariant(variantId: number | null) {
 if (!variantId) return null

 return flatVariants.value.find((variant) => Number(variant.id) === Number(variantId)) || null
}

// Precomputed once per render instead of calling selectedVariant() four
// separate times per row in the template. `item` here is the same
// reactive object as in form.items (map() doesn't clone it), so
// v-model bindings on it still mutate the real array entry.
const cartRows = computed(() => {
 return form.items.map((item) => ({
 item,
 variant: selectedVariant(item.product_variant_id),
 }))
})

function stockForVariant(variantId: number | null) {
 if (!variantId || !form.inventory_location_id) return null

 return props.stocks.find((stock) => {
 return Number(stock.product_variant_id) === Number(variantId)
 && Number(stock.inventory_location_id) === Number(form.inventory_location_id)
 }) || null
}

function lineAvailable(item: SaleItem) {
 const variant = selectedVariant(item.product_variant_id)

 if (!variant) return 0
 if (!variant.track_inventory) return 999999
 if (variant.allow_backorder) return 999999

 return Number(stockForVariant(item.product_variant_id)?.available_quantity || 0)
}

function lineTotal(item: SaleItem) {
 const gross = Number(item.quantity || 0) * Number(item.unit_price || 0)

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

type LookupResponse = {
 data: ProductVariant & {
 product?: { name?: string, slug?: string, is_active?: boolean } | null
 }
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

/** Merges an API-shaped variant (nested `product`) into the flat cache so
 * it's resolvable everywhere (selectedVariant, stock lookups, labels). */
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

/** Shared by scanning, SKU entry, and the "Search by name" fallback —
 * one consistent add-or-increment behavior no matter how the item was
 * found. */
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
 unit_price: Number(variant.sale_price || variant.price || 0),
 discount_amount: 0,
 tax_amount: 0,
 notes: '',
 })

 showScanFeedback('success', `Added — ${label}`)
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

 const results: FlatVariant[] = (response.data || []).map((variant) => ({
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
 hint: variantHint(variant),
 imageUrl: variantImageUrl(variant),
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

type CustomerSearchResponse = {
 data: Customer[]
}

async function searchCustomers(term: string) {
 customerSearchQuery.value = term
 customerSearchLoading.value = true

 try {
 const response = await $api<CustomerSearchResponse>('/admin/customers', {
 query: { search: term, is_active: 1, per_page: 20, sort_by: 'name' },
 })

 const results = response.data || []
 customerSearchResults.value = results

 const merged = { ...extraCustomers.value }
 results.forEach((customer) => { merged[customer.id] = customer })
 extraCustomers.value = merged
 } catch {
 customerSearchResults.value = []
 } finally {
 customerSearchLoading.value = false
 }
}

function onCustomerCreated(customer: Customer) {
 extraCustomers.value = { ...extraCustomers.value, [customer.id]: customer }
 form.customer_id = customer.id
 customerQuickAddOpen.value = false
 showScanFeedback('success', `Customer added — ${customer.name}`)
}

/**
 * Nothing checked this before at all — a walk-in's typed phone number
 * never got compared against registered customers, so an existing
 * customer buying as a "guest" would silently split their history in
 * two. `phone` is unique on the customers table, so this is a simple
 * exact-match check, debounced so it only fires once typing pauses.
 */
type PhoneLookupResponse = {
 data: Customer | null
}

function checkPhoneMatch() {
 phoneMatch.value = null

 if (phoneMatchTimer.value) clearTimeout(phoneMatchTimer.value)

 const phone = form.customer_phone.trim()

 if (form.customer_id || phone.length < 6) return

 phoneMatchTimer.value = setTimeout(async () => {
 phoneMatchChecking.value = true

 try {
 const response = await $api<PhoneLookupResponse>('/admin/customers/lookup-phone', {
 query: { phone },
 })

 if (response.data) {
 phoneMatch.value = response.data
 extraCustomers.value = { ...extraCustomers.value, [response.data.id]: response.data }
 }
 } catch {
 // Non-critical — a failed check just means no hint shown, sale isn't blocked.
 } finally {
 phoneMatchChecking.value = false
 }
 }, 500)
}

function useMatchedCustomer() {
 if (!phoneMatch.value) return

 form.customer_id = phoneMatch.value.id
 phoneMatch.value = null
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

 return error?.data?.message || 'Could not save sale invoice.'
}

function payload() {
 return {
 customer_id: form.customer_id ? Number(form.customer_id) : null,
 inventory_location_id: Number(form.inventory_location_id),
 invoice_number: form.invoice_number || undefined,
 channel: form.channel,
 sale_date: form.sale_date,
 customer_name: form.customer_name || null,
 customer_phone: form.customer_phone || null,
 invoice_discount_amount: Number(form.invoice_discount_amount || 0),
 shipping_cost: Number(form.shipping_cost || 0),
 paid_amount: Number(form.paid_amount || 0),
 notes: form.notes || null,
 items: form.items.map((item) => ({
 product_variant_id: Number(item.product_variant_id),
 quantity: Number(item.quantity || 0),
 unit_price: Number(item.unit_price || 0),
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
 const response = await $api<SaleInvoiceResponse>(
 props.mode === 'create' ? '/admin/sale-invoices' : `/admin/sale-invoices/${props.invoice?.id}`,
 {
 method: props.mode === 'create' ? 'POST' : 'PATCH',
 body: payload(),
 },
 )

 emit('saved', response.data, response.message || 'Sale invoice saved successfully.')
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
 max-width="max-w-[98vw]"
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
 <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
 <div>
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Sale items
 </h3>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Scan or type a barcode/SKU below — fastest way to add an item.
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
 No active product variants are available. Create product variants or ensure default variants are generated for simple products.
 </div>

 <div
 v-else-if="form.items.length === 0"
 class="mt-5 rounded-[13px] bg-gray-950/[0.025] p-6 text-center text-[12px] text-gray-500 dark:bg-white/[0.035] dark:text-gray-500"
 >
 Cart is empty — scan a barcode above, or "Search by name" if there's no tag.
 </div>

 <div
 v-else
 class="mt-5 space-y-4"
 >
 <div
 v-for="({ item, variant }, index) in cartRows"
 :key="item._uid || index"
 class="rounded-[14px] bg-gray-950/[0.035] p-4 dark:bg-white/[0.03]"
 >
 <div class="grid gap-4 2xl:grid-cols-[minmax(320px,1.7fr)_110px_130px_130px_130px_120px] 2xl:items-start">
 <div>
 <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
 Product
 </p>

 <div class="flex min-h-11 items-center gap-3 rounded-[14px] bg-gray-950/[0.035] px-3 py-2 dark:bg-white/[0.055]">
 <span
 v-if="variant && variantImageUrl(variant)"
 class="h-10 w-10 shrink-0 overflow-hidden rounded-[10px] bg-gray-950/[0.035] dark:bg-white/[0.055]"
 >
 <img
 :src="variantImageUrl(variant) || ''"
 :alt="variant.product_name || ''"
 class="h-full w-full object-cover"
 loading="lazy"
 >
 </span>

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
 v-model="item.unit_price"
 label="Unit price"
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

 <div class="flex h-11 items-center rounded-[14px] bg-gray-950/[0.035] px-3 text-sm font-semibold text-gray-950 dark:bg-white/[0.055] dark:text-white">
 {{ money(lineTotal(item)) }}
 </div>
 </div>
 </div>

 <div class="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
 <AppInput
 v-model="item.notes"
 placeholder="Line note, optional"
 />

 <div class="rounded-[10px] bg-gray-950/[0.035] px-4 py-2 text-[11px] font-semibold text-gray-600 dark:bg-white/[0.055] dark:text-gray-300">
 Available:
 {{ lineAvailable(item) >= 999999 ? 'No limit' : lineAvailable(item) }}
 </div>

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

 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Customer
 </h3>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Leave as walk-in for a guest sale, or search to link a registered customer.
 </p>

 <div class="mt-5 space-y-4">
 <div class="flex items-end gap-2">
 <div class="flex-1">
 <AppSelect
 v-model="form.customer_id"
 label="Customer"
 placeholder="Search by name, code, or phone..."
 :options="customerOptions"
 remote
 :loading="customerSearchLoading"
 searchable
 @search="searchCustomers"
 />
 </div>

 <AppButton
 type="button"
 variant="secondary"
 @click="customerQuickAddOpen = true"
 >
 New
 </AppButton>
 </div>

 <div class="grid gap-4 sm:grid-cols-2">
 <AppInput
 v-model="form.customer_phone"
 label="Phone"
 :placeholder="form.customer_id ? 'Override for this sale only' : 'Optional, for a walk-in receipt/record'"
 :error="fieldErrors.customer_phone"
 />

 <AppInput
 v-model="form.customer_name"
 label="Name"
 :placeholder="form.customer_id ? 'Override for this sale only' : 'Optional, for a walk-in receipt/record'"
 :error="fieldErrors.customer_name"
 />
 </div>

 <div
 v-if="phoneMatchChecking"
 class="text-xs text-gray-400 dark:text-gray-500"
 >
 Checking if this phone belongs to an existing customer…
 </div>

 <div
 v-else-if="phoneMatch"
 class="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-blue-500/[0.07] px-4 py-3 text-sm text-blue-800 dark:bg-blue-500/10 dark:text-blue-200"
 >
 <span>
 This phone already belongs to <strong>{{ phoneMatch.name }}</strong> ({{ phoneMatch.code }}) — link this sale to their account instead?
 </span>

 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 @click="useMatchedCustomer"
 >
 Use this customer
 </AppButton>
 </div>
 </div>
 </section>

 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:p-5">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Sale details
 </h3>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Channel, dates and the inventory location where stock will be deducted.
 </p>

 <div class="mt-5 grid gap-5 lg:grid-cols-2">
 <AppSelect
 v-model="form.inventory_location_id"
 label="Stock location"
 :options="locationOptions"
 />

 <AppSelect
 v-model="form.channel"
 label="Channel"
 :options="channelOptions"
 />

 <AppInput
 v-model="form.invoice_number"
 label="Invoice number"
 placeholder="Auto generated if empty"
 :error="fieldErrors.invoice_number"
 />

 <AppInput
 v-model="form.sale_date"
 label="Sale date"
 type="date"
 :error="fieldErrors.sale_date"
 required
 />

 <AppTextarea
 v-model="form.notes"
 class="lg:col-span-2"
 label="Internal notes"
 placeholder="Sale notes, delivery notes, order reference..."
 :rows="3"
 :error="fieldErrors.notes"
 />
 </div>
 </section>
 </div>

 <aside class="space-y-5 xl:sticky xl:top-4 xl:self-start">
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
 <span class="text-gray-500 dark:text-gray-400">Item discounts</span>
 <span class="font-semibold text-gray-950 dark:text-white">-{{ money(itemDiscountTotal) }}</span>
 </div>

 <AppInput
 v-model="form.invoice_discount_amount"
 label="Overall discount"
 type="number"
 :error="fieldErrors.invoice_discount_amount"
 />

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
 Customer balance is updated only when the invoice is completed.
 </p>
 </div>
 </div>
 </section>

 <section class="rounded-[12px] bg-blue-500/[0.07] p-4 text-sm leading-6 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
 Products are now first so order entry feels faster. Dropdowns open above the modal and flip automatically when space is limited.
 </section>

 <section class="rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
 Save creates a draft only. Use “Complete” from the list after checking stock, price and payment.
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
 {{ saving ? 'Saving...' : 'Save draft sale' }}
 </AppButton>
 </div>
 </form>
 </AppModal>

 <CustomerFormModal
 :open="customerQuickAddOpen"
 mode="create"
 @close="customerQuickAddOpen = false"
 @saved="onCustomerCreated"
 />
</template>