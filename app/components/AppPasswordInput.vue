<script setup lang="ts">
const model = defineModel<string>()

withDefaults(defineProps<{
 label?: string
 placeholder?: string
 error?: string
 required?: boolean
 autocomplete?: string
}>(), {
 label: 'Password',
 placeholder: undefined,
 error: undefined,
 required: false,
 autocomplete: 'current-password',
})

const visible = ref(false)
</script>

<template>
 <div class="min-w-0">
 <label
 v-if="label"
 class="mb-1.5 block text-[12px] font-medium text-gray-600 dark:text-gray-400"
 >
 {{ label }}
 </label>

 <div
 class="flex min-h-10 w-full items-center rounded-[10px] bg-gray-950/[0.04] transition hover:bg-gray-950/[0.055] focus-within:bg-gray-950/[0.055] focus-within:ring-2 focus-within:ring-gray-950/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.075] dark:focus-within:bg-white/[0.08] dark:focus-within:ring-white/10"
 :class="error ? 'ring-1 ring-red-400/60 focus-within:ring-red-500/15' : ''"
 >
 <input
 v-model="model"
 :type="visible ? 'text' : 'password'"
 :placeholder="placeholder"
 :required="required"
 :autocomplete="autocomplete"
 class="h-10 min-w-0 flex-1 bg-transparent px-3 text-[13px] text-gray-950 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-600"
 >

 <button
 type="button"
 class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] text-gray-400 transition hover:bg-gray-950/[0.04] hover:text-gray-700 active:scale-95 dark:text-gray-600 dark:hover:bg-white/[0.055] dark:hover:text-gray-200"
 :aria-label="visible ? 'Hide password' : 'Show password'"
 @click="visible = !visible"
 >
 <svg
 v-if="!visible"
 class="h-4 w-4"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 stroke-width="1.8"
 >
 <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
 <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
 </svg>

 <svg
 v-else
 class="h-4 w-4"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 stroke-width="1.8"
 >
 <path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58M9.88 4.74A10.5 10.5 0 0 1 12 4.5c6 0 9.75 7.5 9.75 7.5a17.6 17.6 0 0 1-2.42 3.28M6.61 6.61C3.85 8.46 2.25 12 2.25 12S6 19.5 12 19.5a10.4 10.4 0 0 0 4.68-1.12" />
 </svg>
 </button>
 </div>

 <p
 v-if="error"
 class="mt-1.5 text-[12px] font-medium text-red-600 dark:text-red-400"
 >
 {{ error }}
 </p>
 </div>
</template>
