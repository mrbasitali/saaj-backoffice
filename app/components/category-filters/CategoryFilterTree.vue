<script setup lang="ts">
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

const props = defineProps<{
 categories: Category[]
 selectedId: number | null
}>()

const emit = defineEmits<{
 select: [category: Category]
}>()

const search = ref('')
const expandedIds = ref<number[]>([])

const filteredCategories = computed(() => {
 const query = search.value.trim().toLowerCase()

 if (!query) return props.categories

 return filterTree(props.categories, query)
})

watch(
 () => props.categories,
 (items) => {
 expandedIds.value = flattenCategories(items)
 .filter((item) => item.children?.length)
 .map((item) => item.id)
 },
 { immediate: true },
)

watch(search, () => {
 if (!search.value.trim()) return

 expandedIds.value = flattenCategories(filteredCategories.value)
 .filter((item) => item.children?.length)
 .map((item) => item.id)
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

function filterTree(items: Category[], query: string): Category[] {
 return items
 .map((item) => {
 const children = filterTree(item.children ?? [], query)

 const match = [
 item.name,
 item.slug,
 item.full_slug,
 ].join(' ').toLowerCase().includes(query)

 if (match || children.length) {
 return {
 ...item,
 children,
 }
 }

 return null
 })
 .filter(Boolean) as Category[]
}

function isExpanded(category: Category) {
 return expandedIds.value.includes(category.id)
}

function toggle(category: Category) {
 if (isExpanded(category)) {
 expandedIds.value = expandedIds.value.filter((id) => id !== category.id)
 return
 }

 expandedIds.value = [...expandedIds.value, category.id]
}

function expandAll() {
 expandedIds.value = flattenCategories(filteredCategories.value)
 .filter((item) => item.children?.length)
 .map((item) => item.id)
}

function collapseAll() {
 expandedIds.value = []
}
</script>

<template>
 <AppCard class="overflow-hidden">
 <header class="shadow-[0_1px_0_rgba(17,24,39,0.05)] p-5 ">
 <div class="flex items-start justify-between gap-3">
 <div>
 <h2 class="text-base font-semibold text-gray-950 dark:text-white">
 Categories
 </h2>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Select a category to manage its filters.
 </p>
 </div>

 <AppBadge variant="neutral">
 {{ categories.length }} root
 </AppBadge>
 </div>

 <AppInput
 v-model="search"
 class="mt-4"
 placeholder="Search categories..."
 />

 <div class="mt-3 flex gap-2">
 <AppButton
 size="sm"
 variant="secondary"
 @click="expandAll"
 >
 Expand
 </AppButton>

 <AppButton
 size="sm"
 variant="secondary"
 @click="collapseAll"
 >
 Collapse
 </AppButton>
 </div>
 </header>

 <div class="p-3">
 <AppEmptyState
 v-if="filteredCategories.length === 0"
 title="No categories found"
 message="Try another search keyword."
 />

 <div
 v-else
 class="space-y-1"
 >
 <CategoryFilterTreeItem
 v-for="category in filteredCategories"
 :key="category.id"
 :category="category"
 :selected-id="selectedId"
 :expanded-ids="expandedIds"
 :level="0"
 @select="emit('select', $event)"
 @toggle="toggle"
 />
 </div>
 </div>
 </AppCard>
</template>