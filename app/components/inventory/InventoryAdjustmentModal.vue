<script setup lang="ts">
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
 min_stock_level: number
 track_inventory: boolean
 is_active: boolean
}

type Product = {
 id: number
 name: string
 slug: string
 is_active: boolean
 variants?: ProductVariant[]
}

type InventoryStock = {
 id: number
 product_variant_id: number
 inventory_location_id: number
 on_hand_quantity: number
 reserved_quantity: number
 available_quantity: number
}

type InventoryAdjustmentResponse = {
 data: InventoryStock
 message?: string
}

const props = defineProps<{
 open: boolean
 products: Product[]
 locations: InventoryLocation[]
}>()

const emit = defineEmits<{
 close: []
 saved: [message?: string]
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const form = reactive({
 product_id: null as number | null,
 product_variant_id: null as number | null,
 inventory_location_id: null as number | null,
 type: 'adjustment',
 quantity_change: 1,
 note: '',
})

const typeOptions = [
 { label: 'Adjustment', value: 'adjustment' },
 { label: 'Opening stock', value: 'opening' },
 { label: 'Damaged / write-off', value: 'damaged' },
]

const productOptions = computed(() => [
 { label: 'Select product', value: null },
 ...props.products.map((product) => ({
 label: product.name,
 value: product.id,
 })),
])

const locationOptions = computed(() => [
 { label: 'Select location', value: null },
 ...props.locations
 .filter((location) => location.is_active)
 .map((location) => ({
 label: `${location.name} (${location.code})`,
 value: location.id,
 })),
])

const selectedProduct = computed(() => {
 return props.products.find((product) => product.id === Number(form.product_id)) || null
})

const variantOptions = computed(() => [
 { label: 'Select variant', value: null },
 ...(selectedProduct.value?.variants || []).map((variant) => ({
 label: variantLabel(variant),
 value: variant.id,
 })),
])

const selectedVariant = computed(() => {
 return selectedProduct.value?.variants?.find((variant) => variant.id === Number(form.product_variant_id)) || null
})

watch(
 () => props.open,
 (open) => {
 if (!open) return
 resetForm()
 },
)

watch(
 () => props.locations,
 () => {
 if (!props.open || form.inventory_location_id) return

 form.inventory_location_id = props.locations.find((location) => location.is_default && location.is_active)?.id
 || props.locations.find((location) => location.is_active)?.id
 || null
 },
 { immediate: true },
)

watch(
 () => form.product_id,
 () => {
 const firstVariant = selectedProduct.value?.variants?.[0]
 form.product_variant_id = firstVariant?.id || null
 },
)

watch(
 () => form.type,
 (type) => {
 if (type === 'opening' && Number(form.quantity_change) <= 0) {
 form.quantity_change = 1
 }

 if (type === 'damaged' && Number(form.quantity_change) >= 0) {
 form.quantity_change = -1
 }
 },
)

function resetForm() {
 formError.value = ''
 fieldErrors.value = {}

 form.product_id = props.products[0]?.id || null
 form.product_variant_id = props.products[0]?.variants?.[0]?.id || null
 form.inventory_location_id = props.locations.find((location) => location.is_default && location.is_active)?.id
 || props.locations.find((location) => location.is_active)?.id
 || null
 form.type = 'adjustment'
 form.quantity_change = 1
 form.note = ''
}

function variantLabel(variant: ProductVariant) {
 const parts = [
 variant.option_summary || variant.name || 'Default',
 variant.sku ? `SKU ${variant.sku}` : null,
 !variant.is_active ? 'Inactive' : null,
 ].filter(Boolean)

 return parts.join(' · ')
}

function quantityHint() {
 if (form.type === 'opening') return 'Opening stock must be positive.'
 if (form.type === 'damaged') return 'Damaged stock should be negative, for example -2.'

 return 'Use positive numbers to add stock and negative numbers to reduce stock.'
}

function normalizeErrors(error: any) {
 const errors = error?.data?.errors || {}
 const normalized: Record<string, string> = {}

 Object.keys(errors).forEach((key) => {
 normalized[key] = Array.isArray(errors[key]) ? errors[key][0] : String(errors[key])
 })

 return normalized
}

function quickQuantity(value: number) {
 form.quantity_change = value
}

function adjustBy(value: number) {
 form.quantity_change = Number(form.quantity_change || 0) + value
}

async function submit() {
 saving.value = true
 formError.value = ''
 fieldErrors.value = {}

 try {
 const response = await $api<InventoryAdjustmentResponse>('/admin/inventory-adjustments', {
 method: 'POST',
 body: {
 product_variant_id: Number(form.product_variant_id),
 inventory_location_id: Number(form.inventory_location_id),
 type: form.type,
 quantity_change: Number(form.quantity_change),
 note: form.note || null,
 },
 })

 emit('saved', response.message || 'Inventory adjusted successfully.')
 } catch (error: any) {
 fieldErrors.value = normalizeErrors(error)
 formError.value = error?.data?.message || Object.values(fieldErrors.value)[0] || 'Could not adjust inventory.'
 } finally {
 saving.value = false
 }
}
</script>

<template>
 <AppModal
 :open="open"
 title="Adjust inventory"
 description="Add opening stock, correct stock counts, or write off damaged items. Every change creates a movement log."
 max-width="max-w-3xl"
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

 <div class="grid gap-5 lg:grid-cols-2">
 <AppSelect
 v-model="form.product_id"
 label="Product"
 :options="productOptions"
 />

 <AppSelect
 v-model="form.product_variant_id"
 label="Variant"
 :options="variantOptions"
 />

 <AppSelect
 v-model="form.inventory_location_id"
 label="Location"
 :options="locationOptions"
 />

 <AppSelect
 v-model="form.type"
 label="Adjustment type"
 :options="typeOptions"
 />

 <div class="lg:col-span-2">
 <AppInput
 v-model="form.quantity_change"
 label="Quantity change"
 type="number"
 :error="fieldErrors.quantity_change"
 />

 <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
 {{ quantityHint() }}
 </p>

 <div class="mt-3 flex flex-wrap gap-2">
 <button
 v-for="value in [-10, -5, -1, 1, 5, 10]"
 :key="value"
 type="button"
 class="rounded-[8px] bg-gray-950/[0.04] px-3 py-2 text-[12px] font-medium text-gray-500 transition hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200"
 @click="quickQuantity(value)"
 >
 {{ value > 0 ? `+${value}` : value }}
 </button>

 <button
 type="button"
 class="rounded-[8px] bg-gray-950/[0.04] px-3 py-2 text-[12px] font-medium text-gray-500 transition hover:bg-gray-950/[0.065] hover:text-gray-800 dark:bg-white/[0.06] dark:text-gray-500 dark:hover:bg-white/[0.085] dark:hover:text-gray-200"
 @click="adjustBy(1)"
 >
 Add +1
 </button>
 </div>
 </div>

 <AppTextarea
 v-model="form.note"
 class="lg:col-span-2"
 label="Internal note"
 placeholder="Example: opening stock from physical count, damaged piece, manual correction..."
 :rows="3"
 :error="fieldErrors.note"
 />
 </div>

 <div
 v-if="selectedVariant"
 class="mt-5 rounded-[14px] bg-gray-950/[0.035] p-4 dark:bg-white/[0.055]"
 >
 <p class="text-sm font-semibold text-gray-900 dark:text-white">
 Selected variant
 </p>

 <div class="mt-3 grid gap-3 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-3">
 <p>
 <span class="block text-xs font-semibold uppercase tracking-wide text-gray-400">Product</span>
 {{ selectedProduct?.name }}
 </p>

 <p>
 <span class="block text-xs font-semibold uppercase tracking-wide text-gray-400">Variant</span>
 {{ selectedVariant.option_summary || selectedVariant.name || 'Default' }}
 </p>

 <p>
 <span class="block text-xs font-semibold uppercase tracking-wide text-gray-400">Min stock</span>
 {{ selectedVariant.min_stock_level }} units
 </p>
 </div>
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
 :disabled="!form.product_variant_id || !form.inventory_location_id"
 >
 {{ saving ? 'Saving...' : 'Save adjustment' }}
 </AppButton>
 </div>
 </form>
 </AppModal>
</template>