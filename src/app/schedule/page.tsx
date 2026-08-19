"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPill } from "@/components/ui/FilterPill";
import { Avatar } from "@/components/ui/Avatar";
import { getData } from "@/lib/data";
import clsx from "clsx";

const days = ["Mon Aug 18", "Tue Aug 19", "Wed Aug 20", "Thu Aug 21", "Fri Aug 22"];

export default function SchedulePage() {
  const { producers, schedule } = getData();
  const [selectedProducer, setSelectedProducer] = useState<string>("All");
  const [view, setView] = useState<"week" | "month">("week");

  const filteredProducers =
    selectedProducer === "All"
      ? producers
      : producers.filter((p) => p.initials === selectedProducer);

  return (
    <>
      <PageHeader
        title="Producer Schedule"
        subtitle="See availability by producer without scrolling the spreadsheet"
      />

      <div className="space-y-6 p-8">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterPill
            label="All"
            active={selectedProducer === "All"}
            onClick={() => setSelectedProducer("All")}
          />
          {producers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedProducer(p.initials)}
              className={clsx(
                "flex shrink-0 items-center gap-2.5 rounded-full border px-3 py-1.5 transition",
                selectedProducer === p.initials
                  ? "border-brand-accent bg-brand-accent text-white"
                  : "border-brand-line bg-brand-surface text-brand-ink-secondary hover:border-brand-line-strong"
              )}
            >
              <Avatar src={p.avatar} alt={p.name} size="sm" />
              <span className="text-[12px] font-medium">{p.initials}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <FilterPill label="Weekly" active={view === "week"} onClick={() => setView("week")} />
          <FilterPill label="Monthly" active={view === "month"} onClick={() => setView("month")} />
        </div>

        {filteredProducers.map((producer) => {
          const producerSchedule = schedule.filter(
            (s) => s.producer === producer.initials
          );

          return (
            <div key={producer.id} className="surface-premium overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-brand-line px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar src={producer.avatar} alt={producer.name} />
                  <div>
                    <p className="text-display text-[14px]">{producer.name}</p>
                    <p className="text-[12px] text-brand-ink-tertiary">
                      {producer.specialty} · Next {producer.nextAvailable}
                    </p>
                  </div>
                </div>
                <span
                  className={clsx(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                    producer.status === "available" &&
                      "bg-[#ecfdf5] text-brand-success ring-[#a7f3d0]",
                    producer.status === "limited" &&
                      "bg-[#fffbeb] text-brand-warning ring-[#fde68a]",
                    producer.status === "unavailable" &&
                      "bg-brand-bg text-brand-neutral ring-brand-line"
                  )}
                >
                  {producer.status}
                </span>
              </div>

              <div className="grid grid-cols-5">
                {days.map((day) => {
                  const entry = producerSchedule.find((s) => s.day === day);
                  const status = entry?.status || "available";

                  return (
                    <div
                      key={day}
                      className="border-r border-brand-line px-4 py-5 text-center last:border-r-0"
                    >
                      <p className="text-label">{day.split(" ")[0]}</p>
                      <p className="mt-0.5 text-[11px] text-brand-ink-tertiary">
                        {day.split(" ").slice(1).join(" ")}
                      </p>
                      <div
                        className={clsx(
                          "mx-auto mt-4 flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-wide",
                          status === "mix" && "bg-brand-accent text-white",
                          status === "available" && "bg-brand-bg text-brand-ink-secondary ring-1 ring-brand-line",
                          status === "off" && "bg-brand-bg text-brand-ink-tertiary"
                        )}
                      >
                        {status === "mix" ? "Mix" : status === "off" ? "Off" : "Open"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
