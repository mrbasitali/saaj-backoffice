<script setup lang="ts">
const { progress, isLoading, error } = useLoadingIndicator()
</script>

<template>
 <div
 class="fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden bg-transparent"
 aria-hidden="true"
 >
 <div
 class="h-full origin-left rounded-r-full transition-transform duration-200 ease-out"
 :class="error ? 'bg-red-500' : 'bg-gray-950 dark:bg-white'"
 :style="{
 transform: isLoading ? `scaleX(${progress / 100})` : 'scaleX(0)',
 opacity: isLoading ? 1 : 0,
 }"
 />
 </div>
</template>