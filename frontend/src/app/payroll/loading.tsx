/** Instant shell while the Payroll chunk loads. */
export default function PayrollLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="sticky top-0 z-30 shrink-0 border-b border-brand-line-strong/50 bg-white">
        <div className="px-6 py-3 lg:px-8">
          <div className="h-7 w-28 animate-pulse rounded-md bg-brand-line/60" />
          <div className="mt-2 h-3.5 w-40 animate-pulse rounded-md bg-brand-line/45" />
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-auto px-2 pb-6 pt-5 lg:px-3">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
            <span className="h-3.5 w-10 shrink-0 animate-pulse rounded bg-brand-line/55" />
            <span className="h-3.5 min-w-0 flex-1 animate-pulse rounded bg-brand-line/65" />
            <span className="h-3.5 w-20 shrink-0 animate-pulse rounded bg-brand-line/45" />
          </div>
        ))}
      </div>
    </div>
  );
}
