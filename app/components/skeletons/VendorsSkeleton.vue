<template>
 <div class="space-y-4 sm:space-y-5">
 <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
 <div>
 <AppSkeleton class-name="h-4 w-24" />
 <AppSkeleton class-name="mt-3 h-9 w-56" />
 <AppSkeleton class-name="mt-3 h-4 w-[42rem] max-w-full" />
 </div>

 <div class="flex gap-2">
 <AppSkeleton class-name="h-10 w-28" />
 <AppSkeleton class-name="h-10 w-32" />
 </div>
 </div>

 <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
 <AppCard
 v-for="item in 4"
 :key="item"
 class="p-4"
 >
 <AppSkeleton class-name="h-4 w-24" />
 <AppSkeleton class-name="mt-4 h-8 w-20" />
 <AppSkeleton class-name="mt-3 h-3 w-32" />
 </AppCard>
 </div>

 <AppCard class="overflow-hidden">
 <div class="shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 ">
 <div class="grid gap-3 xl:grid-cols-[1fr_auto_auto]">
 <AppSkeleton class-name="h-11 w-full" />
 <AppSkeleton class-name="h-10 w-32" />
 <AppSkeleton class-name="h-10 w-28" />
 </div>

 <div class="mt-4 flex flex-wrap gap-2">
 <AppSkeleton rounded="lg" class-name="h-8 w-14" />
 <AppSkeleton rounded="lg" class-name="h-8 w-20" />
 <AppSkeleton rounded="lg" class-name="h-8 w-24" />
 <AppSkeleton rounded="lg" class-name="h-8 w-24" />
 </div>
 </div>

 <div class="grid gap-3 shadow-[0_1px_0_rgba(17,24,39,0.05)] p-4 sm:grid-cols-2 xl:grid-cols-5">
 <AppSkeleton class-name="h-11" />
 <AppSkeleton class-name="h-11" />
 <AppSkeleton class-name="h-11" />
 <AppSkeleton class-name="h-11" />
 <AppSkeleton class-name="h-11" />
 </div>
 </AppCard>

 <AppCard class="hidden overflow-hidden xl:block">
 <div class="divide-y divide-gray-100 dark:divide-white/[0.055]">
 <div
 v-for="item in 8"
 :key="item"
 class="grid grid-cols-6 items-center gap-4 p-4"
 >
 <div>
 <AppSkeleton class-name="h-4 w-52" />
 <AppSkeleton class-name="mt-2 h-3 w-36" />
 <AppSkeleton class-name="mt-2 h-3 w-44" />
 </div>

 <div>
 <AppSkeleton class-name="h-4 w-36" />
 <AppSkeleton class-name="mt-2 h-3 w-40" />
 </div>

 <AppSkeleton rounded="lg" class-name="h-8 w-20" />
 <AppSkeleton class-name="h-4 w-20" />
 <AppSkeleton class-name="h-4 w-24" />

 <div class="flex justify-end gap-2">
 <AppSkeleton class-name="h-9 w-16" />
 <AppSkeleton class-name="h-9 w-9" />
 </div>
 </div>
 </div>
 </AppCard>
 </div>
</template>