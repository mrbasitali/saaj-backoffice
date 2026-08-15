<script setup lang="ts">
type ExpenseCategory = {
  id: number
  name: string
  is_active: boolean
}

type Vendor = {
  id: number
  name: string
  code: string
  is_active: boolean
}

type InventoryLocation = {
  id: number
  name: string
  code: string
  is_active: boolean
}

type Expense = {
  id: number
  expense_category_id: number
  vendor_id: number | null
  inventory_location_id: number | null
  expense_number: string
  title: string
  payee: string | null
  expense_date: string
  amount: string | number
  payment_method: string
  status: string
  reference_number: string | null
  receipt_url: string | null
  notes: string | null
}

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  expense?: Expense | null
  categories: ExpenseCategory[]
  vendors: Vendor[]
  locations: InventoryLocation[]
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const receiptInput = ref<HTMLInputElement | null>(null)
const receiptFile = ref<File | null>(null)
const removeReceipt = ref(false)

const copyingPrevious = ref(false)

const form = reactive({
  expense_category_id: null as number | null,
  vendor_id: null as number | null,
  inventory_location_id: null as number | null,
  title: '',
  payee: '',
  expense_date: '',
  amount: '',
  payment_method: 'cash',
  is_paid: true,
  reference_number: '',
  notes: '',
})

const title = computed(() => props.mode === 'create' ? 'Record expense' : 'Edit expense')

const description = computed(() => {
  return props.mode === 'create'
    ? 'Log a cost — rent, salaries, utilities, or anything else it takes to run the store.'
    : `Editing ${props.expense?.expense_number} — only pending expenses can be edited.`
})

const categoryOptions = computed(() => [
  ...props.categories
    .filter((category) => category.is_active)
    .map((category) => ({ label: category.name, value: category.id })),
])

const vendorOptions = computed(() => [
  { label: 'No vendor — paid to an individual/company', value: null },
  ...props.vendors
    .filter((vendor) => vendor.is_active)
    .map((vendor) => ({ label: `${vendor.name} (${vendor.code})`, value: vendor.id })),
])

const locationOptions = computed(() => [
  { label: 'Not tied to a specific location', value: null },
  ...props.locations
    .filter((location) => location.is_active)
    .map((location) => ({ label: location.name, value: location.id })),
])

const paymentMethodOptions = [
  { label: 'Cash', value: 'cash' },
  { label: 'Card', value: 'card' },
  { label: 'Bank transfer', value: 'bank_transfer' },
  { label: 'Easypaisa', value: 'easypaisa' },
  { label: 'JazzCash', value: 'jazzcash' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Other', value: 'other' },
]

const receiptPreview = computed(() => {
  if (receiptFile.value) return URL.createObjectURL(receiptFile.value)
  if (removeReceipt.value) return ''

  return props.expense?.receipt_url || ''
})

const isLocked = computed(() => props.mode === 'edit' && props.expense?.status !== 'pending')

watch(
  () => [props.open, props.expense, props.mode] as const,
  () => {
    if (!props.open) return
    resetForm()
  },
  { immediate: true },
)

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function resetForm() {
  formError.value = ''
  fieldErrors.value = {}
  receiptFile.value = null
  removeReceipt.value = false

  if (receiptInput.value) receiptInput.value.value = ''

  form.expense_category_id = props.expense?.expense_category_id ?? props.categories.find((category) => category.is_active)?.id ?? null
  form.vendor_id = props.expense?.vendor_id ?? null
  form.inventory_location_id = props.expense?.inventory_location_id ?? null
  form.title = props.expense?.title ?? ''
  form.payee = props.expense?.payee ?? ''
  form.expense_date = props.expense?.expense_date ?? todayDate()
  form.amount = props.expense ? String(props.expense.amount) : ''
  form.payment_method = props.expense?.payment_method ?? 'cash'
  form.is_paid = props.expense ? props.expense.status === 'paid' : true
  form.reference_number = props.expense?.reference_number ?? ''
  form.notes = props.expense?.notes ?? ''
}

function onReceiptChange(event: Event) {
  const input = event.target as HTMLInputElement
  receiptFile.value = input.files?.[0] || null
  removeReceipt.value = false
}

function clearReceipt() {
  receiptFile.value = null
  removeReceipt.value = true

  if (receiptInput.value) receiptInput.value.value = ''
}

type ExpenseSearchResponse = {
  data: Expense[]
}

/**
 * Not true recurring automation (see the build notes) — just fetches the
 * most recent expense in whichever category is currently selected and
 * copies its title/payee/vendor/location/amount/payment method across.
 * Covers the common "same rent, same landlord, every month" case in one
 * click without any scheduling machinery behind it.
 */
async function copyFromPrevious() {
  if (!form.expense_category_id) {
    formError.value = 'Pick a category first, then Copy from previous can find the last expense in it.'
    return
  }

  copyingPrevious.value = true
  formError.value = ''

  try {
    const response = await $api<ExpenseSearchResponse>('/admin/expenses', {
      query: {
        expense_category_id: form.expense_category_id,
        sort_by: 'latest',
        per_page: 1,
      },
    })

    const previous = response.data?.[0]

    if (!previous) {
      formError.value = 'No previous expense found in this category to copy from.'
      return
    }

    form.title = previous.title
    form.payee = previous.payee ?? ''
    form.vendor_id = previous.vendor_id
    form.inventory_location_id = previous.inventory_location_id
    form.amount = String(previous.amount)
    form.payment_method = previous.payment_method
  } catch {
    formError.value = 'Could not look up a previous expense right now.'
  } finally {
    copyingPrevious.value = false
  }
}

function normalizeErrors(error: any) {
  const errors = error?.data?.errors || {}
  const normalized: Record<string, string> = {}

  Object.keys(errors).forEach((key) => {
    normalized[key] = Array.isArray(errors[key]) ? errors[key][0] : String(errors[key])
  })

  return normalized
}

function friendlyErrorMessage(error: any) {
  const message = String(error?.data?.message || '')
  const firstFieldError = Object.values(fieldErrors.value)[0]

  if (firstFieldError) return String(firstFieldError)

  return message || 'Could not save this expense. Please check the form and try again.'
}

function buildFormData() {
  const data = new FormData()

  if (props.mode === 'edit') {
    data.append('_method', 'PATCH')
  }

  data.append('expense_category_id', String(form.expense_category_id))

  if (form.vendor_id) data.append('vendor_id', String(form.vendor_id))
  if (form.inventory_location_id) data.append('inventory_location_id', String(form.inventory_location_id))

  data.append('title', form.title)
  data.append('payee', form.payee)
  data.append('expense_date', form.expense_date)
  data.append('amount', String(Number(form.amount || 0)))
  data.append('payment_method', form.payment_method)
  data.append('reference_number', form.reference_number)
  data.append('notes', form.notes)

  if (props.mode === 'create') {
    data.append('is_paid', form.is_paid ? '1' : '0')
  }

  if (receiptFile.value) {
    data.append('receipt_image', receiptFile.value)
  } else if (removeReceipt.value) {
    data.append('remove_receipt', '1')
  }

  return data
}

async function submit() {
  saving.value = true
  formError.value = ''
  fieldErrors.value = {}

  try {
    if (props.mode === 'create') {
      await $api('/admin/expenses', {
        method: 'POST',
        body: buildFormData(),
      })
    } else if (props.expense) {
      await $api(`/admin/expenses/${props.expense.id}`, {
        method: 'POST',
        body: buildFormData(),
      })
    }

    emit('saved')
  } catch (error: any) {
    fieldErrors.value = normalizeErrors(error)
    formError.value = friendlyErrorMessage(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    :description="description"
    max-width="max-w-2xl"
    @close="emit('close')"
  >
    <div
      v-if="isLocked"
      class="px-4 pt-5 sm:px-5"
    >
      <div class="rounded-[12px] bg-amber-500/[0.08] p-4 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
        This expense is {{ expense?.status }} and locked from editing — cancel it and record a new one if something needs to change.
      </div>
    </div>

    <form
      id="expense-form"
      @submit.prevent="submit"
    >
      <fieldset
        :disabled="isLocked"
        class="disabled:opacity-60"
      >
        <div class="px-4 py-5 sm:px-5">
          <div class="grid gap-5">
            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <AppSelect
                  v-model="form.expense_category_id"
                  label="Category"
                  :options="categoryOptions"
                  :error="fieldErrors.expense_category_id"
                  required
                />

                <button
                  v-if="mode === 'create'"
                  type="button"
                  class="mt-2 text-[12px] font-semibold text-gray-500 transition hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
                  :disabled="copyingPrevious"
                  @click="copyFromPrevious"
                >
                  {{ copyingPrevious ? 'Looking up...' : 'Copy from previous in this category' }}
                </button>
              </div>

              <AppInput
                v-model="form.expense_date"
                type="date"
                label="Date"
                :error="fieldErrors.expense_date"
                required
              />
            </div>

            <AppInput
              v-model="form.title"
              label="Title"
              placeholder="Example: August rent, K-Electric bill..."
              :error="fieldErrors.title"
              required
            />

            <div class="grid gap-5 sm:grid-cols-2">
              <AppInput
                v-model="form.payee"
                label="Paid to (optional)"
                placeholder="Landlord name, utility company..."
                :error="fieldErrors.payee"
              />

              <AppInput
                v-model="form.amount"
                type="number"
                label="Amount"
                placeholder="0.00"
                :error="fieldErrors.amount"
                required
              />
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
              <AppSelect
                v-model="form.vendor_id"
                label="Vendor (optional)"
                :options="vendorOptions"
                searchable
              />

              <AppSelect
                v-model="form.inventory_location_id"
                label="Location (optional)"
                :options="locationOptions"
              />
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
              <AppSelect
                v-model="form.payment_method"
                label="Payment method"
                :options="paymentMethodOptions"
              />

              <AppInput
                v-model="form.reference_number"
                label="Reference number (optional)"
                placeholder="Cheque no., transaction ref..."
                :error="fieldErrors.reference_number"
              />
            </div>

            <AppToggle
              v-if="mode === 'create'"
              v-model="form.is_paid"
              label="Already paid"
              description="On means this is settled already. Off keeps it pending until you mark it paid."
            />

            <AppTextarea
              v-model="form.notes"
              label="Notes (optional)"
              placeholder="Anything worth remembering about this expense..."
              :error="fieldErrors.notes"
              rows="3"
            />

            <div class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <label class="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Receipt
                  </label>

                  <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
                    Photo of the bill/receipt. JPG, PNG or WebP.
                  </p>
                </div>

                <AppButton
                  v-if="receiptFile || (props.expense?.receipt_url && !removeReceipt)"
                  type="button"
                  variant="ghost"
                  size="sm"
                  @click="clearReceipt"
                >
                  Clear
                </AppButton>
              </div>

              <div class="mt-4 flex items-center gap-4">
                <div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-gray-950/[0.04] dark:bg-white/[0.055]">
                  <img
                    v-if="receiptPreview"
                    :src="receiptPreview"
                    alt=""
                    class="h-full w-full object-cover"
                  >

                  <span
                    v-else
                    class="text-[11px] font-medium text-gray-400"
                  >
                    No receipt
                  </span>
                </div>

                <div class="min-w-0 flex-1">
                  <input
                    ref="receiptInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    class="block w-full text-[12px] text-gray-500 file:mr-3 file:rounded-[9px] file:border-0 file:bg-gray-950 file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-white hover:file:bg-gray-800 dark:text-gray-500 dark:file:bg-white dark:file:text-gray-950"
                    @change="onReceiptChange"
                  >

                  <p
                    v-if="fieldErrors.receipt_image"
                    class="mt-2 text-sm text-red-600 dark:text-red-400"
                  >
                    {{ fieldErrors.receipt_image }}
                  </p>

                  <p
                    v-if="receiptFile"
                    class="mt-2 truncate text-xs text-gray-500 dark:text-gray-400"
                  >
                    {{ receiptFile.name }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </fieldset>
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
          v-if="!isLocked"
          type="submit"
          form="expense-form"
          :loading="saving"
        >
          {{ saving ? 'Saving...' : mode === 'create' ? 'Record expense' : 'Save changes' }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
