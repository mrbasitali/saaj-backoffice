<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin', title: 'SEO Google Sheets' })

type Connection = {
  id: number
  name: string
  spreadsheet_url: string
  tab_name: string
  header_row: number
  is_active: boolean
  sync_status: 'idle' | 'queued' | 'running' | 'success' | 'failed'
  sync_started_at: string | null
  last_synced_at: string | null
  last_products_synced: number
  last_seo_applied: number
  last_seo_rejected: number
  last_unmatched_rows: number
  last_error: string | null
}
type ConnectionsResponse = {
  data: Connection[]
  service_account_email: string | null
  credentials_configured: boolean
  automatic_sync_enabled: boolean
}
const { $api } = useNuxtApp()
const { data, pending, error, refresh } = useAsyncData('admin-seo-sheets', () => $api<ConnectionsResponse>('/admin/seo-sheets'))
const connections = computed(() => data.value?.data ?? [])
const formOpen = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const workingId = ref<number | null>(null)
const formError = ref('')
const operationError = ref('')
const notice = ref('')
const deleteTarget = ref<Connection | null>(null)
const deleting = ref(false)
const form = reactive({ name: 'SAAJ SEO Catalog', spreadsheet_url: '', tab_name: 'Sheet1', header_row: 1, is_active: true })

function createConnection() {
  editingId.value = null
  Object.assign(form, { name: 'SAAJ SEO Catalog', spreadsheet_url: '', tab_name: 'Sheet1', header_row: 1, is_active: !connections.value.some(c => c.is_active) })
  formError.value = ''
  formOpen.value = true
}
function editConnection(connection: Connection) {
  editingId.value = connection.id
  Object.assign(form, { name: connection.name, spreadsheet_url: connection.spreadsheet_url, tab_name: connection.tab_name, header_row: connection.header_row, is_active: connection.is_active })
  formError.value = ''
  formOpen.value = true
}
async function save() {
  saving.value = true
  formError.value = ''
  try {
    const path = editingId.value ? `/admin/seo-sheets/${editingId.value}` : '/admin/seo-sheets'
    const response = await $api<{ message: string }>(path, { method: editingId.value ? 'PUT' : 'POST', body: { ...form, header_row: Number(form.header_row) } })
    formOpen.value = false
    notice.value = response.message
    await refresh()
  } catch (err: any) {
    formError.value = err?.data?.errors ? Object.values(err.data.errors).flat().join(' ') : (err?.data?.message ?? 'Could not save the spreadsheet.')
  } finally {
    saving.value = false
  }
}
async function test(connection: Connection) {
  workingId.value = connection.id
  operationError.value = ''
  notice.value = ''
  try {
    const result = await $api<{ message: string }>(`/admin/seo-sheets/${connection.id}/test`, { method: 'POST' })
    notice.value = result.message
  } catch (err: any) {
    operationError.value = err?.data?.message || 'Unable to connect to Google Sheets.'
  } finally {
    workingId.value = null
  }
}
async function sync(connection: Connection) {
  workingId.value = connection.id
  operationError.value = ''
  notice.value = ''
  try {
    const result = await $api<{ message: string }>(`/admin/seo-sheets/${connection.id}/sync`, { method: 'POST' })
    notice.value = result.message
    await refresh()
  } catch (err: any) {
    operationError.value = err?.data?.message || 'Unable to start sync.'
  } finally {
    workingId.value = null
  }
}
async function removeConnection() {
  if (!deleteTarget.value) return
  deleting.value = true
  operationError.value = ''
  try {
    const result = await $api<{ message: string }>(`/admin/seo-sheets/${deleteTarget.value.id}`, { method: 'DELETE' })
    notice.value = result.message
    deleteTarget.value = null
    await refresh()
  } catch (err: any) {
    operationError.value = err?.data?.message || 'Could not disconnect the sheet.'
    deleteTarget.value = null
  } finally {
    deleting.value = false
  }
}
let poller: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  poller = setInterval(() => {
    if (connections.value.some(c => isBusy(c))) refresh()
  }, 5000)
})
onUnmounted(() => { if (poller) clearInterval(poller) })
const displayDate = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not yet synced'
const isBusy = (connection: Connection) => ['queued', 'running'].includes(connection.sync_status)
  && !!connection.sync_started_at
  && (Date.now() - new Date(connection.sync_started_at).getTime()) < 10 * 60 * 1000
</script>

<template>
  <section class="mx-auto max-w-[1100px] space-y-4 sm:space-y-5">
    <AppPageHeader
      eyebrow="Settings"
      title="SEO Google Sheets"
      description="Give your SEO team a shared catalog workspace while SAAJ stays in charge of product details, availability and publishing."
    >
      <template #actions>
        <AppButton variant="secondary" :loading="pending" @click="refresh">Refresh</AppButton>
        <AppButton @click="createConnection">+ Connect sheet</AppButton>
      </template>
    </AppPageHeader>

    <p v-if="notice" role="status" class="rounded-xl bg-emerald-500/[0.07] px-4 py-3 text-[13px] text-emerald-700 dark:text-emerald-300">{{ notice }}</p>
    <p v-if="operationError" role="alert" class="rounded-xl bg-red-500/[0.07] px-4 py-3 text-[13px] text-red-700 dark:text-red-300">{{ operationError }}</p>

    <AppErrorState v-if="error" title="Unable to load SEO connections" message="Check the API and your administrator permissions." @retry="refresh" />
    <template v-else>
      <div class="grid gap-3 md:grid-cols-3">
        <AppCard class="p-5">
          <p class="text-[11px] font-medium uppercase tracking-wider text-gray-400">Connection</p>
          <p class="mt-2 text-[16px] font-semibold text-gray-950 dark:text-white">{{ connections.some(c => c.is_active) ? 'Sheet selected' : 'Not configured' }}</p>
          <p class="mt-1 text-[12px] text-gray-400">One active SEO sheet per SAAJ environment</p>
        </AppCard>
        <AppCard class="p-5">
          <p class="text-[11px] font-medium uppercase tracking-wider text-gray-400">Google authorization</p>
          <p class="mt-2 text-[16px] font-semibold text-gray-950 dark:text-white">{{ data?.credentials_configured ? 'Credentials ready' : 'Credentials required' }}</p>
          <p class="mt-1 text-[12px] text-gray-400">Configured privately in the Laravel environment</p>
        </AppCard>
        <AppCard class="p-5">
          <p class="text-[11px] font-medium uppercase tracking-wider text-gray-400">Automatic sync</p>
          <p class="mt-2 text-[16px] font-semibold text-gray-950 dark:text-white">{{ data?.automatic_sync_enabled ? 'Enabled' : 'Off — local testing' }}</p>
          <p class="mt-1 text-[12px] text-gray-400">Requires the queue worker and Laravel scheduler</p>
        </AppCard>
      </div>

      <AppCard class="space-y-4 p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-lg text-emerald-600">G</div>
          <div class="min-w-0 flex-1">
            <h2 class="text-sm font-semibold text-gray-950 dark:text-white">Connect a test spreadsheet first</h2>
            <p class="mt-1 text-[12px] leading-5 text-gray-500 dark:text-gray-400">
              Create a blank sheet, share it with the service-account email as <strong>Editor</strong>, then paste its link below. The first sync adds the catalog headings and products. Existing sheet SEO columns and custom columns are preserved.
            </p>
            <p class="mt-2 break-all rounded-lg bg-gray-950/[0.035] px-3 py-2 font-mono text-[12px] text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">
              {{ data?.service_account_email || 'Set GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON_BASE64 in Laravel to reveal the service-account email' }}
            </p>
            <a class="mt-3 inline-block text-[12px] font-semibold text-gray-950 underline underline-offset-4 dark:text-white" href="https://sheets.new" target="_blank" rel="noopener noreferrer">Create a blank Google Sheet ↗</a>
          </div>
        </div>
      </AppCard>

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-950 dark:text-white">Connected spreadsheets</h2>
          <span class="text-[12px] text-gray-400">{{ connections.length }} saved</span>
        </div>
        <AppCard v-if="!connections.length && !pending" class="p-10 text-center">
          <p class="text-sm font-semibold text-gray-950 dark:text-white">No sheets connected yet</p>
          <p class="mt-1 text-[12px] text-gray-400">Start with a new, separate testing sheet. Your live SEO spreadsheet will remain unchanged.</p>
          <AppButton class="mt-4" @click="createConnection">Connect your first sheet</AppButton>
        </AppCard>
        <AppCard v-for="connection in connections" :key="connection.id" class="p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0 space-y-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-sm font-semibold text-gray-950 dark:text-white">{{ connection.name }}</h3>
                <span v-if="connection.is_active" class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Active</span>
                <span v-else class="rounded-full bg-gray-950/[0.055] px-2 py-0.5 text-[11px] text-gray-500 dark:bg-white/10">Inactive</span>
                <span v-if="isBusy(connection)" class="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">{{ connection.sync_status }}</span>
                <span v-if="!isBusy(connection) && ['queued', 'running'].includes(connection.sync_status)" class="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-600">Stalled — retry sync</span>
                <span v-if="connection.sync_status === 'failed'" class="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] text-red-600 dark:text-red-400">Sync failed</span>
              </div>
              <p class="text-[12px] text-gray-400">Tab: {{ connection.tab_name }} · Header row {{ connection.header_row }} · {{ displayDate(connection.last_synced_at) }}</p>
              <a :href="connection.spreadsheet_url" target="_blank" rel="noopener noreferrer" class="inline-block max-w-full truncate text-[12px] text-gray-700 underline underline-offset-4 dark:text-gray-300">Open spreadsheet ↗</a>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <AppButton variant="secondary" size="sm" :loading="workingId === connection.id" :disabled="isBusy(connection)" @click="test(connection)">Test access</AppButton>
              <AppButton size="sm" :loading="workingId === connection.id" :disabled="isBusy(connection) || !data?.credentials_configured" @click="sync(connection)">Sync now</AppButton>
              <AppButton variant="ghost" size="sm" :disabled="isBusy(connection)" @click="editConnection(connection)">Edit</AppButton>
              <AppButton variant="ghost" size="sm" :disabled="isBusy(connection)" @click="deleteTarget = connection">Disconnect</AppButton>
            </div>
          </div>
          <div class="mt-5 grid grid-cols-2 gap-3 border-t border-gray-950/[0.06] pt-4 dark:border-white/[0.07] sm:grid-cols-4">
            <div><p class="text-[11px] text-gray-400">Last catalog sync</p><p class="mt-1 text-lg font-semibold text-gray-950 dark:text-white">{{ connection.last_products_synced }}</p></div>
            <div><p class="text-[11px] text-gray-400">SEO changes applied</p><p class="mt-1 text-lg font-semibold text-gray-950 dark:text-white">{{ connection.last_seo_applied }}</p></div>
            <div><p class="text-[11px] text-gray-400">Needs review</p><p class="mt-1 text-lg font-semibold text-gray-950 dark:text-white">{{ connection.last_seo_rejected }}</p></div>
            <div><p class="text-[11px] text-gray-400">Last result</p><p class="mt-1 text-[13px] font-semibold capitalize text-gray-700 dark:text-gray-200">{{ connection.sync_status }}</p></div>
          </div>
          <p v-if="connection.last_error" class="mt-3 rounded-lg bg-red-500/[0.06] p-3 text-[12px] text-red-600 dark:text-red-400">{{ connection.last_error }}</p>
        </AppCard>
      </div>

      <AppCard class="p-5 sm:p-6">
        <h2 class="text-sm font-semibold text-gray-950 dark:text-white">How approvals work</h2>
        <p class="mt-2 text-[12px] leading-6 text-gray-500 dark:text-gray-400">
          SAAJ controls item code, SKU, category, brand, URL, stock and publishing status. Your team edits <strong>Meta Title</strong> and <strong>Meta Description</strong> in the sheet, then sets <strong>SEO Status</strong> to <strong>Ready</strong>. The next sync validates and applies those two fields only; it marks the row <strong>Applied</strong>. Rows marked <strong>Conflict</strong> or <strong>Invalid SEO</strong> need review. Do not edit Product ID or SEO Revision. Protect those columns in Google Sheets.
        </p>
      </AppCard>
    </template>

    <AppModal :open="formOpen" :title="editingId ? 'Edit sheet connection' : 'Connect Google Sheet'" description="Save this connection for this environment only. No product data is changed until you run a sync." @close="formOpen = false">
      <form class="space-y-4 px-5 py-5" @submit.prevent="save">
        <AppInput v-model="form.name" label="Connection name" placeholder="SAAJ SEO Testing" required />
        <AppInput v-model="form.spreadsheet_url" label="Google Sheets URL" placeholder="https://docs.google.com/spreadsheets/d/.../edit" required />
        <div class="grid gap-4 sm:grid-cols-2">
          <AppInput v-model="form.tab_name" label="Tab name" placeholder="Sheet1" required />
          <AppInput v-model="form.header_row" type="number" label="Header row" :min="1" :max="20" required />
        </div>
        <p class="text-[12px] text-gray-400">For a new blank test sheet use header row 1. For your current formatted SEO sheet, choose the row with Product Name / SKU / Meta Title.</p>
        <AppToggle v-model="form.is_active" label="Use for automatic sync" description="Only one saved sheet can be active at a time." />
        <p v-if="formError" role="alert" class="rounded-lg bg-red-500/[0.06] p-3 text-[12px] text-red-600">{{ formError }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <AppButton variant="ghost" @click="formOpen = false">Cancel</AppButton>
          <AppButton type="submit" :loading="saving">{{ editingId ? 'Save changes' : 'Connect sheet' }}</AppButton>
        </div>
      </form>
    </AppModal>
    <AppConfirmModal :open="!!deleteTarget" title="Disconnect this spreadsheet?" message="Removes the connection from SAAJ only. Your Google Sheet and all SEO content remain unchanged." confirm-label="Disconnect" :loading="deleting" @close="deleteTarget = null" @confirm="removeConnection" />
  </section>
</template>
