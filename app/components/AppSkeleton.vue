<script setup lang="ts">
const props = withDefaults(defineProps<{
 className?: string
 rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}>(), {
 className: '',
 rounded: 'xl',
})

const roundedClass = computed(() => {
 return {
 sm: 'rounded-sm',
 md: 'rounded-md',
 lg: 'rounded-lg',
 xl: 'rounded-xl',
 '2xl': 'rounded-2xl',
 full: 'rounded-full',
 }[props.rounded]
})
</script>

<template>
 <div
 class="saaj-skeleton bg-gray-200/80 dark:bg-white/10"
 :class="[roundedClass, className]"
 aria-hidden="true"
 />
</template>