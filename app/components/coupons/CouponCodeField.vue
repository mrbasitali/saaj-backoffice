<script lang="ts">
export function normalizeCouponCode(code: string) {
 return code.trim().toUpperCase()
}

export function validCouponCode(code: string) {
 return !code || /^[A-Z0-9-]{3,32}$/.test(code)
}
</script>

<script setup lang="ts">
defineProps<{ disabled?: boolean }>()
const code = defineModel<string>({ required: true })
const invalid = computed(() => !validCouponCode(normalizeCouponCode(code.value)))
</script>

<template>
 <div>
  <AppInput
   v-model="code"
   label="Coupon code"
   placeholder="e.g. SORRY10"
   autocomplete="off"
   :maxlength="32"
   :disabled="disabled"
   :error="invalid ? 'Use 3–32 letters, numbers, or hyphens.' : undefined"
  />
  <p v-if="!invalid" class="mt-1.5 text-xs text-gray-600 dark:text-gray-400">Leave blank to generate a code.</p>
 </div>
</template>
