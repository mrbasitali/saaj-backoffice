<script setup lang="ts">
type CropMeta = {
 ratio_key: string
 aspect_ratio: string
 width: number
 height: number
 background_mode:
 | 'white'
 | 'transparent'
}

export type ProductImageDraft = {
 id: string
 file: File
 preview_url: string
 alt_text: string
 is_primary: boolean
 crop_meta?: CropMeta
}

const props = withDefaults(
 defineProps<{
 modelValue:
 ProductImageDraft[]

 productName?: string

 maxImages?: number
 }>(),
 {
 productName: '',
 maxImages: 8,
 },
)

const emit = defineEmits<{
 'update:modelValue': [
 items:
 ProductImageDraft[],
 ]
}>()

const inputRef =
 ref<HTMLInputElement | null>(null)

const cropOpen = ref(false)
const cropSource = ref('')
const cropFilename = ref('')

const dragActive = ref(false)
const fileError = ref('')

const images = computed({
 get: () =>
 props.modelValue,

 set: (
 value:
 ProductImageDraft[],
 ) => {
 emit(
 'update:modelValue',
 value,
 )
 },
})

const canAddMore =
 computed(
 () =>
 images.value.length
 < props.maxImages,
 )

const remainingSlots =
 computed(() => {
 return Math.max(
 0,

 props.maxImages
 - images.value.length,
 )
 })

function openFilePicker() {
 if (!canAddMore.value) {
 return
 }

 inputRef.value?.click()
}

function prepareFile(
 file: File,
) {
 fileError.value = ''

 if (!canAddMore.value) {
 fileError.value =
 `Maximum ${props.maxImages} images allowed.`

 return
 }

 const allowedTypes = [
 'image/jpeg',
 'image/png',
 'image/webp',
 ]

 if (
 !allowedTypes.includes(
 file.type,
 )
 ) {
 fileError.value =
 'Use JPG, PNG or WebP images.'

 return
 }

 if (cropSource.value) {
 URL.revokeObjectURL(
 cropSource.value,
 )
 }

 cropSource.value =
 URL.createObjectURL(
 file,
 )

 cropFilename.value =
 file.name

 cropOpen.value = true
}

function onFileChange(
 event: Event,
) {
 const input = event.target as HTMLInputElement

 const file =
 input.files?.[0]

 if (file) {
 prepareFile(file)
 }

 input.value = ''
}

function onDragOver(
 event: DragEvent,
) {
 event.preventDefault()

 if (!canAddMore.value) {
 return
 }

 dragActive.value = true

 if (event.dataTransfer) {
 event.dataTransfer.dropEffect =
 'copy'
 }
}

function onDragLeave() {
 dragActive.value = false
}

function onDrop(
 event: DragEvent,
) {
 event.preventDefault()

 dragActive.value = false

 if (!canAddMore.value) {
 return
 }

 const file =
 event.dataTransfer
 ?.files?.[0]

 if (file) {
 prepareFile(file)
 }
}

function closeCropper() {
 cropOpen.value = false

 if (cropSource.value) {
 URL.revokeObjectURL(
 cropSource.value,
 )
 }

 cropSource.value = ''
 cropFilename.value = ''
}

function addCroppedImage(
 file: File,
 previewUrl: string,
 meta?: CropMeta,
) {
 const shouldBePrimary =
 images.value.length === 0

 images.value = [
 ...images.value,

 {
 id:
 `${Date.now()}-${
 Math.random()
 .toString(16)
 .slice(2)
 }`,

 file,

 preview_url:
 previewUrl,

 alt_text:
 props.productName
 || '',

 is_primary:
 shouldBePrimary,

 crop_meta: meta,
 },
 ]

 closeCropper()
}

function setPrimary(
 id: string,
) {
 images.value =
 images.value.map(
 (item) => ({
 ...item,

 is_primary:
 item.id === id,
 }),
 )
}

function updateAltText(
 id: string,
 value: string,
) {
 images.value =
 images.value.map(
 (item) => {
 if (
 item.id !== id
 ) {
 return item
 }

 return {
 ...item,
 alt_text: value,
 }
 },
 )
}

function removeImage(
 id: string,
) {
 const removing =
 images.value.find(
 (item) =>
 item.id === id,
 )

 if (
 removing?.preview_url
 ) {
 URL.revokeObjectURL(
 removing.preview_url,
 )
 }

 const remaining =
 images.value.filter(
 (item) =>
 item.id !== id,
 )

 if (
 remaining.length
 && !remaining.some(
 (item) =>
 item.is_primary,
 )
 ) {
 const first =
 remaining[0]

 if (first) {
 first.is_primary = true
 }
 }

 images.value = [
 ...remaining,
 ]
}

onBeforeUnmount(() => {
 if (cropSource.value) {
 URL.revokeObjectURL(
 cropSource.value,
 )
 }
})
</script>

<template>
 <section class="space-y-3">
 <!-- Header -->
 <div
 class="
 flex
 items-end
 justify-between
 gap-3
 "
 >
 <div>
 <div
 class="
 flex
 items-center
 gap-2
 "
 >
 <h3
 class="
 text-[12px]
 font-semibold
 text-gray-800

 dark:text-gray-200
 "
 >
 New images
 </h3>

 <span
 v-if="images.length"
 class="
 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ images.length }}
 </span>
 </div>

 <p
 class="
 mt-1

 text-[11px]
 leading-4
 text-gray-400

 dark:text-gray-600
 "
 >
 Add source images and crop
 them before saving.
 </p>
 </div>

 <AppButton
 v-if="images.length"
 type="button"
 size="sm"
 variant="secondary"
 :disabled="!canAddMore"
 @click="openFilePicker"
 >
 <svg
 class="
 h-3.5
 w-3.5
 "
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="
 M10 4V16
 M4 10H16
 "
 stroke="currentColor"
 stroke-width="1.7"
 stroke-linecap="round"
 />
 </svg>

 Add image
 </AppButton>
 </div>

 <input
 ref="inputRef"
 type="file"
 accept="
 image/jpeg,
 image/png,
 image/webp
 "
 class="hidden"
 @change="onFileChange"
 >

 <div
 v-if="fileError"
 class="
 rounded-[10px]

 bg-red-500/[0.07]

 px-3
 py-2.5

 text-[11px]
 font-medium
 text-red-600

 dark:bg-red-500/10
 dark:text-red-400
 "
 >
 {{ fileError }}
 </div>

 <!-- Empty upload surface -->
 <button
 v-if="
 images.length === 0
 "
 type="button"
 class="
 flex
 min-h-[180px]
 w-full
 items-center
 justify-center

 rounded-[14px]

 bg-gray-950/[0.025]

 px-6
 py-8

 text-center

 outline-none

 transition
 duration-150

 hover:bg-gray-950/[0.04]

 focus-visible:ring-2
 focus-visible:ring-gray-950/10

 dark:bg-white/[0.035]
 dark:hover:bg-white/[0.055]
 dark:focus-visible:ring-white/10
 "
 :class="
 dragActive
 ? `
 bg-gray-950/[0.055]
 ring-2
 ring-gray-950/10

 dark:bg-white/[0.07]
 dark:ring-white/10
 `
 : ''
 "
 @click="openFilePicker"
 @dragover="
 onDragOver
 "
 @dragleave="
 onDragLeave
 "
 @drop="onDrop"
 >
 <div>
 <div
 class="
 mx-auto

 flex
 h-10
 w-10
 items-center
 justify-center

 rounded-[11px]

 bg-gray-950/[0.055]

 text-gray-500

 dark:bg-white/[0.065]
 dark:text-gray-500
 "
 >
 <svg
 class="h-5 w-5"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="
 M10 13V4
 M6.5 7.5L10 4
 L13.5 7.5
 "
 stroke="currentColor"
 stroke-width="1.5"
 stroke-linecap="round"
 stroke-linejoin="round"
 />

 <path
 d="
 M4 12.5V15
 C4 15.55
 4.45 16
 5 16
 H15
 C15.55 16
 16 15.55
 16 15
 V12.5
 "
 stroke="currentColor"
 stroke-width="1.5"
 stroke-linecap="round"
 />
 </svg>
 </div>

 <p
 class="
 mt-3

 text-[12px]
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 Drop an image here
 or click to browse
 </p>

 <p
 class="
 mt-1

 text-[12px]
 leading-4
 text-gray-400

 dark:text-gray-600
 "
 >
 JPG, PNG or WebP.
 You’ll crop it before
 adding it.
 </p>
 </div>
 </button>

 <!-- Selected new images -->
 <div
 v-else
 class="
 grid
 gap-3

 sm:grid-cols-2

 lg:grid-cols-3

 2xl:grid-cols-4
 "
 >
 <article
 v-for="(
 image,
 index
 ) in images"
 :key="image.id"
 class="
 group

 min-w-0
 overflow-hidden

 rounded-[14px]

 bg-gray-950/[0.025]

 dark:bg-white/[0.035]
 "
 >
 <!-- Preview -->
 <div
 class="
 relative

 aspect-[4/5]

 overflow-hidden

 bg-gray-100

 dark:bg-white/[0.055]
 "
 >
 <img
 :src="
 image.preview_url
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

 transition-transform
 duration-300


 "
 >

 <div
 class="
 pointer-events-none

 absolute
 inset-x-0
 top-0

 h-20

 bg-gradient-to-b
 from-black/25
 to-transparent
 "
 />

 <!-- Position -->
 <span
 class="
 absolute
 left-2.5
 top-2.5

 rounded-full

 bg-black/45

 px-2
 py-1

 text-[11px]
 font-medium
 text-white/90

 backdrop-blur-md
 "
 >
 {{ index + 1 }}
 </span>

 <!-- Primary -->
 <span
 v-if="
 image.is_primary
 "
 class="
 absolute
 left-2.5
 top-9

 flex
 items-center
 gap-1.5

 rounded-full

 bg-white/90

 px-2
 py-1

 text-[11px]
 font-semibold
 text-gray-800

 backdrop-blur-md

 dark:bg-black/60
 dark:text-white
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

 Primary
 </span>

 <!-- Crop metadata -->
 <span
 v-if="
 image.crop_meta
 "
 class="
 absolute
 bottom-2.5
 left-2.5

 rounded-full

 bg-black/45

 px-2
 py-1

 text-[11px]
 font-medium
 text-white/90

 backdrop-blur-md
 "
 >
 {{
 image.crop_meta
 .aspect_ratio
 }}
 ·
 {{
 image.crop_meta
 .width
 }}
 ×
 {{
 image.crop_meta
 .height
 }}
 </span>

 <!-- Remove -->
 <button
 type="button"
 title="Remove image"
 aria-label="Remove image"
 class="
 absolute
 right-2.5
 top-2.5

 flex
 h-8
 w-8
 items-center
 justify-center

 rounded-[9px]

 bg-black/40

 text-white/80

 backdrop-blur-md

 transition

 hover:bg-red-600/80
 hover:text-white

 active:scale-95
 "
 @click="
 removeImage(
 image.id,
 )
 "
 >
 <svg
 class="h-3.5 w-3.5"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="
 M5 5L15 15
 M15 5L5 15
 "
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 />
 </svg>
 </button>
 </div>

 <!-- Information -->
 <div
 class="
 space-y-2.5

 p-3
 "
 >
 <AppInput
 :model-value="
 image.alt_text
 "
 placeholder="Alt text"
 @update:model-value="
 updateAltText(
 image.id,
 String($event),
 )
 "
 />

 <!-- Primary uses a
 single-choice action -->
 <button
 type="button"
 class="
 flex
 h-8
 w-full
 items-center
 justify-center
 gap-1.5

 rounded-[8px]

 text-[12px]
 font-medium

 transition
 "
 :class="
 image.is_primary
 ? `
 bg-gray-950/[0.07]
 text-gray-800

 dark:bg-white/[0.09]
 dark:text-gray-200
 `
 : `
 text-gray-400

 hover:bg-gray-950/[0.045]
 hover:text-gray-700

 dark:text-gray-600
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-300
 `
 "
 :disabled="
 image.is_primary
 "
 @click="
 setPrimary(
 image.id,
 )
 "
 >
 <span
 class="
 h-1.5
 w-1.5
 rounded-full
 "
 :class="
 image.is_primary
 ? 'bg-emerald-500'
 : 'bg-gray-300 dark:bg-gray-700'
 "
 />

 {{
 image.is_primary
 ? 'Primary image'
 : 'Make primary'
 }}
 </button>
 </div>
 </article>

 <!-- Add another tile -->
 <button
 v-if="canAddMore"
 type="button"
 class="
 flex
 min-h-[260px]
 items-center
 justify-center

 rounded-[14px]

 bg-gray-950/[0.02]

 p-4

 text-center

 outline-none

 transition

 hover:bg-gray-950/[0.04]

 focus-visible:ring-2
 focus-visible:ring-gray-950/10

 dark:bg-white/[0.025]
 dark:hover:bg-white/[0.045]
 dark:focus-visible:ring-white/10
 "
 @click="openFilePicker"
 @dragover="
 onDragOver
 "
 @dragleave="
 onDragLeave
 "
 @drop="onDrop"
 >
 <div>
 <div
 class="
 mx-auto

 flex
 h-9
 w-9
 items-center
 justify-center

 rounded-[10px]

 bg-gray-950/[0.045]

 text-gray-400

 dark:bg-white/[0.055]
 dark:text-gray-600
 "
 >
 <svg
 class="h-4 w-4"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="
 M10 4V16
 M4 10H16
 "
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 />
 </svg>
 </div>

 <p
 class="
 mt-3

 text-[11px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 Add another
 </p>

 <p
 class="
 mt-1

 text-[12px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ remainingSlots }}
 slots remaining
 </p>
 </div>
 </button>
 </div>

 <ProductImageCropModal
 :open="cropOpen"
 :src="cropSource"
 :filename="cropFilename"
 background-mode="white"
 @close="closeCropper"
 @cropped="
 addCroppedImage
 "
 />
 </section>
</template>