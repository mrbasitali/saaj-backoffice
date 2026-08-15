<script setup lang="ts">
withDefaults(defineProps<{
 danger?: boolean
 disabled?: boolean
}>(), {
 danger: false,
 disabled: false,
})

const emit = defineEmits<{
 click: []
}>()
</script>

<template>
 <button
 type="button"
 :disabled="disabled"
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
 text-[13px]
 font-medium

 outline-none

 transition
 duration-100

 disabled:pointer-events-none
 disabled:opacity-40
 "
 :class="
 danger
 ? `
 text-red-600

 hover:bg-red-500/[0.07]

 dark:text-red-400
 dark:hover:bg-red-500/10
 `
 : `
 text-gray-700

 hover:bg-gray-950/[0.045]
 hover:text-gray-950

 dark:text-gray-300
 dark:hover:bg-white/[0.06]
 dark:hover:text-white
 `
 "
 @click="emit('click')"
 >
 <slot />
 </button>
</template>