<script setup lang="ts">
type Option = {
 label: string
 value: string
 hint?: string
 disabled?: boolean
}

const props = withDefaults(defineProps<{
 modelValue: string[]
 options: Option[]
 label?: string
 placeholder?: string
 searchable?: boolean
 disabled?: boolean
}>(), {
 label: '',
 placeholder: 'Select options',
 searchable: true,
 disabled: false,
})

const emit = defineEmits<{
 'update:modelValue': [value: string[]]
}>()

const open = ref(false)
const search = ref('')

const buttonRef =
 ref<HTMLButtonElement | null>(null)

const menuRef =
 ref<HTMLDivElement | null>(null)

const searchInputRef =
 ref<HTMLInputElement | null>(null)

const {
 style: menuStyle,
 availableHeight,
} = useFloatingPanel(
 buttonRef,
 menuRef,
 open,
 {
 minWidth: 260,
 maxHeightCap: 400,
 maxHeightFloor: 190,
 gap: 6,
 },
)

const selectedValues = computed(() => {
 return (props.modelValue || []).map(
 (value) => String(value),
 )
})

const selectedOptions = computed(() => {
 return props.options.filter(
 (option) =>
 selectedValues.value.includes(
 String(option.value),
 ),
 )
})

const filteredOptions = computed(() => {
 const term =
 search.value.trim().toLowerCase()

 if (!term) {
 return props.options
 }

 return props.options.filter((option) => {
 return (
 option.label
 .toLowerCase()
 .includes(term)
 || String(option.value)
 .toLowerCase()
 .includes(term)
 || String(option.hint ?? '')
 .toLowerCase()
 .includes(term)
 )
 })
})

const hasSelection = computed(() => {
 return selectedValues.value.length > 0
})

const buttonLabel = computed(() => {
 if (!selectedOptions.value.length) {
 return props.placeholder
 }

 if (selectedOptions.value.length === 1) {
 return selectedOptions.value[0]?.label
 || props.placeholder
 }

 if (selectedOptions.value.length === 2) {
 return selectedOptions.value
 .map((option) => option.label)
 .join(', ')
 }

 return `${selectedOptions.value.length} selected`
})

const listStyle = computed(() => {
 const header =
 props.searchable ? 82 : 0

 const footer = 48

 return {
 maxHeight: `${
 Math.max(
 130,
 availableHeight.value -
 header -
 footer,
 )
 }px`,
 }
})

function toggle() {
 if (props.disabled) {
 return
 }

 open.value = !open.value

 if (
 open.value
 && props.searchable
 ) {
 nextTick(() => {
 searchInputRef.value?.focus()
 })
 }
}

function close() {
 open.value = false
 search.value = ''
}

function isSelected(value: string) {
 return selectedValues.value.includes(
 String(value),
 )
}

function toggleOption(value: string) {
 const normalized = String(value)

 if (isSelected(normalized)) {
 emit(
 'update:modelValue',
 selectedValues.value.filter(
 (item) => item !== normalized,
 ),
 )

 return
 }

 emit(
 'update:modelValue',
 [
 ...selectedValues.value,
 normalized,
 ],
 )
}

function clearSelection() {
 emit('update:modelValue', [])
 search.value = ''
}

function selectVisible() {
 const visibleValues =
 filteredOptions.value
 .filter((option) => !option.disabled)
 .map((option) =>
 String(option.value),
 )

 const merged = [
 ...new Set([
 ...selectedValues.value,
 ...visibleValues,
 ]),
 ]

 emit(
 'update:modelValue',
 merged,
 )
}

function clearVisible() {
 const visibleValues =
 filteredOptions.value.map(
 (option) =>
 String(option.value),
 )

 emit(
 'update:modelValue',
 selectedValues.value.filter(
 (value) =>
 !visibleValues.includes(value),
 ),
 )
}
</script>

<template>
 <div class="min-w-0">
 <label
 v-if="label"
 class="
 mb-1.5
 block

 text-[12px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 {{ label }}
 </label>

 <!-- Trigger -->
 <div
 class="
 flex
 min-h-10
 items-center

 rounded-[10px]

 bg-gray-950/[0.04]

 transition
 duration-150

 focus-within:ring-2
 focus-within:ring-gray-950/10

 dark:bg-white/[0.06]
 dark:focus-within:ring-white/10
 "
 :class="
 open
 ? `
 bg-gray-950/[0.07]
 ring-2
 ring-gray-950/10

 dark:bg-white/[0.09]
 dark:ring-white/10
 `
 : ''
 "
 >
 <button
 ref="buttonRef"
 type="button"
 class="
 group

 flex
 min-h-10
 min-w-0
 flex-1
 items-center
 gap-2

 px-3
 py-2

 text-left

 outline-none
 "
 :class="
 disabled
 ? 'cursor-not-allowed opacity-50'
 : ''
 "
 :disabled="disabled"
 :aria-expanded="open"
 aria-haspopup="listbox"
 @click.stop="toggle"
 >
 <span
 class="
 min-w-0
 flex-1
 truncate

 text-[13px]
 "
 :class="
 hasSelection
 ? `
 font-medium
 text-gray-900

 dark:text-gray-100
 `
 : `
 text-gray-400

 dark:text-gray-500
 `
 "
 >
 {{ buttonLabel }}
 </span>

 <span
 v-if="
 selectedValues.length > 2
 "
 class="
 flex
 h-5
 min-w-5
 shrink-0
 items-center
 justify-center

 rounded-full

 bg-gray-950/[0.07]

 px-1.5

 text-[11px]
 font-semibold
 text-gray-600

 dark:bg-white/[0.09]
 dark:text-gray-300
 "
 >
 {{ selectedValues.length }}
 </span>

 <svg
 class="
 h-4
 w-4
 shrink-0

 text-gray-400

 transition-transform
 duration-200

 dark:text-gray-500
 "
 :class="
 open ? 'rotate-180' : ''
 "
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M6 8L10 12L14 8"
 stroke="currentColor"
 stroke-width="1.7"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </button>

 <button
 v-if="hasSelection"
 type="button"
 aria-label="Clear selection"
 title="Clear selection"
 class="
 mr-1

 flex
 h-8
 w-8
 shrink-0
 items-center
 justify-center

 rounded-lg

 text-gray-400
 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-700

 dark:text-gray-500
 dark:hover:bg-white/[0.07]
 dark:hover:text-gray-200
 "
 @click.stop="clearSelection"
 >
 <svg
 class="h-3.5 w-3.5"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M6 6L14 14M14 6L6 14"
 stroke="currentColor"
 stroke-width="1.7"
 stroke-linecap="round"
 />
 </svg>
 </button>
 </div>

 <!-- Dropdown -->
 <Teleport to="body">
 <Transition
 enter-active-class="
 transition
 duration-150
 ease-out
 "
 enter-from-class="
 translate-y-1
 scale-[0.985]
 opacity-0
 "
 enter-to-class="
 translate-y-0
 scale-100
 opacity-100
 "
 leave-active-class="
 transition
 duration-100
 ease-in
 "
 leave-to-class="
 translate-y-1
 scale-[0.99]
 opacity-0
 "
 >
 <div
 v-if="open"
 ref="menuRef"
 class="
 z-[9999]

 flex
 flex-col
 overflow-hidden

 rounded-[12px]

 bg-white

 p-1.5

 shadow-[0_16px_48px_rgba(17,24,39,0.14)]

 ring-1
 ring-black/[0.06]

 dark:bg-[#17181b]
 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]
 dark:ring-white/[0.08]
 "
 :style="menuStyle"
 @click.stop
 >
 <!-- Search -->
 <div
 v-if="searchable"
 class="
 shrink-0
 pb-1.5
 "
 >
 <div
 class="
 flex
 h-9
 items-center
 gap-2

 rounded-[9px]

 bg-gray-950/[0.04]

 px-2.5

 dark:bg-white/[0.055]
 "
 >
 <svg
 class="
 h-4
 w-4

 text-gray-400

 dark:text-gray-500
 "
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

 <input
 ref="searchInputRef"
 v-model="search"
 type="text"
 autocomplete="off"
 placeholder="Search..."
 class="
 min-w-0
 flex-1

 bg-transparent

 text-[13px]
 text-gray-900

 outline-none

 placeholder:text-gray-400

 dark:text-gray-100
 dark:placeholder:text-gray-600
 "
 >
 </div>

 <div
 class="
 flex
 items-center
 gap-1

 pt-1.5
 "
 >
 <button
 type="button"
 class="
 rounded-md

 px-2
 py-1

 text-[11px]
 font-medium
 text-gray-500

 transition

 hover:bg-gray-950/[0.04]
 hover:text-gray-800

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-200
 "
 @click="selectVisible"
 >
 Select visible
 </button>

 <button
 type="button"
 class="
 rounded-md

 px-2
 py-1

 text-[11px]
 font-medium
 text-gray-500

 transition

 hover:bg-gray-950/[0.04]
 hover:text-gray-800

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-200
 "
 @click="clearVisible"
 >
 Clear visible
 </button>
 </div>
 </div>

 <!-- Options -->
 <div
 class="
 overflow-y-auto
 overscroll-contain

 [scrollbar-width:none]
 [&::-webkit-scrollbar]:hidden
 "
 :style="listStyle"
 >
 <label
 v-for="option in filteredOptions"
 :key="option.value"
 class="
 flex
 min-h-9
 items-center
 gap-2.5

 rounded-[8px]

 px-2.5
 py-1.5

 transition
 duration-100

 hover:bg-gray-950/[0.045]

 dark:hover:bg-white/[0.06]
 "
 :class="[
 isSelected(option.value)
 ? `
 bg-gray-950/[0.055]

 dark:bg-white/[0.075]
 `
 : '',

 option.disabled
 ? `
 pointer-events-none
 opacity-40
 `
 : '',
 ]"
 >
 <input
 type="checkbox"
 class="sr-only"
 :checked="
 isSelected(option.value)
 "
 :disabled="option.disabled"
 @change="
 toggleOption(option.value)
 "
 >

 <!-- Actual checkbox -->
 <span
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
 isSelected(option.value)
 ? `
 bg-gray-950
 text-white
 ring-gray-950

 dark:bg-white
 dark:text-gray-950
 dark:ring-white
 `
 : `
 bg-transparent
 text-transparent
 ring-gray-300

 dark:ring-white/20
 `
 "
 >
 <svg
 class="h-3 w-3"
 viewBox="0 0 16 16"
 fill="none"
 >
 <path
 d="M3.5 8.5L6.5 11.5L12.5 4.5"
 stroke="currentColor"
 stroke-width="2"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </span>

 <span
 class="
 min-w-0
 flex-1
 "
 >
 <span
 class="
 block
 truncate

 text-[13px]
 font-medium
 text-gray-800

 dark:text-gray-200
 "
 >
 {{ option.label }}
 </span>

 <span
 v-if="option.hint"
 class="
 mt-0.5
 block
 truncate

 text-[11px]
 text-gray-400

 dark:text-gray-500
 "
 >
 {{ option.hint }}
 </span>
 </span>
 </label>

 <div
 v-if="
 filteredOptions.length === 0
 "
 class="
 px-3
 py-5

 text-center
 text-[12px]
 text-gray-400

 dark:text-gray-500
 "
 >
 No options found.
 </div>
 </div>

 <!-- Footer -->
 <div
 class="
 mt-1
 flex
 h-11
 shrink-0
 items-center
 justify-between

 px-2
 "
 >
 <span
 class="
 text-[11px]
 text-gray-400

 dark:text-gray-500
 "
 >
 {{
 selectedValues.length
 }}
 selected
 </span>

 <button
 type="button"
 class="
 h-8

 rounded-[8px]

 bg-gray-950

 px-3

 text-[12px]
 font-medium
 text-white

 transition

 hover:bg-gray-800

 active:scale-[0.98]

 dark:bg-white
 dark:text-gray-950
 dark:hover:bg-gray-100
 "
 @click="close"
 >
 Done
 </button>
 </div>
 </div>
 </Transition>
 </Teleport>
 </div>
</template>