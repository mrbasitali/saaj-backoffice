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
  category_columns: number
  hero_title_size: number
  editorial_image_url: string | null
}

type HeroPanel = {
  image_url: string | null
  eyebrow?: string | null
  title?: string | null
  description?: string | null
  alt_text?: string | null
  cta_label?: string | null
  cta_url?: string | null
  text_theme?: 'light' | 'dark'
  text_position?: 'bottom-left' | 'center-left' | 'center' | 'bottom-center' | 'bottom-right' | 'center-right'
}

type HeroSlide = {
  id: number
  layout_type: 'single' | 'panels'
  media_type: 'image' | 'video'
  desktop_media_url: string | null
  mobile_media_url: string | null
  poster_url: string | null
  panels: HeroPanel[]
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

type HomepageProduct = {
  id: number
  name: string
  slug: string
  is_active: boolean
  published_at: string | null
  brand?: { name?: string | null } | null
  primary_image?: {
    image_url?: string | null
    optimized_urls?: { card?: string | null } | null
  } | null
  default_variant?: {
    price?: string | number | null
    sale_price?: string | number | null
  } | null
}

type HomepageProductSection = {
  id: number
  slot: 1 | 2
  is_enabled: boolean
  eyebrow: string
  title: string
  description: string
  cta_label: string
  cta_url: string
  layout: 'grid' | 'rail'
  tone: 'light' | 'soft' | 'dark'
  product_limit: number
  products: HomepageProduct[]
}

type HomepageCategory = {
  id: number
  name: string
  full_slug: string
  is_active: boolean
  image_url?: string | null
  banner_image_url?: string | null
  parent?: { name?: string | null } | null
}

type HomepageCategorySection = {
  id: number
  is_enabled: boolean
  eyebrow: string
  title: string
  description: string
  cta_label: string
  cta_url: string
  tone: 'light' | 'soft' | 'dark'
  columns: number
  categories: HomepageCategory[]
}

type HomepageSectionKey = 'brand_statement' | 'categories' | 'product_section_1' | 'editorial' | 'product_section_2' | 'values'

type HomepageSectionLayoutItem = {
  key: HomepageSectionKey
  enabled: boolean
}

type PanelDraft = {
  source_index: number | null
  existing_url: string | null
  file: File | null
  preview: string | null
  eyebrow: string
  title: string
  description: string
  alt_text: string
  cta_label: string
  cta_url: string
  text_theme: 'light' | 'dark'
  text_position: 'bottom-left' | 'center-left' | 'center' | 'bottom-center' | 'bottom-right' | 'center-right'
}

type HomepageResponse = {
  data: {
    settings: HomepageSettings
    slides: HeroSlide[]
    product_sections: HomepageProductSection[]
    category_section: HomepageCategorySection
    section_layout: HomepageSectionLayoutItem[]
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
  category_columns: 4,
  hero_title_size: 102,
  editorial_image_url: null,
})

watchEffect(() => {
  if (data.value?.data.settings) Object.assign(settings, data.value.data.settings)
})

const slides = computed(() => data.value?.data.slides ?? [])
const activeSlides = computed(() => slides.value.filter(slide => slide.is_active).length)

const sectionMeta: Record<HomepageSectionKey, { label: string; description: string }> = {
  brand_statement: { label: 'Brand statement', description: 'The wardrobe introduction directly beneath the hero.' },
  categories: { label: 'Shop the collections', description: 'Your curated category discovery cards.' },
  product_section_1: { label: 'Product edit 1', description: 'The main curated product story.' },
  editorial: { label: 'Editorial story', description: 'The large SAAJ point-of-view image and message.' },
  product_section_2: { label: 'Product edit 2', description: 'The secondary curated product story.' },
  values: { label: 'Brand values', description: 'Detail, ease, and character statements.' },
}

const sectionLayout = ref<HomepageSectionLayoutItem[]>([])
const sectionLayoutSaving = ref(false)
const sectionLayoutSaved = ref(false)
const sectionLayoutError = ref('')
const sectionLayoutDirty = ref(false)
const draggingSectionKey = ref<HomepageSectionKey | null>(null)
const sectionDropTarget = ref<HomepageSectionKey | null>(null)

watchEffect(() => {
  if (!data.value?.data.section_layout || sectionLayoutDirty.value) return
  sectionLayout.value = data.value.data.section_layout.map(section => ({ ...section }))
})

function moveHomepageSection(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= sectionLayout.value.length) return
  ;[sectionLayout.value[index], sectionLayout.value[target]] = [sectionLayout.value[target]!, sectionLayout.value[index]!]
  sectionLayoutDirty.value = true
  sectionLayoutSaved.value = false
}

function setSectionEnabled(key: HomepageSectionKey, enabled: boolean) {
  const item = sectionLayout.value.find(section => section.key === key)
  if (item) item.enabled = enabled

  if (key === 'categories' && categorySection.value) categorySection.value.is_enabled = enabled
  if (key === 'product_section_1') {
    const productSection = productSections.value.find(section => section.slot === 1)
    if (productSection) productSection.is_enabled = enabled
  }
  if (key === 'product_section_2') {
    const productSection = productSections.value.find(section => section.slot === 2)
    if (productSection) productSection.is_enabled = enabled
  }

  sectionLayoutSaved.value = false
  sectionLayoutDirty.value = true
}

function startSectionDrag(event: DragEvent, key: HomepageSectionKey) {
  draggingSectionKey.value = key
  event.dataTransfer?.setData('text/plain', key)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function dropHomepageSection(targetKey: HomepageSectionKey) {
  const sourceKey = draggingSectionKey.value
  draggingSectionKey.value = null
  sectionDropTarget.value = null
  if (!sourceKey || sourceKey === targetKey) return

  const sourceIndex = sectionLayout.value.findIndex(section => section.key === sourceKey)
  const targetIndex = sectionLayout.value.findIndex(section => section.key === targetKey)
  if (sourceIndex < 0 || targetIndex < 0) return

  const [moved] = sectionLayout.value.splice(sourceIndex, 1)
  if (moved) sectionLayout.value.splice(targetIndex, 0, moved)
  sectionLayoutDirty.value = true
  sectionLayoutSaved.value = false
}

function finishSectionDrag() {
  draggingSectionKey.value = null
  sectionDropTarget.value = null
}

async function saveSectionLayout() {
  sectionLayoutSaving.value = true
  sectionLayoutSaved.value = false
  sectionLayoutError.value = ''

  try {
    await $api('/admin/homepage/section-layout', {
      method: 'PUT',
      body: { sections: sectionLayout.value },
    })
    await refresh()
    sectionLayoutDirty.value = false
    sectionLayoutSaved.value = true
  } catch (error: any) {
    sectionLayoutError.value = extractApiErrorMessage(error, 'Could not save homepage section order.')
  } finally {
    sectionLayoutSaving.value = false
  }
}

const productSections = ref<HomepageProductSection[]>([])

watchEffect(() => {
  if (!data.value?.data.product_sections) return

  productSections.value = data.value.data.product_sections.map(section => ({
    ...section,
    eyebrow: section.eyebrow ?? '',
    description: section.description ?? '',
    cta_label: section.cta_label ?? '',
    cta_url: section.cta_url ?? '',
    products: [...(section.products ?? [])],
  }))
})

const productSearch = reactive<Record<1 | 2, string>>({ 1: '', 2: '' })
const productResults = reactive<Record<1 | 2, HomepageProduct[]>>({ 1: [], 2: [] })
const productSearching = reactive<Record<1 | 2, boolean>>({ 1: false, 2: false })
const productPickerOpen = reactive<Record<1 | 2, boolean>>({ 1: false, 2: false })
const productSectionsSaving = ref(false)
const productSectionsSaved = ref(false)
const productSectionsError = ref('')
const productSearchTimers: Partial<Record<1 | 2, ReturnType<typeof setTimeout>>> = {}
const productLimitOptions = [4, 6, 8, 10, 12].map(value => ({ label: `${value} products`, value }))
const categoryColumnOptions = [2, 3, 4, 5, 6].map(value => ({ label: `${value} cards`, value }))

function productImage(product: HomepageProduct) {
  return product.primary_image?.optimized_urls?.card ?? product.primary_image?.image_url ?? null
}

function productStatus(product: HomepageProduct) {
  if (!product.is_active) return 'Inactive'
  if (!product.published_at) return 'Draft'
  return new Date(product.published_at).getTime() > Date.now() ? 'Scheduled' : 'Published'
}

async function findProducts(slot: 1 | 2) {
  productSearching[slot] = true

  try {
    const response = await $api<{ data: HomepageProduct[] }>('/admin/products', {
      query: {
        search: productSearch[slot].trim() || undefined,
        sort_by: productSearch[slot].trim() ? 'name' : 'latest',
        per_page: 12,
      },
    })
    productResults[slot] = response.data ?? []
  } catch {
    productResults[slot] = []
  } finally {
    productSearching[slot] = false
  }
}

watch(() => productSearch[1], () => {
  if (productSearchTimers[1]) clearTimeout(productSearchTimers[1])
  productSearchTimers[1] = setTimeout(() => findProducts(1), 260)
})

watch(() => productSearch[2], () => {
  if (productSearchTimers[2]) clearTimeout(productSearchTimers[2])
  productSearchTimers[2] = setTimeout(() => findProducts(2), 260)
})

function availableProducts(section: HomepageProductSection) {
  const selected = new Set(section.products.map(product => product.id))
  return productResults[section.slot].filter(product => !selected.has(product.id))
}

function addHomepageProduct(section: HomepageProductSection, product: HomepageProduct) {
  if (section.products.some(item => item.id === product.id) || section.products.length >= 12) return
  section.products.push(product)
  productSearch[section.slot] = ''
  productResults[section.slot] = []
  productSectionsSaved.value = false
}

function removeHomepageProduct(section: HomepageProductSection, index: number) {
  section.products.splice(index, 1)
  productSectionsSaved.value = false
}

function moveHomepageProduct(section: HomepageProductSection, index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= section.products.length) return
  ;[section.products[index], section.products[target]] = [section.products[target]!, section.products[index]!]
  productSectionsSaved.value = false
}

async function saveProductSections() {
  productSectionsSaving.value = true
  productSectionsSaved.value = false
  productSectionsError.value = ''

  try {
    await $api('/admin/homepage/product-sections', {
      method: 'PUT',
      body: {
        sections: productSections.value.map(section => ({
          slot: section.slot,
          is_enabled: section.is_enabled,
          eyebrow: section.eyebrow,
          title: section.title,
          description: section.description,
          cta_label: section.cta_label,
          cta_url: section.cta_url,
          layout: section.layout,
          tone: section.tone,
          product_limit: Number(section.product_limit),
          product_ids: section.products.map(product => product.id),
        })),
      },
    })
    await refresh()
    productSectionsSaved.value = true
  } catch (error: any) {
    productSectionsError.value = extractApiErrorMessage(error, 'Could not save homepage product sections.')
  } finally {
    productSectionsSaving.value = false
  }
}

const categorySection = ref<HomepageCategorySection | null>(null)
const categorySearch = ref('')
const categoryResults = ref<HomepageCategory[]>([])
const categorySearching = ref(false)
const categoryPickerOpen = ref(false)
const categorySectionSaving = ref(false)
const categorySectionSaved = ref(false)
const categorySectionError = ref('')
let categorySearchTimer: ReturnType<typeof setTimeout> | null = null

watchEffect(() => {
  const source = data.value?.data.category_section
  if (!source) return

  categorySection.value = {
    ...source,
    eyebrow: source.eyebrow ?? '',
    description: source.description ?? '',
    cta_label: source.cta_label ?? '',
    cta_url: source.cta_url ?? '',
    categories: [...(source.categories ?? [])],
  }
})

function categoryImage(category: HomepageCategory) {
  return category.image_url ?? category.banner_image_url ?? null
}

async function findCategories() {
  categorySearching.value = true

  try {
    const response = await $api<{ data: HomepageCategory[] }>('/admin/categories', {
      query: {
        search: categorySearch.value.trim() || undefined,
        sort_by: categorySearch.value.trim() ? 'name' : 'sort_order',
        per_page: 12,
      },
    })
    categoryResults.value = response.data ?? []
  } catch {
    categoryResults.value = []
  } finally {
    categorySearching.value = false
  }
}

watch(categorySearch, () => {
  if (categorySearchTimer) clearTimeout(categorySearchTimer)
  categorySearchTimer = setTimeout(findCategories, 260)
})

const availableCategories = computed(() => {
  if (!categorySection.value) return []
  const selected = new Set(categorySection.value.categories.map(category => category.id))
  return categoryResults.value.filter(category => !selected.has(category.id))
})

function addHomepageCategory(category: HomepageCategory) {
  if (!categorySection.value || categorySection.value.categories.length >= 12) return
  if (categorySection.value.categories.some(item => item.id === category.id)) return
  categorySection.value.categories.push(category)
  categorySearch.value = ''
  categoryResults.value = []
  categoryPickerOpen.value = false
  categorySectionSaved.value = false
}

function removeHomepageCategory(index: number) {
  categorySection.value?.categories.splice(index, 1)
  categorySectionSaved.value = false
}

function moveHomepageCategory(index: number, direction: -1 | 1) {
  if (!categorySection.value) return
  const target = index + direction
  if (target < 0 || target >= categorySection.value.categories.length) return
  ;[categorySection.value.categories[index], categorySection.value.categories[target]] = [categorySection.value.categories[target]!, categorySection.value.categories[index]!]
  categorySectionSaved.value = false
}

async function saveCategorySection() {
  if (!categorySection.value) return
  categorySectionSaving.value = true
  categorySectionSaved.value = false
  categorySectionError.value = ''

  try {
    await $api('/admin/homepage/category-section', {
      method: 'PUT',
      body: {
        eyebrow: categorySection.value.eyebrow,
        title: categorySection.value.title,
        description: categorySection.value.description,
        cta_label: categorySection.value.cta_label,
        cta_url: categorySection.value.cta_url,
        tone: categorySection.value.tone,
        columns: Number(categorySection.value.columns),
        category_ids: categorySection.value.categories.map(category => category.id),
      },
    })
    await refresh()
    categorySectionSaved.value = true
  } catch (error: any) {
    categorySectionError.value = extractApiErrorMessage(error, 'Could not save the homepage collection section.')
  } finally {
    categorySectionSaving.value = false
  }
}

const settingsSaving = ref(false)
const settingsError = ref('')
const settingsSaved = ref(false)
const editorialImageFile = ref<File | null>(null)
const editorialImagePreview = ref<string | null>(null)
const clearEditorialImage = ref(false)

const editorialImageSource = computed(() =>
  editorialImagePreview.value ?? (clearEditorialImage.value ? null : settings.editorial_image_url),
)

function revokePreview(value: string | null) {
  if (value?.startsWith('blob:')) URL.revokeObjectURL(value)
}

function onEditorialImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  revokePreview(editorialImagePreview.value)
  editorialImageFile.value = file
  editorialImagePreview.value = file ? URL.createObjectURL(file) : null
  if (file) clearEditorialImage.value = false
}

function removeEditorialImage() {
  revokePreview(editorialImagePreview.value)
  editorialImagePreview.value = null
  editorialImageFile.value = null
  clearEditorialImage.value = true
}

function resetEditorialDraft() {
  revokePreview(editorialImagePreview.value)
  editorialImagePreview.value = null
  editorialImageFile.value = null
  clearEditorialImage.value = false
}

function appendText(body: FormData, key: string, value: string | number | boolean) {
  if (typeof value === 'boolean') {
    body.append(key, value ? '1' : '0')
    return
  }

  body.append(key, String(value ?? ''))
}

function richTextToPlain(value?: string | null) {
  if (!value) return ''

  return value
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

async function saveSettings() {
  settingsSaving.value = true
  settingsError.value = ''
  settingsSaved.value = false

  try {
    const body = new FormData()
    body.append('_method', 'PUT')
    appendText(body, 'hero_enabled', settings.hero_enabled)
    appendText(body, 'hero_mode', settings.hero_mode)
    appendText(body, 'hero_autoplay', settings.hero_autoplay)
    appendText(body, 'hero_autoplay_delay', Number(settings.hero_autoplay_delay))
    appendText(body, 'hero_pause_on_hover', settings.hero_pause_on_hover)
    appendText(body, 'hero_show_arrows', settings.hero_show_arrows)
    appendText(body, 'hero_show_dots', settings.hero_show_dots)
    appendText(body, 'category_columns', Number(settings.category_columns))
    appendText(body, 'hero_title_size', Number(settings.hero_title_size))

    if (editorialImageFile.value) body.append('editorial_image', editorialImageFile.value)
    if (clearEditorialImage.value) body.append('clear_editorial_image', '1')

    await $api('/admin/homepage/settings', { method: 'POST', body })
    await refresh()
    resetEditorialDraft()
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
  layout_type: 'single' as 'single' | 'panels',
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
const panelCount = ref(4)
const panelDrafts = ref<PanelDraft[]>([])

function blankPanel(): PanelDraft {
  return {
    source_index: null,
    existing_url: null,
    file: null,
    preview: null,
    eyebrow: '',
    title: '',
    description: '',
    alt_text: '',
    cta_label: '',
    cta_url: '',
    text_theme: 'light',
    text_position: 'bottom-left',
  }
}

function ensurePanels(count = panelCount.value) {
  const safeCount = Math.min(4, Math.max(2, Number(count) || 4))

  while (panelDrafts.value.length < safeCount) panelDrafts.value.push(blankPanel())
  while (panelDrafts.value.length > safeCount) {
    const removed = panelDrafts.value.pop()
    revokePreview(removed?.preview ?? null)
  }

  panelCount.value = safeCount
}

watch(panelCount, value => ensurePanels(value))

watch(() => slideForm.layout_type, layout => {
  if (layout === 'panels') {
    slideForm.media_type = 'image'
    ensurePanels()
  }
})

function clearEditorPreviews() {
  revokePreview(desktopPreview.value)
  revokePreview(mobilePreview.value)
  revokePreview(posterPreview.value)
  desktopPreview.value = null
  mobilePreview.value = null
  posterPreview.value = null

  for (const panel of panelDrafts.value) revokePreview(panel.preview)
}

onBeforeUnmount(() => {
  clearEditorPreviews()
  revokePreview(editorialImagePreview.value)
  if (productSearchTimers[1]) clearTimeout(productSearchTimers[1])
  if (productSearchTimers[2]) clearTimeout(productSearchTimers[2])
  if (categorySearchTimer) clearTimeout(categorySearchTimer)
})

function resetEditor() {
  clearEditorPreviews()
  editingId.value = null
  slideError.value = ''
  Object.assign(slideForm, {
    layout_type: 'single',
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
  panelCount.value = 4
  panelDrafts.value = Array.from({ length: 4 }, () => blankPanel())
}

function openCreate() {
  resetEditor()
  editorOpen.value = true
}

function openEdit(slide: HeroSlide) {
  resetEditor()
  editingId.value = slide.id
  Object.assign(slideForm, {
    layout_type: slide.layout_type ?? 'single',
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

  if (slide.layout_type === 'panels') {
    const sourcePanels = slide.panels?.length ? slide.panels : []
    panelCount.value = Math.min(4, Math.max(2, sourcePanels.length || 4))
    panelDrafts.value = sourcePanels.map((panel, index) => ({
      source_index: index,
      existing_url: panel.image_url ?? null,
      file: null,
      preview: null,
      eyebrow: panel.eyebrow ?? '',
      title: panel.title ?? '',
      description: panel.description ?? '',
      alt_text: panel.alt_text ?? '',
      cta_label: panel.cta_label ?? '',
      cta_url: panel.cta_url ?? '',
      text_theme: panel.text_theme ?? 'light',
      text_position: panel.text_position ?? 'bottom-left',
    }))
    ensurePanels(panelCount.value)
  }

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

function onPanelImage(index: number, event: Event) {
  const panel = panelDrafts.value[index]
  if (!panel) return

  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  revokePreview(panel.preview)
  panel.file = file
  panel.preview = file ? URL.createObjectURL(file) : null
}

function movePanel(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= panelCount.value) return
  ;[panelDrafts.value[index], panelDrafts.value[target]] = [panelDrafts.value[target]!, panelDrafts.value[index]!]
}

function panelSource(panel: PanelDraft) {
  return panel.preview ?? panel.existing_url
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
const mediaAccept = computed(() => slideForm.media_type === 'video'
  ? 'video/mp4,video/webm,video/quicktime,.mov'
  : 'image/jpeg,image/png,image/webp')

watch(() => slideForm.media_type, () => {
  if (!editingId.value && slideForm.layout_type === 'single') {
    revokePreview(desktopPreview.value)
    revokePreview(mobilePreview.value)
    desktopPreview.value = null
    mobilePreview.value = null
    desktopFile.value = null
    mobileFile.value = null
  }
})

async function saveSlide() {
  if (slideForm.layout_type === 'single' && !editingId.value && !desktopFile.value) {
    slideError.value = 'Desktop media is required for a new standard slide.'
    return
  }

  if (slideForm.layout_type === 'panels') {
    const missing = panelDrafts.value.slice(0, panelCount.value).findIndex(panel => !panelSource(panel))
    if (missing !== -1) {
      slideError.value = `Choose an image for panel ${missing + 1}.`
      return
    }
  }

  slideSaving.value = true
  slideError.value = ''

  try {
    const body = new FormData()
    if (editingId.value) body.append('_method', 'PUT')

    appendText(body, 'layout_type', slideForm.layout_type)
    appendText(body, 'media_type', slideForm.layout_type === 'panels' ? 'image' : slideForm.media_type)
    appendText(body, 'eyebrow', slideForm.eyebrow)
    appendText(body, 'title', slideForm.title)
    appendText(body, 'description', slideForm.description)
    appendText(body, 'alt_text', slideForm.alt_text)
    appendText(body, 'primary_cta_label', slideForm.primary_cta_label)
    appendText(body, 'primary_cta_url', slideForm.primary_cta_url)
    appendText(body, 'secondary_cta_label', slideForm.secondary_cta_label)
    appendText(body, 'secondary_cta_url', slideForm.secondary_cta_url)
    appendText(body, 'text_position', slideForm.text_position)
    appendText(body, 'text_theme', slideForm.text_theme)
    appendText(body, 'overlay_strength', slideForm.overlay_strength)
    appendText(body, 'is_active', slideForm.is_active)

    if (slideForm.layout_type === 'single') {
      if (desktopFile.value) body.append('desktop_media', desktopFile.value)
      if (mobileFile.value) body.append('mobile_media', mobileFile.value)
      if (posterFile.value) body.append('poster_image', posterFile.value)
      if (clearMobile.value) body.append('clear_mobile_media', '1')
      if (clearPoster.value) body.append('clear_poster', '1')
    } else {
      panelDrafts.value.slice(0, panelCount.value).forEach((panel, index) => {
        if (panel.file) body.append(`panels[${index}][image]`, panel.file)
        if (panel.source_index !== null) appendText(body, `panels[${index}][source_index]`, panel.source_index)
        appendText(body, `panels[${index}][eyebrow]`, panel.eyebrow)
        appendText(body, `panels[${index}][title]`, panel.title)
        appendText(body, `panels[${index}][description]`, panel.description)
        appendText(body, `panels[${index}][alt_text]`, panel.alt_text)
        appendText(body, `panels[${index}][cta_label]`, panel.cta_label)
        appendText(body, `panels[${index}][cta_url]`, panel.cta_url)
        appendText(body, `panels[${index}][text_theme]`, panel.text_theme)
        appendText(body, `panels[${index}][text_position]`, panel.text_position)
      })
    }

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
    await $api('/admin/homepage/slides/reorder', { method: 'PUT', body: { ids } })
    await refresh()
  } finally {
    reordering.value = null
  }
}

function shortMediaLabel(slide: HeroSlide) {
  if (slide.layout_type === 'panels') return `${slide.panels?.length ?? 0} panels`
  return slide.media_type === 'video' ? 'Video' : 'Image'
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <AppPageHeader
      eyebrow="Storefront"
      title="Homepage"
      description="Build the customer-facing hero, campaign panels, curated product stories, category rhythm, and editorial media without changing storefront code."
    >
      <template #actions>
        <AppButton @click="openCreate">Add hero slide</AppButton>
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
              Use standard image/video slides or multi-panel campaign slides with up to four independent images and actions.
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
          <AppToggle v-model="settings.hero_autoplay" label="Autoplay slider" description="Automatically move to the next slide." :disabled="settings.hero_mode !== 'slider'" />
          <AppToggle v-model="settings.hero_pause_on_hover" label="Pause on hover" description="Give visitors time to explore campaign content." :disabled="settings.hero_mode !== 'slider' || !settings.hero_autoplay" />
          <AppToggle v-model="settings.hero_show_arrows" label="Show navigation arrows" description="Desktop arrow controls for multi-slide heroes." :disabled="settings.hero_mode !== 'slider'" />
          <AppToggle v-model="settings.hero_show_dots" label="Show slide progress" description="Minimal progress markers at the bottom of the hero." :disabled="settings.hero_mode !== 'slider'" />
        </div>

        <div class="mt-7 border-t border-gray-950/[0.06] pt-6 dark:border-white/[0.06]">
          <div class="max-w-2xl">
            <div class="mb-2 flex items-center justify-between gap-4">
              <div>
                <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">Hero headline size</p>
                <p class="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">Desktop maximum. Mobile remains fluid and touch-friendly.</p>
              </div>
              <span class="shrink-0 rounded-full bg-gray-950/[0.05] px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
                {{ settings.hero_title_size }}px
              </span>
            </div>
            <input v-model.number="settings.hero_title_size" type="range" min="56" max="120" step="2" class="w-full accent-gray-950 dark:accent-white">
            <div class="mt-1.5 flex justify-between text-[10px] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-600">
              <span>Quiet</span><span>Statement</span>
            </div>
          </div>
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
            <AppButton :loading="settingsSaving" @click="saveSettings">Save homepage settings</AppButton>
          </div>
        </div>
      </AppCard>

      <AppCard v-if="categorySection" class="overflow-hidden">
        <div class="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div class="max-w-2xl">
            <div class="flex items-center gap-2">
              <p class="text-sm font-semibold text-gray-950 dark:text-white">Shop the collections</p>
              <span class="rounded-full bg-sky-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-sky-700 dark:text-sky-300">Curated categories</span>
            </div>
            <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
              Choose the exact collection cards shown on the homepage and arrange their customer-facing order.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="categorySectionSaved" class="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">Saved</span>
            <AppButton :loading="categorySectionSaving" @click="saveCategorySection">Publish collections</AppButton>
          </div>
        </div>

        <div class="grid border-t border-gray-950/[0.06] dark:border-white/[0.06] lg:grid-cols-[0.82fr_1.18fr] lg:divide-x lg:divide-gray-950/[0.06] lg:dark:divide-white/[0.06]">
          <section class="p-5 sm:p-6">
            <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">Section presentation</p>
            <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <AppInput v-model="categorySection.eyebrow" label="Eyebrow" placeholder="Explore SAAJ" />
              <AppInput v-model="categorySection.title" label="Section title" placeholder="Shop the collections" />
              <div class="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                <AppInput v-model="categorySection.description" label="Supporting text" placeholder="Move through the wardrobe…" />
              </div>
              <AppInput v-model="categorySection.cta_label" label="Link label" placeholder="View all collections" />
              <AppInput v-model="categorySection.cta_url" label="Link destination" placeholder="/shop" />
              <AppSelect
                v-model="categorySection.columns"
                label="Cards per desktop row"
                :options="categoryColumnOptions"
              />
              <AppSelect
                v-model="categorySection.tone"
                label="Background tone"
                :options="[
                  { label: 'Paper', value: 'light' },
                  { label: 'Soft mist', value: 'soft' },
                  { label: 'Dark editorial', value: 'dark' },
                ]"
              />
            </div>

            <div class="mt-5 rounded-[14px] bg-violet-500/[0.055] px-4 py-3 text-[11px] leading-5 text-violet-700 dark:bg-violet-400/[0.07] dark:text-violet-300">
              Visibility is controlled from the Page flow panel, alongside every other homepage section.
            </div>
          </section>

          <section class="min-w-0 p-5 sm:p-6">
            <div class="flex items-end justify-between gap-4">
              <div>
                <p class="text-[12px] font-semibold text-gray-800 dark:text-gray-200">Collection cards</p>
                <p class="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">Search categories, add up to 12, then arrange the live order.</p>
              </div>
              <span class="rounded-full bg-gray-950/[0.05] px-2.5 py-1 text-[10px] font-semibold text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                {{ categorySection.categories.length }}/12 selected
              </span>
            </div>

            <div class="relative mt-3">
              <input
                v-model="categorySearch"
                type="search"
                autocomplete="off"
                :placeholder="categorySection.categories.length >= 12 ? 'Maximum 12 categories selected' : 'Search category name…'"
                :disabled="categorySection.categories.length >= 12"
                class="h-11 w-full rounded-[12px] bg-gray-950/[0.035] px-4 pr-12 text-[12px] font-medium text-gray-900 outline-none ring-1 ring-inset ring-gray-950/[0.06] transition placeholder:text-gray-400 focus:bg-white focus:ring-gray-950/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.045] dark:text-white dark:ring-white/[0.07] dark:focus:bg-white/[0.065] dark:focus:ring-white/20"
                @focus="categoryPickerOpen = true; findCategories()"
              >
              <span v-if="categorySearching" class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400">Searching…</span>

              <div
                v-if="categoryPickerOpen && !categorySearching && availableCategories.length"
                class="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto rounded-[14px] bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-black/[0.06] dark:bg-gray-900 dark:ring-white/[0.08]"
              >
                <button
                  v-for="category in availableCategories"
                  :key="category.id"
                  type="button"
                  class="flex w-full items-center gap-3 rounded-[10px] p-2 text-left transition hover:bg-gray-950/[0.04] dark:hover:bg-white/[0.06]"
                  @mousedown.prevent="addHomepageCategory(category)"
                >
                  <img v-if="categoryImage(category)" :src="categoryImage(category) || ''" :alt="category.name" class="h-11 w-9 shrink-0 rounded-[7px] object-cover">
                  <span v-else class="h-11 w-9 shrink-0 rounded-[7px] bg-gray-950/[0.05] dark:bg-white/[0.06]" />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-[12px] font-semibold text-gray-900 dark:text-white">{{ category.name }}</span>
                    <span class="mt-0.5 block truncate text-[10px] text-gray-400">/{{ category.full_slug }} · {{ category.is_active ? 'Active' : 'Inactive' }}</span>
                  </span>
                  <span class="text-lg font-light text-gray-400">+</span>
                </button>
              </div>
            </div>

            <div v-if="categorySection.categories.length" class="mt-4 grid gap-2 xl:grid-cols-2">
              <article
                v-for="(category, categoryIndex) in categorySection.categories"
                :key="category.id"
                class="flex min-w-0 items-center gap-2.5 rounded-[12px] bg-gray-950/[0.025] p-2.5 ring-1 ring-inset ring-gray-950/[0.045] dark:bg-white/[0.035] dark:ring-white/[0.055]"
              >
                <span class="w-5 shrink-0 text-center text-[10px] font-bold tabular-nums text-gray-400">{{ String(categoryIndex + 1).padStart(2, '0') }}</span>
                <img v-if="categoryImage(category)" :src="categoryImage(category) || ''" :alt="category.name" class="h-14 w-11 shrink-0 rounded-[8px] object-cover">
                <span v-else class="h-14 w-11 shrink-0 rounded-[8px] bg-gray-950/[0.05] dark:bg-white/[0.06]" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[12px] font-semibold text-gray-900 dark:text-white">{{ category.name }}</p>
                  <p class="mt-0.5 truncate text-[10px] text-gray-400">/{{ category.full_slug }}</p>
                </div>
                <div class="flex shrink-0 items-center gap-0.5">
                  <AppButton variant="ghost" size="sm" :disabled="categoryIndex === 0" @click="moveHomepageCategory(categoryIndex, -1)">↑</AppButton>
                  <AppButton variant="ghost" size="sm" :disabled="categoryIndex === categorySection.categories.length - 1" @click="moveHomepageCategory(categoryIndex, 1)">↓</AppButton>
                  <AppButton variant="ghost" size="sm" @click="removeHomepageCategory(categoryIndex)">×</AppButton>
                </div>
              </article>
            </div>

            <div v-else class="mt-4 rounded-[12px] border border-dashed border-gray-950/10 px-4 py-8 text-center dark:border-white/10">
              <p class="text-[12px] font-medium text-gray-500 dark:text-gray-400">No collection cards selected</p>
              <p class="mt-1 text-[11px] text-gray-400 dark:text-gray-600">Search above to build the homepage collection edit.</p>
            </div>
          </section>
        </div>

        <div v-if="categorySectionError" class="border-t border-red-500/10 bg-red-500/[0.05] px-5 py-3 text-[12px] font-medium text-red-600 dark:text-red-400 sm:px-6">
          {{ categorySectionError }}
        </div>
      </AppCard>

      <AppCard class="overflow-hidden">
        <div class="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div class="max-w-2xl">
            <div class="flex items-center gap-2">
              <p class="text-sm font-semibold text-gray-950 dark:text-white">Page flow</p>
              <span class="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-violet-700 dark:text-violet-300">Drag & drop</span>
            </div>
            <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
              Arrange every homepage block between the fixed hero and footer. Toggle any block off without deleting its content.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="sectionLayoutSaved" class="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">Saved</span>
            <AppButton :loading="sectionLayoutSaving" @click="saveSectionLayout">Save page flow</AppButton>
          </div>
        </div>

        <div class="border-t border-gray-950/[0.06] bg-gray-950/[0.012] p-4 dark:border-white/[0.06] dark:bg-white/[0.012] sm:p-5">
          <div class="mx-auto max-w-3xl">
            <div class="flex items-center gap-3 rounded-[14px] bg-gray-950 px-4 py-3 text-white shadow-[0_10px_30px_rgba(15,23,42,0.12)] dark:bg-white dark:text-gray-950">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-white/12 text-[10px] font-bold dark:bg-gray-950/[0.08]">H</span>
              <div class="min-w-0 flex-1">
                <p class="text-[12px] font-semibold">Hero slider</p>
                <p class="mt-0.5 text-[10px] text-white/55 dark:text-gray-500">Always remains at the top</p>
              </div>
              <span class="rounded-full bg-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] dark:bg-gray-950/[0.06]">Fixed</span>
            </div>

            <div class="relative ml-7 h-3 w-px bg-gray-950/10 dark:bg-white/10" />

            <div class="space-y-2">
              <article
                v-for="(section, index) in sectionLayout"
                :key="section.key"
                draggable="true"
                class="group flex items-center gap-3 rounded-[14px] bg-white p-3 shadow-[0_5px_18px_rgba(15,23,42,0.035)] ring-1 ring-inset ring-gray-950/[0.055] transition dark:bg-white/[0.035] dark:ring-white/[0.06]"
                :class="[
                  draggingSectionKey === section.key ? 'scale-[0.985] opacity-45' : '',
                  sectionDropTarget === section.key && draggingSectionKey !== section.key ? 'translate-y-0.5 ring-2 ring-violet-500/35' : '',
                  !section.enabled ? 'opacity-60' : '',
                ]"
                @dragstart="startSectionDrag($event, section.key)"
                @dragover.prevent="sectionDropTarget = section.key"
                @drop.prevent="dropHomepageSection(section.key)"
                @dragend="finishSectionDrag"
              >
                <button type="button" class="grid h-9 w-7 shrink-0 cursor-grab grid-cols-2 place-content-center gap-[3px] rounded-[8px] text-gray-300 transition hover:bg-gray-950/[0.04] hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:bg-white/[0.05]" aria-label="Drag to reorder section">
                  <span v-for="dot in 6" :key="dot" class="h-1 w-1 rounded-full bg-current" />
                </button>

                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-950/[0.045] text-[10px] font-bold tabular-nums text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                  {{ String(index + 1).padStart(2, '0') }}
                </span>

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="truncate text-[12px] font-semibold text-gray-900 dark:text-white">{{ sectionMeta[section.key].label }}</p>
                    <span class="rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em]" :class="section.enabled ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-gray-950/[0.05] text-gray-400 dark:bg-white/[0.06] dark:text-gray-500'">
                      {{ section.enabled ? 'Visible' : 'Hidden' }}
                    </span>
                  </div>
                  <p class="mt-0.5 truncate text-[10px] text-gray-400 dark:text-gray-500">{{ sectionMeta[section.key].description }}</p>
                </div>

                <div class="flex shrink-0 items-center gap-1">
                  <AppButton variant="ghost" size="sm" :disabled="index === 0" @click="moveHomepageSection(index, -1)">↑</AppButton>
                  <AppButton variant="ghost" size="sm" :disabled="index === sectionLayout.length - 1" @click="moveHomepageSection(index, 1)">↓</AppButton>
                </div>

                <AppToggle :model-value="section.enabled" @update:model-value="setSectionEnabled(section.key, $event)" />
              </article>
            </div>

            <div class="relative ml-7 h-3 w-px bg-gray-950/10 dark:bg-white/10" />
            <div class="flex items-center gap-3 rounded-[14px] bg-gray-950/[0.035] px-4 py-3 ring-1 ring-inset ring-gray-950/[0.045] dark:bg-white/[0.035] dark:ring-white/[0.055]">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-gray-950/[0.06] text-[10px] font-bold text-gray-500 dark:bg-white/[0.07] dark:text-gray-400">F</span>
              <div class="min-w-0 flex-1">
                <p class="text-[12px] font-semibold text-gray-700 dark:text-gray-300">Footer</p>
                <p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Always remains at the bottom</p>
              </div>
              <span class="rounded-full bg-gray-950/[0.05] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:bg-white/[0.06] dark:text-gray-500">Fixed</span>
            </div>
          </div>
        </div>

        <div v-if="sectionLayoutError" class="border-t border-red-500/10 bg-red-500/[0.05] px-5 py-3 text-[12px] font-medium text-red-600 dark:text-red-400 sm:px-6">
          {{ sectionLayoutError }}
        </div>
      </AppCard>

      <AppCard class="overflow-hidden">
        <div class="flex items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div>
            <p class="text-sm font-semibold text-gray-950 dark:text-white">Hero slides</p>
            <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
              Standard slides support image/video. Multi-panel slides support 2–4 independent campaign images with hover content.
            </p>
          </div>
          <AppButton variant="secondary" @click="openCreate">Add slide</AppButton>
        </div>

        <div v-if="!slides.length" class="border-t border-gray-950/[0.06] px-5 py-14 text-center dark:border-white/[0.06]">
          <p class="text-[13px] font-medium text-gray-700 dark:text-gray-300">No hero slides yet</p>
          <p class="mx-auto mt-1 max-w-md text-[12px] leading-5 text-gray-400 dark:text-gray-500">
            Add a standard campaign or a multi-panel visual story. Until then, the storefront keeps its safe fallback.
          </p>
          <AppButton class="mt-4" @click="openCreate">Create first slide</AppButton>
        </div>

        <div v-else class="divide-y divide-gray-950/[0.06] border-t border-gray-950/[0.06] dark:divide-white/[0.06] dark:border-white/[0.06]">
          <article
            v-for="(slide, index) in slides"
            :key="slide.id"
            class="grid gap-4 p-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center sm:p-5"
          >
            <div class="relative aspect-[16/10] overflow-hidden rounded-[12px] bg-gray-950/[0.04] dark:bg-white/[0.05]">
              <div v-if="slide.layout_type === 'panels'" class="grid h-full" :style="{ gridTemplateColumns: `repeat(${Math.max(1, slide.panels?.length || 1)}, minmax(0, 1fr))` }">
                <img
                  v-for="(panel, panelIndex) in slide.panels"
                  :key="panelIndex"
                  :src="panel.image_url || ''"
                  :alt="panel.alt_text || richTextToPlain(panel.title) || `Panel ${panelIndex + 1}`"
                  class="h-full min-w-0 object-cover"
                >
              </div>
              <video v-else-if="slide.media_type === 'video' && slide.desktop_media_url" :src="slide.desktop_media_url" :poster="slide.poster_url || undefined" muted playsinline preload="metadata" class="h-full w-full object-cover" />
              <img v-else-if="slide.desktop_media_url" :src="slide.desktop_media_url" :alt="slide.alt_text || richTextToPlain(slide.title) || 'Homepage hero slide'" class="h-full w-full object-cover">
              <span class="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur">
                {{ shortMediaLabel(slide) }}
              </span>
              <span class="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-bold tracking-[0.08em] text-gray-950 shadow-sm backdrop-blur">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
            </div>

            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate text-[14px] font-semibold text-gray-950 dark:text-white">
                  {{ slide.layout_type === 'panels' ? (slide.panels?.map(panel => richTextToPlain(panel.title)).filter(Boolean).slice(0, 2).join(' · ') || 'Multi-panel campaign') : (richTextToPlain(slide.title) || 'Untitled hero slide') }}
                </p>
                <span class="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]" :class="slide.is_active ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-gray-950/[0.05] text-gray-400 dark:bg-white/[0.06] dark:text-gray-500'">
                  {{ slide.is_active ? 'Active' : 'Hidden' }}
                </span>
              </div>
              <p class="mt-2 line-clamp-2 max-w-2xl text-[12px] leading-5 text-gray-400 dark:text-gray-500">
                {{ slide.layout_type === 'panels' ? 'Independent image panels reveal their copy and action on hover; content stays visible on touch devices.' : (richTextToPlain(slide.description) || 'No supporting copy.') }}
              </p>
              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-600">
                <span>{{ slide.layout_type === 'panels' ? 'multi-panel' : slide.text_position.replace('-', ' ') }}</span>
                <span v-if="slide.layout_type === 'single'">{{ slide.text_theme }} text</span>
                <span v-if="slide.layout_type === 'single'">{{ slide.overlay_strength }}% overlay</span>
                <span v-if="slide.mobile_media_url">mobile media</span>
              </div>
            </div>

            <div class="flex items-center justify-end gap-1 sm:flex-col">
              <div class="flex items-center gap-1">
                <AppButton variant="ghost" size="sm" :disabled="index === 0 || reordering === slide.id" @click="moveSlide(index, -1)">↑</AppButton>
                <AppButton variant="ghost" size="sm" :disabled="index === slides.length - 1 || reordering === slide.id" @click="moveSlide(index, 1)">↓</AppButton>
              </div>
              <div class="flex items-center gap-1">
                <AppButton variant="ghost" size="sm" @click="openEdit(slide)">Edit</AppButton>
                <AppButton variant="ghost" size="sm" @click="askDelete(slide)">Delete</AppButton>
              </div>
            </div>
          </article>
        </div>
      </AppCard>

      <AppCard class="overflow-hidden">
        <div class="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div class="max-w-2xl">
            <div class="flex items-center gap-2">
              <p class="text-sm font-semibold text-gray-950 dark:text-white">Homepage product stories</p>
              <span class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">2 sections</span>
            </div>
            <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
              Curate exact products for two independent storefront moments. Product order here is the order customers see.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="productSectionsSaved" class="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">Saved</span>
            <AppButton :loading="productSectionsSaving" @click="saveProductSections">Publish product stories</AppButton>
          </div>
        </div>

        <div class="grid border-t border-gray-950/[0.06] dark:border-white/[0.06] xl:grid-cols-2 xl:divide-x xl:divide-gray-950/[0.06] xl:dark:divide-white/[0.06]">
          <section
            v-for="section in productSections"
            :key="section.slot"
            class="min-w-0 p-5 sm:p-6"
          >
            <div class="flex items-start justify-between gap-5">
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">Product section {{ section.slot }}</p>
                <p class="mt-1 text-[14px] font-semibold text-gray-950 dark:text-white">
                  {{ section.slot === 1 ? 'Main product edit' : 'Second product edit' }}
                </p>
              </div>
              <span class="rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]" :class="section.is_enabled ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-gray-950/[0.05] text-gray-400 dark:bg-white/[0.06] dark:text-gray-500'">
                {{ section.is_enabled ? 'Visible in page flow' : 'Hidden in page flow' }}
              </span>
            </div>

            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <AppInput v-model="section.eyebrow" label="Eyebrow" placeholder="Selected for you" />
              <AppInput v-model="section.title" label="Section title" placeholder="New & noteworthy" />
              <div class="sm:col-span-2">
                <AppInput v-model="section.description" label="Supporting text" placeholder="A short reason to explore this edit…" />
              </div>
              <AppInput v-model="section.cta_label" label="Link label" placeholder="View all" />
              <AppInput v-model="section.cta_url" label="Link destination" placeholder="/shop" />
              <AppSelect
                v-model="section.layout"
                label="Presentation"
                :options="[
                  { label: 'Editorial grid', value: 'grid', hint: 'Structured 2 × 4 product edit' },
                  { label: 'Swipe rail', value: 'rail', hint: 'Touch-led horizontal discovery' },
                ]"
              />
              <AppSelect
                v-model="section.tone"
                label="Background tone"
                :options="[
                  { label: 'Paper', value: 'light' },
                  { label: 'Soft mist', value: 'soft' },
                  { label: 'Dark editorial', value: 'dark' },
                ]"
              />
              <AppSelect
                v-model="section.product_limit"
                label="Products shown"
                :options="productLimitOptions"
                class="sm:col-span-2"
              />
            </div>

            <div class="mt-6 border-t border-gray-950/[0.06] pt-5 dark:border-white/[0.06]">
              <div class="flex items-end justify-between gap-4">
                <div>
                  <p class="text-[12px] font-semibold text-gray-800 dark:text-gray-200">Choose products</p>
                  <p class="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">Search the catalogue, then arrange the live order.</p>
                </div>
                <span class="rounded-full bg-gray-950/[0.05] px-2.5 py-1 text-[10px] font-semibold text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                  {{ section.products.length }}/12 selected
                </span>
              </div>

              <div class="relative mt-3">
                <input
                  v-model="productSearch[section.slot]"
                  type="search"
                  autocomplete="off"
                  :placeholder="section.products.length >= 12 ? 'Maximum 12 products selected' : 'Search product name…'"
                  :disabled="section.products.length >= 12"
                  class="h-11 w-full rounded-[12px] bg-gray-950/[0.035] px-4 pr-12 text-[12px] font-medium text-gray-900 outline-none ring-1 ring-inset ring-gray-950/[0.06] transition placeholder:text-gray-400 focus:bg-white focus:ring-gray-950/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.045] dark:text-white dark:ring-white/[0.07] dark:focus:bg-white/[0.065] dark:focus:ring-white/20"
                  @focus="productPickerOpen[section.slot] = true; findProducts(section.slot)"
                >
                <span v-if="productSearching[section.slot]" class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400">Searching…</span>

                <div
                  v-if="productPickerOpen[section.slot] && !productSearching[section.slot] && availableProducts(section).length"
                  class="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto rounded-[14px] bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-black/[0.06] dark:bg-gray-900 dark:ring-white/[0.08]"
                >
                  <button
                    v-for="product in availableProducts(section)"
                    :key="product.id"
                    type="button"
                    class="flex w-full items-center gap-3 rounded-[10px] p-2 text-left transition hover:bg-gray-950/[0.04] dark:hover:bg-white/[0.06]"
                    @mousedown.prevent="addHomepageProduct(section, product); productPickerOpen[section.slot] = false"
                  >
                    <img v-if="productImage(product)" :src="productImage(product) || ''" :alt="product.name" class="h-11 w-9 shrink-0 rounded-[7px] object-cover">
                    <span v-else class="h-11 w-9 shrink-0 rounded-[7px] bg-gray-950/[0.05] dark:bg-white/[0.06]" />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-[12px] font-semibold text-gray-900 dark:text-white">{{ product.name }}</span>
                      <span class="mt-0.5 block text-[10px] text-gray-400">{{ product.brand?.name || 'SAAJ' }} · {{ productStatus(product) }}</span>
                    </span>
                    <span class="text-lg font-light text-gray-400">+</span>
                  </button>
                </div>
              </div>

              <div v-if="section.products.length" class="mt-4 space-y-2">
                <article
                  v-for="(product, productIndex) in section.products"
                  :key="product.id"
                  class="flex items-center gap-3 rounded-[12px] bg-gray-950/[0.025] p-2.5 ring-1 ring-inset ring-gray-950/[0.045] dark:bg-white/[0.035] dark:ring-white/[0.055]"
                >
                  <span class="w-5 shrink-0 text-center text-[10px] font-bold tabular-nums text-gray-400">{{ String(productIndex + 1).padStart(2, '0') }}</span>
                  <img v-if="productImage(product)" :src="productImage(product) || ''" :alt="product.name" class="h-14 w-11 shrink-0 rounded-[8px] object-cover">
                  <span v-else class="h-14 w-11 shrink-0 rounded-[8px] bg-gray-950/[0.05] dark:bg-white/[0.06]" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-[12px] font-semibold text-gray-900 dark:text-white">{{ product.name }}</p>
                    <p class="mt-0.5 text-[10px] text-gray-400">{{ productStatus(product) }}</p>
                  </div>
                  <div class="flex shrink-0 items-center gap-0.5">
                    <AppButton variant="ghost" size="sm" :disabled="productIndex === 0" @click="moveHomepageProduct(section, productIndex, -1)">↑</AppButton>
                    <AppButton variant="ghost" size="sm" :disabled="productIndex === section.products.length - 1" @click="moveHomepageProduct(section, productIndex, 1)">↓</AppButton>
                    <AppButton variant="ghost" size="sm" @click="removeHomepageProduct(section, productIndex)">×</AppButton>
                  </div>
                </article>
              </div>

              <div v-else class="mt-4 rounded-[12px] border border-dashed border-gray-950/10 px-4 py-8 text-center dark:border-white/10">
                <p class="text-[12px] font-medium text-gray-500 dark:text-gray-400">No products selected</p>
                <p class="mt-1 text-[11px] text-gray-400 dark:text-gray-600">Search above to build this homepage edit.</p>
              </div>
            </div>
          </section>
        </div>

        <div v-if="productSectionsError" class="border-t border-red-500/10 bg-red-500/[0.05] px-5 py-3 text-[12px] font-medium text-red-600 dark:text-red-400 sm:px-6">
          {{ productSectionsError }}
        </div>
      </AppCard>

      <!-- Keep the independent editorial asset directly below slide management. -->
      <AppCard class="overflow-hidden">
        <div class="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-center">
          <div class="max-w-2xl">
            <div class="flex items-center gap-2">
              <p class="text-sm font-semibold text-gray-950 dark:text-white">Editorial section image</p>
              <span class="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-violet-700 dark:text-violet-300">Homepage</span>
            </div>
            <p class="mt-1 text-[13px] leading-5 text-gray-400 dark:text-gray-500">
              Dedicated image for the “SAAJ point of view” section. It stays independent from hero and category media.
            </p>

            <div class="mt-4 flex flex-wrap items-center gap-2">
              <label class="inline-flex h-10 cursor-pointer items-center justify-center rounded-[10px] bg-gray-950 px-4 text-[11px] font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-100">
                {{ editorialImageSource ? 'Replace image' : 'Choose image' }}
                <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onEditorialImage">
              </label>
              <button v-if="editorialImageSource" type="button" class="h-10 rounded-[10px] bg-gray-950/[0.045] px-4 text-[11px] font-semibold text-gray-600 transition hover:bg-red-500/[0.08] hover:text-red-600 dark:bg-white/[0.055] dark:text-gray-300" @click="removeEditorialImage">Remove</button>
              <AppButton size="sm" :loading="settingsSaving" @click="saveSettings">Save image</AppButton>
            </div>
            <p class="mt-3 text-[11px] leading-5 text-gray-400 dark:text-gray-500">Recommended: portrait/editorial photography, at least 1600px wide. JPG, PNG or WebP up to 15MB.</p>
          </div>

          <div class="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-gray-950/[0.04] dark:bg-white/[0.05]">
            <img v-if="editorialImageSource" :src="editorialImageSource" alt="Homepage editorial preview" class="h-full w-full object-cover">
            <div v-else class="absolute inset-0 flex items-center justify-center px-6 text-center">
              <p class="max-w-[220px] text-[12px] leading-5 text-gray-400 dark:text-gray-500">Add a dedicated editorial image for the lower homepage story section.</p>
            </div>
          </div>
        </div>
      </AppCard>
    </div>

    <AppModal
      :open="editorOpen"
      :title="editingId ? 'Edit hero slide' : 'Add hero slide'"
      description="Choose a classic campaign slide or build a multi-image story with independent content for every panel."
      max-width="max-w-6xl"
      @close="closeEditor"
    >
      <form class="space-y-6 p-4 sm:p-5" @submit.prevent="saveSlide">
        <div class="grid gap-4 sm:grid-cols-2">
          <AppSelect
            v-model="slideForm.layout_type"
            label="Slide layout"
            :options="[
              { label: 'Standard media', value: 'single', hint: 'One image or video with campaign copy' },
              { label: 'Multi-panel story', value: 'panels', hint: '2–4 side-by-side images with independent hover content' },
            ]"
          />
          <AppToggle v-model="slideForm.is_active" label="Slide active" description="Hidden slides stay saved but are not sent to customers." />
        </div>

        <div v-if="slideForm.layout_type === 'single'" class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div class="space-y-5">
            <AppSelect v-model="slideForm.media_type" label="Media type" :options="[{ label: 'Image', value: 'image' }, { label: 'Video', value: 'video' }]" />

            <div>
              <div class="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">Desktop media</p>
                  <p class="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{{ slideForm.media_type === 'video' ? 'MP4/WebM/MOV · up to 50 MB' : 'JPG/PNG/WebP · landscape recommended' }}</p>
                </div>
                <label class="cursor-pointer text-[12px] font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 dark:text-gray-300">
                  {{ desktopSource ? 'Replace' : 'Upload' }}
                  <input type="file" :accept="mediaAccept" class="hidden" @change="onMediaFile('desktop', $event)">
                </label>
              </div>
              <div class="relative aspect-[16/10] overflow-hidden rounded-[14px] bg-gray-950/[0.04] dark:bg-white/[0.05]">
                <video v-if="desktopSource && slideForm.media_type === 'video'" :src="desktopSource" :poster="posterSource || undefined" muted controls playsinline class="h-full w-full object-cover" />
                <img v-else-if="desktopSource" :src="desktopSource" alt="Desktop hero preview" class="h-full w-full object-cover">
                <div v-else class="flex h-full items-center justify-center text-center text-[12px] text-gray-400">Upload desktop {{ slideForm.media_type }}</div>
              </div>
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">Mobile media <span class="font-normal text-gray-400">(optional)</span></p>
                  <p class="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">A portrait crop gives better control on phones.</p>
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
                <video v-if="mobileSource && slideForm.media_type === 'video'" :src="mobileSource" :poster="posterSource || undefined" muted controls playsinline class="h-full w-full object-cover" />
                <img v-else-if="mobileSource" :src="mobileSource" alt="Mobile hero preview" class="h-full w-full object-cover">
                <div v-else class="flex h-full items-center justify-center px-4 text-center text-[11px] leading-5 text-gray-400">Desktop media will be cropped automatically when no mobile version is supplied.</div>
              </div>
            </div>

            <div v-if="slideForm.media_type === 'video'">
              <div class="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">Video poster <span class="font-normal text-gray-400">(optional)</span></p>
                  <p class="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">Displayed before the video is ready.</p>
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
            <div class="space-y-2">
              <AppRichTextEditor
                v-model="slideForm.title"
                label="Headline"
                placeholder="Quiet detail. Strong presence."
                mode="simple"
                compact
                weight-control
              />
              <p class="text-[11px] leading-5 text-gray-400 dark:text-gray-500">Use Enter for a new line. Bold, light, italic and underline are supported.</p>
            </div>
            <AppRichTextEditor
              v-model="slideForm.description"
              label="Supporting text"
              placeholder="Short campaign copy…"
              mode="simple"
              compact
              weight-control
            />
            <div class="grid gap-4 sm:grid-cols-2">
              <AppInput v-model="slideForm.primary_cta_label" label="Primary button" placeholder="Shop the edit" />
              <AppInput v-model="slideForm.primary_cta_url" label="Primary destination" placeholder="/shop" />
              <AppInput v-model="slideForm.secondary_cta_label" label="Secondary button" placeholder="View all" />
              <AppInput v-model="slideForm.secondary_cta_url" label="Secondary destination" placeholder="/shop" />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <AppSelect v-model="slideForm.text_position" label="Text position" :options="[{ label: 'Bottom left', value: 'bottom-left' }, { label: 'Center left', value: 'center-left' }, { label: 'Centered', value: 'center' }, { label: 'Bottom center', value: 'bottom-center' }]" />
              <AppSelect v-model="slideForm.text_theme" label="Text colour" :options="[{ label: 'Light', value: 'light', hint: 'For darker media' }, { label: 'Dark', value: 'dark', hint: 'For lighter media' }]" />
            </div>
            <div>
              <div class="mb-2 flex items-center justify-between"><p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">Media overlay</p><span class="text-[11px] font-medium text-gray-400">{{ slideForm.overlay_strength }}%</span></div>
              <input v-model.number="slideForm.overlay_strength" type="range" min="0" max="80" step="5" class="w-full accent-gray-950 dark:accent-white">
              <p class="mt-1 text-[11px] leading-5 text-gray-400 dark:text-gray-500">Use only enough overlay to keep text readable.</p>
            </div>
          </div>
        </div>

        <div v-else class="space-y-5">
          <div class="flex flex-col gap-4 rounded-[16px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035] sm:flex-row sm:items-end sm:justify-between">
            <div class="max-w-2xl">
              <p class="text-[13px] font-semibold text-gray-900 dark:text-white">Multi-panel story</p>
              <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">Desktop keeps all panels side by side with hover/focus reveal. Phones use a swipe rail with the next image peeking in, and the final panel closes edge-to-edge without an empty gap.</p>
            </div>
            <div class="w-full sm:w-52">
              <AppSelect v-model="panelCount" label="Images in this slide" :options="[{ label: '2 panels', value: 2 }, { label: '3 panels', value: 3 }, { label: '4 panels', value: 4 }]" />
            </div>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <article v-for="(panel, index) in panelDrafts.slice(0, panelCount)" :key="index" class="overflow-hidden rounded-[16px] border border-gray-950/[0.07] bg-white dark:border-white/[0.07] dark:bg-white/[0.025]">
              <div class="grid gap-4 p-4 sm:grid-cols-[150px_minmax(0,1fr)]">
                <div>
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">Panel {{ index + 1 }}</span>
                    <div class="flex items-center gap-1">
                      <button type="button" class="rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-gray-400 transition hover:bg-gray-950/[0.05] hover:text-gray-900 disabled:opacity-25 dark:hover:bg-white/[0.06] dark:hover:text-white" :disabled="index === 0" aria-label="Move panel earlier" @click="movePanel(index, -1)">←</button>
                      <button type="button" class="rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-gray-400 transition hover:bg-gray-950/[0.05] hover:text-gray-900 disabled:opacity-25 dark:hover:bg-white/[0.06] dark:hover:text-white" :disabled="index === panelCount - 1" aria-label="Move panel later" @click="movePanel(index, 1)">→</button>
                      <label class="ml-1 cursor-pointer text-[11px] font-semibold text-gray-700 underline decoration-gray-300 underline-offset-4 dark:text-gray-300">
                        {{ panelSource(panel) ? 'Replace' : 'Upload' }}
                        <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onPanelImage(index, $event)">
                      </label>
                    </div>
                  </div>
                  <div class="relative aspect-[4/5] overflow-hidden rounded-[12px] bg-gray-950/[0.04] dark:bg-white/[0.05]">
                    <img v-if="panelSource(panel)" :src="panelSource(panel) || ''" :alt="panel.alt_text || `Panel ${index + 1} preview`" class="h-full w-full object-cover">
                    <div v-else class="flex h-full items-center justify-center px-4 text-center text-[11px] leading-5 text-gray-400">Choose portrait or editorial image</div>
                  </div>
                </div>

                <div class="space-y-3">
                  <div class="grid gap-3 sm:grid-cols-2">
                    <AppInput v-model="panel.eyebrow" label="Eyebrow" placeholder="New arrival" />
                    <AppSelect v-model="panel.text_theme" label="Text colour" :options="[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]" />
                  </div>
                  <AppSelect
                    v-model="panel.text_position"
                    label="Content position"
                    :options="[
                      { label: 'Bottom left', value: 'bottom-left' },
                      { label: 'Center left', value: 'center-left' },
                      { label: 'Centered', value: 'center' },
                      { label: 'Bottom center', value: 'bottom-center' },
                      { label: 'Bottom right', value: 'bottom-right' },
                      { label: 'Center right', value: 'center-right' },
                    ]"
                  />
                  <AppRichTextEditor
                    v-model="panel.title"
                    label="Title"
                    placeholder="The summer edit"
                    mode="simple"
                    compact
                    weight-control
                  />
                  <AppRichTextEditor
                    v-model="panel.description"
                    label="Text"
                    placeholder="Short line shown with this image…"
                    mode="simple"
                    compact
                    weight-control
                  />
                  <div class="grid gap-3 sm:grid-cols-2">
                    <AppInput v-model="panel.cta_label" label="Button" placeholder="Explore" />
                    <AppInput v-model="panel.cta_url" label="Destination" placeholder="/shop/women" />
                  </div>
                  <AppInput v-model="panel.alt_text" label="Image alt text" placeholder="Describe the image" />
                </div>
              </div>
            </article>
          </div>
        </div>

        <div v-if="slideError" class="rounded-[10px] bg-red-500/[0.07] px-3 py-2.5 text-[12px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {{ slideError }}
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
      :message="`This will permanently remove ${richTextToPlain(slideToDelete?.title) || (slideToDelete?.layout_type === 'panels' ? 'this multi-panel story' : 'this slide')} and its uploaded media.`"
      confirm-label="Delete slide"
      :loading="deleting"
      :error="deleteError"
      @close="deleteOpen = false"
      @confirm="confirmDelete"
    />
  </div>
</template>
