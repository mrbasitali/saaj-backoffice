<script setup lang="ts">
import { couponTermsPayload, couponTermsReady, type CouponTerms } from '~/components/coupons/CouponTermsFields.vue'

import { normalizeCouponCode, validCouponCode } from '~/components/coupons/CouponCodeField.vue'

type Variant = { id: number, sku?: string | null, name?: string | null, option_summary?: string | null, is_active: boolean, price?: number | string | null, sale_price?: number | string | null }
type Product = { id: number, name: string, storefront_sold_out?: boolean, variants?: Variant[] }
type Item = { id?: number, product_variant_id: number | null, quantity: number, unit_price?: number | string, discount_amount?: number | string, tax_amount?: number | string, variant?: { name?: string | null, product?: { name: string } | null } | null }
type Invoice = {
 id: number
 invoice_number: string
 customer_email?: string | null
 customer_phone?: string | null
 customer?: { email: string | null, phone: string | null } | null
 shipping_recipient_phone?: string | null
 grand_total: number | string
 items?: Item[]
}

const props = defineProps<{ invoice: Invoice, item: Item }>()
const emit = defineEmits<{ close: [], updated: [] }>()
const { $api } = useNuxtApp()

const action = ref<'notify' | 'replace' | 'cancel'>('notify')
const email = computed(() => props.invoice.customer_email || props.invoice.customer?.email)
const phone = computed(() => props.invoice.shipping_recipient_phone || props.invoice.customer_phone || props.invoice.customer?.phone)
const notifyEmail = ref(Boolean(email.value))
const notifySms = ref(!email.value && Boolean(phone.value))
const itemName = props.item.variant?.product?.name || props.item.variant?.name || 'one of your items'
const message = ref(`SAAJ order ${props.invoice.invoice_number}: We’re sorry, ${itemName} is out of stock. Use your private link to shop for a replacement, review the updated cash-on-delivery total, or cancel your order now.`)
const smsMessage = ref('SAAJ: Action needed. An item you chose is out of stock.')
const includeCoupon = ref(false)
const couponValidity = ref('')
const couponCode = ref('')
const normalizedCode = computed(() => normalizeCouponCode(couponCode.value))
const coupon = ref<CouponTerms>({ type: 'percent', value: null, scope: 'customer', valid_hours: null, usage_limit: '1' })
const couponReady = computed(() => couponTermsReady(coupon.value) && validCouponCode(normalizedCode.value)
 && (couponValidity.value === 'unlimited' || !!coupon.value.valid_hours))
const couponPreview = computed(() => {
 if (!includeCoupon.value) return ''
 const terms = couponTermsPayload(coupon.value)
 const amount = terms.value > 0
  ? (terms.type === 'percent' ? `${terms.value}%` : `Rs ${terms.value}`)
  : '[discount]'
 const hours = terms.valid_hours ?? 0
 const days = hours > 0 && hours % 24 === 0 ? hours / 24 : 0
 const duration = days ? `${days} ${days === 1 ? 'day' : 'days'}` : `${hours} ${hours === 1 ? 'hour' : 'hours'}`
 const expiry = couponValidity.value === 'unlimited'
  ? 'No expiry date.'
  : hours > 0 ? `Valid for ${duration} from sending.` : '[Validity to be set]'
 const orders = terms.scope === 'customer' ? 'any of your SAAJ orders' : 'any SAAJ order'
 const limit = terms.usage_limit ?? 1
 return `As an apology, use ${normalizedCode.value || '[coupon code]'} for ${amount} off ${orders}, including your replacement. ${expiry} ${limit === 1 ? 'One use.' : `Limit of ${limit} uses.`}`
})
const deadlineChoice = ref('24')
const deadlineOptions = [
 { value: '6', label: '6 hours' },
 { value: '24', label: '24 hours' },
 { value: '48', label: '48 hours' },
 { value: 'custom', label: 'Custom' },
]
const customHours = ref<number | string>('')
const deadlineHours = computed(() => Number(deadlineChoice.value === 'custom' ? customHours.value : deadlineChoice.value))
const validDeadline = computed(() => Number.isInteger(deadlineHours.value) && deadlineHours.value >= 1 && deadlineHours.value <= 720)
const deadlinePreview = computed(() => validDeadline.value
 ? `If you do not confirm a replacement within ${deadlineHours.value} ${deadlineHours.value === 1 ? 'hour' : 'hours'}, your order will automatically be cancelled.`
 : '')
const search = ref('')
const searchResults = ref<Product[]>([])
const searching = ref(false)
const searchFailed = ref(false)
const replacementId = ref('')
const unitPrice = ref<number | string>('')
const restock = ref(false)
const acknowledge = ref(false)
const saving = ref(false)
const error = ref('')
const result = ref('')
const panel = ref<HTMLElement | null>(null)

function onEscape() {
 if (!saving.value) emit('close')
}

onMounted(() => panel.value?.closest('dialog')?.addEventListener('cancel', onEscape))
onBeforeUnmount(() => panel.value?.closest('dialog')?.removeEventListener('cancel', onEscape))
const usedVariants = computed(() => new Set((props.invoice.items ?? []).map(item => item.product_variant_id)))
const choices = computed(() => searchResults.value.filter(product => !product.storefront_sold_out)
 .flatMap(product => (product.variants ?? [])
 .filter(variant => variant.is_active && !usedVariants.value.has(variant.id))
 .map(variant => ({ label: [product.name, variant.option_summary || variant.name, variant.sku].filter(Boolean).join(' · '), value: String(variant.id), variant }))))
const selectedVariant = computed(() => choices.value.find(option => option.value === replacementId.value)?.variant)

watch(selectedVariant, (variant) => {
 if (!variant) return
 const regular = Number(variant.price ?? 0)
 unitPrice.value = variant.sale_price != null ? Math.min(regular, Number(variant.sale_price)) : regular
})

watch([search, action], ([term, currentAction], _, onCleanup) => {
 let active = true
 replacementId.value = ''
 searchResults.value = []
 searchFailed.value = false
 searching.value = currentAction === 'replace'
 if (currentAction !== 'replace') return

 const timer = setTimeout(async () => {
  try {
   const response = await $api<{ data: Product[] }>('/admin/products', {
    query: { search: term.trim() || undefined, include_variants: 1, is_active: 1, per_page: 40 },
   })
   if (active) searchResults.value = response.data
  } catch {
   if (active) searchFailed.value = true
  } finally {
   if (active) searching.value = false
  }
 }, 250)

 onCleanup(() => { active = false; clearTimeout(timer) })
})

const preview = computed(() => message.value.trim())
const smsPreview = computed(() => smsMessage.value.trim().replaceAll('’', "'").replaceAll('‘', "'").replaceAll('—', '-'))
const revisedTotal = computed(() => {
 if (!selectedVariant.value || unitPrice.value === '') return null
 const originalTotal = props.item.quantity * Number(props.item.unit_price ?? 0) - Number(props.item.discount_amount ?? 0) + Number(props.item.tax_amount ?? 0)
 return Number(props.invoice.grand_total) - originalTotal + props.item.quantity * Number(unitPrice.value)
})
const canSubmit = computed(() => {
 if (saving.value || result.value) return false
 if (action.value === 'notify') return validDeadline.value && (!notifyEmail.value || !!message.value.trim())
  && (!notifySms.value || !!smsPreview.value) && (notifyEmail.value || notifySms.value)
  && (!includeCoupon.value || couponReady.value)
 return acknowledge.value && (action.value === 'cancel' || (replacementId.value && unitPrice.value !== '' && Number(unitPrice.value) >= 0))
})

async function submit() {
 if (!canSubmit.value) return
 saving.value = true
 error.value = ''

 try {
  const response = await $api<{ message: string, replacement_deadline?: string | null, coupon_code?: string | null, notification: { email: boolean | null, sms: boolean | null } }>(`/admin/sale-invoices/${props.invoice.id}/stock-issue`, {
   method: 'POST',
   body: {
    action: action.value,
    item_id: props.item.id,
    original_variant_id: props.item.product_variant_id,
    ...(action.value === 'notify' ? {
     cancel_after_hours: deadlineHours.value, message: preview.value || smsPreview.value, sms_message: smsPreview.value, notify_email: notifyEmail.value, notify_sms: notifySms.value,
     ...(includeCoupon.value ? { coupon: { ...couponTermsPayload(coupon.value), code: normalizedCode.value || null } } : {}),
    } : { restock_original: restock.value, customer_agreed: acknowledge.value }),
    ...(action.value === 'replace' ? { replacement_variant_id: Number(replacementId.value), unit_price: Number(unitPrice.value) } : {}),
   },
  })
  const channels = [
   response.notification.email === null ? null : response.notification.email ? 'Email sent.' : 'Email could not be sent.',
   response.notification.sms === null ? null : response.notification.sms ? 'SMS accepted by the provider.' : 'SMS could not be sent.',
  ].filter(Boolean)
  if (channels.length && !response.notification.email && !response.notification.sms) {
   error.value = channels.join(' ') + ' The new cancellation deadline was not activated.'
   return
  }
  if (response.replacement_deadline) channels.push(`Cancellation deadline: ${response.replacement_deadline}.`)
  if (response.coupon_code) channels.push(`Coupon ${response.coupon_code} created.`)
  result.value = channels.length ? channels.join(' ') : response.message
  emit('updated')
 } catch (e) {
  error.value = extractApiErrorMessage(e, 'Could not update this order.')
 } finally {
  saving.value = false
 }
}
</script>

<template>
 <form ref="panel" class="space-y-4 p-5 sm:p-6" @submit.prevent="submit">
  <header class="flex items-start justify-between gap-4">
   <div>
    <h3 id="invoice-stock-issue-title" class="text-lg font-semibold">Item out of stock</h3>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ itemName }} · {{ invoice.invoice_number }}</p>
   </div>
   <button type="button" autofocus class="shrink-0 rounded-md px-2 py-1 text-xs font-semibold hover:bg-gray-950/5 dark:hover:bg-white/10" :disabled="saving" @click="emit('close')">Close</button>
  </header>

  <div v-if="result" role="status" class="rounded-xl bg-gray-950/5 p-4 text-sm dark:bg-white/10">{{ result }}</div>
  <template v-else>
   <div class="flex flex-wrap gap-2" aria-label="Order action">
    <button
     v-for="option in [{ value: 'notify', label: 'Notify customer' }, { value: 'replace', label: 'Replace item' }, { value: 'cancel', label: 'Cancel order' }] as const"
     :key="option.value"
     type="button"
     :aria-pressed="action === option.value"
     class="rounded-md border px-3 py-2 text-xs font-semibold"
     :class="action === option.value ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-950' : 'border-gray-300 dark:border-white/25'"
     :disabled="saving"
     @click="action = option.value; acknowledge = false; error = ''"
    >{{ option.label }}</button>
   </div>

   <template v-if="action === 'notify'">
    <fieldset class="grid gap-2 text-sm">
     <legend class="mb-2 font-semibold">Send via</legend>
     <AppToggle v-model="notifyEmail" label="Email" :description="email || 'Unavailable'" role="switch" :aria-checked="notifyEmail" :disabled="!email || saving" />
     <AppToggle v-model="notifySms" label="SMS" :description="phone || 'Unavailable'" role="switch" :aria-checked="notifySms" :disabled="!phone || saving" />
    </fieldset>
    <div class="grid gap-3 sm:grid-cols-2">
     <AppSelect v-model="deadlineChoice" label="Cancel if no replacement after" :options="deadlineOptions" :disabled="saving" />
     <label v-if="deadlineChoice === 'custom'" class="block text-sm font-semibold">
      Custom hours
      <input v-model.number="customHours" required type="number" min="1" max="720" step="1" :disabled="saving" class="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal dark:border-white/20 dark:bg-[#17181b]">
     </label>
    </div>
    <label v-if="notifyEmail" class="block text-sm font-semibold">
     Email message
     <textarea v-model="message" rows="4" maxlength="1000" class="mt-2 w-full rounded-lg border border-gray-300 bg-transparent p-3 text-sm font-normal dark:border-white/20" :disabled="saving" />
    </label>
    <label v-if="notifySms" class="block text-sm font-semibold">
     SMS opening line
     <textarea v-model="smsMessage" rows="2" maxlength="180" class="mt-2 w-full rounded-lg border border-gray-300 bg-transparent p-3 text-sm font-normal dark:border-white/20" :disabled="saving" />
    </label>
    <fieldset class="space-y-3 rounded-xl border border-gray-950/10 p-3 dark:border-white/10">
     <AppToggle v-model="includeCoupon" label="Include a compensation coupon" description="Creates a coupon when you send this notice and saves it in Settings → Coupons." role="switch" :aria-checked="includeCoupon" :disabled="saving" />
     <CouponCodeField v-if="includeCoupon" v-model="couponCode" :disabled="saving" />
     <CouponTermsFields v-if="includeCoupon" v-model="coupon" v-model:validity="couponValidity" :disabled="saving" choose-validity default-limit />
     <p v-if="includeCoupon && !couponReady" class="text-xs text-gray-600 dark:text-gray-300">Set the discount and validity to continue.</p>
    </fieldset>
    <div v-if="notifyEmail || notifySms" class="space-y-4 rounded-lg bg-gray-950/5 p-3 text-sm dark:bg-white/10">
     <div v-if="notifyEmail" class="space-y-2">
      <p class="text-xs font-semibold">Email preview</p>
      <p class="whitespace-pre-wrap break-words">{{ preview }}</p>
      <p>{{ deadlinePreview }}</p>
      <p v-if="couponPreview">{{ couponPreview }}</p>
      <p class="font-semibold">Shop replacements or cancel order</p>
      <p class="text-gray-600 dark:text-gray-300">[Private replacement link]</p>
     </div>
     <div v-if="notifySms" class="space-y-2">
      <p class="text-xs font-semibold">SMS preview</p>
      <p class="whitespace-pre-wrap break-words">{{ smsPreview }}</p>
      <p>Choose a replacement or cancel:<br>[private replacement link]</p>
      <p v-if="couponPreview">{{ couponPreview }}</p>
      <p>Confirm by [deadline] to avoid automatic cancellation.</p>
     </div>
    </div>
    <p class="text-xs text-gray-600 dark:text-gray-300">The message includes the exact deadline. A successful resend replaces the previous link and deadline.</p>
   </template>

   <template v-else>
    <template v-if="action === 'replace'">
     <AppInput v-model="search" label="Search products" placeholder="Product name or SKU" />
     <AppSelect
      v-model="replacementId"
      label="Replacement variant"
      :options="choices"
      :placeholder="searchFailed ? 'Could not load products. Try another search.' : choices.length ? 'Choose a variant' : 'No matching variants'"
      :loading="searching"
      :disabled="searching || saving"
      searchable
     />
     <AppInput v-model="unitPrice" type="number" step="0.01" min="0" label="Agreed unit price" />
     <p v-if="revisedTotal !== null && revisedTotal >= 0" class="rounded-lg bg-gray-950/5 p-3 text-sm font-semibold dark:bg-white/10">
      Revised COD total: Rs {{ revisedTotal.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
     </p>
     <p class="text-sm text-gray-600 dark:text-gray-300">The replacement uses the original quantity ({{ item.quantity }}). The COD total updates using the agreed price and existing shipping charge.</p>
    </template>
    <p v-else class="text-sm text-gray-600 dark:text-gray-300">Cancels the entire order, clears the amount due, and releases stock for the other items.</p>
    <AppToggle v-model="restock" label="Return the original item to sellable inventory" role="switch" :aria-checked="restock" :disabled="saving" />
    <AppToggle v-model="acknowledge" label="The customer agreed to this change" role="switch" :aria-checked="acknowledge" :disabled="saving" />
   </template>

   <p v-if="error" role="alert" class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
   <div class="flex justify-end">
    <AppButton type="submit" :loading="saving" :disabled="!canSubmit">{{ action === 'notify' ? (includeCoupon ? 'Create coupon and send' : 'Send notification') : action === 'replace' ? 'Save replacement' : 'Cancel order' }}</AppButton>
   </div>
  </template>
 </form>
</template>
