"use client";

import { Skeleton } from "./Skeleton";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  hasHeader?: boolean;
}

export function TableSkeleton({ 
  rows = 5, 
  cols = 5, 
  hasHeader = true 
}: TableSkeletonProps) {
  return (
    <div className="w-full space-y-4 animate-pulse">
      {hasHeader && (
        <div className="flex items-center justify-between py-4 px-6 bg-slate-50 border-b border-slate-100">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      )}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-4 px-6">
            <div className="flex items-center gap-4 flex-1">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
            <div className="flex items-center gap-8 justify-end">
              {Array.from({ length: cols - 1 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-20 hidden md:block" />
              ))}
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
