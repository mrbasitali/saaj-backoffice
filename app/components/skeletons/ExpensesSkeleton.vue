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
        <AppSkeleton class-name="h-10 w-40" />
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <AppCard
        v-for="item in 3"
        :key="item"
        class="p-4"
      >
        <AppSkeleton class-name="h-4 w-24" />
        <AppSkeleton class-name="mt-4 h-8 w-24" />
        <AppSkeleton class-name="mt-3 h-3 w-32" />
      </AppCard>
    </div>

    <AppCard class="overflow-hidden">
      <div class="p-4 shadow-[0_1px_0_rgba(17,24,39,0.05)]">
        <div class="grid gap-3 xl:grid-cols-[1fr_auto]">
          <AppSkeleton class-name="h-11 w-full" />
          <AppSkeleton class-name="h-10 w-32" />
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AppSkeleton class-name="h-11" />
          <AppSkeleton class-name="h-11" />
          <AppSkeleton class-name="h-11" />
          <AppSkeleton class-name="h-11" />
        </div>
      </div>
    </AppCard>

    <AppCard class="hidden overflow-hidden xl:block">
      <div class="divide-y divide-gray-100 dark:divide-white/[0.055]">
        <div
          v-for="item in 8"
          :key="item"
          class="grid grid-cols-5 items-center gap-4 p-4"
        >
          <div>
            <AppSkeleton class-name="h-4 w-40" />
            <AppSkeleton class-name="mt-2 h-3 w-28" />
          </div>

          <div>
            <AppSkeleton class-name="h-4 w-32" />
            <AppSkeleton class-name="mt-2 h-3 w-24" />
          </div>

          <AppSkeleton rounded="lg" class-name="h-6 w-20" />
          <AppSkeleton class-name="ml-auto h-4 w-20" />

          <div class="flex justify-end">
            <AppSkeleton class-name="h-9 w-9" />
          </div>
        </div>
      </div>
    </AppCard>
  </div>
</template>
