<template>
 <div class="space-y-4 sm:space-y-5">
 <!-- Page header skeleton -->
 <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
 <div class="max-w-2xl">
 <AppSkeleton class-name="h-4 w-24" />
 <AppSkeleton class-name="mt-3 h-9 w-56" />
 <AppSkeleton class-name="mt-3 h-4 w-[34rem] max-w-full" />
 </div>

 <div class="flex flex-col gap-2 sm:flex-row">
 <AppSkeleton class-name="h-10 w-full sm:w-36" />
 <AppSkeleton class-name="h-10 w-full sm:w-28" />
 </div>
 </div>

 <!-- KPI cards skeleton -->
 <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
 <AppCard
 v-for="item in 4"
 :key="`kpi-${item}`"
 class="p-4"
 >
 <div class="flex items-start justify-between gap-4">
 <div class="flex-1">
 <AppSkeleton class-name="h-4 w-28" />
 <AppSkeleton class-name="mt-6 h-8 w-36" />
 </div>

 <AppSkeleton
 rounded="full"
 class-name="h-6 w-16"
 />
 </div>

 <div class="mt-5 space-y-2">
 <AppSkeleton class-name="h-3.5 w-full" />
 <AppSkeleton class-name="h-3.5 w-3/4" />
 </div>
 </AppCard>
 </div>

 <!-- Main dashboard body skeleton -->
 <div class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
 <!-- Inventory snapshot skeleton -->
 <AppCard class="p-4">
 <div class="flex flex-col gap-4 shadow-[0_1px_0_rgba(17,24,39,0.05)] pb-5 sm:flex-row sm:items-start sm:justify-between">
 <div>
 <AppSkeleton class-name="h-5 w-44" />
 <AppSkeleton class-name="mt-3 h-4 w-80 max-w-full" />
 </div>

 <AppSkeleton class-name="h-9 w-32" />
 </div>

 <div class="mt-5 grid gap-3 sm:grid-cols-3">
 <div
 v-for="item in 3"
 :key="`inventory-${item}`"
 class="rounded-[12px] bg-gray-950/[0.035] p-4 dark:bg-white/[0.055]"
 >
 <AppSkeleton class-name="h-4 w-28" />
 <AppSkeleton class-name="mt-4 h-7 w-24" />
 <AppSkeleton class-name="mt-4 h-3 w-full" />
 </div>
 </div>

 <div class="mt-5 rounded-[14px] bg-gray-950/[0.025] p-4 dark:bg-white/[0.035]">
 <div class="mb-4 flex items-center justify-between">
 <AppSkeleton class-name="h-4 w-32" />
 <AppSkeleton class-name="h-4 w-20" />
 </div>

 <div class="space-y-3">
 <div
 v-for="item in 5"
 :key="`bar-${item}`"
 class="flex items-center gap-3"
 >
 <AppSkeleton
 rounded="full"
 class-name="h-8 w-8 shrink-0"
 />

 <div class="flex-1">
 <AppSkeleton class-name="h-3.5 w-32" />
 <AppSkeleton class-name="mt-2 h-2.5 w-full" />
 </div>

 <AppSkeleton class-name="h-4 w-12" />
 </div>
 </div>
 </div>
 </AppCard>

 <!-- Quick actions skeleton -->
 <AppCard class="p-4">
 <div class="shadow-[0_1px_0_rgba(17,24,39,0.05)] pb-5 ">
 <AppSkeleton class-name="h-5 w-32" />
 <AppSkeleton class-name="mt-3 h-4 w-60 max-w-full" />
 </div>

 <div class="mt-5 grid gap-3">
 <div
 v-for="item in 3"
 :key="`action-${item}`"
 class="rounded-[14px] bg-gray-950/[0.025] p-4 "
 >
 <div class="flex items-center justify-between gap-4">
 <div class="flex-1">
 <AppSkeleton class-name="h-4 w-44" />
 <AppSkeleton class-name="mt-3 h-3.5 w-64 max-w-full" />
 </div>

 <AppSkeleton
 rounded="full"
 class-name="h-8 w-8 shrink-0"
 />
 </div>
 </div>
 </div>
 </AppCard>
 </div>
 </div>
</template>