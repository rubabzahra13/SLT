import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardKpiStripLive } from "@/components/dashboard/DashboardKpiStripLive";
import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";

export default function DashboardPage() {
  const currentDate = new Date();
  const todayLabel = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="dashboard-page flex h-[calc(100dvh-3.5rem-3.25rem)] flex-col overflow-hidden md:h-[calc(100dvh-3.25rem)]">
      <div className="shrink-0">
        <PageHeader
          compact
          title="Dashboard"
          subtitle={todayLabel}
        />
      </div>

      <div className="dashboard-fit px-6 pb-3 pt-2 lg:px-8">
        <DashboardKpiStripLive />

        <DashboardPageClient />
      </div>
    </div>
  );
}
