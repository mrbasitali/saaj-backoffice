<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

type PredefinedMessages = Record<string, { title: string, message: string }>

type SiteMaintenance = {
  is_enabled: boolean
  message_type: 'maintenance' | 'coming_soon' | 'custom'
  custom_title: string | null
  custom_message: string | null
  resolved_title: string
  resolved_message: string
  predefined_messages: PredefinedMessages
  updater_name: string | null
  updated_at: string | null
}

type SiteMaintenanceResponse = { data: SiteMaintenance }

const { $api } = useNuxtApp()

const saving = ref(false)
const formError = ref('')
const notice = ref('')
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const form = reactive({
  is_enabled: false,
  message_type: 'maintenance' as 'maintenance' | 'coming_soon' | 'custom',
  custom_title: '',
  custom_message: '',
})

const {
  data,
  pending,
  error,
  refresh,
} = useAsyncData(
  'site-maintenance',
  () => $api<SiteMaintenanceResponse>('/admin/site-maintenance'),
  { immediate: true },
)

watch(data, (value) => {
  if (!value) return

  form.is_enabled = value.data.is_enabled
  form.message_type = value.data.message_type
  form.custom_title = value.data.custom_title ?? ''
  form.custom_message = value.data.custom_message ?? ''
}, { immediate: true })

const predefined = computed(() => data.value?.data.predefined_messages ?? {})

const typeOptions = computed(() => [
  {
    label: 'Under maintenance',
    value: 'maintenance',
    hint: predefined.value.maintenance?.title,
  },
  {
    label: 'Coming soon',
    value: 'coming_soon',
    hint: predefined.value.coming_soon?.title,
  },
  {
    label: 'Custom message',
    value: 'custom',
    hint: 'Write your own title and message',
  },
])

const previewTitle = computed(() => {
  if (form.message_type === 'custom') return form.custom_title || 'Your title here'

  return predefined.value[form.message_type]?.title ?? ''
})

const previewMessage = computed(() => {
  if (form.message_type === 'custom') return form.custom_message || 'Your message here'

  return predefined.value[form.message_type]?.message ?? ''
})

function showNotice(message: string) {
  notice.value = message

  if (noticeTimer.value) clearTimeout(noticeTimer.value)

  noticeTimer.value = setTimeout(() => { notice.value = '' }, 4000)
}

async function submit() {
  saving.value = true
  formError.value = ''

  try {
    const response = await $api<{ message: string, data: SiteMaintenance }>('/admin/site-maintenance', {
      method: 'PUT',
      body: {
        is_enabled: form.is_enabled,
        message_type: form.message_type,
        custom_title: form.message_type === 'custom' ? form.custom_title : null,
        custom_message: form.message_type === 'custom' ? form.custom_message : null,
      },
    })

    showNotice(response.message)
    await refresh()
  } catch (err: any) {
    formError.value = err?.data?.message || 'Could not save maintenance settings.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-[900px]">
    <div class="space-y-4 sm:space-y-5">
      <AppPageHeader
        eyebrow="Settings"
        title="Maintenance Mode"
        description="Take the storefront and app offline with a nice message, before launch or during scheduled work. The admin backoffice is never affected."
      />

      <div
        v-if="notice"
        class="rounded-[12px] bg-emerald-500/[0.07] p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      >
        {{ notice }}
      </div>

      <AppErrorState
        v-if="error"
        title="Maintenance settings could not be loaded"
        message="Please check backend API, authentication token, or route permissions."
        @retry="refresh"
      />

      <template v-else>
        <AppCard class="p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-gray-950 dark:text-white">
                {{ form.is_enabled ? 'Storefront is currently OFFLINE' : 'Storefront is currently LIVE' }}
              </p>

              <p class="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
                {{ form.is_enabled
                  ? 'Visitors see the message below instead of the site. Registration and login are also paused.'
                  : 'Visitors see the site normally.' }}
              </p>
            </div>

            <AppToggle
              v-model="form.is_enabled"
              :disabled="pending"
            />
          </div>
        </AppCard>

        <AppCard class="p-5">
          <p class="text-sm font-semibold text-gray-950 dark:text-white">
            Message
          </p>

          <div class="mt-4 grid gap-4 sm:grid-cols-3">
            <button
              v-for="option in typeOptions"
              :key="option.value"
              type="button"
              class="rounded-[14px] border p-4 text-left transition"
              :class="form.message_type === option.value
                ? 'border-gray-950 bg-gray-950/[0.03] dark:border-white dark:bg-white/[0.06]'
                : 'border-gray-200 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20'"
              @click="form.message_type = option.value as typeof form.message_type"
            >
              <p class="text-sm font-semibold text-gray-950 dark:text-white">{{ option.label }}</p>
              <p class="mt-1 truncate text-[12px] text-gray-400">{{ option.hint }}</p>
            </button>
          </div>

          <div
            v-if="form.message_type === 'custom'"
            class="mt-5 grid gap-4"
          >
            <AppInput
              v-model="form.custom_title"
              label="Title"
              placeholder="We'll be right back"
            />

            <AppTextarea
              v-model="form.custom_message"
              label="Message"
              placeholder="Tell visitors what's going on and when to check back..."
              rows="4"
            />
          </div>

          <div class="mt-5">
            <p class="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-gray-400">
              Preview
            </p>

            <div class="rounded-[16px] bg-gray-950/[0.03] p-8 text-center dark:bg-white/[0.04]">
              <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-950/[0.06] dark:bg-white/[0.09]">
                <AppNavIcon
                  :name="form.message_type === 'coming_soon' ? 'sun' : 'sliders'"
                  :size="24"
                />
              </div>

              <p class="mt-4 text-[17px] font-semibold text-gray-950 dark:text-white">
                {{ previewTitle }}
              </p>

              <p class="mx-auto mt-2 max-w-[420px] text-[13px] leading-6 text-gray-500 dark:text-gray-400">
                {{ previewMessage }}
              </p>
            </div>
          </div>
        </AppCard>

        <div
          v-if="formError"
          class="rounded-[12px] bg-red-500/[0.07] p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
        >
          {{ formError }}
        </div>

        <div class="flex items-center justify-between">
          <p
            v-if="data?.data.updater_name"
            class="text-[12px] text-gray-400"
          >
            Last changed by {{ data.data.updater_name }}
          </p>
          <span v-else />

          <AppButton
            :loading="saving"
            @click="submit"
          >
            {{ saving ? 'Saving...' : 'Save changes' }}
          </AppButton>
        </div>
      </template>
    </div>
  </section>
</template>
