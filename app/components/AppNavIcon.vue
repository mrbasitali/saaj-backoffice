<script setup lang="ts">
const props = withDefaults(defineProps<{
 name: string
 size?: number | string
}>(), {
 size: 18,
})

const icons: Record<string, string[]> = {
 dashboard: [
 'M4 4h6v6H4V4Z',
 'M14 4h6v4h-6V4Z',
 'M14 12h6v8h-6v-8Z',
 'M4 14h6v6H4v-6Z',
 ],

 document: [
 'M6 3h8l4 4v14H6V3Z',
 'M14 3v5h5',
 'M9 12h6',
 'M9 16h6',
 ],

 category: [
 'M4 4h6v6H4V4Z',
 'M14 4h6v6h-6V4Z',
 'M4 14h6v6H4v-6Z',
 'M14 14h6v6h-6v-6Z',
 ],

 sliders: [
 'M4 7h7',
 'M15 7h5',
 'M13 5v4',
 'M4 17h3',
 'M11 17h9',
 'M9 15v4',
 ],

 filter: [
 'M4 5h16l-6.2 7.1v5.2l-3.6 1.7v-6.9L4 5Z',
 ],

 tag: [
 'M4 5v6.2L12.8 20 20 12.8 11.2 4H5a1 1 0 0 0-1 1Z',
 'M8 8h.01',
 ],

 box: [
 'M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z',
 'M4.5 7.5 12 12l7.5-4.5',
 'M12 12v9',
 ],

 warehouse: [
 'M3 10 12 4l9 6v10H3V10Z',
 'M7 20v-6h10v6',
 'M7 10h.01',
 'M12 10h.01',
 'M17 10h.01',
 ],

 building: [
 'M5 21V5l8-2v18',
 'M13 9h6v12',
 'M8 8h.01',
 'M8 12h.01',
 'M8 16h.01',
 'M16 13h.01',
 'M16 17h.01',
 ],

 users: [
 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
 'M3 21v-1a6 6 0 0 1 12 0v1',
 'M16 4.5a3.5 3.5 0 0 1 0 6.5',
 'M18 14a5 5 0 0 1 3 4.6',
 ],

 cart: [
 'M3 4h2l2 11h9l3-7H6',
 'M9 20h.01',
 'M17 20h.01',
 ],

 card: [
 'M3 6h18v12H3V6Z',
 'M3 10h18',
 'M7 15h4',
 ],

 return: [
 'M8 7H4v-4',
 'M4.5 7.5A8 8 0 1 1 4 17',
 ],

 receipt: [
 'M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z',
 'M9 8h6',
 'M9 12h6',
 'M9 16h4',
 ],

 chart: [
 'M4 20V10',
 'M11 20V4',
 'M18 20v-7',
 'M3 20h18',
 ],

 wallet: [
 'M4 7a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v2',
 'M4 7v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H6a2 2 0 0 1-2-2Z',
 'M16 13h.01',
 ],

 menu: [
 'M4 7h16',
 'M4 12h16',
 'M4 17h16',
 ],

 panel: [
 'M4 4h16v16H4V4Z',
 'M9 4v16',
 ],

 close: [
 'm6 6 12 12',
 'M18 6 6 18',
 ],

 plus: [
 'M12 5v14',
 'M5 12h14',
 ],

 logout: [
 'M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4',
 'M14 8l4 4-4 4',
 'M9 12h9',
 ],

 moon: [
 'M20 15.2A8 8 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z',
 ],

 sun: [
 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
 'M12 2v2',
 'M12 20v2',
 'm4.93 4.93 1.42 1.42',
 'm17.66 17.66 1.41 1.41',
 'M2 12h2',
 'M20 12h2',
 'm4.93 19.07 1.42-1.42',
 'm17.66 6.34 1.41-1.41',
 ],
}

const paths = computed(() => icons[props.name] ?? icons.dashboard)
</script>

<template>
 <svg
 :width="size"
 :height="size"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 stroke-width="1.7"
 stroke-linecap="round"
 stroke-linejoin="round"
 aria-hidden="true"
 >
 <path
 v-for="path in paths"
 :key="path"
 :d="path"
 />
 </svg>
</template>