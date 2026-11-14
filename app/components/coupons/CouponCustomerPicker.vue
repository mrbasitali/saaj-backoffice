<script lang="ts">
export type CouponCustomer = { id: number; name: string; email: string | null }
</script>

<script setup lang="ts">
defineProps<{ disabled?: boolean }>()
const selected = defineModel<CouponCustomer[]>({ required: true })
const { $api } = useNuxtApp()
const query = ref('')
const matches = ref<CouponCustomer[]>([])
const busy = ref(false)
const failed = ref(false)
const term = computed(() => query.value.trim())
const available = computed(() => matches.value.filter(customer => !selected.value.some(item => item.id === customer.id)))

watch(term, (search, _, onCleanup) => {
 matches.value = []
 failed.value = false
 busy.value = search.length >= 2
 if (!busy.value) return

 const controller = new AbortController()
 const timer = setTimeout(async () => {
  try {
   const response = await $api<{ data: CouponCustomer[] }>('/admin/coupons/customers', {
    query: { search },
    signal: controller.signal,
   })
   if (!controller.signal.aborted) matches.value = response.data
  } catch {
   if (!controller.signal.aborted) failed.value = true
  } finally {
   if (!controller.signal.aborted) busy.value = false
  }
 }, 200)

 onCleanup(() => {
  clearTimeout(timer)
  controller.abort()
 })
})

function add(customer: CouponCustomer) {
 if (selected.value.length >= 100 || selected.value.some(item => item.id === customer.id)) return
 selected.value = [...selected.value, customer]
}

function remove(id: number) {
 selected.value = selected.value.filter(customer => customer.id !== id)
}
</script>

<template>
 <div class="space-y-2">
  <AppInput v-model="query" label="Find customers" type="search" placeholder="Search by name or email" autocomplete="off" :disabled="disabled" :maxlength="150" @keydown.enter.prevent />
  <p v-if="busy" role="status" class="text-xs text-gray-600 dark:text-gray-400">Searching customers…</p>
  <p v-else-if="failed" role="alert" class="text-xs text-red-700 dark:text-red-300">Could not search customers. Try another search.</p>
  <p v-else-if="term.length >= 2 && !available.length" class="text-xs text-gray-600 dark:text-gray-400">No additional customers found.</p>
  <ul v-else-if="available.length" class="max-h-48 divide-y divide-gray-950/10 overflow-auto rounded-lg border border-gray-950/10 dark:divide-white/10 dark:border-white/10">
   <li v-for="customer in available" :key="customer.id">
    <button type="button" class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-950/5 disabled:opacity-50 dark:hover:bg-white/10" :disabled="disabled || selected.length >= 100" :aria-label="`Add ${customer.name}${customer.email ? ', ' + customer.email : ''}`" @click="add(customer)">
     <span class="min-w-0">
      <span class="block truncate font-medium">{{ customer.name }}</span>
      <span class="block truncate text-xs text-gray-600 dark:text-gray-400">{{ customer.email || `Customer #${customer.id}` }}</span>
     </span>
     <span class="shrink-0 text-xs font-semibold" aria-hidden="true">Add</span>
    </button>
   </li>
  </ul>
  <ul v-if="selected.length" aria-label="Selected customers" class="flex flex-wrap gap-2">
   <li v-for="customer in selected" :key="customer.id" class="inline-flex max-w-full items-center gap-1 rounded-full bg-gray-950/[0.07] pl-3 pr-1 text-xs dark:bg-white/10">
    <span class="truncate" :title="customer.email || undefined">{{ customer.name }}</span>
    <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" :disabled="disabled" :aria-label="`Remove ${customer.name}`" @click="remove(customer.id)">×</button>
   </li>
  </ul>
  <p v-if="selected.length >= 100" class="text-xs text-gray-600 dark:text-gray-400">You can select up to 100 customers.</p>
 </div>
</template>
