<script lang="ts">
export type CouponTerms = {
 type: string
 value: string | number | null
 scope: string
 valid_hours: string | number | null
 usage_limit: string | number | null
}

export function couponTermsReady(terms: CouponTerms) {
 const value = Number(terms.value)
 const hours = Number(terms.valid_hours)
 const limit = Number(terms.usage_limit)

 return value >= 0.01 && value <= (terms.type === 'percent' ? 100 : 99999999)
  && (!terms.valid_hours || (Number.isInteger(hours) && hours >= 1 && hours <= 87600))
  && (!terms.usage_limit || (Number.isInteger(limit) && limit >= 1 && limit <= 1000000))
}

export function couponTermsPayload(terms: CouponTerms) {
 return {
  ...terms,
  value: Number(terms.value),
  valid_hours: terms.valid_hours ? Number(terms.valid_hours) : null,
  usage_limit: terms.usage_limit ? Number(terms.usage_limit) : null,
 }
}
</script>

<script setup lang="ts">
const props = defineProps<{ disabled?: boolean, defaultLimit?: boolean, chooseValidity?: boolean, multipleCustomers?: boolean }>()
const model = defineModel<CouponTerms>({ required: true })
const types = [{ value: 'percent', label: 'Percentage' }, { value: 'fixed', label: 'Fixed amount (Rs)' }]
const scopes = computed(() => [
 { value: 'open', label: 'Anyone with the code' },
 { value: 'customer', label: props.multipleCustomers ? 'Selected customers' : 'This customer only' },
])
const validity = defineModel<string>('validity')
const duration = ref<string | number | null>(model.value.valid_hours === null || Number(model.value.valid_hours) < 1
 ? null
 : Number(model.value.valid_hours) / (validity.value === 'days' ? 24 : 1))
const validityOptions = [
 { value: 'days', label: 'Days' },
 { value: 'hours', label: 'Hours' },
 { value: 'unlimited', label: 'No expiry' },
]
const validityLabel = computed(() => validity.value === 'days' ? 'Days after sending' : 'Hours after sending')

watch([validity, duration], () => {
 if (!props.chooseValidity) return
 if (validity.value === 'unlimited' || duration.value === null || duration.value === '') {
  model.value.valid_hours = null
  return
 }
 const length = Number(duration.value)
 model.value.valid_hours = Number.isInteger(length) && length > 0
  ? length * (validity.value === 'days' ? 24 : 1)
  : -1
})
</script>

<template>
 <div class="grid gap-3 sm:grid-cols-2">
  <AppSelect v-model="model.type" label="Discount type" :options="types" :disabled="disabled" />
  <AppInput v-model="model.value" :label="model.type === 'percent' ? 'Discount (%)' : 'Discount (Rs)'" type="number" min="0.01" :max="model.type === 'percent' ? 100 : 99999999" step="0.01" placeholder="Enter amount" :disabled="disabled" required />
  <AppSelect v-model="model.scope" label="Who can use it" :options="scopes" :disabled="disabled" />
  <slot name="recipient" />
  <template v-if="chooseValidity">
   <AppSelect v-model="validity" label="Coupon validity" :options="validityOptions" placeholder="Choose validity" :disabled="disabled" @update:model-value="duration = null" />
   <AppInput v-if="validity === 'days' || validity === 'hours'" v-model="duration" :label="validityLabel" type="number" min="1" :max="validity === 'days' ? 3650 : 87600" step="1" :placeholder="validityLabel" :disabled="disabled" required />
  </template>
  <AppInput v-else v-model="model.valid_hours" label="Validity in hours" type="number" min="1" max="87600" step="1" placeholder="No expiry" :disabled="disabled" />
  <AppInput v-model="model.usage_limit" label="Total uses" type="number" min="1" max="1000000" step="1" :placeholder="defaultLimit ? '1 use' : 'Unlimited'" :disabled="disabled" />
 </div>
</template>
