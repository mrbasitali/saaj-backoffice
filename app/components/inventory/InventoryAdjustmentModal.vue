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
 product?: Product | null
 sku: string | null
 barcode: string | null
 name: string | null
 option_summary: string | null
 min_stock_level: number
 track_inventory: boolean
 is_active: boolean
 primary_image?: {
 image_url: string
 optimized_urls?: {
 thumb?: string | null
 card?: string | null
 }
 } | null
}

type Product = {
 id: number
 name: string
 slug: string
 is_active: boolean
 primary_image?: {
 image_url: string
 optimized_urls?: {
 thumb?: string | null
 card?: string | null
 }
 } | null
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

type ProductVariantSearchResponse = {
 data: ProductVariant[]
}

const props = defineProps<{
 open: boolean
 locations: InventoryLocation[]
}>()

const emit = defineEmits<{
 close: []
 saved: [message?: string]
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const variantsLoading = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})
const variantResults = ref<ProductVariant[]>([])
const selectedVariant = ref<ProductVariant | null>(null)
let variantRequestSequence = 0

const form = reactive({
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

const locationOptions = computed(() => [
 { label: 'Select location', value: null },
 ...props.locations
 .filter((location) => location.is_active)
 .map((location) => ({
 label: `${location.name} (${location.code})`,
 value: location.id,
 })),
])

const variantOptions = computed(() => [
 ...(selectedVariant.value ? [selectedVariant.value] : []),
 ...variantResults.value.filter((variant) => variant.id !== selectedVariant.value?.id),
].map((variant) => ({
 label: variant.product?.name || 'Unknown product',
 value: variant.id,
 hint: variantLabel(variant),
 imageUrl: variantImage(variant),
})))

const selectedProduct = computed(() => {
 return selectedVariant.value?.product || null
})

watch(
 () => props.open,
 async (open) => {
 if (!open) {
 variantRequestSequence++
 return
 }

 resetForm()
 await searchVariants('')
 },
)

async function searchVariants(term: string) {
 if (!props.open) return

 const sequence = ++variantRequestSequence
 variantsLoading.value = true

 try {
 const response = await $api<ProductVariantSearchResponse>('/admin/product-variants/search', {
 query: {
 q: term,
 limit: 20,
 },
 })

 if (sequence !== variantRequestSequence) return

 variantResults.value = response.data ?? []
 formError.value = ''
 } catch (error: any) {
 if (sequence !== variantRequestSequence) return

 variantResults.value = []
 formError.value = error?.data?.message || 'Could not load products. Please try searching again.'
 } finally {
 if (sequence === variantRequestSequence) variantsLoading.value = false
 }
}

function selectVariant(value: string | number | boolean | null) {
 selectedVariant.value = variantResults.value.find((variant) => variant.id === Number(value)) || null
}

function variantImage(variant: ProductVariant) {
 const image = variant.primary_image || variant.product?.primary_image

 return image?.optimized_urls?.thumb
 || image?.optimized_urls?.card
 || image?.image_url
 || null
}

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

 form.product_variant_id = null
 selectedVariant.value = null
 variantResults.value = []
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
 variant.barcode ? `Barcode ${variant.barcode}` : null,
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
 v-model="form.product_variant_id"
 class="lg:col-span-2"
 label="Product / variant"
 :options="variantOptions"
 placeholder="Search product, SKU, barcode or variant..."
 searchable
 remote
 :loading="variantsLoading"
 :error="fieldErrors.product_variant_id"
 @search="searchVariants"
 @change="selectVariant"
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
