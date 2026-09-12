<script setup lang="ts">
type CategoryFaq = {
 id?: number
 question: string
 answer: string
 is_active: boolean
 sort_order: number
}

type Category = {
 id: number
 parent_id: number | null
 name: string
 slug: string
 full_slug: string
 code: string | null
 sku_year_enabled: boolean
 description: string | null
 icon_url: string | null
 image_url: string | null
 banner_image_url: string | null
 meta_title: string | null
 meta_description: string | null
 seo_content: string | null
 seo_is_published: boolean
 faqs_is_published: boolean
 faqs?: CategoryFaq[] | null
 is_active: boolean
 show_in_menu: boolean
 show_on_home: boolean
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
 | 'faqs'

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
 {
 key: 'faqs',
 label: 'FAQs',
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
 code: '',
 sku_year_enabled: false,
 description: '',
 meta_title: '',
 meta_description: '',
 seo_content: '' as string | null,
 seo_is_published: false,
 faqs_is_published: false,
 is_active: true,
 show_in_menu: true,
 show_on_home: false,
 sort_order: 0,
})

let faqKeySeed = 0

const faqs = ref<(CategoryFaq & { _key: number })[]>([])

function addFaq() {
 faqs.value.push({
 _key: ++faqKeySeed,
 question: '',
 answer: '',
 is_active: true,
 sort_order: faqs.value.length,
 })
}

function removeFaq(index: number) {
 faqs.value.splice(index, 1)
}

function moveFaq(index: number, direction: -1 | 1) {
 const target = index + direction

 if (target < 0 || target >= faqs.value.length) {
 return
 }

 const [item] = faqs.value.splice(index, 1)
 faqs.value.splice(target, 0, item)
}

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

 form.code =
 props.category?.code ?? ''

 form.sku_year_enabled =
 props.category?.sku_year_enabled ??
 false

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

 form.seo_content =
 props.category?.seo_content ??
 ''

 form.seo_is_published =
 props.category?.seo_is_published ??
 false

 form.faqs_is_published =
 props.category?.faqs_is_published ??
 false

 faqs.value = (
 props.category?.faqs ?? []
 ).map((faq) => ({
 ...faq,
 _key: ++faqKeySeed,
 }))

 form.is_active =
 props.category?.is_active ??
 true

 form.show_in_menu =
 props.category?.show_in_menu ??
 true

 form.show_on_home =
 props.category?.show_on_home ??
 false

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
 'code',
 form.code,
 )

 data.append(
 'sku_year_enabled',
 form.sku_year_enabled
 ? '1'
 : '0',
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

 appendIfFilled(
 data,
 'seo_content',
 form.seo_content,
 )

 data.append(
 'seo_is_published',
 form.seo_is_published
 ? '1'
 : '0',
 )

 data.append(
 'faqs_is_published',
 form.faqs_is_published
 ? '1'
 : '0',
 )

 data.append(
 'faqs_count',
 String(faqs.value.length),
 )

 faqs.value.forEach((faq, index) => {
 if (faq.id) {
 data.append(
 `faqs[${index}][id]`,
 String(faq.id),
 )
 }

 data.append(
 `faqs[${index}][question]`,
 faq.question,
 )

 data.append(
 `faqs[${index}][answer]`,
 faq.answer,
 )

 data.append(
 `faqs[${index}][is_active]`,
 faq.is_active ? '1' : '0',
 )

 data.append(
 `faqs[${index}][sort_order]`,
 String(index),
 )
 })

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
 'show_on_home',
 form.show_on_home
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
 keys.some((key) =>
 key.startsWith('faqs'),
 )
 ) {
 return 'faqs'
 }

 if (
 keys.some(
 (key) =>
 [
 'meta_title',
 'meta_description',
 'seo_content',
 'seo_is_published',
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

 <AppInput
 v-model="form.code"
 label="Category code"
 placeholder="e.g. WN"
 :error="
 fieldErrors.code
 "
 required
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
 label="Menu / display order"
 type="number"
 placeholder="0"
 :error="
 fieldErrors
 .sort_order
 "
 />
 </div>

 <div
 class="
 mt-4

 rounded-[12px]

 bg-gray-950/[0.035]

 p-3.5

 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="form.sku_year_enabled"
 label="Include year in SKU"
 description="When this category is the most specific one on a product, its SKU segment gets the current 2-digit year appended (e.g. LW → LW26)."
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

 sm:grid-cols-3
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
 label="Show in navigation"
 description="Include this category in desktop and mobile menus. Menu-visible children are nested beneath it automatically."
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
 form.show_on_home
 "
 label="Show on home page"
 description="Include this category in the homepage category section, regardless of parent or child level."
 />
 </div>

 <Transition name="category-reveal">
 <div
 v-if="form.show_in_menu"
 class="mt-1 flex items-start gap-3 rounded-[12px] bg-gray-950/[0.025] px-3.5 py-3 dark:bg-white/[0.035] sm:col-span-3"
 >
 <span class="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-950/[0.055] text-gray-500 dark:bg-white/[0.07] dark:text-gray-400">
 <svg class="h-3 w-3" viewBox="0 0 20 20" fill="none">
 <path d="M10 6.5V10.5M10 13.5H10.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
 <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.35" />
 </svg>
 </span>
 <div>
 <p class="text-[12px] font-semibold text-gray-700 dark:text-gray-300">Navigation hierarchy</p>
 <p class="mt-1 max-w-[720px] text-[11px] leading-5 text-gray-500 dark:text-gray-500">
 This category becomes a menu level. Every active child with “Show in navigation” enabled appears beneath it automatically, including deeper subcategories. Lower menu / display order values appear first among siblings. Keep parent levels visible when you want visitors to drill down to their children.
 </p>
 </div>
 </div>
 </Transition>
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
 v-else-if="
 activeSection ===
 'seo'
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
 Search & category content
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
 Control search metadata separately from the optional rich content shown on the category page.
 </p>
 </div>

 <div
 class="
 mt-5
 rounded-[14px]
 border
 border-gray-950/[0.06]
 p-4
 dark:border-white/[0.08]
 "
 >
 <div class="mb-4">
 <p class="text-[12px] font-semibold text-gray-800 dark:text-gray-200">
 Search metadata
 </p>
 <p class="mt-1 text-[11px] leading-5 text-gray-400 dark:text-gray-500">
 Used by search engines and social previews. This stays editable whether storefront content is enabled or not.
 </p>
 </div>

 <div class="space-y-4">
 <AppInput
 v-model="form.meta_title"
 label="Meta title"
 placeholder="Example: Women's Clothing & Latest Collections"
 :error="fieldErrors.meta_title"
 />

 <AppTextarea
 v-model="form.meta_description"
 label="Meta description"
 placeholder="Write a concise description for search results..."
 :rows="3"
 :error="fieldErrors.meta_description"
 />
 </div>
 </div>

 <div
 class="
 mt-4
 rounded-[14px]
 bg-gray-950/[0.035]
 p-4
 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="form.seo_is_published"
 label="Show SEO content on storefront"
 description="Turn this on to add a formatted content section below the product listing. Turn it off to keep the saved content as a draft."
 />
 </div>

 <Transition name="category-reveal">
 <div
 v-if="form.seo_is_published"
 class="mt-4"
 >
 <div
 class="
 rounded-[14px]
 border
 border-gray-950/[0.06]
 p-4
 dark:border-white/[0.08]
 "
 >
 <div class="mb-3 flex items-start justify-between gap-3">
 <div>
 <p class="text-[12px] font-semibold text-gray-800 dark:text-gray-200">
 Storefront content
 </p>
 <p class="mt-1 text-[11px] leading-5 text-gray-400 dark:text-gray-500">
 Use headings, paragraphs, emphasis, lists and quotes. The storefront keeps the same hierarchy and spacing.
 </p>
 </div>
 <span
 class="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
 >
 Visible
 </span>
 </div>

 <AppRichTextEditor
 v-model="form.seo_content"
 placeholder="Start with a short introduction, then add headings and useful category information..."
 :error="fieldErrors.seo_content"
 />
 </div>
 </div>
 </Transition>

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
 <div class="flex items-center justify-between gap-3">
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
 Search preview
 </p>
 <span class="text-[10px] text-gray-400 dark:text-gray-600">Approximate appearance</span>
 </div>

 <p
 class="
 mt-3
 text-[14px]
 font-medium
 text-blue-700
 dark:text-blue-400
 "
 >
 {{ form.meta_title || form.name || 'Category title' }}
 </p>

 <p class="mt-1 text-[11px] text-emerald-700 dark:text-emerald-500">
 /{{ form.slug || 'category-slug' }}
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
 {{ form.meta_description || form.description || 'Category description will appear here.' }}
 </p>
 </div>
 </section>

 <!-- FAQS -->
 <section
 v-else
 class="w-full"
 >
 <div>
 <h3 class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
 Frequently asked questions
 </h3>
 <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
 Add helpful answers that customers can expand on the category page.
 </p>
 </div>

 <div
 class="
 mt-5
 rounded-[14px]
 bg-gray-950/[0.035]
 p-4
 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="form.faqs_is_published"
 label="Show FAQs on storefront"
 description="Turn this on to manage and publish the FAQ accordion for this category. Turning it off keeps your questions saved as a draft."
 />
 </div>

 <Transition name="category-reveal">
 <div
 v-if="form.faqs_is_published"
 class="mt-4"
 >
 <div class="flex items-center justify-between gap-3">
 <div>
 <p class="text-[12px] font-semibold text-gray-800 dark:text-gray-200">
 FAQ content
 </p>
 <p class="mt-1 text-[11px] leading-5 text-gray-400 dark:text-gray-500">
 {{ faqs.length ? `${faqs.length} question${faqs.length === 1 ? '' : 's'} added` : 'No questions added yet' }}
 </p>
 </div>

 <AppButton
 type="button"
 size="sm"
 @click="addFaq"
 >
 + Add FAQ
 </AppButton>
 </div>

 <div
 v-if="!faqs.length"
 class="
 mt-4
 flex
 min-h-[150px]
 flex-col
 items-center
 justify-center
 rounded-[14px]
 border
 border-dashed
 border-gray-950/[0.12]
 px-5
 text-center
 dark:border-white/[0.12]
 "
 >
 <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-950/[0.05] text-[18px] text-gray-500 dark:bg-white/[0.07] dark:text-gray-400">
 ?
 </div>
 <p class="mt-3 text-[12px] font-semibold text-gray-700 dark:text-gray-300">
 Add your first FAQ
 </p>
 <p class="mt-1 max-w-[390px] text-[11px] leading-5 text-gray-400 dark:text-gray-500">
 Keep questions short and specific. Answers can use rich formatting such as bold text, headings and lists.
 </p>
 <AppButton
 type="button"
 variant="ghost"
 size="sm"
 class="mt-3"
 @click="addFaq"
 >
 Add first question
 </AppButton>
 </div>

 <div
 v-else
 class="mt-4 space-y-3"
 >
 <div
 v-for="(faq, index) in faqs"
 :key="faq._key"
 class="
 rounded-[14px]
 border
 border-gray-950/[0.07]
 bg-white
 p-4
 dark:border-white/[0.08]
 dark:bg-white/[0.025]
 "
 >
 <div class="flex items-center justify-between gap-3">
 <div class="flex items-center gap-2.5">
 <span class="flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-950/[0.055] px-1.5 text-[10px] font-semibold text-gray-500 dark:bg-white/[0.07] dark:text-gray-400">
 {{ index + 1 }}
 </span>
 <span class="text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-600">
 FAQ
 </span>
 </div>

 <div class="flex items-center gap-1">
 <AppButton
 type="button"
 variant="ghost"
 size="sm"
 :disabled="index === 0"
 title="Move up"
 @click="moveFaq(index, -1)"
 >
 ↑
 </AppButton>
 <AppButton
 type="button"
 variant="ghost"
 size="sm"
 :disabled="index === faqs.length - 1"
 title="Move down"
 @click="moveFaq(index, 1)"
 >
 ↓
 </AppButton>
 <AppButton
 type="button"
 variant="ghost"
 size="sm"
 @click="removeFaq(index)"
 >
 Remove
 </AppButton>
 </div>
 </div>

 <div class="mt-4 space-y-3">
 <AppInput
 v-model="faq.question"
 label="Question"
 placeholder="Example: How do I choose the right size?"
 :error="fieldErrors[`faqs.${index}.question`]"
 required
 />

 <AppRichTextEditor
 v-model="faq.answer"
 label="Answer"
 placeholder="Write a clear answer. You can use emphasis, headings or a short list where helpful..."
 compact
 :error="fieldErrors[`faqs.${index}.answer`]"
 />

 <div class="rounded-[12px] bg-gray-950/[0.03] p-3 dark:bg-white/[0.04]">
 <AppToggle
 v-model="faq.is_active"
 label="Active question"
 description="Disable only this question without deleting it."
 />
 </div>
 </div>
 </div>
 </div>
 </div>
 </Transition>

 <div
 v-if="!form.faqs_is_published"
 class="mt-4 rounded-[12px] border border-dashed border-gray-950/[0.09] px-4 py-5 text-center dark:border-white/[0.09]"
 >
 <p class="text-[11px] leading-5 text-gray-400 dark:text-gray-500">
 FAQ content is currently hidden. Enable the section above when you want to add or edit storefront FAQs.
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

<style scoped>
.category-reveal-enter-active,
.category-reveal-leave-active {
 transition: opacity 180ms ease, transform 180ms ease;
}

.category-reveal-enter-from,
.category-reveal-leave-to {
 opacity: 0;
 transform: translateY(-4px);
}
</style>
