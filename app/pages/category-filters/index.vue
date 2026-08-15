<script setup lang="ts">
definePageMeta({
 middleware: 'auth',
 layout: 'admin',
})

type Category = {
 id: number
 parent_id: number | null
 name: string
 slug: string
 full_slug: string
 is_active: boolean
 show_in_menu: boolean
 depth: number
 children?: Category[] | null
}

type AttributeValue = {
 id: number
 value: string
 slug: string
 color_code: string | null
 is_active: boolean
 sort_order: number
}

type ProductAttribute = {
 id: number
 name: string
 code: string
 type: string
 is_filterable: boolean
 is_variant: boolean
 is_required: boolean
 is_active: boolean
 sort_order: number
 values_count?: number
 values?: AttributeValue[]
}

type CategoriesTreeResponse = {
 data: Category[]
}

type AttributesResponse = {
 data: ProductAttribute[]
}

const { $api } = useNuxtApp()

const selectedCategoryId = ref<number | null>(null)
const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const {
 data,
 pending,
 error,
 refresh,
} = useAsyncData(
 'category-filters-bootstrap',
 async () => {
 const [categoriesResponse, attributesResponse] = await Promise.all([
 $api<CategoriesTreeResponse>('/admin/categories/tree'),
 $api<AttributesResponse>('/admin/attributes', {
 query: {
 per_page: 100,
 include_values: 1,
 },
 }),
 ])

 return {
 categories: categoriesResponse.data ?? [],
 attributes: attributesResponse.data ?? [],
 }
 },
 {
 immediate: true,
 },
)

const categories = computed(() => data.value?.categories ?? [])
const attributes = computed(() => data.value?.attributes ?? [])

const flatCategories = computed(() => flattenCategories(categories.value))

const selectedCategory = computed(() => {
 return flatCategories.value.find((item) => item.id === selectedCategoryId.value) ?? null
})

const isInitialLoading = computed(() => pending.value && !data.value)
const isRefreshing = computed(() => pending.value && Boolean(data.value))

watch(
 flatCategories,
 (items) => {
 if (!items.length) {
 selectedCategoryId.value = null
 return
 }

 const selectedStillExists = items.some((item) => item.id === selectedCategoryId.value)

 if (!selectedStillExists) {
 selectedCategoryId.value = items[0].id
 }
 },
 { immediate: true },
)

function flattenCategories(items: Category[], result: Category[] = []) {
 items.forEach((item) => {
 result.push(item)

 if (item.children?.length) {
 flattenCategories(item.children, result)
 }
 })

 return result
}

function selectCategory(category: Category) {
 selectedCategoryId.value = category.id
}

function showNotice(message: string) {
 notice.value = message

 if (noticeTimer.value) {
 clearTimeout(noticeTimer.value)
 }

 noticeTimer.value = setTimeout(() => {
 notice.value = ''
 }, 3000)
}

function afterSaved() {
 showNotice('Category filters saved successfully.')
}
</script>

<template>
 <section class="mx-auto max-w-[1600px]">
 <CategoryFiltersSkeleton v-if="isInitialLoading" />

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
 title="Category Filters"
 description="Assign attributes to categories, control storefront filters, variant options and required product data."
 >
 <template #actions>
 <AppButton
 variant="secondary"
 :loading="pending"
 @click="refresh"
 >
 {{ pending ? 'Refreshing...' : 'Refresh' }}
 </AppButton>
 </template>
 </AppPageHeader>

 <div
 v-if="notice"
 class="rounded-[12px] bg-emerald-500/[0.07] p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
 >
 {{ notice }}
 </div>

 <AppErrorState
 v-if="error"
 title="Category filters could not be loaded"
 message="Please check backend API, authentication token, or route permissions."
 @retry="refresh"
 />

 <div
 v-else
 class="grid gap-4 xl:grid-cols-[420px_1fr]"
 >
 <CategoryFilterTree
 :categories="categories"
 :selected-id="selectedCategoryId"
 @select="selectCategory"
 />

 <CategoryFilterPanel
 :category="selectedCategory"
 :attributes="attributes"
 @saved="afterSaved"
 />
 </div>
 </div>
 </section>
</template>