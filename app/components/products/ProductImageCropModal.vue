<script setup lang="ts">
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

type BackgroundMode = 'white' | 'transparent'

export type CropMeta = {
 ratio_key: string
 aspect_ratio: string
 width: number
 height: number
 background_mode: BackgroundMode
}

const props = withDefaults(defineProps<{
 open: boolean
 src: string
 filename: string
 backgroundMode?: BackgroundMode
 allowOriginal?: boolean
}>(), {
 backgroundMode: 'white',
 allowOriginal: false,
})

const emit = defineEmits<{
 close: []
 'use-original': []
 cropped: [file: File, previewUrl: string, meta: CropMeta]
}>()

const cropper = ref<any>(null)
const processing = ref(false)
const error = ref('')

const ratioKey = ref('4:5')
const customWidth = ref(3200)
const customHeight = ref(4000)

const JPEG_QUALITY = 0.98
const MAX_LONG_EDGE = 4000

const ratioOptions = [
 { key: '4:5', label: '4:5 Product', width: 3200, height: 4000, aspect: 4 / 5 },
 { key: '1:1', label: '1:1 Square', width: 3200, height: 3200, aspect: 1 },
 { key: '3:4', label: '3:4 Gallery', width: 3000, height: 4000, aspect: 3 / 4 },
 { key: '16:9', label: '16:9 Banner', width: 3840, height: 2160, aspect: 16 / 9 },
 { key: '9:16', label: '9:16 Story', width: 2160, height: 3840, aspect: 9 / 16 },
 { key: 'free', label: 'Free crop', width: 3200, height: 4000, aspect: null },
]

const selectedRatio = computed(() => {
 return ratioOptions.find((item) => item.key === ratioKey.value) || ratioOptions[0]
})

const stencilProps = computed(() => {
 if (!selectedRatio.value.aspect) return {}

 return {
 aspectRatio: selectedRatio.value.aspect,
 }
})

const outputWidth = computed(() => Math.max(100, Number(customWidth.value || selectedRatio.value.width)))
const outputHeight = computed(() => Math.max(100, Number(customHeight.value || selectedRatio.value.height)))

const outputMime = computed(() => {
 return props.backgroundMode === 'transparent' ? 'image/png' : 'image/jpeg'
})

const outputExtension = computed(() => {
 return props.backgroundMode === 'transparent' ? 'png' : 'jpg'
})

watch(ratioKey, () => {
 customWidth.value = selectedRatio.value.width
 customHeight.value = selectedRatio.value.height
})

watch(
 () => props.open,
 (open) => {
 if (!open) return

 ratioKey.value = '4:5'
 customWidth.value = 3200
 customHeight.value = 4000
 error.value = ''
 },
)

function safeFilename(filename: string) {
 const base = filename
 .replace(/\.[^/.]+$/, '')
 .toLowerCase()
 .replace(/[^a-z0-9]+/g, '-')
 .replace(/(^-|-$)/g, '')

 return `${base || 'product-image'}-${Date.now()}.${outputExtension.value}`
}

function canvasToBlob(canvas: HTMLCanvasElement) {
 return new Promise<Blob>((resolve, reject) => {
 canvas.toBlob(
 (blob) => {
 if (!blob) {
 reject(new Error('Could not create cropped image.'))
 return
 }

 resolve(blob)
 },
 outputMime.value,
 props.backgroundMode === 'transparent' ? undefined : JPEG_QUALITY,
 )
 })
}

async function confirmCrop() {
 error.value = ''
 processing.value = true

 try {
 const result = cropper.value?.getResult()
 const sourceCanvas = result?.canvas as HTMLCanvasElement | undefined

 if (!sourceCanvas) {
 error.value = 'Please adjust the crop and try again.'
 return
 }

 // Never upscale a crop beyond the pixels actually available from the source.
 // For free crop, preserve its natural aspect ratio and only cap the long edge.
 let finalWidth = outputWidth.value
 let finalHeight = outputHeight.value

 if (ratioKey.value === 'free') {
 const scale = Math.min(
 1,
 MAX_LONG_EDGE / Math.max(sourceCanvas.width, sourceCanvas.height),
 )

 finalWidth = Math.max(1, Math.round(sourceCanvas.width * scale))
 finalHeight = Math.max(1, Math.round(sourceCanvas.height * scale))
 } else {
 const scale = Math.min(
 1,
 outputWidth.value / sourceCanvas.width,
 outputHeight.value / sourceCanvas.height,
 )

 finalWidth = Math.max(1, Math.round(sourceCanvas.width * scale))
 finalHeight = Math.max(1, Math.round(sourceCanvas.height * scale))
 }

 const outputCanvas = document.createElement('canvas')
 outputCanvas.width = finalWidth
 outputCanvas.height = finalHeight

 const ctx = outputCanvas.getContext('2d')

 if (!ctx) {
 error.value = 'Could not process this image.'
 return
 }

 if (props.backgroundMode === 'white') {
 ctx.fillStyle = '#ffffff'
 ctx.fillRect(0, 0, finalWidth, finalHeight)
 } else {
 ctx.clearRect(0, 0, finalWidth, finalHeight)
 }

 ctx.imageSmoothingEnabled = true
 ctx.imageSmoothingQuality = 'high'
 ctx.drawImage(sourceCanvas, 0, 0, finalWidth, finalHeight)

 const blob = await canvasToBlob(outputCanvas)
 const file = new File([blob], safeFilename(props.filename), {
 type: outputMime.value,
 lastModified: Date.now(),
 })

 const previewUrl = URL.createObjectURL(blob)

 emit('cropped', file, previewUrl, {
 ratio_key: ratioKey.value,
 aspect_ratio: ratioKey.value === 'free' ? 'free' : ratioKey.value,
 width: finalWidth,
 height: finalHeight,
 background_mode: props.backgroundMode,
 })
 } catch {
 error.value = 'Could not crop image. Please choose another image.'
 } finally {
 processing.value = false
 }
}
</script>

<template>
 <AppModal
 :open="open"
 title="Crop product image"
 description="Adjust framing and choose the final output size."
 max-width="max-w-[1180px]"
 @close="emit('close')"
 >
 <!-- No max-height / overflow here -->
 <div
 class="
 grid
 gap-4

 p-4

 lg:grid-cols-[minmax(0,1fr)_300px]

 sm:p-5
 "
 >
 <!-- Crop stage -->
 <div
 class="
 min-w-0
 "
 >
 <div
 class="
 flex

 h-[52vh]
 min-h-[340px]
 max-h-[620px]

 min-w-0
 items-center
 justify-center

 overflow-hidden

 rounded-[14px]

 bg-gray-950
 "
 >
 <ClientOnly>
 <Cropper
 ref="cropper"
 :src="src"
 class="
 h-full
 w-full
 min-w-0
 "
 :stencil-props="
 stencilProps
 "
 :canvas="true"
 crossorigin="anonymous"
 image-restriction="stencil"
 />
 </ClientOnly>
 </div>
 </div>

 <!-- Settings -->
 <aside
 class="
 min-w-0
 "
 >
 <div>
 <h3
 class="
 text-[13px]
 font-semibold
 text-gray-900

 dark:text-gray-100
 "
 >
 Output
 </h3>

 <p
 class="
 mt-1

 text-[11px]
 leading-4
 text-gray-400

 dark:text-gray-600
 "
 >
 Choose a preset or
 customize the final size.
 </p>
 </div>

 <!-- Single-select presets -->
 <div
 class="
 mt-4

 grid
 grid-cols-2
 gap-1.5

 lg:grid-cols-1
 "
 >
 <button
 v-for="option in ratioOptions"
 :key="option.key"
 type="button"
 class="
 rounded-[9px]

 px-3
 py-2.5

 text-left

 transition
 "
 :class="
 ratioKey === option.key
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
 truncate

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
 mt-4

 grid
 grid-cols-2
 gap-2
 "
 >
 <AppInput
 v-model="
 customWidth
 "
 label="Width"
 type="number"
 />

 <AppInput
 v-model="
 customHeight
 "
 label="Height"
 type="number"
 />
 </div>

 <div
 class="
 mt-4

 rounded-[10px]

 bg-gray-950/[0.035]

 p-3

 text-[11px]
 leading-5
 text-gray-500

 dark:bg-white/[0.055]
 dark:text-gray-500
 "
 >
 <div
 class="
 flex
 justify-between
 gap-3
 "
 >
 <span>
 Crop
 </span>

 <span
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{
 ratioKey === 'free'
 ? 'Free'
 : ratioKey
 }}
 </span>
 </div>

 <div
 class="
 mt-1
 flex
 justify-between
 gap-3
 "
 >
 <span>
 Output
 </span>

 <span
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{ outputWidth }}
 ×
 {{ outputHeight }}
 </span>
 </div>

 <div
 class="
 mt-1
 flex
 justify-between
 gap-3
 "
 >
 <span>
 Format
 </span>

 <span
 class="
 font-medium
 text-gray-700

 dark:text-gray-300
 "
 >
 {{
 backgroundMode
 === 'transparent'
 ? 'Transparent PNG'
 : 'White JPG'
 }}
 </span>
 </div>
 </div>

 <p
 class="mt-3 text-[11px] leading-4 text-gray-400 dark:text-gray-600"
 >
 Crops are exported at high quality and are never enlarged beyond the source image.
 </p>

 <div
 v-if="error"
 class="
 mt-4

 rounded-[10px]

 bg-red-500/[0.07]

 px-3
 py-2.5

 text-[12px]
 text-red-600

 dark:bg-red-500/10
 dark:text-red-400
 "
 >
 {{ error }}
 </div>
 </aside>
 </div>

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
 v-if="allowOriginal"
 type="button"
 variant="secondary"
 :disabled="processing"
 @click="emit('use-original')"
 >
 Use original quality
 </AppButton>

 <AppButton
 type="button"
 variant="ghost"
 :disabled="processing"
 @click="emit('close')"
 >
 Cancel
 </AppButton>

 <AppButton
 type="button"
 :loading="processing"
 @click="confirmCrop"
 >
 {{
 processing
 ? 'Preparing…'
 : 'Use image'
 }}
 </AppButton>
 </div>
 </template>
 </AppModal>
</template>