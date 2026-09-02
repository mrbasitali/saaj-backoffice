<script setup lang="ts">
withDefaults(defineProps<{
 open: boolean
 title: string
 message: string
 confirmLabel?: string
 loading?: boolean
 error?: string
}>(), {
 confirmLabel: 'Confirm',
 loading: false,
 error: '',
})

const emit = defineEmits<{
 close: []
 confirm: []
}>()
</script>

<template>
 <AppModal
 :open="open"
 :title="title"
 :description="message"
 max-width="max-w-[520px]"
 @close="emit('close')"
 >
 <div v-if="$slots.default" class="px-4 pt-4">
  <slot />
 </div>

 <div
 v-if="error"
 class="mx-4 my-4 rounded-[10px] bg-red-500/[0.07] px-3 py-2.5 text-[12px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400"
 >
 {{ error }}
 </div>

 <template #footer>
 <div class="flex items-center justify-end gap-2">
 <AppButton
 variant="ghost"
 :disabled="loading"
 @click="emit('close')"
 >
 Cancel
 </AppButton>

 <AppButton
 variant="danger"
 :loading="loading"
 @click="emit('confirm')"
 >
 {{ confirmLabel }}
 </AppButton>
 </div>
 </template>
 </AppModal>
</template>
