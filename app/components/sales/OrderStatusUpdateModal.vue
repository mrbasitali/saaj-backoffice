<script setup lang="ts">
type SaleInvoice = {
  id: number
  invoice_number: string
  fulfillment_status?: string
  tracking_number?: string | null
  shipping_carrier?: string | null
}

const props = defineProps<{
  open: boolean
  invoice: SaleInvoice | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')

const form = reactive({
  fulfillment_status: 'pending',
  note: '',
  tracking_number: '',
  shipping_carrier: '',
  notify_email: false,
  notify_sms: false,
})

const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Out for delivery', value: 'out_for_delivery' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Returned', value: 'returned' },
]

watch(
  () => [props.open, props.invoice] as const,
  () => {
    if (!props.open) return

    formError.value = ''
    form.fulfillment_status = props.invoice?.fulfillment_status ?? 'pending'
    form.note = ''
    form.tracking_number = props.invoice?.tracking_number ?? ''
    form.shipping_carrier = props.invoice?.shipping_carrier ?? ''
    form.notify_email = false
    form.notify_sms = false
  },
  { immediate: true },
)

async function submit() {
  if (!props.invoice) return

  saving.value = true
  formError.value = ''

  try {
    await $api(`/admin/sale-invoices/${props.invoice.id}/fulfillment-status`, {
      method: 'POST',
      body: {
        fulfillment_status: form.fulfillment_status,
        note: form.note || null,
        tracking_number: form.tracking_number || null,
        shipping_carrier: form.shipping_carrier || null,
        notify_email: form.notify_email,
        notify_sms: form.notify_sms,
      },
    })

    emit('saved')
  } catch (error: any) {
    formError.value = extractApiErrorMessage(error, 'Could not update the order status.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :open="open"
    :title="`Update status — ${invoice?.invoice_number || ''}`"
    description="Notifications are only sent if you check the boxes below — updating the status alone never emails or texts the customer."
    max-width="max-w-lg"
    @close="emit('close')"
  >
    <form
      id="order-status-form"
      @submit.prevent="submit"
    >
      <div class="px-4 py-5 sm:px-5">
        <div class="grid gap-5">
          <AppSelect
            v-model="form.fulfillment_status"
            label="Status"
            :options="statusOptions"
          />

          <AppTextarea
            v-model="form.note"
            label="Note (optional)"
            placeholder="Visible to the customer if you notify them, e.g. 'Handed to courier this afternoon.'"
            rows="3"
          />

          <div class="grid gap-5 sm:grid-cols-2">
            <AppInput
              v-model="form.tracking_number"
              label="Tracking number (optional)"
              placeholder="e.g. TCS123456789"
            />

            <AppInput
              v-model="form.shipping_carrier"
              label="Carrier (optional)"
              placeholder="e.g. TCS, Leopards..."
            />
          </div>

          <div class="rounded-[14px] border border-gray-200 p-4 dark:border-white/10">
            <p class="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-gray-400">
              Notify customer
            </p>

            <div class="grid gap-3 sm:grid-cols-2">
              <AppToggle
                v-model="form.notify_email"
                label="Email"
              />

              <AppToggle
                v-model="form.notify_sms"
                label="SMS"
              />
            </div>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <div
        v-if="formError"
        class="mb-4 rounded-[12px] bg-red-500/[0.07] p-4 text-sm leading-6 text-red-700 dark:bg-red-500/10 dark:text-red-300"
        aria-live="polite"
      >
        {{ formError }}
      </div>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
          form="order-status-form"
          :loading="saving"
        >
          {{ saving ? 'Saving...' : 'Update status' }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
