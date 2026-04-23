"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function ShareDetailSkeleton() {
  return (
    <div className="space-y-6 pb-10 max-w-6xl mx-auto">
      
      {/* ── Header Skeleton ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-11 h-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-32 rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>

      {/* ── Profile Card Skeleton ── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-8 py-8 flex flex-col md:flex-row items-center gap-6">
          <Skeleton className="w-24 h-24 rounded-3xl" />
          <div className="text-center md:text-left flex-1 space-y-3">
            <div className="flex justify-center md:justify-start gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-9 w-64 rounded-xl mx-auto md:mx-0" />
            <Skeleton className="h-4 w-40 rounded-md mx-auto md:mx-0" />
          </div>
          <div className="bg-slate-100/50 p-6 rounded-3xl min-w-[240px] space-y-2 text-right">
            <Skeleton className="h-3 w-24 rounded-full ml-auto" />
            <Skeleton className="h-10 w-40 rounded-xl ml-auto" />
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Monthly Grid Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-slate-100 space-y-2">
                  <Skeleton className="h-3 w-10 rounded-full" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
            <div className="mt-6 p-6 bg-slate-50 rounded-3xl flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-32 rounded-full" />
                <Skeleton className="h-9 w-40 rounded-xl" />
              </div>
              <Skeleton className="w-12 h-12 rounded-2xl" />
            </div>
          </div>

          {/* Side Info Skeleton */}
          <div className="space-y-8">
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex justify-between items-end pb-3 border-b border-slate-200 border-dashed">
                    <Skeleton className="h-3 w-20 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
                <div className="pt-2 space-y-2">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <Skeleton className="h-10 w-full" />
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
