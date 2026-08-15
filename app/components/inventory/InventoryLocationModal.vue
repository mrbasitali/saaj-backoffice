<script setup lang="ts">
type InventoryLocation = {
 id: number
 name: string
 code: string
 type: string
 phone: string | null
 address: string | null
 is_default: boolean
 is_active: boolean
 sort_order: number
}

type InventoryLocationResponse = {
 data: InventoryLocation
 message?: string
}

const props = defineProps<{
 open: boolean
 mode: 'create' | 'edit'
 location?: InventoryLocation | null
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
 name: '',
 code: '',
 type: 'warehouse',
 phone: '',
 address: '',
 is_default: false,
 is_active: true,
 sort_order: 0,
})

const title = computed(() => props.mode === 'create' ? 'Add location' : 'Edit location')

const description = computed(() => {
 return props.mode === 'create'
 ? 'Create a warehouse, store or online stock location.'
 : 'Update location details and availability.'
})

const typeOptions = [
 { label: 'Warehouse', value: 'warehouse' },
 { label: 'Store', value: 'store' },
 { label: 'Online', value: 'online' },
]

watch(
 () => [props.open, props.location, props.mode] as const,
 () => {
 if (!props.open) return
 resetForm()
 },
 { immediate: true },
)

function resetForm() {
 formError.value = ''
 fieldErrors.value = {}

 form.name = props.location?.name ?? ''
 form.code = props.location?.code ?? ''
 form.type = props.location?.type ?? 'warehouse'
 form.phone = props.location?.phone ?? ''
 form.address = props.location?.address ?? ''
 form.is_default = props.location?.is_default ?? false
 form.is_active = props.location?.is_active ?? true
 form.sort_order = props.location?.sort_order ?? 0
}

function normalizeCode() {
 form.code = form.code
 .toLowerCase()
 .replace(/[^a-z0-9_\s-]/g, '')
 .trim()
 .replace(/[\s-]+/g, '_')
}

function normalizeErrors(error: any) {
 const errors = error?.data?.errors || {}
 const normalized: Record<string, string> = {}

 Object.keys(errors).forEach((key) => {
 normalized[key] = Array.isArray(errors[key]) ? errors[key][0] : String(errors[key])
 })

 return normalized
}

async function submit() {
 saving.value = true
 formError.value = ''
 fieldErrors.value = {}

 try {
 const endpoint = props.mode === 'create'
 ? '/admin/inventory-locations'
 : `/admin/inventory-locations/${props.location?.id}`

 const response = await $api<InventoryLocationResponse>(endpoint, {
 method: props.mode === 'create' ? 'POST' : 'PATCH',
 body: {
 name: form.name,
 code: form.code || undefined,
 type: form.type,
 phone: form.phone || null,
 address: form.address || null,
 is_default: form.is_default,
 is_active: form.is_active,
 sort_order: Number(form.sort_order || 0),
 },
 })

 emit('saved', response.message || 'Location saved successfully.')
 } catch (error: any) {
 fieldErrors.value = normalizeErrors(error)
 formError.value = error?.data?.message || Object.values(fieldErrors.value)[0] || 'Could not save location.'
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
 max-width="max-w-3xl"
 @close="emit('close')"
 >
 <form @submit.prevent="submit">
 <div class="p-4 sm:p-5">
 <div
 v-if="formError"
 class="mb-5 rounded-[12px] bg-red-500/[0.07] p-4 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
 >
 {{ formError }}
 </div>

 <div class="grid gap-5 lg:grid-cols-2">
 <AppInput
 v-model="form.name"
 label="Location name"
 placeholder="Main warehouse"
 :error="fieldErrors.name"
 required
 />

 <AppInput
 v-model="form.code"
 label="Code"
 placeholder="main_warehouse"
 :error="fieldErrors.code"
 @blur="normalizeCode"
 />

 <AppSelect
 v-model="form.type"
 label="Type"
 :options="typeOptions"
 />

 <AppInput
 v-model="form.sort_order"
 label="Sort order"
 type="number"
 :error="fieldErrors.sort_order"
 />

 <AppInput
 v-model="form.phone"
 label="Phone"
 placeholder="+971..."
 :error="fieldErrors.phone"
 />

 <div class="grid gap-3">
 <AppToggle
 v-model="form.is_active"
 label="Active"
 description="Inactive locations are hidden from normal adjustment flows."
 />

 <AppToggle
 v-model="form.is_default"
 label="Default location"
 description="Used as the default stock destination. Only one location can be default."
 />
 </div>

 <AppTextarea
 v-model="form.address"
 class="lg:col-span-2"
 label="Address"
 placeholder="Location address or internal handling notes"
 :rows="3"
 :error="fieldErrors.address"
 />
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
 >
 {{ saving ? 'Saving...' : 'Save location' }}
 </AppButton>
 </div>
 </form>
 </AppModal>
</template>