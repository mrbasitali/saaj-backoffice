<script setup lang="ts">
withDefaults(defineProps<{
 icon?: 'sparkles' | 'refresh' | 'barcode'
 loading?: boolean
 disabled?: boolean
}>(), {
 icon: 'sparkles',
 loading: false,
 disabled: false,
})
</script>

<template>
 <button
 type="button"
 class="generator-button inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] bg-transparent px-1.5 text-blue-600 outline-none transition-colors hover:bg-blue-500/[0.07] focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:pointer-events-none disabled:opacity-40 dark:text-blue-400 dark:hover:bg-blue-400/10"
 :disabled="disabled || loading"
 :aria-busy="loading"
 >
 <span
 v-if="loading"
 class="h-3 w-3 animate-spin rounded-full border-[1.5px] border-current/20 border-t-current"
 aria-hidden="true"
 />
 <svg
 v-else
 class="h-3.5 w-3.5 shrink-0"
 viewBox="0 0 20 20"
 fill="none"
 stroke="currentColor"
 stroke-width="1.5"
 stroke-linecap="round"
 stroke-linejoin="round"
 aria-hidden="true"
 >
 <path
 v-if="icon === 'refresh'"
 d="M16.5 8.5a6.5 6.5 0 1 0-1.6 5.9M16.5 3.5v5h-5"
 />
 <path
 v-else-if="icon === 'barcode'"
 d="M3 4v12M6 4v12M9 4v12M10.5 4v12M14 4v12M17 4v12"
 />
 <path
 v-else
 d="m8 3 1.8 5.2L15 10l-5.2 1.8L8 17l-1.8-5.2L1 10l5.2-1.8L8 3ZM16 2l.8 2.2L19 5l-2.2.8L16 8l-.8-2.2L13 5l2.2-.8L16 2Z"
 />
 </svg>

 <slot />
 </button>
</template>

<style scoped>
/* Keep field actions compact even with the global button font reset. */
.generator-button {
 border: 0;
 font-size: 11px;
 font-weight: 500;
 line-height: 1.25;
}
</style>
