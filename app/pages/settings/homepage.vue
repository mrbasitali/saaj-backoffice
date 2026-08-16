<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Homepage',
})

type HomepageSettings = {
  hero_enabled: boolean
  hero_mode: 'single' | 'slider'
  hero_autoplay: boolean
  hero_autoplay_delay: number
  hero_pause_on_hover: boolean
  hero_show_arrows: boolean
  hero_show_dots: boolean
}

type HeroSlide = {
  id: number
  media_type: 'image' | 'video'
  desktop_media_url: string
  mobile_media_url: string | null
  poster_url: string | null
  eyebrow: string | null
  title: string | null
  description: string | null
  alt_text: string | null
  primary_cta_label: string | null
  primary_cta_url: string | null
  secondary_cta_label: string | null
  secondary_cta_url: string | null
  text_position: 'bottom-left' | 'center-left' | 'center' | 'bottom-center'
  text_theme: 'light' | 'dark'
  overlay_strength: number
  is_active: boolean
  sort_order: number
}

type HomepageResponse = {
  data: {
    settings: HomepageSettings
    slides: HeroSlide[]
  }
}

const { $api } = useNuxtApp()

const { data, refresh, status } = await useAsyncData('admin-homepage', () =>
  $api<HomepageResponse>('/admin/homepage'),
)

const settings = reactive<HomepageSettings>({
  hero_enabled: true,
  hero_mode: 'slider',
  hero_autoplay: true,
  hero_autoplay_delay: 6000,
  hero_pause_on_hover: true,
  hero_show_arrows: true,
  hero_show_dots: true,
})

watchEffect(() => {
  if (data.value?.data.settings) Object.assign(settings, data.value.data.settings)
})

const slides = computed(() => data.value?.data.slides ?? [])
const activeSlides = computed(() => slides.value.filter(slide => slide.is_active).length)

const settingsSaving = ref(false)
const settingsError = ref('')
const settingsSaved = ref(false)

async function saveSettings() {
  settingsSaving.value = true
  settingsError.value = ''
  settingsSaved.value = false

  try {
    await $api('/admin/homepage/settings', {
      method: 'PUT',
      body: {
        ...settings,
        hero_autoplay_delay: Number(settings.hero_autoplay_delay),
      },
    })

    await refresh()
    settingsSaved.value = true
  } catch (error: any) {
    settingsError.value = extractApiErrorMessage(error, 'Could not save homepage settings.')
  } finally {
    settingsSaving.value = false
  }
}

const editorOpen = ref(false)
const editingId = ref<number | null>(null)
const slideSaving = ref(false)
const slideError = ref('')

const slideForm = reactive({
  media_type: 'image' as 'image' | 'video',
  eyebrow: '',
  title: '',
  description: '',
  alt_text: '',
  primary_cta_label: '',
  primary_cta_url: '',
  secondary_cta_label: '',
  secondary_cta_url: '',
  text_position: 'bottom-left' as HeroSlide['text_position'],
  text_theme: 'light' as HeroSlide['text_theme'],
  overlay_strength: 35,
  is_active: true,
})

const desktopFile = ref<File | null>(null)
const mobileFile = ref<File | null>(null)
const posterFile = ref<File | null>(null)
const desktopExisting = ref<string | null>(null)
const mobileExisting = ref<string | null>(null)
const posterExisting = ref<string | null>(null)
const desktopPreview = ref<string | null>(null)
const mobilePreview = ref<string | null>(null)
const posterPreview = ref<string | null>(null)
const clearMobile = ref(false)
const clearPoster = ref(false)

function revokePreview(value: string | null) {
  if (value?.startsWith('blob:')) URL.revokeObjectURL(value)
}

function clearEditorPreviews() {
  revokePreview(desktopPreview.value)
  revokePreview(mobilePreview.value)
  revokePreview(posterPreview.value)
  desktopPreview.value = null
  mobilePreview.value = null
  posterPreview.value = null
}

onBeforeUnmount(clearEditorPreviews)

function resetEditor() {
  clearEditorPreviews()
  editingId.value = null
  slideError.value = ''
  Object.assign(slideForm, {
    media_type: 'image',
    eyebrow: '',
    title: '',
    description: '',
    alt_text: '',
    primary_cta_label: '',
    primary_cta_url: '',
    secondary_cta_label: '',
    secondary_cta_url: '',
    text_position: 'bottom-left',
    text_theme: 'light',
    overlay_strength: 35,
    is_active: true,
  })
  desktopFile.value = null
  mobileFile.value = null
  posterFile.value = null
  desktopExisting.value = null
  mobileExisting.value = null
  posterExisting.value = null
  clearMobile.value = false
  clearPoster.value = false
}

function openCreate() {
  resetEditor()
  editorOpen.value = true
}

function openEdit(slide: HeroSlide) {
  resetEditor()
  editingId.value = slide.id
  Object.assign(slideForm, {
    media_type: slide.media_type,
    eyebrow: slide.eyebrow ?? '',
    title: slide.title ?? '',
    description: slide.description ?? '',
    alt_text: slide.alt_text ?? '',
    primary_cta_label: slide.primary_cta_label ?? '',
    primary_cta_url: slide.primary_cta_url ?? '',
    secondary_cta_label: slide.secondary_cta_label ?? '',
    secondary_cta_url: slide.secondary_cta_url ?? '',
    text_position: slide.text_position,
    text_theme: slide.text_theme,
    overlay_strength: slide.overlay_strength,
    is_active: slide.is_active,
  })
  desktopExisting.value = slide.desktop_media_url
  mobileExisting.value = slide.mobile_media_url
  posterExisting.value = slide.poster_url
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  resetEditor()
}

function onMediaFile(kind: 'desktop' | 'mobile' | 'poster', event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  const fileRef = kind === 'desktop' ? desktopFile : kind === 'mobile' ? mobileFile : posterFile
  const previewRef = kind === 'desktop' ? desktopPreview : kind === 'mobile' ? mobilePreview : posterPreview

  revokePreview(previewRef.value)
  fileRef.value = file
  previewRef.value = file ? URL.createObjectURL(file) : null

  if (kind === 'mobile' && file) clearMobile.value = false
  if (kind === 'poster' && file) clearPoster.value = false
}

function removeOptionalMedia(kind: 'mobile' | 'poster') {
  if (kind === 'mobile') {
    revokePreview(mobilePreview.value)
    mobilePreview.value = null
    mobileFile.value = null
    mobileExisting.value = null
    clearMobile.value = true
  } else {
    revokePreview(posterPreview.value)
    posterPreview.value = null
    posterFile.value = null
    posterExisting.value = null
    clearPoster.value = true
  }
}

const desktopSource = computed(() => desktopPreview.value ?? desktopExisting.value)
const mobileSource = computed(() => mobilePreview.value ?? mobileExisting.value)
const posterSource = computed(() => posterPreview.value ?? posterExisting.value)

const mediaAccept = computed(() =>
  slideForm.media_type === 'video'
    ? 'video/mp4,video/webm,video/quicktime,.mov'
    : 'image/jpeg,image/png,image/webp',
)

watch(() => slideForm.media_type, () => {
  if (!editingId.value) {
    revokePreview(desktopPreview.value)
    revokePreview(mobilePreview.value)
    desktopPreview.value = null
    mobilePreview.value = null
    desktopFile.value = null
    mobileFile.value = null
  }
})

function appendText(body: FormData, key: string, value: string | number | boolean) {
  if (typeof value === 'boolean') {
    body.append(key, value ? '1' : '0')
    return
  }

  body.append(key, String(value ?? ''))
}

async function saveSlide() {
  if (!editingId.value && !desktopFile.value) {
    slideError.value = 'Desktop media is required for a new slide.'
    return
  }

  slideSaving.value = true
  slideError.value = ''

  try {
    const body = new FormData()

    if (editingId.value) body.append('_method', 'PUT')

    for (const [key, value] of Object.entries(slideForm)) {
      appendText(body, key, value)
    }

    if (desktopFile.value) body.append('desktop_media', desktopFile.value)
    if (mobileFile.value) body.append('mobile_media', mobileFile.value)
    if (posterFile.value) body.append('poster_image', posterFile.value)
    if (clearMobile.value) body.append('clear_mobile_media', '1')
    if (clearPoster.value) body.append('clear_poster', '1')

    await $api(editingId.value ? `/admin/homepage/slides/${editingId.value}` : '/admin/homepage/slides', {
      method: 'POST',
      body,
    })

    await refresh()
    closeEditor()
  } catch (error: any) {
    slideError.value = extractApiErrorMessage(error, 'Could not save this hero slide.')
  } finally {
    slideSaving.value = false
  }
}

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const slideToDelete = ref<HeroSlide | null>(null)

function askDelete(slide: HeroSlide) {
  slideToDelete.value = slide
  deleteError.value = ''
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!slideToDelete.value) return

  deleting.value = true
  deleteError.value = ''

  try {
    await $api(`/admin/homepage/slides/${slideToDelete.value.id}`, { method: 'DELETE' })
    await refresh()
    deleteOpen.value = false
    slideToDelete.value = null
  } catch (error: any) {
    deleteError.value = extractApiErrorMessage(error, 'Could not delete this hero slide.')
  } finally {
    deleting.value = false
  }
}

const reordering = ref<number | null>(null)

async function moveSlide(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= slides.value.length) return

  const ids = slides.value.map(slide => slide.id)
  ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]

  reordering.value = slides.value[index]?.id ?? null

  try {
    await $api('/admin/homepage/slides/reorder', {
      method: 'PUT',
      body: { ids },
    })
    await refresh()
  } finally {
    reordering.value = null
  }
}

function shortMediaLabel(slide: HeroSlide) {
  return slide.media_type === 'video' ? 'Video' : 'Image'
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <AppPageHeader
      eyebrow="Storefront"
      title="Homepage"
      description="Control the customer-facing homepage hero, media, messaging, and slider behaviour without changing storefront code."
    >
      <template #actions>
        <AppButton @click="openCreate">
          Add hero slide
        </AppButton>
      </template>
    </AppPageHeader>

    <div v-if="status === 'pending'" class="mt-6 space-y-4">
      <AppSkeleton class="h-44" />
      <AppSkeleton class="h-72" />
    </div>

    <div v-else class="mt-6 space-y-6">
      <AppCard class="p-5 sm:p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-2xl">
            <div class="flex items-center gap-2">
              <p class="text-sm font-semibold text-gray-950 dark:text-white">Homepage hero</p>
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                :class="settings.hero_enabled ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-gray-950/[0.05] text-gray-400 dark:bg-white/[0.06] dark:text-gray-500'"
              >
                {{ settings.hero_enabled ? 'Live' : 'Off' }}
              </span>
            </div>
            <p class="mt-1 text-[13px] leading-5 text-gray-400 dark:text-gray-500">
              The hero can be a single image/video or a controlled slider. Only active slides are sent to the storefront.
            </p>
          </div>

          <AppToggle
            v-model="settings.hero_enabled"
            label="Show homepage hero"
            description="Turn the complete hero section on or off."
            class="max-w-sm"
          />
        </div>

        <div class="mt-6 grid gap-5 md:grid-cols-2">
          <AppSelect
            v-model="settings.hero_mode"
            label="Display mode"
            :options="[
              { label: 'Slider', value: 'slider', hint: 'Rotate through active slides' },
              { label: 'Single slide', value: 'single', hint: 'Use the first active slide only' },
            ]"
          />

          <AppInput
            v-model="settings.hero_autoplay_delay"
            label="Autoplay delay (milliseconds)"
            type="number"
            :disabled="settings.hero_mode !== 'slider' || !settings.hero_autoplay"
          />
        </div>

        <div class="mt-6 grid gap-x-8 gap-y-5 md:grid-cols-2">
          <AppToggle
            v-model="settings.hero_autoplay"
            label="Autoplay slider"
            description="Automatically move to the next slide."
            :disabled="settings.hero_mode !== 'slider'"
          />
          <AppToggle
            v-model="settings.hero_pause_on_hover"
            label="Pause on hover"
            description="Useful when customers want more time to read a slide."
            :disabled="settings.hero_mode !== 'slider' || !settings.hero_autoplay"
          />
          <AppToggle
            v-model="settings.hero_show_arrows"
            label="Show navigation arrows"
            description="Desktop arrow controls for multi-slide heroes."
            :disabled="settings.hero_mode !== 'slider'"
          />
          <AppToggle
            v-model="settings.hero_show_dots"
            label="Show slide progress"
            description="Minimal progress markers at the bottom of the hero."
            :disabled="settings.hero_mode !== 'slider'"
          />
        </div>

        <div v-if="settingsError" class="mt-5 rounded-[10px] bg-red-500/[0.07] px-3 py-2.5 text-[12px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {{ settingsError }}
        </div>

        <div class="mt-6 flex items-center justify-between gap-4 border-t border-gray-950/[0.06] pt-5 dark:border-white/[0.06]">
          <p class="text-[12px] text-gray-400 dark:text-gray-500">
            {{ activeSlides }} active {{ activeSlides === 1 ? 'slide' : 'slides' }} · {{ slides.length }} total
          </p>
          <div class="flex items-center gap-3">
            <span v-if="settingsSaved" class="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">Saved</span>
            <AppButton :loading="settingsSaving" @click="saveSettings">Save hero settings</AppButton>
          </div>
        </div>
      </AppCard>

      <AppCard class="overflow-hidden">
        <div class="flex items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div>
            <p class="text-sm font-semibold text-gray-950 dark:text-white">Hero slides</p>
            <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
              Use a dedicated mobile crop when needed. Videos are autoplayed muted and inline on the storefront.
            </p>
          </div>
          <AppButton variant="secondary" @click="openCreate">Add slide</AppButton>
        </div>

        <div v-if="!slides.length" class="border-t border-gray-950/[0.06] px-5 py-14 text-center dark:border-white/[0.06]">
          <p class="text-[13px] font-medium text-gray-700 dark:text-gray-300">No hero slides yet</p>
          <p class="mx-auto mt-1 max-w-md text-[12px] leading-5 text-gray-400 dark:text-gray-500">
            Add an image or video slide. Until then, the storefront can continue using its safe visual fallback.
          </p>
          <AppButton class="mt-4" @click="openCreate">Create first slide</AppButton>
        </div>

        <div v-else class="divide-y divide-gray-950/[0.06] border-t border-gray-950/[0.06] dark:divide-white/[0.06] dark:border-white/[0.06]">
          <article
            v-for="(slide, index) in slides"
            :key="slide.id"
            class="grid gap-4 p-4 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:items-center sm:p-5"
          >
            <div class="relative aspect-[16/10] overflow-hidden rounded-[12px] bg-gray-950/[0.04] dark:bg-white/[0.05]">
              <video
                v-if="slide.media_type === 'video'"
                :src="slide.desktop_media_url"
                :poster="slide.poster_url || undefined"
                muted
                playsinline
                preload="metadata"
                class="h-full w-full object-cover"
              />
              <img
                v-else
                :src="slide.desktop_media_url"
                :alt="slide.alt_text || slide.title || 'Homepage hero slide'"
                class="h-full w-full object-cover"
              >
              <span class="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur">
                {{ shortMediaLabel(slide) }}
              </span>
            </div>

            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate text-[14px] font-semibold text-gray-950 dark:text-white">
                  {{ slide.title || 'Untitled hero slide' }}
                </p>
                <span
                  class="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
                  :class="slide.is_active ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-gray-950/[0.05] text-gray-400 dark:bg-white/[0.06] dark:text-gray-500'"
                >
                  {{ slide.is_active ? 'Active' : 'Hidden' }}
                </span>
              </div>
              <p v-if="slide.eyebrow" class="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                {{ slide.eyebrow }}
              </p>
              <p class="mt-2 line-clamp-2 max-w-2xl text-[12px] leading-5 text-gray-400 dark:text-gray-500">
                {{ slide.description || 'No supporting copy.' }}
              </p>
              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-600">
                <span>{{ slide.text_position.replace('-', ' ') }}</span>
                <span>{{ slide.text_theme }} text</span>
                <span>{{ slide.overlay_strength }}% overlay</span>
                <span v-if="slide.mobile_media_url">mobile media</span>
              </div>
            </div>

            <div class="flex items-center justify-end gap-1 sm:flex-col">
              <div class="flex items-center gap-1">
                <AppButton
                  variant="ghost"
                  size="sm"
                  :disabled="index === 0 || reordering === slide.id"
                  @click="moveSlide(index, -1)"
                >
                  ↑
                </AppButton>
                <AppButton
                  variant="ghost"
                  size="sm"
                  :disabled="index === slides.length - 1 || reordering === slide.id"
                  @click="moveSlide(index, 1)"
                >
                  ↓
                </AppButton>
              </div>
              <div class="flex items-center gap-1">
                <AppButton variant="ghost" size="sm" @click="openEdit(slide)">Edit</AppButton>
                <AppButton variant="ghost" size="sm" @click="askDelete(slide)">Delete</AppButton>
              </div>
            </div>
          </article>
        </div>
      </AppCard>
    </div>

    <AppModal
      :open="editorOpen"
      :title="editingId ? 'Edit hero slide' : 'Add hero slide'"
      description="Media is the focus. Keep copy concise and let the campaign image or video do most of the work."
      max-width="max-w-5xl"
      @close="closeEditor"
    >
      <form class="grid gap-6 p-4 sm:p-5 lg:grid-cols-[1.05fr_0.95fr]" @submit.prevent="saveSlide">
        <div class="space-y-5">
          <AppSelect
            v-model="slideForm.media_type"
            label="Media type"
            :options="[
              { label: 'Image', value: 'image' },
              { label: 'Video', value: 'video' },
            ]"
          />

          <div>
            <div class="mb-2 flex items-center justify-between gap-3">
              <div>
                <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">Desktop media</p>
                <p class="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                  {{ slideForm.media_type === 'video' ? 'MP4/WebM/MOV · up to 50 MB' : 'JPG/PNG/WebP · landscape recommended' }}
                </p>
              </div>
              <label class="cursor-pointer text-[12px] font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 dark:text-gray-300">
                {{ desktopSource ? 'Replace' : 'Upload' }}
                <input type="file" :accept="mediaAccept" class="hidden" @change="onMediaFile('desktop', $event)">
              </label>
            </div>

            <div class="relative aspect-[16/10] overflow-hidden rounded-[14px] bg-gray-950/[0.04] dark:bg-white/[0.05]">
              <video
                v-if="desktopSource && slideForm.media_type === 'video'"
                :src="desktopSource"
                :poster="posterSource || undefined"
                muted
                controls
                playsinline
                class="h-full w-full object-cover"
              />
              <img
                v-else-if="desktopSource"
                :src="desktopSource"
                alt="Desktop hero preview"
                class="h-full w-full object-cover"
              >
              <div v-else class="flex h-full items-center justify-center text-center text-[12px] text-gray-400">
                Upload desktop {{ slideForm.media_type }}
              </div>
            </div>
          </div>

          <div>
            <div class="mb-2 flex items-center justify-between gap-3">
              <div>
                <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">Mobile media <span class="font-normal text-gray-400">(optional)</span></p>
                <p class="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">A portrait crop gives much better control on phones.</p>
              </div>
              <div class="flex items-center gap-3">
                <button v-if="mobileSource" type="button" class="text-[11px] font-medium text-red-600 dark:text-red-400" @click="removeOptionalMedia('mobile')">Remove</button>
                <label class="cursor-pointer text-[12px] font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 dark:text-gray-300">
                  {{ mobileSource ? 'Replace' : 'Upload' }}
                  <input type="file" :accept="mediaAccept" class="hidden" @change="onMediaFile('mobile', $event)">
                </label>
              </div>
            </div>

            <div class="relative aspect-[4/5] max-w-[260px] overflow-hidden rounded-[14px] bg-gray-950/[0.04] dark:bg-white/[0.05]">
              <video
                v-if="mobileSource && slideForm.media_type === 'video'"
                :src="mobileSource"
                :poster="posterSource || undefined"
                muted
                controls
                playsinline
                class="h-full w-full object-cover"
              />
              <img v-else-if="mobileSource" :src="mobileSource" alt="Mobile hero preview" class="h-full w-full object-cover">
              <div v-else class="flex h-full items-center justify-center px-4 text-center text-[11px] leading-5 text-gray-400">Desktop media will be cropped automatically when no mobile version is supplied.</div>
            </div>
          </div>

          <div v-if="slideForm.media_type === 'video'">
            <div class="mb-2 flex items-center justify-between gap-3">
              <div>
                <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">Video poster <span class="font-normal text-gray-400">(optional)</span></p>
                <p class="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">Displayed before the video is ready to play.</p>
              </div>
              <div class="flex items-center gap-3">
                <button v-if="posterSource" type="button" class="text-[11px] font-medium text-red-600 dark:text-red-400" @click="removeOptionalMedia('poster')">Remove</button>
                <label class="cursor-pointer text-[12px] font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 dark:text-gray-300">
                  {{ posterSource ? 'Replace' : 'Upload' }}
                  <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onMediaFile('poster', $event)">
                </label>
              </div>
            </div>
            <img v-if="posterSource" :src="posterSource" alt="Video poster preview" class="aspect-[16/9] w-full max-w-sm rounded-[12px] object-cover">
          </div>
        </div>

        <div class="space-y-5">
          <div class="grid gap-4 sm:grid-cols-2">
            <AppInput v-model="slideForm.eyebrow" label="Eyebrow" placeholder="The new edit" />
            <AppInput v-model="slideForm.alt_text" label="Media alt text" placeholder="Model wearing…" />
          </div>

          <AppInput v-model="slideForm.title" label="Headline" placeholder="Quiet detail. Strong presence." />
          <AppTextarea v-model="slideForm.description" label="Supporting text" :rows="3" placeholder="Short campaign copy…" />

          <div class="grid gap-4 sm:grid-cols-2">
            <AppInput v-model="slideForm.primary_cta_label" label="Primary button" placeholder="Shop the edit" />
            <AppInput v-model="slideForm.primary_cta_url" label="Primary destination" placeholder="/shop" />
            <AppInput v-model="slideForm.secondary_cta_label" label="Secondary button" placeholder="View all" />
            <AppInput v-model="slideForm.secondary_cta_url" label="Secondary destination" placeholder="/shop" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <AppSelect
              v-model="slideForm.text_position"
              label="Text position"
              :options="[
                { label: 'Bottom left', value: 'bottom-left' },
                { label: 'Center left', value: 'center-left' },
                { label: 'Centered', value: 'center' },
                { label: 'Bottom center', value: 'bottom-center' },
              ]"
            />
            <AppSelect
              v-model="slideForm.text_theme"
              label="Text colour"
              :options="[
                { label: 'Light', value: 'light', hint: 'For darker media' },
                { label: 'Dark', value: 'dark', hint: 'For lighter media' },
              ]"
            />
          </div>

          <div>
            <div class="mb-2 flex items-center justify-between">
              <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">Media overlay</p>
              <span class="text-[11px] font-medium text-gray-400">{{ slideForm.overlay_strength }}%</span>
            </div>
            <input
              v-model.number="slideForm.overlay_strength"
              type="range"
              min="0"
              max="80"
              step="5"
              class="w-full accent-gray-950 dark:accent-white"
            >
            <p class="mt-1 text-[11px] leading-5 text-gray-400 dark:text-gray-500">Use only enough overlay to keep text readable; lighter media usually needs more.</p>
          </div>

          <AppToggle
            v-model="slideForm.is_active"
            label="Slide active"
            description="Hidden slides stay saved in the backoffice but are not sent to customers."
          />

          <div v-if="slideError" class="rounded-[10px] bg-red-500/[0.07] px-3 py-2.5 text-[12px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {{ slideError }}
          </div>
        </div>
      </form>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <AppButton variant="ghost" :disabled="slideSaving" @click="closeEditor">Cancel</AppButton>
          <AppButton :loading="slideSaving" @click="saveSlide">{{ editingId ? 'Save slide' : 'Add slide' }}</AppButton>
        </div>
      </template>
    </AppModal>

    <AppConfirmModal
      :open="deleteOpen"
      title="Delete hero slide?"
      :message="`This will permanently remove ${slideToDelete?.title || 'this slide'} and its uploaded media.`"
      confirm-label="Delete slide"
      :loading="deleting"
      :error="deleteError"
      @close="deleteOpen = false"
      @confirm="confirmDelete"
    />
  </div>
</template>
