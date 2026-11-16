<script setup lang="ts">
type Invoice = {
  id: number
  invoice_number: string
  customer_email?: string | null
  customer_phone?: string | null
  shipping_recipient_phone?: string | null
  customer?: { email: string | null, phone: string | null } | null
}

const props = defineProps<{ invoice: Invoice }>()
const emit = defineEmits<{ close: [], updated: [] }>()
const { $api } = useNuxtApp()

const fieldOptions = [
  { value: 'address', label: 'Delivery address' },
  { value: 'email', label: 'Email address' },
  { value: 'phone', label: 'Delivery phone' },
]
const fields = ref<string[]>(['address'])
const orderEmail = props.invoice.customer_email || props.invoice.customer?.email || ''
const orderPhone = props.invoice.shipping_recipient_phone || props.invoice.customer_phone || props.invoice.customer?.phone || ''
const email = ref(orderEmail)
const phone = ref(orderPhone)
const cancellationEmail = ref('')
const notifyEmail = ref(Boolean(orderEmail))
const notifySms = ref(!orderEmail && Boolean(orderPhone))
const message = ref('Please provide the correct information for your SAAJ order using the private link below.')
const deadline = ref('24')
const customHours = ref('')
const hours = computed(() => Number(deadline.value === 'custom' ? customHours.value : deadline.value))
const validHours = computed(() => Number.isInteger(hours.value) && hours.value >= 1 && hours.value <= 720)
const options = [
  { value: '6', label: '6 hours' },
  { value: '12', label: '12 hours' },
  { value: '24', label: '24 hours' },
  { value: '48', label: '48 hours' },
  { value: 'custom', label: 'Custom' },
]
const requiresAlternateEmail = computed(() => fields.value.includes('email') && notifyEmail.value
  && email.value.trim().toLowerCase() === orderEmail.trim().toLowerCase())
const requiresAlternatePhone = computed(() => fields.value.includes('phone') && notifySms.value
  && phone.value.trim() === orderPhone.trim())
const saving = ref(false)
const error = ref('')
const result = ref('')
const panel = ref<HTMLElement>()
const canSend = computed(() => fields.value.length > 0 && validHours.value && message.value.trim()
  && (notifyEmail.value || notifySms.value) && (!notifyEmail.value || email.value.trim())
  && (!notifySms.value || phone.value.trim()) && !requiresAlternateEmail.value && !requiresAlternatePhone.value)

function onEscape() {
  if (!saving.value) emit('close')
}
onMounted(() => panel.value?.closest('dialog')?.addEventListener('cancel', onEscape))
onBeforeUnmount(() => panel.value?.closest('dialog')?.removeEventListener('cancel', onEscape))

async function submit() {
  if (!canSend.value || saving.value || result.value) return
  saving.value = true
  error.value = ''
  try {
    const response = await $api<{ message: string }>(`/admin/sale-invoices/${props.invoice.id}/request-details-correction`, {
      method: 'POST',
      body: {
        fields: fields.value,
        message: message.value.trim(),
        cancel_after_hours: hours.value,
        email: notifyEmail.value ? email.value.trim() : null,
        phone: notifySms.value ? phone.value.trim() : null,
        cancellation_email: fields.value.includes('email') && !notifyEmail.value ? cancellationEmail.value.trim() || null : null,
      },
    })
    result.value = response.message
    emit('updated')
  } catch (cause) {
    error.value = extractApiErrorMessage(cause, 'Could not send the order details request.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div ref="panel" class="p-5 sm:p-6">
    <header class="mb-5 flex items-start justify-between gap-4">
      <div>
        <h3 id="invoice-details-correction-title" class="text-lg font-semibold">Request corrected order details</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ invoice.invoice_number }}</p>
      </div>
      <button type="button" class="text-sm font-medium hover:underline" :disabled="saving" @click="emit('close')">Close</button>
    </header>

    <p v-if="result" role="status" class="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-900 dark:text-emerald-100">{{ result }}</p>
    <form v-else class="space-y-5" @submit.prevent="submit">
      <fieldset class="flex flex-wrap gap-x-5 gap-y-2 text-sm" :disabled="saving">
        <legend class="mb-2 font-semibold">Details to correct</legend>
        <label v-for="option in fieldOptions" :key="option.value" class="inline-flex items-center gap-2">
          <input v-model="fields" type="checkbox" :value="option.value">
          {{ option.label }}
        </label>
      </fieldset>

      <fieldset class="space-y-3" :disabled="saving">
        <legend class="mb-2 text-sm font-semibold">Send private link</legend>
        <AppToggle v-model="notifyEmail" label="Email" role="switch" :aria-checked="notifyEmail" :disabled="saving" />
        <AppInput v-if="notifyEmail" v-model="email" label="Email recipient" type="email" maxlength="190" required />
        <p v-if="requiresAlternateEmail" class="text-xs text-gray-600 dark:text-gray-300">Send by SMS or enter a confirmed alternative email address.</p>
        <AppToggle v-model="notifySms" label="SMS" role="switch" :aria-checked="notifySms" :disabled="saving" />
        <AppInput v-if="notifySms" v-model="phone" label="SMS recipient" type="tel" maxlength="50" required />
        <p v-if="requiresAlternatePhone" class="text-xs text-gray-600 dark:text-gray-300">Send by email or enter a confirmed alternative mobile number.</p>
        <AppInput v-if="fields.includes('email') && !notifyEmail" v-model="cancellationEmail" label="Cancellation email (optional)" type="email" maxlength="190" placeholder="Confirmed alternative email" />
        <p v-if="fields.includes('email') && !notifyEmail" class="text-xs text-gray-600 dark:text-gray-300">A cancellation email needs a confirmed address.</p>
      </fieldset>

      <div class="grid gap-3 sm:grid-cols-2">
        <AppSelect v-model="deadline" label="Cancel if details are missing after" :options="options" :disabled="saving" />
        <AppInput v-if="deadline === 'custom'" v-model="customHours" label="Custom hours" type="number" min="1" max="720" step="1" required :disabled="saving" />
      </div>

      <label class="block text-sm font-semibold">
        Customer message
        <textarea v-model="message" rows="3" maxlength="500" required :disabled="saving" class="mt-2 w-full rounded-lg border border-gray-300 bg-transparent p-3 text-sm font-normal dark:border-white/20" />
      </label>
      <p class="text-xs leading-5 text-gray-600 dark:text-gray-300">The notice includes the private link and exact deadline. Saving the requested details removes automatic cancellation.</p>
      <p v-if="error" role="alert" class="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-900 dark:text-rose-100">{{ error }}</p>

      <div class="flex justify-end">
        <AppButton type="submit" :loading="saving" :disabled="!canSend || saving">Send correction request</AppButton>
      </div>
    </form>
  </div>
</template>
