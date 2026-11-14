<script setup lang="ts">
import { couponTermsPayload, couponTermsReady, type CouponTerms } from '~/components/coupons/CouponTermsFields.vue'

import { normalizeCouponCode, validCouponCode } from '~/components/coupons/CouponCodeField.vue'
import type { CouponCustomer } from '~/components/coupons/CouponCustomerPicker.vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })

type Coupon = {
 id: number
 code: string
 type: 'percent' | 'fixed'
 value: string
 scope: 'open' | 'customer'
 customer_email: string | null
 customer_id: number | null
 eligible_customers_count?: number
 expires_at: string | null
 usage_limit: number | null
 uses: number
 is_active: boolean
}

const { $api } = useNuxtApp()
const { formatDateTime } = useAppDateTime()
const terms = ref<CouponTerms>({ type: 'percent', value: null, scope: 'open', valid_hours: null, usage_limit: null })
const code = ref('')
const selected = ref<CouponCustomer[]>([])
const canCreate = computed(() => couponTermsReady(terms.value) && validCouponCode(normalizeCouponCode(code.value))
 && (terms.value.scope !== 'customer' || selected.value.length > 0))
const search = ref('')
const filter = ref('')
const page = ref(1)
const saving = ref(false)
const updating = ref<number | null>(null)
const actionError = ref('')
const notice = ref('')
const { data, pending, error, refresh } = useAsyncData('admin-coupons', () =>
 $api<{ data: Coupon[], last_page: number }>('/admin/coupons', { query: { page: page.value, search: filter.value || undefined } }),
 { watch: [page, filter] },
)

function searchCoupons() {
 page.value = 1
 filter.value = search.value.trim()
}

async function createCoupon() {
 if (!canCreate.value || saving.value) return
 saving.value = true
 actionError.value = ''
 notice.value = ''
 try {
  const response = await $api<{ data: Coupon }>('/admin/coupons', {
   method: 'POST',
   body: {
    ...couponTermsPayload(terms.value),
    code: normalizeCouponCode(code.value) || null,
    ...(terms.value.scope === 'customer' ? { customer_ids: selected.value.map(customer => customer.id) } : {}),
   },
  })
  notice.value = `Created coupon ${response.data.code}.`
  code.value = ''
  selected.value = []
  terms.value = { type: 'percent', value: null, scope: 'open', valid_hours: null, usage_limit: null }
  if (page.value === 1 && !filter.value) await refresh()
  else {
   search.value = ''
   searchCoupons()
  }
 } catch (e) {
  actionError.value = extractApiErrorMessage(e, 'Could not create the coupon.')
 } finally {
  saving.value = false
 }
}

async function toggleCoupon(coupon: Coupon) {
 if (updating.value !== null) return
 updating.value = coupon.id
 actionError.value = ''
 notice.value = ''
 try {
  await $api(`/admin/coupons/${coupon.id}`, { method: 'PATCH', body: { is_active: !coupon.is_active } })
  await refresh()
 } catch (e) {
  actionError.value = extractApiErrorMessage(e, 'Could not update the coupon.')
 } finally {
  updating.value = null
 }
}

function audience(coupon: Coupon) {
 if (coupon.scope === 'open') return 'Anyone with the code'
 if (coupon.eligible_customers_count) return `${coupon.eligible_customers_count} selected ${coupon.eligible_customers_count === 1 ? 'customer' : 'customers'}`
 return coupon.customer_email || (coupon.customer_id ? `Customer #${coupon.customer_id}` : 'Customer only')
}

function status(coupon: Coupon) {
 if (!coupon.is_active) return 'Disabled'
 if (coupon.expires_at && Date.parse(coupon.expires_at) <= Date.now()) return 'Expired'
 if (coupon.usage_limit !== null && coupon.uses >= coupon.usage_limit) return 'Fully used'
 return 'Active'
}

</script>

<template>
 <div class="space-y-6">
  <h1 class="text-2xl font-semibold tracking-tight">Coupons</h1>
  <form class="max-w-3xl space-y-4 rounded-2xl border border-gray-950/10 p-5 dark:border-white/10" @submit.prevent="createCoupon">
   <h2 class="font-semibold">Create a coupon</h2>
   <CouponCodeField v-model="code" :disabled="saving" />
   <CouponTermsFields v-model="terms" :disabled="saving" multiple-customers />
   <div v-if="terms.scope === 'customer'" class="space-y-2">
    <CouponCustomerPicker v-model="selected" :disabled="saving" />
    <p class="text-sm text-gray-600 dark:text-gray-400">Selected customers can use the code through their verified SAAJ account or their matching private replacement link. The total-use limit is shared across the coupon.</p>
   </div>
   <p class="text-sm text-gray-600 dark:text-gray-400">Leave validity or total uses blank for no expiry or unlimited uses.</p>
   <AppButton type="submit" :loading="saving" :disabled="!canCreate">Create coupon</AppButton>
  </form>
  <p v-if="notice" class="text-sm font-medium" role="status">{{ notice }}</p>
  <p v-if="actionError" role="alert" class="text-sm text-red-700 dark:text-red-300">{{ actionError }}</p>
  <section class="space-y-4 rounded-2xl border border-gray-950/10 p-5 dark:border-white/10">
   <h2 class="font-semibold">Coupon list</h2>
   <form class="flex max-w-md items-end gap-2" @submit.prevent="searchCoupons">
    <AppInput v-model="search" class="flex-1" label="Find a coupon" placeholder="Search by code" />
    <AppButton type="submit">Search</AppButton>
   </form>
   <p v-if="pending" role="status" class="text-sm">Loading coupons…</p>
   <p v-else-if="error" role="alert" class="text-sm">Could not load coupons. <button class="underline" @click="refresh()">Try again</button></p>
   <p v-else-if="!data?.data.length" class="text-sm text-gray-600 dark:text-gray-400">No coupons found.</p>
   <div v-else class="overflow-x-auto">
    <table class="w-full whitespace-nowrap text-left text-sm">
     <thead class="text-gray-600 dark:text-gray-400">
      <tr>
       <th scope="col" class="px-2 py-2">Code</th>
       <th scope="col" class="px-2 py-2">Discount</th>
       <th scope="col" class="px-2 py-2">Access</th>
       <th scope="col" class="px-2 py-2">Expires</th>
       <th scope="col" class="px-2 py-2">Uses</th>
       <th scope="col" class="px-2 py-2">Status</th>
       <th scope="col" class="px-2 py-2">Action</th>
      </tr>
     </thead>
     <tbody>
      <tr v-for="coupon in data.data" :key="coupon.id" class="border-t border-gray-950/10 dark:border-white/10">
       <th scope="row" class="px-2 py-3 font-semibold">{{ coupon.code }}</th>
       <td class="px-2 py-3">{{ coupon.type === 'percent' ? Number(coupon.value) + '%' : 'Rs ' + Number(coupon.value).toLocaleString('en-PK') }}</td>
       <td class="px-2 py-3">{{ audience(coupon) }}</td>
       <td class="px-2 py-3">{{ formatDateTime(coupon.expires_at, 'No expiry') }}</td>
       <td class="px-2 py-3">{{ coupon.uses }}{{ coupon.usage_limit === null ? ' / Unlimited' : ' / ' + coupon.usage_limit }}</td>
       <td class="px-2 py-3">{{ status(coupon) }}</td>
       <td class="px-2 py-3"><button type="button" class="py-1 font-semibold underline underline-offset-4 disabled:opacity-50" :disabled="updating !== null" @click="toggleCoupon(coupon)">{{ coupon.is_active ? 'Disable' : 'Enable' }}</button></td>
      </tr>
     </tbody>
    </table>
   </div>
   <div v-if="data && data.last_page > 1" class="flex items-center gap-4 text-sm">
    <AppButton type="button" :disabled="page === 1 || pending" @click="page--">Previous</AppButton>
    <span>{{ page }} / {{ data.last_page }}</span>
    <AppButton type="button" :disabled="page >= data.last_page || pending" @click="page++">Next</AppButton>
   </div>
  </section>
 </div>
</template>
