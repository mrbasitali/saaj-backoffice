<template>
 <div class="space-y-4 sm:space-y-5">
 <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
 <div>
 <AppSkeleton class-name="h-4 w-28" />
 <AppSkeleton class-name="mt-3 h-9 w-72" />
 <AppSkeleton class-name="mt-3 h-4 w-[44rem] max-w-full" />
 </div>

 <div class="flex gap-2">
 <AppSkeleton class-name="h-10 w-28" />
 <AppSkeleton class-name="h-10 w-32" />
 </div>
 </div>

 <AppCard class="p-4">
 <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
 <AppSkeleton class-name="h-11" />
 <AppSkeleton class-name="h-11" />
 <AppSkeleton class-name="h-11" />
 <AppSkeleton class-name="h-11" />
 </div>

 <div class="mt-4 flex flex-wrap gap-2">
 <AppSkeleton rounded="lg" class-name="h-8 w-24" />
 <AppSkeleton rounded="lg" class-name="h-8 w-24" />
 <AppSkeleton rounded="lg" class-name="h-8 w-24" />
 </div>
 </AppCard>

 <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
 <AppCard
 v-for="item in 4"
 :key="item"
 class="p-4"
 >
 <AppSkeleton class-name="h-4 w-24" />
 <AppSkeleton class-name="mt-4 h-8 w-24" />
 <AppSkeleton class-name="mt-3 h-3 w-32" />
 </AppCard>
 </div>

 <AppCard class="hidden overflow-hidden xl:block">
 <div class="divide-y divide-gray-100 dark:divide-white/[0.055]">
 <div
 v-for="item in 8"
 :key="item"
 class="grid grid-cols-[150px_minmax(280px,1fr)_170px_150px_150px_170px] items-center gap-4 p-4"
 >
 <AppSkeleton class-name="h-4 w-24" />

 <div>
 <AppSkeleton class-name="h-4 w-56" />
 <AppSkeleton class-name="mt-2 h-3 w-40" />
 </div>

 <AppSkeleton rounded="lg" class-name="h-8 w-24" />
 <AppSkeleton class-name="h-4 w-20" />
 <AppSkeleton class-name="h-4 w-20" />
 <AppSkeleton class-name="h-4 w-24" />
 </div>
 </div>
 </AppCard>
 </div>
</template>