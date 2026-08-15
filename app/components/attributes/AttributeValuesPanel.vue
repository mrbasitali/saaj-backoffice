<script setup lang="ts">
type ProductAttribute = {
 id: number
 name: string
 code: string
 type: string
 is_active: boolean
}

type AttributeValue = {
 id: number
 attribute_id: number
 value: string
 slug: string
 color_code: string | null
 is_active: boolean
 sort_order: number
}

type ValuesResponse = {
 data: AttributeValue[]
}

const props = defineProps<{
 attribute: ProductAttribute | null
 refreshKey?: number
}>()

const emit = defineEmits<{
 changed: []
}>()

const { $api } = useNuxtApp()

const values = ref<AttributeValue[]>([])
const pending = ref(false)
const error = ref('')
const orderError = ref('')
const savingOrder = ref(false)

const valueFormOpen = ref(false)
const valueFormMode =
 ref<'create' | 'edit'>('create')

const valueToEdit =
 ref<AttributeValue | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')

const valueToDelete =
 ref<AttributeValue | null>(null)

const draggingValueId =
 ref<number | null>(null)

const dragOverValueId =
 ref<number | null>(null)

const activeValues = computed(() => {
 return values.value.filter(
 (item) => item.is_active,
 ).length
})

watch(
 () => [
 props.attribute?.id,
 props.refreshKey,
 ] as const,
 () => {
 fetchValues()
 },
 {
 immediate: true,
 },
)

async function fetchValues() {
 values.value = []
 error.value = ''
 orderError.value = ''

 if (!props.attribute) {
 return
 }

 pending.value = true

 try {
 const response =
 await $api<ValuesResponse>(
 `/admin/attributes/${props.attribute.id}/values`,
 )

 values.value =
 (response.data ?? [])
 .sort((a, b) => {
 const sortA =
 Number(
 a.sort_order || 0,
 )

 const sortB =
 Number(
 b.sort_order || 0,
 )

 if (sortA === sortB) {
 return a.value.localeCompare(
 b.value,
 )
 }

 return sortA - sortB
 })
 } catch (err: any) {
 error.value =
 err?.data?.message ||
 'Could not load attribute values.'
 } finally {
 pending.value = false
 }
}

function openCreateValue() {
 valueToEdit.value = null

 valueFormMode.value =
 'create'

 valueFormOpen.value = true
}

function openEditValue(
 value: AttributeValue,
) {
 valueToEdit.value = value

 valueFormMode.value =
 'edit'

 valueFormOpen.value = true
}

async function afterValueSaved() {
 valueFormOpen.value = false

 await fetchValues()

 emit('changed')
}

function askDeleteValue(
 value: AttributeValue,
) {
 valueToDelete.value = value

 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDeleteValue() {
 if (!valueToDelete.value) {
 return
 }

 deleting.value = true
 deleteError.value = ''

 try {
 await $api(
 `/admin/attribute-values/${valueToDelete.value.id}`,
 {
 method: 'DELETE',
 },
 )

 deleteOpen.value = false

 await fetchValues()

 emit('changed')
 } catch (err: any) {
 deleteError.value =
 err?.data?.message ||
 'Could not delete value.'
 } finally {
 deleting.value = false
 }
}

function onDragStart(
 event: DragEvent,
 value: AttributeValue,
) {
 if (savingOrder.value) {
 return
 }

 draggingValueId.value =
 value.id

 dragOverValueId.value =
 value.id

 event.dataTransfer?.setData(
 'text/plain',
 String(value.id),
 )

 if (event.dataTransfer) {
 event.dataTransfer.effectAllowed =
 'move'
 }
}

function onDragEnter(
 value: AttributeValue,
) {
 if (
 !draggingValueId.value ||
 draggingValueId.value
 === value.id
 ) {
 return
 }

 dragOverValueId.value =
 value.id
}

function onDragEnd() {
 draggingValueId.value = null
 dragOverValueId.value = null
}

async function onDrop(
 event: DragEvent,
 targetValue: AttributeValue,
) {
 event.preventDefault()

 const draggedId =
 Number(
 event.dataTransfer
 ?.getData('text/plain') ||
 draggingValueId.value,
 )

 draggingValueId.value = null
 dragOverValueId.value = null

 if (
 !draggedId ||
 draggedId === targetValue.id
 ) {
 return
 }

 const current = [
 ...values.value,
 ]

 const fromIndex =
 current.findIndex(
 (item) =>
 item.id === draggedId,
 )

 const toIndex =
 current.findIndex(
 (item) =>
 item.id
 === targetValue.id,
 )

 if (
 fromIndex < 0 ||
 toIndex < 0
 ) {
 return
 }

 const [moved] =
 current.splice(
 fromIndex,
 1,
 )

 if (!moved) {
 return
 }

 current.splice(
 toIndex,
 0,
 moved,
 )

 values.value =
 current.map(
 (item, index) => ({
 ...item,
 sort_order: index,
 }),
 )

 await saveOrder()
}

async function saveOrder() {
 savingOrder.value = true
 orderError.value = ''

 try {
 await Promise.all(
 values.value.map(
 (item, index) => {
 return $api(
 `/admin/attribute-values/${item.id}`,
 {
 method: 'PATCH',

 body: {
 sort_order: index,
 },
 },
 )
 },
 ),
 )

 emit('changed')
 } catch (err: any) {
 orderError.value =
 err?.data?.message ||
 'Could not save value order. Please try again.'

 await fetchValues()
 } finally {
 savingOrder.value = false
 }
}

function typeLabel(
 type?: string,
) {
 return {
 select: 'Select',
 color: 'Color',
 text: 'Text',
 number: 'Number',
 boolean: 'Boolean',
 }[
 type || 'select'
 ] || type
}
</script>

<template>
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
 <!-- Nothing selected -->
 <div
 v-if="!attribute"
 class="
 flex
 min-h-[280px]
 items-center
 justify-center

 p-6

 text-center
 "
 >
 <div>
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
 <circle
 cx="6"
 cy="6"
 r="2"
 stroke="currentColor"
 stroke-width="1.4"
 />

 <circle
 cx="14"
 cy="10"
 r="2"
 stroke="currentColor"
 stroke-width="1.4"
 />

 <circle
 cx="7"
 cy="15"
 r="2"
 stroke="currentColor"
 stroke-width="1.4"
 />

 <path
 d="M8 7L12 9M12 11L9 14"
 stroke="currentColor"
 stroke-width="1.3"
 />
 </svg>
 </div>

 <p
 class="
 mt-3

 text-[13px]
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 Select an attribute
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
 Choose one from the list
 to manage its values.
 </p>
 </div>
 </div>

 <template v-else>
 <!-- Header -->
 <header
 class="
 flex
 items-start
 justify-between
 gap-3

 p-4
 "
 >
 <div class="min-w-0">
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
 Values
 </p>

 <h2
 class="
 mt-1
 truncate

 text-[15px]
 font-semibold
 tracking-[-0.01em]
 text-gray-900

 dark:text-gray-100
 "
 >
 {{ attribute.name }}
 </h2>

 <div
 class="
 mt-1.5

 flex
 flex-wrap
 items-center
 gap-x-3
 gap-y-1

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 <span>
 {{ typeLabel(attribute.type) }}
 </span>

 <span>
 {{ attribute.code }}
 </span>

 <span
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
 rounded-full
 "
 :class="
 attribute.is_active
 ? 'bg-emerald-500'
 : 'bg-gray-300 dark:bg-gray-700'
 "
 />

 {{
 attribute.is_active
 ? 'Active'
 : 'Inactive'
 }}
 </span>
 </div>
 </div>

 <AppButton
 size="sm"
 @click="openCreateValue"
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

 Add value
 </AppButton>
 </header>

 <!-- Summary -->
 <div
 class="
 flex
 flex-wrap
 gap-x-4
 gap-y-1

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
 {{ values.length }}
 </strong>

 values
 </span>

 <span>
 <strong
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ activeValues }}
 </strong>

 active
 </span>

 <span
 v-if="savingOrder"
 class="
 flex
 items-center
 gap-1.5

 text-amber-600

 dark:text-amber-400
 "
 >
 <span
 class="
 h-2.5
 w-2.5

 animate-spin

 rounded-full

 border
 border-current/20
 border-t-current
 "
 />

 Saving order
 </span>
 </div>

 <div
 class="
 px-2
 pb-2
 "
 >
 <div
 v-if="orderError"
 class="
 mx-2
 mb-3

 rounded-[10px]

 bg-red-500/[0.07]

 px-3
 py-2.5

 text-[11px]
 text-red-600

 dark:bg-red-500/10
 dark:text-red-400
 "
 >
 {{ orderError }}
 </div>

 <!-- Loading -->
 <div
 v-if="pending"
 class="
 space-y-1
 "
 >
 <div
 v-for="item in 5"
 :key="item"
 class="
 flex
 items-center
 gap-3

 px-2
 py-2.5
 "
 >
 <AppSkeleton
 class-name="
 h-8
 w-8
 "
 rounded="lg"
 />

 <div class="flex-1">
 <AppSkeleton
 class-name="
 h-3
 w-28
 "
 />

 <AppSkeleton
 class-name="
 mt-2
 h-2.5
 w-20
 "
 />
 </div>

 <AppSkeleton
 class-name="
 h-8
 w-8
 "
 rounded="lg"
 />
 </div>
 </div>

 <AppErrorState
 v-else-if="error"
 title="Values could not be loaded"
 :message="error"
 @retry="fetchValues"
 />

 <!-- Empty -->
 <div
 v-else-if="
 values.length === 0
 "
 class="
 flex
 min-h-[210px]
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
 <div>
 <p
 class="
 text-[13px]
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 No values yet
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
 Add values such as S, M,
 L or Red, Black and White.
 </p>

 <AppButton
 class="mt-4"
 size="sm"
 @click="openCreateValue"
 >
 Add first value
 </AppButton>
 </div>
 </div>

 <!-- Values -->
 <TransitionGroup
 v-else
 name="value-list"
 tag="div"
 class="
 relative

 divide-y
 divide-gray-100

 dark:divide-white/[0.055]
 "
 >
 <div
 v-for="value in values"
 :key="value.id"
 draggable="true"
 class="
 group

 flex
 items-center
 gap-2

 rounded-[10px]

 px-2
 py-2.5

 transition

 hover:bg-gray-950/[0.025]

 dark:hover:bg-white/[0.035]
 "
 :class="[
 draggingValueId
 === value.id
 ? `
 scale-[0.99]
 opacity-40
 `
 : '',

 dragOverValueId
 === value.id
 && draggingValueId
 !== value.id
 ? `
 bg-gray-950/[0.045]
 ring-2
 ring-gray-950/10

 dark:bg-white/[0.06]
 dark:ring-white/10
 `
 : '',
 ]"
 @dragstart="
 onDragStart(
 $event,
 value,
 )
 "
 @dragenter.prevent="
 onDragEnter(value)
 "
 @dragover.prevent
 @drop.prevent="
 onDrop(
 $event,
 value,
 )
 "
 @dragend="onDragEnd"
 >
 <!-- Handle -->
 <button
 type="button"
 title="Drag to reorder"
 class="
 flex
 h-8
 w-6
 shrink-0
 cursor-grab
 items-center
 justify-center

 rounded-[7px]

 text-[13px]
 tracking-[-3px]
 text-gray-300

 transition

 hover:bg-gray-950/[0.045]
 hover:text-gray-500

 active:cursor-grabbing

 dark:text-gray-700
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-400
 "
 >
 ⋮⋮
 </button>

 <!-- Visual -->
 <div
 v-if="
 attribute.type
 === 'color'
 "
 class="
 h-8
 w-8
 shrink-0

 rounded-[9px]

 ring-1
 ring-black/[0.06]

 dark:ring-white/10
 "
 :style="{
 backgroundColor:
 value.color_code
 || '#e5e7eb',
 }"
 />

 <div
 v-else
 class="
 flex
 h-8
 w-8
 shrink-0
 items-center
 justify-center

 rounded-[9px]

 bg-gray-950/[0.045]

 text-[12px]
 font-semibold
 text-gray-500

 dark:bg-white/[0.06]
 dark:text-gray-400
 "
 >
 {{
 value.value
 .slice(0, 1)
 .toUpperCase()
 }}
 </div>

 <!-- Value -->
 <button
 type="button"
 class="
 min-w-0
 flex-1

 text-left
 "
 @click="
 openEditValue(
 value,
 )
 "
 >
 <div
 class="
 flex
 min-w-0
 items-center
 gap-2
 "
 >
 <p
 class="
 truncate

 text-[12px]
 font-semibold
 text-gray-800

 dark:text-gray-200
 "
 >
 {{ value.value }}
 </p>

 <span
 class="
 h-1.5
 w-1.5
 shrink-0
 rounded-full
 "
 :class="
 value.is_active
 ? 'bg-emerald-500'
 : 'bg-gray-300 dark:bg-gray-700'
 "
 />
 </div>

 <p
 class="
 mt-0.5
 truncate

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ value.slug }}
 ·
 Sort
 {{ value.sort_order }}
 </p>
 </button>

 <AppActionMenu>
 <template
 #default="{ close }"
 >
 <AppActionMenuItem
 @click="
 openEditValue(
 value,
 );
 close()
 "
 >
 Edit value
 </AppActionMenuItem>

 <AppActionMenuItem
 danger
 @click="
 askDeleteValue(
 value,
 );
 close()
 "
 >
 Delete value
 </AppActionMenuItem>
 </template>
 </AppActionMenu>
 </div>
 </TransitionGroup>
 </div>

 <AttributeValueFormModal
 :open="valueFormOpen"
 :mode="valueFormMode"
 :attribute="attribute"
 :value="valueToEdit"
 @close="
 valueFormOpen = false
 "
 @saved="afterValueSaved"
 />

 <AppConfirmModal
 :open="deleteOpen"
 title="Delete value?"
 :message="`This will delete “${valueToDelete?.value || 'this value'}”. This action cannot be undone.`"
 confirm-label="Delete value"
 :loading="deleting"
 :error="deleteError"
 @close="deleteOpen = false"
 @confirm="
 confirmDeleteValue
 "
 />
 </template>
 </section>
</template>

<style scoped>
.value-list-move,
.value-list-enter-active,
.value-list-leave-active {
 transition:
 transform 180ms ease,
 opacity 150ms ease;
}

.value-list-enter-from,
.value-list-leave-to {
 opacity: 0;
 transform: scale(0.98);
}

.value-list-leave-active {
 position: absolute;
}
</style>