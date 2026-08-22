<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Site Settings',
})

type Settings = {
  navbar_logo_light_url: string | null
  navbar_logo_dark_url: string | null
  footer_logo_light_url: string | null
  footer_logo_dark_url: string | null
  invoice_logo_url: string | null
  invoice_company_name: string | null
  invoice_contact_details: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_whatsapp: string | null
  contact_address: string | null
  bank_details: string | null
  currency: string | null
  show_sold_out_products: boolean
  stacked_product_gallery_enabled: boolean
  editorial_gallery_padding_enabled: boolean
  direct_buy_now_enabled: boolean
  admin_order_notification_emails: string[]
  social_facebook_enabled: boolean
  social_facebook_url: string | null
  social_instagram_enabled: boolean
  social_instagram_url: string | null
  social_tiktok_enabled: boolean
  social_tiktok_url: string | null
  social_youtube_enabled: boolean
  social_youtube_url: string | null
  social_whatsapp_enabled: boolean
  social_whatsapp_url: string | null
  social_twitter_enabled: boolean
  social_twitter_url: string | null
}

const { $api } = useNuxtApp()

const { data, refresh } = await useAsyncData('admin-site-settings', () =>
  $api<{ data: Settings }>('/admin/site-settings'),
)

const form = reactive<Settings>({
  navbar_logo_light_url: null,
  navbar_logo_dark_url: null,
  footer_logo_light_url: null,
  footer_logo_dark_url: null,
  invoice_logo_url: null,
  invoice_company_name: null,
  invoice_contact_details: null,
  contact_email: null,
  contact_phone: null,
  contact_whatsapp: null,
  contact_address: null,
  bank_details: null,
  currency: 'PKR',
  show_sold_out_products: true,
  stacked_product_gallery_enabled: false,
  editorial_gallery_padding_enabled: true,
  direct_buy_now_enabled: false,
  admin_order_notification_emails: [],
  social_facebook_enabled: false,
  social_facebook_url: null,
  social_instagram_enabled: false,
  social_instagram_url: null,
  social_tiktok_enabled: false,
  social_tiktok_url: null,
  social_youtube_enabled: false,
  social_youtube_url: null,
  social_whatsapp_enabled: false,
  social_whatsapp_url: null,
  social_twitter_enabled: false,
  social_twitter_url: null,
})

watchEffect(() => {
  if (data.value?.data) Object.assign(form, data.value.data)
})

const WEBSITE_LOGO_SLOTS = [
  { key: 'navbar_logo_light', label: 'Navbar logo — light background' },
  { key: 'navbar_logo_dark', label: 'Navbar logo — dark background' },
  { key: 'footer_logo_light', label: 'Footer logo — light background' },
  { key: 'footer_logo_dark', label: 'Footer logo — dark background' },
] as const

const ALL_LOGO_KEYS = [
  ...WEBSITE_LOGO_SLOTS.map(slot => slot.key),
  'invoice_logo',
] as const

const logoFiles = reactive<Record<string, File | null>>({})
const logoPreviews = reactive<Record<string, string | null>>({})

function revokeLogoPreview(key: string) {
  const preview = logoPreviews[key]

  if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
}

function onLogoChange(key: string, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null

  revokeLogoPreview(key)
  logoFiles[key] = file
  logoPreviews[key] = file ? URL.createObjectURL(file) : null
}

function clearLogo(key: string) {
  revokeLogoPreview(key)
  logoFiles[key] = null
  logoPreviews[key] = null
  ;(form as any)[`${key}_url`] = null
}

function currentLogoSrc(key: string): string | null {
  return logoPreviews[key] ?? (form as any)[`${key}_url`] ?? null
}

onBeforeUnmount(() => {
  for (const key of Object.keys(logoPreviews)) revokeLogoPreview(key)
})

const saving = ref(false)
const formError = ref('')
const success = ref(false)
const adminNotificationEmail = ref('')

function addAdminNotificationEmail() {
  const email = adminNotificationEmail.value.trim().toLowerCase()
  if (!email) return

  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!looksLikeEmail) {
    formError.value = 'Enter a valid notification email address.'
    return
  }

  if (form.admin_order_notification_emails.length >= 10) {
    formError.value = 'You can add up to 10 notification recipients.'
    return
  }

  if (!form.admin_order_notification_emails.some(item => item.toLowerCase() === email)) {
    form.admin_order_notification_emails.push(email)
  }

  adminNotificationEmail.value = ''
  formError.value = ''
}

function removeAdminNotificationEmail(index: number) {
  form.admin_order_notification_emails.splice(index, 1)
}


function buildFormData() {
  const body = new FormData()

  body.append('_method', 'PUT')

  for (const key of ALL_LOGO_KEYS) {
    const file = logoFiles[key]

    if (file) {
      body.append(`${key}_image`, file)
    } else if ((form as any)[`${key}_url`] === null) {
      // Explicit clear — tell the backend this slot was intentionally
      // emptied, not just "not included in this submission."
      body.append(`${key}_url`, '')
    }
  }

  const textFields: Array<keyof Settings> = [
    'contact_email',
    'contact_phone',
    'contact_whatsapp',
    'contact_address',
    'invoice_company_name',
    'invoice_contact_details',
    'bank_details',
    'currency',
  ]

  for (const field of textFields) {
    let value = form[field] ?? ''

    if (field === 'currency' && typeof value === 'string') {
      value = value.trim().toUpperCase()
    }

    body.append(field, String(value))
  }

  body.append('show_sold_out_products', form.show_sold_out_products ? '1' : '0')
  body.append('stacked_product_gallery_enabled', form.stacked_product_gallery_enabled ? '1' : '0')
  body.append('editorial_gallery_padding_enabled', form.editorial_gallery_padding_enabled ? '1' : '0')
  body.append('direct_buy_now_enabled', form.direct_buy_now_enabled ? '1' : '0')
  body.append('admin_order_notification_emails', JSON.stringify(form.admin_order_notification_emails))

  const socialPlatforms = ['facebook', 'instagram', 'tiktok', 'youtube', 'whatsapp', 'twitter']

  for (const platform of socialPlatforms) {
    body.append(`social_${platform}_enabled`, (form as any)[`social_${platform}_enabled`] ? '1' : '0')
    body.append(`social_${platform}_url`, (form as any)[`social_${platform}_url`] ?? '')
  }

  return body
}

async function submit() {
  saving.value = true
  formError.value = ''
  success.value = false

  try {
    await $api('/admin/site-settings', {
      method: 'POST',
      body: buildFormData(),
    })

    for (const key of Object.keys(logoFiles)) {
      revokeLogoPreview(key)
      logoFiles[key] = null
      logoPreviews[key] = null
    }

    await refresh()
    success.value = true
  } catch (error: any) {
    formError.value = extractApiErrorMessage(error, 'Could not save site settings.')
  } finally {
    saving.value = false
  }
}

const socialConfig = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'twitter', label: 'X / Twitter' },
] as const
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <AppPageHeader
      title="Site Settings"
      description="Manage website identity, contact information, invoice details, and social links from one place."
    />

    <form
      class="mt-6 space-y-8"
      @submit.prevent="submit"
    >
      <AppCard class="p-5 sm:p-6">
        <div>
          <p class="text-sm font-semibold text-gray-950 dark:text-white">
            Website logos
          </p>
          <p class="mt-1 text-[13px] leading-5 text-gray-400 dark:text-gray-500">
            Used in the storefront navigation and footer. Invoice branding is managed separately below.
          </p>
        </div>

        <div class="mt-5 grid gap-6 sm:grid-cols-2">
          <div
            v-for="slot in WEBSITE_LOGO_SLOTS"
            :key="slot.key"
          >
            <p class="mb-2 text-[13px] font-medium text-gray-700 dark:text-gray-300">
              {{ slot.label }}
            </p>

            <div
              class="flex h-24 items-center justify-center rounded-[12px] border border-dashed border-gray-300 bg-gray-950/[0.02] dark:border-white/15 dark:bg-white/[0.02]"
              :class="slot.key.includes('dark') ? 'bg-gray-950 dark:bg-black/30' : ''"
            >
              <img
                v-if="currentLogoSrc(slot.key)"
                :src="currentLogoSrc(slot.key)!"
                :alt="slot.label"
                class="max-h-16 max-w-[80%] object-contain"
              >
              <span
                v-else
                class="text-xs text-gray-400"
              >No logo set</span>
            </div>

            <div class="mt-2 flex items-center gap-3">
              <label class="cursor-pointer text-[13px] font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 dark:text-gray-300">
                Upload
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  class="hidden"
                  @change="onLogoChange(slot.key, $event)"
                >
              </label>

              <button
                v-if="currentLogoSrc(slot.key)"
                type="button"
                class="text-[13px] text-red-600 hover:underline dark:text-red-400"
                @click="clearLogo(slot.key)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard class="p-5 sm:p-6">
        <div>
          <p class="text-sm font-semibold text-gray-950 dark:text-white">
            Website contact details
          </p>
          <p class="mt-1 text-[13px] leading-5 text-gray-400 dark:text-gray-500">
            General contact information for the storefront and customer-facing website areas.
          </p>
        </div>

        <div class="mt-5 grid gap-5 sm:grid-cols-2">
          <AppInput
            v-model="form.contact_email"
            label="Email"
            type="email"
          />
          <AppInput
            v-model="form.contact_phone"
            label="Phone"
          />
          <AppInput
            v-model="form.contact_whatsapp"
            label="WhatsApp number"
          />
        </div>

        <div class="mt-5">
          <div class="mb-2">
            <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">
              Address
            </p>
            <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
              Use Enter for a normal compact new line. Use the Gap control only where you intentionally want extra space.
            </p>
          </div>

          <AppRichTextEditor
            v-model="form.contact_address"
            mode="simple"
            compact
            spacing-control
            placeholder="Office, showroom, city, country…"
          />
        </div>
      </AppCard>

      <AppCard class="overflow-hidden">
        <div class="p-5 sm:p-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div>
              <p class="text-sm font-semibold text-gray-950 dark:text-white">
                Invoice & receipt information
              </p>
              <p class="mt-1 max-w-2xl text-[13px] leading-5 text-gray-400 dark:text-gray-500">
                This information is used on invoices, receipts, payment vouchers, and PDF reports.
              </p>
            </div>

            <span class="w-fit rounded-full bg-gray-950/[0.05] px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:bg-white/[0.07] dark:text-gray-400">
              .env used only when empty
            </span>
          </div>

          <div class="mt-6 grid gap-6 sm:grid-cols-[210px_minmax(0,1fr)] sm:items-start">
            <div>
              <p class="mb-2 text-[12px] font-medium text-gray-600 dark:text-gray-400">
                Invoice / receipt logo
              </p>

              <div class="flex h-28 items-center justify-center rounded-[14px] bg-gray-950/[0.035] px-4 dark:bg-white/[0.055]">
                <img
                  v-if="currentLogoSrc('invoice_logo')"
                  :src="currentLogoSrc('invoice_logo')!"
                  alt="Invoice / receipt logo"
                  class="max-h-20 max-w-full object-contain"
                >
                <div
                  v-else
                  class="text-center"
                >
                  <p class="text-[12px] font-medium text-gray-400">
                    No invoice logo
                  </p>
                  <p class="mt-1 text-[11px] text-gray-400/80 dark:text-gray-600">
                    Website logo is not used automatically
                  </p>
                </div>
              </div>

              <div class="mt-2 flex items-center gap-3">
                <label class="cursor-pointer text-[13px] font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 dark:text-gray-300">
                  Upload
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    class="hidden"
                    @change="onLogoChange('invoice_logo', $event)"
                  >
                </label>

                <button
                  v-if="currentLogoSrc('invoice_logo')"
                  type="button"
                  class="text-[13px] text-red-600 hover:underline dark:text-red-400"
                  @click="clearLogo('invoice_logo')"
                >
                  Remove
                </button>
              </div>
            </div>

            <div class="grid gap-5 sm:grid-cols-[minmax(0,1fr)_150px]">
              <AppInput
                v-model="form.invoice_company_name"
                label="Company / brand name"
                placeholder="Saaj"
              />

              <AppInput
                v-model="form.currency"
                label="Currency code"
                placeholder="PKR"
              />
            </div>
          </div>

          <div class="mt-7">
            <div class="mb-2">
              <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">
                Invoice contact details
              </p>
              <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
                Add phone, email, address, tax information, or other business details. Lines are compact by default; use Gap when you want deliberate spacing.
              </p>
            </div>

            <AppRichTextEditor
              v-model="form.invoice_contact_details"
              compact
              spacing-control
              placeholder="Phone, email, address, tax details…"
            />
          </div>

          <div class="mt-7">
            <div class="mb-2">
              <p class="text-[12px] font-medium text-gray-600 dark:text-gray-400">
                Bank details
              </p>
              <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
                Add account title, bank name, IBAN/account number, or payment instructions. Lines are compact by default; use Gap only where needed.
              </p>
            </div>

            <AppRichTextEditor
              v-model="form.bank_details"
              compact
              spacing-control
              placeholder="Bank name, account title, IBAN, payment instructions…"
            />
          </div>
        </div>
      </AppCard>

      <AppCard class="p-5 sm:p-6">
        <div>
          <p class="text-sm font-semibold text-gray-950 dark:text-white">New online order notifications</p>
          <p class="mt-1 max-w-2xl text-[13px] leading-5 text-gray-400 dark:text-gray-500">
            Add one or more inboxes that should receive the complete order summary whenever a customer places an order on the website.
          </p>
        </div>

        <div class="mt-5 rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
          <div class="flex flex-col gap-3 sm:flex-row">
            <input
              v-model.trim="adminNotificationEmail"
              type="email"
              autocomplete="email"
              placeholder="orders@saaj.pk"
              class="min-h-11 flex-1 rounded-[10px] border border-gray-950/10 bg-white px-3.5 text-[13px] text-gray-900 outline-none transition focus:border-gray-950/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-white/25"
              @keydown.enter.prevent="addAdminNotificationEmail"
            >
            <AppButton type="button" variant="secondary" @click="addAdminNotificationEmail">Add recipient</AppButton>
          </div>

          <div v-if="form.admin_order_notification_emails.length" class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="(email, index) in form.admin_order_notification_emails"
              :key="email"
              class="inline-flex items-center gap-2 rounded-full bg-violet-500/[0.09] px-3 py-1.5 text-[11px] font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
            >
              {{ email }}
              <button type="button" class="flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/10" :aria-label="`Remove ${email}`" @click="removeAdminNotificationEmail(index)">×</button>
            </span>
          </div>
          <p v-else class="mt-4 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
            No recipients added. New-order admin emails are currently off; unread-order indicators in Backoffice still work.
          </p>
          <p class="mt-3 text-[11px] leading-5 text-gray-400 dark:text-gray-500">Maximum 10 recipients. Each receives product details, quantities, delivery address and the full order total.</p>
        </div>
      </AppCard>

      <AppCard class="p-5 sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold text-gray-950 dark:text-white">
              Storefront catalogue
            </p>
            <p class="mt-1 max-w-2xl text-[13px] leading-5 text-gray-400 dark:text-gray-500">
              Control whether products with no purchasable active variant remain visible in storefront product lists.
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-3">
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-medium"
              :class="form.show_sold_out_products
                ? 'bg-emerald-500/[0.08] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-gray-950/[0.05] text-gray-500 dark:bg-white/[0.07] dark:text-gray-400'"
            >
              {{ form.show_sold_out_products ? 'Shown' : 'Hidden' }}
            </span>
            <AppToggle v-model="form.show_sold_out_products" />
          </div>
        </div>

        <div class="mt-5 rounded-[12px] bg-gray-950/[0.025] px-4 py-3.5 dark:bg-white/[0.035]">
          <p class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
            Show sold-out products
          </p>
          <p class="mt-1 text-[12px] leading-5 text-gray-400 dark:text-gray-500">
            When enabled, sold-out products stay visible and their thumbnails display a Sold out badge. When disabled, they are hidden from catalogue, featured, related, search, and wishlist product lists. Direct product links remain available.
          </p>
        </div>
      </AppCard>

      <AppCard class="p-5 sm:p-6">
        <div>
          <p class="text-sm font-semibold text-gray-950 dark:text-white">
            Product page experience
          </p>
          <p class="mt-1 max-w-2xl text-[13px] leading-5 text-gray-400 dark:text-gray-500">
            Choose the storefront product-gallery experience and the primary purchase action without changing product data.
          </p>
        </div>

        <div class="mt-5 divide-y divide-gray-950/[0.06] overflow-hidden rounded-[14px] bg-gray-950/[0.025] dark:divide-white/[0.07] dark:bg-white/[0.035]">
          <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-7">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2.5">
                <p class="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                  Editorial stacked gallery
                </p>
                <span
                  class="rounded-full px-2.5 py-1 text-[11px] font-medium"
                  :class="form.stacked_product_gallery_enabled
                    ? 'bg-violet-500/[0.09] text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
                    : 'bg-gray-950/[0.05] text-gray-500 dark:bg-white/[0.07] dark:text-gray-400'"
                >
                  {{ form.stacked_product_gallery_enabled ? 'Editorial' : 'Classic' }}
                </span>
              </div>
              <p class="mt-1.5 max-w-2xl text-[12px] leading-5 text-gray-400 dark:text-gray-500">
                Desktop shows full product images stacked vertically with a wider sticky purchase rail beside them. Mobile keeps the normal filled swipe gallery first, then pins the image while product information scrolls over it. Turn this off to keep the current classic gallery.
              </p>
            </div>
            <AppToggle v-model="form.stacked_product_gallery_enabled" class="shrink-0" />
          </div>

          <div
            class="flex flex-col gap-4 p-4 transition-opacity sm:flex-row sm:items-center sm:justify-between sm:gap-7"
            :class="form.stacked_product_gallery_enabled ? 'opacity-100' : 'opacity-55'"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2.5">
                <p class="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                  Editorial gallery padding
                </p>
                <span
                  class="rounded-full px-2.5 py-1 text-[11px] font-medium"
                  :class="form.editorial_gallery_padding_enabled
                    ? 'bg-sky-500/[0.09] text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
                    : 'bg-amber-500/[0.09] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'"
                >
                  {{ form.editorial_gallery_padding_enabled ? 'Padded' : 'Full bleed' }}
                </span>
              </div>
              <p class="mt-1.5 max-w-2xl text-[12px] leading-5 text-gray-400 dark:text-gray-500">
                Desktop editorial gallery only. Padded keeps the current breathing room and contains each image. Full bleed removes the gallery padding and lets each source image span the full media width at its natural aspect ratio, so the whole photograph remains visible without artificial zoom or cropping.
              </p>
            </div>
            <AppToggle
              v-model="form.editorial_gallery_padding_enabled"
              class="shrink-0"
              :disabled="!form.stacked_product_gallery_enabled"
            />
          </div>

          <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-7">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2.5">
                <p class="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                  Show Buy now button
                </p>
                <span
                  class="rounded-full px-2.5 py-1 text-[11px] font-medium"
                  :class="form.direct_buy_now_enabled
                    ? 'bg-emerald-500/[0.09] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'bg-gray-950/[0.05] text-gray-500 dark:bg-white/[0.07] dark:text-gray-400'"
                >
                  {{ form.direct_buy_now_enabled ? 'Two actions' : 'Add to bag only' }}
                </span>
              </div>
              <p class="mt-1.5 max-w-2xl text-[12px] leading-5 text-gray-400 dark:text-gray-500">
                When enabled, customers see both Add to bag and Buy now. Add to bag keeps the confirmation drawer, while Buy now adds the selected variant and goes straight to checkout. When disabled, only Add to bag is shown.
              </p>
            </div>
            <AppToggle v-model="form.direct_buy_now_enabled" class="shrink-0" />
          </div>
        </div>
      </AppCard>

      <AppCard class="p-5 sm:p-6">
        <div>
          <p class="text-sm font-semibold text-gray-950 dark:text-white">
            Social media
          </p>
          <p class="mt-1 text-[13px] leading-5 text-gray-400 dark:text-gray-500">
            Enable only the channels that should be shown on the storefront.
          </p>
        </div>

        <div class="mt-5 space-y-4">
          <div
            v-for="platform in socialConfig"
            :key="platform.key"
            class="flex items-center gap-4"
          >
            <div class="flex w-40 shrink-0 items-center gap-3">
              <AppToggle v-model="(form as any)[`social_${platform.key}_enabled`]" />
              <span class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
                {{ platform.label }}
              </span>
            </div>
            <input
              v-model="(form as any)[`social_${platform.key}_url`]"
              type="url"
              :disabled="!(form as any)[`social_${platform.key}_enabled`]"
              placeholder="https://..."
              class="min-w-0 flex-1 rounded-[10px] bg-gray-950/[0.04] px-3.5 py-2.5 text-[13px] text-gray-950 outline-none transition hover:bg-gray-950/[0.055] focus:bg-gray-950/[0.055] focus:ring-2 focus:ring-gray-950/10 disabled:opacity-50 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.075] dark:focus:bg-white/[0.08] dark:focus:ring-white/10"
            >
          </div>
        </div>
      </AppCard>

      <div
        v-if="formError"
        class="rounded-[12px] bg-red-500/[0.07] p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
      >
        {{ formError }}
      </div>
      <div
        v-if="success"
        class="rounded-[12px] bg-emerald-500/[0.07] p-4 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      >
        Settings saved successfully.
      </div>

      <div class="flex justify-end">
        <AppButton
          type="submit"
          :loading="saving"
        >
          {{ saving ? 'Saving...' : 'Save settings' }}
        </AppButton>
      </div>
    </form>
  </div>
</template>
