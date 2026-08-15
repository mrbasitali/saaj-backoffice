<script setup lang="ts">
type AttributeValue = {
 id: number
 value: string
 slug: string
 color_code: string | null
 is_active: boolean
 sort_order: number
}

type CategoryConfig = {
 is_required: boolean
 is_filterable: boolean
 use_for_variant: boolean
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
 category_config?: CategoryConfig
}

type Category = {
 id: number
 name: string
 full_slug: string
}

type AssignedFilter = {
 attribute_id: number
 attribute: ProductAttribute
 is_required: boolean
 is_filterable: boolean
 use_for_variant: boolean
 sort_order: number
}

type AssignedResponse = {
 data: ProductAttribute[]
 message?: string
}

type ToggleKey = 'is_required' | 'is_filterable' | 'use_for_variant'

const props = defineProps<{
 category: Category | null
 attributes: ProductAttribute[]
}>()

const emit = defineEmits<{
 saved: []
}>()

const { $api } = useNuxtApp()

const assigned = ref<AssignedFilter[]>([])
const pending = ref(false)
const saving = ref(false)
const error = ref('')
const saveError = ref('')
const notice = ref('')
const originalSnapshot = ref(JSON.stringify([]))
const snapshotReady = ref(false)

const assignOpen = ref(false)

const draggingId = ref<number | null>(null)
const dragOverId = ref<number | null>(null)

const assignedAttributeIds = computed(() => {
 return assigned.value.map((item) => item.attribute_id)
})

const filterableCount = computed(() => {
 return assigned.value.filter((item) => item.is_filterable).length
})

const variantCount = computed(() => {
 return assigned.value.filter((item) => item.use_for_variant).length
})

const requiredCount = computed(() => {
 return assigned.value.filter((item) => item.is_required).length
})

const hasChanges = computed(() => {
 if (!snapshotReady.value) return false

 return JSON.stringify(normalizedPayload()) !== originalSnapshot.value
})

watch(
 () => props.category?.id,
 () => {
 fetchAssigned()
 },
 { immediate: true },
)

function valueCount(attribute: ProductAttribute) {
 return attribute.values_count ?? attribute.values?.length ?? 0
}

function typeLabel(type: string) {
 return {
 select: 'Select',
 color: 'Color',
 text: 'Text',
 number: 'Number',
 boolean: 'Boolean',
 }[type] || type
}

function typeBadgeVariant(type: string): 'neutral' | 'blue' | 'amber' {
 if (type === 'color') return 'blue'
 if (type === 'boolean') return 'amber'

 return 'neutral'
}

function toAssignedFilter(attribute: ProductAttribute, fallbackIndex = 0): AssignedFilter {
 const config = attribute.category_config

 return {
 attribute_id: attribute.id,
 attribute,
 is_required: Boolean(config?.is_required ?? attribute.is_required ?? false),
 is_filterable: Boolean(config?.is_filterable ?? attribute.is_filterable ?? true),
 use_for_variant: Boolean(config?.use_for_variant ?? attribute.is_variant ?? false),
 sort_order: Number(config?.sort_order ?? fallbackIndex),
 }
}

function reindex(items: AssignedFilter[]) {
 return items.map((item, index) => ({
 ...item,
 sort_order: index,
 }))
}

function normalizedPayload() {
 return assigned.value.map((item, index) => ({
 attribute_id: item.attribute_id,
 is_required: Boolean(item.is_required),
 is_filterable: Boolean(item.is_filterable),
 use_for_variant: Boolean(item.use_for_variant),
 sort_order: index,
 }))
}

function syncSnapshot() {
 originalSnapshot.value = JSON.stringify(normalizedPayload())
 snapshotReady.value = true
}

async function fetchAssigned() {
 assigned.value = []
 error.value = ''
 saveError.value = ''
 notice.value = ''
 snapshotReady.value = false
 originalSnapshot.value = JSON.stringify([])

 if (!props.category) {
 snapshotReady.value = true
 return
 }

 pending.value = true

 try {
 const response = await $api<AssignedResponse>(`/admin/categories/${props.category.id}/attributes`)

 assigned.value = reindex(
 (response.data ?? [])
 .map((attribute, index) => toAssignedFilter(attribute, index))
 .sort((a, b) => {
 if (a.sort_order === b.sort_order) {
 return a.attribute.name.localeCompare(b.attribute.name)
 }

 return a.sort_order - b.sort_order
 }),
 )

 syncSnapshot()
 } catch (err: any) {
 error.value = err?.data?.message || 'Could not load category filters.'
 } finally {
 pending.value = false
 }
}

function openAssign() {
 saveError.value = ''
 notice.value = ''
 assignOpen.value = true
}

function addAttributes(attributes: ProductAttribute[]) {
 const existingIds = assigned.value.map((item) => item.attribute_id)

 const additions = attributes
 .filter((attribute) => !existingIds.includes(attribute.id))
 .map((attribute, index) => {
 return {
 attribute_id: attribute.id,
 attribute,
 is_required: Boolean(attribute.is_required ?? false),
 is_filterable: Boolean(attribute.is_filterable ?? true),
 use_for_variant: Boolean(attribute.is_variant ?? false),
 sort_order: assigned.value.length + index,
 }
 })

 assigned.value = reindex([...assigned.value, ...additions])
 assignOpen.value = false
 notice.value = ''
}

function removeFilter(item: AssignedFilter) {
 assigned.value = reindex(
 assigned.value.filter((filter) => filter.attribute_id !== item.attribute_id),
 )

 notice.value = ''
}

function toggleFlag(item: AssignedFilter, key: ToggleKey) {
 item[key] = !item[key]
 notice.value = ''
}

function onDragStart(event: DragEvent, item: AssignedFilter) {
 if (saving.value) return

 draggingId.value = item.attribute_id
 dragOverId.value = item.attribute_id

 event.dataTransfer?.setData('text/plain', String(item.attribute_id))

 if (event.dataTransfer) {
 event.dataTransfer.effectAllowed = 'move'
 }
}

function onDragEnter(item: AssignedFilter) {
 if (!draggingId.value || draggingId.value === item.attribute_id) return

 dragOverId.value = item.attribute_id
}

function onDragEnd() {
 draggingId.value = null
 dragOverId.value = null
}

function onDrop(event: DragEvent, targetItem: AssignedFilter) {
 event.preventDefault()

 const draggedAttributeId = Number(event.dataTransfer?.getData('text/plain') || draggingId.value)

 draggingId.value = null
 dragOverId.value = null

 if (!draggedAttributeId || draggedAttributeId === targetItem.attribute_id) return

 const current = [...assigned.value]
 const fromIndex = current.findIndex((item) => item.attribute_id === draggedAttributeId)
 const toIndex = current.findIndex((item) => item.attribute_id === targetItem.attribute_id)

 if (fromIndex < 0 || toIndex < 0) return

 const [moved] = current.splice(fromIndex, 1)
 current.splice(toIndex, 0, moved)

 assigned.value = reindex(current)
 notice.value = ''
}

async function saveChanges() {
 if (!props.category) return

 saving.value = true
 saveError.value = ''
 notice.value = ''

 try {
 const response = await $api<AssignedResponse>(`/admin/categories/${props.category.id}/attributes`, {
 method: 'PUT',
 body: {
 attributes: normalizedPayload(),
 },
 })

 assigned.value = reindex(
 (response.data ?? [])
 .map((attribute, index) => toAssignedFilter(attribute, index))
 .sort((a, b) => {
 if (a.sort_order === b.sort_order) {
 return a.attribute.name.localeCompare(b.attribute.name)
 }

 return a.sort_order - b.sort_order
 }),
 )

 syncSnapshot()

 notice.value = response.message || 'Category filters saved successfully.'
 emit('saved')
 } catch (err: any) {
 const errors = err?.data?.errors

 if (errors) {
 const firstError = Object.values(errors)[0]
 saveError.value = Array.isArray(firstError)
 ? String(firstError[0])
 : String(firstError)
 } else {
 saveError.value = err?.data?.message || 'Could not save category filters.'
 }
 } finally {
 saving.value = false
 }
}

function resetChanges() {
 fetchAssigned()
}
</script>

<template>
 <AppCard class="overflow-visible">
 <div
 v-if="!category"
 class="p-6"
 >
 <AppEmptyState
 title="Select a category"
 message="Choose a category from the tree to assign filters and variant attributes."
 />
 </div>

 <template v-else>
 <header class="shadow-[0_1px_0_rgba(17,24,39,0.05)] p-5 ">
 <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
 <div class="min-w-0">
 <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
 Category filters
 </p>

 <h2 class="mt-1 truncate text-xl font-semibold text-gray-950 dark:text-white">
 {{ category.name }}
 </h2>

 <p class="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
 {{ category.full_slug }}
 </p>

 <div class="mt-4 flex flex-wrap gap-2">
 <AppBadge variant="blue">
 {{ assigned.length }} assigned
 </AppBadge>

 <AppBadge variant="neutral">
 {{ filterableCount }} filterable
 </AppBadge>

 <AppBadge variant="neutral">
 {{ variantCount }} variant
 </AppBadge>

 <AppBadge variant="neutral">
 {{ requiredCount }} required
 </AppBadge>

 <AppBadge
 v-if="hasChanges"
 variant="amber"
 >
 Unsaved changes
 </AppBadge>
 </div>
 </div>

 <div class="flex flex-col gap-2 sm:flex-row lg:shrink-0">
 <AppButton
 variant="secondary"
 :disabled="pending || saving"
 @click="openAssign"
 >
 Add attributes
 </AppButton>
 </div>
 </div>
 </header>

 <div
 v-if="hasChanges"
 class="bg-amber-500/[0.07] px-4 py-3 dark:bg-amber-500/10 sm:px-5"
 >
 <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div class="flex min-w-0 items-start gap-3">
 <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
 !
 </span>

 <div class="min-w-0">
 <p class="text-sm font-semibold text-amber-800 dark:text-amber-200">
 Unsaved changes
 </p>

 <p class="mt-0.5 text-sm text-amber-700 dark:text-amber-300">
 Click Save changes to update this category.
 </p>
 </div>
 </div>

 <div class="flex shrink-0 gap-2">
 <AppButton
 variant="secondary"
 size="sm"
 :disabled="saving || pending"
 @click="resetChanges"
 >
 Discard
 </AppButton>

 <AppButton
 size="sm"
 :loading="saving"
 :disabled="saving || pending"
 @click="saveChanges"
 >
 Save changes
 </AppButton>
 </div>
 </div>
 </div>

 <div class="p-5">
 <div
 v-if="notice"
 class="mb-4 rounded-[12px] bg-emerald-500/[0.07] p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
 >
 {{ notice }}
 </div>

 <div
 v-if="saveError"
 class="mb-4 rounded-[12px] bg-red-500/[0.07] p-4 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
 >
 {{ saveError }}
 </div>

 <div
 v-if="pending"
 class="space-y-3"
 >
 <AppSkeleton
 v-for="item in 6"
 :key="item"
 class-name="h-20"
 />
 </div>

 <AppErrorState
 v-else-if="error"
 title="Filters could not be loaded"
 :message="error"
 @retry="fetchAssigned"
 />

 <AppEmptyState
 v-else-if="assigned.length === 0"
 title="No filters assigned"
 message="Assign attributes like Size, Color or Fabric to control filters and variants for this category."
 >
 <template #actions>
 <AppButton @click="openAssign">
 Assign attributes
 </AppButton>
 </template>
 </AppEmptyState>

 <TransitionGroup
 v-else
 name="filter-list"
 tag="div"
 class="relative space-y-3"
 >
 <div
 v-for="item in assigned"
 :key="item.attribute_id"
 class="rounded-[12px] bg-gray-950/[0.025] p-4 transition dark:bg-white/[0.035]"
 :class="[
 draggingId === item.attribute_id
 ? 'scale-[0.99] opacity-40'
 : '',
 dragOverId === item.attribute_id && draggingId !== item.attribute_id
 ? 'bg-gray-950/[0.055] ring-2 ring-gray-950/10 dark:bg-white/[0.075] dark:ring-white/10'
 : 'hover:bg-gray-950/[0.04] dark:hover:bg-white/[0.055]',
 ]"
 @dragenter.prevent="onDragEnter(item)"
 @dragover.prevent
 @drop.prevent="onDrop($event, item)"
 >
 <div class="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
 <div class="flex min-w-0 gap-3">
 <button
 type="button"
 class="flex h-10 w-9 shrink-0 cursor-grab items-center justify-center rounded-xl text-gray-300 transition hover:bg-gray-100 hover:text-gray-500 active:cursor-grabbing dark:hover:bg-white/10"
 title="Drag to reorder"
 :draggable="!saving"
 @dragstart="onDragStart($event, item)"
 @dragend="onDragEnd"
 >
 ⋮⋮
 </button>

 <div class="min-w-0">
 <div class="flex flex-wrap items-center gap-2">
 <h3 class="truncate font-semibold text-gray-950 dark:text-white">
 {{ item.attribute.name }}
 </h3>

 <AppBadge :variant="typeBadgeVariant(item.attribute.type)">
 {{ typeLabel(item.attribute.type) }}
 </AppBadge>

 <AppBadge :variant="item.attribute.is_active ? 'green' : 'red'">
 {{ item.attribute.is_active ? 'Active' : 'Inactive' }}
 </AppBadge>
 </div>

 <p class="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
 {{ item.attribute.code }} · {{ valueCount(item.attribute) }} values · Sort {{ item.sort_order }}
 </p>
 </div>
 </div>

 <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-[auto_auto_auto_auto] xl:items-center">
 <button
 type="button"
 class="rounded-[9px] px-3 py-2 text-[12px] font-medium transition active:scale-[0.98]"
 :class="item.is_filterable
 ? 'bg-blue-500/[0.09] text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
 : 'bg-gray-950/[0.04] text-gray-500 dark:bg-white/[0.06] dark:text-gray-400'"
 @click="toggleFlag(item, 'is_filterable')"
 >
 {{ item.is_filterable ? 'Filterable' : 'Not filterable' }}
 </button>

 <button
 type="button"
 class="rounded-[9px] px-3 py-2 text-[12px] font-medium transition active:scale-[0.98]"
 :class="item.use_for_variant
 ? 'bg-blue-500/[0.09] text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
 : 'bg-gray-950/[0.04] text-gray-500 dark:bg-white/[0.06] dark:text-gray-400'"
 @click="toggleFlag(item, 'use_for_variant')"
 >
 {{ item.use_for_variant ? 'Variant' : 'Not variant' }}
 </button>

 <button
 type="button"
 class="rounded-[9px] px-3 py-2 text-[12px] font-medium transition active:scale-[0.98]"
 :class="item.is_required
 ? 'bg-amber-500/[0.09] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
 : 'bg-gray-950/[0.04] text-gray-500 dark:bg-white/[0.06] dark:text-gray-400'"
 @click="toggleFlag(item, 'is_required')"
 >
 {{ item.is_required ? 'Required' : 'Optional' }}
 </button>

 <AppButton
 variant="ghost"
 size="sm"
 @click="removeFilter(item)"
 >
 Remove
 </AppButton>
 </div>
 </div>
 </div>
 </TransitionGroup>
 </div>
 </template>

 <CategoryFilterAssignModal
 :open="assignOpen"
 :category="category"
 :attributes="attributes"
 :assigned-attribute-ids="assignedAttributeIds"
 @close="assignOpen = false"
 @assign="addAttributes"
 />
 </AppCard>
</template>