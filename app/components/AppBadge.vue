<script setup lang="ts">
const props = withDefaults(defineProps<{
 variant?: 'neutral' | 'green' | 'red' | 'amber' | 'blue'
}>(), {
 variant: 'neutral',
})

const dotClass = computed(() => ({
 neutral: 'bg-gray-300 dark:bg-gray-700',
 green: 'bg-emerald-500',
 red: 'bg-red-500',
 amber: 'bg-amber-500',
 blue: 'bg-blue-500',
}[props.variant]))

const textClass = computed(() => ({
 neutral: 'text-gray-500 dark:text-gray-500',
 green: 'text-emerald-700 dark:text-emerald-400',
 red: 'text-red-700 dark:text-red-400',
 amber: 'text-amber-700 dark:text-amber-400',
 blue: 'text-blue-700 dark:text-blue-400',
}[props.variant]))
</script>

<template>
 <span
 class="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium"
 :class="textClass"
 >
 <span
 class="h-1.5 w-1.5 shrink-0 rounded-full"
 :class="dotClass"
 />
 <slot />
 </span>
</template>
