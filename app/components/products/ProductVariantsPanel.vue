<script setup lang="ts">
import type { Variant } from './ProductVariantFormModal.vue'

type VariantsResponse = {
 data: Variant[]
}

const props = defineProps<{
 open: boolean
 productId: number
 productName: string
 brandName?: string | null
 brandLogoUrl?: string | null
 cardDescription?: string | null
}>()

const emit = defineEmits<{
 close: []
 changed: []
}>()

const { $api } = useNuxtApp()

const variants = ref<Variant[]>([])
const loading = ref(false)
const loadError = ref('')

const search = ref('')

const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingVariant = ref<Variant | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const variantToDelete = ref<Variant | null>(null)

const printingVariantId = ref<number | null>(null)
const printingCardVariantId = ref<number | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const hasDefaultVariant = computed(() => {
 return variants.value.some((variant) => variant.is_default)
})

const activeVariantCount = computed(() => {
 return variants.value.filter((variant) => variant.is_active).length
})

const trackedVariantCount = computed(() => {
 return variants.value.filter((variant) => variant.track_inventory).length
})

const filteredVariants = computed(() => {
 const term = search.value.trim().toLowerCase()

 if (!term) {
 return variants.value
 }

 return variants.value.filter((variant) => {
 return [
 variant.option_summary,
 variant.name,
 variant.sku,
 variant.barcode,
 ]
 .filter(Boolean)
 .join(' ')
 .toLowerCase()
 .includes(term)
 })
})

watch(
 () => props.open,
 (isOpen) => {
 if (isOpen) {
 search.value = ''
 loadVariants()
 }
 },
 { immediate: true },
)

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) {
 clearTimeout(noticeTimer.value)
 }

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

async function loadVariants() {
 loading.value = true
 loadError.value = ''

 try {
 const response = await $api<VariantsResponse>(
 `/admin/products/${props.productId}/variants`,
 {
 query: {
 per_page: 100,
 },
 },
 )

 variants.value = response.data ?? []
 } catch (error: any) {
 loadError.value =
 error?.data?.message ||
 'Could not load variants for this product.'
 } finally {
 loading.value = false
 }
}

function money(value: number | string | null | undefined) {
 if (value === null || value === undefined) {
 return '—'
 }

 return Number(value).toLocaleString(undefined, {
 minimumFractionDigits: 0,
 maximumFractionDigits: 2,
 })
}

function variantTitle(variant: Variant) {
 return (
 variant.option_summary ||
 variant.name ||
 variant.sku
 )
}

function attributeSummary(variant: Variant) {
 if (!variant.attribute_values?.length) {
 return 'Single SKU'
 }

 return variant.attribute_values
 .map((item) => {
 if (item.attribute_name) {
 return `${item.attribute_name}: ${item.value}`
 }

 return item.value
 })
 .join(' · ')
}

function openCreate() {
 formMode.value = 'create'
 editingVariant.value = null
 formOpen.value = true
}

function openEdit(variant: Variant) {
 formMode.value = 'edit'
 editingVariant.value = variant
 formOpen.value = true
}

function onSaved() {
 formOpen.value = false
 editingVariant.value = null

 loadVariants()
 emit('changed')
}

function askDelete(variant: Variant) {
 variantToDelete.value = variant
 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDelete() {
 if (!variantToDelete.value) {
 return
 }

 deleting.value = true
 deleteError.value = ''

 try {
 await $api(
 `/admin/product-variants/${variantToDelete.value.id}`,
 {
 method: 'DELETE',
 },
 )

 deleteOpen.value = false
 variantToDelete.value = null

 loadVariants()
 emit('changed')
 } catch (error: any) {
 deleteError.value =
 error?.data?.message ||
 'Could not delete this variant. It may already be referenced in a sale or purchase.'
 } finally {
 deleting.value = false
 }
}

async function extractPdfErrorMessage(
 error: any,
 fallback: string,
): Promise<string> {
 const data = error?.data

 if (data instanceof Blob) {
 try {
 const parsed = JSON.parse(await data.text())
 return parsed?.message || fallback
 } catch {
 return fallback
 }
 }

 return data?.message || fallback
}

async function openPdfInNewTab(
 path: string,
 errorFallback: string,
) {
 if (!import.meta.client) {
 return
 }

 try {
 const blob = await $api<Blob>(path, {
 responseType: 'blob',
 })

 const pdfBlob =
 blob instanceof Blob
 ? blob
 : new Blob([blob], {
 type: 'application/pdf',
 })

 const url = URL.createObjectURL(pdfBlob)

 const popup = window.open(
 url,
 '_blank',
 'noopener,noreferrer',
 )

 if (!popup) {
 showNotice(
 'Popup blocked. Please allow popups for this site and try again.',
 )

 URL.revokeObjectURL(url)
 return
 }

 setTimeout(() => {
 URL.revokeObjectURL(url)
 }, 60_000)
 } catch (error: any) {
 showNotice(
 await extractPdfErrorMessage(
 error,
 errorFallback,
 ),
 )
 }
}

async function printVariantTag(variant: Variant) {
 if (printingVariantId.value) {
 return
 }

 printingVariantId.value = variant.id

 try {
 await openPdfInNewTab(
 `/admin/product-variants/${variant.id}/label`,
 'Could not print a tag for this variant.',
 )
 } finally {
 printingVariantId.value = null
 }
}

async function printVariantCard(variant: Variant) {
 if (printingCardVariantId.value) {
 return
 }

 printingCardVariantId.value = variant.id

 try {
 await openPdfInNewTab(
 `/admin/product-variants/${variant.id}/packaging-card`,
 'Could not print a packaging card for this variant.',
 )
 } finally {
 printingCardVariantId.value = null
 }
}

onBeforeUnmount(() => {
 if (noticeTimer.value) {
 clearTimeout(noticeTimer.value)
 }
})
</script>

<template>
 <AppModal
 :open="open"
 title="Product variants"
 :description="`${productName} · Each variant is an individual sellable SKU with its own code, price and inventory settings.`"
 max-width="max-w-[1180px]"
 @close="emit('close')"
 >
 <div
 class="
 space-y-4

 p-4

 sm:p-5
 "
 >
 <!-- Notice -->
 <Transition
 enter-active-class="transition duration-180"
 enter-from-class="-translate-y-1 opacity-0"
 leave-active-class="transition duration-120"
 leave-to-class="-translate-y-1 opacity-0"
 >
 <div
 v-if="notice"
 class="
 flex
 items-center
 gap-2

 rounded-[10px]

 bg-emerald-500/[0.08]

 px-3
 py-2.5

 text-[11px]
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

 {{ notice }}
 </div>
 </Transition>

 <!-- Toolbar -->
 <div
 class="
 flex
 flex-col
 gap-3

 lg:flex-row
 lg:items-center
 lg:justify-between
 "
 >
 <div
 class="
 flex
 flex-wrap
 items-center
 gap-x-4
 gap-y-1.5

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 <span>
 <strong
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ variants.length }}
 </strong>

 variants
 </span>

 <span>
 <strong
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ activeVariantCount }}
 </strong>

 active
 </span>

 <span>
 <strong
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ trackedVariantCount }}
 </strong>

 inventory tracked
 </span>
 </div>

 <div
 class="
 flex
 items-center
 gap-2
 "
 >
 <AppInput
 v-if="variants.length > 4"
 v-model="search"
 class="
 min-w-0
 flex-1

 sm:w-[240px]
 "
 placeholder="Search SKU, barcode or option..."
 >
 <template #prefix>
 <svg
 class="h-4 w-4"
 viewBox="0 0 20 20"
 fill="none"
 >
 <circle
 cx="8.5"
 cy="8.5"
 r="5"
 stroke="currentColor"
 stroke-width="1.5"
 />

 <path
 d="M12.5 12.5L17 17"
 stroke="currentColor"
 stroke-width="1.5"
 stroke-linecap="round"
 />
 </svg>
 </template>
 </AppInput>

 <button
 type="button"
 title="Refresh variants"
 aria-label="Refresh variants"
 class="
 flex
 h-9
 w-9
 shrink-0
 items-center
 justify-center

 rounded-[9px]

 text-gray-400

 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-900

 active:scale-95

 disabled:pointer-events-none
 disabled:opacity-40

 dark:text-gray-600
 dark:hover:bg-white/[0.07]
 dark:hover:text-white
 "
 :disabled="loading"
 @click="loadVariants"
 >
 <svg
 class="h-4 w-4"
 :class="loading ? 'animate-spin' : ''"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M16 7A6.5 6.5 0 1 0 16.2 13"
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 />

 <path
 d="M13.5 4.5H16.5V7.5"
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </button>

 <AppButton
 type="button"
 size="sm"
 @click="openCreate"
 >
 <svg
 class="h-3.5 w-3.5"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M10 4V16M4 10H16"
 stroke="currentColor"
 stroke-width="1.7"
 stroke-linecap="round"
 />
 </svg>

 Add variant
 </AppButton>
 </div>
 </div>

 <!-- Loading -->
 <div
 v-if="loading"
 class="
 grid
 gap-2
 "
 >
 <div
 v-for="item in 4"
 :key="item"
 class="
 flex
 items-center
 gap-3

 rounded-[12px]

 bg-gray-950/[0.025]

 p-3

 dark:bg-white/[0.035]
 "
 >
 <AppSkeleton
 class-name="h-8 w-8 shrink-0"
 rounded="lg"
 />

 <div class="min-w-0 flex-1">
 <AppSkeleton
 class-name="h-3.5 w-36"
 />

 <AppSkeleton
 class-name="mt-2 h-2.5 w-56 max-w-full"
 />
 </div>

 <AppSkeleton
 class-name="h-4 w-20"
 />

 <AppSkeleton
 class-name="h-8 w-16"
 rounded="lg"
 />
 </div>
 </div>

 <!-- Error -->
 <div
 v-else-if="loadError"
 class="
 rounded-[12px]

 bg-red-500/[0.07]

 px-4
 py-3

 text-[12px]
 font-medium
 text-red-600

 dark:bg-red-500/10
 dark:text-red-400
 "
 >
 <div
 class="
 flex
 items-center
 justify-between
 gap-4
 "
 >
 <span>
 {{ loadError }}
 </span>

 <button
 type="button"
 class="
 shrink-0

 text-[11px]
 font-semibold

 transition

 hover:opacity-70
 "
 @click="loadVariants"
 >
 Retry
 </button>
 </div>
 </div>

 <!-- Empty -->
 <div
 v-else-if="variants.length === 0"
 class="
 flex
 min-h-[240px]
 items-center
 justify-center

 rounded-[16px]

 bg-gray-950/[0.025]

 px-6
 py-10

 text-center

 dark:bg-white/[0.035]
 "
 >
 <div class="max-w-sm">
 <div
 class="
 mx-auto

 flex
 h-10
 w-10
 items-center
 justify-center

 rounded-[11px]

 bg-gray-950/[0.045]

 text-gray-400

 dark:bg-white/[0.055]
 dark:text-gray-600
 "
 >
 <svg
 class="h-5 w-5"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M4 5.5H16V14.5H4V5.5Z"
 stroke="currentColor"
 stroke-width="1.4"
 />

 <path
 d="M7 8H13M7 11H11"
 stroke="currentColor"
 stroke-width="1.4"
 stroke-linecap="round"
 />
 </svg>
 </div>

 <p
 class="
 mt-3

 text-[12px]
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 No variants yet
 </p>

 <p
 class="
 mt-1

 text-[11px]
 leading-5
 text-gray-400

 dark:text-gray-600
 "
 >
 This product needs at least one variant before it can be sold,
 stocked or printed.
 </p>

 <AppButton
 type="button"
 size="sm"
 class="mt-4"
 @click="openCreate"
 >
 Add first variant
 </AppButton>
 </div>
 </div>

 <!-- No search results -->
 <div
 v-else-if="filteredVariants.length === 0"
 class="
 flex
 min-h-[160px]
 items-center
 justify-center

 rounded-[14px]

 bg-gray-950/[0.025]

 text-center

 dark:bg-white/[0.035]
 "
 >
 <div>
 <p
 class="
 text-[12px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 No matching variants
 </p>

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
 @click="search = ''"
 >
 Clear search
 </button>
 </div>
 </div>

 <template v-else>
 <!-- Desktop -->
 <section
 class="
 hidden

 overflow-visible

 rounded-[16px]

 bg-gray-950/[0.018]

 dark:bg-white/[0.025]

 lg:block
 "
 >
 <!-- Header -->
 <div
 class="
 grid
 grid-cols-[minmax(250px,1.7fr)_minmax(170px,1fr)_130px_135px_105px]
 items-center
 gap-4

 px-4
 py-3

 text-[12px]
 font-semibold
 uppercase
 tracking-[0.1em]
 text-gray-400

 dark:text-gray-600
 "
 >
 <div>
 Variant
 </div>

 <div>
 Codes
 </div>

 <div>
 Inventory
 </div>

 <div class="text-right">
 Price
 </div>

 <div class="text-right">
 Actions
 </div>
 </div>

 <div
 class="
 divide-y
 divide-gray-100

 dark:divide-white/[0.055]
 "
 >
 <div
 v-for="variant in filteredVariants"
 :key="variant.id"
 class="
 group

 grid
 grid-cols-[minmax(250px,1.7fr)_minmax(170px,1fr)_130px_135px_105px]
 items-center
 gap-4

 px-4
 py-3

 transition

 hover:bg-white/70

 dark:hover:bg-white/[0.025]
 "
 >
 <!-- Variant -->
 <div class="min-w-0">
 <div
 class="
 flex
 min-w-0
 items-center
 gap-2
 "
 >
 <span
 class="
 h-1.5
 w-1.5
 shrink-0
 rounded-full
 "
 :class="
 variant.is_active
 ? 'bg-emerald-500'
 : 'bg-gray-300 dark:bg-gray-700'
 "
 />

 <button
 type="button"
 class="
 min-w-0
 truncate

 text-left
 text-[12px]
 font-semibold
 text-gray-900

 transition

 hover:text-gray-600

 dark:text-gray-100
 dark:hover:text-gray-300
 "
 @click="openEdit(variant)"
 >
 {{ variantTitle(variant) }}
 </button>

 <span
 v-if="variant.is_default"
 class="
 shrink-0

 text-[11px]
 font-semibold
 uppercase
 tracking-[0.08em]
 text-blue-600

 dark:text-blue-400
 "
 >
 Default
 </span>
 </div>

 <p
 class="
 mt-1
 truncate

 pl-3.5

 text-[12px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ attributeSummary(variant) }}
 </p>
 </div>

 <!-- Codes -->
 <div class="min-w-0">
 <p
 class="
 truncate

 font-mono
 text-[11px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 {{ variant.sku }}
 </p>

 <p
 class="
 mt-1
 truncate

 font-mono
 text-[12px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{
 variant.barcode ||
 'No separate barcode'
 }}
 </p>
 </div>

 <!-- Inventory -->
 <div>
 <p
 class="
 text-[11px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 {{
 variant.track_inventory
 ? 'Tracked'
 : 'Not tracked'
 }}
 </p>

 <p
 class="
 mt-1

 text-[12px]
 text-gray-400

 dark:text-gray-600
 "
 >
 <template v-if="variant.track_inventory">
 Low at {{ variant.min_stock_level }}

 <template v-if="variant.allow_backorder">
 · backorder
 </template>
 </template>

 <template v-else>
 No stock enforcement
 </template>
 </p>
 </div>

 <!-- Price -->
 <div class="text-right">
 <p
 class="
 text-[12px]
 font-semibold
 tabular-nums
 text-gray-900

 dark:text-gray-100
 "
 >
 {{
 money(
 variant.sale_price ??
 variant.price,
 )
 }}
 </p>

 <p
 v-if="variant.sale_price"
 class="
 mt-0.5

 text-[12px]
 tabular-nums
 text-gray-400
 line-through

 dark:text-gray-600
 "
 >
 {{ money(variant.price) }}
 </p>
 </div>

 <!-- Actions -->
 <div
 class="
 flex
 items-center
 justify-end
 gap-1
 "
 >
 <button
 type="button"
 class="
 h-8

 rounded-[8px]

 px-2.5

 text-[11px]
 font-medium
 text-gray-500

 transition

 hover:bg-gray-950/[0.045]
 hover:text-gray-900

 disabled:pointer-events-none
 disabled:opacity-40

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-white
 "
 :disabled="printingVariantId === variant.id"
 @click="printVariantTag(variant)"
 >
 {{
 printingVariantId === variant.id
 ? 'Printing…'
 : 'Tag'
 }}
 </button>

 <AppActionMenu>
 <template #default="{ close }">
 <AppActionMenuItem
 @click="openEdit(variant); close()"
 >
 Edit variant
 </AppActionMenuItem>

 <AppActionMenuItem
 @click="printVariantTag(variant); close()"
 >
 {{
 printingVariantId === variant.id
 ? 'Preparing tag…'
 : 'Print tag'
 }}
 </AppActionMenuItem>

 <AppActionMenuItem
 @click="printVariantCard(variant); close()"
 >
 {{
 printingCardVariantId === variant.id
 ? 'Preparing card…'
 : 'Print packaging card'
 }}
 </AppActionMenuItem>

 <AppActionMenuItem
 danger
 @click="askDelete(variant); close()"
 >
 Delete variant
 </AppActionMenuItem>
 </template>
 </AppActionMenu>
 </div>
 </div>
 </div>
 </section>

 <!-- Mobile / tablet -->
 <div
 class="
 grid
 gap-2.5

 sm:grid-cols-2

 lg:hidden
 "
 >
 <article
 v-for="variant in filteredVariants"
 :key="variant.id"
 class="
 rounded-[14px]

 bg-gray-950/[0.025]

 p-3

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
 <button
 type="button"
 class="
 min-w-0
 flex-1

 text-left
 "
 @click="openEdit(variant)"
 >
 <div
 class="
 flex
 min-w-0
 items-center
 gap-2
 "
 >
 <span
 class="
 h-1.5
 w-1.5
 shrink-0
 rounded-full
 "
 :class="
 variant.is_active
 ? 'bg-emerald-500'
 : 'bg-gray-300 dark:bg-gray-700'
 "
 />

 <p
 class="
 truncate

 text-[12px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 {{ variantTitle(variant) }}
 </p>
 </div>

 <p
 class="
 mt-1
 truncate

 pl-3.5

 text-[12px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ attributeSummary(variant) }}
 </p>
 </button>

 <AppActionMenu>
 <template #default="{ close }">
 <AppActionMenuItem
 @click="openEdit(variant); close()"
 >
 Edit variant
 </AppActionMenuItem>

 <AppActionMenuItem
 @click="printVariantTag(variant); close()"
 >
 Print tag
 </AppActionMenuItem>

 <AppActionMenuItem
 @click="printVariantCard(variant); close()"
 >
 Print packaging card
 </AppActionMenuItem>

 <AppActionMenuItem
 danger
 @click="askDelete(variant); close()"
 >
 Delete variant
 </AppActionMenuItem>
 </template>
 </AppActionMenu>
 </div>

 <div
 class="
 mt-3

 grid
 grid-cols-2
 gap-x-4
 gap-y-3
 "
 >
 <div>
 <p
 class="
 text-[11px]
 font-semibold
 uppercase
 tracking-[0.08em]
 text-gray-400

 dark:text-gray-600
 "
 >
 SKU
 </p>

 <p
 class="
 mt-1
 truncate

 font-mono
 text-[12px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 {{ variant.sku }}
 </p>
 </div>

 <div>
 <p
 class="
 text-[11px]
 font-semibold
 uppercase
 tracking-[0.08em]
 text-gray-400

 dark:text-gray-600
 "
 >
 Price
 </p>

 <p
 class="
 mt-1

 text-[12px]
 font-semibold
 tabular-nums
 text-gray-800

 dark:text-gray-200
 "
 >
 {{
 money(
 variant.sale_price ??
 variant.price,
 )
 }}
 </p>
 </div>

 <div>
 <p
 class="
 text-[11px]
 font-semibold
 uppercase
 tracking-[0.08em]
 text-gray-400

 dark:text-gray-600
 "
 >
 Inventory
 </p>

 <p
 class="
 mt-1

 text-[12px]
 text-gray-500

 dark:text-gray-500
 "
 >
 {{
 variant.track_inventory
 ? `Tracked · low ${variant.min_stock_level}`
 : 'Not tracked'
 }}
 </p>
 </div>

 <div>
 <p
 class="
 text-[11px]
 font-semibold
 uppercase
 tracking-[0.08em]
 text-gray-400

 dark:text-gray-600
 "
 >
 Status
 </p>

 <div
 class="
 mt-1

 flex
 items-center
 gap-2
 "
 >
 <span
 class="
 text-[12px]
 text-gray-500

 dark:text-gray-500
 "
 >
 {{
 variant.is_active
 ? 'Active'
 : 'Inactive'
 }}
 </span>

 <span
 v-if="variant.is_default"
 class="
 text-[11px]
 font-semibold
 text-blue-600

 dark:text-blue-400
 "
 >
 Default
 </span>
 </div>
 </div>
 </div>
 </article>
 </div>
 </template>
 </div>
 </AppModal>

 <ProductVariantFormModal
 :open="formOpen"
 :mode="formMode"
 :product-id="productId"
 :product-name="productName"
 :brand-name="brandName"
 :brand-logo-url="brandLogoUrl"
 :card-description="cardDescription"
 :has-default-variant="hasDefaultVariant"
 :variant="editingVariant"
 @close="formOpen = false"
 @saved="onSaved"
 />

 <AppConfirmModal
 :open="deleteOpen"
 title="Delete variant?"
 :message="`This removes “${variantToDelete?.option_summary || variantToDelete?.sku || 'this variant'}” permanently, including its stock links. This can't be undone.`"
 confirm-label="Delete variant"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="confirmDelete"
 />
</template>