<script setup lang="ts">
type SelectValue =
 | string
 | number
 | boolean
 | null

type Option = {
 label: string
 value: SelectValue
 hint?: string | null
 imageUrl?: string | null
 disabled?: boolean
}

const model = defineModel<SelectValue>()

const props = withDefaults(defineProps<{
 label?: string
 options: Option[]
 placeholder?: string
 error?: string
 disabled?: boolean
 searchable?: boolean
 remote?: boolean
 loading?: boolean
 debounceMs?: number
}>(), {
 label: '',
 placeholder: 'Select option',
 error: '',
 disabled: false,
 searchable: false,
 remote: false,
 loading: false,
 debounceMs: 300,
})

const emit = defineEmits<{
 change: [value: SelectValue]
 search: [term: string]
}>()

const open = ref(false)
const search = ref('')
const activeIndex = ref(-1)

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
 minWidth: 240,
 maxHeightCap: 380,
 maxHeightFloor: 180,
 gap: 6,
 },
)

const selectedOption = computed(() => {
 return props.options.find(
 (option) =>
 option.value === model.value,
 ) || null
})

const hasImageOptions = computed(() => {
 return props.options.some(
 (option) => Boolean(option.imageUrl),
 )
})

const filteredOptions = computed(() => {
 if (props.remote) {
 return props.options
 }

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
 || String(option.value ?? '')
 .toLowerCase()
 .includes(term)
 || String(option.hint ?? '')
 .toLowerCase()
 .includes(term)
 )
 })
})

const debounceTimer =
 ref<ReturnType<typeof setTimeout> | null>(
 null,
 )

watch(search, (term) => {
 if (!props.remote) {
 return
 }

 if (debounceTimer.value) {
 clearTimeout(debounceTimer.value)
 }

 debounceTimer.value = setTimeout(() => {
 emit('search', term.trim())
 }, props.debounceMs)
})

watch(filteredOptions, () => {
 if (!open.value) {
 return
 }

 setInitialActive()
})

const listStyle = computed(() => {
 const searchHeight =
 props.searchable ? 52 : 0

 return {
 maxHeight: `${
 Math.max(
 130,
 availableHeight.value -
 searchHeight -
 8,
 )
 }px`,
 }
})

function setInitialActive() {
 const selectedIndex =
 filteredOptions.value.findIndex(
 (option) =>
 option.value === model.value
 && !option.disabled,
 )

 if (selectedIndex >= 0) {
 activeIndex.value = selectedIndex
 return
 }

 activeIndex.value =
 filteredOptions.value.findIndex(
 (option) => !option.disabled,
 )
}

function openMenu() {
 if (props.disabled) {
 return
 }

 open.value = true

 setInitialActive()

 if (props.remote) {
 emit('search', search.value.trim())
 }

 if (props.searchable) {
 nextTick(() => {
 searchInputRef.value?.focus()
 })
 }
}

function toggle() {
 if (open.value) {
 close()
 return
 }

 openMenu()
}

function close() {
 open.value = false
 search.value = ''
 activeIndex.value = -1
}

function selectOption(option: Option) {
 if (option.disabled) {
 return
 }

 model.value = option.value

 emit('change', option.value)

 close()
}

function isSelected(option: Option) {
 return option.value === model.value
}

function moveActive(direction: number) {
 if (!open.value) {
 openMenu()
 return
 }

 const options = filteredOptions.value

 if (!options.length) {
 return
 }

 let next = activeIndex.value

 for (
 let index = 0;
 index < options.length;
 index++
 ) {
 next =
 (next + direction + options.length)
 % options.length

 if (!options[next]?.disabled) {
 activeIndex.value = next

 nextTick(() => {
 const element =
 menuRef.value?.querySelector(
 `[data-option-index="${next}"]`,
 ) as HTMLElement | null

 element?.scrollIntoView({
 block: 'nearest',
 })
 })

 return
 }
 }
}

function selectActive() {
 const option =
 filteredOptions.value[
 activeIndex.value
 ]

 if (option) {
 selectOption(option)
 }
}

function onTriggerKeydown(
 event: KeyboardEvent,
) {
 if (
 event.key === 'ArrowDown'
 || event.key === 'ArrowUp'
 ) {
 event.preventDefault()

 if (!open.value) {
 openMenu()
 return
 }

 moveActive(
 event.key === 'ArrowDown'
 ? 1
 : -1,
 )

 return
 }

 if (
 event.key === 'Enter'
 && open.value
 ) {
 event.preventDefault()
 selectActive()
 }
}

onBeforeUnmount(() => {
 if (debounceTimer.value) {
 clearTimeout(debounceTimer.value)
 }
})
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
 <button
 ref="buttonRef"
 type="button"
 class="
 group

 flex
 min-h-10
 w-full
 min-w-0
 items-center
 justify-between
 gap-2.5

 rounded-[10px]

 bg-gray-950/[0.04]

 px-3
 py-2

 text-left
 text-[13px]

 outline-none

 transition
 duration-150

 hover:bg-gray-950/[0.065]

 focus-visible:ring-2
 focus-visible:ring-gray-950/10

 dark:bg-white/[0.06]
 dark:hover:bg-white/[0.09]
 dark:focus-visible:ring-white/10
 "
 :class="[
 error
 ? `
 ring-1
 ring-red-400/60
 `
 : '',

 disabled
 ? 'cursor-not-allowed opacity-50'
 : '',

 open
 ? `
 bg-gray-950/[0.07]
 ring-2
 ring-gray-950/10

 dark:bg-white/[0.09]
 dark:ring-white/10
 `
 : '',
 ]"
 :disabled="disabled"
 :aria-expanded="open"
 aria-haspopup="listbox"
 @click.stop="toggle"
 @keydown="onTriggerKeydown"
 >
 <span
 class="
 flex
 min-w-0
 flex-1
 items-center
 gap-2.5
 "
 >
 <span
 v-if="selectedOption?.imageUrl"
 class="
 h-7
 w-7
 shrink-0
 overflow-hidden

 rounded-lg

 bg-gray-100

 dark:bg-white/[0.08]
 "
 >
 <img
 :src="selectedOption.imageUrl"
 :alt="selectedOption.label"
 class="
 h-full
 w-full
 object-cover
 "
 loading="lazy"
 >
 </span>

 <span class="min-w-0">
 <span
 class="block truncate"
 :class="
 selectedOption
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
 {{
 selectedOption?.label
 || placeholder
 }}
 </span>

 <span
 v-if="selectedOption?.hint"
 class="
 mt-0.5
 block
 truncate

 text-[12px]
 text-gray-400

 dark:text-gray-500
 "
 >
 {{ selectedOption.hint }}
 </span>
 </span>
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
 :class="open ? 'rotate-180' : ''"
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

 <p
 v-if="error"
 class="
 mt-1.5

 text-[12px]
 font-medium
 text-red-600

 dark:text-red-400
 "
 >
 {{ error }}
 </p>

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
 leave-from-class="
 opacity-100
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
 role="listbox"
 @click.stop
 >
 <!-- Search -->
 <div
 v-if="searchable"
 class="pb-1.5"
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
 shrink-0

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
 @keydown.down.prevent="
 moveActive(1)
 "
 @keydown.up.prevent="
 moveActive(-1)
 "
 @keydown.enter.prevent="
 selectActive
 "
 >
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
 <div
 v-if="remote && loading"
 class="
 flex
 h-10
 items-center
 gap-2

 px-2.5

 text-[12px]
 text-gray-500

 dark:text-gray-400
 "
 >
 <span
 class="
 h-3.5
 w-3.5

 animate-spin

 rounded-full

 border-2
 border-gray-300
 border-t-gray-600

 dark:border-white/20
 dark:border-t-white
 "
 />

 Searching…
 </div>

 <button
 v-for="(option, index) in filteredOptions"
 :key="
 `${String(option.value)}-${option.label}`
 "
 type="button"
 :data-option-index="index"
 role="option"
 :aria-selected="isSelected(option)"
 class="
 flex
 min-h-9
 w-full
 items-center
 gap-2.5

 rounded-[8px]

 px-2.5
 py-1.5

 text-left

 outline-none
 transition
 duration-100
 "
 :class="[
 option.disabled
 ? `
 cursor-not-allowed
 opacity-40
 `
 : '',

 activeIndex === index
 ? `
 bg-gray-950/[0.045]

 dark:bg-white/[0.06]
 `
 : '',

 isSelected(option)
 ? `
 bg-gray-950/[0.065]

 dark:bg-white/[0.085]
 `
 : '',
 ]"
 :disabled="option.disabled"
 @mouseenter="
 activeIndex = index
 "
 @click="
 selectOption(option)
 "
 >
 <span
 v-if="option.imageUrl"
 class="
 h-8
 w-8
 shrink-0
 overflow-hidden

 rounded-lg

 bg-gray-100

 dark:bg-white/[0.07]
 "
 >
 <img
 :src="option.imageUrl"
 :alt="option.label"
 class="
 h-full
 w-full
 object-cover
 "
 loading="lazy"
 >
 </span>

 <span
 v-else-if="hasImageOptions"
 class="
 flex
 h-8
 w-8
 shrink-0
 items-center
 justify-center

 rounded-lg

 bg-gray-950/[0.035]

 text-[11px]
 font-semibold
 uppercase
 tracking-wide
 text-gray-400

 dark:bg-white/[0.05]
 dark:text-gray-600
 "
 >
 img
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

 <!-- Single select check.
 Notice: no checkbox -->
 <svg
 v-if="isSelected(option)"
 class="
 h-4
 w-4
 shrink-0

 text-gray-800

 dark:text-white
 "
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M5 10.5L8.3 13.5L15 6.5"
 stroke="currentColor"
 stroke-width="1.8"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </button>

 <div
 v-if="
 !(remote && loading)
 && filteredOptions.length === 0
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
 {{
 remote && search.trim()
 ? `No results for "${search.trim()}"`
 : 'No options found.'
 }}
 </div>
 </div>
 </div>
 </Transition>
 </Teleport>
 </div>
</template>