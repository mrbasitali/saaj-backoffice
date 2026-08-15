<script setup lang="ts">
defineProps<{
 label: string
 value: string | number
 helper?: string
}>()
</script>

<template>
 <section
 class="
 rounded-[18px]

 bg-white

 p-4

 shadow-[0_1px_2px_rgba(17,24,39,0.025)]

 sm:p-5

 dark:bg-[#111214]
 dark:shadow-none
 "
 >
 <p
 class="
 text-[12px]
 font-medium
 text-gray-500

 dark:text-gray-500
 "
 >
 {{ label }}
 </p>

 <p
 class="
 mt-2.5

 text-[23px]
 font-semibold
 tabular-nums
 tracking-[-0.025em]
 text-gray-950

 dark:text-white
 "
 >
 {{ value }}
 </p>

 <p
 v-if="helper"
 class="
 mt-2

 text-[12px]
 leading-5
 text-gray-400

 dark:text-gray-500
 "
 >
 {{ helper }}
 </p>
 </section>
</template>