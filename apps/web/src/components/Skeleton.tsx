export interface TaskCardSkeletonProps {
  count?: number;
}

export function TaskCardSkeleton({ count = 3 }: TaskCardSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className="flex flex-col gap-2"
    >
      <span className="sr-only">Loading...</span>
      {Array.from({ length: Math.max(0, count) }).map((_, index) => (
        <div
          key={index}
          className="bg-card border border-border rounded-card p-4 animate-pulse flex gap-3 shadow-card"
          aria-hidden="true"
        >
          {/* Circular checkbox placeholder */}
          <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-border mt-0.5 bg-border/40" />

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              {/* Title line placeholder */}
              <div className="h-4 bg-border rounded w-2/5" />
              {/* Priority dot & pill placeholder */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-pill border border-border flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-border" />
                <div className="h-3 w-10 bg-border rounded" />
              </div>
            </div>

            {/* Description placeholder */}
            <div className="h-3 bg-border/60 rounded w-3/4" />

            {/* Date pill placeholder */}
            <div className="flex items-center gap-2 mt-1.5">
              <div className="h-4 w-24 bg-border/60 rounded-pill" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface SuggestionCardSkeletonProps {
  count?: number;
}

export function SuggestionCardSkeleton({ count = 2 }: SuggestionCardSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className="flex flex-col gap-3"
    >
      <span className="sr-only">Loading...</span>
      {Array.from({ length: Math.max(0, count) }).map((_, index) => (
        <article
          key={index}
          className="bg-card border border-border rounded-card p-4 animate-pulse flex flex-col gap-3 shadow-card"
          aria-hidden="true"
        >
          {/* Source email placeholder */}
          <div className="flex items-center gap-2">
            <div className="h-3 bg-border rounded w-28" />
            <div className="h-3 bg-border/60 rounded w-36" />
          </div>

          {/* Header row: title line & match percentage pill */}
          <div className="flex items-start justify-between gap-2">
            <div className="h-4 bg-border rounded w-1/2" />
            <div className="h-5 w-16 bg-border rounded-pill flex-shrink-0" />
          </div>

          {/* Chips: priority pill & date pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-pill border border-border">
              <div className="w-2 h-2 rounded-full bg-border" />
              <div className="h-3 w-10 bg-border rounded" />
            </div>
            <div className="h-4 w-20 bg-border/60 rounded-pill" />
          </div>

          {/* Email Context Preview box placeholder */}
          <div className="bg-bg/60 rounded-btn p-2.5 border border-border/50 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="h-3 bg-border rounded w-20" />
              <div className="h-3 bg-border/60 rounded w-14" />
            </div>
            <div className="h-3 bg-border/60 rounded w-full" />
            <div className="h-3 bg-border/40 rounded w-4/5" />
          </div>

          {/* Actions: Accept, Edit, Dismiss button placeholders */}
          <div className="flex gap-2 border-t border-border pt-3">
            <div className="h-8 bg-border rounded-btn flex-1" />
            <div className="h-8 bg-border rounded-btn w-14" />
            <div className="h-8 bg-border rounded-btn w-16" />
          </div>
        </article>
      ))}
    </div>
  );
}
