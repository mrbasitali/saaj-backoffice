<script setup lang="ts">
type ExpenseCategory = {
  id: number
  name: string
  slug: string
  description: string | null
  is_active: boolean
  sort_order: number
}

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  category?: ExpenseCategory | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const form = reactive({
  name: '',
  slug: '',
  description: '',
  is_active: true,
  sort_order: 0,
})

const title = computed(() => props.mode === 'create' ? 'Add expense category' : 'Edit expense category')

const description = computed(() => {
  return props.mode === 'create'
    ? 'Create a category to group expenses under — Rent, Salaries, Utilities, etc.'
    : 'Update this expense category.'
})

watch(
  () => [props.open, props.category, props.mode] as const,
  () => {
    if (!props.open) return
    resetForm()
  },
  { immediate: true },
)

function resetForm() {
  formError.value = ''
  fieldErrors.value = {}

  form.name = props.category?.name ?? ''
  form.slug = props.category?.slug ?? ''
  form.description = props.category?.description ?? ''
  form.is_active = props.category?.is_active ?? true
  form.sort_order = props.category?.sort_order ?? 0
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

  if (message.toLowerCase().includes('duplicate entry') || message.toLowerCase().includes('slug')) {
    return 'A category with this slug already exists. Use a different name or slug.'
  }

  if (firstFieldError) return String(firstFieldError)

  return message || 'Could not save this category. Please check the form and try again.'
}

function buildFormData() {
  const data = new FormData()

  if (props.mode === 'edit') {
    data.append('_method', 'PATCH')
  }

  data.append('name', form.name)
  data.append('slug', form.slug)
  data.append('description', form.description)
  data.append('is_active', form.is_active ? '1' : '0')
  data.append('sort_order', String(Number(form.sort_order || 0)))

  return data
}

async function submit() {
  saving.value = true
  formError.value = ''
  fieldErrors.value = {}

  try {
    if (props.mode === 'create') {
      await $api('/admin/expense-categories', {
        method: 'POST',
        body: buildFormData(),
      })
    } else if (props.category) {
      await $api(`/admin/expense-categories/${props.category.id}`, {
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
    max-width="max-w-xl"
    @close="emit('close')"
  >
    <form
      id="expense-category-form"
      @submit.prevent="submit"
    >
      <div class="px-4 py-5 sm:px-5">
        <div class="grid gap-5">
          <AppInput
            v-model="form.name"
            label="Category name"
            placeholder="Example: Rent"
            :error="fieldErrors.name"
            required
          />

          <AppInput
            v-model="form.slug"
            label="Slug"
            placeholder="Auto from name if empty"
            :error="fieldErrors.slug"
          />

          <AppTextarea
            v-model="form.description"
            label="Description"
            placeholder="Optional notes about what belongs in this category..."
            :error="fieldErrors.description"
            rows="3"
          />

          <div class="grid gap-5 sm:grid-cols-2">
            <AppInput
              v-model="form.sort_order"
              label="Sort order"
              type="number"
              placeholder="0"
              :error="fieldErrors.sort_order"
            />

            <AppToggle
              v-model="form.is_active"
              label="Active"
              description="Inactive categories are hidden when recording new expenses."
            />
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
          form="expense-category-form"
          :loading="saving"
        >
          {{ saving ? 'Saving...' : mode === 'create' ? 'Create category' : 'Save changes' }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
