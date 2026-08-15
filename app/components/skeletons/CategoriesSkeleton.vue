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
 w-32
 "
 />
 </div>
 </div>

 <!-- Controls -->
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

 lg:grid-cols-[1fr_280px]
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

 <!-- Root groups -->
 <div
 class="
 space-y-2.5
 "
 >
 <div
 v-for="root in 4"
 :key="root"
 class="
 rounded-[16px]

 bg-white

 dark:bg-[#111214]
 "
 >
 <!-- Root -->
 <div
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
 h-7
 w-7
 shrink-0
 "
 rounded="lg"
 />

 <AppSkeleton
 class-name="
 h-10
 w-10
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
 w-52
 "
 />
 </div>

 <div
 class="
 hidden
 gap-6

 lg:flex
 "
 >
 <AppSkeleton
 class-name="
 h-8
 w-16
 "
 />

 <AppSkeleton
 class-name="
 h-8
 w-16
 "
 />

 <AppSkeleton
 class-name="
 h-8
 w-16
 "
 />
 </div>

 <AppSkeleton
 class-name="
 h-8
 w-8
 shrink-0
 "
 rounded="lg"
 />
 </div>

 <!-- Children -->
 <div
 v-for="child in 2"
 :key="child"
 class="
 flex
 items-center
 gap-3

 px-4
 py-2.5
 pl-12
 "
 >
 <AppSkeleton
 class-name="
 h-7
 w-7
 shrink-0
 "
 rounded="lg"
 />

 <AppSkeleton
 class-name="
 h-10
 w-10
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
 h-3
 w-44
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
</template>