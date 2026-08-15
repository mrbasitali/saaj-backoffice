<script setup lang="ts">
type Brand = {
 id: number
 name: string
 slug: string
 description: string | null
 logo_url: string | null
 logo_public_id: string | null
 banner_image_url: string | null
 banner_image_public_id: string | null
 meta_title: string | null
 meta_description: string | null
 is_active: boolean
 sort_order: number
 created_at?: string | null
 updated_at?: string | null
}

const props = defineProps<{
 open: boolean
 mode: 'create' | 'edit'
 brand?: Brand | null
}>()

const emit = defineEmits<{
 close: []
 saved: []
}>()

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const logoInput = ref<HTMLInputElement | null>(null)
const bannerInput = ref<HTMLInputElement | null>(null)

const logoFile = ref<File | null>(null)
const bannerFile = ref<File | null>(null)

const form = reactive({
 name: '',
 slug: '',
 description: '',
 meta_title: '',
 meta_description: '',
 is_active: true,
 sort_order: 0,
})

const title = computed(() => props.mode === 'create' ? 'Add brand' : 'Edit brand')

const description = computed(() => {
 return props.mode === 'create'
 ? 'Create a brand for catalog products and storefront filtering.'
 : 'Update brand details, media and SEO information.'
})

const logoPreview = computed(() => {
 if (logoFile.value) return URL.createObjectURL(logoFile.value)

 return props.brand?.logo_url || ''
})

const bannerPreview = computed(() => {
 if (bannerFile.value) return URL.createObjectURL(bannerFile.value)

 return props.brand?.banner_image_url || ''
})

watch(
 () => [props.open, props.brand, props.mode] as const,
 () => {
 if (!props.open) return
 resetForm()
 },
 { immediate: true },
)

function resetForm() {
 formError.value = ''
 fieldErrors.value = ''

 logoFile.value = null
 bannerFile.value = null

 if (logoInput.value) logoInput.value.value = ''
 if (bannerInput.value) bannerInput.value.value = ''

 form.name = props.brand?.name ?? ''
 form.slug = props.brand?.slug ?? ''
 form.description = props.brand?.description ?? ''
 form.meta_title = props.brand?.meta_title ?? ''
 form.meta_description = props.brand?.meta_description ?? ''
 form.is_active = props.brand?.is_active ?? true
 form.sort_order = props.brand?.sort_order ?? 0
}

function onLogoChange(event: Event) {
 const input = event.target as HTMLInputElement
 logoFile.value = input.files?.[0] ?? null
}

function onBannerChange(event: Event) {
 const input = event.target as HTMLInputElement
 bannerFile.value = input.files?.[0] ?? null
}

function clearLogo() {
 logoFile.value = null

 if (logoInput.value) {
 logoInput.value.value = ''
 }
}

function clearBanner() {
 bannerFile.value = null

 if (bannerInput.value) {
 bannerInput.value.value = ''
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

 if (
 message.toLowerCase().includes('duplicate entry') ||
 message.toLowerCase().includes('brands_slug_unique')
 ) {
 return 'A brand with this slug already exists. Use a different slug.'
 }

 if (firstFieldError) return String(firstFieldError)

 return message || 'Could not save brand. Please check the form and try again.'
}

function buildFormData() {
 const data = new FormData()

 if (props.mode === 'edit') {
 data.append('_method', 'PATCH')
 }

 data.append('name', form.name)
 data.append('slug', form.slug)
 data.append('description', form.description)
 data.append('meta_title', form.meta_title)
 data.append('meta_description', form.meta_description)
 data.append('is_active', form.is_active ? '1' : '0')
 data.append('sort_order', String(Number(form.sort_order || 0)))

 if (logoFile.value) {
 data.append('logo_image', logoFile.value)
 }

 if (bannerFile.value) {
 data.append('banner_image', bannerFile.value)
 }

 return data
}

async function submit() {
 saving.value = true
 formError.value = ''
 fieldErrors.value = {}

 try {
 if (props.mode === 'create') {
 await $api('/admin/brands', {
 method: 'POST',
 body: buildFormData(),
 })
 } else if (props.brand) {
 await $api(`/admin/brands/${props.brand.id}`, {
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
 max-width="max-w-4xl"
 @close="emit('close')"
 >
 <form @submit.prevent="submit">
 <div class="px-4 py-5 sm:px-5">
 <div class="grid gap-6">
 <div class="grid gap-5 lg:grid-cols-2">
 <AppInput
 v-model="form.name"
 label="Brand name"
 placeholder="Example: Nike"
 :error="fieldErrors.name"
 required
 />

 <AppInput
 v-model="form.slug"
 label="Slug"
 placeholder="Auto from name if empty"
 :error="fieldErrors.slug"
 />

 <div class="lg:col-span-2">
 <AppTextarea
 v-model="form.description"
 label="Description"
 placeholder="Short brand description..."
 :error="fieldErrors.description"
 rows="4"
 />
 </div>

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
 description="Inactive brands are hidden from storefront listings."
 />
 </div>

 <div class="grid gap-5 lg:grid-cols-2">
 <div class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
 <div class="flex items-start justify-between gap-4">
 <div>
 <label class="text-sm font-semibold text-gray-800 dark:text-gray-200">
 Logo
 </label>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Upload square logo. JPG, PNG or WebP.
 </p>
 </div>

 <AppButton
 v-if="logoFile"
 type="button"
 variant="ghost"
 size="sm"
 @click="clearLogo"
 >
 Clear
 </AppButton>
 </div>

 <div class="mt-4 flex items-center gap-4">
 <div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-gray-950/[0.04] dark:bg-white/[0.055]">
 <img
 v-if="logoPreview"
 :src="logoPreview"
 alt=""
 class="h-full w-full object-cover"
 >

 <span
 v-else
 class="text-xl font-semibold text-gray-400"
 >
 {{ form.name ? form.name.slice(0, 1).toUpperCase() : 'B' }}
 </span>
 </div>

 <div class="min-w-0 flex-1">
 <input
 ref="logoInput"
 type="file"
 accept="image/jpeg,image/png,image/webp"
 class="block w-full text-[12px] text-gray-500 file:mr-3 file:rounded-[9px] file:border-0 file:bg-gray-950 file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-white hover:file:bg-gray-800 dark:text-gray-500 dark:file:bg-white dark:file:text-gray-950"
 @change="onLogoChange"
 >

 <p
 v-if="fieldErrors.logo_image"
 class="mt-2 text-sm text-red-600 dark:text-red-400"
 >
 {{ fieldErrors.logo_image }}
 </p>

 <p
 v-if="logoFile"
 class="mt-2 truncate text-xs text-gray-500 dark:text-gray-400"
 >
 {{ logoFile.name }}
 </p>
 </div>
 </div>
 </div>

 <div class="rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
 <div class="flex items-start justify-between gap-4">
 <div>
 <label class="text-sm font-semibold text-gray-800 dark:text-gray-200">
 Banner
 </label>

 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Upload wide brand banner. JPG, PNG or WebP.
 </p>
 </div>

 <AppButton
 v-if="bannerFile"
 type="button"
 variant="ghost"
 size="sm"
 @click="clearBanner"
 >
 Clear
 </AppButton>
 </div>

 <div class="mt-4">
 <div class="mb-3 flex h-24 items-center justify-center overflow-hidden rounded-[14px] bg-gray-950/[0.04] dark:bg-white/[0.055]">
 <img
 v-if="bannerPreview"
 :src="bannerPreview"
 alt=""
 class="h-full w-full object-cover"
 >

 <span
 v-else
 class="text-sm font-semibold text-gray-400"
 >
 Banner preview
 </span>
 </div>

 <input
 ref="bannerInput"
 type="file"
 accept="image/jpeg,image/png,image/webp"
 class="block w-full text-[12px] text-gray-500 file:mr-3 file:rounded-[9px] file:border-0 file:bg-gray-950 file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-white hover:file:bg-gray-800 dark:text-gray-500 dark:file:bg-white dark:file:text-gray-950"
 @change="onBannerChange"
 >

 <p
 v-if="fieldErrors.banner_image"
 class="mt-2 text-sm text-red-600 dark:text-red-400"
 >
 {{ fieldErrors.banner_image }}
 </p>

 <p
 v-if="bannerFile"
 class="mt-2 truncate text-xs text-gray-500 dark:text-gray-400"
 >
 {{ bannerFile.name }}
 </p>
 </div>
 </div>
 </div>

 <div class="grid gap-5 lg:grid-cols-2">
 <AppInput
 v-model="form.meta_title"
 label="Meta title"
 placeholder="SEO title"
 :error="fieldErrors.meta_title"
 />

 <AppTextarea
 v-model="form.meta_description"
 label="Meta description"
 placeholder="SEO description"
 :error="fieldErrors.meta_description"
 rows="3"
 />
 </div>
 </div>
 </div>

 <footer class="sticky bottom-0 z-10 bg-white/95 px-4 py-3 shadow-[0_-1px_0_rgba(17,24,39,0.055)] backdrop-blur-xl dark:bg-[#111214]/95 dark:shadow-[0_-1px_0_rgba(255,255,255,0.055)] sm:px-5">
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
 :loading="saving"
 >
 {{ saving ? 'Saving...' : mode === 'create' ? 'Create brand' : 'Save changes' }}
 </AppButton>
 </div>
 </footer>
 </form>
 </AppModal>
</template>