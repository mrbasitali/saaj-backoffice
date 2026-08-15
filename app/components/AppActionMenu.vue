<script setup lang="ts">
const props = withDefaults(defineProps<{
 align?: 'left' | 'right'
}>(), {
 align: 'right',
})

const open = ref(false)

const buttonRef =
 ref<HTMLButtonElement | null>(null)

const menuRef =
 ref<HTMLDivElement | null>(null)

const {
 style: menuStyle,
} = useFloatingPanel(
 buttonRef,
 menuRef,
 open,
 {
 align: props.align,
 minWidth: 205,
 maxHeightCap: 340,
 maxHeightFloor: 140,
 gap: 5,
 },
)

function toggle() {
 open.value = !open.value
}

function close() {
 open.value = false
}
</script>

<template>
 <button
 ref="buttonRef"
 type="button"
 aria-label="Open actions"
 title="Actions"
 class="
 inline-flex
 h-8
 w-8
 items-center
 justify-center

 rounded-[8px]

 text-gray-400

 outline-none
 transition
 duration-150

 hover:bg-gray-950/[0.05]
 hover:text-gray-800

 focus-visible:ring-2
 focus-visible:ring-gray-950/10

 active:scale-95

 dark:text-gray-600
 dark:hover:bg-white/[0.07]
 dark:hover:text-white
 dark:focus-visible:ring-white/10
 "
 :class="
 open
 ? `
 bg-gray-950/[0.06]
 text-gray-800

 dark:bg-white/[0.08]
 dark:text-white
 `
 : ''
 "
 :aria-expanded="open"
 @click.stop="toggle"
 >
 <svg
 class="h-[18px] w-[18px]"
 viewBox="0 0 20 20"
 fill="currentColor"
 aria-hidden="true"
 >
 <circle
 cx="4"
 cy="10"
 r="1.35"
 />

 <circle
 cx="10"
 cy="10"
 r="1.35"
 />

 <circle
 cx="16"
 cy="10"
 r="1.35"
 />
 </svg>
 </button>

 <Teleport to="body">
 <Transition
 enter-active-class="
 transition
 duration-150
 ease-out
 "
 enter-from-class="
 translate-y-1
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
 duration-100
 ease-in
 "
 leave-from-class="
 opacity-100
 "
 leave-to-class="
 translate-y-1
 scale-[0.99]
 opacity-0
 "
 >
 <div
 v-if="open"
 ref="menuRef"
 class="
 z-[9999]

 overflow-hidden

 rounded-[12px]

 bg-white

 p-1.5

 shadow-[0_16px_48px_rgba(17,24,39,0.14)]

 ring-1
 ring-black/[0.06]

 dark:bg-[#17181b]
 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]
 dark:ring-white/[0.08]
 "
 :style="menuStyle"
 @click.stop
 >
 <slot :close="close" />
 </div>
 </Transition>
 </Teleport>
</template>