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
 <main class="relative flex min-h-screen items-center justify-center bg-[#f5f5f4] px-4 py-10 text-gray-950 dark:bg-[#0b0b0c] dark:text-white">
 <button
 type="button"
 class="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-gray-950/[0.08] bg-white text-sm text-gray-600 transition hover:border-gray-950/20 hover:text-gray-950 dark:border-white/10 dark:bg-[#151517] dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-white"
 :aria-label="theme === 'dark' ? 'Use light theme' : 'Use dark theme'"
 @click="toggleTheme"
 >
 {{ theme === 'dark' ? '☀' : '☾' }}
 </button>

 <section class="w-full max-w-[430px] rounded-[22px] border border-gray-950/[0.07] bg-white px-6 py-8 shadow-[0_18px_60px_rgba(17,24,39,0.07)] dark:border-white/[0.08] dark:bg-[#131315] dark:shadow-[0_22px_70px_rgba(0,0,0,0.34)] sm:px-9 sm:py-10">
 <div class="mb-8">
 <div class="flex h-10 w-10 items-center justify-center rounded-[11px] bg-gray-950 text-sm font-bold tracking-[-0.02em] text-white dark:bg-white dark:text-gray-950">
 S
 </div>

 <p class="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
 SAAJ Backoffice
 </p>

 <h1 class="mt-2 text-[27px] font-semibold tracking-[-0.035em] text-gray-950 dark:text-white">
 Welcome back
 </h1>

 <p class="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
 Sign in with your administrator account.
 </p>
 </div>

 <form class="space-y-5" @submit.prevent="submit">
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
 class="rounded-[11px] bg-red-500/[0.07] px-3.5 py-3 text-[13px] leading-5 text-red-700 dark:bg-red-500/10 dark:text-red-300"
 role="alert"
 >
 {{ errorMessage }}
 </div>

 <div
 v-if="statusMessage"
 class="rounded-[11px] bg-gray-950/[0.035] px-3.5 py-3 text-[12px] text-gray-600 dark:bg-white/[0.055] dark:text-gray-300"
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
 </section>
 </main>
</template>
