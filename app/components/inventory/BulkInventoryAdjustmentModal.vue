<script setup lang="ts">
type InventoryStock = {
 id: number
 product_variant_id: number
 inventory_location_id: number
 on_hand_quantity: number
 reserved_quantity: number
 variant?: {
 sku: string | null
 name: string | null
 option_summary: string | null
 product?: {
 name: string
 } | null
 } | null
 location?: {
 name: string
 code: string
 } | null
}

type BulkAdjustmentResponse = {
 message?: string
}

const props = defineProps<{
 open: boolean
 stocks: InventoryStock[]
}>()

const emit = defineEmits<{
 close: []
 saved: [message?: string]
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const form = reactive({
 type: 'adjustment',
 quantity_change: 1,
 note: '',
})

const typeOptions = [
 { label: 'Adjustment', value: 'adjustment' },
 { label: 'Opening stock', value: 'opening' },
 { label: 'Damaged / write-off', value: 'damaged' },
]

watch(
 () => props.open,
 (open) => {
 if (!open) return

 form.type = 'adjustment'
 form.quantity_change = 1
 form.note = ''
 formError.value = ''
 fieldErrors.value = {}
 },
)

watch(
 () => form.type,
 (type) => {
 if (type === 'opening' && Number(form.quantity_change) <= 0) form.quantity_change = 1
 if (type === 'damaged' && Number(form.quantity_change) >= 0) form.quantity_change = -1
 },
)

function productName(stock: InventoryStock) {
 return stock.variant?.product?.name || 'Unknown product'
}

function variantDetails(stock: InventoryStock) {
 const variant = stock.variant?.option_summary || stock.variant?.name || 'Default'
 const sku = stock.variant?.sku ? `SKU ${stock.variant.sku}` : 'No SKU'

 return `${variant} · ${sku}`
}

function normalizeErrors(error: any) {
 const errors = error?.data?.errors || {}
 const normalized: Record<string, string> = {}

 Object.keys(errors).forEach((key) => {
 normalized[key] = Array.isArray(errors[key]) ? errors[key][0] : String(errors[key])
 })

 return normalized
}

function quantityHint() {
 if (form.type === 'opening') return 'Adds this opening quantity to every selected stock row.'
 if (form.type === 'damaged') return 'Removes this damaged quantity from every selected stock row.'

 return 'The same positive or negative change is applied to every selected stock row.'
}

async function submit() {
 if (!props.stocks.length) return

 saving.value = true
 formError.value = ''
 fieldErrors.value = {}

 try {
 const response = await $api<BulkAdjustmentResponse>('/admin/inventory-adjustments/bulk', {
 method: 'POST',
 body: {
 items: props.stocks.map((stock) => ({
 product_variant_id: stock.product_variant_id,
 inventory_location_id: stock.inventory_location_id,
 })),
 type: form.type,
 quantity_change: Number(form.quantity_change),
 note: form.note || null,
 },
 })

 emit('saved', response.message || `Inventory adjusted for ${props.stocks.length} selected rows.`)
 } catch (error: any) {
 fieldErrors.value = normalizeErrors(error)
 formError.value = Object.values(fieldErrors.value)[0]
 || error?.data?.message
 || 'Could not adjust the selected stock rows.'
 } finally {
 saving.value = false
 }
}
</script>

<template>
 <AppModal
 :open="open"
 title="Adjust selected inventory"
 :description="`Apply one stock change to ${stocks.length} selected ${stocks.length === 1 ? 'row' : 'rows'}. The update is all-or-nothing.`"
 max-width="max-w-3xl"
 @close="emit('close')"
 >
 <form @submit.prevent="submit">
 <div class="space-y-5 p-4 sm:p-5">
 <div
 v-if="formError"
 class="rounded-[12px] bg-red-500/[0.07] p-4 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
 >
 {{ formError }} No selected row was changed.
 </div>

 <div class="grid gap-5 sm:grid-cols-2">
 <AppSelect
 v-model="form.type"
 label="Adjustment type"
 :options="typeOptions"
 />

 <div>
 <AppInput
 v-model="form.quantity_change"
 label="Quantity change per selected row"
 type="number"
 :error="fieldErrors.quantity_change"
 />
 <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
 {{ quantityHint() }}
 </p>
 </div>

 <AppTextarea
 v-model="form.note"
 class="sm:col-span-2"
 label="Internal note"
 placeholder="Example: stocktake correction applied to selected products..."
 :rows="3"
 :error="fieldErrors.note"
 />
 </div>

 <div class="overflow-hidden rounded-[14px] border border-gray-100 dark:border-white/[0.06]">
 <div class="flex items-center justify-between bg-gray-950/[0.025] px-4 py-3 dark:bg-white/[0.035]">
 <p class="text-sm font-semibold text-gray-900 dark:text-white">Selected stock rows</p>
 <AppBadge variant="neutral">{{ stocks.length }}</AppBadge>
 </div>

 <div class="max-h-64 divide-y divide-gray-100 overflow-y-auto dark:divide-white/[0.055]">
 <div
 v-for="stock in stocks"
 :key="stock.id"
 class="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4"
 >
 <div class="min-w-0">
 <p class="text-sm font-semibold leading-5 text-gray-900 dark:text-white">
 {{ productName(stock) }}
 </p>
 <p class="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">
 {{ variantDetails(stock) }}
 </p>
 </div>
 <div class="text-xs text-gray-500 dark:text-gray-400 sm:text-right">
 <p class="font-medium text-gray-700 dark:text-gray-300">
 {{ stock.location?.name || 'Unknown location' }}
 </p>
 <p class="mt-1">On hand {{ stock.on_hand_quantity }} · Reserved {{ stock.reserved_quantity }}</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div class="sticky bottom-0 z-10 flex flex-col-reverse gap-2 bg-white/95 px-4 py-3 shadow-[0_-1px_0_rgba(17,24,39,0.055)] backdrop-blur-xl dark:bg-[#111214]/95 dark:shadow-[0_-1px_0_rgba(255,255,255,0.055)] sm:flex-row sm:justify-end sm:px-5">
 <AppButton
 type="button"
 variant="secondary"
 :disabled="saving"
 @click="emit('close')"
 >
 Cancel
 </AppButton>

 <AppButton
 type="submit"
 :loading="saving"
 :disabled="!stocks.length || !Number(form.quantity_change)"
 >
 {{ saving ? 'Applying...' : `Adjust ${stocks.length} selected` }}
 </AppButton>
 </div>
 </form>
 </AppModal>
</template>
