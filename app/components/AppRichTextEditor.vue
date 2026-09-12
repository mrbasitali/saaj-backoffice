<script setup lang="ts">
import {
 useEditor,
 EditorContent,
} from '@tiptap/vue-3'
import { Extension, Mark } from '@tiptap/core'

import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

const props = withDefaults(defineProps<{
 modelValue: string | null
 label?: string
 placeholder?: string
 error?: string
 mode?: 'full' | 'simple'
 compact?: boolean
 spacingControl?: boolean
 weightControl?: boolean
}>(), {
 label: '',
 placeholder: 'Write something…',
 error: '',
 mode: 'full',
 compact: false,
 spacingControl: false,
 weightControl: false,
})

const emit = defineEmits<{
 'update:modelValue': [value: string]
}>()

const isSimple = computed(
 () => props.mode === 'simple',
)


const LightWeight = Mark.create({
 name: 'lightWeight',

 parseHTML() {
 return [
 { tag: 'span[data-text-weight="light"]' },
 ]
 },

 renderHTML() {
 return [
 'span',
 { 'data-text-weight': 'light' },
 0,
 ]
 },
})

const ParagraphSpacing = Extension.create({
 name: 'paragraphSpacing',

 addGlobalAttributes() {
 return [
 {
 types: ['paragraph'],
 attributes: {
 paragraphSpacing: {
 default: null,
 parseHTML: (element) => {
 const value = element.getAttribute(
 'data-paragraph-gap',
 )

 return ['4', '8', '12', '16'].includes(
 value ?? '',
 )
 ? value
 : null
 },
 renderHTML: (attributes) => {
 const value = String(
 attributes.paragraphSpacing ?? '',
 )

 if (
 !['4', '8', '12', '16'].includes(
 value,
 )
 ) {
 return {}
 }

 return {
 'data-paragraph-gap': value,
 style: `margin-top: ${value}px;`,
 }
 },
 },
 },
 },
 ]
 },
})

const transactionTick = ref(0)

const editor = useEditor({
 content: props.modelValue || '',

 immediatelyRender: false,

 extensions: [
 StarterKit.configure({
 heading: isSimple.value
 ? false
 : {
 levels: [2, 3],
 },

 bulletList:
 isSimple.value
 ? false
 : undefined,

 orderedList:
 isSimple.value
 ? false
 : undefined,

 blockquote:
 isSimple.value
 ? false
 : undefined,

 codeBlock: false,
 horizontalRule: false,
 }),

 Placeholder.configure({
 placeholder:
 props.placeholder,
 }),
 LightWeight,
 ParagraphSpacing,
 ],

 editorProps: {
 attributes: {
 class: [
 'app-rte-content',
 props.compact
 ? 'min-h-[88px]'
 : 'min-h-[130px]',
 'px-3.5',
 'py-3',
 'text-[14px]',
 props.compact
 ? 'leading-[1.4]'
 : 'leading-6',
 props.compact
 ? 'app-rte-content--compact'
 : '',
 'text-gray-900',
 'outline-none',
 'dark:text-gray-100',
 ].join(' '),
 },
 },

 onUpdate: ({ editor }) => {
 emit(
 'update:modelValue',
 editor.getHTML(),
 )
 },

 onTransaction: () => {
 transactionTick.value++
 },
})

watch(
 () => props.modelValue,
 (value) => {
 if (!editor.value) {
 return
 }

 const incoming = value || ''

 if (
 editor.value.getHTML()
 !== incoming
 ) {
 editor.value.commands.setContent(
 incoming,
 {
 emitUpdate: false,
 },
 )
 }
 },
)

onBeforeUnmount(() => {
 editor.value?.destroy()
})

function isActive(
 name: string,
 attrs?: Record<string, any>,
) {
 void transactionTick.value

 return (
 editor.value?.isActive(
 name,
 attrs,
 ) ?? false
 )
}


function currentParagraphSpacing() {
 void transactionTick.value

 return String(
 editor.value?.getAttributes(
 'paragraph',
 ).paragraphSpacing ?? '0',
 )
}

function setParagraphSpacing(event: Event) {
 const value = (
 event.target as HTMLSelectElement
 ).value

 editor.value
 ?.chain()
 .focus()
 .updateAttributes(
 'paragraph',
 {
 paragraphSpacing:
 value === '0'
 ? null
 : value,
 },
 )
 .run()
}

function toggleBold() {
 if (!editor.value) return

 const chain = editor.value
 .chain()
 .focus()

 if (props.weightControl) {
 chain.unsetMark('lightWeight')
 }

 chain.toggleBold().run()
}

function toggleLightWeight() {
 if (!editor.value) return

 const wasActive = editor.value.isActive('lightWeight')
 const chain = editor.value
 .chain()
 .focus()

 if (!wasActive) {
 chain.unsetBold()
 }

 chain.toggleMark('lightWeight').run()
}

function buttonClass(active: boolean) {
 return active
 ? `
 bg-gray-950/[0.08]
 text-gray-950

 dark:bg-white/[0.1]
 dark:text-white
 `
 : `
 text-gray-500

 hover:bg-gray-950/[0.045]
 hover:text-gray-900

 dark:text-gray-500
 dark:hover:bg-white/[0.06]
 dark:hover:text-white
 `
}
</script>

<template>
 <div
 class="
 app-rte-shell
 min-w-0
 "
 >
 <label
 v-if="label"
 class="
 mb-1.5
 block

 text-[12px]
 font-medium
 text-gray-600

 dark:text-gray-400
 "
 >
 {{ label }}
 </label>

 <div
 class="
 overflow-hidden

 rounded-[12px]

 bg-gray-950/[0.035]

 transition
 duration-150

 focus-within:bg-gray-950/[0.05]
 focus-within:ring-2
 focus-within:ring-gray-950/10

 dark:bg-white/[0.055]
 dark:focus-within:bg-white/[0.07]
 dark:focus-within:ring-white/10
 "
 :class="
 error
 ? `
 ring-1
 ring-red-400/60
 `
 : ''
 "
 >
 <!-- Toolbar -->
 <div
 v-if="editor"
 class="
 flex
 min-h-9
 flex-wrap
 items-center
 gap-0.5

 px-1.5
 py-1.5

 shadow-[0_1px_0_rgba(17,24,39,0.05)]

 dark:shadow-[0_1px_0_rgba(255,255,255,0.05)]
 "
 >
 <button
 type="button"
 title="Bold"
 class="
 flex
 h-7
 min-w-7
 items-center
 justify-center

 rounded-[7px]

 px-1.5

 text-[12px]
 font-bold

 transition
 "
 :class="
 buttonClass(
 isActive('bold'),
 )
 "
 @click="toggleBold"
 >
 B
 </button>

 <button
 type="button"
 title="Italic"
 class="
 flex
 h-7
 min-w-7
 items-center
 justify-center

 rounded-[7px]

 px-1.5

 text-[12px]
 font-semibold
 italic

 transition
 "
 :class="
 buttonClass(
 isActive('italic'),
 )
 "
 @click="
 editor
 .chain()
 .focus()
 .toggleItalic()
 .run()
 "
 >
 I
 </button>

 <button
 type="button"
 title="Underline"
 class="
 flex
 h-7
 min-w-7
 items-center
 justify-center

 rounded-[7px]

 px-1.5

 text-[12px]
 font-semibold
 underline

 transition
 "
 :class="
 buttonClass(
 isActive('underline'),
 )
 "
 @click="
 editor
 .chain()
 .focus()
 .toggleUnderline()
 .run()
 "
 >
 U
 </button>

 <button
 v-if="!isSimple"
 type="button"
 title="Strikethrough"
 class="
 flex
 h-7
 min-w-7
 items-center
 justify-center

 rounded-[7px]

 px-1.5

 text-[12px]
 font-semibold
 line-through

 transition
 "
 :class="buttonClass(isActive('strike'))"
 @click="
 editor
 .chain()
 .focus()
 .toggleStrike()
 .run()
 "
 >
 S
 </button>

 <button
 v-if="props.weightControl"
 type="button"
 title="Light weight"
 class="
 flex
 h-7
 min-w-7
 items-center
 justify-center

 rounded-[7px]

 px-1.5

 text-[11px]
 font-light

 transition
 "
 :class="
 buttonClass(
 isActive('lightWeight'),
 )
 "
 @click="toggleLightWeight"
 >
 Light
 </button>

 <template v-if="!isSimple">
 <span
 class="
 mx-1
 h-4
 w-px

 bg-gray-200

 dark:bg-white/10
 "
 />

 <button
 type="button"
 title="Paragraph"
 class="
 h-7

 rounded-[7px]

 px-2

 text-[11px]
 font-semibold

 transition
 "
 :class="buttonClass(isActive('paragraph'))"
 @click="
 editor
 .chain()
 .focus()
 .setParagraph()
 .run()
 "
 >
 Text
 </button>

 <button
 type="button"
 title="Heading 2"
 class="
 h-7

 rounded-[7px]

 px-2

 text-[11px]
 font-semibold

 transition
 "
 :class="
 buttonClass(
 isActive(
 'heading',
 {
 level: 2,
 },
 ),
 )
 "
 @click="
 editor
 .chain()
 .focus()
 .toggleHeading({
 level: 2,
 })
 .run()
 "
 >
 H2
 </button>

 <button
 type="button"
 title="Heading 3"
 class="
 h-7

 rounded-[7px]

 px-2

 text-[11px]
 font-semibold

 transition
 "
 :class="
 buttonClass(
 isActive(
 'heading',
 {
 level: 3,
 },
 ),
 )
 "
 @click="
 editor
 .chain()
 .focus()
 .toggleHeading({
 level: 3,
 })
 .run()
 "
 >
 H3
 </button>

 <span
 class="
 mx-1
 h-4
 w-px

 bg-gray-200

 dark:bg-white/10
 "
 />

 <!-- Bullet -->
 <button
 type="button"
 title="Bullet list"
 class="
 flex
 h-7
 items-center
 gap-1.5

 rounded-[7px]

 px-2

 text-[11px]
 font-medium

 transition
 "
 :class="
 buttonClass(
 isActive(
 'bulletList',
 ),
 )
 "
 @click="
 editor
 .chain()
 .focus()
 .toggleBulletList()
 .run()
 "
 >
 <span
 class="
 text-[15px]
 leading-none
 "
 >
 •
 </span>

 List
 </button>

 <!-- Numbered -->
 <button
 type="button"
 title="Numbered list"
 class="
 flex
 h-7
 items-center
 gap-1

 rounded-[7px]

 px-2

 text-[11px]
 font-medium

 transition
 "
 :class="
 buttonClass(
 isActive(
 'orderedList',
 ),
 )
 "
 @click="
 editor
 .chain()
 .focus()
 .toggleOrderedList()
 .run()
 "
 >
 1.
 List
 </button>

 <button
 type="button"
 title="Quote"
 class="
 h-7

 rounded-[7px]

 px-2

 text-[11px]
 font-medium

 transition
 "
 :class="
 buttonClass(
 isActive(
 'blockquote',
 ),
 )
 "
 @click="
 editor
 .chain()
 .focus()
 .toggleBlockquote()
 .run()
 "
 >
 Quote
 </button>
 </template>

 <template v-if="props.spacingControl">
 <span
 class="
 mx-1
 h-4
 w-px

 bg-gray-200

 dark:bg-white/10
 "
 />

 <label
 class="
 flex
 h-7
 items-center
 gap-1.5

 rounded-[7px]

 px-1.5

 text-[11px]
 font-medium
 text-gray-500

 dark:text-gray-400
 "
 title="Add intentional space before the selected paragraph"
 >
 <span>Gap</span>
 <select
 :value="currentParagraphSpacing()"
 :disabled="!isActive('paragraph')"
 class="
 bg-transparent

 text-[11px]
 font-medium
 text-gray-700
 outline-none

 disabled:opacity-40

 dark:text-gray-300
 "
 @change="setParagraphSpacing"
 >
 <option value="0">None</option>
 <option value="4">Small</option>
 <option value="8">Medium</option>
 <option value="12">Large</option>
 <option value="16">XL</option>
 </select>
 </label>
 </template>

 <span class="ml-auto" />

 <button
 type="button"
 title="Clear formatting"
 class="
 h-7

 rounded-[7px]

 px-2

 text-[11px]
 font-medium
 text-gray-400

 transition

 hover:bg-gray-950/[0.045]
 hover:text-gray-800

 dark:text-gray-600
 dark:hover:bg-white/[0.06]
 dark:hover:text-white
 "
 @click="
 editor
 .chain()
 .focus()
 .clearNodes()
 .unsetAllMarks()
 .updateAttributes(
 'paragraph',
 { paragraphSpacing: null },
 )
 .run()
 "
 >
 Clear
 </button>
 </div>

 <EditorContent
 :editor="editor"
 />
 </div>

 <p
 v-if="error"
 class="
 mt-1.5

 text-[12px]
 font-medium
 text-red-600

 dark:text-red-400
 "
 >
 {{ error }}
 </p>
 </div>
</template>

<style scoped>
/*
 IMPORTANT:

 .app-rte-shell exists in this component and
 receives Vue's scoped attribute.

 TipTap creates .app-rte-content and its
 children dynamically.

 Therefore :deep() begins AFTER the shell.
*/

.app-rte-shell :deep(.app-rte-content p) {
 margin: 0.45em 0;
}

.app-rte-shell :deep(.app-rte-content [data-text-weight="light"]) {
 font-weight: 300;
}

/*
 Compact mode is used for short business/contact blocks.
 Normal Enter-created paragraphs stay tight; intentional spacing
 is stored inline by the Gap control and therefore survives in PDFs.
*/
.app-rte-shell :deep(.app-rte-content--compact p) {
 margin: 0;
}

.app-rte-shell :deep(.app-rte-content h2) {
 margin: 0.9em 0 0.35em;
 font-size: 1.12rem;
 line-height: 1.45;
 font-weight: 650;
}

.app-rte-shell :deep(.app-rte-content h3) {
 margin: 0.8em 0 0.3em;
 font-size: 0.98rem;
 line-height: 1.45;
 font-weight: 650;
}

/* BULLET LIST FIX */
.app-rte-shell :deep(.app-rte-content ul) {
 display: block;
 margin: 0.65em 0;
 padding-inline-start: 1.65rem;
 list-style-type: disc !important;
 list-style-position: outside !important;
}

/* NUMBER LIST FIX */
.app-rte-shell :deep(.app-rte-content ol) {
 display: block;
 margin: 0.65em 0;
 padding-inline-start: 1.65rem;
 list-style-type: decimal !important;
 list-style-position: outside !important;
}

.app-rte-shell :deep(.app-rte-content li) {
 display: list-item !important;
 margin: 0.22em 0;
 padding-left: 0.15rem;
}

.app-rte-shell :deep(.app-rte-content li::marker) {
 color: rgb(107 114 128);
}

:global(.dark)
 .app-rte-shell
 :deep(.app-rte-content li::marker) {
 color: rgb(156 163 175);
}

.app-rte-shell :deep(.app-rte-content li > p) {
 display: inline;
 margin: 0;
}

.app-rte-shell
 :deep(.app-rte-content li > ul),
.app-rte-shell
 :deep(.app-rte-content li > ol) {
 margin-top: 0.25em;
}

.app-rte-shell
 :deep(.app-rte-content blockquote) {
 margin: 0.75em 0;
 padding-left: 0.9rem;

 border-left: 2px solid rgb(209 213 219);

 color: rgb(107 114 128);
}

:global(.dark)
 .app-rte-shell
 :deep(.app-rte-content blockquote) {
 border-color: rgb(63 63 70);
 color: rgb(161 161 170);
}

.app-rte-shell
 :deep(
 .app-rte-content
 p.is-editor-empty:first-child::before
 ) {
 float: left;

 height: 0;

 color: rgb(156 163 175);

 content: attr(data-placeholder);

 pointer-events: none;
}
</style>