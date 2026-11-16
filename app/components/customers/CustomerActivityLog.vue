<script setup lang="ts">
type Activity = {
  id: number
  action: string
  at: string | null
  ip_address: string | null
  city: string | null
  region: string | null
  country_code: string | null
  order_number: string | null
}

const props = defineProps<{ endpoint: string, showOrder?: boolean }>()
const { $api } = useNuxtApp()
const { formatDateTime } = useAppDateTime()
const expanded = ref(false)
const loading = ref(false)
const error = ref('')
const entries = ref<Activity[]>([])
const page = ref(1)
const hasMore = ref(false)
let requestId = 0
const countries = new Intl.DisplayNames(['en'], { type: 'region' })
const labels: Record<string, string> = {
  registered: 'Account registered',
  signed_in: 'Signed in',
  signed_out: 'Signed out',
  signed_out_all: 'Signed out on all devices',
  profile_updated: 'Profile updated',
  password_changed: 'Password changed',
  password_reset: 'Password reset',
  email_verified: 'Email verified',
  phone_verified: 'Phone verified',
  address_added: 'Address added',
  address_updated: 'Address updated',
  address_removed: 'Address removed',
  wishlist_added: 'Item added to wishlist',
  wishlist_removed: 'Item removed from wishlist',
  order_placed: 'Order placed',
  order_details_updated: 'Order details updated',
  replacement_confirmed: 'Replacement confirmed',
  order_cancelled: 'Order cancelled by customer',
}

function location(entry: Activity) {
  const country = entry.country_code ? countries.of(entry.country_code) : null
  return [...new Set([entry.city, entry.region, country].filter(Boolean))].join(', ') || 'Unavailable'
}

async function load(targetPage = page.value) {
  const id = ++requestId
  loading.value = true
  error.value = ''
  try {
    const response = await $api<{ data: Activity[], has_more: boolean }>(props.endpoint, { query: { page: targetPage } })
    if (id !== requestId) return
    entries.value = response.data
    hasMore.value = response.has_more
    page.value = targetPage
  } catch {
    if (id === requestId) error.value = 'Could not load customer activity.'
  } finally {
    if (id === requestId) loading.value = false
  }
}

function toggle() {
  expanded.value = !expanded.value
  if (expanded.value) void load()
}

watch(() => props.endpoint, () => {
  ++requestId
  page.value = 1
  entries.value = []
  hasMore.value = false
  if (expanded.value) void load()
})
</script>

<template>
  <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
    <h3>
      <button type="button" class="flex min-h-8 w-full items-center justify-between gap-3 text-left text-sm font-semibold" :aria-expanded="expanded" @click="toggle">
        Customer activity
        <span aria-hidden="true" class="text-base font-normal text-gray-500 dark:text-gray-400">{{ expanded ? '−' : '+' }}</span>
      </button>
    </h3>
    <div v-if="expanded" class="mt-2" :aria-busy="loading">
      <p v-if="loading && !entries.length" role="status" class="text-sm text-gray-600 dark:text-gray-300">Loading activity…</p>
      <p v-else-if="error" role="alert" class="text-sm text-rose-700 dark:text-rose-300">{{ error }}</p>
      <p v-else-if="!entries.length" class="text-sm text-gray-600 dark:text-gray-300">No activity recorded yet.</p>
      <ol v-if="entries.length" class="divide-y divide-gray-200 dark:divide-white/10">
        <li v-for="entry in entries" :key="entry.id" class="space-y-1.5 py-3 text-xs text-gray-600 dark:text-gray-300">
          <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ labels[entry.action] || entry.action.replaceAll('_', ' ') }}</p>
            <time :datetime="entry.at || undefined">{{ formatDateTime(entry.at, 'Date unavailable') }}</time>
          </div>
          <p v-if="showOrder && entry.order_number">{{ entry.order_number }}</p>
          <dl class="grid gap-x-5 gap-y-1 sm:grid-cols-2">
            <div class="flex flex-wrap gap-x-1.5">
              <dt class="font-medium">IP address</dt>
              <dd class="break-all">{{ entry.ip_address || 'Unavailable' }}</dd>
            </div>
            <div class="flex flex-wrap gap-x-1.5">
              <dt class="font-medium">Approximate location</dt>
              <dd>{{ location(entry) }}</dd>
            </div>
          </dl>
        </li>
      </ol>
      <div class="mt-2 flex flex-wrap justify-end gap-2">
        <AppButton v-if="error" type="button" variant="secondary" :disabled="loading" @click="load()">Retry</AppButton>
        <AppButton v-if="page > 1" type="button" variant="secondary" :disabled="loading" @click="load(page - 1)">Previous</AppButton>
        <AppButton v-if="hasMore" type="button" variant="secondary" :disabled="loading" @click="load(page + 1)">Next</AppButton>
      </div>
    </div>
  </section>
</template>
