/**
 * View-only producer payout breakdown for the Payroll tab.
 *
 * Persisted sources (read, never written here):
 * - orders.final_customer_price / price — package (or SE manual quote)
 * - orders.pricing_breakdown.payroll_base_price — payroll base after compliance + dance extras
 * - orders.pricing_breakdown.base_payroll_price — package payroll before extras
 * - orders.rate_used + rate_source + producer_payout — locked Complete-to-Payroll compensation
 * - mtd_records.extra_songs_quantity / extra_song_editing_time_quantity
 * - payroll_addons (rush_fee, misc_adjustment) — payroll-only, omitted when unset
 * Sports Entertainment rush ($100) is payroll-only. It never reduces the package price.
 * Pre-Game / Halftime Remixed stays $250; rush is +$100 on top when Rush Order is Yes.
 */
import type { MTDRecord, Order, PayrollAddon, Producer } from "@/types";
import { findLinkedOrder, findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { payrollRowIsRushOrder } from "@/lib/forward-order-mail";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";
import {
  resolveDanceExtraSongTimeQuantity,
  resolveDanceExtraSongsQuantity,
} from "@/lib/export-csv";
import { miscAdjustmentAmount, applyMiscAdjustmentToPayout } from "@/lib/misc-payroll-adjustment";
import {
  computeClientPayroll,
  finalizedPackageProducerPayout,
  finalizedPayrollRate,
} from "@/lib/pricing-display";
import { formatCompensationPercent } from "@/lib/producers";
import {
  finalizeMixPayout,
  resolveRushFeeSelection,
  rushFeeAddonForRecord,
  sportsEntertainmentIncludedRushFeeAmount,
} from "@/lib/rush-fee";

const EXTRA_SONG_UNIT = 15;
const EXTRA_TIME_UNIT = 30;

export type PayoutCalcKind = "base" | "reduction" | "addition" | "result" | "total";

export type PayoutCalcSection = "base" | "compensation" | "addons" | "total";

export type PayoutCalcLine = {
  label: string;
  detail?: string;
  amount: number;
  kind: PayoutCalcKind;
  section: PayoutCalcSection;
};

export type PayoutCalculationView = {
  lines: PayoutCalcLine[];
  total: number | null;
};

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function complianceApplies(formType: string | undefined): boolean {
  return (
    formType === "school-all-star-cheer" ||
    formType === "school-all-star-dance" ||
    formType === "sports-entertainment"
  );
}

export function buildPayoutCalculationView(input: {
  record: MTDRecord;
  allOrders: Order[];
  producers: Producer[];
  payrollAddons: PayrollAddon[];
}): PayoutCalculationView {
  const { record, allOrders, producers, payrollAddons } = input;
  const order = findLinkedOrder(record, allOrders);
  const producer = findProducerByAssignmentKey(
    record.assignedProducer,
    producers
  );
  const meta = resolveMTDFormMeta(record, new Map(
    allOrders.flatMap((o) => {
      const pairs: [string, Order][] = [];
      if (o.id) pairs.push([o.id, o]);
      if (o.legacyId) pairs.push([o.legacyId, o]);
      if (o.uuid) pairs.push([o.uuid, o]);
      return pairs;
    })
  ));

  const isDance = meta.formType === "school-all-star-dance";
  const isSports = meta.formType === "sports-entertainment";
  const packagePrice =
    asNumber(order?.finalCustomerPrice) ??
    asNumber(record.finalCustomerPrice) ??
    asNumber(order?.price) ??
    asNumber(record.price) ??
    0;
  const payrollPrice =
    asNumber(order?.finalPayrollPrice) ??
    asNumber(record.finalPayrollPrice) ??
    packagePrice;

  const songQty = isDance ? resolveDanceExtraSongsQuantity(record, order) : 0;
  const timeQty = isDance
    ? resolveDanceExtraSongTimeQuantity(record, order)
    : 0;
  const songAmt = money(songQty * EXTRA_SONG_UNIT);
  const timeAmt = money(timeQty * EXTRA_TIME_UNIT);

  const isRush = payrollRowIsRushOrder(record, order);
  const seFee = isSports
    ? sportsEntertainmentIncludedRushFeeAmount({
        isRush,
        formType: meta.formType,
        category: order?.category || record.category,
        finalCustomerPrice: packagePrice,
        finalPayrollPrice: payrollPrice,
      })
    : 0;

  const storedBasePayroll = asNumber(
    (order?.pricingBreakdown as { base_payroll_price?: number } | null)
      ?.base_payroll_price
  );
  // Only the dollars actually stored above the package are "inside" payroll.
  // A Rush Order flag alone must not turn a $250 Pre-Game package into $150.
  const rushInsidePayroll =
    isSports && seFee > 0 && payrollPrice > packagePrice + 0.009
      ? Math.min(seFee, money(payrollPrice - packagePrice))
      : 0;
  const payrollBeforeRush = money(
    payrollPrice - songAmt - timeAmt - rushInsidePayroll
  );
  let payrollPackage = payrollBeforeRush;
  if (
    !isSports &&
    storedBasePayroll != null &&
    Math.abs(storedBasePayroll - payrollPackage) < 1
  ) {
    payrollPackage = money(storedBasePayroll);
  }

  const shownPackage = packagePrice;

  const lines: PayoutCalcLine[] = [
    {
      label: "Package price",
      amount: money(shownPackage),
      kind: "base",
      section: "base",
    },
  ];

  if (complianceApplies(meta.formType)) {
    const delta = money(shownPackage - payrollPackage);
    if (Math.abs(delta) >= 0.01) {
      lines.push({
        label: "Music compliancy",
        amount: Math.abs(delta),
        kind: delta > 0 ? "reduction" : "addition",
        section: "base",
      });
    }
  }

  if (songQty > 0) {
    lines.push({
      label: "Extra songs",
      detail: `${songQty} × $${EXTRA_SONG_UNIT}`,
      amount: songAmt,
      kind: "addition",
      section: "base",
    });
  }
  if (timeQty > 0) {
    lines.push({
      label: "Extra song time",
      detail: `${timeQty} × $${EXTRA_TIME_UNIT}`,
      amount: timeAmt,
      kind: "addition",
      section: "base",
    });
  }
  if (isSports && seFee > 0) {
    lines.push({
      label: "Rush order",
      detail:
        rushInsidePayroll > 0
          ? "Sports Entertainment rush"
          : "Sports Entertainment rush — not in the saved payroll base",
      amount: seFee,
      kind: "addition",
      section: "base",
    });
  }

  const selectedRate = finalizedPayrollRate(order);
  const calc = computeClientPayroll(
    producer,
    packagePrice,
    null,
    selectedRate,
    record.manualPayoutInput ?? null,
    meta.canonicalSubtypeId,
    payrollPrice,
    {
      rushFeeQuantity: 0,
      includeRushFeeInPayout: false,
      sportsEntertainmentRushFee: seFee,
      rushFeeCompensationRate: producer?.rushFeeRate ?? 1,
      danceVoiceover: null,
      hasTraditionalVoiceover: false,
      hasThemedVoiceover: false,
      cheerVoiceover20: false,
      cheerVoiceover40: false,
      formType: meta.formType,
    }
  );

  const packagePortion = finalizedPackageProducerPayout(
    order,
    calc.producerPayout
  );
  const rateLabel =
    formatCompensationPercent(selectedRate ?? calc.rateUsed) ?? "—";
  const rateEdited = order?.rateSource === "manual_override";
  // Rate was applied to the payroll base that Complete to Payroll saved.
  const compensationBase = money(payrollPrice);

  if (producer?.compensationModel === "not_paid_for_mixing") {
    lines.push({
      label: "Not paid for mixing",
      amount: 0,
      kind: "result",
      section: "compensation",
    });
  } else if (producer?.compensationModel === "hourly_manual") {
    lines.push({
      label: "Manual payout",
      detail: "Hourly pay sheet",
      amount: packagePortion ?? 0,
      kind: "result",
      section: "compensation",
    });
  } else if (packagePortion == null) {
    lines.push({
      label: `Compensation ${rateLabel}`,
      detail: "Rate is not on file for this category",
      amount: 0,
      kind: "result",
      section: "compensation",
    });
  } else {
    lines.push({
      label: `Compensation ${rateLabel}`,
      detail: [
        rateEdited
          ? "Saved override from Complete to Payroll"
          : "Category rate",
        `of $${compensationBase.toFixed(2)}`,
      ].join(" · "),
      amount: packagePortion,
      kind: "result",
      section: "compensation",
    });
  }

  const selection = resolveRushFeeSelection({
    isRush,
    producerRate: producer?.rushFeeRate,
    producerId: producer?.id,
    addon: rushFeeAddonForRecord(record.id, record.orderId, payrollAddons),
  });
  if (selection.quantity > 0 && selection.compensation !== 0) {
    const unit = selection.unitAmount;
    lines.push({
      label: "Rush fee",
      detail: `${selection.quantity} × $${unit} × ${formatCompensationPercent(selection.rate) ?? "—"}`,
      amount: Math.abs(selection.compensation),
      kind: selection.compensation < 0 ? "reduction" : "addition",
      section: "addons",
    });
  }

  const misc = miscAdjustmentAmount(record.id, record.orderId, payrollAddons);
  if (misc !== 0) {
    lines.push({
      label: "Miscellaneous adjustment",
      amount: Math.abs(misc),
      kind: misc < 0 ? "reduction" : "addition",
      section: "addons",
    });
  }

  const withRush = finalizeMixPayout(
    producer?.compensationModel === "not_paid_for_mixing"
      ? 0
      : packagePortion,
    calc.status,
    selection
  );
  const total = applyMiscAdjustmentToPayout(
    producer?.compensationModel === "not_paid_for_mixing" ? 0 : withRush,
    misc
  );

  if (total != null) {
    lines.push({
      label: "Producer payout",
      amount: total,
      kind: "total",
      section: "total",
    });
  }

  return { lines, total };
}
