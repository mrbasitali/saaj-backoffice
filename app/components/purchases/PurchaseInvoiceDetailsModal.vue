<script setup lang="ts">
type Vendor = {
 id: number
 code: string
 name: string
 company_name: string | null
}

type InventoryLocation = {
 id: number
 name: string
 code: string
}

type Product = {
 id: number
 name: string
 slug: string
}

type ProductVariant = {
 id: number
 sku: string | null
 barcode: string | null
 name: string | null
 option_summary: string | null
 product?: Product | null
}

type PurchaseItem = {
 id?: number
 product_variant_id: number | null
 variant?: ProductVariant | null
 quantity: number
 unit_cost: string | number
 discount_amount: string | number
 tax_amount: string | number
 line_total?: string | number
 notes: string | null
}

type PurchaseInvoice = {
 id: number
 vendor_id: number
 vendor?: Vendor | null
 inventory_location_id: number
 location?: InventoryLocation | null
 invoice_number: string
 vendor_invoice_number: string | null
 purchase_date: string
 due_date: string | null
 status: string
 payment_status: string
 subtotal: string | number
 discount_total: string | number
 invoice_discount_amount: string | number
 tax_total: string | number
 shipping_cost: string | number
 grand_total: string | number
 paid_amount: string | number
 balance_amount: string | number
 received_at: string | null
 notes: string | null
 items?: PurchaseItem[]
}

defineProps<{
 open: boolean
 invoice: PurchaseInvoice | null
 printing?: boolean
}>()

const emit = defineEmits<{
 close: []
 printPdf: [invoice: PurchaseInvoice]
}>()

const { formatDate: formatAppDate, formatDateTime: formatAppDateTime } = useAppDateTime()

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

function itemName(item: PurchaseItem) {
 return item.variant?.product?.name || item.variant?.name || 'Product'
}

function itemMeta(item: PurchaseItem) {
 const variant = item.variant
 return [
 variant?.option_summary || (variant?.name && variant?.name !== itemName(item) ? variant.name : null),
 variant?.sku ? `SKU ${variant.sku}` : null,
 ].filter(Boolean).join(' · ')
}

function itemDiscountTotal(invoice: PurchaseInvoice) {
 return Math.max(0, Number(invoice.discount_total || 0) - Number(invoice.invoice_discount_amount || 0))
}
</script>

<template>
 <AppModal
 :open="open"
 :title="invoice ? `Purchase invoice ${invoice.invoice_number}` : 'Purchase invoice'"
 description="View invoice details, products, totals and vendor payment status."
 max-width="max-w-6xl"
 @close="emit('close')"
 >
 <div
 v-if="invoice"
 class="p-4 sm:p-5"
 >
 <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
 <div class="space-y-5">
 <section class="rounded-[13px] bg-indigo-500/[0.06] p-4 dark:bg-indigo-500/[0.08]">
 <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
 <div>
 <p class="text-xs font-semibold uppercase tracking-wide text-indigo-400">
 Purchase invoice
 </p>

 <h3 class="mt-2 text-xl font-semibold text-gray-950 dark:text-white">
 {{ invoice.invoice_number }}
 </h3>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 {{ dateLabel(invoice.purchase_date) }} · Due {{ dateLabel(invoice.due_date) }}
 </p>
 </div>

 <div class="flex flex-wrap gap-2">
 <AppBadge :variant="invoice.status === 'received' ? 'green' : invoice.status === 'draft' ? 'amber' : 'red'">
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
 Vendor
 </p>

 <p class="mt-2 text-sm font-semibold text-gray-950 dark:text-white">
 {{ invoice.vendor?.name || 'Unknown vendor' }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 {{ invoice.vendor?.company_name || invoice.vendor?.code || '-' }}
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
 Received
 </p>

 <p class="mt-2 text-sm font-semibold text-gray-950 dark:text-white">
 {{ dateTimeLabel(invoice.received_at) }}
 </p>

 <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
 Vendor ref: {{ invoice.vendor_invoice_number || 'Not set' }}
 </p>
 </div>
 </div>
 </section>

 <section class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">Items</h3>

 <div class="mt-4 overflow-hidden rounded-[12px] bg-white dark:bg-[#111214]">
 <div class="hidden grid-cols-[minmax(0,2.6fr)_.55fr_.8fr_.8fr_.9fr] gap-3 bg-gray-950/[0.018] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:bg-white/[0.025] dark:text-gray-600 md:grid">
 <span>Product</span><span class="text-right">Qty</span><span class="text-right">Unit cost</span><span class="text-right">Discount</span><span class="text-right">Total</span>
 </div>

 <div class="divide-y divide-gray-100 dark:divide-white/[0.055]">
 <div
 v-for="item in invoice.items || []"
 :key="item.id || `${item.product_variant_id}-${item.quantity}`"
 class="grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,2.6fr)_.55fr_.8fr_.8fr_.9fr] md:items-center"
 >
 <div class="min-w-0">
 <p class="truncate text-[13px] font-semibold text-gray-900 dark:text-gray-100">{{ itemName(item) }}</p>
 <p v-if="itemMeta(item)" class="mt-1 break-words text-[11px] text-gray-500 dark:text-gray-500">{{ itemMeta(item) }}</p>
 <p v-if="item.notes" class="mt-1 line-clamp-2 text-[11px] text-gray-400 dark:text-gray-600">{{ item.notes }}</p>
 </div>
 <div class="flex items-center justify-between gap-3 md:block md:text-right">
 <span class="text-[11px] text-gray-400 md:hidden">Qty</span>
 <span class="text-[12px] font-medium text-gray-700 dark:text-gray-300">{{ item.quantity }}</span>
 </div>
 <div class="flex items-center justify-between gap-3 md:block md:text-right">
 <span class="text-[11px] text-gray-400 md:hidden">Unit cost</span>
 <span class="text-[12px] text-gray-500 dark:text-gray-500">{{ money(item.unit_cost) }}</span>
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
 <section class="rounded-[12px] bg-emerald-500/[0.06] p-4 dark:bg-emerald-500/[0.06]">
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

 <div class="pt-4 shadow-[0_-1px_0_rgba(16,185,129,0.14)]">
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

 <section class="rounded-[12px] bg-amber-500/[0.06] p-4 dark:bg-amber-500/[0.06]">
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Print
 </h3>

 <div class="mt-4">
 <AppButton
 type="button"
 :loading="printing"
 @click="emit('printPdf', invoice)"
 >
 A4 invoice PDF
 </AppButton>
 </div>
 </section>
 </aside>
 </div>
 </div>
 </AppModal>
</template>
