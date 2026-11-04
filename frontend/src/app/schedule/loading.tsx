/** Instant shell while the Schedule chunk loads. */
export default function ScheduleLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="sticky top-0 z-30 shrink-0 border-b border-brand-line-strong/50 bg-white">
        <div className="px-6 py-4 lg:px-8">
          <div className="h-7 w-32 animate-pulse rounded-md bg-brand-line/60" />
          <div className="mt-2 h-3.5 w-48 animate-pulse rounded-md bg-brand-line/45" />
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto px-6 py-5 lg:px-8">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl bg-brand-line/45"
          />
        ))}
      </div>
    </div>
  );
}
