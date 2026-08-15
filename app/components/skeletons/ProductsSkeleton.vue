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
 w-80
 max-w-[55%]
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
 />

 <AppSkeleton
 class-name="
 h-9
 w-28
 "
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

 md:grid-cols-[1fr_100px]
 "
 >
 <AppSkeleton
 class-name="h-10"
 />

 <AppSkeleton
 class-name="h-10"
 />
 </div>

 <div
 class="
 mt-3

 flex
 gap-2

 overflow-hidden
 "
 >
 <AppSkeleton
 v-for="item in 7"
 :key="item"
 class-name="
 h-8
 w-20
 shrink-0
 "
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

 <AppSkeleton
 class-name="
 h-3
 w-24
 "
 />
 </div>
 </div>

 <!-- Desktop -->
 <div
 class="
 hidden

 rounded-[18px]

 bg-white

 dark:bg-[#111214]

 xl:block
 "
 >
 <div
 class="
 grid
 grid-cols-6
 gap-4

 px-4
 py-3
 "
 >
 <AppSkeleton
 class-name="h-3 w-16"
 />

 <AppSkeleton
 class-name="h-3 w-16"
 />

 <AppSkeleton
 class-name="h-3 w-12"
 />

 <AppSkeleton
 class-name="h-3 w-12"
 />

 <AppSkeleton
 class-name="h-3 w-16"
 />

 <AppSkeleton
 class-name="ml-auto h-3 w-12"
 />
 </div>

 <div
 class="
 divide-y
 divide-gray-100

 dark:divide-white/[0.055]
 "
 >
 <div
 v-for="item in 8"
 :key="item"
 class="
 grid
 grid-cols-6
 items-center
 gap-4

 px-4
 py-2.5
 "
 >
 <div
 class="
 flex
 items-center
 gap-3
 "
 >
 <AppSkeleton
 class-name="
 h-12
 w-11
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
 w-40
 "
 />

 <AppSkeleton
 class-name="
 mt-2
 h-2.5
 w-28
 "
 />
 </div>
 </div>

 <div>
 <AppSkeleton
 class-name="
 h-3
 w-24
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
 h-3
 w-14
 "
 />

 <AppSkeleton
 class-name="
 h-3
 w-12
 "
 />

 <div>
 <AppSkeleton
 class-name="
 h-3
 w-20
 "
 />

 <AppSkeleton
 class-name="
 mt-2
 h-2.5
 w-16
 "
 />
 </div>

 <div
 class="
 flex
 justify-end
 gap-2
 "
 >
 <AppSkeleton
 class-name="
 h-8
 w-10
 "
 rounded="lg"
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
 </div>
 </div>

 <!-- Mobile / tablet -->
 <div
 class="
 grid
 gap-2.5

 sm:grid-cols-2

 xl:hidden
 "
 >
 <div
 v-for="item in 6"
 :key="item"
 class="
 rounded-[16px]

 bg-white

 p-3

 dark:bg-[#111214]
 "
 >
 <div
 class="
 flex
 gap-3
 "
 >
 <AppSkeleton
 class-name="
 h-[72px]
 w-[62px]
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
 w-32
 "
 />

 <AppSkeleton
 class-name="
 mt-2
 h-2.5
 w-24
 "
 />

 <AppSkeleton
 class-name="
 mt-3
 h-2.5
 w-36
 "
 />

 <div
 class="
 mt-3
 flex
 gap-3
 "
 >
 <AppSkeleton
 class-name="
 h-2.5
 w-12
 "
 />

 <AppSkeleton
 class-name="
 h-2.5
 w-12
 "
 />

 <AppSkeleton
 class-name="
 h-2.5
 w-12
 "
 />
 </div>
 </div>
 </div>
 </div>
 </div>

 <!-- Pagination -->
 <div
 class="
 flex
 items-center
 justify-between

 rounded-[16px]

 bg-white

 px-4
 py-3

 dark:bg-[#111214]
 "
 >
 <AppSkeleton
 class-name="
 h-3
 w-36
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
 h-8
 w-8
 "
 rounded="lg"
 />

 <AppSkeleton
 class-name="
 h-3
 w-12
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
 </div>
</template>