<script setup lang="ts">
definePageMeta({
 middleware: 'auth',
 layout: 'admin',
})

type Brand = {
 id: number
 name: string
 slug: string
 description: string | null
 logo_url: string | null
 logo_public_id: string | null
 banner_image_url: string | null
 banner_image_public_id: string | null
 meta_title: string | null
 meta_description: string | null
 is_active: boolean
 sort_order: number
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

type BrandIndexResponse = {
 data: Brand[]
 meta: PaginationMeta
}

const { $api } = useNuxtApp()

const search = ref('')
const debouncedSearch = ref('')
const activeFilter = ref('all')
const sortBy = ref('sort_order')
const perPage = ref(20)
const page = ref(1)

const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const selectedBrand = ref<Brand | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const brandToDelete = ref<Brand | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const activeOptions = [
 { label: 'All statuses', value: 'all' },
 { label: 'Active', value: 'active' },
 { label: 'Inactive', value: 'inactive' },
]

const sortOptions = [
 { label: 'Sort order', value: 'sort_order' },
 { label: 'Name A-Z', value: 'name' },
 { label: 'Latest first', value: 'latest' },
]

watch(search, (value) => {
 if (searchTimer) clearTimeout(searchTimer)

 searchTimer = setTimeout(() => {
 page.value = 1
 debouncedSearch.value = value.trim()
 }, 300)
})

watch([activeFilter, sortBy, perPage], () => {
 page.value = 1
})

function buildQuery() {
 const query: Record<string, string | number> = {
 page: page.value,
 per_page: perPage.value,
 sort_by: sortBy.value,
 }

 if (debouncedSearch.value) {
 query.search = debouncedSearch.value
 }

 if (activeFilter.value !== 'all') {
 query.is_active = activeFilter.value === 'active' ? 1 : 0
 }

 return query
}

const {
 data,
 pending,
 error,
 refresh,
} = useAsyncData(
 'admin-brands',
 () => $api<BrandIndexResponse>('/admin/brands', {
 query: buildQuery(),
 }),
 {
 watch: [
 debouncedSearch,
 activeFilter,
 sortBy,
 perPage,
 page,
 ],
 immediate: true,
 },
)

const brands = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)

const isInitialLoading = computed(() => pending.value && !data.value)
const isRefreshing = computed(() => pending.value && Boolean(data.value))

const hasActiveFilters = computed(() => {
 return Boolean(
 search.value ||
 activeFilter.value !== 'all' ||
 sortBy.value !== 'sort_order',
 )
})

const activeBrands = computed(() => brands.value.filter((item) => item.is_active).length)

const canGoPrevious = computed(() => page.value > 1)

const canGoNext = computed(() => {
 if (!meta.value) return false

 return page.value < meta.value.last_page
})

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) clearTimeout(noticeTimer.value)

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

function openCreate() {
 selectedBrand.value = null
 formMode.value = 'create'
 formOpen.value = true
}

function openEdit(brand: Brand) {
 selectedBrand.value = brand
 formMode.value = 'edit'
 formOpen.value = true
}

async function afterSaved() {
 formOpen.value = false

 await refresh()

 showNotice(
 formMode.value === 'create'
 ? 'Brand created successfully.'
 : 'Brand updated successfully.',
 )
}

function askDelete(brand: Brand) {
 brandToDelete.value = brand
 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDelete() {
 if (!brandToDelete.value) return

 deleting.value = true
 deleteError.value = ''

 try {
 await $api(`/admin/brands/${brandToDelete.value.id}`, {
 method: 'DELETE',
 })

 deleteOpen.value = false
 showNotice('Brand deleted successfully.')

 await refresh()
 } catch (error: any) {
 deleteError.value = extractApiErrorMessage(error, 'Could not delete brand.')
 } finally {
 deleting.value = false
 }
}

function clearFilters() {
 search.value = ''
 debouncedSearch.value = ''
 activeFilter.value = 'all'
 sortBy.value = 'sort_order'
 page.value = 1
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
 <section class="mx-auto max-w-[1600px]">
 <BrandsSkeleton v-if="isInitialLoading" />

 <div
 v-else
 class="relative space-y-4 sm:space-y-5"
 >
 <div
 v-if="isRefreshing"
 class="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-[#f4f5f7]/40 backdrop-blur-[1px] dark:bg-[#09090b]/30"
 />

 <AppPageHeader
 eyebrow="Catalog"
 title="Brands"
 description="Manage product brands, logos, banners and SEO information for the storefront catalog."
 >
 <template #actions>
 <AppButton
 variant="secondary"
 :loading="pending"
 @click="refresh"
 >
 {{ pending ? 'Refreshing...' : 'Refresh' }}
 </AppButton>

 <AppButton @click="openCreate">
 Add brand
 </AppButton>
 </template>
 </AppPageHeader>

 <div
 v-if="notice"
 class="rounded-[12px] bg-emerald-500/[0.07] p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
 >
 {{ notice }}
 </div>

 <AppCard class="p-4">
 <div class="grid gap-4">
 <div class="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
 <AppInput
 v-model="search"
 placeholder="Search brands by name or slug..."
 />

 <AppButton
 v-if="hasActiveFilters"
 variant="ghost"
 size="sm"
 @click="clearFilters"
 >
 Clear filters
 </AppButton>
 </div>

 <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
 <AppSelect
 v-model="activeFilter"
 label="Status"
 :options="activeOptions"
 />

 <AppSelect
 v-model="sortBy"
 label="Sort"
 :options="sortOptions"
 />

 <AppSelect
 v-model="perPage"
 label="Per page"
 :options="[
 { label: '12 per page', value: 12 },
 { label: '20 per page', value: 20 },
 { label: '50 per page', value: 50 },
 ]"
 />
 </div>

 <div class="flex flex-wrap items-center gap-2 shadow-[0_-1px_0_rgba(17,24,39,0.05)] pt-4 ">
 <AppBadge variant="neutral">
 {{ brands.length }} shown
 </AppBadge>

 <AppBadge variant="neutral">
 {{ meta?.total ?? 0 }} total
 </AppBadge>

 <AppBadge variant="green">
 {{ activeBrands }} active
 </AppBadge>

 <AppBadge
 v-if="hasActiveFilters"
 variant="blue"
 >
 Filters active
 </AppBadge>
 </div>
 </div>
 </AppCard>

 <AppErrorState
 v-if="error"
 title="Brands could not be loaded"
 message="Please check backend API, authentication token, or route permissions."
 @retry="refresh"
 />

 <AppEmptyState
 v-else-if="brands.length === 0"
 title="No brands found"
 message="Create your first brand or clear filters."
 >
 <template #actions>
 <div class="flex flex-col gap-2 sm:flex-row">
 <AppButton
 variant="secondary"
 @click="clearFilters"
 >
 Clear filters
 </AppButton>

 <AppButton @click="openCreate">
 Add brand
 </AppButton>
 </div>
 </template>
 </AppEmptyState>

 <template v-else>
 <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
 <AppCard
 v-for="brand in brands"
 :key="brand.id"
 class="group isolate overflow-visible"
 >
 <div class="relative z-0 h-32 overflow-hidden rounded-t-[18px] bg-gray-100 dark:bg-white/[0.055]">
 <img
 v-if="brand.banner_image_url"
 :src="brand.banner_image_url"
 :alt="brand.name"
 class="h-full w-full object-cover"
 >

 <div
 v-else
 class="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/10"
 >
 <span class="text-sm font-semibold text-gray-400">
 No banner
 </span>
 </div>

 <div class="absolute right-3 top-3">
 <AppBadge :variant="brand.is_active ? 'green' : 'red'">
 {{ brand.is_active ? 'Active' : 'Inactive' }}
 </AppBadge>
 </div>
 </div>

 <div class="relative z-10 p-5">
 <div class="flex items-start gap-4">
 <div class="relative z-20 -mt-9 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white shadow-[0_1px_4px_rgba(17,24,39,0.09)] dark:bg-[#17181b] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
 <img
 v-if="brand.logo_url"
 :src="brand.logo_url"
 :alt="brand.name"
 class="h-full w-full object-cover"
 >

 <span
 v-else
 class="text-xl font-semibold text-gray-500 dark:text-gray-300"
 >
 {{ brand.name.slice(0, 1).toUpperCase() }}
 </span>
 </div>

 <button
 type="button"
 class="min-w-0 flex-1 text-left"
 @click="openEdit(brand)"
 >
 <h2 class="truncate text-base font-semibold text-gray-950 dark:text-white">
 {{ brand.name }}
 </h2>

 <p class="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
 {{ brand.slug }}
 </p>
 </button>

 <AppActionMenu>
 <template #default="{ close }">
 <AppActionMenuItem
 @click="openEdit(brand); close()"
 >
 Edit brand
 </AppActionMenuItem>

 <AppActionMenuItem
 danger
 @click="askDelete(brand); close()"
 >
 Delete brand
 </AppActionMenuItem>
 </template>
 </AppActionMenu>
 </div>

 <p
 v-if="brand.description"
 class="mt-4 line-clamp-2 text-sm leading-6 text-gray-500 dark:text-gray-400"
 >
 {{ brand.description }}
 </p>

 <p
 v-else
 class="mt-4 text-sm leading-6 text-gray-400 dark:text-gray-500"
 >
 No description added.
 </p>

 <div class="mt-5 flex flex-wrap gap-2">
 <AppBadge variant="neutral">
 Sort {{ brand.sort_order }}
 </AppBadge>

 <AppBadge
 v-if="brand.logo_url"
 variant="blue"
 >
 Logo
 </AppBadge>

 <AppBadge
 v-if="brand.banner_image_url"
 variant="blue"
 >
 Banner
 </AppBadge>
 </div>
 </div>
 </AppCard>
 </div>

 <AppCard class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
 <p class="text-[12px] text-gray-500 dark:text-gray-500">
 Showing
 <span class="font-medium text-gray-900 dark:text-white">{{ meta?.from ?? 0 }}</span>
 to
 <span class="font-medium text-gray-900 dark:text-white">{{ meta?.to ?? 0 }}</span>
 of
 <span class="font-medium text-gray-900 dark:text-white">{{ meta?.total ?? 0 }}</span>
 brands
 </p>

 <div class="flex flex-wrap items-center gap-2">
 <AppButton
 variant="secondary"
 size="sm"
 :disabled="!canGoPrevious"
 @click="previousPage"
 >
 Previous
 </AppButton>

 <span class="rounded-[9px] bg-gray-950/[0.04] px-3 py-2 text-[12px] font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
 Page {{ meta?.current_page ?? page }} / {{ meta?.last_page ?? 1 }}
 </span>

 <AppButton
 variant="secondary"
 size="sm"
 :disabled="!canGoNext"
 @click="nextPage"
 >
 Next
 </AppButton>
 </div>
 </AppCard>
 </template>
 </div>

 <BrandFormModal
 :open="formOpen"
 :mode="formMode"
 :brand="selectedBrand"
 @close="formOpen = false"
 @saved="afterSaved"
 />

 <AppConfirmModal
 :open="deleteOpen"
 title="Delete brand?"
 :message="`This will delete “${brandToDelete?.name || 'this brand'}”. Brands with products cannot be deleted until products are moved or deleted.`"
 confirm-label="Delete brand"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="confirmDelete"
 />
 </section>
</template>