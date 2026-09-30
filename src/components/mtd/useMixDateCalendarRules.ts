"use client";

import { useMemo } from "react";
import type { MTDRecord, Order, Producer } from "@/types";
import type { StudioHoliday } from "@/lib/producer-time-off";
import { buildMixDateCalendarRules } from "@/lib/assign-editor-calendar";
import { toIsoDateString } from "@/lib/dates";
import { inferMTDRecordStatus } from "@/lib/mtd-status";
import { suggestMixEndDate } from "@/lib/producer-availability";
import {
  createBookedCostEstimator,
  estimateRecordProducerPayout,
} from "@/lib/producer-payout-estimate";

type MixDateCalendarRulesInput = {
  record: MTDRecord | null | undefined;
  producer: Producer | null | undefined;
  /** Current mix start (may be an unsaved draft). */
  mixStartDate: string;
  producers: Producer[];
  mtdRecords: MTDRecord[];
  allOrders: Order[];
  studioHolidays: StudioHoliday[];
};

/**
 * Mix start/end picker rules for a record's producer: blocks their days off,
 * leave and studio holidays; flags days at a daily limit. Also returns the
 * suggested end (start + package working days).
 */
export function useMixDateCalendarRules({
  record,
  producer,
  mixStartDate,
  producers,
  mtdRecords,
  allOrders,
  studioHolidays,
}: MixDateCalendarRulesInput) {
  const orderById = useMemo(
    () => new Map(allOrders.map((order) => [order.id, order])),
    [allOrders]
  );
  const estimateCost = useMemo(
    () => createBookedCostEstimator(producers, orderById),
    [producers, orderById]
  );

  const rules = useMemo(
    () =>
      buildMixDateCalendarRules({
        producer: producer ?? null,
        studioHolidays,
        mtdRecords,
        excludeRecordId: record?.id,
        estimateCost,
        newMixCost:
          record && producer
            ? estimateRecordProducerPayout(record, producer, orderById)
            : null,
        allowPastDays: record
          ? Boolean(record.inPayroll) || inferMTDRecordStatus(record) !== "Ongoing"
          : false,
      }),
    [producer, studioHolidays, mtdRecords, record, estimateCost, orderById]
  );

  const startIso = toIsoDateString(mixStartDate);
  const packageStr = record?.package ?? "";
  const suggestedEndIso = useMemo(
    () =>
      startIso
        ? suggestMixEndDate(startIso, packageStr, {
            producer: producer ?? null,
            studioHolidays,
          })
        : "",
    [startIso, packageStr, producer, studioHolidays]
  );

  return { ...rules, suggestedEndIso };
}
