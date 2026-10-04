"use client";

import { useEffect, useMemo, useState } from "react";
import type { MTDRecord, Order, Producer } from "@/types";
import { buildMixDateCalendarRules, producerScheduleFingerprint } from "@/lib/assign-editor-calendar";
import { toIsoDateString } from "@/lib/dates";
import { orderCategoryToProducerCategory } from "@/lib/editor-assignment";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";
import { inferMTDRecordStatus } from "@/lib/mtd-status";
import { PRICING_REFERENCE_CHANGED_EVENT } from "@/lib/order-package-price";
import { collectOpenAssignedMixRecords } from "@/lib/producer-assigned-mixes";
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
  const [pricingReferenceRevision, setPricingReferenceRevision] = useState(0);
  useEffect(() => {
    const bump = () => setPricingReferenceRevision((n) => n + 1);
    window.addEventListener(PRICING_REFERENCE_CHANGED_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(PRICING_REFERENCE_CHANGED_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  const producerRatesRevision = useMemo(
    () =>
      producers
        .map((p) => `${p.id}:${JSON.stringify(p.ratesByCategory ?? null)}`)
        .join("|"),
    [producers]
  );
  const estimateCost = useMemo(
    () => createBookedCostEstimator(producers, orderById),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [producers, orderById, pricingReferenceRevision, producerRatesRevision]
  );

  const activeOrders = useMemo(
    () => allOrders.filter((order) => order.status !== "completed"),
    [allOrders]
  );

  const bookingRecords = useMemo(
    () => collectOpenAssignedMixRecords(activeOrders, mtdRecords),
    [activeOrders, mtdRecords]
  );

  const formMeta = useMemo(
    () => (record ? resolveMTDFormMeta(record, orderById) : null),
    [record, orderById]
  );

  const matchCategory = useMemo(() => {
    if (!formMeta) return record?.category;
    return (
      orderCategoryToProducerCategory(
        formMeta.formType,
        formMeta.canonicalSubtypeId
      ) || record?.category
    );
  }, [formMeta, record?.category]);

  const scheduleRevision = useMemo(
    () => producerScheduleFingerprint(producer, bookingRecords, record?.id),
    [producer, bookingRecords, record?.id]
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
      mtdRecords: bookingRecords,
      excludeRecordId: record?.id,
      estimateCost,
      newMixCost: dailyShare,
      matchCategory,
      matchFormType: formMeta?.formType || record?.formType,
      allowPastDays: record
        ? Boolean(record.inPayroll) || inferMTDRecordStatus(record) !== "Ongoing"
        : false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    scheduleRevision,
    record,
    producer,
    estimateCost,
    orderById,
    bookingRecords,
    matchCategory,
    formMeta?.formType,
  ]);

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
