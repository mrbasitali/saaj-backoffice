<script setup lang="ts">
defineProps<{
 eyebrow?: string
 title: string
 description?: string
}>()
</script>

<template>
 <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
 <div class="min-w-0">
 <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
 <p
 v-if="eyebrow"
 class="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-400 dark:text-gray-600"
 >
 {{ eyebrow }}
 </p>

 <span
 v-if="eyebrow"
 class="hidden h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-700 sm:block"
 />

 <h1 class="text-[19px] font-semibold tracking-[-0.025em] text-gray-950 dark:text-white sm:text-[21px]">
 {{ title }}
 </h1>
 </div>

 <p
 v-if="description"
 class="mt-1.5 max-w-3xl text-[12px] leading-5 text-gray-400 dark:text-gray-500"
 >
 {{ description }}
 </p>
 </div>

 <div
 v-if="$slots.actions"
 class="flex shrink-0 flex-wrap items-center gap-1.5"
 >
 <slot name="actions" />
 </div>
 </div>
</template>
