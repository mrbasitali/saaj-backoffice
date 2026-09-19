<script setup lang="ts">
const props = withDefaults(defineProps<{
 modelValue: string
 items: { label: string, value: string }[]
 disabled?: boolean
 nextDisabled?: boolean
}>(), {
 disabled: false,
 nextDisabled: false,
})

const emit = defineEmits<{
 'update:modelValue': [value: string]
}>()

const currentIndex = computed(() => props.items.findIndex(item => item.value === props.modelValue))

function move(direction: -1 | 1) {
 if (props.disabled || (direction === 1 && props.nextDisabled)) return
 const target = props.items[currentIndex.value + direction]
 if (target) emit('update:modelValue', target.value)
}
</script>

<template>
 <nav class="flex shrink-0 items-center justify-between gap-2 sm:justify-start" aria-label="Form steps">
 <AppButton
 type="button"
 variant="ghost"
 size="sm"
 class="step-button"
 :disabled="disabled || currentIndex <= 0"
 @click="move(-1)"
 >
 <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
 <path d="m12 5-5 5 5 5" />
 </svg>
 Previous
 </AppButton>

 <span
 class="min-w-9 text-center text-[11px] tabular-nums text-gray-400 dark:text-gray-500"
 :aria-label="`Step ${currentIndex + 1} of ${items.length}: ${items[currentIndex]?.label ?? ''}`"
 >
 {{ currentIndex + 1 }} / {{ items.length }}
 </span>

 <AppButton
 type="button"
 variant="secondary"
 size="sm"
 class="step-button"
 :disabled="disabled || nextDisabled || currentIndex < 0 || currentIndex >= items.length - 1"
 @click="move(1)"
 >
 Next
 <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
 <path d="m8 5 5 5-5 5" />
 </svg>
 </AppButton>
 </nav>
</template>

<style scoped>
.step-button {
 font-size: 12px;
 font-weight: 500;
}
</style>
