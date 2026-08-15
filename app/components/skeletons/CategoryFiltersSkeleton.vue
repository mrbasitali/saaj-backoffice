<template>
 <div class="space-y-4 sm:space-y-5">
 <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
 <div>
 <AppSkeleton class-name="h-4 w-28" />
 <AppSkeleton class-name="mt-3 h-9 w-72" />
 <AppSkeleton class-name="mt-3 h-4 w-[38rem] max-w-full" />
 </div>

 <div class="flex gap-2">
 <AppSkeleton class-name="h-10 w-28" />
 <AppSkeleton class-name="h-10 w-36" />
 </div>
 </div>

 <div class="grid gap-4 xl:grid-cols-[420px_1fr]">
 <AppCard class="p-4">
 <AppSkeleton class-name="h-5 w-40" />
 <AppSkeleton class-name="mt-3 h-11 w-full" />

 <div class="mt-5 space-y-3">
 <AppSkeleton
 v-for="item in 8"
 :key="item"
 class-name="h-14"
 />
 </div>
 </AppCard>

 <AppCard class="p-4">
 <AppSkeleton class-name="h-6 w-60" />
 <AppSkeleton class-name="mt-3 h-4 w-96 max-w-full" />

 <div class="mt-6 grid gap-3 sm:grid-cols-3">
 <AppSkeleton class-name="h-24" />
 <AppSkeleton class-name="h-24" />
 <AppSkeleton class-name="h-24" />
 </div>

 <div class="mt-6 space-y-3">
 <AppSkeleton
 v-for="item in 6"
 :key="item"
 class-name="h-20"
 />
 </div>
 </AppCard>
 </div>
 </div>
</template>