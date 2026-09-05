<script setup lang="ts">
const props = withDefaults(defineProps<{
 open: boolean
 title: string
 description?: string
 maxWidth?: string
 fullScreen?: boolean
 hideHeader?: boolean
 zIndex?: number
}>(), {
 description: undefined,
 maxWidth: 'max-w-3xl',
 fullScreen: false,
 hideHeader: false,
 zIndex: 100,
})

const emit = defineEmits<{
 close: []
}>()

const slots = useSlots()

const bodyLocked = ref(false)

function lockBody() {
 if (!import.meta.client || bodyLocked.value) {
 return
 }

 const body = document.body
 const currentCount =
 Number(body.dataset.modalLockCount || 0)

 if (currentCount === 0) {
 body.dataset.modalPreviousOverflow =
 body.style.overflow || ''

 body.style.overflow = 'hidden'
 }

 body.dataset.modalLockCount =
 String(currentCount + 1)

 bodyLocked.value = true
}

function unlockBody() {
 if (!import.meta.client || !bodyLocked.value) {
 return
 }

 const body = document.body
 const currentCount =
 Number(body.dataset.modalLockCount || 0)

 const nextCount =
 Math.max(0, currentCount - 1)

 if (nextCount === 0) {
 body.style.overflow =
 body.dataset.modalPreviousOverflow || ''

 delete body.dataset.modalLockCount
 delete body.dataset.modalPreviousOverflow
 } else {
 body.dataset.modalLockCount =
 String(nextCount)
 }

 bodyLocked.value = false
}

function close() {
 emit('close')
}

function onKeydown(event: KeyboardEvent) {
 if (
 event.key === 'Escape'
 && props.open
 ) {
 close()
 }
}

watch(
 () => props.open,
 (open) => {
 if (open) {
 lockBody()
 } else {
 unlockBody()
 }
 },
 {
 immediate: true,
 },
)

onMounted(() => {
 window.addEventListener(
 'keydown',
 onKeydown,
 )
})

onBeforeUnmount(() => {
 window.removeEventListener(
 'keydown',
 onKeydown,
 )

 unlockBody()
})
</script>

<template>
 <Teleport to="body">
 <Transition
 enter-active-class="
 transition
 duration-180
 ease-out
 "
 enter-from-class="opacity-0"
 enter-to-class="opacity-100"
 leave-active-class="
 transition
 duration-120
 ease-in
 "
 leave-from-class="opacity-100"
 leave-to-class="opacity-0"
 >
 <div
 v-if="open"
 class="
 fixed
 inset-0
 "
 :style="{ zIndex }"
 >
 <!-- Backdrop -->
 <button
 type="button"
 tabindex="-1"
 aria-label="Close modal"
 class="
 absolute
 inset-0
 "
 :class="fullScreen
 ? 'bg-gray-950/45 backdrop-blur-md dark:bg-black/60'
 : 'bg-gray-950/45 backdrop-blur-[3px] dark:bg-black/60'"
 @click="close"
 />

 <div
 class="
 relative
 z-10

 flex
 h-full
 justify-center
 "
 :class="fullScreen ? 'full-screen-shell items-center' : 'items-end sm:items-center sm:p-3'"
 >
 <Transition
 appear
 enter-active-class="
 transition
 duration-200
 ease-out
 "
 enter-from-class="
 translate-y-3
 scale-[0.985]
 opacity-0
 "
 enter-to-class="
 translate-y-0
 scale-100
 opacity-100
 "
 leave-active-class="
 transition
 duration-120
 ease-in
 "
 leave-from-class="
 translate-y-0
 scale-100
 opacity-100
 "
 leave-to-class="
 translate-y-3
 scale-[0.99]
 opacity-0
 "
 >
 <section
 role="dialog"
 aria-modal="true"
 :aria-label="title"
 class="
 relative

 flex
 w-full
 flex-col
 overflow-hidden

 bg-white

 shadow-[0_24px_80px_rgba(0,0,0,0.22)]

 dark:bg-[#111214]
 dark:shadow-[0_30px_90px_rgba(0,0,0,0.5)]

 "
 :class="fullScreen
 ? 'h-full max-h-full max-w-[1600px] rounded-[18px] sm:rounded-[22px]'
 : `${maxWidth} max-h-[100dvh] rounded-t-[20px] sm:max-h-[calc(100dvh-24px)] sm:rounded-[20px]`"
 @click.stop
 >
 <!-- Header -->
 <header
 v-if="!hideHeader"
 class="
 flex
 shrink-0
 items-start
 justify-between
 gap-4

 bg-white/95

 px-4
 py-4

 shadow-[0_1px_0_rgba(17,24,39,0.055)]

 backdrop-blur-xl

 dark:bg-[#111214]/95
 dark:shadow-[0_1px_0_rgba(255,255,255,0.055)]

 sm:px-4
 "
 >
 <div class="min-w-0">
 <h2
 class="
 truncate

 text-[17px]
 font-semibold
 tracking-[-0.02em]
 text-gray-950

 dark:text-white
 "
 >
 {{ title }}
 </h2>

 <p
 v-if="description"
 class="
 mt-1

 max-w-3xl

 text-[12px]
 leading-5
 text-gray-400

 dark:text-gray-500
 "
 >
 {{ description }}
 </p>
 </div>

 <button
 type="button"
 aria-label="Close"
 class="
 flex
 h-8
 w-8
 shrink-0
 items-center
 justify-center

 rounded-[9px]

 text-gray-400

 transition

 hover:bg-gray-950/[0.05]
 hover:text-gray-800

 active:scale-95

 dark:text-gray-600
 dark:hover:bg-white/[0.07]
 dark:hover:text-white
 "
 @click="close"
 >
 <svg
 class="h-4 w-4"
 viewBox="0 0 20 20"
 fill="none"
 >
 <path
 d="M5 5L15 15M15 5L5 15"
 stroke="currentColor"
 stroke-width="1.6"
 stroke-linecap="round"
 />
 </svg>
 </button>
 </header>

 <!--
 This is now the ONLY vertical
 scrolling area of AppModal.
 -->
 <div
 class="
 min-h-0
 flex-1
 "
 :class="fullScreen
 ? 'overflow-hidden'
 : 'overflow-y-auto overscroll-contain [scrollbar-gutter:stable]'"
 >
 <slot />
 </div>

 <!-- Footer -->
 <footer
 v-if="slots.footer"
 class="
 shrink-0

 bg-white/95

 px-4
 py-3

 shadow-[0_-1px_0_rgba(17,24,39,0.055)]

 backdrop-blur-xl

 dark:bg-[#111214]/95
 dark:shadow-[0_-1px_0_rgba(255,255,255,0.055)]

 sm:px-4
 "
 >
 <slot name="footer" />
 </footer>
 </section>
 </Transition>
 </div>
 </div>
 </Transition>
 </Teleport>
</template>

<style scoped>
.full-screen-shell {
 padding:
 max(0.5rem, env(safe-area-inset-top))
 max(0.5rem, env(safe-area-inset-right))
 max(0.5rem, env(safe-area-inset-bottom))
 max(0.5rem, env(safe-area-inset-left));
}

@media (min-width: 640px) {
 .full-screen-shell {
  padding:
  max(1rem, env(safe-area-inset-top))
  max(1rem, env(safe-area-inset-right))
  max(1rem, env(safe-area-inset-bottom))
  max(1rem, env(safe-area-inset-left));
 }
}

@media (min-width: 1024px) {
 .full-screen-shell {
  padding:
  max(1.5rem, env(safe-area-inset-top))
  max(1.5rem, env(safe-area-inset-right))
  max(1.5rem, env(safe-area-inset-bottom))
  max(1.5rem, env(safe-area-inset-left));
 }
}
</style>
