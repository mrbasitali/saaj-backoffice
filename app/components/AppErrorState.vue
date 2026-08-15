<script setup lang="ts">
withDefaults(defineProps<{
 title?: string
 message?: string
 retryLabel?: string
}>(), {
 title: 'Something went wrong',
 message: 'Please try again.',
 retryLabel: 'Try again',
})

const emit = defineEmits<{
 retry: []
}>()
</script>

<template>
 <div class="rounded-[14px] bg-red-500/[0.07] px-4 py-3.5 dark:bg-red-500/10">
 <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h2 class="text-[13px] font-semibold text-red-700 dark:text-red-300">
 {{ title }}
 </h2>

 <p class="mt-1 text-[12px] leading-5 text-red-600/80 dark:text-red-300/75">
 {{ message }}
 </p>
 </div>

 <AppButton
 variant="danger"
 size="sm"
 @click="emit('retry')"
 >
 {{ retryLabel }}
 </AppButton>
 </div>
 </div>
</template>
