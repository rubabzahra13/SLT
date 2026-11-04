/** Instant shell while the Flagged Orders chunk loads — no data fetch. */
export default function FlaggedOrdersLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="sticky top-0 z-30 shrink-0 border-b border-brand-line-strong/50 bg-white">
        <div className="px-6 py-4 lg:px-8">
          <div className="h-7 w-44 animate-pulse rounded-md bg-brand-line/60" />
          <div className="mt-2 h-3.5 w-64 max-w-full animate-pulse rounded-md bg-brand-line/45" />
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-24 animate-pulse rounded-xl bg-brand-line/55" />
            <div className="h-8 w-20 animate-pulse rounded-xl bg-brand-line/45" />
            <div className="h-8 w-28 animate-pulse rounded-xl bg-brand-line/45" />
          </div>
        </div>
      </header>
      <div
        className="min-h-0 flex-1 overflow-auto px-2 pb-6 pt-5 lg:px-3"
        role="status"
        aria-label="Loading flagged orders"
      >
        <div className="dashboard-panel dashboard-panel-framed space-y-2 overflow-hidden p-3">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg px-2 py-2.5"
            >
              <span className="h-3.5 w-10 shrink-0 animate-pulse rounded bg-brand-line/55" />
              <span className="h-3.5 min-w-0 flex-1 animate-pulse rounded bg-brand-line/65" />
              <span className="h-3.5 w-24 shrink-0 animate-pulse rounded bg-brand-line/45" />
              <span className="h-7 w-16 shrink-0 animate-pulse rounded-md bg-brand-line/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
