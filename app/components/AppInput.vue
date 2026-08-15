<script setup lang="ts">
const model = defineModel<string | number | null>()

withDefaults(defineProps<{
 label?: string
 type?: string
 placeholder?: string
 error?: string
 required?: boolean
 autocomplete?: string
 disabled?: boolean
}>(), {
 label: undefined,
 type: 'text',
 placeholder: undefined,
 error: undefined,
 required: false,
 autocomplete: undefined,
 disabled: false,
})

const inputRef = ref<HTMLInputElement | null>(null)

defineExpose({
 focus: () => inputRef.value?.focus(),
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

 <div
 class="
 flex
 min-h-10
 w-full
 items-center
 gap-2

 rounded-[10px]

 bg-gray-950/[0.04]

 px-3

 transition
 duration-150

 hover:bg-gray-950/[0.055]

 focus-within:bg-gray-950/[0.055]
 focus-within:ring-2
 focus-within:ring-gray-950/10

 dark:bg-white/[0.06]
 dark:hover:bg-white/[0.075]
 dark:focus-within:bg-white/[0.08]
 dark:focus-within:ring-white/10
 "
 :class="[
 error
 ? `
 ring-1
 ring-red-400/60

 focus-within:ring-2
 focus-within:ring-red-500/15
 `
 : '',

 disabled
 ? 'pointer-events-none opacity-50'
 : '',
 ]"
 >
 <div
 v-if="$slots.prefix"
 class="
 flex
 shrink-0
 items-center
 justify-center

 text-gray-400

 dark:text-gray-500
 "
 >
 <slot name="prefix" />
 </div>

 <input
 ref="inputRef"
 v-model="model"
 :type="type"
 :placeholder="placeholder"
 :required="required"
 :autocomplete="autocomplete"
 :disabled="disabled"
 class="
 h-10
 min-w-0
 flex-1

 bg-transparent

 text-[13px]
 text-gray-950

 outline-none

 placeholder:text-gray-400

 dark:text-white
 dark:placeholder:text-gray-600
 "
 >

 <div
 v-if="$slots.suffix"
 class="
 flex
 shrink-0
 items-center
 justify-center

 text-gray-400

 dark:text-gray-500
 "
 >
 <slot name="suffix" />
 </div>
 </div>

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
 </div>
</template>