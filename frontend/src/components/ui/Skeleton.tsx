import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => {
  return (
    <div className={clsx("skeleton rounded-md", className)} />
  );
};

// Pre-built skeleton patterns
export const StationCardSkeleton = () => (
  <div className="flex items-center p-3 rounded-lg border border-border">
    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
    <div className="flex-1 ml-3 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

export const RouteCardSkeleton = () => (
  <div className="p-3 rounded-lg border border-border space-y-3">
    <div className="flex items-center">
      <Skeleton className="w-12 h-8 rounded shrink-0" />
      <div className="flex-1 ml-3 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <div className="pt-2 border-t border-border space-y-1.5">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  </div>
);

export const SearchResultSkeleton = () => (
  <div className="flex items-center p-3 rounded-lg border border-border">
    <Skeleton className="w-16 h-10 rounded shrink-0" />
    <div className="flex-1 ml-3 space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
);
