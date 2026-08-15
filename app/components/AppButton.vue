<script setup lang="ts">
const props = withDefaults(defineProps<{
 type?: 'button' | 'submit' | 'reset'
 variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
 size?: 'sm' | 'md' | 'lg'
 loading?: boolean
 disabled?: boolean
 to?: string
}>(), {
 type: 'button',
 variant: 'primary',
 size: 'md',
 loading: false,
 disabled: false,
 to: undefined,
})

const baseClass = `
 inline-flex
 items-center
 justify-center
 gap-2
 rounded-[10px]
 font-medium
 tracking-[-0.01em]
 outline-none

 transition-[background-color,color,box-shadow,transform,opacity]
 duration-150

 focus-visible:ring-2
 focus-visible:ring-offset-2

 active:scale-[0.98]

 disabled:pointer-events-none
 disabled:opacity-50

 dark:focus-visible:ring-offset-[#0b0c0f]
`

const sizeClass = computed(() => {
 return {
 sm: `
 h-8
 px-3
 text-[13px]
 `,

 md: `
 h-9
 px-3.5
 text-[13px]
 `,

 lg: `
 h-10
 px-4
 text-sm
 `,
 }[props.size]
})

const variantClass = computed(() => {
 return {
 primary: `
 bg-gray-950
 text-white
 shadow-[0_1px_2px_rgba(0,0,0,0.14)]

 hover:bg-gray-800

 focus-visible:ring-gray-950/20

 dark:bg-white
 dark:text-gray-950
 dark:shadow-none
 dark:hover:bg-gray-100
 dark:focus-visible:ring-white/20
 `,

 secondary: `
 bg-gray-950/[0.055]
 text-gray-800

 hover:bg-gray-950/[0.09]

 focus-visible:ring-gray-950/10

 dark:bg-white/[0.08]
 dark:text-gray-100
 dark:hover:bg-white/[0.12]
 dark:focus-visible:ring-white/10
 `,

 ghost: `
 text-gray-600

 hover:bg-gray-950/[0.05]
 hover:text-gray-950

 focus-visible:ring-gray-950/10

 dark:text-gray-400
 dark:hover:bg-white/[0.07]
 dark:hover:text-white
 dark:focus-visible:ring-white/10
 `,

 danger: `
 bg-red-600
 text-white
 shadow-[0_1px_2px_rgba(0,0,0,0.1)]

 hover:bg-red-700

 focus-visible:ring-red-600/20

 dark:bg-red-500
 dark:hover:bg-red-400
 dark:focus-visible:ring-red-500/20
 `,
 }[props.variant]
})

const classes = computed(() => [
 baseClass,
 sizeClass.value,
 variantClass.value,
])
</script>

<template>
 <NuxtLink
 v-if="to"
 :to="to"
 :class="classes"
 :aria-disabled="disabled || loading"
 >
 <span
 v-if="loading"
 class="
 h-3.5
 w-3.5
 animate-spin
 rounded-full
 border-2
 border-current/20
 border-t-current
 "
 />

 <slot />
 </NuxtLink>

 <button
 v-else
 :type="type"
 :disabled="disabled || loading"
 :class="classes"
 >
 <span
 v-if="loading"
 class="
 h-3.5
 w-3.5
 animate-spin
 rounded-full
 border-2
 border-current/20
 border-t-current
 "
 />

 <slot />
 </button>
</template>