import { cn } from "../lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle" | "text";
}

export default function Skeleton({ className, variant = "rect" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-muted/20",
        variant === "circle" ? "rounded-full" : variant === "text" ? "rounded h-4" : "rounded-2xl",
        className
      )}
    />
  );
}

export function MediaCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[2/3] w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function PostSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-[24px] p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="w-10 h-10" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}
