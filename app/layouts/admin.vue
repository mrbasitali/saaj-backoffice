<script setup lang="ts">
const auth = useAuthStore()
const { $api } = useNuxtApp()
const { timezone } = useAppDateTime()
const unreadOnlineOrders = useState<number>('admin-unread-online-orders', () => 0)
let unreadTimer: ReturnType<typeof setInterval> | null = null

const { data: globalSiteSettings } = await useAsyncData('admin-global-site-settings', () =>
 $api<{ data: { timezone?: string | null } }>('/admin/site-settings'),
)

watchEffect(() => {
 const configuredTimezone = globalSiteSettings.value?.data.timezone
 if (configuredTimezone) timezone.value = configuredTimezone
})

async function refreshUnreadOnlineOrders() {
  try {
    const response = await $api<{ unread_count: number }>('/admin/sale-invoices/unread-count')
    unreadOnlineOrders.value = Number(response.unread_count || 0)
  } catch {
    // Keep the last known count. A transient polling failure should never
    // interrupt the rest of the backoffice.
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') refreshUnreadOnlineOrders()
}

const logoutConfirmOpen = ref(false)

function confirmLogout() {
  logoutConfirmOpen.value = false
  auth.logout()
}
const route = useRoute()
const { theme, toggleTheme } = useTheme()

const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)

type NavLink = {
 label: string
 to: string
 icon: string
 roles?: string[]
}

type NavGroup = {
 label: string
 links: NavLink[]
}

const navGroups: NavGroup[] = [
 {
 label: 'Overview',
 links: [
 {
 label: 'Dashboard',
 to: '/',
 icon: 'dashboard',
 },
 {
 label: 'Vendor Statements',
 to: '/vendor-statements',
 icon: 'document',
 },
 {
 label: 'Customer Statements',
 to: '/customer-statements',
 icon: 'document',
 },
 ],
 },

 {
 label: 'Administration',
 links: [
 {
 label: 'Users',
 to: '/users',
 icon: 'users',
 roles: ['super_admin', 'admin'],
 },
 ],
 },

 {
 label: 'Reports',
 links: [
 {
 label: 'Sales Report',
 to: '/reports/sales',
 icon: 'chart',
 },
 {
 label: 'Purchase Report',
 to: '/reports/purchases',
 icon: 'chart',
 },
 {
 label: 'Profit & Loss',
 to: '/reports/profit',
 icon: 'chart',
 },
 {
 label: 'Inventory Report',
 to: '/reports/inventory',
 icon: 'chart',
 },
 ],
 },

 {
 label: 'Settings',
 links: [
 {
 label: 'Maintenance Mode',
 to: '/settings/maintenance',
 icon: 'sliders',
 },
 {
 label: 'Shipping Zones',
 to: '/settings/shipping-zones',
 icon: 'sliders',
 },
 {
 label: 'Homepage',
 to: '/settings/homepage',
 icon: 'sliders',
 },
 {
 label: 'Site Settings',
 to: '/settings/site-settings',
 icon: 'sliders',
 },
 ],
 },

 {
 label: 'Catalog',
 links: [
 {
 label: 'Categories',
 to: '/categories',
 icon: 'category',
 },
 {
 label: 'Attributes',
 to: '/attributes',
 icon: 'sliders',
 },
 {
 label: 'Category Filters',
 to: '/category-filters',
 icon: 'filter',
 },
 {
 label: 'Brands',
 to: '/brands',
 icon: 'tag',
 },
 {
 label: 'Products',
 to: '/products',
 icon: 'box',
 },
 ],
 },

 {
 label: 'Operations',
 links: [
 {
 label: 'Inventory',
 to: '/inventory',
 icon: 'warehouse',
 },
 {
 label: 'Vendors',
 to: '/vendors',
 icon: 'building',
 },
 {
 label: 'Customers',
 to: '/customers',
 icon: 'users',
 },
 ],
 },

 {
 label: 'Transactions',
 links: [
 {
 label: 'Purchases',
 to: '/purchase-invoices',
 icon: 'cart',
 },
 {
 label: 'Vendor Payments',
 to: '/vendor-payments',
 icon: 'card',
 },
 {
 label: 'Purchase Returns',
 to: '/purchase-returns',
 icon: 'return',
 },
 {
 label: 'Sales / POS',
 to: '/sale-invoices',
 icon: 'receipt',
 },
 {
 label: 'Customer Payments',
 to: '/customer-payments',
 icon: 'card',
 },
 {
 label: 'Sale Returns',
 to: '/sale-returns',
 icon: 'return',
 },
 {
 label: 'Expenses',
 to: '/expenses',
 icon: 'wallet',
 },
 {
 label: 'Expense Categories',
 to: '/expense-categories',
 icon: 'wallet',
 },
 ],
 },
]

const visibleNavGroups = computed(() => navGroups
 .map((group) => ({
 ...group,
 links: group.links.filter((link) => !link.roles || auth.hasRole(...link.roles)),
 }))
 .filter((group) => group.links.length > 0))

const initials = computed(() => {
 const name = auth.user?.name || 'SA'

 return name
 .split(' ')
 .map((part) => part[0])
 .join('')
 .slice(0, 2)
 .toUpperCase()
})

function isActive(to: string) {
 if (to === '/') {
 return route.path === '/'
 }

 return route.path.startsWith(to)
}

const currentLink = computed(() => {
 for (const group of visibleNavGroups.value) {
 const link = group.links.find((item) => isActive(item.to))

 if (link) {
 return link
 }
 }

 return null
})

const pageTitle = computed(() => {
 if (route.path === '/profile') return 'My Profile'

 return currentLink.value?.label || 'Backoffice'
})

onMounted(() => {
 sidebarCollapsed.value =
 localStorage.getItem('saaj_sidebar_collapsed') === '1'

 refreshUnreadOnlineOrders()
 unreadTimer = setInterval(refreshUnreadOnlineOrders, 30000)
 document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
 if (unreadTimer) clearInterval(unreadTimer)
 document.removeEventListener('visibilitychange', handleVisibilityChange)
})

watch(sidebarCollapsed, (value) => {
 if (!import.meta.client) {
 return
 }

 localStorage.setItem(
 'saaj_sidebar_collapsed',
 value ? '1' : '0',
 )
})

watch(
 () => route.fullPath,
 () => {
 sidebarOpen.value = false
 },
)
</script>

<template>
 <div
 class="
 min-h-screen
 bg-[#f4f5f7]
 text-gray-950

 dark:bg-[#09090b]
 dark:text-white
 "
 >
 <!-- Mobile overlay -->
 <Transition
 enter-active-class="transition-opacity duration-200"
 enter-from-class="opacity-0"
 leave-active-class="transition-opacity duration-150"
 leave-to-class="opacity-0"
 >
 <button
 v-if="sidebarOpen"
 type="button"
 aria-label="Close navigation"
 class="
 fixed inset-0 z-40
 bg-gray-950/40
 backdrop-blur-[2px]

 lg:hidden
 "
 @click="sidebarOpen = false"
 />
 </Transition>

 <!-- Sidebar -->
 <aside
 class="
 fixed inset-y-0 left-0 z-50
 flex
 w-[248px]
 flex-col

 bg-white

 shadow-[12px_0_32px_rgba(17,24,39,0.08)]

 transition-[width,transform]
 duration-200
 ease-out

 dark:bg-[#111214]
 dark:shadow-[12px_0_32px_rgba(0,0,0,0.16)]

 lg:shadow-[1px_0_0_rgba(17,24,39,0.045)]
 lg:dark:shadow-[1px_0_0_rgba(255,255,255,0.04)]
 "
 :class="[
 sidebarOpen
 ? 'translate-x-0'
 : '-translate-x-full lg:translate-x-0',

 sidebarCollapsed
 ? 'lg:w-[76px]'
 : 'lg:w-[248px]',
 ]"
 >
 <!-- Brand -->
 <div
 class="
 flex
 h-16
 shrink-0
 items-center
 px-3
 "
 :class="
 sidebarCollapsed
 ? 'lg:justify-center'
 : 'justify-between'
 "
 >
 <NuxtLink
 to="/"
 class="
 flex
 min-w-0
 items-center
 gap-2.5

 rounded-xl
 px-2
 py-1.5

 outline-none
 transition

 hover:bg-gray-950/[0.04]

 focus-visible:ring-2
 focus-visible:ring-gray-950/10

 dark:hover:bg-white/[0.055]
 dark:focus-visible:ring-white/10
 "
 :class="
 sidebarCollapsed
 ? 'lg:px-1.5'
 : ''
 "
 :title="
 sidebarCollapsed
 ? 'Saaj Backoffice'
 : undefined
 "
 >
 <div
 class="
 flex
 h-8
 w-8
 shrink-0
 items-center
 justify-center

 rounded-[10px]

 bg-gray-950
 text-[13px]
 font-semibold
 tracking-tight
 text-white

 dark:bg-white
 dark:text-gray-950
 "
 >
 S
 </div>

 <div
 class="min-w-0"
 :class="
 sidebarCollapsed
 ? 'lg:hidden'
 : ''
 "
 >
 <p
 class="
 truncate
 text-[14px]
 font-semibold
 tracking-[-0.01em]
 text-gray-950

 dark:text-white
 "
 >
 Saaj
 </p>

 <p
 class="
 truncate
 text-[12px]
 text-gray-400

 dark:text-gray-500
 "
 >
 Backoffice
 </p>
 </div>
 </NuxtLink>

 <!-- Mobile close -->
 <button
 type="button"
 aria-label="Close navigation"
 class="
 flex
 h-8
 w-8
 items-center
 justify-center

 rounded-lg

 text-gray-400
 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-800

 active:scale-95

 dark:text-gray-500
 dark:hover:bg-white/[0.07]
 dark:hover:text-white

 lg:hidden
 "
 @click="sidebarOpen = false"
 >
 <AppNavIcon
 name="close"
 :size="17"
 />
 </button>
 </div>

 <!-- Navigation -->
 <nav
 class="
 min-h-0
 flex-1

 overflow-y-auto
 overscroll-contain

 px-3
 pb-3
 pt-1

 [scrollbar-width:none]
 [&::-webkit-scrollbar]:hidden
 "
 >
 <div
 v-for="group in visibleNavGroups"
 :key="group.label"
 class="mb-4 last:mb-0"
 :class="
 sidebarCollapsed
 ? 'lg:mb-2.5'
 : ''
 "
 >
 <p
 class="
 mb-1
 px-2.5

 text-[11px]
 font-semibold
 uppercase
 tracking-[0.12em]
 text-gray-400

 dark:text-gray-600
 "
 :class="
 sidebarCollapsed
 ? 'lg:hidden'
 : ''
 "
 >
 {{ group.label }}
 </p>

 <div class="space-y-0.5">
 <NuxtLink
 v-for="link in group.links"
 :key="link.to"
 :to="link.to"
 class="
 group
 relative

 flex
 h-9
 items-center
 gap-2.5

 rounded-[10px]
 px-2.5

 text-[13px]
 font-medium
 tracking-[-0.005em]

 outline-none
 transition
 duration-150

 focus-visible:ring-2
 focus-visible:ring-gray-950/10

 active:scale-[0.985]

 dark:focus-visible:ring-white/10
 "
 :class="[
 isActive(link.to)
 ? `
 bg-gray-950/[0.065]
 text-gray-950

 dark:bg-white/[0.085]
 dark:text-white
 `
 : `
 text-gray-500

 hover:bg-gray-950/[0.04]
 hover:text-gray-900

 dark:text-gray-500
 dark:hover:bg-white/[0.055]
 dark:hover:text-gray-200
 `,

 sidebarCollapsed
 ? 'lg:justify-center lg:px-0'
 : '',
 ]"
 :title="
 sidebarCollapsed
 ? link.label
 : undefined
 "
 >
 <AppNavIcon
 :name="link.icon"
 :size="17"
 class="shrink-0 transition-colors"
 :class="
 isActive(link.to)
 ? `
 text-gray-900
 dark:text-white
 `
 : `
 text-gray-400

 group-hover:text-gray-700

 dark:text-gray-600
 dark:group-hover:text-gray-300
 `
 "
 />

 <span
 class="
 min-w-0
 flex-1
 truncate
 "
 :class="
 sidebarCollapsed
 ? 'lg:hidden'
 : ''
 "
 >
 {{ link.label }}
 </span>
 <span
 v-if="link.to === '/sale-invoices' && unreadOnlineOrders > 0"
 class="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[9px] font-bold tabular-nums text-white"
 :class="sidebarCollapsed ? 'lg:absolute lg:right-0 lg:top-0 lg:h-2.5 lg:min-w-2.5 lg:p-0 lg:text-[0px]' : ''"
 >
 {{ unreadOnlineOrders > 99 ? '99+' : unreadOnlineOrders }}
 </span>
 </NuxtLink>
 </div>
 </div>
 </nav>

 <!-- User -->
 <div
 class="
 shrink-0
 px-3
 pb-3
 pt-2
 "
 >
 <div
 class="
 flex
 items-center
 gap-2

 rounded-xl
 px-1.5
 py-1.5
 "
 :class="
 sidebarCollapsed
 ? 'lg:flex-col lg:px-0'
 : ''
 "
 >
 <NuxtLink
 to="/profile"
 class="
 flex
 items-center
 gap-2
 min-w-0
 flex-1
 rounded-[10px]
 p-1
 transition
 hover:bg-gray-950/[0.045]
 dark:hover:bg-white/[0.06]
 "
 :title="
 sidebarCollapsed
 ? 'Open profile'
 : undefined
 "
 >
 <div
 class="
 flex
 h-8
 w-8
 shrink-0
 items-center
 justify-center
 rounded-full
 bg-gray-950/[0.06]
 text-[12px]
 font-semibold
 text-gray-700
 dark:bg-white/[0.08]
 dark:text-gray-200
 "
 >
 {{ initials }}
 </div>

 <div
 class="
 min-w-0
 flex-1
 "
 :class="
 sidebarCollapsed
 ? 'lg:hidden'
 : ''
 "
 >
 <p
 class="
 truncate
 text-[12px]
 font-medium
 text-gray-800

 dark:text-gray-200
 "
 >
 {{ auth.user?.name }}
 </p>

 <p
 class="
 truncate
 text-[11px]
 text-gray-400

 dark:text-gray-600
 "
 >
 {{ auth.user?.email }}
 </p>
 </div>
 </NuxtLink>

 <button
 type="button"
 aria-label="Logout"
 title="Logout"
 class="
 flex
 h-8
 w-8
 shrink-0
 items-center
 justify-center

 rounded-lg

 text-gray-400
 transition

 hover:bg-red-500/10
 hover:text-red-600

 active:scale-95

 dark:text-gray-600
 dark:hover:bg-red-500/10
 dark:hover:text-red-400
 "
 @click="logoutConfirmOpen = true"
 >
 <AppNavIcon
 name="logout"
 :size="16"
 />
 </button>
 </div>
 </div>
 </aside>

 <!-- Main -->
 <div
 class="
 transition-[padding]
 duration-200
 ease-out
 "
 :class="
 sidebarCollapsed
 ? 'lg:pl-[76px]'
 : 'lg:pl-[248px]'
 "
 >
 <!-- Topbar -->
 <header
 class="
 sticky
 top-0
 z-30

 h-16

 bg-white/90

 shadow-[0_1px_0_rgba(17,24,39,0.05)]

 backdrop-blur-xl

 dark:bg-[#111214]/90
 dark:shadow-[0_1px_0_rgba(255,255,255,0.045)]
 "
 >
 <div
 class="
 flex
 h-full
 items-center
 justify-between
 gap-4

 px-4

 sm:px-6
 lg:px-7
 "
 >
 <!-- Left -->
 <div
 class="
 flex
 min-w-0
 items-center
 gap-2
 "
 >
 <!-- Mobile -->
 <button
 type="button"
 aria-label="Open navigation"
 class="
 flex
 h-9
 w-9
 shrink-0
 items-center
 justify-center

 rounded-[10px]

 text-gray-500
 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-900

 active:scale-95

 dark:text-gray-500
 dark:hover:bg-white/[0.07]
 dark:hover:text-white

 lg:hidden
 "
 @click="sidebarOpen = true"
 >
 <AppNavIcon
 name="menu"
 :size="18"
 />
 </button>

 <!-- Collapse -->
 <button
 type="button"
 :aria-label="
 sidebarCollapsed
 ? 'Expand sidebar'
 : 'Collapse sidebar'
 "
 :title="
 sidebarCollapsed
 ? 'Expand sidebar'
 : 'Collapse sidebar'
 "
 class="
 hidden
 h-9
 w-9
 shrink-0
 items-center
 justify-center

 rounded-[10px]

 text-gray-400
 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-900

 active:scale-95

 dark:text-gray-600
 dark:hover:bg-white/[0.07]
 dark:hover:text-white

 lg:flex
 "
 @click="
 sidebarCollapsed =
 !sidebarCollapsed
 "
 >
 <AppNavIcon
 name="panel"
 :size="17"
 />
 </button>

 <h1
 class="
 truncate

 text-[15px]
 font-semibold
 tracking-[-0.015em]
 text-gray-900

 dark:text-gray-100

 sm:text-base
 "
 >
 {{ pageTitle }}
 </h1>
 </div>

 <!-- Right -->
 <div
 class="
 flex
 shrink-0
 items-center
 gap-1.5
 "
 >
 <NuxtLink
 v-if="unreadOnlineOrders > 0"
 to="/sale-invoices?unread=1"
 class="hidden h-9 items-center gap-2 rounded-[10px] bg-rose-500/[0.09] px-3 text-[12px] font-semibold text-rose-700 transition hover:bg-rose-500/[0.14] dark:bg-rose-500/10 dark:text-rose-300 sm:inline-flex"
 >
 <span class="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.10)]" />
 {{ unreadOnlineOrders }} new {{ unreadOnlineOrders === 1 ? 'order' : 'orders' }}
 </NuxtLink>

 <NuxtLink
 to="/sale-invoices"
 class="
 hidden
 h-9
 items-center
 gap-1.5

 rounded-[10px]

 bg-gray-950

 px-3.5

 text-[13px]
 font-medium
 text-white

 shadow-[0_1px_2px_rgba(0,0,0,0.14)]

 outline-none
 transition

 hover:bg-gray-800

 focus-visible:ring-2
 focus-visible:ring-gray-950/20
 focus-visible:ring-offset-2

 active:scale-[0.98]

 dark:bg-white
 dark:text-gray-950
 dark:shadow-none
 dark:hover:bg-gray-100

 sm:inline-flex
 "
 >
 <AppNavIcon
 name="plus"
 :size="15"
 />

 New sale
 </NuxtLink>

 <button
 type="button"
 :aria-label="
 theme === 'dark'
 ? 'Switch to light mode'
 : 'Switch to dark mode'
 "
 :title="
 theme === 'dark'
 ? 'Light mode'
 : 'Dark mode'
 "
 class="
 flex
 h-9
 w-9
 items-center
 justify-center

 rounded-[10px]

 text-gray-500
 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-900

 active:scale-95

 dark:text-gray-500
 dark:hover:bg-white/[0.07]
 dark:hover:text-white
 "
 @click="toggleTheme"
 >
 <AppNavIcon
 :name="
 theme === 'dark'
 ? 'sun'
 : 'moon'
 "
 :size="17"
 />
 </button>
 </div>
 </div>
 </header>

 <main
 class="
 px-4
 pb-7
 pt-4

 sm:px-6

 lg:px-7
 lg:pb-9
 lg:pt-5
 "
 >
 <slot />
 </main>
 </div>

 <AppConfirmModal
 :open="logoutConfirmOpen"
 title="Sign out?"
 message="You'll need to sign in again to access the admin panel."
 confirm-label="Sign out"
 @close="logoutConfirmOpen = false"
 @confirm="confirmLogout"
 />
 </div>
</template>
