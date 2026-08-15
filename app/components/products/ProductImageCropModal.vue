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
}>(), {
 backgroundMode: 'white',
})

const emit = defineEmits<{
 close: []
 cropped: [file: File, previewUrl: string, meta: CropMeta]
}>()

const cropper = ref<any>(null)
const processing = ref(false)
const error = ref('')

const ratioKey = ref('4:5')
const customWidth = ref(1200)
const customHeight = ref(1500)

const ratioOptions = [
 { key: '4:5', label: '4:5 Product', width: 1200, height: 1500, aspect: 4 / 5 },
 { key: '1:1', label: '1:1 Square', width: 1200, height: 1200, aspect: 1 },
 { key: '3:4', label: '3:4 Gallery', width: 1200, height: 1600, aspect: 3 / 4 },
 { key: '16:9', label: '16:9 Banner', width: 1600, height: 900, aspect: 16 / 9 },
 { key: '9:16', label: '9:16 Story', width: 1080, height: 1920, aspect: 9 / 16 },
 { key: 'free', label: 'Free crop', width: 1200, height: 1500, aspect: null },
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
 customWidth.value = 1200
 customHeight.value = 1500
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
 props.backgroundMode === 'transparent' ? undefined : 0.92,
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

 const outputCanvas = document.createElement('canvas')
 outputCanvas.width = outputWidth.value
 outputCanvas.height = outputHeight.value

 const ctx = outputCanvas.getContext('2d')

 if (!ctx) {
 error.value = 'Could not process this image.'
 return
 }

 if (props.backgroundMode === 'white') {
 ctx.fillStyle = '#ffffff'
 ctx.fillRect(0, 0, outputWidth.value, outputHeight.value)
 } else {
 ctx.clearRect(0, 0, outputWidth.value, outputHeight.value)
 }

 ctx.imageSmoothingEnabled = true
 ctx.imageSmoothingQuality = 'high'
 ctx.drawImage(sourceCanvas, 0, 0, outputWidth.value, outputHeight.value)

 const blob = await canvasToBlob(outputCanvas)
 const file = new File([blob], safeFilename(props.filename), {
 type: outputMime.value,
 lastModified: Date.now(),
 })

 const previewUrl = URL.createObjectURL(blob)

 emit('cropped', file, previewUrl, {
 ratio_key: ratioKey.value,
 aspect_ratio: ratioKey.value === 'free' ? 'free' : ratioKey.value,
 width: outputWidth.value,
 height: outputHeight.value,
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