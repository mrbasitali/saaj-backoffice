<script setup lang="ts">
definePageMeta({
 middleware: 'guest',
})

const auth = useAuthStore()
const { theme, toggleTheme } = useTheme()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const statusMessage = ref('')

async function submit() {
 errorMessage.value = ''
 statusMessage.value = 'Checking credentials...'

 try {
 await auth.login(email.value, password.value)

 statusMessage.value = 'Opening dashboard...'

 await navigateTo('/')
 } catch (error: any) {
 statusMessage.value = ''

 errorMessage.value =
 error?.data?.message || 'Login failed. Please check your email and password.'
 }
}
</script>

<template>
 <main class="min-h-screen bg-[#f4f5f7] px-4 py-8 text-gray-950 dark:bg-[#09090b] dark:text-white">
 <div class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
 <div class="grid w-full overflow-hidden rounded-[24px] bg-white shadow-[0_12px_45px_rgba(17,24,39,0.08)] dark:bg-[#111214] dark:shadow-[0_16px_50px_rgba(0,0,0,0.28)] lg:grid-cols-[1fr_0.9fr]">
 <section class="hidden bg-[#111214] p-10 text-white dark:bg-[#070708] lg:flex lg:flex-col lg:justify-between">
 <div>
 <div class="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white text-base font-bold text-gray-950">
 S
 </div>

 <h1 class="mt-8 max-w-md text-[34px] font-semibold tracking-[-0.035em]">
 Saaj backoffice for retail operations.
 </h1>

 <p class="mt-4 max-w-md text-sm leading-6 text-white/60">
 Manage catalog, inventory, purchases, POS sales, customers, payments and reports from one clean control center.
 </p>
 </div>

 <div class="grid grid-cols-3 gap-3 text-sm">
 <div class="rounded-[12px] bg-white/[0.055] p-4">
 <p class="font-semibold">Catalog</p>
 <p class="mt-1 text-xs text-white/50">Products & variants</p>
 </div>

 <div class="rounded-[12px] bg-white/[0.055] p-4">
 <p class="font-semibold">Retail</p>
 <p class="mt-1 text-xs text-white/50">Sales & returns</p>
 </div>

 <div class="rounded-[12px] bg-white/[0.055] p-4">
 <p class="font-semibold">ERP</p>
 <p class="mt-1 text-xs text-white/50">Stock & reports</p>
 </div>
 </div>
 </section>

 <section class="p-6 sm:p-8 lg:p-10">
 <div class="mb-8 flex items-center justify-between">
 <div class="lg:hidden">
 <div class="flex h-10 w-10 items-center justify-center rounded-[11px] bg-gray-950 text-sm font-bold text-white dark:bg-white dark:text-gray-950">
 S
 </div>
 </div>

 <AppButton
 variant="secondary"
 size="sm"
 class="ml-auto"
 @click="toggleTheme"
 >
 <span>{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
 <span class="hidden sm:inline">
 {{ theme === 'dark' ? 'Light' : 'Dark' }}
 </span>
 </AppButton>
 </div>

 <div class="mx-auto max-w-md">
 <div class="mb-8">
 <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
 Welcome back
 </p>

 <h2 class="mt-2 text-[27px] font-semibold tracking-[-0.03em] text-gray-950 dark:text-white">
 Sign in to Saaj
 </h2>

 <p class="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
 Use your admin account to continue.
 </p>
 </div>

 <form
 class="space-y-5"
 @submit.prevent="submit"
 >
 <AppInput
 v-model="email"
 label="Email address"
 type="email"
 autocomplete="email"
 placeholder="admin@example.com"
 required
 />

 <AppPasswordInput
 v-model="password"
 label="Password"
 placeholder="Enter your password"
 required
 />

 <div
 v-if="errorMessage"
 class="rounded-[12px] bg-red-500/[0.07] p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
 >
 {{ errorMessage }}
 </div>

 <div
 v-if="statusMessage"
 class="rounded-[12px] bg-gray-950/[0.035] p-3.5 text-[12px] text-gray-600 dark:bg-white/[0.055] dark:text-gray-300"
 aria-live="polite"
 >
 {{ statusMessage }}
 </div>

 <AppButton
 type="submit"
 size="lg"
 class="w-full"
 :loading="auth.loading"
 >
 {{ auth.loading ? 'Signing in...' : 'Sign in' }}
 </AppButton>
 </form>
 </div>
 </section>
 </div>
 </div>
 </main>
</template>