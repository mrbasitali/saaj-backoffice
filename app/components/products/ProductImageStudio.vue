<script setup lang="ts">
type OptimizedUrls = {
 thumb?: string | null
 card?: string | null
 detail?: string | null
 zoom?: string | null
}

type ProductImage = {
 id: number
 image_url: string
 optimized_urls?: OptimizedUrls
 alt_text: string | null
 is_primary: boolean
 sort_order: number
 role?: string | null
}

type ProductImageDraft = {
 id: number
 product_id: number
 source_product_image_id: number | null
 approved_product_image_id: number | null
 image_url: string
 optimized_urls?: OptimizedUrls
 role: string
 status: string
 operation_type: string
 operation_prompt: string | null
 width: number | null
 height: number | null
 aspect_ratio: string | null
 is_ai_generated: boolean
 created_at: string | null
}

type DraftsResponse = {
 data: ProductImageDraft[]
}

type DraftResponse = {
 data: ProductImageDraft
 message?: string
}

type OperationOption = {
 value: string
 label: string
 hint: string
}

type BackgroundModeOption = {
 value: string
 label: string
 hint: string
}

type ApproveState = {
 mode: 'new' | 'replace'
 replaceImageId: string
 altText: string
 makePrimary: boolean
}

const props = defineProps<{
 open: boolean
 productId: number
 productName?: string
 images: ProductImage[]
}>()

const emit = defineEmits<{
 close: []
 changed: []
}>()

const { $api } = useNuxtApp()

const pending = ref(false)
const generating = ref(false)
const approving = ref<number | null>(null)
const deleting = ref<number | null>(null)
const error = ref('')
const notice = ref('')

const sourceImageId = ref<number | null>(null)
const operationType = ref('background_removal')

// background_removal settings
const backgroundMode = ref('white') // transparent | white | color | ai_scene
const backgroundColor = ref('#ffffff')
const backgroundPrompt = ref('')
const backgroundSeed = ref<number | null>(null)
const shadowEnabled = ref(false)
const shadowStyle = ref('soft') // soft | hard

// virtual_model settings
const virtualModelPose = ref('random')

const role = ref('primary')
const ratioKey = ref('4:5')
const width = ref(1200)
const height = ref(1500)

const drafts = ref<ProductImageDraft[]>([])
const brokenDraftIds = ref<number[]>([])

// Per-draft approve settings, keyed by draft id. This replaced a single
// global New/Replace toggle that lived in the sidebar, disconnected from
// whichever card you actually clicked Approve on — that's what caused
// "Replace" to silently behave like "New image".
const approveState = reactive<Record<number, ApproveState>>({})

const operationOptions: OperationOption[] = [
 {
 value: 'background_removal',
 label: 'Remove background',
 hint: 'Cutout + background + optional AI shadow, centered. Photoroom Plus.',
 },
 {
 value: 'virtual_model',
 label: 'AI model',
 hint: 'Generates a synthetic model wearing this garment, in a chosen pose.',
 },
 {
 value: 'enhance',
 label: 'Enhance photo',
 hint: 'Fixes lighting and color automatically. Keeps the original background and size.',
 },
 {
 value: 'product_page_fit',
 label: 'Standardize size',
 hint: 'For photos that are already clean — auto-crops into a fixed catalog size.',
 },
]

const backgroundModeOptions: BackgroundModeOption[] = [
 { value: 'white', label: 'White', hint: 'Classic clean catalog look.' },
 { value: 'ai_scene', label: 'AI scene', hint: 'Describe a backdrop — Photoroom generates it.' },
 { value: 'color', label: 'Custom color', hint: 'Pick a brand color.' },
 { value: 'transparent', label: 'Transparent', hint: 'No background — for compositing elsewhere.' },
]

const poseOptions = [
 { label: 'Random', value: 'random' },
 { label: 'Back (no face)', value: 'back' },
 { label: 'Over the shoulder', value: 'overtheshoulder' },
 { label: 'Standing', value: 'standing' },
 { label: '3/4 turn', value: '34turn' },
 { label: 'Crossed arms', value: 'crossedarms' },
 { label: 'Walking forward', value: 'walkingforward' },
 { label: 'Hand in pocket', value: 'handinpocket' },
 { label: 'Power stance', value: 'powerstance' },
 { label: 'Seated', value: 'seated' },
 { label: 'Adjusting clothing', value: 'adjustingclothing' },
 { label: 'Playful spin', value: 'playfulspin' },
]

const roleOptions = [
 { label: 'Primary product', value: 'primary' },
 { label: 'Gallery', value: 'gallery' },
 { label: 'Square', value: 'square' },
 { label: 'Banner', value: 'banner' },
 { label: 'Story', value: 'story' },
 { label: 'Lifestyle', value: 'lifestyle' },
]

const ratioOptions = [
 { key: '4:5', label: '4:5 Product', width: 1200, height: 1500 },
 { key: '1:1', label: '1:1 Square', width: 1200, height: 1200 },
 { key: '3:4', label: '3:4 Gallery', width: 1200, height: 1600 },
 { key: '16:9', label: '16:9 Banner', width: 1600, height: 900 },
 { key: '9:16', label: '9:16 Story', width: 1080, height: 1920 },
 { key: 'custom', label: 'Custom', width: 1200, height: 1500 },
]

const operationLabels: Record<string, string> = {
 background_removal: 'Background removed',
 virtual_model: 'AI model',
 enhance: 'Enhanced',
 product_page_fit: 'Standardized size',
 manual_upload: 'Manual upload',
 // Older drafts from before the Plus switch may still carry one of these.
 ecommerce_clean: 'Enhanced (legacy)',
 color_pad: 'Background removed (legacy)',
 white_pad: 'Background removed (legacy)',
 ai_command: 'AI edit (legacy, no longer available)',
 generative_remove: 'AI edit (legacy, no longer available)',
 generative_background_replace: 'AI edit (legacy, no longer available)',
 generative_fill: 'AI edit (legacy, no longer available)',
 generative_banner: 'AI edit (legacy, no longer available)',
 standard_crop: 'Cropped (legacy)',
}

const selectedOperation = computed(() => {
 return operationOptions.find((item) => item.value === operationType.value) || operationOptions[0]
})

const selectedSourceImage = computed(() => {
 return props.images.find((image) => image.id === sourceImageId.value) || props.images[0] || null
})

const sortedDrafts = computed(() => {
 return [...drafts.value].sort((a, b) => b.id - a.id)
})

// Photoroom Plus centers/pads regardless of background choice (even
// transparent), so background_removal always uses a target size now.
const usesSize = computed(() => {
 return operationType.value === 'product_page_fit' || operationType.value === 'background_removal'
})

const showShadowOption = computed(() => {
 return operationType.value === 'background_removal' && backgroundMode.value !== 'transparent'
})

const canGenerate = computed(() => {
 if (!props.images.length || !selectedSourceImage.value || generating.value) return false

 if (
 operationType.value === 'background_removal'
 && backgroundMode.value === 'color'
 && !isValidHexColor(backgroundColor.value)
 ) {
 return false
 }

 return true
})

const sourceRole = computed(() => {
 return selectedSourceImage.value?.role || 'gallery'
})

const requestRole = computed(() => {
 if (operationType.value === 'virtual_model') return 'gallery'

 return usesSize.value ? role.value || 'primary' : (sourceRole.value || 'gallery')
})

const requestWidth = computed(() => (usesSize.value ? Number(width.value || 1200) : null))
const requestHeight = computed(() => (usesSize.value ? Number(height.value || 1500) : null))
const requestAspectRatio = computed(() => (usesSize.value ? ratioKey.value : null))

watch(
 () => props.open,
 (open) => {
 if (!open) return

 error.value = ''
 notice.value = ''
 brokenDraftIds.value = []

 if (!sourceImageId.value && props.images.length) {
 sourceImageId.value = props.images[0].id
 }

 fetchDrafts()
 },
)

watch(
 () => props.images,
 (images) => {
 if (!images.length) {
 sourceImageId.value = null
 return
 }

 if (!sourceImageId.value || !images.some((image) => image.id === sourceImageId.value)) {
 sourceImageId.value = images[0].id
 }
 },
 { immediate: true },
)

watch(ratioKey, () => {
 const option = ratioOptions.find((item) => item.key === ratioKey.value)

 if (!option || option.key === 'custom') return

 width.value = option.width
 height.value = option.height
})

watch(role, () => {
 if (!usesSize.value) return

 if (role.value === 'banner') {
 ratioKey.value = '16:9'
 } else if (role.value === 'square') {
 ratioKey.value = '1:1'
 } else if (role.value === 'story') {
 ratioKey.value = '9:16'
 } else if (role.value === 'gallery' || role.value === 'primary') {
 ratioKey.value = '4:5'
 } else if (role.value === 'lifestyle') {
 ratioKey.value = '3:4'
 }
})

watch(operationType, () => {
 error.value = ''
 notice.value = ''
 brokenDraftIds.value = []

 if (operationType.value === 'product_page_fit' || operationType.value === 'background_removal') {
 role.value = 'primary'
 ratioKey.value = '4:5'
 width.value = 1200
 height.value = 1500
 }
})

function isValidHexColor(value: string) {
 return /^#[A-Fa-f0-9]{6}$/.test(value)
}

function normalizeHexColor(value: string) {
 const clean = value.trim()

 if (/^[A-Fa-f0-9]{6}$/.test(clean)) {
 return `#${clean}`
 }

 if (/^#[A-Fa-f0-9]{6}$/.test(clean)) {
 return clean
 }

 return value
}

function onBackgroundColorInput() {
 backgroundColor.value = normalizeHexColor(backgroundColor.value)
}

function operationLabel(value: string) {
 return operationLabels[value] || value.replaceAll('_', ' ')
}

function aspectForRole(value?: string | null) {
 if (value === 'banner') return '16 / 9'
 if (value === 'square') return '1 / 1'
 if (value === 'story') return '9 / 16'
 if (value === 'lifestyle') return '3 / 4'

 return '4 / 5'
}

function imageAspectStyle(image?: ProductImage | null) {
 return {
 aspectRatio: aspectForRole(image?.role || 'gallery'),
 }
}

function draftAspectStyle(draft: ProductImageDraft) {
 if (draft.width && draft.height) {
 return {
 aspectRatio: `${draft.width} / ${draft.height}`,
 }
 }

 return {
 aspectRatio: aspectForRole(draft.role || 'gallery'),
 }
}

function imageUrl(image?: ProductImage | null) {
 return image?.optimized_urls?.detail || image?.optimized_urls?.card || image?.image_url || ''
}

function draftUrl(draft: ProductImageDraft) {
 return draft.image_url
}

function isBroken(draft: ProductImageDraft) {
 return brokenDraftIds.value.includes(draft.id)
}

function markDraftBroken(draft: ProductImageDraft) {
 if (isBroken(draft)) return

 brokenDraftIds.value = [...brokenDraftIds.value, draft.id]
}

function retryDraftImage(draft: ProductImageDraft) {
 brokenDraftIds.value = brokenDraftIds.value.filter((id) => id !== draft.id)

 drafts.value = drafts.value.map((item) => {
 if (item.id !== draft.id) return item

 return {
 ...item,
 image_url: `${item.image_url}${item.image_url.includes('?') ? '&' : '?'}retry=${Date.now()}`,
 }
 })
}

function showNotice(message: string) {
 notice.value = message

 setTimeout(() => {
 notice.value = ''
 }, 3000)
}

// Lazily creates and returns the approve-panel state for one draft card,
// defaulting to "replace the image this draft was generated from" — the
// thing you almost always actually want — rather than always defaulting
// to "new".
function approveStateFor(draft: ProductImageDraft): ApproveState {
 if (!approveState[draft.id]) {
 const sourceStillExists = !!draft.source_product_image_id
 && props.images.some((image) => image.id === draft.source_product_image_id)

 approveState[draft.id] = {
 mode: sourceStillExists ? 'replace' : 'new',
 replaceImageId: sourceStillExists
 ? String(draft.source_product_image_id)
 : String(props.images[0]?.id ?? ''),
 altText: '',
 makePrimary: false,
 }
 }

 return approveState[draft.id]
}

function sourceImageLabel(imageId: number | null) {
 if (!imageId) return ''

 const match = props.images.find((image) => image.id === imageId)

 return match?.alt_text || props.productName || `Image ${imageId}`
}

async function fetchDrafts() {
 if (!props.productId) return

 pending.value = true
 error.value = ''

 try {
 const response = await $api<DraftsResponse>(`/admin/products/${props.productId}/image-drafts`)
 drafts.value = response.data ?? []
 } catch (err: any) {
 error.value = err?.data?.message || 'Could not load image drafts.'
 } finally {
 pending.value = false
 }
}

async function generateDraft() {
 if (!selectedSourceImage.value) {
 error.value = 'Please select a source image first.'
 return
 }

 if (
 operationType.value === 'background_removal'
 && backgroundMode.value === 'color'
 && !isValidHexColor(backgroundColor.value)
 ) {
 error.value = 'Please enter a valid background color, for example #ffffff.'
 return
 }

 generating.value = true
 error.value = ''
 brokenDraftIds.value = []

 const isBackgroundRemoval = operationType.value === 'background_removal'
 const isAiScene = isBackgroundRemoval && backgroundMode.value === 'ai_scene'

 try {
 const response = await $api<DraftResponse>(
 `/admin/products/${props.productId}/images/${selectedSourceImage.value.id}/drafts`,
 {
 method: 'POST',
 body: {
 operation_type: operationType.value,
 background_mode: isBackgroundRemoval ? backgroundMode.value : null,
 background_color: isBackgroundRemoval && backgroundMode.value === 'color' ? backgroundColor.value : null,
 background_prompt: isAiScene ? backgroundPrompt.value.trim() : null,
 background_seed: isAiScene && backgroundSeed.value ? backgroundSeed.value : null,
 shadow_enabled: showShadowOption.value ? shadowEnabled.value : false,
 shadow_style: shadowStyle.value,
 virtual_model_pose: operationType.value === 'virtual_model' ? virtualModelPose.value : null,
 role: requestRole.value,
 width: requestWidth.value,
 height: requestHeight.value,
 aspect_ratio: requestAspectRatio.value,
 },
 },
 )

 drafts.value = [response.data, ...drafts.value]
 showNotice('Preview generated. Check it before approving.')
 } catch (err: any) {
 error.value = err?.data?.message || 'Could not generate image draft.'
 } finally {
 generating.value = false
 }
}

async function approveDraft(draft: ProductImageDraft) {
 const state = approveStateFor(draft)

 if (state.mode === 'replace' && !state.replaceImageId) {
 error.value = 'Choose which image to replace, or switch to "New image".'
 return
 }

 approving.value = draft.id
 error.value = ''

 try {
 await $api(`/admin/products/${props.productId}/image-drafts/${draft.id}/approve`, {
 method: 'POST',
 body: {
 mode: state.mode,
 replace_image_id: state.mode === 'replace' ? Number(state.replaceImageId) : null,
 role: draft.role || 'gallery',
 alt_text: state.altText || `${props.productName || 'Product'} ${draft.role || 'image'}`,
 is_primary: state.makePrimary,
 },
 })

 drafts.value = drafts.value.map((item) => {
 if (item.id !== draft.id) return item

 return {
 ...item,
 status: 'approved',
 }
 })

 showNotice(
 state.mode === 'replace'
 ? `Approved — replaced "${sourceImageLabel(Number(state.replaceImageId))}".`
 : 'Approved as a new image.',
 )
 emit('changed')
 } catch (err: any) {
 error.value = err?.data?.message || 'Could not approve draft.'
 } finally {
 approving.value = null
 }
}

async function deleteDraft(draft: ProductImageDraft) {
 deleting.value = draft.id
 error.value = ''

 try {
 await $api(`/admin/products/${props.productId}/image-drafts/${draft.id}`, {
 method: 'DELETE',
 })

 drafts.value = drafts.value.filter((item) => item.id !== draft.id)
 showNotice('Draft deleted.')
 } catch (err: any) {
 error.value = err?.data?.message || 'Could not delete draft.'
 } finally {
 deleting.value = null
 }
}
</script>

<template>
 <AppModal
 :open="open"
 title="Image Studio"
 :description="
 `Create product-ready images for ${
 productName || 'this product'
 } without changing the live image until approval.`
 "
 max-width="max-w-[1500px]"
 @close="emit('close')"
 >
 <!--
 IMPORTANT:
 no max-height,
 no overflow-y-auto,
 no 3 independent scroll columns.

 AppModal is the only vertical
 scroll owner.
 -->
 <div
 class="
 space-y-4

 p-4

 sm:p-5
 "
 >
 <!-- Notices -->
 <div
 v-if="notice"
 class="
 flex
 items-center
 gap-2

 rounded-[10px]

 bg-emerald-500/[0.08]

 px-3
 py-2.5

 text-[12px]
 font-medium
 text-emerald-700

 dark:bg-emerald-500/10
 dark:text-emerald-300
 "
 >
 <span
 class="
 h-1.5
 w-1.5
 rounded-full

 bg-emerald-500
 "
 />

 {{ notice }}
 </div>

 <div
 v-if="error"
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
 >
 {{ error }}
 </div>

 <!-- Source -->
 <section
 class="
 rounded-[14px]

 bg-gray-950/[0.025]

 p-3.5

 dark:bg-white/[0.035]
 "
 >
 <div
 class="
 flex
 items-center
 justify-between
 gap-4
 "
 >
 <div>
 <h3
 class="
 text-[12px]
 font-semibold
 text-gray-800

 dark:text-gray-200
 "
 >
 Source image
 </h3>

 <p
 class="
 mt-0.5

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 Choose the original
 photo to work from.
 </p>
 </div>

 <button
 type="button"
 class="
 h-8

 rounded-[8px]

 px-2.5

 text-[11px]
 font-medium
 text-gray-400

 transition

 hover:bg-gray-950/[0.045]
 hover:text-gray-800

 dark:text-gray-600
 dark:hover:bg-white/[0.06]
 dark:hover:text-white
 "
 :disabled="pending"
 @click="fetchDrafts"
 >
 {{
 pending
 ? 'Refreshing…'
 : 'Refresh'
 }}
 </button>
 </div>

 <div
 v-if="
 images.length === 0
 "
 class="
 py-8
 text-center
 "
 >
 <p
 class="
 text-[12px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 Save a product image first
 </p>

 <p
 class="
 mt-1

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 Studio needs an existing
 saved product image.
 </p>
 </div>

 <!-- Horizontal, not another
 vertical scrollbar -->
 <div
 v-else
 class="
 mt-3

 flex
 gap-2.5

 overflow-x-auto

 pb-1

 [scrollbar-width:none]
 [&::-webkit-scrollbar]:hidden
 "
 >
 <button
 v-for="image in images"
 :key="image.id"
 type="button"
 class="
 w-[108px]
 shrink-0

 overflow-hidden

 rounded-[11px]

 text-left

 transition
 "
 :class="
 sourceImageId
 === image.id
 ? `
 bg-gray-950/[0.08]
 ring-2
 ring-gray-950/15

 dark:bg-white/[0.09]
 dark:ring-white/15
 `
 : `
 bg-white

 hover:bg-gray-950/[0.035]

 dark:bg-white/[0.035]
 dark:hover:bg-white/[0.06]
 `
 "
 @click="
 sourceImageId =
 image.id
 "
 >
 <div
 class="
 aspect-[4/5]

 overflow-hidden

 bg-gray-100

 dark:bg-white/[0.07]
 "
 >
 <img
 :src="
 imageUrl(image)
 "
 :alt="
 image.alt_text
 || productName
 || ''
 "
 class="
 h-full
 w-full

 object-cover
 "
 >
 </div>

 <div
 class="
 px-2
 py-2
 "
 >
 <p
 class="
 truncate

 text-[11px]
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{
 image.alt_text
 || productName
 || 'Product image'
 }}
 </p>

 <p
 class="
 mt-0.5
 truncate

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{
 image.is_primary
 ? 'Primary'
 : image.role
 || 'Gallery'
 }}
 </p>
 </div>
 </button>
 </div>
 </section>

 <!-- Workspace -->
 <div
 class="
 grid
 gap-4

 xl:grid-cols-[340px_minmax(0,1fr)]
 "
 >
 <!-- SETTINGS -->
 <section
 class="
 min-w-0

 space-y-4
 "
 >
 <!-- Tool -->
 <div>
 <div>
 <h3
 class="
 text-[12px]
 font-semibold
 text-gray-800

 dark:text-gray-200
 "
 >
 Tool
 </h3>

 <p
 class="
 mt-0.5

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 Choose what Studio
 should create.
 </p>
 </div>

 <!-- Single-choice cards -->
 <div
 class="
 mt-3
 space-y-1.5
 "
 >
 <button
 v-for="option in operationOptions"
 :key="option.value"
 type="button"
 class="
 w-full

 rounded-[10px]

 px-3
 py-2.5

 text-left

 transition
 "
 :class="
 operationType
 === option.value
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 bg-gray-950/[0.035]
 text-gray-700

 hover:bg-gray-950/[0.06]

 dark:bg-white/[0.055]
 dark:text-gray-300
 dark:hover:bg-white/[0.08]
 `
 "
 @click="
 operationType =
 option.value
 "
 >
 <span
 class="
 block

 text-[12px]
 font-medium
 "
 >
 {{ option.label }}
 </span>

 <span
 class="
 mt-0.5
 block

 text-[12px]
 leading-4

 opacity-60
 "
 >
 {{ option.hint }}
 </span>
 </button>
 </div>
 </div>

 <!-- Background -->
 <div
 v-if="
 operationType
 === 'background_removal'
 "
 >
 <p
 class="
 text-[12px]
 font-semibold
 text-gray-700

 dark:text-gray-300
 "
 >
 Background
 </p>

 <div
 class="
 mt-2

 grid
 grid-cols-2
 gap-1.5
 "
 >
 <button
 v-for="option in backgroundModeOptions"
 :key="option.value"
 type="button"
 class="
 rounded-[9px]

 px-2.5
 py-2

 text-left

 transition
 "
 :class="
 backgroundMode
 === option.value
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 bg-gray-950/[0.035]
 text-gray-600

 hover:bg-gray-950/[0.06]

 dark:bg-white/[0.055]
 dark:text-gray-400
 dark:hover:bg-white/[0.08]
 `
 "
 @click="
 backgroundMode =
 option.value
 "
 >
 <span
 class="
 block

 text-[11px]
 font-medium
 "
 >
 {{ option.label }}
 </span>
 </button>
 </div>

 <div
 v-if="
 backgroundMode
 === 'color'
 "
 class="
 mt-3
 "
 >
 <label
 class="
 mb-1.5
 block

 text-[11px]
 font-medium
 text-gray-500

 dark:text-gray-500
 "
 >
 Background color
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
 backgroundColor
 "
 type="color"
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
 aria-label="Background color"
 >

 <AppInput
 v-model="
 backgroundColor
 "
 class="flex-1"
 placeholder="#ffffff"
 @blur="
 onBackgroundColorInput
 "
 />
 </div>

 <p
 v-if="
 !isValidHexColor(
 backgroundColor,
 )
 "
 class="
 mt-1.5

 text-[11px]
 text-red-600

 dark:text-red-400
 "
 >
 Use a valid color such
 as #ffffff.
 </p>
 </div>

 <div
 v-if="
 backgroundMode
 === 'ai_scene'
 "
 class="
 mt-3
 space-y-3
 "
 >
 <AppTextarea
 v-model="
 backgroundPrompt
 "
 label="Describe backdrop"
 :rows="3"
 placeholder="Minimal boutique studio, warm soft lighting..."
 />

 <AppInput
 v-model="
 backgroundSeed
 "
 label="Style seed"
 type="number"
 placeholder="Optional"
 />

 <p
 class="
 text-[12px]
 leading-4
 text-gray-400

 dark:text-gray-600
 "
 >
 Reusing a seed helps
 keep backgrounds
 visually consistent.
 </p>
 </div>
 </div>

 <!-- Shadow -->
 <div
 v-if="
 showShadowOption
 "
 class="
 rounded-[10px]

 bg-gray-950/[0.035]

 p-3

 dark:bg-white/[0.055]
 "
 >
 <AppToggle
 v-model="
 shadowEnabled
 "
 label="Add shadow"
 description="Ground the product with a generated shadow."
 />

 <div
 v-if="
 shadowEnabled
 "
 class="
 mt-3

 grid
 grid-cols-2
 gap-1.5
 "
 >
 <button
 type="button"
 class="
 h-8

 rounded-[8px]

 text-[11px]
 font-medium

 transition
 "
 :class="
 shadowStyle
 === 'soft'
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 bg-gray-950/[0.04]
 text-gray-500

 dark:bg-white/[0.06]
 dark:text-gray-400
 `
 "
 @click="
 shadowStyle =
 'soft'
 "
 >
 Soft
 </button>

 <button
 type="button"
 class="
 h-8

 rounded-[8px]

 text-[11px]
 font-medium

 transition
 "
 :class="
 shadowStyle
 === 'hard'
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 bg-gray-950/[0.04]
 text-gray-500

 dark:bg-white/[0.06]
 dark:text-gray-400
 `
 "
 @click="
 shadowStyle =
 'hard'
 "
 >
 Defined
 </button>
 </div>
 </div>

 <!-- Model -->
 <div
 v-if="
 operationType
 === 'virtual_model'
 "
 >
 <AppSelect
 v-model="
 virtualModelPose
 "
 label="Model pose"
 :options="
 poseOptions
 "
 />

 <p
 class="
 mt-2

 rounded-[9px]

 bg-amber-500/[0.07]

 px-2.5
 py-2

 text-[12px]
 leading-4
 text-amber-700

 dark:bg-amber-500/10
 dark:text-amber-300
 "
 >
 AI model generation is
 more experimental and
 works best from a clean
 garment image.
 </p>
 </div>

 <!-- Size -->
 <div
 v-if="usesSize"
 >
 <p
 class="
 text-[12px]
 font-semibold
 text-gray-700

 dark:text-gray-300
 "
 >
 Output
 </p>

 <AppSelect
 v-model="role"
 class="mt-2"
 label="Image role"
 :options="
 roleOptions
 "
 />

 <div
 class="
 mt-3

 grid
 grid-cols-2
 gap-1.5
 "
 >
 <button
 v-for="option in ratioOptions"
 :key="option.key"
 type="button"
 class="
 rounded-[9px]

 px-2.5
 py-2

 text-left

 transition
 "
 :class="
 ratioKey
 === option.key
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 bg-gray-950/[0.035]
 text-gray-600

 hover:bg-gray-950/[0.06]

 dark:bg-white/[0.055]
 dark:text-gray-400
 dark:hover:bg-white/[0.08]
 `
 "
 @click="
 ratioKey =
 option.key
 "
 >
 <span
 class="
 block

 text-[11px]
 font-medium
 "
 >
 {{ option.label }}
 </span>

 <span
 class="
 mt-0.5
 block

 text-[11px]

 opacity-60
 "
 >
 {{ option.width }}
 ×
 {{ option.height }}
 </span>
 </button>
 </div>

 <div
 class="
 mt-3

 grid
 grid-cols-2
 gap-2
 "
 >
 <AppInput
 v-model="width"
 label="Width"
 type="number"
 />

 <AppInput
 v-model="height"
 label="Height"
 type="number"
 />
 </div>
 </div>

 <div
 v-else
 class="
 rounded-[10px]

 bg-gray-950/[0.035]

 p-3

 dark:bg-white/[0.055]
 "
 >
 <div
 class="
 flex
 justify-between
 gap-3

 text-[11px]
 "
 >
 <span
 class="
 text-gray-400

 dark:text-gray-600
 "
 >
 Role
 </span>

 <span
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ sourceRole }}
 </span>
 </div>

 <div
 class="
 mt-1
 flex
 justify-between
 gap-3

 text-[11px]
 "
 >
 <span
 class="
 text-gray-400

 dark:text-gray-600
 "
 >
 Size
 </span>

 <span
 class="
 text-right
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{
 operationType
 === 'virtual_model'
 ? 'AI framing'
 : 'Original'
 }}
 </span>
 </div>
 </div>
 </section>

 <!-- PREVIEWS -->
 <section
 class="
 min-w-0
 "
 >
 <div
 class="
 flex
 items-end
 justify-between
 gap-4
 "
 >
 <div>
 <h3
 class="
 text-[12px]
 font-semibold
 text-gray-800

 dark:text-gray-200
 "
 >
 Previews
 </h3>

 <p
 class="
 mt-0.5

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 Drafts stay private
 until approved.
 </p>
 </div>

 <span
 class="
 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{
 sortedDrafts.length
 }}
 {{
 sortedDrafts.length
 === 1
 ? 'draft'
 : 'drafts'
 }}
 </span>
 </div>

 <div
 v-if="
 sortedDrafts.length
 === 0
 "
 class="
 mt-3

 flex
 min-h-[280px]
 items-center
 justify-center

 rounded-[14px]

 bg-gray-950/[0.025]

 p-8

 text-center

 dark:bg-white/[0.035]
 "
 >
 <div>
 <p
 class="
 text-[12px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 No previews yet
 </p>

 <p
 class="
 mt-1

 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 Select a source,
 choose a tool and
 generate a preview.
 </p>
 </div>
 </div>

 <div
 v-else
 class="
 mt-3

 grid
 gap-3

 md:grid-cols-2

 2xl:grid-cols-3
 "
 >
 <article
 v-for="draft in sortedDrafts"
 :key="draft.id"
 class="
 overflow-hidden

 rounded-[14px]

 bg-gray-950/[0.025]

 dark:bg-white/[0.035]
 "
 >
 <div
 class="
 relative

 flex
 items-center
 justify-center

 overflow-hidden

 bg-gray-100

 dark:bg-black/20
 "
 :style="
 draftAspectStyle(
 draft,
 )
 "
 >
 <img
 v-if="
 !isBroken(draft)
 "
 :src="
 draftUrl(draft)
 "
 :alt="
 operationLabel(
 draft
 .operation_type,
 )
 "
 class="
 h-full
 w-full

 object-contain
 "
 @error="
 markDraftBroken(
 draft,
 )
 "
 >

 <div
 v-else
 class="
 p-6
 text-center
 "
 >
 <p
 class="
 text-[12px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 Preview unavailable
 </p>

 <AppButton
 type="button"
 class="mt-3"
 variant="secondary"
 size="sm"
 @click="
 retryDraftImage(
 draft,
 )
 "
 >
 Retry
 </AppButton>
 </div>

 <div
 class="
 absolute
 left-2.5
 top-2.5

 flex
 gap-1.5
 "
 >
 <span
 class="
 rounded-full

 bg-white/90

 px-2
 py-1

 text-[11px]
 font-semibold
 uppercase
 tracking-wide
 text-gray-600

 backdrop-blur

 dark:bg-black/60
 dark:text-gray-300
 "
 >
 {{ draft.status }}
 </span>

 <span
 v-if="
 draft.is_ai_generated
 "
 class="
 rounded-full

 bg-white/90

 px-2
 py-1

 text-[11px]
 font-semibold
 uppercase
 tracking-wide
 text-gray-600

 backdrop-blur

 dark:bg-black/60
 dark:text-gray-300
 "
 >
 AI
 </span>
 </div>
 </div>

 <div
 class="
 p-3
 "
 >
 <p
 class="
 text-[12px]
 font-semibold
 text-gray-800

 dark:text-gray-200
 "
 >
 {{
 operationLabel(
 draft
 .operation_type,
 )
 }}
 </p>

 <p
 class="
 mt-0.5

 text-[12px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ draft.role }}

 <template
 v-if="
 draft.width
 && draft.height
 "
 >
 ·
 {{ draft.width }}
 ×
 {{ draft.height }}
 </template>

 <template v-else>
 · original
 </template>
 </p>

 <template
 v-if="
 draft.status
 !== 'approved'
 "
 >
 <!-- New / Replace:
 single choice -->
 <div
 class="
 mt-3

 grid
 grid-cols-2
 gap-1
 "
 >
 <button
 type="button"
 class="
 h-8

 rounded-[8px]

 text-[12px]
 font-medium

 transition
 "
 :class="
 approveStateFor(
 draft,
 ).mode
 === 'new'
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 bg-gray-950/[0.04]
 text-gray-500

 dark:bg-white/[0.06]
 dark:text-gray-400
 `
 "
 @click="
 approveStateFor(
 draft,
 ).mode =
 'new'
 "
 >
 Add new
 </button>

 <button
 type="button"
 class="
 h-8

 rounded-[8px]

 text-[12px]
 font-medium

 transition
 "
 :class="
 approveStateFor(
 draft,
 ).mode
 === 'replace'
 ? `
 bg-gray-950
 text-white

 dark:bg-white
 dark:text-gray-950
 `
 : `
 bg-gray-950/[0.04]
 text-gray-500

 dark:bg-white/[0.06]
 dark:text-gray-400
 `
 "
 @click="
 approveStateFor(
 draft,
 ).mode =
 'replace'
 "
 >
 Replace
 </button>
 </div>

 <AppSelect
 v-if="
 approveStateFor(
 draft,
 ).mode
 === 'replace'
 "
 v-model="
 approveStateFor(
 draft,
 ).replaceImageId
 "
 class="mt-2"
 label="Replace image"
 :options="
 images.map(
 (image) => ({
 label:
 image.alt_text
 || productName
 || `Image ${image.id}`,

 value:
 String(
 image.id,
 ),
 }),
 )
 "
 />

 <!-- Boolean toggle,
 NOT checkbox -->
 <div
 class="
 mt-2

 rounded-[9px]

 bg-white

 p-2.5

 dark:bg-white/[0.04]
 "
 >
 <AppToggle
 v-model="
 approveStateFor(
 draft,
 ).makePrimary
 "
 label="Make primary"
 description="Use this as the main product image."
 />
 </div>
 </template>

 <div
 class="
 mt-3

 flex
 items-center
 gap-1.5
 "
 >
 <AppButton
 type="button"
 size="sm"
 class="flex-1"
 :disabled="
 draft.status
 === 'approved'
 || approving
 === draft.id
 || isBroken(
 draft,
 )
 "
 :loading="
 approving
 === draft.id
 "
 @click="
 approveDraft(
 draft,
 )
 "
 >
 {{
 draft.status
 === 'approved'
 ? 'Approved'
 : approveStateFor(
 draft,
 ).mode
 === 'replace'
 ? 'Approve & replace'
 : 'Approve'
 }}
 </AppButton>

 <AppButton
 type="button"
 variant="ghost"
 size="sm"
 :disabled="
 deleting
 === draft.id
 || approving
 === draft.id
 "
 :loading="
 deleting
 === draft.id
 "
 @click="
 deleteDraft(
 draft,
 )
 "
 >
 Delete
 </AppButton>
 </div>
 </div>
 </article>
 </div>
 </section>
 </div>
 </div>

 <!-- Fixed modal footer.
 No sticky inner footer. -->
 <template #footer>
 <div
 class="
 flex
 flex-col-reverse
 gap-2

 sm:flex-row
 sm:items-center
 sm:justify-between
 "
 >
 <p
 class="
 hidden

 text-[11px]
 text-gray-400

 dark:text-gray-600

 sm:block
 "
 >
 {{
 selectedOperation
 ?.label
 }}
 ·
 {{
 selectedSourceImage
 ? 'source selected'
 : 'choose a source'
 }}
 </p>

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
 @click="emit('close')"
 >
 Close
 </AppButton>

 <AppButton
 type="button"
 :loading="generating"
 :disabled="!canGenerate"
 @click="generateDraft"
 >
 {{
 generating
 ? 'Generating…'
 : 'Generate preview'
 }}
 </AppButton>
 </div>
 </div>
 </template>
 </AppModal>
</template>
