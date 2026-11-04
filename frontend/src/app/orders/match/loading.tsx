/** Instant shell while the Match Orders chunk loads — no data fetch. */
export default function MatchOrdersLoading() {
  const widths = [72, 54, 66, 48, 60, 58];
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="sticky top-0 z-30 shrink-0 border-b border-brand-line-strong/50 bg-white">
        <div className="px-6 py-4 lg:px-8">
          <div className="h-7 w-40 animate-pulse rounded-md bg-brand-line/60" />
          <div className="mt-2 h-3.5 w-72 max-w-full animate-pulse rounded-md bg-brand-line/45" />
        </div>
      </header>
      <div
        className="min-h-0 flex-1 overflow-hidden px-2 pb-4 pt-4 lg:px-3"
        role="status"
        aria-label="Loading match orders"
      >
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-2">
          {[0, 1].map((col) => (
            <section
              key={col}
              className="dashboard-panel dashboard-panel-framed flex min-h-0 flex-col overflow-hidden"
            >
              <header className="space-y-2 border-b border-brand-line/40 px-4 py-3">
                <div className="h-4 w-36 animate-pulse rounded-md bg-brand-line/65" />
                <div className="h-3 w-48 animate-pulse rounded-md bg-brand-line/45" />
              </header>
              <div className="min-h-0 flex-1 space-y-1 overflow-hidden p-2" aria-hidden>
                {widths.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  >
                    <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-brand-line/65" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <span
                        className="block h-3.5 animate-pulse rounded-md bg-brand-line/70"
                        style={{ width: `${w}%` }}
                      />
                      <span
                        className="block h-3 animate-pulse rounded-md bg-brand-line/50"
                        style={{ width: `${Math.max(32, w - 18)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
