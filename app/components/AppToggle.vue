<script setup lang="ts">
const model = defineModel<boolean>()

withDefaults(defineProps<{
 label?: string
 description?: string
 disabled?: boolean
}>(), {
 label: undefined,
 description: undefined,
 disabled: false,
})
</script>

<template>
 <button
 type="button"
 :disabled="disabled"
 class="
 group

 flex
 items-center
 gap-3

 text-left

 outline-none

 disabled:pointer-events-none
 disabled:opacity-50
 "
 :class="
 label || description
 ? 'w-full justify-between'
 : ''
 "
 @click="model = !model"
 >
 <span
 v-if="label || description"
 class="
 min-w-0
 flex-1
 "
 >
 <span
 v-if="label"
 class="
 block

 text-[13px]
 font-medium
 text-gray-800

 dark:text-gray-200
 "
 >
 {{ label }}
 </span>

 <span
 v-if="description"
 class="
 mt-0.5
 block

 text-[11px]
 leading-4
 text-gray-400

 dark:text-gray-500
 "
 >
 {{ description }}
 </span>
 </span>

 <span
 class="
 relative

 inline-flex
 h-5
 w-9
 shrink-0

 rounded-full

 transition
 duration-200
 "
 :class="
 model
 ? `
 bg-gray-950

 dark:bg-white
 `
 : `
 bg-gray-200

 dark:bg-white/[0.12]
 `
 "
 >
 <span
 class="
 absolute
 top-0.5

 h-4
 w-4

 rounded-full

 bg-white

 shadow-sm

 transition-transform
 duration-200

 dark:bg-[#111214]
 "
 :class="
 model
 ? 'translate-x-[18px]'
 : 'translate-x-0.5'
 "
 />
 </span>
 </button>
</template>