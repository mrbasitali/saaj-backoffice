<script setup lang="ts">
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

type FlatCategory = Category & {
 level: number
}

const props = defineProps<{
 categories: Category[]
 selectedIds: number[]
 primaryId: number | null
 error?: string
}>()

const emit = defineEmits<{
 'update:selectedIds': [ids: number[]]
 'update:primaryId': [id: number | null]
}>()

const search = ref('')

const flatCategories = computed(() => {
 return flattenCategories(
 props.categories,
 )
})

const filteredCategories = computed(() => {
 const query =
 search.value
 .trim()
 .toLowerCase()

 if (!query) {
 return flatCategories.value
 }

 return flatCategories.value.filter(
 (category) => {
 return [
 category.name,
 category.slug,
 category.full_slug,
 ]
 .join(' ')
 .toLowerCase()
 .includes(query)
 },
 )
})

function flattenCategories(
 items: Category[],
 level = 0,
 result: FlatCategory[] = [],
) {
 items.forEach((item) => {
 result.push({
 ...item,
 level,
 })

 if (item.children?.length) {
 flattenCategories(
 item.children,
 level + 1,
 result,
 )
 }
 })

 return result
}

function isSelected(
 category: Category,
) {
 return props.selectedIds.includes(
 category.id,
 )
}

function toggleCategory(
 category: Category,
) {
 if (isSelected(category)) {
 const nextIds =
 props.selectedIds.filter(
 (id) =>
 id !== category.id,
 )

 emit(
 'update:selectedIds',
 nextIds,
 )

 if (
 props.primaryId
 === category.id
 ) {
 emit(
 'update:primaryId',
 nextIds[0] ?? null,
 )
 }

 return
 }

 const nextIds = [
 ...props.selectedIds,
 category.id,
 ]

 emit(
 'update:selectedIds',
 nextIds,
 )

 if (!props.primaryId) {
 emit(
 'update:primaryId',
 category.id,
 )
 }
}

function setPrimary(
 category: Category,
) {
 if (!isSelected(category)) {
 emit(
 'update:selectedIds',
 [
 ...props.selectedIds,
 category.id,
 ],
 )
 }

 emit(
 'update:primaryId',
 category.id,
 )
}
</script>

<template>
 <div>
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
 Product categories
 </h3>

 <p
 class="
 mt-1

 text-[12px]
 text-gray-400

 dark:text-gray-500
 "
 >
 Select multiple categories and
 choose one primary category.
 </p>
 </div>

 <span
 class="
 text-[11px]
 font-medium
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ selectedIds.length }}
 selected
 </span>
 </div>

 <AppInput
 v-model="search"
 class="mt-4"
 placeholder="Search categories..."
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
 v-if="error"
 class="
 mt-3

 rounded-[10px]

 bg-red-500/[0.07]

 px-3
 py-2.5

 text-[12px]
 text-red-600

 dark:bg-red-500/10
 dark:text-red-400
 "
 >
 {{ error }}
 </div>

 <!-- No inner vertical scrollbar.
 AppModal owns scrolling. -->
 <div
 class="
 mt-3

 divide-y
 divide-gray-100

 dark:divide-white/[0.055]
 "
 >
 <div
 v-for="category in filteredCategories"
 :key="category.id"
 class="
 flex
 min-h-[48px]
 items-center
 gap-3

 rounded-[9px]

 px-2
 py-2

 transition

 hover:bg-gray-950/[0.025]

 dark:hover:bg-white/[0.035]
 "
 :style="{
 paddingLeft:
 `${
 8
 + Math.min(
 category.level,
 5,
 ) * 14
 }px`,
 }"
 >
 <!-- Multi-select checkbox -->
 <button
 type="button"
 class="
 flex
 h-[17px]
 w-[17px]
 shrink-0
 items-center
 justify-center

 rounded-[5px]

 ring-1

 transition
 "
 :class="
 isSelected(category)
 ? `
 bg-gray-950
 text-white
 ring-gray-950

 dark:bg-white
 dark:text-gray-950
 dark:ring-white
 `
 : `
 text-transparent
 ring-gray-300

 dark:ring-white/20
 `
 "
 @click="
 toggleCategory(category)
 "
 >
 <svg
 class="h-3 w-3"
 viewBox="0 0 16 16"
 fill="none"
 >
 <path
 d="
 M3.5 8.5
 L6.5 11.5
 L12.5 4.5
 "
 stroke="currentColor"
 stroke-width="2"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </button>

 <button
 type="button"
 class="
 min-w-0
 flex-1

 text-left
 "
 @click="
 toggleCategory(category)
 "
 >
 <p
 class="
 truncate

 text-[12px]
 font-medium
 text-gray-800

 dark:text-gray-200
 "
 >
 {{ category.name }}
 </p>

 <p
 class="
 mt-0.5
 truncate

 text-[12px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ category.full_slug }}
 </p>
 </button>

 <!-- Primary is a single choice,
 so NOT a checkbox. -->
 <button
 v-if="isSelected(category)"
 type="button"
 class="
 shrink-0

 rounded-[7px]

 px-2
 py-1

 text-[12px]
 font-medium

 transition
 "
 :class="
 primaryId === category.id
 ? `
 bg-gray-950/[0.07]
 text-gray-800

 dark:bg-white/[0.09]
 dark:text-gray-200
 `
 : `
 text-gray-400

 hover:bg-gray-950/[0.04]
 hover:text-gray-700

 dark:text-gray-600
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-300
 `
 "
 @click="
 setPrimary(category)
 "
 >
 {{
 primaryId === category.id
 ? 'Primary'
 : 'Make primary'
 }}
 </button>
 </div>

 <div
 v-if="
 filteredCategories.length
 === 0
 "
 class="
 py-10
 text-center
 "
 >
 <p
 class="
 text-[12px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 No categories found
 </p>

 <p
 class="
 mt-1

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 Try another search.
 </p>
 </div>
 </div>
 </div>
</template>