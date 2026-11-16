<script setup lang="ts">
export type OrderCancellationPreview = {
  recipients: { email: string | null, sms: string | null }
  email_subject: string
  email_headline: string
  email_body: string
  sms_body: string
}

type CancellationResult = {
  message: string
  notification: { email: boolean | null, sms: boolean | null }
}

const props = defineProps<{ id: number, orderNumber: string, notice: OrderCancellationPreview }>()
const emit = defineEmits<{ close: [], updated: [id: number] }>()
const { $api } = useNuxtApp()
const panel = ref<HTMLElement>()
const notifyEmail = ref(false)
const notifySms = ref(false)
const saving = ref(false)
const error = ref('')
const result = ref<CancellationResult>()

function close() {
  if (!saving.value) emit('close')
}

onMounted(() => panel.value?.closest('dialog')?.addEventListener('cancel', close))
onBeforeUnmount(() => panel.value?.closest('dialog')?.removeEventListener('cancel', close))

async function submit() {
  if (saving.value || result.value) return
  error.value = ''
  saving.value = true
  try {
    result.value = await $api<CancellationResult>(`/admin/sale-invoices/${props.id}/cancel-order`, {
      method: 'POST',
      body: {
        confirm_cancellation: true,
        notify_email: notifyEmail.value,
        notify_sms: notifySms.value,
        email_recipient: notifyEmail.value ? props.notice.recipients.email : null,
        sms_recipient: notifySms.value ? props.notice.recipients.sms : null,
      },
    })
    emit('updated', props.id)
  } catch (cause) {
    error.value = extractApiErrorMessage(cause, 'Could not confirm the cancellation. Check the order status before trying again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div ref="panel" class="space-y-5 p-5 sm:p-6">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h3 id="online-order-cancellation-title" class="text-lg font-semibold">Cancel entire order</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ orderNumber }}</p>
      </div>
      <button type="button" class="text-sm font-medium hover:underline" :disabled="saving" @click="close">Close</button>
    </header>

    <div v-if="result" class="space-y-4">
      <div role="status" class="space-y-1 rounded-lg bg-gray-950/5 p-4 text-sm dark:bg-white/10">
        <p class="font-semibold">{{ result.message }}</p>
        <p v-if="result.notification.email !== null">{{ result.notification.email ? 'Cancellation email queued.' : 'The cancellation email could not be queued.' }}</p>
        <p v-if="result.notification.sms !== null">{{ result.notification.sms ? 'Cancellation SMS queued.' : 'The cancellation SMS could not be queued.' }}</p>
      </div>
      <div class="flex justify-end">
        <AppButton type="button" @click="close">Done</AppButton>
      </div>
    </div>

    <form v-else class="space-y-5" @submit.prevent="submit">
      <p class="rounded-lg bg-rose-500/10 p-3 text-sm leading-6 text-rose-900 dark:text-rose-100">
        Cancels all items, clears the cash-on-delivery balance, and releases sellable stock.
      </p>

      <fieldset class="grid gap-3 text-sm" :disabled="saving">
        <legend class="mb-2 font-semibold">Notify customer</legend>
        <AppToggle
          v-model="notifyEmail" label="Email" :description="notice.recipients.email || 'No confirmed email available'"
          role="switch" :aria-checked="notifyEmail" :disabled="!notice.recipients.email || saving"
        />
        <AppToggle
          v-model="notifySms" label="SMS" :description="notice.recipients.sms || 'No confirmed mobile number available'"
          role="switch" :aria-checked="notifySms" :disabled="!notice.recipients.sms || saving"
        />
        <p v-if="!notifyEmail && !notifySms" class="text-xs text-gray-600 dark:text-gray-300">The order will be cancelled without sending a notice.</p>
      </fieldset>

      <section v-if="notifyEmail" class="space-y-2 rounded-xl bg-gray-950/[0.045] p-4 text-sm dark:bg-white/[0.06]">
        <h4 class="font-semibold">Email preview</h4>
        <p class="text-xs text-gray-600 dark:text-gray-300">{{ notice.email_subject }}</p>
        <p class="font-serif text-xl font-semibold">{{ notice.email_headline }}</p>
        <p>{{ notice.email_body }}</p>
        <span class="inline-block bg-[#171815] px-4 py-2.5 font-medium text-white">Contact SAAJ →</span>
      </section>

      <section v-if="notifySms" class="space-y-2 rounded-xl bg-gray-950/[0.045] p-4 text-sm dark:bg-white/[0.06]">
        <h4 class="font-semibold">SMS preview</h4>
        <p>{{ notice.sms_body }}</p>
      </section>

      <p v-if="error" role="alert" class="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-900 dark:text-rose-100">{{ error }}</p>
      <div class="flex flex-wrap justify-end gap-2">
        <AppButton type="button" variant="secondary" :disabled="saving" @click="close">Keep order</AppButton>
        <AppButton type="submit" variant="danger" :loading="saving">Confirm cancellation</AppButton>
      </div>
    </form>
  </div>
</template>
