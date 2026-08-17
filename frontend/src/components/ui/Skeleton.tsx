interface SkeletonProps {
  className?: string;
  variant?: "text" | "circle" | "rect";
}

export function Skeleton({ className = "", variant = "text" }: SkeletonProps) {
  const base =
    "bg-gradient-to-r from-border via-surface to-border bg-[length:200%_100%] animate-[skeleton-shimmer_1.8s_ease-in-out_infinite]";

  const variants = {
    text: `h-4 rounded-md w-full ${base}`,
    circle: `rounded-full ${base}`,
    rect: `rounded-xl ${base}`,
  };

  return <div className={`${variants[variant]} ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-3/4" />
          <Skeleton className="w-1/2" />
        </div>
      </div>
      <Skeleton className="w-full h-20" variant="rect" />
      <div className="flex gap-2">
        <Skeleton className="w-20 h-6" variant="rect" />
        <Skeleton className="w-16 h-6" variant="rect" />
      </div>
    </div>
  );
}
