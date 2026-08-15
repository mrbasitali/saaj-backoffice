<script setup lang="ts">
const props = withDefaults(defineProps<{
 brandName: string
 brandLogoUrl?: string | null
 productName: string
 optionSummary?: string | null
 price: number | string
 currency?: string
 codeValue: string
}>(), {
 brandLogoUrl: null,
 optionSummary: null,
 currency: 'PKR',
})

const priceLabel = computed(() => {
 const value = Number(props.price || 0)
 const prefix = props.currency === 'PKR' ? 'Rs.' : props.currency

 return `${prefix} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
})

const displayCode = computed(() => props.codeValue?.trim() || 'CODE PENDING')

/**
 * Not a real, scannable barcode — this is a visual stand-in so the layout
 * can be previewed live without pulling in a barcode-rendering library
 * just for a preview. The actual scannable Code128 barcode is generated
 * server-side (BarcodeGenerator.php) at print time; what matters here is
 * "does the card look right," not "can this specific pixel pattern scan."
 */
const barcodeBars = computed(() => {
 const code = displayCode.value
 const bars: { width: number, tall: boolean }[] = []

 for (let i = 0; i < Math.max(code.length, 20); i++) {
 const char = code.charCodeAt(i % code.length) || 65
 bars.push({
 width: 1 + (char % 3),
 tall: char % 2 === 0,
 })
 }

 return bars
})
</script>

<template>
 <div class="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-[12px] bg-white p-3 shadow-[0_1px_4px_rgba(17,24,39,0.08)] dark:bg-[#17181b] dark:shadow-[0_1px_4px_rgba(0,0,0,0.28)]">
 <span class="absolute top-1/2 -left-1.5 h-3 w-3 -translate-y-1/2 rounded-full bg-[#f4f5f7] dark:bg-[#111214]" />

 <div class="flex items-center justify-between gap-2">
 <span class="min-w-0 flex-1">
 <img
 v-if="brandLogoUrl"
 :src="brandLogoUrl"
 :alt="brandName"
 class="h-4 max-w-[110px] object-contain object-left"
 >
 <span
 v-else
 class="text-[12px] font-bold tracking-wide text-gray-900 uppercase dark:text-white"
 >
 {{ brandName }}
 </span>
 </span>

 <span class="shrink-0 text-sm font-bold text-gray-950 dark:text-white">
 {{ priceLabel }}
 </span>
 </div>

 <div class="mt-2 flex h-8 items-center justify-center gap-[1px] rounded bg-white">
 <span
 v-for="(bar, index) in barcodeBars"
 :key="index"
 class="bg-gray-900 dark:bg-gray-100"
 :style="{ width: `${bar.width}px`, height: bar.tall ? '100%' : '70%' }"
 />
 </div>

 <p class="mt-1 text-center text-[12px] tracking-wider text-gray-500 dark:text-gray-400">
 {{ displayCode }}
 </p>

 <p class="mt-1.5 truncate text-[12px] font-bold text-gray-950 dark:text-white">
 {{ productName || 'Product name' }}
 </p>

 <p
 v-if="optionSummary"
 class="truncate text-[11px] text-gray-500 dark:text-gray-400"
 >
 {{ optionSummary }}
 </p>
 </div>
</template>
