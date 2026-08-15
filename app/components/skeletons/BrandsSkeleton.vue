<template>
 <div class="space-y-4 sm:space-y-5">
 <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
 <div>
 <AppSkeleton class-name="h-4 w-20" />
 <AppSkeleton class-name="mt-3 h-9 w-56" />
 <AppSkeleton class-name="mt-3 h-4 w-[34rem] max-w-full" />
 </div>

 <div class="flex gap-2">
 <AppSkeleton class-name="h-10 w-28" />
 <AppSkeleton class-name="h-10 w-32" />
 </div>
 </div>

 <AppCard class="p-4">
 <div class="grid gap-3">
 <AppSkeleton class-name="h-11 w-full" />

 <div class="grid gap-3 sm:grid-cols-3">
 <AppSkeleton class-name="h-11" />
 <AppSkeleton class-name="h-11" />
 <AppSkeleton class-name="h-11" />
 </div>

 <div class="flex gap-2 shadow-[0_-1px_0_rgba(17,24,39,0.05)] pt-4 ">
 <AppSkeleton rounded="lg" class-name="h-8 w-24" />
 <AppSkeleton rounded="lg" class-name="h-8 w-24" />
 <AppSkeleton rounded="lg" class-name="h-8 w-28" />
 </div>
 </div>
 </AppCard>

 <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
 <AppCard
 v-for="item in 9"
 :key="item"
 class="overflow-hidden"
 >
 <AppSkeleton class-name="h-32 w-full rounded-none" />

 <div class="p-4">
 <div class="flex items-start gap-4">
 <AppSkeleton rounded="2xl" class-name="h-14 w-14 shrink-0" />

 <div class="min-w-0 flex-1">
 <AppSkeleton class-name="h-5 w-36" />
 <AppSkeleton class-name="mt-3 h-4 w-28" />
 </div>

 <AppSkeleton rounded="xl" class-name="h-9 w-9" />
 </div>

 <AppSkeleton class-name="mt-5 h-4 w-full" />
 <AppSkeleton class-name="mt-2 h-4 w-4/5" />

 <div class="mt-5 flex gap-2">
 <AppSkeleton rounded="lg" class-name="h-8 w-20" />
 <AppSkeleton rounded="lg" class-name="h-8 w-24" />
 </div>
 </div>
 </AppCard>
 </div>
 </div>
</template>