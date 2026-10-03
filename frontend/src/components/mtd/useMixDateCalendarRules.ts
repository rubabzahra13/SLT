"use client";

import { useMemo } from "react";
import type { MTDRecord, Order, Producer } from "@/types";
import { buildMixDateCalendarRules, producerScheduleFingerprint } from "@/lib/assign-editor-calendar";
import { toIsoDateString } from "@/lib/dates";
import { inferMTDRecordStatus } from "@/lib/mtd-status";
import { suggestMixEndDate } from "@/lib/producer-availability";
import {
  createBookedCostEstimator,
  estimateRecordBasePayout,
} from "@/lib/producer-payout-estimate";
import { packageMixWorkingDays } from "@/lib/producer-availability";

type MixDateCalendarRulesInput = {
  record: MTDRecord | null | undefined;
  producer: Producer | null | undefined;
  /** Current mix start (may be an unsaved draft). */
  mixStartDate: string;
  producers: Producer[];
  mtdRecords: MTDRecord[];
  allOrders: Order[];
};

/**
 * Mix start/end picker rules for a record's producer: only work + Extra days
 * are pickable; leave is shown blocked; other mixes are pink with tooltips.
 * Also returns the suggested end (start + package working days).
 */
export function useMixDateCalendarRules({
  record,
  producer,
  mixStartDate,
  producers,
  mtdRecords,
  allOrders,
}: MixDateCalendarRulesInput) {
  const orderById = useMemo(
    () => new Map(allOrders.map((order) => [order.id, order])),
    [allOrders]
  );
  const estimateCost = useMemo(
    () => createBookedCostEstimator(producers, orderById),
    [producers, orderById]
  );

  const scheduleRevision = useMemo(
    () => producerScheduleFingerprint(producer, mtdRecords, record?.id),
    [producer, mtdRecords, record?.id]
  );

  const rules = useMemo(() => {
    const base =
      record && producer
        ? estimateRecordBasePayout(record, producer, orderById)
        : null;
    const packageDays = Math.max(1, packageMixWorkingDays(record?.package ?? ""));
    const dailyShare =
      base != null ? Math.round((base / packageDays) * 100) / 100 : null;
    return buildMixDateCalendarRules({
      producer: producer ?? null,
      mtdRecords,
      excludeRecordId: record?.id,
      estimateCost,
      newMixCost: dailyShare,
      allowPastDays: record
        ? Boolean(record.inPayroll) || inferMTDRecordStatus(record) !== "Ongoing"
        : false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleRevision, record, producer, estimateCost, orderById]);

  const startIso = toIsoDateString(mixStartDate);
  const packageStr = record?.package ?? "";
  const suggestedEndIso = useMemo(
    () =>
      startIso
        ? suggestMixEndDate(startIso, packageStr, {
            producer: producer ?? null,
          })
        : "",
    [startIso, packageStr, producer]
  );

  return { ...rules, suggestedEndIso, calendarRevision: scheduleRevision };
}
