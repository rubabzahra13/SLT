"use client";

import clsx from "clsx";
import { HoverTip } from "@/components/ui/HoverTip";
import {
  InlineSelect,
  inlinePillActiveClass,
  inlinePillInactiveClass,
} from "@/components/mtd/InlineFields";

const rushPillGroupClass =
  "inline-flex max-w-full items-center gap-0.5 rounded-lg bg-brand-bg-subtle/90 p-0.5 ring-1 ring-inset ring-brand-line/40";
const rushPillClass =
  "relative whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none transition-all duration-150";
const rushStepClass =
  "flex h-5 w-4 shrink-0 items-center justify-center rounded text-[12px] font-bold leading-none text-brand-ink-secondary hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35";
import { formatPrice } from "@/lib/data";
import {
  DEFAULT_RUSH_FEE_UNIT,
  MAX_RUSH_FEE_QUANTITY,
  normalizeCompensationFraction,
  rushCompensationChoices,
  rushCustomerTotal,
  type RushFeeSelection,
} from "@/lib/rush-fee";

type PayrollRushFeeControlsProps = {
  /** Rush order Yes on the mix or linked order — fee payout only applies then. */
  rushOrder: boolean;
  selection: RushFeeSelection;
  producerRate?: number | null;
  readOnly?: boolean;
  onQuantity: (quantity: number) => void;
  onRate: (percent: number) => void;
};

function rateToWholePercent(rate: number | null | undefined): number | null {
  const fraction = normalizeCompensationFraction(rate);
  if (fraction == null) return null;
  return Math.round(fraction * 100);
}

export function PayrollRushFeeControls({
  rushOrder,
  selection,
  producerRate,
  readOnly = false,
  onQuantity,
  onRate,
}: PayrollRushFeeControlsProps) {
  const rushQty = rushOrder ? selection.quantity : 0;
  const unit = selection.unitAmount > 0 ? selection.unitAmount : DEFAULT_RUSH_FEE_UNIT;
  const effectivePct = rateToWholePercent(selection.rate);
  const quantityLabel = (quantity: number) =>
    `${quantity}x (${formatPrice(rushCustomerTotal(unit, quantity))})`;

  const rateChoices = rushCompensationChoices(
    selection.rate ?? producerRate,
    producerRate
  ).map((fraction) => {
    const pct = rateToWholePercent(fraction);
    return pct != null ? `${pct}%` : "";
  }).filter(Boolean);

  const selectValue = effectivePct != null ? `${effectivePct}%` : "—";

  const handleQtyChange = (qty: number) => {
    if (readOnly || !rushOrder) return;
    onQuantity(qty);
  };

  const inactive = !rushOrder || readOnly;

  return (
    <div
      data-stop-row-nav
      className={clsx(
        "inline-flex min-w-max shrink-0 items-center",
        inactive && "pointer-events-none opacity-80"
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={rushPillGroupClass}>
        {rushOrder ? (
          <button
            type="button"
            className={rushStepClass}
            disabled={readOnly || rushQty <= 0}
            aria-label="Decrease rush fee quantity"
            onClick={(event) => {
              event.stopPropagation();
              if (rushQty <= 0) return;
              // 1 → 0 clears the manual Rushby add-on (unset until admin re-adds).
              handleQtyChange(rushQty - 1);
            }}
          >
            −
          </button>
        ) : null}
        <HoverTip
          label={
            rushQty === 1
              ? `Click again to remove ${quantityLabel(1)}`
              : `Apply ${quantityLabel(1)}`
          }
          placement="top"
        >
          <button
            type="button"
            disabled={!rushOrder || readOnly}
            aria-pressed={rushQty === 1}
            onClick={(event) => {
              event.stopPropagation();
              // detail>1 = trailing click of a double-click; ignore so clear sticks.
              if (event.detail > 1) return;
              // Same as MTD: click applies, click again clears.
              handleQtyChange(rushQty === 1 ? 0 : 1);
            }}
            className={clsx(
              rushPillClass,
              rushQty === 1 ? inlinePillActiveClass : inlinePillInactiveClass
            )}
          >
            {quantityLabel(1)}
          </button>
        </HoverTip>
        <HoverTip
          label={
            rushQty === 2
              ? `Click again to remove ${quantityLabel(2)}`
              : `Apply ${quantityLabel(2)}`
          }
          placement="top"
        >
          <button
            type="button"
            disabled={!rushOrder || readOnly}
            aria-pressed={rushQty === 2}
            onClick={(event) => {
              event.stopPropagation();
              if (event.detail > 1) return;
              handleQtyChange(rushQty === 2 ? 0 : 2);
            }}
            className={clsx(
              rushPillClass,
              rushQty === 2 ? inlinePillActiveClass : inlinePillInactiveClass
            )}
          >
            {quantityLabel(2)}
          </button>
        </HoverTip>
        {rushOrder && rushQty > 2 ? (
          <span className={clsx(rushPillClass, inlinePillActiveClass)}>
            {quantityLabel(rushQty)}
          </span>
        ) : null}
        {rushOrder ? (
          <button
            type="button"
            className={rushStepClass}
            disabled={readOnly || rushQty >= MAX_RUSH_FEE_QUANTITY}
            aria-label="Increase rush fee quantity"
            onClick={(event) => {
              event.stopPropagation();
              handleQtyChange(Math.min(MAX_RUSH_FEE_QUANTITY, Math.max(1, rushQty) + 1));
            }}
          >
            +
          </button>
        ) : null}
        {rushOrder && rushQty > 0 ? (
          <HoverTip
            label="Override Rush Fee Producer Compensation %"
            placement="top"
          >
            <InlineSelect
              variant="pill"
              pillActive={effectivePct != null}
              className="!px-1.5 !py-0.5 !text-[11px]"
              value={selectValue}
              options={rateChoices.length ? rateChoices : ["100%", "72%", "60%", "50%"]}
              readOnly={readOnly}
              onChange={(next) => {
                if (readOnly) return;
                const pct = parseInt(String(next).replace("%", ""), 10);
                if (!Number.isFinite(pct)) return;
                onRate(pct);
              }}
            />
          </HoverTip>
        ) : null}
        {rushOrder && rushQty > 0 ? (
          <span
            title="Producer rush fee compensation"
            className="inline-flex h-5 items-center rounded-md bg-white px-1 text-[11px] font-semibold tabular-nums text-brand-ink ring-1 ring-inset ring-brand-line/70"
          >
            {selection.rate == null ? "—" : formatPrice(selection.compensation)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
