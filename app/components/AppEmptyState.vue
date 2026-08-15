<script setup lang="ts">
defineProps<{
 title: string
 message?: string
}>()
</script>

<template>
 <div class="flex min-h-[230px] items-center justify-center rounded-[18px] bg-white px-6 py-10 text-center shadow-[0_1px_2px_rgba(17,24,39,0.025)] dark:bg-[#111214] dark:shadow-none">
 <div class="max-w-md">
 <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-[11px] bg-gray-950/[0.045] text-gray-400 dark:bg-white/[0.055] dark:text-gray-600">
 <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
 <path d="M5 6H15M5 10H15M5 14H11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
 </svg>
 </div>

 <h3 class="mt-3 text-[13px] font-semibold text-gray-800 dark:text-gray-200">
 {{ title }}
 </h3>

 <p
 v-if="message"
 class="mx-auto mt-1.5 max-w-md text-[12px] leading-5 text-gray-400 dark:text-gray-500"
 >
 {{ message }}
 </p>

 <div
 v-if="$slots.actions"
 class="mt-4 flex justify-center"
 >
 <slot name="actions" />
 </div>
 </div>
 </div>
</template>
