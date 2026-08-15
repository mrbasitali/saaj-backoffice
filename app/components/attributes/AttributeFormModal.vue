<script setup lang="ts">
type ProductAttribute = {
 id: number
 name: string
 code: string
 type: string
 is_filterable: boolean
 is_variant: boolean
 is_required: boolean
 is_active: boolean
 sort_order: number
 values_count?: number
}

const props = defineProps<{
 open: boolean
 mode: 'create' | 'edit'
 attribute?: ProductAttribute | null
}>()

const emit = defineEmits<{
 close: []
 saved: []
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')

const fieldErrors =
 ref<Record<string, string>>({})

const form = reactive({
 name: '',
 code: '',
 type: 'select',
 is_filterable: true,
 is_variant: false,
 is_required: false,
 is_active: true,
 sort_order: 0,
})

const typeOptions = [
 {
 label: 'Select',
 value: 'select',
 },
 {
 label: 'Color',
 value: 'color',
 },
 {
 label: 'Text',
 value: 'text',
 },
 {
 label: 'Number',
 value: 'number',
 },
 {
 label: 'Boolean',
 value: 'boolean',
 },
]

const title = computed(() => {
 return props.mode === 'create'
 ? 'Add attribute'
 : 'Edit attribute'
})

const description = computed(() => {
 return props.mode === 'create'
 ? 'Create a reusable product attribute for variants, filters and structured product data.'
 : 'Update how this attribute behaves throughout the catalog.'
})

const typeDescription = computed(() => {
 return {
 select:
 'A fixed list of choices such as Size or Material.',

 color:
 'A fixed list of values with visual color swatches.',

 text:
 'Free-form text data attached to products.',

 number:
 'Numeric product data such as capacity or dimensions.',

 boolean:
 'A simple yes / no product property.',
 }[form.type] ||
 'Choose how this attribute stores product data.'
})

watch(
 () => [
 props.open,
 props.attribute,
 props.mode,
 ] as const,
 () => {
 if (!props.open) {
 return
 }

 resetForm()
 },
 {
 immediate: true,
 },
)

function resetForm() {
 fieldErrors.value = {}
 formError.value = ''

 form.name =
 props.attribute?.name ?? ''

 form.code =
 props.attribute?.code ?? ''

 form.type =
 props.attribute?.type ??
 'select'

 form.is_filterable =
 props.attribute?.is_filterable ??
 true

 form.is_variant =
 props.attribute?.is_variant ??
 false

 form.is_required =
 props.attribute?.is_required ??
 false

 form.is_active =
 props.attribute?.is_active ??
 true

 form.sort_order =
 props.attribute?.sort_order ??
 0
}

function normalizeErrors(
 error: any,
) {
 const errors =
 error?.data?.errors || {}

 const normalized:
 Record<string, string> = {}

 Object.keys(errors).forEach(
 (key) => {
 normalized[key] =
 Array.isArray(
 errors[key],
 )
 ? errors[key][0]
 : String(
 errors[key],
 )
 },
 )

 return normalized
}

function friendlyErrorMessage(
 error: any,
) {
 const message = String(
 error?.data?.message || '',
 )

 const firstFieldError =
 Object.values(
 fieldErrors.value,
 )[0]

 if (firstFieldError) {
 return String(
 firstFieldError,
 )
 }

 return (
 message ||
 'Could not save attribute. Please check the form and try again.'
 )
}

function payload() {
 return {
 name: form.name,

 code:
 form.code ||
 undefined,

 type: form.type,

 is_filterable:
 form.is_filterable,

 is_variant:
 form.is_variant,

 is_required:
 form.is_required,

 is_active:
 form.is_active,

 sort_order:
 Number(
 form.sort_order || 0,
 ),
 }
}

async function submit() {
 saving.value = true

 formError.value = ''
 fieldErrors.value = {}

 try {
 if (
 props.mode === 'create'
 ) {
 await $api(
 '/admin/attributes',
 {
 method: 'POST',
 body: payload(),
 },
 )
 } else if (
 props.attribute
 ) {
 await $api(
 `/admin/attributes/${props.attribute.id}`,
 {
 method: 'PATCH',
 body: payload(),
 },
 )
 }

 emit('saved')
 } catch (error: any) {
 fieldErrors.value =
 normalizeErrors(error)

 formError.value =
 friendlyErrorMessage(
 error,
 )
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
 max-width="max-w-[780px]"
 @close="emit('close')"
 >
 <form
 id="attribute-editor-form"
 @submit.prevent="submit"
 >
 <div
 class="
 space-y-7

 px-4
 py-5

 sm:px-5
 "
 >
 <div
 v-if="formError"
 class="
 rounded-[10px]

 bg-red-500/[0.07]

 px-3
 py-2.5

 text-[12px]
 font-medium
 text-red-600

 dark:bg-red-500/10
 dark:text-red-400
 "
 aria-live="polite"
 >
 {{ formError }}
 </div>

 <!-- Identity -->
 <section>
 <div>
 <h3
 class="
 text-[14px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 Identity
 </h3>

 <p
 class="
 mt-1

 text-[11px]
 leading-5
 text-gray-400

 dark:text-gray-500
 "
 >
 Give the attribute a clear
 name and choose the kind
 of data it stores.
 </p>
 </div>

 <div
 class="
 mt-4

 grid
 gap-4

 sm:grid-cols-2
 "
 >
 <AppInput
 v-model="form.name"
 label="Attribute name"
 placeholder="Example: Size"
 :error="
 fieldErrors.name
 "
 required
 />

 <AppInput
 v-model="form.code"
 label="Code"
 placeholder="Auto from name if empty"
 :error="
 fieldErrors.code
 "
 />

 <AppSelect
 v-model="form.type"
 label="Type"
 :options="
 typeOptions
 "
 />

 <AppInput
 v-model="
 form.sort_order
 "
 label="Sort order"
 type="number"
 placeholder="0"
 :error="
 fieldErrors.sort_order
 "
 />
 </div>

 <div
 class="
 mt-3

 flex
 items-start
 gap-2

 rounded-[10px]

 bg-gray-950/[0.035]

 px-3
 py-2.5

 text-[11px]
 leading-5
 text-gray-500

 dark:bg-white/[0.055]
 dark:text-gray-500
 "
 >
 <span
 class="
 mt-[7px]

 h-1.5
 w-1.5
 shrink-0
 rounded-full

 bg-gray-400

 dark:bg-gray-600
 "
 />

 {{ typeDescription }}
 </div>
 </section>

 <!-- Behaviour -->
 <section>
 <div>
 <h3
 class="
 text-[14px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 Behavior
 </h3>

 <p
 class="
 mt-1

 text-[11px]
 leading-5
 text-gray-400

 dark:text-gray-500
 "
 >
 Control where this
 attribute is used.
 </p>
 </div>

 <div
 class="
 mt-4

 grid
 gap-3

 sm:grid-cols-2
 "
 >
 <div
 class="
 rounded-[12px]

 bg-gray-950/[0.035]

 p-3.5

 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="
 form.is_active
 "
 label="Active"
 description="Available for future product assignments."
 />
 </div>

 <div
 class="
 rounded-[12px]

 bg-gray-950/[0.035]

 p-3.5

 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="
 form.is_variant
 "
 label="Use for variants"
 description="Use values such as Size or Color when creating SKUs."
 />
 </div>

 <div
 class="
 rounded-[12px]

 bg-gray-950/[0.035]

 p-3.5

 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="
 form.is_filterable
 "
 label="Filterable"
 description="Allow this attribute to appear in category filters."
 />
 </div>

 <div
 class="
 rounded-[12px]

 bg-gray-950/[0.035]

 p-3.5

 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="
 form.is_required
 "
 label="Required"
 description="Require a value wherever this attribute is assigned."
 />
 </div>
 </div>
 </section>
 </div>
 </form>

 <template #footer>
 <div
 class="
 flex
 items-center
 justify-end
 gap-2
 "
 >
 <AppButton
 type="button"
 variant="ghost"
 :disabled="saving"
 @click="emit('close')"
 >
 Cancel
 </AppButton>

 <AppButton
 type="submit"
 form="attribute-editor-form"
 :loading="saving"
 >
 {{
 mode === 'create'
 ? 'Create attribute'
 : 'Save changes'
 }}
 </AppButton>
 </div>
 </template>
 </AppModal>
</template>