<script setup lang="ts">
import type {
 ProductImageDraft,
} from './ProductImageUploader.vue'

type Brand = {
 id: number
 name: string
 slug: string
 logo_url: string | null
 is_active: boolean
}

type Category = {
 id: number
 parent_id: number | null
 name: string
 slug: string
 full_slug: string
 is_active: boolean
 depth: number
 children?: Category[] | null
}

type OptimizedUrls = {
 thumb?: string | null
 card?: string | null
 detail?: string | null
 zoom?: string | null
}

type ProductImage = {
 id: number
 product_id?: number
 image_url: string
 image_public_id?: string
 optimized_urls?: OptimizedUrls
 alt_text: string | null
 is_primary: boolean
 sort_order: number
 role?: string
 source_product_image_id?:
 number | null
 is_generated?: boolean
 remove_background?: boolean
 transformation_type?:
 string | null
 transformation_meta?:
 Record<string, any> | null
}

type DefaultVariant = {
 id: number
 sku?: string
 price: number | string
 sale_price: number | string | null
 compare_at_price?: number | string | null
 attribute_values?: unknown[]
}

type Product = {
 id: number
 brand_id: number | null
 name: string
 slug: string
 slug_base?: string | null
 short_description: string | null
 description: string | null
 care_instructions: string | null
 card_description?: string | null
 meta_title: string | null
 meta_description: string | null
 is_active: boolean
 is_featured: boolean
 is_new_arrival: boolean
 sort_order: number
 published_at: string | null
 brand?: Brand | null
 categories?: Category[]
 primary_image?:
 ProductImage | null
 images?: ProductImage[]
 default_variant?:
 DefaultVariant | null
 variants?: {
 id: number
 }[]
}

type ProductResponse = {
 data: Product
 message?: string
}

type ProductPreview = {
 url: string
 expires_at: string
 expires_in_minutes: number
}

type ProductPreviewResponse = {
 data: Product
 preview: ProductPreview
}

type ProductSection =
 | 'details'
 | 'categories'
 | 'content'
 | 'media'
 | 'publish'

const props = defineProps<{
 open: boolean
 mode: 'create' | 'edit'
 product?: Product | null
 brands: Brand[]
 categories: Category[]
}>()

const emit = defineEmits<{
 close: []
 saved: [
 product: Product,
 closeAfterSave: boolean,
 ]
 changed: []
}>()

const { $api } = useNuxtApp()
const { toDateTimeInput, dateTimeInputToIso, timezoneLabel } = useAppDateTime()

const activeSection =
 ref<ProductSection>('details')

const sections: {
 key: ProductSection
 label: string
}[] = [
 {
 key: 'details',
 label: 'Details',
 },
 {
 key: 'categories',
 label: 'Categories',
 },
 {
 key: 'content',
 label: 'Content',
 },
 {
 key: 'media',
 label: 'Media',
 },
 {
 key: 'publish',
 label: 'Publish',
 },
]

const studioOpen = ref(false)
const localNotice = ref('')

const saving = ref(false)
const previewing = ref(false)
const formError = ref('')
const fieldErrors =
 ref<Record<string, string>>({})

const selectedCategoryIds =
 ref<number[]>([])

const primaryCategoryId =
 ref<number | null>(null)

const skuPreview = ref('')
const skuPreviewChain = ref<string[]>([])
const skuPreviewLoading = ref(false)
let skuPreviewToken = 0

function stripHyphens(value: string) {
 return value.toLowerCase().replace(/-/g, '')
}

const skuPreviewSuffix = computed(() => {
 return skuPreview.value
 ? `-${stripHyphens(skuPreview.value)}`
 : ''
})

const skuPreviewTitle = computed(() => {
 return skuPreviewChain.value.length
 ? `Built from: ${skuPreviewChain.value.join(' → ')}`
 : 'Appended automatically. Not editable.'
})

// In edit mode there's nothing to "preview" — the suffix is whatever the
// product's default variant SKU already is, shown so the admin can see
// exactly what's at the end of the live slug without it being editable
// here.
const skuSuffixDisplay = computed(() => {
 if (props.mode === 'edit') {
 const sku =
 props.product?.default_variant?.sku

 return sku
 ? `-${stripHyphens(sku)}`
 : ''
 }

 return skuPreviewSuffix.value
})

const slugTouched = ref(false)
let settingSlugFromName = false

function slugify(value: string) {
 return value
 .toLowerCase()
 .trim()
 .replace(/[^a-z0-9]+/g, '-')
 .replace(/^-+|-+$/g, '')
}

async function refreshSkuPreview() {
 if (props.mode !== 'create') {
 skuPreview.value = ''
 skuPreviewChain.value = []
 return
 }

 const categoryId =
 primaryCategoryId.value ??
 selectedCategoryIds.value[0] ??
 null

 if (!categoryId) {
 skuPreview.value = ''
 skuPreviewChain.value = []
 return
 }

 const token = ++skuPreviewToken
 skuPreviewLoading.value = true

 try {
 const response = await $api<{
 data: { sku: string | null, chain?: string[] }
 }>(
 `/admin/categories/${categoryId}/next-sku`,
 )

 if (token === skuPreviewToken) {
 skuPreview.value =
 response.data.sku ?? ''
 skuPreviewChain.value =
 response.data.chain ?? []
 }
 } catch {
 if (token === skuPreviewToken) {
 skuPreview.value = ''
 skuPreviewChain.value = []
 }
 } finally {
 if (token === skuPreviewToken) {
 skuPreviewLoading.value = false
 }
 }
}

watch(
 () =>
 [
 primaryCategoryId.value,
 selectedCategoryIds.value.join(','),
 props.open,
 ] as const,
 () => {
 if (props.open) {
 refreshSkuPreview()
 }
 },
)

const newImages =
 ref<ProductImageDraft[]>([])

const form = reactive({
 brand_id: '',
 name: '',
 slug: '',
 short_description: '',
 description: '',
 care_instructions: '',
 card_description: '',
 price: '',
 sale_price: '',
 meta_title: '',
 meta_description: '',
 is_active: true,
 is_featured: false,
 is_new_arrival: false,
 sort_order: 0,
 published_at: '',
})

// Keeps the slug's editable base in sync with the name while the admin is
// creating a product — right up until they type into the slug field
// themselves, at which point their edit wins from then on.
watch(
 () => form.name,
 (name) => {
 if (
 props.mode === 'create' &&
 !slugTouched.value
 ) {
 settingSlugFromName = true
 form.slug = slugify(name)
 nextTick(() => {
 settingSlugFromName = false
 })
 }
 },
)

watch(
 () => form.slug,
 () => {
 if (!settingSlugFromName) {
 slugTouched.value = true
 }
 },
)

const isSimpleProduct = computed(() => {
 if (props.mode === 'create') {
 return true
 }

 const variantsCount =
 props.product?.variants?.length
 ?? 0

 if (variantsCount > 1) {
 return false
 }

 const defaultVariant =
 props.product?.default_variant

 return (
 !defaultVariant
 || (
 defaultVariant
 .attribute_values?.length
 ?? 0
 ) === 0
 )
})

const quickPricing = computed(() => {
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

const quickSalePriceError = computed(() => {
 if (!isSimpleProduct.value || form.sale_price === '' || form.price === '') {
  return ''
 }

 return Number(form.sale_price) >= Number(form.price)
  ? 'Sale price must be lower than the original price.'
  : ''
})

function money(value: number) {
 return `Rs ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

const title = computed(() => {
 return props.mode === 'create'
 ? 'Add product'
 : 'Edit product'
})

const description = computed(() => {
 return props.mode === 'create'
 ? 'Build the product, add content and prepare its media.'
 : `Editing ${
 props.product?.name
 || 'product'
 }`
})

const brandOptions = computed(() => [
 {
 label: 'No brand',
 value: '',
 },

 ...props.brands.map(
 (brand) => ({
 label: brand.name,
 value: String(brand.id),
 }),
 ),
])

const existingImages = computed(() => {
 return [
 ...(props.product?.images ?? []),
 ].sort((a, b) => {
 if (
 a.sort_order
 === b.sort_order
 ) {
 return a.id - b.id
 }

 return (
 a.sort_order
 - b.sort_order
 )
 })
})

const sectionTabs = computed(() => {
 return sections.map((section) => ({
 label: section.label,
 value: section.key,
 count:
 section.key === 'categories'
 ? selectedCategoryIds.value.length
 : section.key === 'media'
 ? existingImages.value.length + newImages.value.length
 : undefined,
 }))
})

function setActiveSection(value: string) {
 activeSection.value = value as ProductSection
}

watch(
 () => [
 props.open,
 props.product,
 props.mode,
 ] as const,
 () => {
 if (!props.open) {
 return
 }

 resetForm()
 },
 {
 immediate: true,
 },
)

watch(
 () => props.open,
 (open, previous) => {
 if (open && !previous) {
 activeSection.value =
 'details'

 localNotice.value = ''
 studioOpen.value = false
 }

 if (!open) {
 studioOpen.value = false
 }
 },
)

function toDatetimeLocal(
 value:
 | string
 | null
 | undefined,
) {
 if (!value) {
 return ''
 }

 return toDateTimeInput(value)
}

function publishAtPayload() {
 if (!form.published_at) {
 return null
 }

 return dateTimeInputToIso(form.published_at) ?? form.published_at
}

function resetForm() {
 formError.value = ''
 fieldErrors.value = {}
 newImages.value = []

 form.brand_id =
 props.product?.brand_id
 ? String(
 props.product.brand_id,
 )
 : ''

 form.name =
 props.product?.name ?? ''

 form.slug =
 (props.mode === 'edit'
 ? props.product?.slug_base
 : props.product?.slug)
 ?? ''

 slugTouched.value =
 props.mode === 'edit'

 form.short_description =
 props.product
 ?.short_description
 ?? ''

 form.description =
 props.product?.description
 ?? ''

 form.care_instructions =
 props.product
 ?.care_instructions
 ?? ''

 form.card_description =
 props.product
 ?.card_description
 ?? ''

 form.price =
 isSimpleProduct.value
 && props.product
 ?.default_variant
 ? String(
 props.product
 .default_variant
 .price,
 )
 : ''

 form.sale_price =
 isSimpleProduct.value
 && props.product
 ?.default_variant
 ?.sale_price != null
 ? String(
 props.product
 .default_variant
 .sale_price,
 )
 : ''

 form.meta_title =
 props.product?.meta_title
 ?? ''

 form.meta_description =
 props.product
 ?.meta_description
 ?? ''

 form.is_active =
 props.product?.is_active
 ?? true

 form.is_featured =
 props.product?.is_featured
 ?? false

 form.is_new_arrival =
 props.product?.is_new_arrival
 ?? false

 form.sort_order =
 props.product?.sort_order
 ?? 0

 form.published_at =
 toDatetimeLocal(
 props.product
 ?.published_at,
 )

 selectedCategoryIds.value =
 props.product
 ?.categories
 ?.map(
 (category) =>
 category.id,
 )
 ?? []

 primaryCategoryId.value =
 selectedCategoryIds
 .value[0]
 ?? null
}

function normalizeErrors(
 error: any,
) {
 const errors =
 error?.data?.errors
 || {}

 const normalized:
 Record<string, string> = {}

 Object
 .keys(errors)
 .forEach((key) => {
 normalized[key] =
 Array.isArray(
 errors[key],
 )
 ? errors[key][0]
 : String(
 errors[key],
 )
 })

 return normalized
}

function sectionForErrors(
 errors:
 Record<string, string>,
): ProductSection {
 const keys =
 Object.keys(errors)

 if (
 keys.some(
 (key) =>
 key.startsWith(
 'category_ids',
 )
 || key
 === 'primary_category_id',
 )
 ) {
 return 'categories'
 }

 if (
 keys.some(
 (key) => [
 'short_description',
 'description',
 'care_instructions',
 'card_description',
 ].includes(key),
 )
 ) {
 return 'content'
 }

 if (
 keys.some(
 (key) =>
 key.startsWith('images'),
 )
 ) {
 return 'media'
 }

 if (
 keys.some(
 (key) => [
 'meta_title',
 'meta_description',
 'published_at',
 'is_active',
 'is_featured',
 'is_new_arrival',
 ].includes(key),
 )
 ) {
 return 'publish'
 }

 return 'details'
}

function friendlyErrorMessage(
 error: any,
) {
 const message =
 String(
 error?.data?.message
 || '',
 )

 const firstFieldError =
 Object.values(
 fieldErrors.value,
 )[0]

 if (
 message
 .toLowerCase()
 .includes('duplicate entry')
 || message
 .toLowerCase()
 .includes(
 'products_slug_unique',
 )
 ) {
 return (
 'A product with this slug '
 + 'already exists. Use a '
 + 'different slug.'
 )
 }

 if (firstFieldError) {
 return String(
 firstFieldError,
 )
 }

 return (
 message
 || 'Could not save product. '
 + 'Please check the form '
 + 'and try again.'
 )
}

function productPayload() {
 return {
 brand_id:
 form.brand_id
 ? Number(form.brand_id)
 : null,

 category_ids:
 selectedCategoryIds.value,

 primary_category_id:
 primaryCategoryId.value
 ?? selectedCategoryIds
 .value[0]
 ?? null,

 name: form.name,

 slug:
 form.slug
 || undefined,

 short_description:
 form.short_description
 || null,

 description:
 form.description
 || null,

 care_instructions:
 form.care_instructions
 || null,

 card_description:
 form.card_description
 || null,

 price:
 form.price === ''
 ? null
 : Number(form.price),

 sale_price:
 form.sale_price === ''
 ? null
 : Number(form.sale_price),

 meta_title:
 form.meta_title
 || null,

 meta_description:
 form.meta_description
 || null,

 is_active:
 form.is_active,

 is_featured:
 form.is_featured,

 is_new_arrival:
 form.is_new_arrival,

 sort_order:
 Number(
 form.sort_order
 || 0,
 ),

 published_at:
 publishAtPayload(),
 }
}

function buildFormData() {
 const data =
 new FormData()

 if (
 props.mode === 'edit'
 ) {
 data.append(
 '_method',
 'PATCH',
 )
 }

 data.append(
 'data',
 JSON.stringify(
 productPayload(),
 ),
 )

 newImages.value.forEach(
 (image, index) => {
 data.append(
 'images[]',
 image.file,
 )

 data.append(
 `image_alt_texts[${index}]`,
 image.alt_text
 || form.name,
 )
 },
 )

 const primaryNewImageIndex =
 newImages.value.findIndex(
 (image) =>
 image.is_primary,
 )

 if (
 primaryNewImageIndex
 >= 0
 ) {
 data.append(
 'primary_image_index',
 String(
 primaryNewImageIndex,
 ),
 )
 }

 return data
}

async function submit(
 closeAfterSave = false,
): Promise<Product | null> {
 if (quickSalePriceError.value) {
  activeSection.value = 'details'
  fieldErrors.value = {
   ...fieldErrors.value,
   sale_price: quickSalePriceError.value,
  }
  formError.value = quickSalePriceError.value
  return null
 }

 saving.value = true
 formError.value = ''
 fieldErrors.value = {}
 localNotice.value = ''

 try {
 let response:
 ProductResponse
 | null = null

 if (
 props.mode === 'create'
 ) {
 response =
 await $api<ProductResponse>(
 '/admin/products',
 {
 method: 'POST',
 body:
 buildFormData(),
 },
 )
 } else if (
 props.product
 ) {
 response =
 await $api<ProductResponse>(
 `/admin/products/${props.product.id}`,
 {
 method: 'POST',
 body:
 buildFormData(),
 },
 )
 }

 if (response?.data) {
 localNotice.value =
 props.mode === 'create'
 ? 'Product saved. Media tools are now available.'
 : 'Product changes saved.'

 newImages.value = []

 emit(
 'saved',
 response.data,
 closeAfterSave,
 )

 return response.data
 }

 return null
 } catch (error: any) {
 const normalized =
 normalizeErrors(error)

 fieldErrors.value =
 normalized

 formError.value =
 friendlyErrorMessage(
 error,
 )

 activeSection.value =
 sectionForErrors(
 normalized,
 )

 return null
 } finally {
 saving.value = false
 }
}

async function previewStorefront() {
 if (
 props.mode !== 'edit'
 || !props.product
 || previewing.value
 || saving.value
 ) {
 return
 }

 if (!import.meta.client) {
 return
 }

 const previewWindow = window.open(
 'about:blank',
 '_blank',
 )

 if (!previewWindow) {
 localNotice.value =
 'Your browser blocked the preview window. Allow pop-ups for Backoffice and try again.'
 return
 }

 previewing.value = true
 formError.value = ''

 try {
 previewWindow.document.title =
 'Preparing SAAJ preview…'
 previewWindow.document.body.innerHTML =
 '<div style="font-family:system-ui;padding:32px;color:#111">Preparing storefront preview…</div>'

 // Save first so the preview always reflects the latest form changes, even
 // while the product remains a draft or is scheduled for later.
 const savedProduct =
 await submit(false)

 if (!savedProduct) {
 previewWindow.close()
 return
 }

 const response =
 await $api<ProductPreviewResponse>(
 `/admin/products/${savedProduct.id}`,
 )

 previewWindow.opener = null
 previewWindow.location.replace(
 response.preview.url,
 )
 } catch (error: any) {
 previewWindow.close()
 formError.value =
 String(
 error?.data?.message
 || 'Could not create storefront preview. Please try again.',
 )
 } finally {
 previewing.value = false
 }
}
</script>

<template>
 <AppModal
 :open="open"
 :title="title"
 :description="description"
 max-width="max-w-[1280px]"
 @close="emit('close')"
 >
 <form
 id="product-editor-form"
 @submit.prevent="
 submit(false)
 "
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
 <!-- Notices -->
 <div
 v-if="localNotice"
 class="
 mb-4

 flex
 items-center
 gap-2

 rounded-[10px]

 bg-emerald-500/[0.08]

 px-3
 py-2.5

 text-[12px]
 font-medium
 text-emerald-700

 dark:bg-emerald-500/10
 dark:text-emerald-300
 "
 >
 <span
 class="
 h-1.5
 w-1.5
 shrink-0

 rounded-full

 bg-emerald-500
 "
 />

 {{ localNotice }}
 </div>

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
 aria-live="polite"
 >
 {{ formError }}
 </div>

 <!-- DETAILS -->
 <div
 v-if="
 activeSection
 === 'details'
 "
 class="w-full"
 >
 <div
 class="
 mb-5
 "
 >
 <h3
 class="
 text-[14px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 Product details
 </h3>

 <p
 class="
 mt-1

 text-[12px]
 text-gray-400

 dark:text-gray-500
 "
 >
 Core product identity,
 brand and base pricing.
 </p>
 </div>

 <div
 class="
 grid
 gap-4

 md:grid-cols-2
 "
 >
 <AppInput
 v-model="form.name"
 label="Product name"
 placeholder="White Linen Shirt"
 :error="
 fieldErrors.name
 "
 required
 />

 <AppInput
 v-model="form.slug"
 label="Slug"
 placeholder="Auto from name if empty"
 :error="
 fieldErrors.slug
 "
 >
 <template #suffix>
 <span
 v-if="mode === 'create' && skuPreviewLoading"
 class="text-[12px] italic"
 >
 …
 </span>
 <span
 v-else-if="skuSuffixDisplay"
 class="whitespace-nowrap font-mono text-[12px]"
 :title="skuPreviewTitle"
 >
 {{ skuSuffixDisplay }}
 </span>
 </template>
 </AppInput>

 <p
 v-if="mode === 'create'"
 class="mt-1 text-[11px] text-gray-400 dark:text-gray-600"
 >
 Fills in from the name automatically until you edit it yourself. The greyed-out part at the end is added on save and can't be typed — it comes from the category you pick below.
 </p>

 <AppSelect
 v-model="form.brand_id"
 label="Brand"
 :options="
 brandOptions
 "
 />

 <AppInput
 v-model="
 form.sort_order
 "
 label="Sort order"
 type="number"
 placeholder="0"
 :error="
 fieldErrors.sort_order
 "
 />

 <AppInput
 v-if="
 isSimpleProduct
 "
 v-model="form.price"
 label="Original price"
 type="number"
 placeholder="0.00"
 :min="0"
 step="0.01"
 :error="
 fieldErrors.price
 "
 >
 <template #prefix>Rs</template>
 </AppInput>

 <AppInput
 v-if="
 isSimpleProduct
 "
 v-model="form.sale_price"
 label="Sale price (optional)"
 type="number"
 placeholder="No active sale"
 :min="0"
 step="0.01"
 :error="
 fieldErrors.sale_price
 || quickSalePriceError
 "
 >
 <template #prefix>Rs</template>
 </AppInput>

 <div
 v-if="isSimpleProduct"
 class="md:col-span-2 rounded-[14px] border border-gray-950/[0.07] bg-gray-950/[0.025] p-4 dark:border-white/[0.08] dark:bg-white/[0.035]"
 >
 <div class="flex flex-wrap items-end justify-between gap-4">
 <div>
 <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
 Storefront price preview
 </p>

 <div class="mt-2 flex flex-wrap items-center gap-2.5">
 <span class="text-[22px] font-semibold tabular-nums tracking-[-0.03em] text-gray-950 dark:text-white">
 {{ money(quickPricing.isOnSale ? quickPricing.salePrice : quickPricing.originalPrice || 0) }}
 </span>

 <s
 v-if="quickPricing.isOnSale"
 class="text-[13px] tabular-nums text-gray-400 decoration-gray-400/70 dark:text-gray-500"
 >
 {{ money(quickPricing.originalPrice) }}
 </s>

 <span
 v-if="quickPricing.isOnSale"
 class="rounded-full bg-gray-950 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white dark:bg-white dark:text-gray-950"
 >
 Save {{ quickPricing.discountPercentage }}%
 </span>
 </div>
 </div>

 <p class="max-w-sm text-[11px] leading-5 text-gray-500 dark:text-gray-400">
 <template v-if="quickPricing.isOnSale">
 Customers save {{ money(quickPricing.savings) }}. The sale price is used by the storefront, checkout and POS.
 </template>
 <template v-else>
 Add a sale price lower than the original price to activate the storefront promotion.
 </template>
 </p>
 </div>
 </div>

 <div
 v-else
 class="md:col-span-2
 flex
 min-h-10
 items-center

 rounded-[10px]

 bg-gray-950/[0.035]

 px-3

 text-[12px]
 leading-5
 text-gray-500

 dark:bg-white/[0.055]
 dark:text-gray-400
 "
 >
 Pricing is managed per
 variant for this product.
 </div>
 </div>
 </div>

 <!-- CATEGORIES -->
 <div
 v-else-if="
 activeSection
 === 'categories'
 "
 class="w-full"
 >
 <ProductCategoryPicker
 v-model:selected-ids="
 selectedCategoryIds
 "
 v-model:primary-id="
 primaryCategoryId
 "
 :categories="
 categories
 "
 :error="
 fieldErrors
 .category_ids
 || fieldErrors[
 'category_ids.0'
 ]
 || fieldErrors
 .primary_category_id
 "
 />
 </div>

 <!-- CONTENT -->
 <div
 v-else-if="
 activeSection
 === 'content'
 "
 class="space-y-5"
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
 Product content
 </h3>

 <p
 class="
 mt-1

 text-[12px]
 text-gray-400

 dark:text-gray-500
 "
 >
 Customer-facing copy
 and product information.
 </p>
 </div>

 <AppTextarea
 v-model="
 form.short_description
 "
 label="Short description"
 placeholder="Short summary for cards and quick views..."
 :error="
 fieldErrors
 .short_description
 "
 :rows="3"
 />

 <AppRichTextEditor
 v-model="
 form.description
 "
 label="Description"
 placeholder="Write the full product description..."
 :error="
 fieldErrors.description
 "
 />

 <AppTextarea
 v-model="
 form.care_instructions
 "
 label="Care instructions"
 placeholder="Hand wash cold, do not bleach..."
 :error="
 fieldErrors
 .care_instructions
 "
 :rows="3"
 />

 <div>
 <AppRichTextEditor
 v-model="
 form.card_description
 "
 label="Packing card note"
 placeholder="Thank-you message, authenticity line, etc."
 mode="simple"
 :error="
 fieldErrors
 .card_description
 "
 />

 <p
 class="
 mt-1.5

 text-[11px]
 leading-4
 text-gray-400

 dark:text-gray-600
 "
 >
 Keep this short.
 Printed packaging cards
 use plain text.
 </p>
 </div>
 </div>

 <!-- MEDIA -->
 <div
 v-else-if="
 activeSection
 === 'media'
 "
 class="
 space-y-5
 "
 >
 <div
 class="
 flex
 flex-col
 gap-3

 sm:flex-row
 sm:items-center
 sm:justify-between
 "
 >
 <div>
 <h3
 class="
 text-[13px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 Product media
 </h3>

 <p
 class="
 mt-1

 text-[12px]
 text-gray-400

 dark:text-gray-500
 "
 >
 Manage originals,
 crops and AI-generated
 previews.
 </p>
 </div>

 <AppButton
 v-if="
 mode === 'edit'
 && product
 "
 type="button"
 size="sm"
 @click="
 studioOpen = true
 "
 >
 Image Studio
 </AppButton>
 </div>

 <ProductImageManager
 v-if="
 mode === 'edit'
 && product
 "
 :product-id="
 product.id
 "
 :images="
 existingImages
 "
 :product-name="
 form.name
 "
 @changed="
 emit('changed')
 "
 />

 <div
 v-if="
 mode === 'create'
 "
 class="
 rounded-[12px]

 bg-gray-950/[0.035]

 px-3.5
 py-3

 dark:bg-white/[0.055]
 "
 >
 <p
 class="
 text-[12px]
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 Image Studio becomes
 available after the
 first save.
 </p>

 <p
 class="
 mt-1

 text-[11px]
 leading-4
 text-gray-400

 dark:text-gray-600
 "
 >
 You can still add and
 crop the initial product
 images now.
 </p>
 </div>

 <ProductImageUploader
 v-model="
 newImages
 "
 :product-name="
 form.name
 "
 />
 </div>

 <!-- PUBLISH -->
 <div
 v-else-if="
 activeSection
 === 'publish'
 "
 class="space-y-6"
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
 Status & publishing
 </h3>

 <p
 class="
 mt-1

 text-[12px]
 text-gray-400

 dark:text-gray-500
 "
 >
 Control visibility,
 New In placement and
 SEO information.
 </p>
 </div>

 <!-- Toggles -->
 <div
 class="
 grid
 gap-4

 sm:grid-cols-3
 "
 >
 <div
 class="
 rounded-[12px]

 bg-gray-950/[0.035]

 p-3.5

 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="
 form.is_active
 "
 label="Active"
 description="Available in active catalog areas."
 />
 </div>

 <div
 class="
 rounded-[12px]

 bg-gray-950/[0.035]

 p-3.5

 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="
 form.is_featured
 "
 label="Featured"
 description="Highlight in selected storefront sections."
 />
 </div>

 <div
 class="
 rounded-[12px]

 bg-gray-950/[0.035]

 p-3.5

 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="
 form.is_new_arrival
 "
 label="Show in New In"
 description="Include this product on the storefront New In page. You can also manage many products at once from the Products list."
 />
 </div>
 </div>

 <AppInput
 v-model="
 form.published_at
 "
 label="Publish date"
 type="datetime-local"
 :error="
 fieldErrors
 .published_at
 "
 />

 <p class="mt-1.5 text-[11px] leading-5 text-gray-400 dark:text-gray-500">
  Publish time is interpreted in {{ timezoneLabel }}.
 </p>

 <div
 class="
 pt-1
 "
 >
 <p
 class="
 mb-3

 text-[12px]
 font-semibold
 text-gray-700

 dark:text-gray-300
 "
 >
 Search appearance
 </p>

 <div
 class="
 grid
 gap-4
 "
 >
 <AppInput
 v-model="
 form.meta_title
 "
 label="Meta title"
 placeholder="SEO title"
 :error="
 fieldErrors
 .meta_title
 "
 />

 <AppTextarea
 v-model="
 form.meta_description
 "
 label="Meta description"
 placeholder="SEO description"
 :error="
 fieldErrors
 .meta_description
 "
 :rows="4"
 />
 </div>
 </div>
 </div>
 </div>
 </form>

 <template #footer>
 <div
 class="
 flex
 flex-col-reverse
 gap-2

 sm:flex-row
 sm:items-center
 sm:justify-end
 "
 >
 <AppButton
 type="button"
 variant="ghost"
 :disabled="saving || previewing"
 @click="emit('close')"
 >
 Done
 </AppButton>

 <AppButton
 v-if="mode === 'edit' && product"
 type="button"
 variant="secondary"
 :loading="previewing"
 :disabled="saving"
 @click="previewStorefront"
 >
 Preview storefront
 </AppButton>

 <AppButton
 type="button"
 variant="secondary"
 :loading="saving"
 @click="submit(false)"
 >
 {{
 mode === 'create'
 ? 'Create & continue'
 : 'Save'
 }}
 </AppButton>

 <AppButton
 type="button"
 :loading="saving"
 @click="submit(true)"
 >
 {{
 mode === 'create'
 ? 'Create product'
 : 'Save & close'
 }}
 </AppButton>
 </div>
 </template>
 </AppModal>

 <ProductImageStudio
 v-if="
 mode === 'edit'
 && product
 "
 :open="studioOpen"
 :product-id="product.id"
 :images="existingImages"
 :product-name="form.name"
 @close="
 studioOpen = false
 "
 @changed="
 emit('changed')
 "
 />
</template>
