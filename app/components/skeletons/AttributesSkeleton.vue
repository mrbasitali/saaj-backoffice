<template>
 <div
 class="
 space-y-4

 sm:space-y-5
 "
 >
 <!-- Intro -->
 <div
 class="
 flex
 items-center
 justify-between
 gap-4
 "
 >
 <AppSkeleton
 class-name="
 h-3
 w-96
 max-w-[60%]
 "
 />

 <div
 class="
 flex
 items-center
 gap-2
 "
 >
 <AppSkeleton
 class-name="
 h-9
 w-9
 "
 rounded="lg"
 />

 <AppSkeleton
 class-name="
 h-9
 w-32
 "
 rounded="lg"
 />
 </div>
 </div>

 <!-- Filters -->
 <div
 class="
 rounded-[18px]

 bg-white

 p-4

 dark:bg-[#111214]
 "
 >
 <div
 class="
 grid
 gap-3

 lg:grid-cols-[1fr_110px]
 "
 >
 <AppSkeleton
 class-name="h-10"
 rounded="lg"
 />

 <AppSkeleton
 class-name="h-10"
 rounded="lg"
 />
 </div>

 <div
 class="
 mt-4

 flex
 gap-4
 "
 >
 <AppSkeleton
 class-name="
 h-3
 w-16
 "
 />

 <AppSkeleton
 class-name="
 h-3
 w-16
 "
 />
 </div>
 </div>

 <!-- Workspace -->
 <div
 class="
 grid
 gap-4

 xl:grid-cols-6
 "
 >
 <!-- List -->
 <div class="space-y-3">
 <div
 class="
 rounded-[18px]

 bg-white

 dark:bg-[#111214]
 "
 >
 <div
 class="
 hidden

 grid-cols-[1.7fr_1fr_90px_80px_44px]
 gap-4

 px-4
 py-3

 md:grid
 "
 >
 <AppSkeleton
 class-name="h-2.5 w-20"
 />

 <AppSkeleton
 class-name="h-2.5 w-16"
 />

 <AppSkeleton
 class-name="ml-auto h-2.5 w-10"
 />

 <AppSkeleton
 class-name="ml-auto h-2.5 w-10"
 />
 </div>

 <div
 v-for="item in 7"
 :key="item"
 class="
 flex
 items-center
 gap-3

 px-4
 py-3
 "
 >
 <AppSkeleton
 class-name="
 h-9
 w-9
 shrink-0
 "
 rounded="lg"
 />

 <div
 class="
 min-w-0
 flex-1
 "
 >
 <AppSkeleton
 class-name="
 h-3.5
 w-36
 "
 />

 <AppSkeleton
 class-name="
 mt-2
 h-3
 w-24
 "
 />
 </div>

 <AppSkeleton
 class-name="
 hidden
 h-8
 w-28

 md:block
 "
 />

 <AppSkeleton
 class-name="
 hidden
 h-8
 w-12

 md:block
 "
 />

 <AppSkeleton
 class-name="
 h-8
 w-8
 "
 rounded="lg"
 />
 </div>
 </div>

 <div
 class="
 flex
 items-center
 justify-between

 rounded-[16px]

 bg-white

 p-3

 dark:bg-[#111214]
 "
 >
 <AppSkeleton
 class-name="
 h-3
 w-40
 "
 />

 <AppSkeleton
 class-name="
 h-8
 w-28
 "
 />
 </div>
 </div>

 <!-- Values -->
 <div
 class="
 rounded-[18px]

 bg-white

 p-4

 dark:bg-[#111214]
 "
 >
 <div
 class="
 flex
 items-start
 justify-between
 gap-3
 "
 >
 <div>
 <AppSkeleton
 class-name="
 h-2.5
 w-16
 "
 />

 <AppSkeleton
 class-name="
 mt-2
 h-5
 w-32
 "
 />

 <AppSkeleton
 class-name="
 mt-2
 h-3
 w-44
 "
 />
 </div>

 <AppSkeleton
 class-name="
 h-9
 w-24
 "
 rounded="lg"
 />
 </div>

 <div
 class="
 mt-6
 space-y-2
 "
 >
 <div
 v-for="item in 6"
 :key="item"
 class="
 flex
 items-center
 gap-3
 "
 >
 <AppSkeleton
 class-name="
 h-8
 w-8
 "
 rounded="lg"
 />

 <div class="flex-1">
 <AppSkeleton
 class-name="
 h-3
 w-28
 "
 />

 <AppSkeleton
 class-name="
 mt-2
 h-2.5
 w-20
 "
 />
 </div>

 <AppSkeleton
 class-name="
 h-8
 w-8
 "
 rounded="lg"
 />
 </div>
 </div>
 </div>
 </div>
 </div>
</template>