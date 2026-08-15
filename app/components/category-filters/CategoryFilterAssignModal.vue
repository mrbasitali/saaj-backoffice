<script setup lang="ts">
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

type Category = {
 id: number
 name: string
 full_slug: string
}

const props = defineProps<{
 open: boolean
 category: Category | null
 attributes: ProductAttribute[]
 assignedAttributeIds: number[]
}>()

const emit = defineEmits<{
 close: []
 assign: [attributes: ProductAttribute[]]
}>()

const search = ref('')
const selectedIds = ref<number[]>([])
const formError = ref('')

const availableAttributes = computed(() => {
 const query = search.value.trim().toLowerCase()

 return props.attributes
 .filter((item) => item.is_active)
 .filter((item) => !props.assignedAttributeIds.includes(item.id))
 .filter((item) => {
 if (!query) return true

 return [
 item.name,
 item.code,
 item.type,
 ].join(' ').toLowerCase().includes(query)
 })
})

const selectedAttributes = computed(() => {
 return props.attributes.filter((item) => selectedIds.value.includes(item.id))
})

const submitLabel = computed(() => {
 if (selectedIds.value.length === 0) return 'Add to pending changes'

 return `Add ${selectedIds.value.length} attribute${selectedIds.value.length === 1 ? '' : 's'}`
})

watch(
 () => props.open,
 (open) => {
 if (!open) return

 search.value = ''
 selectedIds.value = []
 formError.value = ''
 },
)

function valueCount(attribute: ProductAttribute) {
 return attribute.values_count ?? attribute.values?.length ?? 0
}

function toggle(id: number) {
 formError.value = ''

 if (selectedIds.value.includes(id)) {
 selectedIds.value = selectedIds.value.filter((item) => item !== id)
 return
 }

 selectedIds.value = [...selectedIds.value, id]
}

function submit() {
 if (selectedAttributes.value.length === 0) {
 formError.value = 'Select at least one attribute to assign.'
 return
 }

 emit('assign', selectedAttributes.value)
}
</script>

<template>
 <AppModal
 :open="open"
 title="Assign attributes"
 :description="category ? `Choose filters and variant attributes for ${category.name}.` : ''"
 max-width="max-w-3xl"
 @close="emit('close')"
 >
 <form @submit.prevent="submit">
 <div class="px-4 py-5 sm:px-5">
 <AppInput
 v-model="search"
 placeholder="Search attributes..."
 />

 <div class="mt-5 space-y-2">
 <AppEmptyState
 v-if="availableAttributes.length === 0"
 title="No available attributes"
 message="All active attributes may already be assigned to this category."
 />

 <button
 v-for="attribute in availableAttributes"
 :key="attribute.id"
 type="button"
 class="flex w-full items-center justify-between gap-4 rounded-[12px] bg-gray-950/[0.025] p-3.5 text-left transition active:scale-[0.99] dark:bg-white/[0.035]"
 :class="selectedIds.includes(attribute.id)
 ? 'bg-gray-950/[0.055] ring-2 ring-gray-950/10 dark:bg-white/[0.075] dark:ring-white/10'
 : 'hover:bg-gray-950/[0.04] dark:hover:bg-white/[0.055]'"
 @click="toggle(attribute.id)"
 >
 <div class="min-w-0">
 <div class="flex flex-wrap items-center gap-2">
 <p class="font-semibold text-gray-950 dark:text-white">
 {{ attribute.name }}
 </p>

 <AppBadge variant="neutral">
 {{ attribute.type }}
 </AppBadge>

 <AppBadge
 v-if="attribute.is_variant"
 variant="blue"
 >
 Variant
 </AppBadge>

 <AppBadge
 v-if="attribute.is_filterable"
 variant="blue"
 >
 Filterable
 </AppBadge>

 <AppBadge
 v-if="attribute.is_required"
 variant="amber"
 >
 Required
 </AppBadge>
 </div>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ attribute.code }} · {{ valueCount(attribute) }} values
 </p>
 </div>

 <span
 class="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] text-[11px] font-bold transition"
 :class="selectedIds.includes(attribute.id)
 ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'
 : 'bg-gray-950/[0.06] text-transparent dark:bg-white/[0.08]'"
 >
 ✓
 </span>
 </button>
 </div>
 </div>

 <footer class="sticky bottom-0 z-10 bg-white/95 px-4 py-3 shadow-[0_-1px_0_rgba(17,24,39,0.055)] backdrop-blur-xl dark:bg-[#111214]/95 dark:shadow-[0_-1px_0_rgba(255,255,255,0.055)] sm:px-5">
 <div
 v-if="formError"
 class="mb-4 rounded-[12px] bg-red-500/[0.07] p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
 >
 {{ formError }}
 </div>

 <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
 <AppButton
 variant="secondary"
 @click="emit('close')"
 >
 Cancel
 </AppButton>

 <AppButton type="submit">
 {{ submitLabel }}
 </AppButton>
 </div>
 </footer>
 </form>
 </AppModal>
</template>