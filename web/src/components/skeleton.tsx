'use client';

import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-surface-muted/80',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}

export function KanbanColumnSkeleton() {
  return (
    <div className="min-w-72 shrink-0 rounded-xl border-2 border-border bg-surface-muted/40 p-4">
      <Skeleton className="h-5 w-24" />
      <div className="mt-4 space-y-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}
