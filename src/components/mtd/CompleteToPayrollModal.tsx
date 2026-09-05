"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Wallet,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Tag,
  Edit3,
} from "lucide-react";
import { formatPrice, titleCase } from "@/lib/data";
import { formatDisplayDate, toIsoDateString } from "@/lib/dates";
import { findLinkedOrder, findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { getFullClassificationLabel, computeClientPayroll } from "@/lib/pricing-display";
import {
  calculatePricingApi,
  completePricingApi,
  finalizePayrollApi,
  type PricingBreakdown,
} from "@/lib/api/pricing";
import type { MTDRecord, Order, Producer } from "@/types";
import clsx from "clsx";

type CompleteToPayrollModalProps = {
  open: boolean;
  record: MTDRecord | null;
  allOrders: Order[];
  producers: Producer[];
  onClose: () => void;
  onConfirm: (patch?: Partial<MTDRecord>, orderPatch?: Partial<Order>) => void;
};

export function CompleteToPayrollModal({
  open,
  record,
  allOrders,
  producers,
  onClose,
  onConfirm,
}: CompleteToPayrollModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pricing Breakdown from backend calculation
  const [breakdown, setBreakdown] = useState<PricingBreakdown | null>(null);
  const [finalCustomerPriceInput, setFinalCustomerPriceInput] = useState<string>("");

  // Step 2 Payroll state
  const [selectedCaseyRate, setSelectedCaseyRate] = useState<number | null>(null); // 0.72 or 0.70
  const [customRateInput, setCustomRateInput] = useState<string>(""); // e.g. "72"
  const [manualPayoutInput, setManualPayoutInput] = useState<string>(""); // for Riley / hourly

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal open
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Find linked order and assigned producer
  const linkedOrder = useMemo(() => {
    if (!record) return undefined;
    return findLinkedOrder(record, allOrders);
  }, [record, allOrders]);

  const assignedProducerObj = useMemo(() => {
    if (!record?.assignedProducer) return undefined;
    return findProducerByAssignmentKey(record.assignedProducer, producers);
  }, [record, producers]);

  // Reset & load pricing breakdown when modal opens
  useEffect(() => {
    if (!open || !record) return;

    setStep(1);
    setError(null);
    setSelectedCaseyRate(null);
    setCustomRateInput("");
    setManualPayoutInput("");

    async function loadBreakdown() {
      if (!record) return;
      const currentRec = record;
      setLoading(true);
      try {
        const order = linkedOrder;
        const res = await calculatePricingApi({
          form_type: order?.formType || "school-all-star-cheer",
          cheer_form_subtype: order?.cheerFormSubtype || null,
          dance_form_subtype: order?.danceFormSubtype || null,
          package_name: currentRec.package || order?.package || "TBD",
          music_affiliate: order?.musicAffiliate || currentRec.musicTheme || null,
        });

        setBreakdown(res);

        const initialCustomerPrice =
          order?.finalCustomerPrice ??
          res.system_calculated_customer_price ??
          currentRec.price;

        setFinalCustomerPriceInput(String(initialCustomerPrice));
      } catch (err) {
        console.warn("Failed to calculate pricing from backend endpoint. Falling back to local estimate.", err);
        // Local fallback breakdown
        const sysPrice = currentRec.price || 700;
        setBreakdown({
          form_type: linkedOrder?.formType || "school-all-star-cheer",
          canonical_subtype_id: linkedOrder?.cheerFormSubtype || linkedOrder?.danceFormSubtype || "all-star-cheer",
          package_id: "pkg-local",
          package_name: currentRec.package || "GOLD 1:30",
          pricing_rule_id: null,
          compliance_status: currentRec.priceCompliance === "non-compliant" ? "non-compliant" : "compliant",
          compliance_reason: `Music theme: ${currentRec.musicTheme || "Standard"}`,
          canonical_affiliate: currentRec.musicTheme || null,
          base_customer_price: sysPrice,
          base_payroll_price: sysPrice,
          addons: [],
          system_calculated_customer_price: sysPrice,
          payroll_base_price: sysPrice,
          needs_manual_pricing: false,
          needs_manual_review: !record.musicTheme,
          summary_line: `Package: ${record.package} | Customer price: $${sysPrice}`,
        });
        setFinalCustomerPriceInput(String(record.price || sysPrice));
      } finally {
        setLoading(false);
      }
    }

    loadBreakdown();
  }, [open, record, linkedOrder]);

  if (!mounted || !open || !record) return null;

  // Parsed numerical price
  const finalCustomerPriceNum = parseFloat(finalCustomerPriceInput) || 0;
  const systemPriceNum = breakdown?.system_calculated_customer_price ?? record.price;
  const isCustomerPriceOverridden =
    breakdown?.system_calculated_customer_price !== null &&
    Math.abs(finalCustomerPriceNum - systemPriceNum) > 0.001;

  // Client-side real-time payroll calculation for Step 2
  const activeRateNum = customRateInput !== ""
    ? parseFloat(customRateInput) / 100
    : selectedCaseyRate;

  const activeManualPayoutNum = manualPayoutInput !== "" ? parseFloat(manualPayoutInput) : null;

  const clientPayroll = computeClientPayroll(
    assignedProducerObj,
    finalCustomerPriceNum,
    breakdown,
    activeRateNum,
    activeManualPayoutNum,
    breakdown?.canonical_subtype_id
  );

  const isRateOverridden = customRateInput !== "" || (selectedCaseyRate !== null && assignedProducerObj?.initials !== "CM");

  // Step 1 confirm handler
  const handleProceedToPayroll = async () => {
    setLoading(true);
    setError(null);
    try {
      if (linkedOrder) {
        await completePricingApi(linkedOrder.id, {
          final_customer_price_override: isCustomerPriceOverridden ? finalCustomerPriceNum : undefined,
        });
      }
      setStep(2);
    } catch (err: any) {
      console.warn("Could not save complete-pricing to backend, proceeding to step 2 locally.", err);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 finalization handler
  const handleFinalize = async () => {
    if (clientPayroll.isCaseyAmbiguous && selectedCaseyRate === null) {
      setError("Please select either Old Pricing (72%) or New Pricing (70%) for Casey before finalizing.");
      return;
    }

    if (clientPayroll.status === "needs_manual_review" && (clientPayroll.producerPayout === null || isNaN(clientPayroll.producerPayout))) {
      setError("Please enter a manual payout amount for this producer.");
      return;
    }

    setLoading(true);
    setError(null);

    const producerInitials = assignedProducerObj?.initials || record.assignedProducer || "CM";
    const finalRate = activeRateNum ?? clientPayroll.rateUsed ?? undefined;

    try {
      if (linkedOrder) {
        await finalizePayrollApi(linkedOrder.id, {
          producer_initials: producerInitials,
          final_customer_price: finalCustomerPriceNum,
          overridden_rate: finalRate ?? undefined,
        });
      }

      onConfirm(
        {
          price: finalCustomerPriceNum,
          finalCustomerPrice: finalCustomerPriceNum,
          systemCalculatedCustomerPrice: systemPriceNum,
          finalCustomerPriceOverridden: isCustomerPriceOverridden,
          producerPayout: clientPayroll.producerPayout ?? undefined,
          sltPortion: clientPayroll.sltPortion ?? undefined,
          rateUsed: finalRate ?? undefined,
          rateSource: clientPayroll.rateSource,
          payrollFinalized: true,
        },
        linkedOrder ? {
          finalCustomerPrice: finalCustomerPriceNum,
          systemCalculatedCustomerPrice: systemPriceNum,
          finalCustomerPriceOverridden: isCustomerPriceOverridden,
          producerPayout: clientPayroll.producerPayout ?? undefined,
          sltPortion: clientPayroll.sltPortion ?? undefined,
          rateUsed: finalRate ?? undefined,
          rateSource: clientPayroll.rateSource,
          payrollFinalized: true,
        } : undefined
      );
      onClose();
    } catch (err: any) {
      console.warn("Finalize payroll backend API call failed, completing locally.", err);
      onConfirm({
        price: finalCustomerPriceNum,
        finalCustomerPrice: finalCustomerPriceNum,
        systemCalculatedCustomerPrice: systemPriceNum,
        finalCustomerPriceOverridden: isCustomerPriceOverridden,
        producerPayout: clientPayroll.producerPayout ?? undefined,
        sltPortion: clientPayroll.sltPortion ?? undefined,
        rateUsed: finalRate ?? undefined,
        rateSource: clientPayroll.rateSource,
        payrollFinalized: true,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
        onClick={onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-payroll-title"
        className="relative w-full max-w-[540px] max-h-[90vh] flex flex-col overflow-hidden rounded-[24px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.32)]"
      >
        {/* Header with Step Indicator */}
        <div className="border-b border-brand-line/60 bg-gradient-to-br from-brand-signature/10 via-brand-elevated to-brand-success/8 px-6 pb-4 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold transition",
                  step === 1
                    ? "bg-brand-signature text-white"
                    : "bg-brand-success/20 text-brand-success ring-1 ring-inset ring-brand-success/30"
                )}
              >
                {step === 1 ? "1" : <CheckCircle2 className="h-4 w-4" />}
              </span>
              <span className="text-[13px] font-medium text-brand-ink-secondary">
                1. Pricing Review
              </span>
              <span className="text-brand-ink-tertiary">→</span>
              <span
                className={clsx(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold transition",
                  step === 2
                    ? "bg-brand-signature text-white"
                    : "bg-brand-bg text-brand-ink-tertiary"
                )}
              >
                2
              </span>
              <span className="text-[13px] font-medium text-brand-ink-secondary">
                2. Payroll Setup
              </span>
            </div>

            <span className="rounded-full bg-brand-bg px-2.5 py-1 text-[11px] font-medium text-brand-ink-tertiary border border-brand-line/60">
              {record.invoice ? `Inv #${record.invoice}` : "MTD Move"}
            </span>
          </div>

          <h2
            id="complete-payroll-title"
            className="mt-3 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            {step === 1 ? "Order Pricing & Compliance" : "Producer Payroll Finalization"}
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-brand-ink-secondary">
            {step === 1
              ? `${titleCase(record.programName)} · ${titleCase(record.contactName)}`
              : `Assigned Producer: ${record.assignedProducer ? titleCase(record.assignedProducer) : "Unassigned"}`}
          </p>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-brand-warning/30 bg-brand-warning/10 p-3.5 text-[12.5px] text-brand-ink">
              <AlertTriangle className="h-4 w-4 shrink-0 text-brand-warning mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* STEP 1: PRICING BREAKDOWN */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Classification */}
              <div className="rounded-xl border border-brand-line/70 bg-brand-bg/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
                  Order Classification
                </p>
                <p className="mt-1 text-[13.5px] font-semibold text-brand-ink">
                  {getFullClassificationLabel(
                    breakdown?.form_type,
                    breakdown?.canonical_subtype_id,
                    breakdown?.package_name || record.package
                  )}
                </p>
              </div>

              {/* Compliance status banner */}
              <div
                className={clsx(
                  "rounded-xl border p-4 transition",
                  breakdown?.compliance_status === "compliant"
                    ? "border-brand-success/30 bg-brand-success/8"
                    : breakdown?.compliance_status === "non-compliant"
                    ? "border-brand-warning/30 bg-brand-warning/8"
                    : "border-brand-orange/30 bg-brand-orange/8"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {breakdown?.compliance_status === "compliant" ? (
                      <ShieldCheck className="h-5 w-5 text-brand-success" />
                    ) : breakdown?.compliance_status === "non-compliant" ? (
                      <ShieldAlert className="h-5 w-5 text-brand-warning" />
                    ) : (
                      <HelpCircle className="h-5 w-5 text-brand-orange" />
                    )}
                    <span className="text-[13px] font-bold uppercase tracking-wider">
                      {breakdown?.compliance_status === "compliant"
                        ? "COMPLIANT"
                        : breakdown?.compliance_status === "non-compliant"
                        ? "NON-COMPLIANT"
                        : "NEEDS MANUAL REVIEW"}
                    </span>
                  </div>

                  <span className="text-[11px] font-medium text-brand-ink-secondary">
                    {breakdown?.canonical_affiliate ? `Affiliate: ${breakdown.canonical_affiliate}` : "No Affiliate"}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-brand-ink-secondary">
                  {breakdown?.compliance_reason || "Verified against pricing rules & compliant affiliates map."}
                </p>
              </div>

              {/* Line items pricing breakdown */}
              <div className="rounded-xl border border-brand-line/70 bg-brand-elevated overflow-hidden">
                <div className="bg-brand-bg/60 px-4 py-2.5 border-b border-brand-line/60 flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
                    Pricing Breakdown
                  </span>
                  <span className="text-[11.5px] text-brand-ink-tertiary">
                    Customer Amount
                  </span>
                </div>

                <div className="divide-y divide-brand-line/40 px-4 text-[12.5px]">
                  {/* Base Package Price */}
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="font-medium text-brand-ink">
                        Base Package: {breakdown?.package_name || record.package}
                      </span>
                      <p className="text-[11px] text-brand-ink-tertiary">
                        Rate card standard customer price
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums text-brand-ink">
                      {formatPrice(breakdown?.base_customer_price ?? record.price)}
                    </span>
                  </div>

                  {/* Add-on items */}
                  {breakdown?.addons.map((addon) => (
                    <div key={addon.addon_id} className="flex items-center justify-between py-2.5">
                      <div>
                        <span className="font-medium text-brand-ink">{addon.label}</span>
                        {addon.note && (
                          <p className="text-[11px] text-brand-ink-tertiary">{addon.note}</p>
                        )}
                      </div>
                      <span className="font-semibold tabular-nums text-brand-ink">
                        +{formatPrice(addon.customer_amount)}
                      </span>
                    </div>
                  ))}

                  {/* System Calculated Total */}
                  <div className="flex items-center justify-between py-3 bg-brand-bg/30 -mx-4 px-4 border-t border-brand-line/70">
                    <span className="font-bold text-brand-ink">
                      System Calculated Customer Price
                    </span>
                    <span className="font-bold text-[14px] tabular-nums text-brand-ink">
                      {formatPrice(breakdown?.system_calculated_customer_price ?? record.price)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable Final Customer Price */}
              <div className="rounded-xl border border-brand-line/80 bg-brand-bg/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="final-customer-price-input" className="text-[13px] font-semibold text-brand-ink flex items-center gap-1.5">
                    Final Customer Price
                    {isCustomerPriceOverridden && (
                      <span className="inline-flex items-center gap-1 rounded bg-brand-orange/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-orange ring-1 ring-inset ring-brand-orange/25">
                        <Edit3 className="h-2.5 w-2.5" /> edited
                      </span>
                    )}
                  </label>

                  <span className="text-[11px] text-brand-ink-tertiary">
                    Defaulted to system price
                  </span>
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-brand-ink-tertiary">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <input
                    id="final-customer-price-input"
                    type="number"
                    step="0.01"
                    value={finalCustomerPriceInput}
                    onChange={(e) => setFinalCustomerPriceInput(e.target.value)}
                    className="w-full rounded-lg border border-brand-line bg-brand-elevated py-2 pl-8 pr-3 text-[14px] font-semibold tabular-nums text-brand-ink focus:border-brand-signature focus:outline-none focus:ring-2 focus:ring-brand-signature/20"
                    placeholder="Enter customer price"
                  />
                </div>
                <p className="text-[11px] text-brand-ink-tertiary leading-normal">
                  Persisted distinctly from system-calculated price for audit transparency.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: PAYROLL TRANSITION */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Producer Info & Final Customer Price Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-brand-line/70 bg-brand-bg/40 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
                    Producer
                  </p>
                  <p className="mt-0.5 text-[14px] font-bold text-brand-ink">
                    {assignedProducerObj?.name || record.assignedProducer || "None"}
                  </p>
                  <p className="text-[11px] text-brand-ink-secondary">
                    {assignedProducerObj?.specialty || "Music Producer"}
                  </p>
                </div>

                <div className="rounded-xl border border-brand-line/70 bg-brand-bg/40 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
                      Final Customer Price
                    </p>
                    {isCustomerPriceOverridden && (
                      <span className="rounded bg-brand-orange/10 px-1 py-0.2 text-[9px] font-semibold uppercase text-brand-orange">
                        edited
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[15px] font-bold tabular-nums text-brand-ink">
                    {formatPrice(finalCustomerPriceNum)}
                  </p>
                </div>
              </div>

              {/* Special Compensation Model Warnings */}
              {clientPayroll.status === "not_paid_for_mixing" && (
                <div className="rounded-xl border border-brand-line/70 bg-brand-bg/60 p-4">
                  <p className="text-[13px] font-semibold text-brand-ink">
                    {clientPayroll.message}
                  </p>
                  <p className="mt-1 text-[12px] text-brand-ink-secondary">
                    Steve does not receive per-mix compensation. Payout is $0.00 and SLT retains the full customer price.
                  </p>
                </div>
              )}

              {clientPayroll.status === "hourly_manual" && (
                <div className="rounded-xl border border-brand-line/70 bg-brand-bg/60 p-4">
                  <p className="text-[13px] font-semibold text-brand-ink">
                    {clientPayroll.message}
                  </p>
                  <p className="mt-1 text-[12px] text-brand-ink-secondary">
                    Hourly employee payout is handled via regular pay sheets. You may optionally enter a manual payout amount below.
                  </p>
                </div>
              )}

              {clientPayroll.status === "needs_manual_review" && (
                <div className="rounded-xl border border-brand-warning/30 bg-brand-warning/10 p-4">
                  <div className="flex items-center gap-2 text-brand-warning font-semibold text-[13px]">
                    <AlertTriangle className="h-4 w-4" />
                    <span>No rate on file / Manual review required</span>
                  </div>
                  <p className="mt-1 text-[12px] text-brand-ink-secondary">
                    {clientPayroll.message}
                  </p>
                </div>
              )}

              {/* Casey dual rate choice card */}
              {clientPayroll.isCaseyAmbiguous && (
                <div className="rounded-xl border border-brand-signature/30 bg-brand-signature/8 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-brand-ink">
                      Casey Pricing Tier Selection
                    </span>
                    <span className="rounded bg-brand-signature/20 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-signature">
                      Requires Choice
                    </span>
                  </div>
                  <p className="text-[12px] text-brand-ink-secondary">
                    Casey has two rates configured. Select the correct rate tier for this mix:
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCaseyRate(0.72);
                        setCustomRateInput("");
                      }}
                      className={clsx(
                        "rounded-xl border p-3 text-left transition shadow-sm",
                        selectedCaseyRate === 0.72
                          ? "border-brand-signature bg-brand-signature/15 text-brand-ink ring-2 ring-brand-signature/30"
                          : "border-brand-line/70 bg-brand-elevated text-brand-ink hover:border-brand-line"
                      )}
                    >
                      <p className="text-[12px] font-semibold text-brand-ink">Old Pricing (72%)</p>
                      <p className="mt-1 text-[14px] font-bold text-brand-ink tabular-nums">
                        {formatPrice(clientPayroll.oldPricingPayout ?? 0)}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCaseyRate(0.70);
                        setCustomRateInput("");
                      }}
                      className={clsx(
                        "rounded-xl border p-3 text-left transition shadow-sm",
                        selectedCaseyRate === 0.70
                          ? "border-brand-signature bg-brand-signature/15 text-brand-ink ring-2 ring-brand-signature/30"
                          : "border-brand-line/70 bg-brand-elevated text-brand-ink hover:border-brand-line"
                      )}
                    >
                      <p className="text-[12px] font-semibold text-brand-ink">New Pricing (70%)</p>
                      <p className="mt-1 text-[14px] font-bold text-brand-ink tabular-nums">
                        {formatPrice(clientPayroll.newPricingPayout ?? 0)}
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Editable Compensation Percentage / Manual Dollar Input */}
              {clientPayroll.status === "computed" && (
                <div className="rounded-xl border border-brand-line/70 bg-brand-elevated p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="compensation-rate-input" className="text-[13px] font-semibold text-brand-ink flex items-center gap-1.5">
                      Producer Rate Percentage
                      {isRateOverridden && (
                        <span className="inline-flex items-center gap-1 rounded bg-brand-orange/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-orange ring-1 ring-inset ring-brand-orange/25">
                          <Edit3 className="h-2.5 w-2.5" /> edited
                        </span>
                      )}
                    </label>

                    <span className="text-[11px] text-brand-ink-tertiary">
                      {clientPayroll.rateSource}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        id="compensation-rate-input"
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={
                          customRateInput !== ""
                            ? customRateInput
                            : selectedCaseyRate !== null
                            ? (selectedCaseyRate * 100).toString()
                            : clientPayroll.rateUsed !== null
                            ? (clientPayroll.rateUsed * 100).toString()
                            : ""
                        }
                        onChange={(e) => setCustomRateInput(e.target.value)}
                        className="w-full rounded-lg border border-brand-line bg-brand-bg/50 py-2 pl-3 pr-8 text-[14px] font-semibold tabular-nums text-brand-ink focus:border-brand-signature focus:outline-none focus:ring-2 focus:ring-brand-signature/20"
                        placeholder="e.g. 72"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 font-semibold text-brand-ink-tertiary">
                        %
                      </span>
                    </div>

                    {customRateInput !== "" && (
                      <button
                        type="button"
                        onClick={() => setCustomRateInput("")}
                        className="rounded-lg border border-brand-line/60 bg-brand-bg px-2.5 py-2 text-[11px] font-medium text-brand-ink-secondary hover:bg-brand-line/30"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Manual payout input if required for Riley or Hourly */}
              {(clientPayroll.status === "needs_manual_review" || clientPayroll.status === "hourly_manual") && (
                <div className="rounded-xl border border-brand-line/70 bg-brand-elevated p-4 space-y-2">
                  <label htmlFor="manual-payout-input" className="text-[13px] font-semibold text-brand-ink">
                    Manual Payout Amount ($)
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-brand-ink-tertiary">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <input
                      id="manual-payout-input"
                      type="number"
                      step="0.01"
                      value={manualPayoutInput}
                      onChange={(e) => setManualPayoutInput(e.target.value)}
                      className="w-full rounded-lg border border-brand-line bg-brand-bg/50 py-2 pl-8 pr-3 text-[14px] font-semibold tabular-nums text-brand-ink focus:border-brand-signature focus:outline-none focus:ring-2 focus:ring-brand-signature/20"
                      placeholder="Enter producer payout dollar amount"
                    />
                  </div>
                </div>
              )}

              {/* Instant Real-Time Calculation Preview Card */}
              <div className="rounded-xl border border-brand-success/30 bg-brand-success/8 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-success">
                  Instant Calculated Payout Breakdown
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-lg bg-brand-elevated p-3 border border-brand-line/50">
                    <p className="text-[11px] font-medium text-brand-ink-tertiary">Producer Payout</p>
                    <p className="mt-1 text-[16px] font-bold tabular-nums text-brand-success">
                      {clientPayroll.producerPayout !== null
                        ? formatPrice(clientPayroll.producerPayout)
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-brand-elevated p-3 border border-brand-line/50">
                    <p className="text-[11px] font-medium text-brand-ink-tertiary">SLT Portion</p>
                    <p className="mt-1 text-[16px] font-bold tabular-nums text-brand-ink">
                      {clientPayroll.sltPortion !== null
                        ? formatPrice(clientPayroll.sltPortion)
                        : "—"}
                    </p>
                  </div>
                </div>
                <p className="mt-2.5 text-[11px] text-brand-ink-secondary">
                  {clientPayroll.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-brand-line/60 px-6 py-4 bg-brand-bg/40">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-line/70 bg-brand-elevated px-4 py-2.5 text-[13px] font-semibold text-brand-ink transition hover:bg-brand-bg"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Pricing
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-brand-line/70 bg-brand-elevated px-4 py-2.5 text-[13px] font-semibold text-brand-ink transition hover:bg-brand-bg"
            >
              Cancel
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={handleProceedToPayroll}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-signature px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-brand-signature/90 shadow-sm disabled:opacity-50"
            >
              {loading ? "Calculating..." : "Continue to Payroll Setup"} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalize}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-success px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-brand-success/90 shadow-sm disabled:opacity-50"
            >
              {loading ? "Finalizing..." : "Confirm & Move to Payroll"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
