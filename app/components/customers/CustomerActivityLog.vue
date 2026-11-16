<script setup lang="ts">
type ActivityLocation = {
  city: string | null
  country_code: string | null
}

type Activity = ActivityLocation & {
  id: number
  action: string
  at: string | null
  ip_address: string | null
  region: string | null
  order_number: string | null
}

const props = defineProps<{ endpoint: string, showOrder?: boolean }>()
const { $api } = useNuxtApp()
const { formatDateTime } = useAppDateTime()
const id = useId()
const expanded = ref(false)
const summary = ref<ActivityLocation | null>(null)
const summaryStatus = ref<'loading' | 'ready' | 'error'>('loading')
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

function formatLocation(entry: ActivityLocation, region?: string | null) {
  const country = entry.country_code ? countries.of(entry.country_code) : null
  return [...new Set([entry.city, region, country].filter(Boolean))].join(', ')
}

const summaryText = computed(() => {
  if (summaryStatus.value === 'loading') return 'Checking location…'
  if (summaryStatus.value === 'error') return 'Could not load location'
  return (summary.value && formatLocation(summary.value)) || 'Location unavailable'
})

async function loadSummary(endpoint: string, signal: AbortSignal) {
  try {
    const response = await $api<{ location: ActivityLocation | null }>(endpoint, { query: { summary: 1 }, signal })
    if (signal.aborted) return
    summary.value = response.location
    summaryStatus.value = 'ready'
  } catch {
    if (!signal.aborted) summaryStatus.value = 'error'
  }
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

watch(() => props.endpoint, (endpoint, _, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  summary.value = null
  summaryStatus.value = 'loading'
  ++requestId
  page.value = 1
  entries.value = []
  loading.value = false
  error.value = ''
  hasMore.value = false
  void loadSummary(endpoint, controller.signal)
  if (expanded.value) void load()
}, { immediate: true })
</script>

<template>
  <section class="rounded-[14px] bg-rose-500/[0.08] p-4 ring-1 ring-inset ring-rose-500/10 dark:bg-rose-500/10 dark:ring-rose-500/20">
    <h3>
      <button
        type="button"
        class="flex w-full items-start justify-between gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-500"
        :aria-labelledby="`${id}-title`"
        :aria-describedby="`${id}-location`"
        :aria-expanded="expanded"
        @click="toggle"
      >
        <span class="min-w-0 space-y-1">
          <span :id="`${id}-title`" class="block text-sm font-semibold text-gray-900 dark:text-white">Customer activity</span>
          <span :id="`${id}-location`" class="block break-words text-xs leading-5 text-rose-800 dark:text-rose-200">{{ summaryText }}</span>
        </span>
        <span aria-hidden="true" class="shrink-0 text-base leading-5 text-rose-700 dark:text-rose-300">{{ expanded ? '−' : '+' }}</span>
      </button>
    </h3>
    <div v-if="expanded" class="mt-3 border-t border-rose-900/10 pt-2 dark:border-rose-300/15" :aria-busy="loading">
      <p v-if="loading && !entries.length" role="status" class="text-sm text-gray-600 dark:text-gray-300">Loading activity…</p>
      <p v-else-if="error" role="alert" class="text-sm text-rose-700 dark:text-rose-300">{{ error }}</p>
      <p v-else-if="!entries.length" class="text-sm text-gray-600 dark:text-gray-300">No activity recorded yet.</p>
      <ol v-if="entries.length" class="divide-y divide-rose-900/10 dark:divide-rose-300/15">
        <li v-for="entry in entries" :key="entry.id" class="space-y-1.5 py-3 text-xs text-gray-600 dark:text-gray-300">
          <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ labels[entry.action] || entry.action.replaceAll('_', ' ') }}</p>
            <time :datetime="entry.at || undefined">{{ formatDateTime(entry.at, 'Date unavailable') }}</time>
          </div>
          <p v-if="showOrder && entry.order_number">{{ entry.order_number }}</p>
          <dl class="grid gap-1">
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <dt class="font-medium">IP address</dt>
              <dd class="break-all">{{ entry.ip_address || 'Unavailable' }}</dd>
            </div>
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <dt class="font-medium">Approximate location</dt>
              <dd class="break-words">{{ formatLocation(entry, entry.region) || 'Unavailable' }}</dd>
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
