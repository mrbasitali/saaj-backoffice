<script setup lang="ts">
definePageMeta({
 middleware: 'auth',
 layout: 'admin',
})

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
 source_product_image_id?: number | null
 is_generated?: boolean
 remove_background?: boolean
 transformation_type?: string | null
 transformation_meta?: Record<string, any> | null
}

type Product = {
 id: number
 brand_id: number | null
 name: string
 slug: string
 short_description: string | null
 description: string | null
 care_instructions: string | null
 card_description: string | null
 meta_title: string | null
 meta_description: string | null
 is_active: boolean
 is_featured: boolean
 sort_order: number
 published_at: string | null
 brand?: Brand | null
 categories?: Category[]
 primary_image?: ProductImage | null
 images?: ProductImage[]
 images_count?: number
 created_at?: string | null
 updated_at?: string | null
}

type PaginationMeta = {
 current_page: number
 from: number | null
 last_page: number
 per_page: number
 to: number | null
 total: number
}

type ProductIndexResponse = {
 data: Product[]
 meta: PaginationMeta
}

type ProductResponse = {
 data: Product
 message?: string
}

type BrandsResponse = {
 data: Brand[]
}

type CategoriesTreeResponse = {
 data: Category[]
}

const { $api } = useNuxtApp()
const { formatDateTime: formatAppDateTime } = useAppDateTime()
const { openPdf: openSecurePdf, state: securePdfState } = useSecurePdf()

const search = ref('')
const debouncedSearch = ref('')
const brandFilter = ref('all')
const categoryFilter = ref('all')
const activeFilter = ref('all')
const featuredFilter = ref('all')
const imageStatusFilter = ref('all')
const publishedStatusFilter = ref('all')
const sortBy = ref('updated')
const perPage = ref(20)
const page = ref(1)
const filtersOpen = ref(false)
const editingProductId = ref<number | null>(null)

const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const selectedProduct = ref<Product | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const productToDelete = ref<Product | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const printingProductId = ref<number | null>(null)
const printingCardProductId = ref<number | null>(null)

watch(() => securePdfState.value.status, (status) => {
 if (status !== 'loading') {
 printingProductId.value = null
 printingCardProductId.value = null
 }
})

const variantsPanelOpen = ref(false)
const variantsPanelProduct = ref<Product | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const activeOptions = [
 { label: 'All statuses', value: 'all' },
 { label: 'Active', value: 'active' },
 { label: 'Inactive', value: 'inactive' },
]

const featuredOptions = [
 { label: 'All featured states', value: 'all' },
 { label: 'Featured', value: 'yes' },
 { label: 'Not featured', value: 'no' },
]

const imageStatusOptions = [
 { label: 'All image states', value: 'all' },
 { label: 'With images', value: 'with_images' },
 { label: 'No images', value: 'no_images' },
 { label: 'Missing primary image', value: 'missing_primary' },
 { label: 'Has generated images', value: 'generated' },
]

const publishedStatusOptions = [
 { label: 'All publish states', value: 'all' },
 { label: 'Published', value: 'published' },
 { label: 'Scheduled', value: 'scheduled' },
 { label: 'Draft / no publish date', value: 'draft' },
]

const sortOptions = [
 { label: 'Recently updated', value: 'updated' },
 { label: 'Sort order', value: 'sort_order' },
 { label: 'Name A-Z', value: 'name' },
 { label: 'Latest created', value: 'latest' },
 { label: 'Published first', value: 'published' },
 { label: 'Most images', value: 'image_count' },
]

const perPageOptions = [
 { label: '20 / page', value: 20 },
 { label: '50 / page', value: 50 },
 { label: '100 / page', value: 100 },
]

watch(search, (value) => {
 if (searchTimer) clearTimeout(searchTimer)

 searchTimer = setTimeout(() => {
 page.value = 1
 debouncedSearch.value = value.trim()
 }, 300)
})

watch([
 brandFilter,
 categoryFilter,
 activeFilter,
 featuredFilter,
 imageStatusFilter,
 publishedStatusFilter,
 sortBy,
 perPage,
], () => {
 page.value = 1
})

const {
 data: bootstrap,
 pending: bootstrapPending,
 error: bootstrapError,
 refresh: refreshBootstrap,
} = useAsyncData(
 'products-bootstrap',
 async () => {
 const [brandsResponse, categoriesResponse] = await Promise.all([
 $api<BrandsResponse>('/admin/brands', {
 query: {
 per_page: 100,
 },
 }),
 $api<CategoriesTreeResponse>('/admin/categories/tree'),
 ])

 return {
 brands: brandsResponse.data ?? [],
 categories: categoriesResponse.data ?? [],
 }
 },
 {
 immediate: true,
 },
)

const brands = computed(() => bootstrap.value?.brands ?? [])
const categories = computed(() => bootstrap.value?.categories ?? [])
const flatCategories = computed(() => flattenCategories(categories.value))

const brandOptions = computed(() => [
 { label: 'All brands', value: 'all' },
 ...brands.value.map((brand) => ({
 label: brand.name,
 value: String(brand.id),
 })),
])

const categoryOptions = computed(() => [
 { label: 'All categories', value: 'all' },
 ...flatCategories.value.map((category) => ({
 label: `${'— '.repeat(category.depth)}${category.name}`,
 value: String(category.id),
 })),
])

function buildQuery() {
 const query: Record<string, string | number> = {
 page: page.value,
 per_page: perPage.value,
 sort_by: sortBy.value,
 }

 if (debouncedSearch.value) {
 query.search = debouncedSearch.value
 }

 if (brandFilter.value !== 'all') {
 query.brand_id = brandFilter.value
 }

 if (categoryFilter.value !== 'all') {
 query.category_id = categoryFilter.value
 }

 if (activeFilter.value !== 'all') {
 query.is_active = activeFilter.value === 'active' ? 1 : 0
 }

 if (featuredFilter.value !== 'all') {
 query.is_featured = featuredFilter.value === 'yes' ? 1 : 0
 }

 if (imageStatusFilter.value !== 'all') {
 query.image_status = imageStatusFilter.value
 }

 if (publishedStatusFilter.value !== 'all') {
 query.published_status = publishedStatusFilter.value
 }

 return query
}

const {
 data,
 pending,
 error,
 refresh,
} = useAsyncData(
 'admin-products',
 () => $api<ProductIndexResponse>('/admin/products', {
 query: buildQuery(),
 }),
 {
 watch: [
 debouncedSearch,
 brandFilter,
 categoryFilter,
 activeFilter,
 featuredFilter,
 imageStatusFilter,
 publishedStatusFilter,
 sortBy,
 perPage,
 page,
 ],
 immediate: true,
 },
)

const products = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)

const isInitialLoading = computed(() => {
 return (pending.value || bootstrapPending.value) && (!data.value || !bootstrap.value)
})

const isRefreshing = computed(() => {
 return (pending.value || bootstrapPending.value) && Boolean(data.value && bootstrap.value)
})

const hasError = computed(() => error.value || bootstrapError.value)

const hasActiveFilters = computed(() => {
 return Boolean(
 search.value ||
 brandFilter.value !== 'all' ||
 categoryFilter.value !== 'all' ||
 activeFilter.value !== 'all' ||
 featuredFilter.value !== 'all' ||
 imageStatusFilter.value !== 'all' ||
 publishedStatusFilter.value !== 'all' ||
 sortBy.value !== 'updated' ||
 perPage.value !== 20,
 )
})

const activeProducts = computed(() => products.value.filter((item) => item.is_active).length)
const featuredProducts = computed(() => products.value.filter((item) => item.is_featured).length)
const productsMissingImages = computed(() => products.value.filter((item) => imageCount(item) === 0).length)

const visibleFilterCount = computed(() => {
 return [
 search.value,
 brandFilter.value !== 'all',
 categoryFilter.value !== 'all',
 activeFilter.value !== 'all',
 featuredFilter.value !== 'all',
 imageStatusFilter.value !== 'all',
 publishedStatusFilter.value !== 'all',
 sortBy.value !== 'updated',
 perPage.value !== 20,
 ].filter(Boolean).length
})

const canGoPrevious = computed(() => page.value > 1)

const canGoNext = computed(() => {
 if (!meta.value) return false

 return page.value < meta.value.last_page
})

function flattenCategories(items: Category[], result: Category[] = []) {
 items.forEach((item) => {
 result.push(item)

 if (item.children?.length) {
 flattenCategories(item.children, result)
 }
 })

 return result
}

function productImage(product: Product) {
 const primary = product.primary_image
 const fallback = product.images?.find((image) => image.is_primary) || product.images?.[0]

 return (
 primary?.optimized_urls?.thumb ||
 primary?.optimized_urls?.card ||
 primary?.image_url ||
 fallback?.optimized_urls?.thumb ||
 fallback?.optimized_urls?.card ||
 fallback?.image_url ||
 ''
 )
}

function imageCount(product: Product) {
 if (typeof product.images_count === 'number') return product.images_count

 return product.images?.length ?? 0
}

function primaryCategory(product: Product) {
 return product.categories?.[0]?.name || 'Uncategorized'
}

function secondaryCategoryCount(product: Product) {
 return Math.max(0, (product.categories?.length ?? 0) - 1)
}

function dateLabel(value: string | null | undefined) {
 return formatAppDateTime(value)
}

function publishBadgeVariant(product: Product): 'neutral' | 'green' | 'amber' {
 if (!product.published_at) return 'neutral'

 return new Date(product.published_at).getTime() > Date.now() ? 'amber' : 'green'
}

function publishLabel(product: Product) {
 if (!product.published_at) return 'Draft'

 return new Date(product.published_at).getTime() > Date.now() ? 'Scheduled' : 'Published'
}

function setQuickView(view: 'all' | 'active' | 'inactive' | 'featured' | 'needs_images' | 'drafts' | 'scheduled') {
 if (view === 'all') {
 activeFilter.value = 'all'
 featuredFilter.value = 'all'
 imageStatusFilter.value = 'all'
 publishedStatusFilter.value = 'all'
 return
 }

 activeFilter.value = 'all'
 featuredFilter.value = 'all'
 imageStatusFilter.value = 'all'
 publishedStatusFilter.value = 'all'

 if (view === 'active') activeFilter.value = 'active'
 if (view === 'inactive') activeFilter.value = 'inactive'
 if (view === 'featured') featuredFilter.value = 'yes'
 if (view === 'needs_images') imageStatusFilter.value = 'no_images'
 if (view === 'drafts') publishedStatusFilter.value = 'draft'
 if (view === 'scheduled') publishedStatusFilter.value = 'scheduled'
}

function quickViewIsActive(view: 'all' | 'active' | 'inactive' | 'featured' | 'needs_images' | 'drafts' | 'scheduled') {
 if (view === 'all') {
 return activeFilter.value === 'all' && featuredFilter.value === 'all' && imageStatusFilter.value === 'all' && publishedStatusFilter.value === 'all'
 }

 if (view === 'active') return activeFilter.value === 'active'
 if (view === 'inactive') return activeFilter.value === 'inactive'
 if (view === 'featured') return featuredFilter.value === 'yes'
 if (view === 'needs_images') return imageStatusFilter.value === 'no_images'
 if (view === 'drafts') return publishedStatusFilter.value === 'draft'
 if (view === 'scheduled') return publishedStatusFilter.value === 'scheduled'

 return false
}

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) clearTimeout(noticeTimer.value)

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

function openVariants(product: Product) {
 variantsPanelProduct.value = product
 variantsPanelOpen.value = true
}

function printProductTags(product: Product) {
 if (printingProductId.value) return

 printingProductId.value = product.id

 openSecurePdf({
 endpoint: `/admin/products/${product.id}/labels`,
 filename: `tags-${product.slug}.pdf`,
 title: `Product tags — ${product.name}`,
 description: 'Review the printable barcode labels before printing or downloading.',
 errorFallback: 'Could not generate tags for this product. Make sure it has at least one active variant.',
 })
}

function printProductCards(product: Product) {
 if (printingCardProductId.value) return

 printingCardProductId.value = product.id

 openSecurePdf({
 endpoint: `/admin/products/${product.id}/packaging-cards`,
 filename: `packaging-card-${product.slug}.pdf`,
 title: `Packaging cards — ${product.name}`,
 description: 'Review the printable packaging cards before printing or downloading.',
 errorFallback: 'Could not generate packaging cards for this product. Make sure it has at least one active variant.',
 })
}

async function fetchProduct(productId: number) {
 const response = await $api<ProductResponse>(`/admin/products/${productId}`)

 return response.data
}

function openCreate() {
 selectedProduct.value = null
 formMode.value = 'create'
 formOpen.value = true
}

async function openEdit(product: Product) {
 editingProductId.value = product.id
 selectedProduct.value = product
 formMode.value = 'edit'

 try {
 selectedProduct.value = await fetchProduct(product.id)
 formOpen.value = true
 } catch (error: any) {
 showNotice(extractApiErrorMessage(error, 'Could not load full product details.'))
 } finally {
 editingProductId.value = null
 }
}

async function afterProductChanged() {
 await refresh()

 if (selectedProduct.value) {
 try {
 selectedProduct.value = await fetchProduct(selectedProduct.value.id)
 } catch {
 const updated = products.value.find((item) => item.id === selectedProduct.value?.id)

 if (updated) {
 selectedProduct.value = updated
 }
 }
 }
}

async function afterSaved(product: Product, closeAfterSave = false) {
 await refresh()

 let updated = product

 try {
 updated = await fetchProduct(product.id)
 } catch {
 updated = products.value.find((item) => item.id === product.id) || product
 }

 selectedProduct.value = updated
 formMode.value = 'edit'
 formOpen.value = !closeAfterSave

 showNotice(
 closeAfterSave
 ? 'Product saved successfully.'
 : 'Product saved. You can continue editing images and use Image Studio.',
 )
}

function askDelete(product: Product) {
 productToDelete.value = product
 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDelete() {
 if (!productToDelete.value) return

 deleting.value = true
 deleteError.value = ''

 try {
 await $api(`/admin/products/${productToDelete.value.id}`, {
 method: 'DELETE',
 })

 deleteOpen.value = false
 showNotice('Product deleted successfully.')

 await refresh()
 } catch (error: any) {
 deleteError.value = extractApiErrorMessage(error, 'Could not delete product.')
 } finally {
 deleting.value = false
 }
}

function clearFilters() {
 search.value = ''
 debouncedSearch.value = ''
 brandFilter.value = 'all'
 categoryFilter.value = 'all'
 activeFilter.value = 'all'
 featuredFilter.value = 'all'
 imageStatusFilter.value = 'all'
 publishedStatusFilter.value = 'all'
 sortBy.value = 'updated'
 perPage.value = 20
 page.value = 1
}

async function refreshAll() {
 await Promise.all([
 refreshBootstrap(),
 refresh(),
 ])
}

function previousPage() {
 if (!canGoPrevious.value) return

 page.value--
}

function nextPage() {
 if (!canGoNext.value) return

 page.value++
}
</script>

<template>
 <section
 class="
 mx-auto
 max-w-[1600px]
 "
 >
 <ProductsSkeleton
 v-if="isInitialLoading"
 />

 <div
 v-else
 class="
 relative
 space-y-4

 sm:space-y-5
 "
 >
 <!-- Refresh overlay -->
 <div
 v-if="isRefreshing"
 class="
 pointer-events-none
 absolute
 inset-0
 z-10

 rounded-[18px]

 bg-[#f4f5f7]/40

 backdrop-blur-[1px]

 dark:bg-[#09090b]/30
 "
 />

 <!-- Page intro / actions -->
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
 <p
 class="
 max-w-2xl

 text-[12px]
 leading-5
 text-gray-400

 dark:text-gray-500
 "
 >
 Manage product content, images,
 publishing and variants from one
 catalog.
 </p>

 <div
 class="
 flex
 shrink-0
 items-center
 gap-1.5
 "
 >
 <button
 type="button"
 aria-label="Refresh products"
 title="Refresh products"
 class="
 flex
 h-9
 w-9
 items-center
 justify-center

 rounded-[10px]

 text-gray-400

 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-900

 active:scale-95

 disabled:pointer-events-none
 disabled:opacity-50

 dark:text-gray-600
 dark:hover:bg-white/[0.07]
 dark:hover:text-white
 "
 :disabled="
 pending
 || bootstrapPending
 "
 @click="refreshAll"
 >
 <svg
 class="h-4 w-4"
 :class="
 pending
 || bootstrapPending
 ? 'animate-spin'
 : ''
 "
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="
 M16 7
 A6.5 6.5 0 1 0
 16.2 13
 "
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 />

 <path
 d="
 M13.5 4.5
 H16.5
 V7.5
 "
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </button>

 <AppButton
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

 Add product
 </AppButton>
 </div>
 </div>

 <!-- Notice -->
 <Transition
 enter-active-class="
 transition
 duration-200
 "
 enter-from-class="
 -translate-y-1
 opacity-0
 "
 leave-active-class="
 transition
 duration-150
 "
 leave-to-class="
 -translate-y-1
 opacity-0
 "
 >
 <div
 v-if="notice"
 class="
 flex
 items-center
 gap-2.5

 rounded-[12px]

 bg-emerald-500/[0.08]

 px-3.5
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

 {{ notice }}
 </div>
 </Transition>

 <!-- Catalog controls -->
 <section
 class="
 overflow-visible

 rounded-[18px]

 bg-white

 shadow-[0_1px_2px_rgba(17,24,39,0.025)]

 dark:bg-[#111214]
 dark:shadow-none
 "
 >
 <!-- Search -->
 <div
 class="
 p-3

 sm:p-4
 "
 >
 <div
 class="
 grid
 gap-2.5

 md:grid-cols-[minmax(0,1fr)_auto]
 md:items-center
 "
 >
 <AppInput
 v-model="search"
 placeholder="Search products, slug, description or SEO title..."
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

 <div
 class="
 flex
 items-center
 gap-1.5
 "
 >
 <button
 type="button"
 class="
 flex
 h-10
 items-center
 gap-2

 rounded-[10px]

 bg-gray-950/[0.04]

 px-3

 text-[12px]
 font-medium
 text-gray-600

 transition

 hover:bg-gray-950/[0.065]
 hover:text-gray-900

 active:scale-[0.98]

 dark:bg-white/[0.06]
 dark:text-gray-400
 dark:hover:bg-white/[0.09]
 dark:hover:text-white
 "
 :class="
 filtersOpen
 ? `
 bg-gray-950/[0.07]
 text-gray-900

 dark:bg-white/[0.09]
 dark:text-white
 `
 : ''
 "
 @click="
 filtersOpen =
 !filtersOpen
 "
 >
 <svg
 class="h-4 w-4"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="
 M3 5H17
 M5.5 10H14.5
 M8 15H12
 "
 stroke="currentColor"
 stroke-width="1.5"
 stroke-linecap="round"
 />
 </svg>

 Filters

 <span
 v-if="visibleFilterCount"
 class="
 flex
 h-5
 min-w-5
 items-center
 justify-center

 rounded-full

 bg-gray-950

 px-1.5

 text-[12px]
 font-semibold
 text-white

 dark:bg-white
 dark:text-gray-950
 "
 >
 {{ visibleFilterCount }}
 </span>
 </button>

 <button
 v-if="hasActiveFilters"
 type="button"
 class="
 h-10

 rounded-[10px]

 px-3

 text-[12px]
 font-medium
 text-gray-400

 transition

 hover:bg-gray-950/[0.04]
 hover:text-gray-700

 dark:text-gray-600
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-300
 "
 @click="clearFilters"
 >
 Clear
 </button>
 </div>
 </div>

 <!-- Quick views -->
 <div
 class="
 mt-3

 flex
 items-center
 gap-1

 overflow-x-auto

 [scrollbar-width:none]
 [&::-webkit-scrollbar]:hidden
 "
 >
 <button
 type="button"
 class="
 h-8
 shrink-0

 rounded-[8px]

 px-2.5

 text-[12px]
 font-medium

 transition
 "
 :class="
 quickViewIsActive('all')
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 text-gray-500

 hover:bg-gray-950/[0.045]
 hover:text-gray-900

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-200
 `
 "
 @click="setQuickView('all')"
 >
 All
 </button>

 <button
 type="button"
 class="
 h-8
 shrink-0
 rounded-[8px]
 px-2.5
 text-[12px]
 font-medium
 transition
 "
 :class="
 quickViewIsActive('active')
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 text-gray-500

 hover:bg-gray-950/[0.045]
 hover:text-gray-900

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-200
 `
 "
 @click="
 setQuickView('active')
 "
 >
 Active
 </button>

 <button
 type="button"
 class="
 h-8
 shrink-0
 rounded-[8px]
 px-2.5
 text-[12px]
 font-medium
 transition
 "
 :class="
 quickViewIsActive('inactive')
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 text-gray-500

 hover:bg-gray-950/[0.045]
 hover:text-gray-900

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-200
 `
 "
 @click="
 setQuickView('inactive')
 "
 >
 Inactive
 </button>

 <button
 type="button"
 class="
 h-8
 shrink-0
 rounded-[8px]
 px-2.5
 text-[12px]
 font-medium
 transition
 "
 :class="
 quickViewIsActive('featured')
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 text-gray-500

 hover:bg-gray-950/[0.045]
 hover:text-gray-900

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-200
 `
 "
 @click="
 setQuickView('featured')
 "
 >
 Featured
 </button>

 <button
 type="button"
 class="
 h-8
 shrink-0
 rounded-[8px]
 px-2.5
 text-[12px]
 font-medium
 transition
 "
 :class="
 quickViewIsActive('needs_images')
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 text-gray-500

 hover:bg-gray-950/[0.045]
 hover:text-gray-900

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-200
 `
 "
 @click="
 setQuickView('needs_images')
 "
 >
 Needs images
 </button>

 <button
 type="button"
 class="
 h-8
 shrink-0
 rounded-[8px]
 px-2.5
 text-[12px]
 font-medium
 transition
 "
 :class="
 quickViewIsActive('drafts')
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 text-gray-500

 hover:bg-gray-950/[0.045]
 hover:text-gray-900

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-200
 `
 "
 @click="
 setQuickView('drafts')
 "
 >
 Drafts
 </button>

 <button
 type="button"
 class="
 h-8
 shrink-0
 rounded-[8px]
 px-2.5
 text-[12px]
 font-medium
 transition
 "
 :class="
 quickViewIsActive('scheduled')
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 text-gray-500

 hover:bg-gray-950/[0.045]
 hover:text-gray-900

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-200
 `
 "
 @click="
 setQuickView('scheduled')
 "
 >
 Scheduled
 </button>
 </div>
 </div>

 <!-- Detailed filters -->
 <Transition
 enter-active-class="
 transition
 duration-200
 ease-out
 "
 enter-from-class="
 -translate-y-1
 opacity-0
 "
 enter-to-class="
 translate-y-0
 opacity-100
 "
 leave-active-class="
 transition
 duration-150
 ease-in
 "
 leave-to-class="
 -translate-y-1
 opacity-0
 "
 >
 <div
 v-if="filtersOpen"
 class="
 grid
 gap-3

 px-3
 pb-4
 pt-1

 sm:grid-cols-2
 sm:px-4

 xl:grid-cols-4

 2xl:grid-cols-8
 "
 >
 <AppSelect
 v-model="brandFilter"
 label="Brand"
 :options="brandOptions"
 />

 <AppSelect
 v-model="categoryFilter"
 label="Category"
 :options="categoryOptions"
 />

 <AppSelect
 v-model="activeFilter"
 label="Status"
 :options="activeOptions"
 />

 <AppSelect
 v-model="featuredFilter"
 label="Featured"
 :options="featuredOptions"
 />

 <AppSelect
 v-model="imageStatusFilter"
 label="Images"
 :options="imageStatusOptions"
 />

 <AppSelect
 v-model="publishedStatusFilter"
 label="Publish"
 :options="publishedStatusOptions"
 />

 <AppSelect
 v-model="sortBy"
 label="Sort"
 :options="sortOptions"
 />

 <AppSelect
 v-model="perPage"
 label="Rows"
 :options="perPageOptions"
 />
 </div>
 </Transition>

 <!-- Compact result summary -->
 <div
 class="
 flex
 flex-wrap
 items-center
 gap-x-4
 gap-y-1.5

 px-4
 pb-3

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
 {{ products.length }}
 </strong>
 shown
 </span>

 <span>
 <strong
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ meta?.total ?? 0 }}
 </strong>
 total
 </span>

 <span>
 {{ activeProducts }}
 active on page
 </span>

 <span
 v-if="featuredProducts"
 >
 {{ featuredProducts }}
 featured
 </span>

 <span
 v-if="productsMissingImages"
 class="
 text-amber-600

 dark:text-amber-400
 "
 >
 {{ productsMissingImages }}
 need images
 </span>
 </div>
 </section>

 <!-- Error -->
 <AppErrorState
 v-if="hasError"
 title="Products could not be loaded"
 message="
 Please check backend API,
 authentication token,
 or route permissions.
 "
 @retry="refreshAll"
 />

 <!-- Empty -->
 <AppEmptyState
 v-else-if="
 products.length === 0
 "
 title="No products found"
 message="
 Create your first product
 or clear the current filters.
 "
 >
 <template #actions>
 <div
 class="
 flex
 items-center
 gap-2
 "
 >
 <AppButton
 v-if="hasActiveFilters"
 variant="secondary"
 size="sm"
 @click="clearFilters"
 >
 Clear filters
 </AppButton>

 <AppButton
 size="sm"
 @click="openCreate"
 >
 Add product
 </AppButton>
 </div>
 </template>
 </AppEmptyState>

 <template v-else>
 <!-- Desktop catalog -->
 <section
 class="
 hidden

 overflow-visible

 rounded-[18px]

 bg-white

 shadow-[0_1px_2px_rgba(17,24,39,0.025)]

 dark:bg-[#111214]
 dark:shadow-none

 xl:block
 "
 >
 <!-- Table header -->
 <div
 class="
 grid
 grid-cols-[minmax(280px,2fr)_minmax(150px,1fr)_120px_100px_150px_92px]
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
 Product
 </div>

 <div>
 Catalog
 </div>

 <div>
 State
 </div>

 <div>
 Images
 </div>

 <div>
 Publishing
 </div>

 <div class="text-right">
 Actions
 </div>
 </div>

 <!-- Rows -->
 <div
 class="
 divide-y
 divide-gray-100

 dark:divide-white/[0.055]
 "
 >
 <div
 v-for="product in products"
 :key="product.id"
 class="
 group

 grid
 grid-cols-[minmax(280px,2fr)_minmax(150px,1fr)_120px_100px_150px_92px]
 items-center
 gap-4

 px-4
 py-2.5

 transition
 duration-100

 hover:bg-gray-950/[0.018]

 dark:hover:bg-white/[0.025]
 "
 >
 <!-- Product -->
 <div
 class="
 flex
 min-w-0
 items-center
 gap-3
 "
 >
 <button
 type="button"
 class="
 h-12
 w-11
 shrink-0

 overflow-hidden

 rounded-[10px]

 bg-gray-100

 outline-none

 transition

 hover:opacity-85

 focus-visible:ring-2
 focus-visible:ring-gray-950/10

 dark:bg-white/[0.06]
 dark:focus-visible:ring-white/10
 "
 @click="openEdit(product)"
 >
 <img
 v-if="
 productImage(product)
 "
 :src="
 productImage(product)
 "
 :alt="product.name"
 class="
 h-full
 w-full
 object-cover
 "
 >

 <span
 v-else
 class="
 flex
 h-full
 w-full
 items-center
 justify-center

 px-1

 text-center
 text-[11px]
 font-medium
 leading-3
 text-gray-400

 dark:text-gray-600
 "
 >
 No image
 </span>
 </button>

 <div class="min-w-0">
 <button
 type="button"
 class="
 block
 max-w-full

 truncate

 text-left
 text-[12px]
 font-semibold
 tracking-[-0.005em]
 text-gray-900

 transition

 hover:text-gray-600

 dark:text-gray-100
 dark:hover:text-gray-300
 "
 @click="openEdit(product)"
 >
 {{ product.name }}
 </button>

 <p
 class="
 mt-0.5
 truncate

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ product.slug }}
 </p>

 <p
 v-if="
 product.short_description
 "
 class="
 mt-0.5
 max-w-[390px]
 truncate

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{
 product.short_description
 }}
 </p>
 </div>
 </div>

 <!-- Brand/category -->
 <div class="min-w-0">
 <p
 class="
 truncate

 text-[12px]
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{
 product.brand?.name
 || 'No brand'
 }}
 </p>

 <p
 class="
 mt-1
 truncate

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{
 primaryCategory(product)
 }}

 <template
 v-if="
 secondaryCategoryCount(
 product,
 )
 "
 >
 · +{{
 secondaryCategoryCount(
 product,
 )
 }}
 </template>
 </p>
 </div>

 <!-- State -->
 <div>
 <div
 class="
 flex
 items-center
 gap-1.5
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
 product.is_active
 ? 'bg-emerald-500'
 : 'bg-gray-300 dark:bg-gray-700'
 "
 />

 <span
 class="
 text-[12px]
 font-medium
 "
 :class="
 product.is_active
 ? `
 text-gray-700

 dark:text-gray-300
 `
 : `
 text-gray-400

 dark:text-gray-600
 `
 "
 >
 {{
 product.is_active
 ? 'Active'
 : 'Inactive'
 }}
 </span>
 </div>

 <p
 v-if="product.is_featured"
 class="
 mt-1

 text-[12px]
 font-medium
 text-blue-600

 dark:text-blue-400
 "
 >
 Featured
 </p>
 </div>

 <!-- Images -->
 <div>
 <p
 class="
 text-[12px]
 font-medium
 "
 :class="
 imageCount(product)
 ? `
 text-gray-700

 dark:text-gray-300
 `
 : `
 text-amber-600

 dark:text-amber-400
 `
 "
 >
 {{
 imageCount(product)
 }}
 {{
 imageCount(product) === 1
 ? 'image'
 : 'images'
 }}
 </p>

 <p
 v-if="
 !product.primary_image
 "
 class="
 mt-1

 text-[12px]
 text-amber-600

 dark:text-amber-400
 "
 >
 No primary
 </p>
 </div>

 <!-- Publish -->
 <div>
 <div
 class="
 flex
 items-center
 gap-1.5
 "
 >
 <span
 class="
 h-1.5
 w-1.5
 shrink-0
 rounded-full
 "
 :class="{
 'bg-emerald-500':
 publishLabel(product)
 === 'Published',

 'bg-amber-500':
 publishLabel(product)
 === 'Scheduled',

 'bg-gray-300 dark:bg-gray-700':
 publishLabel(product)
 === 'Draft',
 }"
 />

 <span
 class="
 text-[12px]
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{
 publishLabel(product)
 }}
 </span>
 </div>

 <p
 class="
 mt-1

 text-[12px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{
 dateLabel(
 product.published_at,
 )
 }}
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

 text-[12px]
 font-medium
 text-gray-500

 opacity-70

 transition

 hover:bg-gray-950/[0.045]
 hover:text-gray-900
 hover:opacity-100

 group-hover:opacity-100

 disabled:pointer-events-none
 disabled:opacity-40

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-white
 "
 :disabled="
 editingProductId
 === product.id
 "
 @click="
 openEdit(product)
 "
 >
 {{
 editingProductId
 === product.id
 ? 'Loading…'
 : 'Edit'
 }}
 </button>

 <AppActionMenu>
 <template #default="{ close }">
 <AppActionMenuItem
 @click="openEdit(product); close()"
 >
 Edit product
 </AppActionMenuItem>

 <AppActionMenuItem
 @click="openVariants(product); close()"
 >
 Manage variants
 </AppActionMenuItem>

 <AppActionMenuItem
 @click="printProductTags(product); close()"
 >
 {{
 printingProductId === product.id
 ? 'Preparing tags…'
 : 'Print tags'
 }}
 </AppActionMenuItem>

 <AppActionMenuItem
 @click="printProductCards(product); close()"
 >
 {{
 printingCardProductId === product.id
 ? 'Preparing cards…'
 : 'Print packaging cards'
 }}
 </AppActionMenuItem>

 <AppActionMenuItem
 danger
 @click="askDelete(product); close()"
 >
 Delete product
 </AppActionMenuItem>
 </template>
 </AppActionMenu>
 </div>
 </div>
 </div>
 </section>

 <!-- Tablet / mobile cards -->
 <div
 class="
 grid
 gap-2.5

 sm:grid-cols-2

 xl:hidden
 "
 >
 <article
 v-for="product in products"
 :key="product.id"
 class="
 rounded-[16px]

 bg-white

 p-3

 shadow-[0_1px_2px_rgba(17,24,39,0.025)]

 dark:bg-[#111214]
 dark:shadow-none
 "
 >
 <div
 class="
 flex
 items-start
 gap-3
 "
 >
 <button
 type="button"
 class="
 h-[72px]
 w-[62px]
 shrink-0

 overflow-hidden

 rounded-[11px]

 bg-gray-100

 dark:bg-white/[0.06]
 "
 @click="openEdit(product)"
 >
 <img
 v-if="
 productImage(product)
 "
 :src="
 productImage(product)
 "
 :alt="product.name"
 class="
 h-full
 w-full
 object-cover
 "
 >

 <span
 v-else
 class="
 flex
 h-full
 w-full
 items-center
 justify-center

 px-1

 text-center
 text-[11px]
 font-medium
 text-gray-400

 dark:text-gray-600
 "
 >
 No image
 </span>
 </button>

 <div
 class="
 min-w-0
 flex-1
 "
 >
 <div
 class="
 flex
 items-start
 justify-between
 gap-2
 "
 >
 <button
 type="button"
 class="
 min-w-0
 text-left
 "
 @click="
 openEdit(product)
 "
 >
 <h2
 class="
 truncate

 text-[12px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 {{ product.name }}
 </h2>

 <p
 class="
 mt-0.5
 truncate

 text-[12px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ product.slug }}
 </p>
 </button>

 <AppActionMenu>
 <template #default="{ close }">
 <AppActionMenuItem
 @click="openEdit(product); close()"
 >
 Edit product
 </AppActionMenuItem>

 <AppActionMenuItem
 @click="openVariants(product); close()"
 >
 Manage variants
 </AppActionMenuItem>

 <AppActionMenuItem
 @click="printProductTags(product); close()"
 >
 {{
 printingProductId === product.id
 ? 'Preparing tags…'
 : 'Print tags'
 }}
 </AppActionMenuItem>

 <AppActionMenuItem
 @click="printProductCards(product); close()"
 >
 {{
 printingCardProductId === product.id
 ? 'Preparing cards…'
 : 'Print packaging cards'
 }}
 </AppActionMenuItem>

 <AppActionMenuItem
 danger
 @click="askDelete(product); close()"
 >
 Delete product
 </AppActionMenuItem>
 </template>
 </AppActionMenu>
 </div>

 <p
 class="
 mt-2

 truncate

 text-[11px]
 text-gray-500

 dark:text-gray-500
 "
 >
 {{
 product.brand?.name
 || 'No brand'
 }}
 ·
 {{
 primaryCategory(product)
 }}
 </p>

 <!-- Status line -->
 <div
 class="
 mt-2.5

 flex
 flex-wrap
 items-center
 gap-x-3
 gap-y-1.5
 "
 >
 <span
 class="
 flex
 items-center
 gap-1.5

 text-[12px]
 font-medium
 text-gray-500

 dark:text-gray-500
 "
 >
 <span
 class="
 h-1.5
 w-1.5
 rounded-full
 "
 :class="
 product.is_active
 ? 'bg-emerald-500'
 : 'bg-gray-300 dark:bg-gray-700'
 "
 />

 {{
 product.is_active
 ? 'Active'
 : 'Inactive'
 }}
 </span>

 <span
 class="
 text-[12px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{
 imageCount(product)
 }}
 images
 </span>

 <span
 class="
 flex
 items-center
 gap-1.5

 text-[12px]
 text-gray-500

 dark:text-gray-500
 "
 >
 <span
 class="
 h-1.5
 w-1.5
 rounded-full
 "
 :class="{
 'bg-emerald-500':
 publishLabel(product)
 === 'Published',

 'bg-amber-500':
 publishLabel(product)
 === 'Scheduled',

 'bg-gray-300 dark:bg-gray-700':
 publishLabel(product)
 === 'Draft',
 }"
 />

 {{
 publishLabel(product)
 }}
 </span>

 <span
 v-if="
 product.is_featured
 "
 class="
 text-[12px]
 font-medium
 text-blue-600

 dark:text-blue-400
 "
 >
 Featured
 </span>
 </div>
 </div>
 </div>
 </article>
 </div>

 <!-- Pagination -->
 <section
 class="
 flex
 flex-col
 gap-3

 rounded-[16px]

 bg-white

 px-3.5
 py-3

 shadow-[0_1px_2px_rgba(17,24,39,0.025)]

 dark:bg-[#111214]
 dark:shadow-none

 sm:flex-row
 sm:items-center
 sm:justify-between
 "
 >
 <p
 class="
 text-[12px]
 text-gray-400

 dark:text-gray-600
 "
 >
 Showing

 <span
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ meta?.from ?? 0 }}
 </span>

 –

 <span
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ meta?.to ?? 0 }}
 </span>

 of

 <span
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ meta?.total ?? 0 }}
 </span>
 </p>

 <div
 class="
 flex
 items-center
 gap-1
 "
 >
 <button
 type="button"
 aria-label="Previous page"
 class="
 flex
 h-8
 w-8
 items-center
 justify-center

 rounded-[8px]

 text-gray-400

 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-800

 active:scale-95

 disabled:pointer-events-none
 disabled:opacity-30

 dark:text-gray-600
 dark:hover:bg-white/[0.07]
 dark:hover:text-white
 "
 :disabled="
 !canGoPrevious
 "
 @click="previousPage"
 >
 <svg
 class="h-4 w-4"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M12 5L7 10L12 15"
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </button>

 <span
 class="
 min-w-[80px]

 px-2

 text-center
 text-[11px]
 font-medium
 text-gray-500

 dark:text-gray-500
 "
 >
 {{
 meta?.current_page
 ?? page
 }}
 /
 {{
 meta?.last_page
 ?? 1
 }}
 </span>

 <button
 type="button"
 aria-label="Next page"
 class="
 flex
 h-8
 w-8
 items-center
 justify-center

 rounded-[8px]

 text-gray-400

 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-800

 active:scale-95

 disabled:pointer-events-none
 disabled:opacity-30

 dark:text-gray-600
 dark:hover:bg-white/[0.07]
 dark:hover:text-white
 "
 :disabled="
 !canGoNext
 "
 @click="nextPage"
 >
 <svg
 class="h-4 w-4"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M8 5L13 10L8 15"
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </button>
 </div>
 </section>
 </template>
 </div>

 <!-- Existing product form -->
 <ProductFormModal
 :open="formOpen"
 :mode="formMode"
 :product="selectedProduct"
 :brands="brands"
 :categories="categories"
 @close="formOpen = false"
 @saved="afterSaved"
 @changed="afterProductChanged"
 />

 <!-- Existing delete -->
 <AppConfirmModal
 :open="deleteOpen"
 title="Delete product?"
 :message="`
 This will delete “${
 productToDelete?.name
 || 'this product'
 }”.
 Product variants and inventory
 links may also be affected later.
 `"
 confirm-label="Delete product"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="confirmDelete"
 />

 <!-- Existing variants -->
 <ProductVariantsPanel
 v-if="variantsPanelProduct"
 :open="variantsPanelOpen"
 :product-id="
 variantsPanelProduct.id
 "
 :product-name="
 variantsPanelProduct.name
 "
 :brand-name="
 variantsPanelProduct.brand?.name
 "
 :brand-logo-url="
 variantsPanelProduct.brand?.logo_url
 "
 :card-description="
 variantsPanelProduct.card_description
 "
 @close="
 variantsPanelOpen = false
 "
 @changed="refresh()"
 />
 </section>
</template>
