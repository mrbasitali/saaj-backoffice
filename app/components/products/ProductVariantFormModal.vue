<script setup lang="ts">
type AttributeValue = {
 id: number
 attribute_id: number
 value: string
 slug: string
 color_code: string | null
 is_active: boolean
}

type Attribute = {
 id: number
 name: string
 code: string
 is_variant: boolean
 is_active: boolean
 values?: AttributeValue[]
}

type PaginationMeta = {
 current_page: number
 last_page: number
 per_page: number
 total: number
}

type AttributesResponse = {
 data: Attribute[]
 meta: PaginationMeta
}

type VariantAttributeValue = {
 attribute_id: number
 attribute_name?: string | null
 value_id: number
 value: string
}

export type Variant = {
 id: number
 product_id: number
 sku: string
 barcode: string | null
 name: string | null
 option_summary: string | null
 cost_price?: number | string | null
 price: number | string
 sale_price: number | string | null
 compare_at_price: number | string | null
 track_inventory: boolean
 allow_backorder: boolean
 min_stock_level: number
 weight_grams: number | null
 is_default: boolean
 is_active: boolean
 sort_order: number
 attribute_values?: VariantAttributeValue[]
}

type VariantResponse = {
 data: Variant
 message?: string
}

type VariantSection =
 | 'identity'
 | 'options'
 | 'pricing'
 | 'inventory'

const props = defineProps<{
 open: boolean
 mode: 'create' | 'edit'
 productId: number
 productName: string
 brandName?: string | null
 brandLogoUrl?: string | null
 cardDescription?: string | null
 hasDefaultVariant: boolean
 variant?: Variant | null
}>()

const emit = defineEmits<{
 close: []
 saved: [variant: Variant]
}>()

const { $api } = useNuxtApp()

const activeSection = ref<VariantSection>('identity')

const sections: {
 key: VariantSection
 label: string
}[] = [
 {
 key: 'identity',
 label: 'Identity',
 },
 {
 key: 'options',
 label: 'Options',
 },
 {
 key: 'pricing',
 label: 'Pricing',
 },
 {
 key: 'inventory',
 label: 'Inventory',
 },
]

const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const attributes = ref<Attribute[]>([])
const attributesLoading = ref(false)

const form = reactive({
 sku: '',
 barcode: '',
 price: '',
 sale_price: '',
 compare_at_price: '',
 cost_price: '',
 track_inventory: true,
 allow_backorder: false,
 min_stock_level: '0',
 weight_grams: '',
 is_default: false,
 is_active: true,
})

const selectedValues = reactive<Record<number, string>>({})

const title = computed(() => {
 return props.mode === 'create'
 ? 'Add variant'
 : 'Edit variant'
})

const description = computed(() => {
 return `${props.productName} · Configure the sellable SKU, options, pricing and inventory behavior.`
})

const attributeOptions = computed(() => {
 return attributes.value.map((attribute) => ({
 attribute,

 options: (attribute.values ?? [])
 .filter((value) => value.is_active)
 .map((value) => ({
 label: value.value,
 value: String(value.id),
 })),
 }))
})

const previewOptionSummary = computed(() => {
 return attributeOptions.value
 .map(({ attribute, options }) => {
 const selected = selectedValues[attribute.id]

 return options.find(
 (option) => option.value === selected,
 )?.label
 })
 .filter(Boolean)
 .join(' / ')
})

const previewCodeValue = computed(() => {
 return form.barcode.trim() || form.sku.trim()
})

const previewPrice = computed(() => {
 return Number(form.sale_price !== '' ? form.sale_price : (form.price || 0))
})

const pricingPreview = computed(() => {
 const originalPrice = Number(form.price)
 const salePrice = Number(form.sale_price)
 const hasOriginalPrice = form.price !== '' && Number.isFinite(originalPrice)
 const hasSalePrice = form.sale_price !== '' && Number.isFinite(salePrice)
 const isOnSale = hasOriginalPrice && hasSalePrice && salePrice < originalPrice

 return {
  originalPrice,
  salePrice,
  isOnSale,
  savings: isOnSale ? originalPrice - salePrice : 0,
  discountPercentage: isOnSale && originalPrice > 0
   ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
   : 0,
 }
})

const salePriceError = computed(() => {
 if (form.sale_price === '' || form.price === '') {
  return ''
 }

 return Number(form.sale_price) >= Number(form.price)
  ? 'Sale price must be lower than the original price.'
  : ''
})

function money(value: number) {
 return `Rs ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

const selectedOptionCount = computed(() => {
 return Object.values(selectedValues).filter(Boolean).length
})

const sectionTabs = computed(() => {
 return sections.map((section) => ({
 label: section.label,
 value: section.key,
 count:
 section.key === 'options'
 ? selectedOptionCount.value
 : undefined,
 }))
})

function setActiveSection(value: string) {
 activeSection.value = value as VariantSection
}

watch(
 () => [props.open, props.variant, props.mode] as const,
 () => {
 if (!props.open) {
 return
 }

 activeSection.value = 'identity'

 resetForm()
 loadAttributes()
 },
 { immediate: true },
)

function resetForm() {
 formError.value = ''
 fieldErrors.value = {}

 const variant = props.variant

 form.sku = variant?.sku ?? ''
 form.barcode = variant?.barcode ?? ''

 form.price = variant
 ? String(variant.price)
 : ''

 form.sale_price =
 variant?.sale_price != null
 ? String(variant.sale_price)
 : ''

 form.compare_at_price =
 variant?.compare_at_price != null
 ? String(variant.compare_at_price)
 : ''

 form.cost_price =
 variant?.cost_price != null
 ? String(variant.cost_price)
 : ''

 form.track_inventory =
 variant?.track_inventory ?? true

 form.allow_backorder =
 variant?.allow_backorder ?? false

 form.min_stock_level = variant
 ? String(variant.min_stock_level)
 : '0'

 form.weight_grams =
 variant?.weight_grams != null
 ? String(variant.weight_grams)
 : ''

 form.is_default =
 variant?.is_default ??
 !props.hasDefaultVariant

 form.is_active =
 variant?.is_active ?? true

 Object.keys(selectedValues).forEach((key) => {
 delete selectedValues[Number(key)]
 })

 variant?.attribute_values?.forEach((attributeValue) => {
 selectedValues[attributeValue.attribute_id] =
 String(attributeValue.value_id)
 })
}

async function loadAttributes() {
 attributesLoading.value = true

 try {
 const response = await $api<AttributesResponse>(
 '/admin/attributes',
 {
 query: {
 include_values: 1,
 is_variant: 1,
 is_active: 1,
 per_page: 100,
 },
 },
 )

 attributes.value = response.data ?? []
 } catch {
 attributes.value = []
 } finally {
 attributesLoading.value = false
 }
}

function randomSuffix(
 length: number,
 digitsOnly = false,
) {
 const chars = digitsOnly
 ? '0123456789'
 : 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

 let out = ''

 for (let i = 0; i < length; i++) {
 out += chars[
 Math.floor(Math.random() * chars.length)
 ]
 }

 return out
}

function slugPart(
 value: string,
 length: number,
) {
 return (
 value
 .toUpperCase()
 .replace(/[^A-Z0-9]+/g, '')
 .slice(0, length) ||
 'ITEM'
 )
}

function generateSku() {
 const productPart = slugPart(
 props.productName,
 6,
 )

 const optionPart = attributeOptions.value
 .map(({ attribute, options }) => {
 const selected =
 selectedValues[attribute.id]

 const match = options.find(
 (option) =>
 option.value === selected,
 )

 return match
 ? slugPart(match.label, 3)
 : ''
 })
 .filter(Boolean)
 .join('-')

 form.sku = [
 productPart,
 optionPart,
 randomSuffix(4),
 ]
 .filter(Boolean)
 .join('-')
}

function useSkuAsBarcode() {
 if (!form.sku) {
 generateSku()
 }

 form.barcode = form.sku
}

function onAttributeChange(
 attributeId: number,
 value: string,
) {
 if (value) {
 selectedValues[attributeId] = value
 } else {
 delete selectedValues[attributeId]
 }
}

function normalizeErrors(error: any) {
 const errors =
 error?.data?.errors || {}

 const normalized:
 Record<string, string> = {}

 Object.keys(errors).forEach((key) => {
 normalized[key] =
 Array.isArray(errors[key])
 ? errors[key][0]
 : String(errors[key])
 })

 return normalized
}

function sectionForErrors(
 errors: Record<string, string>,
): VariantSection {
 const keys = Object.keys(errors)

 if (
 keys.some((key) =>
 key.startsWith('attributes'),
 )
 ) {
 return 'options'
 }

 if (
 keys.some((key) =>
 [
 'price',
 'sale_price',
 'compare_at_price',
 'cost_price',
 ].includes(key),
 )
 ) {
 return 'pricing'
 }

 if (
 keys.some((key) =>
 [
 'track_inventory',
 'allow_backorder',
 'min_stock_level',
 'weight_grams',
 'is_default',
 'is_active',
 ].includes(key),
 )
 ) {
 return 'inventory'
 }

 return 'identity'
}

function friendlyErrorMessage(error: any) {
 const message = String(
 error?.data?.message || '',
 )

 const firstFieldError =
 Object.values(fieldErrors.value)[0]

 if (
 message
 .toLowerCase()
 .includes('sku')
 ) {
 return 'That SKU is already used by another variant. Try generating a new one.'
 }

 if (
 message
 .toLowerCase()
 .includes('barcode')
 ) {
 return 'That barcode is already used by another variant.'
 }

 if (firstFieldError) {
 return String(firstFieldError)
 }

 return (
 message ||
 'Could not save this variant. Please check the form and try again.'
 )
}

function variantPayload() {
 const attributesPayload =
 Object.entries(selectedValues)
 .filter(([, valueId]) => Boolean(valueId))
 .map(([attributeId, valueId]) => ({
 attribute_id: Number(attributeId),
 attribute_value_id: Number(valueId),
 }))

 return {
 sku: form.sku.trim(),

 barcode:
 form.barcode.trim() || null,

 price:
 Number(form.price || 0),

 sale_price:
 form.sale_price === ''
 ? null
 : Number(form.sale_price),

 compare_at_price:
 form.compare_at_price === ''
 ? null
 : Number(form.compare_at_price),

 cost_price:
 form.cost_price === ''
 ? 0
 : Number(form.cost_price),

 track_inventory:
 form.track_inventory,

 allow_backorder:
 form.allow_backorder,

 min_stock_level:
 Number(form.min_stock_level || 0),

 weight_grams:
 form.weight_grams === ''
 ? null
 : Number(form.weight_grams),

 is_default:
 form.is_default,

 is_active:
 form.is_active,

 attributes:
 attributesPayload,
 }
}

function buildFormData() {
 const data = new FormData()

 if (props.mode === 'edit') {
 data.append('_method', 'PATCH')
 }

 data.append(
 'data',
 JSON.stringify(variantPayload()),
 )

 return data
}

async function submit() {
 if (!form.sku.trim()) {
 activeSection.value = 'identity'

 fieldErrors.value = {
 sku: 'SKU is required.',
 }

 formError.value =
 'SKU is required.'

 return
 }

 if (!form.price) {
 activeSection.value = 'pricing'

 fieldErrors.value = {
 ...fieldErrors.value,
 price: 'Price is required.',
 }

 formError.value =
 'Price is required.'

 return
 }

 if (salePriceError.value) {
  activeSection.value = 'pricing'
  fieldErrors.value = {
   ...fieldErrors.value,
   sale_price: salePriceError.value,
  }
  formError.value = salePriceError.value
  return
 }

 saving.value = true
 formError.value = ''
 fieldErrors.value = {}

 try {
 const response =
 props.mode === 'create'
 ? await $api<VariantResponse>(
 `/admin/products/${props.productId}/variants`,
 {
 method: 'POST',
 body: buildFormData(),
 },
 )
 : await $api<VariantResponse>(
 `/admin/product-variants/${props.variant?.id}`,
 {
 method: 'POST',
 body: buildFormData(),
 },
 )

 emit('saved', response.data)
 } catch (error: any) {
 const normalized =
 normalizeErrors(error)

 fieldErrors.value = normalized
 formError.value =
 friendlyErrorMessage(error)

 activeSection.value =
 sectionForErrors(normalized)
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
 max-width="max-w-[1180px]"
 @close="emit('close')"
 >
 <form
 id="variant-editor-form"
 @submit.prevent="submit"
 >
 <!-- Tabs -->
 <div
 class="
 sticky
 top-0
 z-20

 bg-white/95

 px-3
 py-3

 backdrop-blur-xl

 dark:bg-[#111214]/95

 sm:px-4
 "
 >
 <AppTabs
 :model-value="activeSection"
 :items="sectionTabs"
 @update:model-value="setActiveSection"
 />
 </div>

 <div
 class="
 px-4
 pb-6
 pt-3

 sm:px-4
 "
 >
 <!-- Error -->
 <div
 v-if="formError"
 class="
 mb-4

 rounded-[10px]

 bg-red-500/[0.07]

 px-3
 py-2.5

 text-[12px]
 font-medium
 text-red-600

 dark:bg-red-500/10
 dark:text-red-400
 "
 >
 {{ formError }}
 </div>

 <!--
 One AppModal scrollbar only.

 Form on the left,
 live preview on the right.
 -->
 <div
 class="
 grid
 gap-6

 xl:grid-cols-[minmax(0,1fr)_300px]
 "
 >
 <!-- Editor -->
 <div class="min-w-0">
 <!-- IDENTITY -->
 <section
 v-if="activeSection === 'identity'"
 >
 <div>
 <h3
 class="
 text-[14px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 Variant identity
 </h3>

 <p
 class="
 mt-1

 text-[11px]
 leading-5
 text-gray-400

 dark:text-gray-600
 "
 >
 SKU identifies this variant internally.
 Barcode is what scanners and printed tags use.
 </p>
 </div>

 <div
 class="
 mt-5

 grid
 gap-4

 sm:grid-cols-2
 "
 >
 <div>
 <AppInput
 v-model="form.sku"
 label="SKU"
 placeholder="SAAJ-BLU-M-8321"
 :error="fieldErrors.sku"
 />

 <button
 type="button"
 class="
 mt-2

 text-[11px]
 font-medium
 text-gray-400

 transition

 hover:text-gray-700

 dark:text-gray-600
 dark:hover:text-gray-300
 "
 @click="generateSku"
 >
 Generate from product + options
 </button>
 </div>

 <div>
 <AppInput
 v-model="form.barcode"
 label="Barcode"
 placeholder="Optional"
 :error="fieldErrors.barcode"
 />

 <button
 type="button"
 class="
 mt-2

 text-[11px]
 font-medium
 text-gray-400

 transition

 hover:text-gray-700

 dark:text-gray-600
 dark:hover:text-gray-300
 "
 @click="useSkuAsBarcode"
 >
 Use SKU as barcode
 </button>
 </div>
 </div>

 <div
 class="
 mt-6

 rounded-[11px]

 bg-gray-950/[0.035]

 px-3
 py-3

 text-[11px]
 leading-5
 text-gray-500

 dark:bg-white/[0.055]
 dark:text-gray-500
 "
 >
 If barcode is empty, printed labels use the SKU automatically.
 Both values must remain unique across all product variants.
 </div>
 </section>

 <!-- OPTIONS -->
 <section
 v-else-if="activeSection === 'options'"
 >
 <div>
 <h3
 class="
 text-[14px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 Variant options
 </h3>

 <p
 class="
 mt-1

 text-[11px]
 leading-5
 text-gray-400

 dark:text-gray-600
 "
 >
 Choose one value per variant attribute.
 Leave all options empty for a simple single-SKU product.
 </p>
 </div>

 <div
 v-if="attributesLoading"
 class="
 mt-5

 space-y-3
 "
 >
 <AppSkeleton
 class-name="h-10"
 />

 <AppSkeleton
 class-name="h-10"
 />
 </div>

 <div
 v-else-if="attributeOptions.length === 0"
 class="
 mt-5

 flex
 min-h-[170px]
 items-center
 justify-center

 rounded-[13px]

 bg-gray-950/[0.025]

 px-5
 py-7

 text-center

 dark:bg-white/[0.035]
 "
 >
 <div class="max-w-sm">
 <p
 class="
 text-[12px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 No variant attributes
 </p>

 <p
 class="
 mt-1

 text-[12px]
 leading-4
 text-gray-400

 dark:text-gray-600
 "
 >
 That's fine for a simple product.
 Add Size, Color or another attribute on the Attributes page
 and mark it as used for variants when needed.
 </p>
 </div>
 </div>

 <div
 v-else
 class="
 mt-5

 grid
 gap-4

 sm:grid-cols-2
 "
 >
 <AppSelect
 v-for="{ attribute, options } in attributeOptions"
 :key="attribute.id"
 :model-value="selectedValues[attribute.id] ?? ''"
 :label="attribute.name"
 placeholder="Not set"
 :options="[
 {
 label: 'Not set',
 value: '',
 },
 ...options,
 ]"
 searchable
 @change="
 (value) =>
 onAttributeChange(
 attribute.id,
 String(value ?? ''),
 )
 "
 />
 </div>

 <div
 v-if="previewOptionSummary"
 class="
 mt-5

 rounded-[11px]

 bg-gray-950/[0.035]

 px-3
 py-3

 dark:bg-white/[0.055]
 "
 >
 <p
 class="
 text-[12px]
 font-medium
 uppercase
 tracking-[0.08em]
 text-gray-400

 dark:text-gray-600
 "
 >
 Variant name
 </p>

 <p
 class="
 mt-1

 text-[12px]
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ previewOptionSummary }}
 </p>
 </div>
 </section>

 <!-- PRICING -->
 <section
 v-else-if="activeSection === 'pricing'"
 >
 <div>
 <h3
 class="
 text-[14px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 Pricing
 </h3>

 <p
 class="
 mt-1

 text-[11px]
 leading-5
 text-gray-400

 dark:text-gray-600
 "
 >
 Set the original storefront price, an optional sale price and internal cost.
 </p>
 </div>

 <div
 class="
 mt-5

 grid
 gap-4

 sm:grid-cols-2
 "
 >
 <AppInput
 v-model="form.price"
 label="Original price"
 type="number"
 placeholder="0.00"
 :min="0"
 step="0.01"
 :error="fieldErrors.price"
 >
 <template #prefix>Rs</template>
 </AppInput>

 <AppInput
 v-model="form.sale_price"
 label="Sale price"
 type="number"
 placeholder="No active sale"
 :min="0"
 step="0.01"
 :error="fieldErrors.sale_price || salePriceError"
 >
 <template #prefix>Rs</template>
 </AppInput>

 <AppInput
 v-model="form.compare_at_price"
 label="Reference / MSRP"
 type="number"
 placeholder="Optional reference"
 :min="0"
 step="0.01"
 :error="fieldErrors.compare_at_price"
 >
 <template #prefix>Rs</template>
 </AppInput>

 <AppInput
 v-model="form.cost_price"
 label="Cost price"
 type="number"
 placeholder="0.00"
 :min="0"
 step="0.01"
 :error="fieldErrors.cost_price"
 >
 <template #prefix>Rs</template>
 </AppInput>
 </div>

 <div
 class="
 mt-5

 rounded-[11px]

 bg-gray-950/[0.035]

 px-3
 py-3

 text-[11px]
 leading-5
 text-gray-500

 dark:bg-white/[0.055]
 dark:text-gray-500
 "
 >
 Purchase receiving can update cost automatically later,
 so this cost acts mainly as the current starting value.
 </div>

 <!-- Storefront price preview -->
 <div
 class="
 mt-5

 flex
 items-end
 justify-between
 gap-4

 rounded-[12px]

 bg-gray-950/[0.025]

 px-4
 py-3.5

 dark:bg-white/[0.035]
 "
 >
 <div>
 <p
 class="
 text-[12px]
 font-medium
 uppercase
 tracking-[0.08em]
 text-gray-400

 dark:text-gray-600
 "
 >
 Storefront price preview
 </p>

 <p
 class="
 mt-1.5

 text-[20px]
 font-semibold
 tabular-nums
 tracking-[-0.02em]
 text-gray-900

 dark:text-gray-100
 "
 >
 {{ money(pricingPreview.isOnSale ? pricingPreview.salePrice : pricingPreview.originalPrice || 0) }}
 </p>
 </div>

 <p
 v-if="pricingPreview.isOnSale"
 class="
 text-[12px]
 tabular-nums
 text-gray-400
 line-through

 dark:text-gray-600
 "
 >
 {{ money(pricingPreview.originalPrice) }}
 </p>

 <span
 v-if="pricingPreview.isOnSale"
 class="rounded-full bg-gray-950 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white dark:bg-white dark:text-gray-950"
 >
 Save {{ pricingPreview.discountPercentage }}%
 </span>
 </div>

 <p
 v-if="pricingPreview.isOnSale"
 class="mt-3 text-[11px] leading-5 text-gray-500 dark:text-gray-400"
 >
 Customers save {{ money(pricingPreview.savings) }}. Checkout and POS will charge the sale price.
 </p>
 </section>

 <!-- INVENTORY -->
 <section
 v-else
 >
 <div>
 <h3
 class="
 text-[14px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 Inventory & status
 </h3>

 <p
 class="
 mt-1

 text-[11px]
 leading-5
 text-gray-400

 dark:text-gray-600
 "
 >
 Define stock behavior and whether this variant is available for sale.
 </p>
 </div>

 <div
 class="
 mt-5

 grid
 gap-4

 sm:grid-cols-2
 "
 >
 <AppInput
 v-model="form.min_stock_level"
 label="Low-stock threshold"
 type="number"
 placeholder="0"
 :error="fieldErrors.min_stock_level"
 />

 <AppInput
 v-model="form.weight_grams"
 label="Weight in grams"
 type="number"
 placeholder="Optional"
 :error="fieldErrors.weight_grams"
 />
 </div>

 <div
 class="
 mt-5

 grid
 gap-2.5

 sm:grid-cols-2
 "
 >
 <div
 class="
 rounded-[11px]

 bg-gray-950/[0.035]

 p-3.5

 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="form.track_inventory"
 label="Track inventory"
 description="Enforce stock quantities when selling."
 />
 </div>

 <div
 class="
 rounded-[11px]

 bg-gray-950/[0.035]

 p-3.5

 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="form.allow_backorder"
 label="Allow backorder"
 description="Permit sale when available stock is zero."
 />
 </div>

 <div
 class="
 rounded-[11px]

 bg-gray-950/[0.035]

 p-3.5

 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="form.is_default"
 label="Default variant"
 description="Preselect this option when opening the product."
 />
 </div>

 <div
 class="
 rounded-[11px]

 bg-gray-950/[0.035]

 p-3.5

 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="form.is_active"
 label="Active"
 description="Available for sale, labels and normal operations."
 />
 </div>
 </div>

 <div
 v-if="!form.track_inventory"
 class="
 mt-4

 flex
 items-start
 gap-2

 rounded-[10px]

 bg-amber-500/[0.07]

 px-3
 py-2.5

 text-[12px]
 leading-4
 text-amber-700

 dark:bg-amber-500/10
 dark:text-amber-300
 "
 >
 <span
 class="
 mt-[5px]

 h-1.5
 w-1.5
 shrink-0
 rounded-full

 bg-amber-500
 "
 />

 Stock quantities will not be enforced for this variant.
 </div>
 </section>
 </div>

 <!-- TAG PREVIEW -->
 <aside
 class="
 min-w-0

 xl:sticky
 xl:top-[58px]
 xl:self-start
 "
 >
 <div
 class="
 rounded-[14px]

 bg-gray-950/[0.025]

 p-3.5

 dark:bg-white/[0.035]
 "
 >
 <div
 class="
 flex
 items-start
 justify-between
 gap-3
 "
 >
 <div>
 <p
 class="
 text-[12px]
 font-semibold
 text-gray-700

 dark:text-gray-300
 "
 >
 Tag preview
 </p>

 <p
 class="
 mt-0.5

 text-[12px]
 leading-4
 text-gray-400

 dark:text-gray-600
 "
 >
 Updates while you edit.
 </p>
 </div>

 <span
 class="
 text-[11px]
 font-semibold
 uppercase
 tracking-[0.08em]
 text-gray-400

 dark:text-gray-600
 "
 >
 Preview
 </span>
 </div>

 <div class="mt-3">
 <ProductTagPreview
 :brand-name="brandName || productName"
 :brand-logo-url="brandLogoUrl"
 :product-name="productName"
 :option-summary="previewOptionSummary"
 :price="previewPrice"
 :code-value="previewCodeValue"
 />
 </div>

 <div
 class="
 mt-3

 space-y-1.5

 text-[12px]
 "
 >
 <div
 class="
 flex
 items-center
 justify-between
 gap-3
 "
 >
 <span
 class="
 text-gray-400

 dark:text-gray-600
 "
 >
 SKU
 </span>

 <span
 class="
 max-w-[170px]
 truncate

 font-mono
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 {{ form.sku || 'Not set' }}
 </span>
 </div>

 <div
 class="
 flex
 items-center
 justify-between
 gap-3
 "
 >
 <span
 class="
 text-gray-400

 dark:text-gray-600
 "
 >
 Barcode
 </span>

 <span
 class="
 max-w-[170px]
 truncate

 font-mono
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 {{
 form.barcode ||
 form.sku ||
 'Not set'
 }}
 </span>
 </div>

 <div
 class="
 flex
 items-center
 justify-between
 gap-3
 "
 >
 <span
 class="
 text-gray-400

 dark:text-gray-600
 "
 >
 Options
 </span>

 <span
 class="
 max-w-[170px]
 truncate

 text-right
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 {{
 previewOptionSummary ||
 'Single SKU'
 }}
 </span>
 </div>
 </div>

 <p
 class="
 mt-3

 text-[11px]
 leading-4
 text-gray-400

 dark:text-gray-600
 "
 >
 The barcode in this preview is only a visual stand-in.
 The real scannable barcode is generated by the PDF label.
 </p>
 </div>
 </aside>
 </div>
 </div>
 </form>

 <template #footer>
 <div
 class="
 flex
 items-center
 justify-end
 gap-2
 "
 >
 <AppButton
 type="button"
 variant="ghost"
 :disabled="saving"
 @click="emit('close')"
 >
 Cancel
 </AppButton>

 <AppButton
 type="submit"
 form="variant-editor-form"
 :loading="saving"
 >
 {{
 mode === 'create'
 ? 'Add variant'
 : 'Save changes'
 }}
 </AppButton>
 </div>
 </template>
 </AppModal>
</template>
