<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

type ZoneLocation = {
  id: number
  country_id: number
  country_name: string | null
  state_id: number | null
  state_name: string | null
  city_id: number | null
  city_name: string | null
  scope: 'country' | 'state' | 'city'
}

type ShippingZone = {
  id: number
  name: string
  locations: ZoneLocation[]
  base_price: string | number
  price_per_item: string | number
  free_shipping_threshold: string | number | null
  is_default: boolean
  is_active: boolean
  sort_order: number
}

type ShippingZoneIndexResponse = {
  data: ShippingZone[]
  meta: { total: number }
}

const { $api } = useNuxtApp()

const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const selectedZone = ref<ShippingZone | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const zoneToDelete = ref<ShippingZone | null>(null)

const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const {
  data,
  pending,
  error,
  refresh,
} = useAsyncData(
  'admin-shipping-zones',
  () => $api<ShippingZoneIndexResponse>('/admin/shipping-zones', {
    query: { per_page: 100, sort_by: 'sort_order' },
  }),
  { immediate: true },
)

const zones = computed(() => data.value?.data ?? [])

function money(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '—'

  return Number(value).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function locationsSummary(zone: ShippingZone): string {
  if (!zone.locations || zone.locations.length === 0) return 'No locations set'

  return zone.locations
    .map((location) => {
      if (location.scope === 'city') return location.city_name
      if (location.scope === 'state') return `${location.state_name} (all cities)`

      return `${location.country_name} (entire country)`
    })
    .join(', ')
}

function showNotice(message: string) {
  notice.value = message

  if (noticeTimer.value) clearTimeout(noticeTimer.value)

  noticeTimer.value = setTimeout(() => { notice.value = '' }, 3000)
}

function openCreate() {
  selectedZone.value = null
  formMode.value = 'create'
  formOpen.value = true
}

function openEdit(zone: ShippingZone) {
  selectedZone.value = zone
  formMode.value = 'edit'
  formOpen.value = true
}

async function afterSaved() {
  formOpen.value = false
  await refresh()
  showNotice(formMode.value === 'create' ? 'Shipping zone created successfully.' : 'Shipping zone updated successfully.')
}

function askDelete(zone: ShippingZone) {
  zoneToDelete.value = zone
  deleteError.value = ''
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!zoneToDelete.value) return

  deleting.value = true
  deleteError.value = ''

  try {
    await $api(`/admin/shipping-zones/${zoneToDelete.value.id}`, { method: 'DELETE' })
    deleteOpen.value = false
    showNotice('Shipping zone deleted successfully.')
    await refresh()
  } catch (err: any) {
    deleteError.value = extractApiErrorMessage(err, 'Could not delete this shipping zone.')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-[1100px]">
    <div class="space-y-4 sm:space-y-5">
      <AppPageHeader
        eyebrow="Settings"
        title="Shipping Zones"
        description="A customer's city is matched to a zone at checkout — city-specific rules beat province-wide rules, which beat country-wide rules. Unmatched locations fall back to whichever zone is marked Default."
      >
        <template #actions>
          <AppButton
            variant="secondary"
            :loading="pending"
            @click="refresh"
          >
            {{ pending ? 'Refreshing...' : 'Refresh' }}
          </AppButton>

          <AppButton @click="openCreate">
            Add zone
          </AppButton>
        </template>
      </AppPageHeader>

      <div
        v-if="notice"
        class="rounded-[12px] bg-emerald-500/[0.07] p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      >
        {{ notice }}
      </div>

      <AppErrorState
        v-if="error"
        title="Shipping zones could not be loaded"
        message="Please check backend API, authentication token, or route permissions."
        @retry="refresh"
      />

      <AppEmptyState
        v-else-if="zones.length === 0"
        title="No shipping zones yet"
        message="Add your first zone — at least one should be marked Default so checkout always has a fallback rate."
      >
        <template #actions>
          <AppButton @click="openCreate">
            Add zone
          </AppButton>
        </template>
      </AppEmptyState>

      <template v-else>
        <AppCard class="overflow-hidden p-0">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Zone</th>
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Locations</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Base</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Per item</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Free above</th>
                <th class="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Status</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="zone in zones"
                :key="zone.id"
                class="border-b border-gray-50 last:border-0 dark:border-white/5"
              >
                <td class="px-4 py-3">
                  <button
                    type="button"
                    class="text-left"
                    @click="openEdit(zone)"
                  >
                    <p class="text-sm font-semibold text-gray-950 dark:text-white">{{ zone.name }}</p>
                  </button>
                </td>

                <td class="max-w-[220px] px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  <span class="line-clamp-2">{{ locationsSummary(zone) }}</span>
                </td>

                <td class="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">{{ money(zone.base_price) }}</td>
                <td class="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">{{ money(zone.price_per_item) }}</td>
                <td class="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">{{ money(zone.free_shipping_threshold) }}</td>

                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1.5">
                    <AppBadge :variant="zone.is_active ? 'green' : 'red'">
                      {{ zone.is_active ? 'Active' : 'Inactive' }}
                    </AppBadge>

                    <AppBadge
                      v-if="zone.is_default"
                      variant="blue"
                    >
                      Default
                    </AppBadge>
                  </div>
                </td>

                <td class="px-4 py-3 text-right">
                  <AppActionMenu>
                    <template #default="{ close }">
                      <AppActionMenuItem @click="openEdit(zone); close()">
                        Edit zone
                      </AppActionMenuItem>

                      <AppActionMenuItem
                        danger
                        @click="askDelete(zone); close()"
                      >
                        Delete zone
                      </AppActionMenuItem>
                    </template>
                  </AppActionMenu>
                </td>
              </tr>
            </tbody>
          </table>
        </AppCard>
      </template>
    </div>

    <ShippingZoneFormModal
      :open="formOpen"
      :mode="formMode"
      :zone="selectedZone"
      @close="formOpen = false"
      @saved="afterSaved"
    />

    <AppConfirmModal
      :open="deleteOpen"
      title="Delete shipping zone?"
      :message="`This will delete “${zoneToDelete?.name || 'this zone'}”. If it's the default zone, you'll need to assign a different one as default first.`"
      confirm-label="Delete zone"
      :loading="deleting"
      :error="deleteError"
      @close="deleteOpen = false"
      @confirm="confirmDelete"
    />
  </section>
</template>
