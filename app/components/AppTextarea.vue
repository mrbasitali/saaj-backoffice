<script setup lang="ts">
const model = defineModel<string | null>()

withDefaults(defineProps<{
 label?: string
 placeholder?: string
 error?: string
 rows?: number
 disabled?: boolean
}>(), {
 label: undefined,
 placeholder: undefined,
 error: undefined,
 rows: 4,
 disabled: false,
})
</script>

<template>
 <div class="min-w-0">
 <label
 v-if="label"
 class="
 mb-1.5
 block

 text-[12px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 {{ label }}
 </label>

 <textarea
 v-model="model"
 :rows="rows"
 :placeholder="placeholder"
 :disabled="disabled"
 class="
 block
 w-full

 resize-y

 rounded-[10px]

 bg-gray-950/[0.04]

 px-3
 py-2.5

 text-[13px]
 leading-5
 text-gray-950

 outline-none

 transition
 duration-150

 placeholder:text-gray-400

 hover:bg-gray-950/[0.055]

 focus:bg-gray-950/[0.055]
 focus:ring-2
 focus:ring-gray-950/10

 disabled:pointer-events-none
 disabled:opacity-50

 dark:bg-white/[0.06]
 dark:text-white
 dark:placeholder:text-gray-600
 dark:hover:bg-white/[0.075]
 dark:focus:bg-white/[0.08]
 dark:focus:ring-white/10
 "
 :class="
 error
 ? `
 ring-1
 ring-red-400/60

 focus:ring-2
 focus:ring-red-500/15
 `
 : ''
 "
 />

 <p
 v-if="error"
 class="
 mt-1.5

 text-[12px]
 font-medium
 text-red-600

 dark:text-red-400
 "
 >
 {{ error }}
 </p>
 </div>
</template>
