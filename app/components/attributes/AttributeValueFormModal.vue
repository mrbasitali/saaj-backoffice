<script setup lang="ts">
type ProductAttribute = {
 id: number
 name: string
 code: string
 type: string
}

type AttributeValue = {
 id: number
 attribute_id: number
 value: string
 slug: string
 color_code: string | null
 is_active: boolean
 sort_order: number
}

const props = defineProps<{
 open: boolean
 mode: 'create' | 'edit'
 attribute: ProductAttribute | null
 value?: AttributeValue | null
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
 value: '',
 slug: '',
 color_code: '',
 is_active: true,
 sort_order: 0,
})

const isColorAttribute =
 computed(() => {
 return (
 props.attribute?.type
 === 'color'
 )
 })

const title = computed(() => {
 return props.mode === 'create'
 ? 'Add value'
 : 'Edit value'
})

const description = computed(() => {
 if (!props.attribute) {
 return ''
 }

 return props.mode === 'create'
 ? `Create a value for ${props.attribute.name}.`
 : `Update this ${props.attribute.name} value.`
})

watch(
 () => [
 props.open,
 props.value,
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

 form.value =
 props.value?.value ?? ''

 form.slug =
 props.value?.slug ?? ''

 form.color_code =
 props.value?.color_code ??
 (
 isColorAttribute.value
 ? '#000000'
 : ''
 )

 form.is_active =
 props.value?.is_active ??
 true

 form.sort_order =
 props.value?.sort_order ??
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

 if (
 message
 .toLowerCase()
 .includes(
 'duplicate entry',
 ) ||
 message
 .toLowerCase()
 .includes(
 'attribute_values_attribute_id_slug_unique',
 )
 ) {
 return 'This attribute already has a value with this slug.'
 }

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
 'Could not save attribute value. Please check the form and try again.'
 )
}

function payload() {
 return {
 value: form.value,

 slug:
 form.slug ||
 undefined,

 color_code:
 isColorAttribute.value &&
 form.color_code
 ? form.color_code
 : null,

 is_active:
 form.is_active,

 sort_order:
 Number(
 form.sort_order || 0,
 ),
 }
}

async function submit() {
 if (!props.attribute) {
 formError.value =
 'Please select an attribute first.'

 return
 }

 saving.value = true

 formError.value = ''
 fieldErrors.value = {}

 try {
 if (
 props.mode === 'create'
 ) {
 await $api(
 `/admin/attributes/${props.attribute.id}/values`,
 {
 method: 'POST',
 body: payload(),
 },
 )
 } else if (
 props.value
 ) {
 await $api(
 `/admin/attribute-values/${props.value.id}`,
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
 max-width="max-w-[620px]"
 @close="emit('close')"
 >
 <form
 id="attribute-value-form"
 @submit.prevent="submit"
 >
 <div
 class="
 space-y-5

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

 <div
 class="
 grid
 gap-4

 sm:grid-cols-2
 "
 >
 <AppInput
 v-model="form.value"
 label="Value"
 placeholder="Example: XL"
 :error="
 fieldErrors.value
 "
 required
 />

 <AppInput
 v-model="form.slug"
 label="Slug"
 placeholder="Auto from value if empty"
 :error="
 fieldErrors.slug
 "
 />

 <!-- Color -->
 <div
 v-if="
 isColorAttribute
 "
 >
 <label
 class="
 mb-1.5
 block

 text-[12px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 Color
 </label>

 <div
 class="
 flex
 items-center
 gap-2
 "
 >
 <input
 v-model="
 form.color_code
 "
 type="color"
 aria-label="Color"
 class="
 h-10
 w-11
 shrink-0

 cursor-pointer

 rounded-[9px]

 bg-gray-950/[0.04]

 p-1

 dark:bg-white/[0.06]
 "
 >

 <AppInput
 v-model="
 form.color_code
 "
 class="min-w-0 flex-1"
 placeholder="#000000"
 :error="
 fieldErrors
 .color_code
 "
 />
 </div>
 </div>

 <AppInput
 v-model="
 form.sort_order
 "
 label="Sort order"
 type="number"
 placeholder="0"
 :error="
 fieldErrors
 .sort_order
 "
 />
 </div>

 <!-- Preview for colors -->
 <div
 v-if="
 isColorAttribute
 "
 class="
 flex
 items-center
 gap-3

 rounded-[11px]

 bg-gray-950/[0.035]

 p-3

 dark:bg-white/[0.055]
 "
 >
 <span
 class="
 h-9
 w-9
 shrink-0

 rounded-[9px]

 ring-1
 ring-black/[0.06]

 dark:ring-white/10
 "
 :style="{
 backgroundColor:
 form.color_code
 || '#000000',
 }"
 />

 <div class="min-w-0">
 <p
 class="
 truncate

 text-[12px]
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{
 form.value ||
 'Color preview'
 }}
 </p>

 <p
 class="
 mt-0.5

 font-mono
 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{
 form.color_code
 || '#000000'
 }}
 </p>
 </div>
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
 form.is_active
 "
 label="Active value"
 description="Available for future product and variant selections."
 />
 </div>
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
 form="attribute-value-form"
 :loading="saving"
 >
 {{
 mode === 'create'
 ? 'Create value'
 : 'Save changes'
 }}
 </AppButton>
 </div>
 </template>
 </AppModal>
</template>