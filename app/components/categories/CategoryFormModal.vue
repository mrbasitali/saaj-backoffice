<script setup lang="ts">
type Category = {
 id: number
 parent_id: number | null
 name: string
 slug: string
 full_slug: string
 description: string | null
 icon_url: string | null
 image_url: string | null
 banner_image_url: string | null
 meta_title: string | null
 meta_description: string | null
 is_active: boolean
 show_in_menu: boolean
 sort_order: number
 depth: number
 children?: Category[] | null
}

type ParentOption = {
 label: string
 value: number | null
}

type CategorySection =
 | 'details'
 | 'media'
 | 'seo'

const props = defineProps<{
 open: boolean
 mode: 'create' | 'edit'
 category?: Category | null
 parentOptions: ParentOption[]
}>()

const emit = defineEmits<{
 close: []
 saved: []
}>()

const { $api } = useNuxtApp()

const activeSection =
 ref<CategorySection>('details')

const sections: {
 key: CategorySection
 label: string
}[] = [
 {
 key: 'details',
 label: 'Details',
 },
 {
 key: 'media',
 label: 'Media',
 },
 {
 key: 'seo',
 label: 'SEO',
 },
]

const sectionTabs = computed(() => {
 return sections.map((section) => ({
 label: section.label,
 value: section.key,
 }))
})

function setActiveSection(value: string) {
 activeSection.value = value as CategorySection
}

const saving = ref(false)
const formError = ref('')
const fieldErrors =
 ref<Record<string, string>>({})

const form = reactive({
 parent_id:
 null as number | null,

 name: '',
 slug: '',
 description: '',
 meta_title: '',
 meta_description: '',
 is_active: true,
 show_in_menu: true,
 sort_order: 0,
})

const iconFile =
 ref<File | null>(null)

const imageFile =
 ref<File | null>(null)

const bannerFile =
 ref<File | null>(null)

const iconInput =
 ref<HTMLInputElement | null>(
 null,
 )

const imageInput =
 ref<HTMLInputElement | null>(
 null,
 )

const bannerInput =
 ref<HTMLInputElement | null>(
 null,
 )

const iconPreview =
 ref<string>('')

const imagePreview =
 ref<string>('')

const bannerPreview =
 ref<string>('')

const title = computed(() => {
 return props.mode === 'create'
 ? 'Add category'
 : 'Edit category'
})

const description = computed(() => {
 return props.mode === 'create'
 ? 'Create a category and place it naturally within your catalog hierarchy.'
 : `Editing ${
 props.category?.name ||
 'category'
 }`
})

watch(
 () => [
 props.open,
 props.category,
 props.mode,
 ] as const,
 () => {
 if (!props.open) {
 return
 }

 activeSection.value =
 'details'

 resetForm()
 },
 {
 immediate: true,
 },
)

function revokePreview(
 value: string,
) {
 if (
 value &&
 value.startsWith('blob:')
 ) {
 URL.revokeObjectURL(value)
 }
}

function clearPreviews() {
 revokePreview(
 iconPreview.value,
 )

 revokePreview(
 imagePreview.value,
 )

 revokePreview(
 bannerPreview.value,
 )

 iconPreview.value = ''
 imagePreview.value = ''
 bannerPreview.value = ''
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
 .includes('duplicate entry') ||
 message
 .toLowerCase()
 .includes(
 'categories_full_slug_unique',
 )
 ) {
 return 'A category with this slug already exists. Try a different slug.'
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
 'Could not save category. Please check the form and try again.'
 )
}

function resetForm() {
 fieldErrors.value = {}
 formError.value = ''

 form.parent_id =
 props.category?.parent_id ??
 null

 form.name =
 props.category?.name ?? ''

 form.slug =
 props.category?.slug ?? ''

 form.description =
 props.category?.description ??
 ''

 form.meta_title =
 props.category?.meta_title ??
 ''

 form.meta_description =
 props.category
 ?.meta_description ??
 ''

 form.is_active =
 props.category?.is_active ??
 true

 form.show_in_menu =
 props.category?.show_in_menu ??
 true

 form.sort_order =
 props.category?.sort_order ??
 0

 iconFile.value = null
 imageFile.value = null
 bannerFile.value = null

 clearPreviews()

 iconPreview.value =
 props.category?.icon_url ??
 ''

 imagePreview.value =
 props.category?.image_url ??
 ''

 bannerPreview.value =
 props.category
 ?.banner_image_url ??
 ''

 if (iconInput.value) {
 iconInput.value.value = ''
 }

 if (imageInput.value) {
 imageInput.value.value = ''
 }

 if (bannerInput.value) {
 bannerInput.value.value = ''
 }
}

function chooseFile(
 target:
 | 'icon'
 | 'image'
 | 'banner',
) {
 if (target === 'icon') {
 iconInput.value?.click()
 }

 if (target === 'image') {
 imageInput.value?.click()
 }

 if (target === 'banner') {
 bannerInput.value?.click()
 }
}

function onFileChange(
 event: Event,
 target:
 | 'icon'
 | 'image'
 | 'banner',
) {
 const input =
 event.target as HTMLInputElement

 const file =
 input.files?.[0] ?? null

 if (!file) {
 return
 }

 const preview =
 URL.createObjectURL(file)

 if (target === 'icon') {
 revokePreview(
 iconPreview.value,
 )

 iconFile.value = file
 iconPreview.value = preview
 }

 if (target === 'image') {
 revokePreview(
 imagePreview.value,
 )

 imageFile.value = file
 imagePreview.value =
 preview
 }

 if (target === 'banner') {
 revokePreview(
 bannerPreview.value,
 )

 bannerFile.value = file
 bannerPreview.value =
 preview
 }
}

function appendIfFilled(
 data: FormData,
 key: string,
 value: unknown,
) {
 if (
 value === null ||
 value === undefined
 ) {
 return
 }

 if (
 typeof value === 'string' &&
 value.trim() === ''
 ) {
 return
 }

 data.append(
 key,
 String(value),
 )
}

function buildFormData() {
 const data =
 new FormData()

 if (
 props.mode === 'edit'
 ) {
 data.append(
 '_method',
 'PATCH',
 )
 }

 if (form.parent_id) {
 data.append(
 'parent_id',
 String(form.parent_id),
 )
 }

 appendIfFilled(
 data,
 'name',
 form.name,
 )

 appendIfFilled(
 data,
 'slug',
 form.slug,
 )

 appendIfFilled(
 data,
 'description',
 form.description,
 )

 appendIfFilled(
 data,
 'meta_title',
 form.meta_title,
 )

 appendIfFilled(
 data,
 'meta_description',
 form.meta_description,
 )

 data.append(
 'is_active',
 form.is_active ? '1' : '0',
 )

 data.append(
 'show_in_menu',
 form.show_in_menu
 ? '1'
 : '0',
 )

 data.append(
 'sort_order',
 String(
 Number(
 form.sort_order || 0,
 ),
 ),
 )

 if (iconFile.value) {
 data.append(
 'icon_image',
 iconFile.value,
 )
 }

 if (imageFile.value) {
 data.append(
 'category_image',
 imageFile.value,
 )
 }

 if (bannerFile.value) {
 data.append(
 'banner_image',
 bannerFile.value,
 )
 }

 return data
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

function sectionForErrors(
 errors:
 Record<string, string>,
): CategorySection {
 const keys =
 Object.keys(errors)

 if (
 keys.some(
 (key) =>
 key.includes('image'),
 )
 ) {
 return 'media'
 }

 if (
 keys.some(
 (key) =>
 [
 'meta_title',
 'meta_description',
 ].includes(key),
 )
 ) {
 return 'seo'
 }

 return 'details'
}

async function submit() {
 saving.value = true

 formError.value = ''
 fieldErrors.value = {}

 try {
 const body =
 buildFormData()

 if (
 props.mode === 'create'
 ) {
 await $api(
 '/admin/categories',
 {
 method: 'POST',
 body,
 },
 )
 } else if (
 props.category
 ) {
 await $api(
 `/admin/categories/${props.category.id}`,
 {
 method: 'POST',
 body,
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

 activeSection.value =
 sectionForErrors(
 fieldErrors.value,
 )
 } finally {
 saving.value = false
 }
}

onBeforeUnmount(() => {
 clearPreviews()
})
</script>

<template>
 <AppModal
 :open="open"
 :title="title"
 :description="description"
 max-width="max-w-[1060px]"
 @close="emit('close')"
 >
 <form
 id="category-editor-form"
 @submit.prevent="submit"
 >
 <!-- Tabs -->
 <div
 class="
 sticky
 top-0
 z-20

 bg-white/95

 px-3
 py-3

 backdrop-blur-xl

 dark:bg-[#111214]/95

 sm:px-4
 "
 >
 <AppTabs
 :model-value="activeSection"
 :items="sectionTabs"
 @update:model-value="setActiveSection"
 />
 </div>

 <div
 class="
 px-4
 pb-6
 pt-3

 sm:px-4
 "
 >
 <!-- Error -->
 <div
 v-if="formError"
 class="
 mb-4

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

 <!-- DETAILS -->
 <section
 v-if="
 activeSection ===
 'details'
 "
 class="w-full"
 >
 <div>
 <h3
 class="
 text-[14px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 Category details
 </h3>

 <p
 class="
 mt-1

 text-[12px]
 leading-5
 text-gray-400

 dark:text-gray-500
 "
 >
 Define the category,
 hierarchy and storefront
 visibility.
 </p>
 </div>

 <div
 class="
 mt-5

 grid
 gap-4

 md:grid-cols-2
 "
 >
 <AppInput
 v-model="form.name"
 label="Category name"
 placeholder="Example: Women"
 :error="
 fieldErrors.name
 "
 required
 />

 <AppInput
 v-model="form.slug"
 label="Slug"
 placeholder="Auto from name if empty"
 :error="
 fieldErrors.slug
 "
 />

 <AppSelect
 v-model="
 form.parent_id
 "
 label="Parent category"
 :options="
 parentOptions
 "
 searchable
 />

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

 <div class="mt-4">
 <AppTextarea
 v-model="
 form.description
 "
 label="Description"
 placeholder="Short category description..."
 :rows="4"
 :error="
 fieldErrors
 .description
 "
 />
 </div>

 <div
 class="
 mt-5

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
 label="Active category"
 description="Available in normal catalog areas."
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
 form.show_in_menu
 "
 label="Show in menu"
 description="Include this category in navigation menus."
 />
 </div>
 </div>
 </section>

 <!-- MEDIA -->
 <section
 v-else-if="
 activeSection ===
 'media'
 "
 >
 <div>
 <h3
 class="
 text-[14px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 Category media
 </h3>

 <p
 class="
 mt-1

 text-[12px]
 leading-5
 text-gray-400

 dark:text-gray-500
 "
 >
 Add an icon, primary
 category image and wide
 banner where needed.
 </p>
 </div>

 <div
 class="
 mt-5

 grid
 gap-3

 lg:grid-cols-3
 "
 >
 <!-- Icon -->
 <button
 type="button"
 class="
 group

 overflow-hidden

 rounded-[14px]

 bg-gray-950/[0.025]

 text-left

 transition

 hover:bg-gray-950/[0.04]

 dark:bg-white/[0.035]
 dark:hover:bg-white/[0.055]
 "
 @click="
 chooseFile('icon')
 "
 >
 <div
 class="
 flex
 aspect-[4/3]
 items-center
 justify-center

 overflow-hidden

 bg-gray-100

 dark:bg-white/[0.05]
 "
 >
 <img
 v-if="iconPreview"
 :src="iconPreview"
 alt=""
 class="
 h-full
 w-full
 object-contain

 p-5
 "
 >

 <div
 v-else
 class="
 text-center
 text-gray-400

 dark:text-gray-600
 "
 >
 <svg
 class="
 mx-auto
 h-6
 w-6
 "
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="
 M5 4H15V16H5V4Z
 "
 stroke="currentColor"
 stroke-width="1.4"
 />

 <path
 d="
 M8 8H12
 M8 11H12
 "
 stroke="currentColor"
 stroke-width="1.4"
 stroke-linecap="round"
 />
 </svg>
 </div>
 </div>

 <div class="p-3">
 <p
 class="
 text-[12px]
 font-semibold
 text-gray-700

 dark:text-gray-300
 "
 >
 Icon
 </p>

 <p
 class="
 mt-1

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 Small square visual,
 max 2MB.
 </p>

 <p
 v-if="iconFile"
 class="
 mt-2
 truncate

 text-[11px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 {{ iconFile.name }}
 </p>
 </div>
 </button>

 <!-- Main -->
 <button
 type="button"
 class="
 group

 overflow-hidden

 rounded-[14px]

 bg-gray-950/[0.025]

 text-left

 transition

 hover:bg-gray-950/[0.04]

 dark:bg-white/[0.035]
 dark:hover:bg-white/[0.055]
 "
 @click="
 chooseFile('image')
 "
 >
 <div
 class="
 aspect-[4/3]

 overflow-hidden

 bg-gray-100

 dark:bg-white/[0.05]
 "
 >
 <img
 v-if="imagePreview"
 :src="imagePreview"
 alt=""
 class="
 h-full
 w-full
 object-cover
 "
 >

 <div
 v-else
 class="
 flex
 h-full
 items-center
 justify-center

 text-gray-400

 dark:text-gray-600
 "
 >
 <svg
 class="h-6 w-6"
 viewBox="0 0 20 20"
 fill="none"
 >
 <rect
 x="3"
 y="4"
 width="14"
 height="12"
 rx="2"
 stroke="currentColor"
 stroke-width="1.4"
 />

 <path
 d="
 M5 14
 L9 10.5
 L11.5 12.5
 L14 10
 L16 12
 "
 stroke="currentColor"
 stroke-width="1.3"
 />
 </svg>
 </div>
 </div>

 <div class="p-3">
 <p
 class="
 text-[12px]
 font-semibold
 text-gray-700

 dark:text-gray-300
 "
 >
 Category image
 </p>

 <p
 class="
 mt-1

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 Main category visual,
 max 10MB.
 </p>

 <p
 v-if="imageFile"
 class="
 mt-2
 truncate

 text-[11px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 {{ imageFile.name }}
 </p>
 </div>
 </button>

 <!-- Banner -->
 <button
 type="button"
 class="
 group

 overflow-hidden

 rounded-[14px]

 bg-gray-950/[0.025]

 text-left

 transition

 hover:bg-gray-950/[0.04]

 dark:bg-white/[0.035]
 dark:hover:bg-white/[0.055]
 "
 @click="
 chooseFile('banner')
 "
 >
 <div
 class="
 aspect-[4/3]

 overflow-hidden

 bg-gray-100

 dark:bg-white/[0.05]
 "
 >
 <img
 v-if="bannerPreview"
 :src="bannerPreview"
 alt=""
 class="
 h-full
 w-full
 object-cover
 "
 >

 <div
 v-else
 class="
 flex
 h-full
 items-center
 justify-center

 text-gray-400

 dark:text-gray-600
 "
 >
 <svg
 class="h-6 w-6"
 viewBox="0 0 20 20"
 fill="none"
 >
 <rect
 x="2.5"
 y="6"
 width="15"
 height="8"
 rx="2"
 stroke="currentColor"
 stroke-width="1.4"
 />
 </svg>
 </div>
 </div>

 <div class="p-3">
 <p
 class="
 text-[12px]
 font-semibold
 text-gray-700

 dark:text-gray-300
 "
 >
 Banner
 </p>

 <p
 class="
 mt-1

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 Wide category banner,
 max 15MB.
 </p>

 <p
 v-if="bannerFile"
 class="
 mt-2
 truncate

 text-[11px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 {{ bannerFile.name }}
 </p>
 </div>
 </button>
 </div>

 <input
 ref="iconInput"
 type="file"
 accept="image/png,image/jpeg,image/jpg,image/webp"
 class="hidden"
 @change="
 onFileChange(
 $event,
 'icon',
 )
 "
 >

 <input
 ref="imageInput"
 type="file"
 accept="image/png,image/jpeg,image/jpg,image/webp"
 class="hidden"
 @change="
 onFileChange(
 $event,
 'image',
 )
 "
 >

 <input
 ref="bannerInput"
 type="file"
 accept="image/png,image/jpeg,image/jpg,image/webp"
 class="hidden"
 @change="
 onFileChange(
 $event,
 'banner',
 )
 "
 >
 </section>

 <!-- SEO -->
 <section
 v-else
 class="w-full"
 >
 <div>
 <h3
 class="
 text-[14px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 Search appearance
 </h3>

 <p
 class="
 mt-1

 text-[12px]
 leading-5
 text-gray-400

 dark:text-gray-500
 "
 >
 Customize how this
 category appears in
 search results.
 </p>
 </div>

 <div
 class="
 mt-5
 space-y-4
 "
 >
 <AppInput
 v-model="
 form.meta_title
 "
 label="Meta title"
 placeholder="SEO title"
 :error="
 fieldErrors
 .meta_title
 "
 />

 <AppTextarea
 v-model="
 form.meta_description
 "
 label="Meta description"
 placeholder="SEO description"
 :rows="4"
 :error="
 fieldErrors
 .meta_description
 "
 />
 </div>

 <!-- Search preview -->
 <div
 class="
 mt-6

 rounded-[14px]

 bg-gray-950/[0.025]

 p-4

 dark:bg-white/[0.035]
 "
 >
 <p
 class="
 text-[11px]
 font-semibold
 uppercase
 tracking-[0.08em]
 text-gray-400

 dark:text-gray-600
 "
 >
 Preview
 </p>

 <p
 class="
 mt-3

 text-[14px]
 font-medium
 text-blue-700

 dark:text-blue-400
 "
 >
 {{
 form.meta_title ||
 form.name ||
 'Category title'
 }}
 </p>

 <p
 class="
 mt-1

 text-[11px]
 text-emerald-700

 dark:text-emerald-500
 "
 >
 /{{
 form.slug ||
 'category-slug'
 }}
 </p>

 <p
 class="
 mt-2

 max-w-2xl

 text-[12px]
 leading-5
 text-gray-500

 dark:text-gray-500
 "
 >
 {{
 form.meta_description ||
 form.description ||
 'Category description will appear here.'
 }}
 </p>
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
 form="category-editor-form"
 :loading="saving"
 >
 {{
 mode === 'create'
 ? 'Create category'
 : 'Save changes'
 }}
 </AppButton>
 </div>
 </template>
 </AppModal>
</template>