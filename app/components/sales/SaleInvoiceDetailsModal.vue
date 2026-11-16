<script setup lang="ts">
type Customer = {
 id: number
 code: string
 name: string
 phone: string | null
 email: string | null
}

type InventoryLocation = {
 id: number
 name: string
 code: string
}

type ItemImage = {
 image_url?: string | null
 optimized_urls?: { thumb?: string | null, card?: string | null } | null
}

type Product = {
 id: number
 name: string
 short_description?: string | null
 primary_image?: ItemImage | null
}

type ProductVariant = {
 id: number
 sku: string | null
 barcode: string | null
 name: string | null
 option_summary: string | null
 product?: Product | null
 primary_image?: ItemImage | null
}

type SaleItem = {
 id?: number
 product_variant_id: number | null
 variant?: ProductVariant | null
 storefront_url?: string | null
 quantity: number
 unit_price: string | number
 cost_price?: string | number | null
 discount_amount: string | number
 tax_amount: string | number
 line_total?: string | number
 notes: string | null
}

type SaleInvoice = {
 id: number
 customer_id: number | null
 customer?: Customer | null
 inventory_location_id: number
 location?: InventoryLocation | null
 invoice_number: string
 channel: string
 sale_date: string
 status: string
 payment_status: string
 customer_name: string | null
 customer_phone: string | null
 customer_email?: string | null
 can_resolve_stock_issue?: boolean
 replacement_deadline?: string | null
 details_correction_deadline?: string | null
 customer_contact_url?: string
 status_history?: Array<{ status: string, note: string | null, at: string | null, notify_email: boolean, notify_sms: boolean, email_sent: boolean, sms_sent: boolean }>
 shipping_recipient_name?: string | null
 shipping_recipient_phone?: string | null
 shipping_address_line1?: string | null
 shipping_address_line2?: string | null
 shipping_city?: string | null
 shipping_state?: string | null
 shipping_country?: string | null
 shipping_postal_code?: string | null
 subtotal: string | number
 discount_total: string | number
 invoice_discount_amount: string | number
 tax_total: string | number
 shipping_cost: string | number
 grand_total: string | number
 paid_amount: string | number
 balance_amount: string | number
 completed_at: string | null
 created_at?: string | null
 notes: string | null
 items?: SaleItem[]
}

const props = defineProps<{
 open: boolean
 invoice: SaleInvoice | null
 printing?: boolean
}>()

const emit = defineEmits<{
 close: []
 printInvoice: [invoice: SaleInvoice]
 printThermal80: [invoice: SaleInvoice]
 printThermal58: [invoice: SaleInvoice]
 stockIssueUpdated: [id: number]
}>()

const { formatDate: formatAppDate, formatDateTime: formatAppDateTime } = useAppDateTime()
const previewDialog = ref<HTMLDialogElement | null>(null)
const previewItem = ref<SaleItem | null>(null)
const issueDialog = ref<HTMLDialogElement | null>(null)
const issueItem = ref<SaleItem | null>(null)
const correctionDialog = ref<HTMLDialogElement | null>(null)
const correctionOpen = ref(false)
const auth = useAuthStore()
const canResolveStock = computed(() => props.invoice?.can_resolve_stock_issue && auth.hasRole('super_admin', 'admin', 'manager'))
const issueHistory = computed(() => props.invoice?.status_history?.filter(entry => ['item_unavailable', 'item_replaced', 'details_requested', 'details_updated', 'cancelled'].includes(entry.status)) ?? [])
const shippingLines = computed(() => {
 const invoice = props.invoice
 if (!invoice) return []

 return [
  invoice.shipping_address_line1,
  invoice.shipping_address_line2,
  [invoice.shipping_city, invoice.shipping_state, invoice.shipping_postal_code].filter(Boolean).join(', '),
  invoice.shipping_country,
 ].filter(Boolean)
})
const showDelivery = computed(() => props.invoice?.channel === 'online' || shippingLines.value.length > 0)

watch(() => props.open, (open) => {
 if (!open) {
  closePreview()
  closeStockIssue()
  closeCorrection()
 }
})

function money(value: string | number | null | undefined) {
 return Number(value || 0).toLocaleString('en', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })
}

function dateLabel(value: string | null | undefined) {
 return formatAppDate(value)
}

function dateTimeLabel(value: string | null | undefined) {
 return formatAppDateTime(value)
}

function label(value: string | null | undefined) {
 return String(value || '-').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function customerName(invoice: SaleInvoice) {
 return invoice.customer?.name || invoice.customer_name || 'Walk-in customer'
}

function customerPhone(invoice: SaleInvoice) {
 return invoice.customer?.phone || invoice.customer_phone || 'No phone'
}

function customerEmail(invoice: SaleInvoice) {
 return invoice.customer_email || invoice.customer?.email || 'No email'
}

function itemName(item: SaleItem) {
 return item.variant?.product?.name || item.variant?.name || 'Product'
}

function itemMeta(item: SaleItem) {
 const variant = item.variant
 return [
 variant?.option_summary || (variant?.name && variant?.name !== itemName(item) ? variant.name : null),
 variant?.sku ? `SKU ${variant.sku}` : null,
 ].filter(Boolean).join(' · ')
}

function itemImage(item: SaleItem, size: 'thumb' | 'card') {
 const variant = item.variant?.primary_image
 const product = item.variant?.product?.primary_image
 return variant?.optimized_urls?.[size] || variant?.image_url || product?.optimized_urls?.[size] || product?.image_url
}

async function openPreview(item: SaleItem) {
 previewItem.value = item
 await nextTick()
 if (props.open && previewItem.value && !previewDialog.value?.open) {
  previewDialog.value?.showModal()
 }
}

function closePreview() {
 previewDialog.value?.close()
 previewItem.value = null
}

async function openStockIssue(item: SaleItem) {
 issueItem.value = item
 await nextTick()
 if (props.open && issueItem.value && !issueDialog.value?.open) issueDialog.value?.showModal()
}

function closeStockIssue() {
 issueDialog.value?.close()
 issueItem.value = null
}

async function openCorrection() {
 correctionOpen.value = true
 await nextTick()
 if (props.open && !correctionDialog.value?.open) correctionDialog.value?.showModal()
}

function closeCorrection() {
 correctionDialog.value?.close()
 correctionOpen.value = false
}

function itemDiscountTotal(invoice: SaleInvoice) {
 return Math.max(0, Number(invoice.discount_total || 0) - Number(invoice.invoice_discount_amount || 0))
}
</script>

<template>
 <AppModal
 :open="open"
 :title="invoice ? `Sale invoice ${invoice.invoice_number}` : 'Sale invoice'"
 description="View invoice details, products, totals and print documents."
 max-width="max-w-6xl"
 @close="emit('close')"
 >
 <div
 v-if="invoice"
 class="p-4 sm:p-5"
 >
 <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
 <div class="space-y-5">
 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
 <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
 <div>
 <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">
 Invoice
 </p>

 <h3 class="mt-2 text-xl font-semibold text-gray-950 dark:text-white">
 {{ invoice.invoice_number }}
 </h3>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ label(invoice.channel) }} · {{ dateLabel(invoice.sale_date) }}
 </p>

 <p
  v-if="invoice.channel === 'online' && invoice.created_at"
  class="mt-1 text-[12px] leading-5 text-gray-500 dark:text-gray-400"
 >
  Order received {{ dateTimeLabel(invoice.created_at) }}
 </p>
 </div>

 <div class="flex flex-wrap gap-2">
 <AppButton
 v-if="canResolveStock && !invoice.details_correction_deadline && !invoice.replacement_deadline"
 type="button"
 variant="secondary"
 aria-label="Notify customer about order details"
 @click="openCorrection"
 >
 Notify customer
 </AppButton>
 <AppBadge :variant="invoice.status === 'completed' ? 'green' : invoice.status === 'draft' ? 'amber' : 'red'">
 {{ label(invoice.status) }}
 </AppBadge>

 <AppBadge :variant="invoice.payment_status === 'paid' ? 'green' : invoice.payment_status === 'partial' ? 'amber' : 'red'">
 {{ label(invoice.payment_status) }}
 </AppBadge>
 </div>
 </div>

 <div class="mt-5 grid gap-4 md:grid-cols-3">
 <div class="rounded-[12px] bg-gray-950/[0.035] p-4 dark:bg-white/[0.055]">
 <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">
 Customer
 </p>

 <p class="mt-2 text-sm font-semibold text-gray-950 dark:text-white">
 {{ customerName(invoice) }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ customerPhone(invoice) }}
 </p>
 <p class="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">
 {{ customerEmail(invoice) }}
 </p>
 </div>

 <div class="rounded-[12px] bg-gray-950/[0.035] p-4 dark:bg-white/[0.055]">
 <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">
 Location
 </p>

 <p class="mt-2 text-sm font-semibold text-gray-950 dark:text-white">
 {{ invoice.location?.name || 'Unknown location' }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ invoice.location?.code || '-' }}
 </p>
 </div>

 <div class="rounded-[12px] bg-gray-950/[0.035] p-4 dark:bg-white/[0.055]">
 <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">
 Completed
 </p>

 <p class="mt-2 text-sm font-semibold text-gray-950 dark:text-white">
 {{ dateTimeLabel(invoice.completed_at) }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 Receipt printing is enabled after completion.
 </p>
 </div>
 </div>
 </section>

 <section v-if="showDelivery" class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">Delivery address</h3>
 <div class="mt-2 space-y-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
 <p v-if="invoice.shipping_recipient_name" class="font-semibold text-gray-950 dark:text-white">{{ invoice.shipping_recipient_name }}</p>
 <p v-if="invoice.shipping_recipient_phone">{{ invoice.shipping_recipient_phone }}</p>
 <p
 v-for="(line, index) in shippingLines"
 :key="index"
 class="break-words"
 >{{ line }}</p>
 <p v-if="!invoice.shipping_address_line1 && !invoice.shipping_address_line2" class="text-amber-800 dark:text-amber-300">
 No street address was recorded for this order.
 </p>
 </div>
 </section>

 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">Items</h3>

 <div class="mt-4 overflow-hidden rounded-[12px] bg-white dark:bg-[#111214]">
 <div class="hidden grid-cols-[minmax(0,2.6fr)_.55fr_.8fr_.8fr_.9fr] gap-3 bg-gray-950/[0.018] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:bg-white/[0.025] dark:text-gray-600 md:grid">
 <span>Product</span><span class="text-right">Qty</span><span class="text-right">Price</span><span class="text-right">Discount</span><span class="text-right">Total</span>
 </div>

 <div class="divide-y divide-gray-100 dark:divide-white/[0.055]">
 <div
 v-for="item in invoice.items || []"
 :key="item.id || `${item.product_variant_id}-${item.quantity}`"
 class="grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,2.6fr)_.55fr_.8fr_.8fr_.9fr] md:items-center"
 >
 <div class="flex min-w-0 items-start gap-2.5">
 <img
 v-if="itemImage(item, 'thumb')"
 :src="itemImage(item, 'thumb')"
 alt=""
 class="h-12 w-10 shrink-0 rounded-md bg-gray-100 object-cover dark:bg-white/5"
 loading="lazy"
 >
 <div class="min-w-0">
 <p class="break-words text-[13px] font-semibold text-gray-900 dark:text-gray-100">{{ itemName(item) }}</p>
 <p v-if="itemMeta(item)" class="mt-1 break-words text-[11px] text-gray-500 dark:text-gray-500">{{ itemMeta(item) }}</p>
 <p v-if="item.notes" class="mt-1 line-clamp-2 text-[11px] text-gray-400 dark:text-gray-600">{{ item.notes }}</p>
 <div v-if="item.variant || (canResolveStock && item.id)" class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
 <button
 type="button"
 class="min-h-6 underline decoration-gray-400 underline-offset-2 hover:decoration-current"
 v-if="item.variant"
 :aria-label="`Preview ${itemName(item)}`"
 @click="openPreview(item)"
 >Preview</button>
 <a
 v-if="item.storefront_url"
 :href="item.storefront_url"
 target="_blank"
 rel="noopener noreferrer"
 class="inline-flex min-h-6 items-center gap-1 underline decoration-gray-400 underline-offset-2 hover:decoration-current"
 >View on website <span aria-hidden="true">↗</span></a>
 <button
 v-if="canResolveStock && item.id"
 type="button"
 class="min-h-6 underline decoration-gray-400 underline-offset-2 hover:decoration-current"
 :aria-label="`Notify customer about ${itemName(item)}`"
 @click="openStockIssue(item)"
 >Notify customer</button>
 </div>
 </div>
 </div>
 <div class="flex items-center justify-between gap-3 md:block md:text-right">
 <span class="text-[11px] text-gray-400 md:hidden">Qty</span>
 <span class="text-[12px] font-medium text-gray-700 dark:text-gray-300">{{ item.quantity }}</span>
 </div>
 <div class="flex items-center justify-between gap-3 md:block md:text-right">
 <span class="text-[11px] text-gray-400 md:hidden">Price</span>
 <span class="text-[12px] text-gray-500 dark:text-gray-500">{{ money(item.unit_price) }}</span>
 </div>
 <div class="flex items-center justify-between gap-3 md:block md:text-right">
 <span class="text-[11px] text-gray-400 md:hidden">Discount</span>
 <span class="text-[12px] text-gray-500 dark:text-gray-500">{{ money(item.discount_amount) }}</span>
 </div>
 <div class="flex items-center justify-between gap-3 md:block md:text-right">
 <span class="text-[11px] text-gray-400 md:hidden">Total</span>
 <span class="text-[12px] font-semibold text-gray-900 dark:text-gray-100">{{ money(item.line_total) }}</span>
 </div>
 </div>
 </div>
 </div>
 </section>

 <div v-if="invoice.replacement_deadline" class="rounded-[14px] bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
 Waiting for customer replacement. This order is scheduled to cancel at {{ dateTimeLabel(invoice.replacement_deadline) }}.
 </div>

 <div v-if="invoice.details_correction_deadline" class="rounded-[14px] bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
 Waiting for updated order details. This order is scheduled to cancel at {{ dateTimeLabel(invoice.details_correction_deadline) }}.
 </div>

 <section v-if="issueHistory.length" class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">Order issue history</h3>
 <ul class="mt-2 divide-y divide-gray-200 dark:divide-white/10">
 <li v-for="(entry, index) in issueHistory" :key="index" class="space-y-1 py-2 text-xs text-gray-600 dark:text-gray-300">
 <p class="font-semibold">{{ label(entry.status) }} · {{ dateTimeLabel(entry.at) }}</p>
 <p class="whitespace-pre-wrap break-words">{{ entry.note }}</p>
 <p v-if="entry.notify_email || entry.notify_sms">
 {{ [entry.notify_email ? (entry.email_sent ? 'Email sent' : entry.status === 'cancelled' ? 'Cancellation email pending or unconfirmed' : 'Email unconfirmed') : '', entry.notify_sms ? (entry.sms_sent ? 'SMS accepted' : 'SMS unconfirmed') : ''].filter(Boolean).join(' · ') }}
 </p>
 </li>
 </ul>
 </section>

 <section
 v-if="invoice.notes"
 class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]"
 >
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Notes
 </h3>

 <p class="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
 {{ invoice.notes }}
 </p>
 </section>
 </div>

 <aside class="space-y-5">
 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Totals
 </h3>

 <div class="mt-4 space-y-3 text-sm">
 <div class="flex justify-between">
 <span class="text-gray-500 dark:text-gray-400">Subtotal</span>
 <span class="font-semibold text-gray-950 dark:text-white">{{ money(invoice.subtotal) }}</span>
 </div>

 <div v-if="itemDiscountTotal(invoice) > 0" class="flex justify-between">
 <span class="text-gray-500 dark:text-gray-400">Item discounts</span>
 <span class="font-semibold text-gray-950 dark:text-white">-{{ money(itemDiscountTotal(invoice)) }}</span>
 </div>

 <div v-if="Number(invoice.invoice_discount_amount || 0) > 0" class="flex justify-between">
 <span class="text-gray-500 dark:text-gray-400">Overall discount</span>
 <span class="font-semibold text-gray-950 dark:text-white">-{{ money(invoice.invoice_discount_amount) }}</span>
 </div>

 <div class="flex justify-between">
 <span class="text-gray-500 dark:text-gray-400">Tax</span>
 <span class="font-semibold text-gray-950 dark:text-white">{{ money(invoice.tax_total) }}</span>
 </div>

 <div class="flex justify-between">
 <span class="text-gray-500 dark:text-gray-400">Shipping</span>
 <span class="font-semibold text-gray-950 dark:text-white">{{ money(invoice.shipping_cost) }}</span>
 </div>

 <div class="shadow-[0_-1px_0_rgba(17,24,39,0.05)] pt-4 ">
 <div class="flex justify-between">
 <span class="font-semibold text-gray-950 dark:text-white">Grand total</span>
 <span class="text-xl font-semibold text-gray-950 dark:text-white">{{ money(invoice.grand_total) }}</span>
 </div>
 </div>

 <div class="flex justify-between">
 <span class="text-gray-500 dark:text-gray-400">Paid</span>
 <span class="font-semibold text-gray-950 dark:text-white">{{ money(invoice.paid_amount) }}</span>
 </div>

 <div class="flex justify-between">
 <span class="text-gray-500 dark:text-gray-400">Balance</span>
 <span class="font-semibold text-gray-950 dark:text-white">{{ money(invoice.balance_amount) }}</span>
 </div>
 </div>
 </section>

 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Print
 </h3>

 <div
 v-if="invoice.status !== 'completed'"
 class="mt-4 rounded-[12px] bg-amber-500/[0.07] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
 >
 Complete this invoice first to print invoice PDF or thermal receipt.
 </div>

 <div
 v-else
 class="mt-4 grid gap-2"
 >
 <AppButton
 type="button"
 variant="secondary"
 :loading="printing"
 @click="emit('printInvoice', invoice)"
 >
 A4 invoice PDF
 </AppButton>

 <AppButton
 type="button"
 :loading="printing"
 @click="emit('printThermal80', invoice)"
 >
 Thermal receipt 80mm
 </AppButton>

 <AppButton
 type="button"
 variant="secondary"
 :loading="printing"
 @click="emit('printThermal58', invoice)"
 >
 Thermal receipt 58mm
 </AppButton>
 </div>
 </section>
 </aside>
 </div>
 </div>
 <dialog
 ref="previewDialog"
 aria-labelledby="invoice-product-preview-title"
 class="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[42rem] overflow-y-auto rounded-2xl bg-white p-0 text-gray-950 shadow-2xl backdrop:bg-gray-950/60 backdrop:backdrop-blur-[2px] dark:bg-[#17181b] dark:text-white"
 @keydown.esc.stop
 @cancel.prevent="closePreview"
 >
 <div v-if="previewItem" class="p-5 sm:p-6">
 <header class="mb-5 flex items-start justify-between gap-4">
 <h3 id="invoice-product-preview-title" class="text-lg font-semibold">{{ itemName(previewItem) }}</h3>
 <button type="button" autofocus class="shrink-0 rounded-md px-2 py-1 text-xs font-semibold hover:bg-gray-950/5 dark:hover:bg-white/10" @click="closePreview">Close preview</button>
 </header>
 <div class="grid gap-5" :class="itemImage(previewItem, 'card') ? 'sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : ''">
 <img
 v-if="itemImage(previewItem, 'card')"
 :src="itemImage(previewItem, 'card')"
 :alt="itemName(previewItem)"
 class="max-h-[45vh] w-full rounded-lg bg-gray-100 object-contain dark:bg-white/5"
 >
 <div class="min-w-0 space-y-4">
 <p v-if="itemMeta(previewItem)" class="break-words text-xs text-gray-600 dark:text-gray-300">{{ itemMeta(previewItem) }}</p>
 <p v-if="previewItem.variant?.product?.short_description" class="whitespace-pre-line break-words text-sm leading-5 text-gray-600 dark:text-gray-300">
 {{ previewItem.variant.product.short_description }}
 </p>
 <dl class="grid grid-cols-2 gap-3 rounded-xl bg-gray-950/[0.035] p-3 text-sm dark:bg-white/[0.06]">
 <div><dt class="text-xs text-gray-500 dark:text-gray-400">Ordered quantity</dt><dd class="mt-1 font-semibold">{{ previewItem.quantity }}</dd></div>
 <div><dt class="text-xs text-gray-500 dark:text-gray-400">Unit price on order</dt><dd class="mt-1 font-semibold">{{ money(previewItem.unit_price) }}</dd></div>
 </dl>
 <a v-if="previewItem.storefront_url" :href="previewItem.storefront_url" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-9 items-center gap-2 rounded-md bg-gray-950 px-3 text-xs font-semibold text-white dark:bg-white dark:text-gray-950">
 View on website <span aria-hidden="true">↗</span>
 </a>
 <p v-else class="text-xs text-gray-500 dark:text-gray-400">This item has no public product page.</p>
 </div>
 </div>
 </div>
 </dialog>
 <dialog
 ref="issueDialog"
 aria-labelledby="invoice-stock-issue-title"
 class="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[38rem] overflow-y-auto rounded-2xl bg-white p-0 text-gray-950 shadow-2xl backdrop:bg-gray-950/60 backdrop:backdrop-blur-[2px] dark:bg-[#17181b] dark:text-white"
 @keydown.esc.stop
 @cancel.prevent
 >
 <OrderStockIssuePanel v-if="issueItem && invoice" :invoice="invoice" :item="issueItem" @close="closeStockIssue" @updated="emit('stockIssueUpdated', invoice.id)" />
 </dialog>
 <dialog
 ref="correctionDialog"
 aria-labelledby="invoice-details-correction-title"
 class="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[38rem] overflow-y-auto rounded-2xl bg-white p-0 text-gray-950 shadow-2xl backdrop:bg-gray-950/60 backdrop:backdrop-blur-[2px] dark:bg-[#17181b] dark:text-white"
 @keydown.esc.stop
 @cancel.prevent
 >
 <OrderDetailsCorrectionPanel v-if="correctionOpen && invoice" :invoice="invoice" @close="closeCorrection" @updated="emit('stockIssueUpdated', invoice.id)" />
 </dialog>
 </AppModal>
</template>
