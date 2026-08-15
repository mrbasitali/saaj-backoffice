<script setup lang="ts">
type OptimizedUrls = {
 thumb?: string | null
 card?: string | null
 detail?: string | null
 zoom?: string | null
}

type ProductImage = {
 id: number
 product_id?: number
 image_url: string
 image_public_id?: string
 optimized_urls?: OptimizedUrls
 alt_text: string | null
 is_primary: boolean
 sort_order: number
}

type ProductImageResponse = {
 data: ProductImage
 message?: string
}

type CropMode =
 | 'edit'
 | 'replace'

const props = defineProps<{
 productId: number
 images: ProductImage[]
 productName?: string
}>()

const emit = defineEmits<{
 changed: []
}>()

const { $api } = useNuxtApp()

const localImages =
 ref<ProductImage[]>([])

const saving = ref(false)

const preparingCrop =
 ref<number | null>(null)

const actionError = ref('')
const notice = ref('')

const replaceInput =
 ref<HTMLInputElement | null>(null)

const cropOpen = ref(false)
const cropSource = ref('')
const cropSourceIsObjectUrl = ref(false)
const cropFilename = ref('')

const cropMode =
 ref<CropMode>('replace')

const imageToReplace =
 ref<ProductImage | null>(null)

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')

const imageToDelete =
 ref<ProductImage | null>(null)

const draggingId =
 ref<number | null>(null)

const dragOverId =
 ref<number | null>(null)

watch(
 () => props.images,
 (images) => {
 localImages.value = [
 ...images,
 ]
 .map((item) => ({
 ...item,
 }))
 .sort((a, b) => {
 if (
 a.sort_order
 === b.sort_order
 ) {
 return a.id - b.id
 }

 return (
 a.sort_order
 - b.sort_order
 )
 })
 },
 {
 immediate: true,
 deep: true,
 },
)

function imageUrl(
 image: ProductImage,
) {
 return (
 image.optimized_urls?.card
 || image.optimized_urls?.detail
 || image.image_url
 )
}

function editableImageUrl(
 image: ProductImage,
) {
 return (
 image.optimized_urls?.zoom
 || image.optimized_urls?.detail
 || image.image_url
 )
}

function showNotice(
 message: string,
) {
 notice.value = message

 setTimeout(() => {
 notice.value = ''
 }, 2500)
}

function reindex(
 items: ProductImage[],
) {
 return items.map(
 (item, index) => ({
 ...item,
 sort_order: index,
 }),
 )
}

function safeFilenameForImage(
 image: ProductImage,
) {
 const base = (
 image.alt_text
 || props.productName
 || `product-image-${image.id}`
 )
 .toLowerCase()
 .replace(
 /[^a-z0-9]+/g,
 '-',
 )
 .replace(
 /(^-|-$)/g,
 '',
 )

 return `${
 base || 'product-image'
 }-${image.id}.jpg`
}

function revokeCropSource() {
 if (
 cropSource.value
 && cropSourceIsObjectUrl.value
 ) {
 URL.revokeObjectURL(
 cropSource.value,
 )
 }

 cropSource.value = ''
 cropSourceIsObjectUrl.value =
 false
}

function setCropSource(
 source: string,
 isObjectUrl = true,
) {
 revokeCropSource()

 cropSource.value = source
 cropSourceIsObjectUrl.value =
 isObjectUrl
}

async function sourceForExistingImage(
 image: ProductImage,
) {
 const source =
 editableImageUrl(image)

 try {
 const response =
 await fetch(source, {
 mode: 'cors',
 credentials: 'omit',
 })

 if (!response.ok) {
 throw new Error(
 'Could not fetch image.',
 )
 }

 const blob =
 await response.blob()

 return {
 source:
 URL.createObjectURL(
 blob,
 ),
 isObjectUrl: true,
 }
 } catch {
 return {
 source,
 isObjectUrl: false,
 }
 }
}

async function saveImageDetails(
 image: ProductImage,
) {
 saving.value = true
 actionError.value = ''

 try {
 const response =
 await $api<ProductImageResponse>(
 `/admin/products/${props.productId}/images/${image.id}`,
 {
 method: 'PATCH',

 body: {
 alt_text:
 image.alt_text
 || null,

 sort_order:
 image.sort_order,
 },
 },
 )

 localImages.value =
 localImages.value.map(
 (item) => {
 if (
 item.id
 !== image.id
 ) {
 return item
 }

 return (
 response.data
 ?? image
 )
 },
 )

 showNotice(
 'Image details saved.',
 )

 emit('changed')
 } catch (error: any) {
 actionError.value =
 error?.data?.message
 || 'Could not save image details.'
 } finally {
 saving.value = false
 }
}

async function setPrimary(
 image: ProductImage,
) {
 if (image.is_primary) {
 return
 }

 saving.value = true
 actionError.value = ''

 try {
 await $api(
 `/admin/products/${props.productId}/images/${image.id}/primary`,
 {
 method: 'PATCH',
 },
 )

 localImages.value =
 localImages.value.map(
 (item) => ({
 ...item,

 is_primary:
 item.id
 === image.id,
 }),
 )

 showNotice(
 'Primary image updated.',
 )

 emit('changed')
 } catch (error: any) {
 actionError.value =
 error?.data?.message
 || 'Could not set primary image.'
 } finally {
 saving.value = false
 }
}

function askDelete(
 image: ProductImage,
) {
 imageToDelete.value = image

 deleteError.value = ''
 deleteOpen.value = true
}

async function confirmDelete() {
 if (!imageToDelete.value) {
 return
 }

 deleting.value = true
 deleteError.value = ''

 try {
 const deletedWasPrimary =
 imageToDelete.value
 .is_primary

 await $api(
 `/admin/products/${props.productId}/images/${imageToDelete.value.id}`,
 {
 method: 'DELETE',
 },
 )

 let remaining =
 localImages.value.filter(
 (item) =>
 item.id
 !== imageToDelete
 .value?.id,
 )

 if (
 remaining.length
 && deletedWasPrimary
 ) {
 remaining =
 remaining.map(
 (item, index) => ({
 ...item,

 is_primary:
 index === 0,
 }),
 )
 }

 localImages.value =
 reindex(remaining)

 deleteOpen.value = false
 imageToDelete.value = null

 showNotice(
 'Image deleted.',
 )

 emit('changed')
 } catch (error: any) {
 deleteError.value =
 error?.data?.message
 || 'Could not delete image.'
 } finally {
 deleting.value = false
 }
}

async function openEditCrop(
 image: ProductImage,
) {
 cropMode.value = 'edit'

 imageToReplace.value =
 image

 cropFilename.value =
 safeFilenameForImage(
 image,
 )

 actionError.value = ''

 preparingCrop.value =
 image.id

 try {
 const editableSource =
 await sourceForExistingImage(
 image,
 )

 setCropSource(
 editableSource.source,
 editableSource
 .isObjectUrl,
 )

 cropOpen.value = true
 } catch {
 actionError.value =
 'Could not open this image for editing. Try Replace instead.'

 imageToReplace.value =
 null
 } finally {
 preparingCrop.value =
 null
 }
}

function openReplace(
 image: ProductImage,
) {
 cropMode.value = 'replace'

 imageToReplace.value =
 image

 actionError.value = ''

 replaceInput.value?.click()
}

function onReplaceFileChange(event: Event) {
 const input = event.target as HTMLInputElement
 const file = input.files?.[0]

 if (
 !file
 || !imageToReplace.value
 ) {
 return
 }

 setCropSource(
 URL.createObjectURL(file),
 true,
 )

 cropFilename.value = file.name
 cropOpen.value = true

 input.value = ''
}

function closeCropper() {
 cropOpen.value = false

 revokeCropSource()

 cropFilename.value = ''
}

async function replaceWithCropped(
 file: File,
) {
 if (!imageToReplace.value) {
 return
 }

 const currentImage =
 imageToReplace.value

 saving.value = true
 actionError.value = ''

 try {
 const data =
 new FormData()

 data.append(
 'image',
 file,
 )

 data.append(
 'alt_text',
 currentImage.alt_text
 || props.productName
 || '',
 )

 data.append(
 'sort_order',
 String(
 currentImage.sort_order
 || 0,
 ),
 )

 data.append(
 'is_primary',
 currentImage.is_primary
 ? '1'
 : '0',
 )

 /*
 Normal crop / replace should
 never trigger AI background
 removal.

 AI tools belong in
 Product Image Studio.
 */
 data.append(
 'remove_background',
 '0',
 )

 const response =
 await $api<ProductImageResponse>(
 `/admin/products/${props.productId}/images/${currentImage.id}/replace`,
 {
 method: 'POST',
 body: data,
 },
 )

 localImages.value =
 localImages.value.map(
 (item) => {
 if (
 item.id
 !== currentImage.id
 ) {
 return item
 }

 return (
 response.data
 ?? item
 )
 },
 )

 closeCropper()

 imageToReplace.value =
 null

 showNotice(
 cropMode.value === 'edit'
 ? 'Image crop saved.'
 : 'Image replaced.',
 )

 emit('changed')
 } catch (error: any) {
 actionError.value =
 error?.data?.message
 || 'Could not save edited image.'
 } finally {
 saving.value = false
 }
}

function onDragStart(
 event: DragEvent,
 image: ProductImage,
) {
 if (saving.value) {
 return
 }

 draggingId.value =
 image.id

 dragOverId.value =
 image.id

 event.dataTransfer?.setData(
 'text/plain',
 String(image.id),
 )

 if (event.dataTransfer) {
 event.dataTransfer.effectAllowed =
 'move'
 }
}

function onDragEnter(
 image: ProductImage,
) {
 if (
 !draggingId.value
 || draggingId.value
 === image.id
 ) {
 return
 }

 dragOverId.value =
 image.id
}

function onDragEnd() {
 draggingId.value = null
 dragOverId.value = null
}

async function onDrop(
 event: DragEvent,
 targetImage: ProductImage,
) {
 event.preventDefault()

 const draggedImageId =
 Number(
 event.dataTransfer
 ?.getData('text/plain')
 || draggingId.value,
 )

 draggingId.value = null
 dragOverId.value = null

 if (
 !draggedImageId
 || draggedImageId
 === targetImage.id
 ) {
 return
 }

 const current = [
 ...localImages.value,
 ]

 const fromIndex =
 current.findIndex(
 (item) =>
 item.id
 === draggedImageId,
 )

 const toIndex =
 current.findIndex(
 (item) =>
 item.id
 === targetImage.id,
 )

 if (
 fromIndex < 0
 || toIndex < 0
 ) {
 return
 }

 const [moved] =
 current.splice(
 fromIndex,
 1,
 )

 if (!moved) {
 return
 }

 current.splice(
 toIndex,
 0,
 moved,
 )

 localImages.value =
 reindex(current)

 await saveOrder()
}

async function saveOrder() {
 saving.value = true
 actionError.value = ''

 try {
 await $api(
 `/admin/products/${props.productId}/images/reorder`,
 {
 method: 'PUT',

 body: {
 images:
 localImages.value.map(
 (
 image,
 index,
 ) => ({
 id: image.id,

 sort_order:
 index,
 }),
 ),

 primary_image_id:
 localImages.value.find(
 (image) =>
 image.is_primary,
 )?.id
 ?? null,
 },
 },
 )

 showNotice(
 'Image order saved.',
 )

 emit('changed')
 } catch (error: any) {
 actionError.value =
 error?.data?.message
 || 'Could not save image order.'
 } finally {
 saving.value = false
 }
}

onBeforeUnmount(() => {
 revokeCropSource()
})
</script>

<template>
 <section class="space-y-3">
 <!-- Header -->
 <div
 class="
 flex
 flex-col
 gap-2

 sm:flex-row
 sm:items-end
 sm:justify-between
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
 Existing images
 </h3>

 <span
 v-if="
 localImages.length
 "
 class="
 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{
 localImages.length
 }}
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
 Crop, replace, reorder and
 choose the primary image.
 </p>
 </div>

 <p
 v-if="
 localImages.length > 1
 "
 class="
 text-[12px]
 text-gray-400

 dark:text-gray-600
 "
 >
 Drag
 <span
 class="
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 ⋮⋮
 </span>
 to reorder
 </p>
 </div>

 <!-- Notice -->
 <Transition
 enter-active-class="
 transition
 duration-180
 "
 enter-from-class="
 -translate-y-1
 opacity-0
 "
 leave-active-class="
 transition
 duration-120
 "
 leave-to-class="
 -translate-y-1
 opacity-0
 "
 >
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

 text-[11px]
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
 shrink-0
 rounded-full

 bg-emerald-500
 "
 />

 {{ notice }}
 </div>
 </Transition>

 <div
 v-if="actionError"
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
 {{ actionError }}
 </div>

 <!-- Empty -->
 <div
 v-if="
 localImages.length === 0
 "
 class="
 flex
 min-h-[130px]
 items-center
 justify-center

 rounded-[14px]

 bg-gray-950/[0.025]

 px-5
 py-7

 text-center

 dark:bg-white/[0.035]
 "
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
 class="h-[18px] w-[18px]"
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

 <circle
 cx="7"
 cy="8"
 r="1.2"
 stroke="currentColor"
 stroke-width="1.3"
 />

 <path
 d="M5 14L9 10.5L11.5 12.5L14 10L16 12"
 stroke="currentColor"
 stroke-width="1.3"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 </svg>
 </div>

 <p
 class="
 mt-3

 text-[12px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 No existing images
 </p>

 <p
 class="
 mt-1

 text-[12px]
 text-gray-400

 dark:text-gray-600
 "
 >
 Add a new image below.
 </p>
 </div>
 </div>

 <!-- Images -->
 <TransitionGroup
 v-else
 name="product-image-list"
 tag="div"
 class="
 relative

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
 ) in localImages"
 :key="image.id"
 class="
 group

 min-w-0
 overflow-hidden

 rounded-[14px]

 bg-gray-950/[0.025]

 transition
 duration-150

 dark:bg-white/[0.035]
 "
 :class="[
 draggingId
 === image.id
 ? `
 scale-[0.985]
 opacity-40
 `
 : '',

 dragOverId
 === image.id
 && draggingId
 !== image.id
 ? `
 ring-2
 ring-gray-950/15

 dark:ring-white/15
 `
 : '',
 ]"
 @dragenter.prevent="
 onDragEnter(image)
 "
 @dragover.prevent
 @drop.prevent="
 onDrop(
 $event,
 image,
 )
 "
 >
 <!-- Image -->
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
 :src="imageUrl(image)"
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

 <!-- Subtle gradient -->
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

 <!-- Primary indicator -->
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

 <!-- Drag -->
 <button
 type="button"
 title="Drag to reorder"
 aria-label="Drag to reorder"
 :draggable="!saving"
 class="
 absolute
 right-2.5
 top-2.5

 flex
 h-8
 w-8
 cursor-grab
 items-center
 justify-center

 rounded-[9px]

 bg-black/40

 text-[13px]
 tracking-[-3px]
 text-white/80

 backdrop-blur-md

 transition

 hover:bg-black/55
 hover:text-white

 active:cursor-grabbing
 active:scale-95
 "
 @dragstart="
 onDragStart(
 $event,
 image,
 )
 "
 @dragend="onDragEnd"
 >
 ⋮⋮
 </button>

 <!-- Crop shortcut -->
 <button
 type="button"
 class="
 absolute
 bottom-2.5
 left-2.5

 flex
 h-8
 items-center
 gap-1.5

 rounded-[9px]

 bg-white/90

 px-2.5

 text-[12px]
 font-medium
 text-gray-700

 opacity-0

 backdrop-blur-md

 transition

 hover:bg-white

 disabled:pointer-events-none
 disabled:opacity-50

 group-hover:opacity-100

 dark:bg-black/60
 dark:text-gray-200
 dark:hover:bg-black/75
 "
 :disabled="
 saving
 || preparingCrop
 === image.id
 "
 @click="
 openEditCrop(image)
 "
 >
 <span
 v-if="
 preparingCrop
 === image.id
 "
 class="
 h-3
 w-3

 animate-spin

 rounded-full

 border-2
 border-current/20
 border-t-current
 "
 />

 {{
 preparingCrop
 === image.id
 ? 'Opening…'
 : 'Crop'
 }}
 </button>
 </div>

 <!-- Details -->
 <div
 class="
 space-y-2.5

 p-3
 "
 >
 <!-- Alt -->
 <AppInput
 v-model="
 image.alt_text
 "
 placeholder="Alt text"
 >
 <template #suffix>
 <button
 type="button"
 title="Save alt text"
 class="
 rounded-[6px]

 px-1.5
 py-1

 text-[12px]
 font-medium
 text-gray-400

 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-700

 disabled:pointer-events-none
 disabled:opacity-40

 dark:text-gray-600
 dark:hover:bg-white/[0.07]
 dark:hover:text-gray-300
 "
 :disabled="saving"
 @click="
 saveImageDetails(
 image,
 )
 "
 >
 Save
 </button>
 </template>
 </AppInput>

 <!-- Compact actions -->
 <div
 class="
 flex
 items-center
 gap-1
 "
 >
 <!-- Single-selection style -->
 <button
 type="button"
 class="
 flex
 h-8
 min-w-0
 flex-1
 items-center
 justify-center
 gap-1.5

 rounded-[8px]

 px-2

 text-[12px]
 font-medium

 transition

 disabled:pointer-events-none
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
 saving
 || image.is_primary
 "
 @click="
 setPrimary(image)
 "
 >
 <span
 class="
 h-1.5
 w-1.5
 shrink-0
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
 ? 'Primary'
 : 'Make primary'
 }}
 </button>

 <button
 type="button"
 class="
 flex
 h-8
 items-center
 justify-center

 rounded-[8px]

 px-2.5

 text-[12px]
 font-medium
 text-gray-500

 transition

 hover:bg-gray-950/[0.045]
 hover:text-gray-800

 disabled:pointer-events-none
 disabled:opacity-40

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-gray-200
 "
 :disabled="
 saving
 || preparingCrop
 === image.id
 "
 @click="
 openEditCrop(image)
 "
 >
 Edit
 </button>

 <AppActionMenu>
 <template
 #default="{ close }"
 >
 <AppActionMenuItem
 @click="
 openReplace(image);
 close()
 "
 >
 Replace image
 </AppActionMenuItem>

 <AppActionMenuItem
 @click="
 saveImageDetails(image);
 close()
 "
 >
 Save image details
 </AppActionMenuItem>

 <AppActionMenuItem
 danger
 @click="
 askDelete(image);
 close()
 "
 >
 Delete image
 </AppActionMenuItem>
 </template>
 </AppActionMenu>
 </div>
 </div>
 </article>
 </TransitionGroup>

 <input
 ref="replaceInput"
 type="file"
 accept="
 image/jpeg,
 image/png,
 image/webp
 "
 class="hidden"
 @change="
 onReplaceFileChange
 "
 >

 <ProductImageCropModal
 :open="cropOpen"
 :src="cropSource"
 :filename="cropFilename"
 background-mode="white"
 @close="closeCropper"
 @cropped="
 replaceWithCropped
 "
 />

 <AppConfirmModal
 :open="deleteOpen"
 title="Delete product image?"
 message="This will permanently delete the image from the product and Cloudinary."
 confirm-label="Delete image"
 :loading="deleting"
 :error="deleteError"
 @close="
 deleteOpen = false
 "
 @confirm="confirmDelete"
 />
 </section>
</template>

<style scoped>
.product-image-list-move,
.product-image-list-enter-active,
.product-image-list-leave-active {
 transition:
 transform 180ms ease,
 opacity 150ms ease;
}

.product-image-list-enter-from,
.product-image-list-leave-to {
 opacity: 0;
 transform: scale(0.97);
}

.product-image-list-leave-active {
 position: absolute;
}
</style>