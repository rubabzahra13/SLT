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
import { useAppState } from "@/context/AppStateContext";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";
import {
  calculateCheerOrderPricing,
  calculateDanceOrderPricing,
  calculateMarchingBandOrderPricing,
  calculateSportsEntertainmentOrderPricing,
  calculateSchoolAnthemOrderPricing,
} from "@/lib/pricing-engine";
import { parsePackage } from "@/lib/package";
import { evaluateCouponCode } from "@/lib/discount-codes";
import {
  calculatePricingApi,
  completePricingApi,
  finalizePayrollApi,
  type AddOnLineItem,
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
  const [finalPayrollPriceInput, setFinalPayrollPriceInput] = useState<string>("");
  const [calculatedEnginePricing, setCalculatedEnginePricing] = useState<any>(null);
  const [modalCouponCode, setModalCouponCode] = useState<string>("");

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

  const { discountCodes } = useAppState();

  // Find linked order and assigned producer
  const linkedOrder = useMemo(() => {
    if (!record) return undefined;
    return findLinkedOrder(record, allOrders);
  }, [record, allOrders]);

  const assignedProducerObj = useMemo(() => {
    if (!record?.assignedProducer) return undefined;
    return findProducerByAssignmentKey(record.assignedProducer, producers);
  }, [record, producers]);

  // Reset modal state on open
  useEffect(() => {
    if (!open || !record) return;

    setStep(1);
    setError(null);
    setSelectedCaseyRate(null);
    setCustomRateInput("");
    setManualPayoutInput("");

    const order = linkedOrder;
    const initialCoupon = order?.couponCode || (order as any)?.formData?.couponCode || (record as any)?.couponCode || "";
    setModalCouponCode(initialCoupon);
  }, [open, record, linkedOrder]);

  // Reset & load pricing breakdown when modal opens or coupon code changes
  useEffect(() => {
    if (!open || !record) return;

    async function loadBreakdown() {
      if (!record) return;
      const currentRec = record;
      setLoading(true);
      try {
        const order = linkedOrder;
        const orderById = new Map<string, Order>();
        for (const o of allOrders) {
          if (o.id) orderById.set(o.id, o);
          if (o.legacyId) orderById.set(o.legacyId, o);
          if (o.uuid) orderById.set(o.uuid, o);
        }
        const meta = resolveMTDFormMeta(currentRec, orderById);
        const cheerSubtype = meta.cheerFormSubtype;
        const danceSubtype = meta.danceFormSubtype;
        const pkgName = order?.packageType || currentRec.package;
        const mixLen = order?.timeLengthOfMix || parsePackage(currentRec.package).limit;
        const affiliate = order?.musicAffiliate || currentRec.musicTheme || (currentRec as any).musicAffiliate;

        const activeCoupon = modalCouponCode !== undefined
          ? modalCouponCode
          : (order?.couponCode || (order as any)?.formData?.couponCode || (currentRec as any)?.couponCode || "");

        const couponEval = evaluateCouponCode(activeCoupon, discountCodes);
        const matchedDiscountCode = couponEval.status === "valid" ? couponEval.match ?? null : null;

        let enginePricing: any;
        let canonicalSubtypeId: string = "";
        let complianceReason = "";
        const addons: AddOnLineItem[] = [];
        let baseCust: number | null = 0;
        let basePay: number | null = 0;

        if (meta.formType === "school-all-star-dance") {
          canonicalSubtypeId = danceSubtype;
          const danceResult = calculateDanceOrderPricing({
            danceFormSubtype: danceSubtype,
            packageType: pkgName,
            musicAffiliate: affiliate,
            hasTraditionalVoiceover: currentRec.hasTraditionalVoiceover,
            hasThemedVoiceover: currentRec.hasThemedVoiceover,
          });

          let discountAmount = 0;
          if (matchedDiscountCode && matchedDiscountCode.discountType && typeof matchedDiscountCode.discountValue === "number" && matchedDiscountCode.discountValue > 0) {
            const preDiscountBase = danceResult.payrollBasePrice;
            if (matchedDiscountCode.discountType === "fixed") {
              discountAmount = Math.min(preDiscountBase, Math.max(0, matchedDiscountCode.discountValue));
            } else if (matchedDiscountCode.discountType === "percentage") {
              const pct = Math.max(0, Math.min(100, matchedDiscountCode.discountValue));
              discountAmount = Math.min(preDiscountBase, Math.round(preDiscountBase * (pct / 100)));
            }
          }

          const preDiscountCust = danceResult.customerFacingPrice;
          const preDiscountPay = danceResult.payrollBasePrice;

          enginePricing = {
            ...danceResult,
            customerFacingPrice: Math.max(0, preDiscountCust - discountAmount),
            payrollBasePrice: Math.max(0, preDiscountPay - discountAmount),
            preDiscountCustomerFacingPrice: preDiscountCust,
            preDiscountPayrollBasePrice: preDiscountPay,
            discountAmount,
            discountType: matchedDiscountCode?.discountType,
            discountValue: matchedDiscountCode?.discountValue,
            packageName: danceResult.matchedEntry?.package || pkgName,
            timeLengthOfMix: "",
          };

          if (enginePricing.alwaysFixedPayroll) {
            complianceReason = "Jazz Simple Cut uses non-compliant song with time cuts only; fixed $100 payroll base applies.";
          } else if (enginePricing.complianceStatus === "compliant") {
            complianceReason = `Music affiliate '${affiliate || "Approved Affiliate"}' is on the compliant affiliate list.`;
          } else if (enginePricing.complianceStatus === "non-compliant") {
            complianceReason = `Music affiliate '${affiliate || "Unapproved"}' is not on the compliant list; non-compliant rate card applies.`;
          } else {
            complianceReason = "No music affiliate specified on order.";
          }

          if (currentRec.hasTraditionalVoiceover) {
            addons.push({
              addon_id: "traditional_vo",
              label: "Traditional Voice Over",
              customer_amount: 25,
              payroll_amount: 25,
              quantity: 1,
              note: "Fixed fee add-on (Dance)",
            });
          }
          if (currentRec.hasThemedVoiceover) {
            addons.push({
              addon_id: "themed_vo",
              label: "Themed Voice Over",
              customer_amount: 75,
              payroll_amount: 75,
              quantity: 1,
              note: "Fixed fee add-on (Dance)",
            });
          }

          baseCust = danceResult.matchedEntry?.customer ?? currentRec.price;
          basePay = danceResult.matchedEntry
            ? (danceResult.alwaysFixedPayroll
                ? danceResult.matchedEntry.compliant
                : danceResult.complianceStatus === "non-compliant"
                ? danceResult.matchedEntry.nonCompliant
                : danceResult.matchedEntry.compliant)
            : currentRec.price;

        } else if (meta.formType === "marching-band") {
          canonicalSubtypeId = "marching-band";
          const sheetMusic = Boolean(currentRec.hasSheetMusicAdd ?? (order as any)?.hasSheetMusicAdd);
          const addVocals = Boolean(currentRec.hasAddVocals ?? (order as any)?.hasAddVocals);

          const mbResult = calculateMarchingBandOrderPricing({
            packageType: pkgName,
            musicAffiliate: affiliate,
            hasSheetMusicAdd: sheetMusic,
            hasAddVocals: addVocals,
          });

          const preDiscountCust = mbResult.customerFacingPrice;
          const preDiscountPay = mbResult.payrollBasePrice;

          let discountAmount = 0;
          if (matchedDiscountCode && matchedDiscountCode.discountType && typeof matchedDiscountCode.discountValue === "number" && matchedDiscountCode.discountValue > 0) {
            if (matchedDiscountCode.discountType === "fixed") {
              discountAmount = Math.min(preDiscountPay, Math.max(0, matchedDiscountCode.discountValue));
            } else if (matchedDiscountCode.discountType === "percentage") {
              const pct = Math.max(0, Math.min(100, matchedDiscountCode.discountValue));
              discountAmount = Math.min(preDiscountPay, Math.round(preDiscountPay * (pct / 100)));
            }
          }

          enginePricing = {
            ...mbResult,
            customerFacingPrice: Math.max(0, preDiscountCust - discountAmount),
            payrollBasePrice: Math.max(0, preDiscountPay - discountAmount),
            preDiscountCustomerFacingPrice: preDiscountCust,
            preDiscountPayrollBasePrice: preDiscountPay,
            discountAmount,
            discountType: matchedDiscountCode?.discountType,
            discountValue: matchedDiscountCode?.discountValue,
            packageName: mbResult.matchedEntry?.package || pkgName,
            timeLengthOfMix: "",
          };

          if (mbResult.alwaysFixedPayroll) {
            complianceReason = "Fight Song / Alma Mater uses fixed customer/payroll pricing ($1,100 / $2,250); compliance-insensitive.";
          } else if (mbResult.complianceStatus === "unknown-no-affiliate-field") {
            complianceReason = "Unknown / No Affiliate Field Required on Marching Band customer form.";
          } else if (mbResult.complianceStatus === "compliant") {
            complianceReason = `Music affiliate '${affiliate || "Approved Affiliate"}' is on the compliant affiliate list.`;
          } else {
            complianceReason = `Music affiliate '${affiliate || "Unapproved"}' is not on the compliant list; non-compliant rate card applies.`;
          }

          if (sheetMusic) {
            addons.push({
              addon_id: "sheet_music_add",
              label: "Sheet Music Add",
              customer_amount: 50,
              payroll_amount: 50,
              quantity: 1,
              note: "Fixed fee add-on (Marching Band)",
            });
          }
          if (addVocals) {
            addons.push({
              addon_id: "add_vocals",
              label: "Add Vocals",
              customer_amount: 75,
              payroll_amount: 75,
              quantity: 1,
              note: "Fixed fee add-on (Marching Band)",
            });
          }

          baseCust = mbResult.matchedEntry?.customer ?? currentRec.price;
          basePay = mbResult.matchedEntry?.compliant ?? currentRec.price;

        } else if (meta.formType === "sports-entertainment") {
          canonicalSubtypeId = "sports-entertainment";
          const isRush = currentRec.isRushOrder ?? (order as any)?.isRushOrder;

          const seResult = calculateSportsEntertainmentOrderPricing({
            packageType: pkgName,
            isRushOrder: isRush,
          });

          if (seResult.hasRushFee) {
            addons.push({
              addon_id: "rush_order",
              label: "Rush Order Add-On (2-day turnaround)",
              customer_amount: 100,
              payroll_amount: 100,
              quantity: 1,
              note: "Rush fee (Sports Entertainment)",
            });
          }

          if (seResult.isUnpriced) {
            complianceReason = "OTHER package (mixes > 2:30) requires a manual price quote before completion.";

            enginePricing = {
              ...seResult,
              customerFacingPrice: null,
              payrollBasePrice: null,
              preDiscountCustomerFacingPrice: null,
              preDiscountPayrollBasePrice: null,
              discountAmount: 0,
              packageName: seResult.matchedEntry?.package || pkgName,
              timeLengthOfMix: "",
            };

            baseCust = null;
            basePay = null;
          } else {
            const preDiscountCust = seResult.customerFacingPrice ?? 0;
            const preDiscountPay = seResult.payrollBasePrice ?? 0;

            let discountAmount = 0;
            if (matchedDiscountCode && matchedDiscountCode.discountType && typeof matchedDiscountCode.discountValue === "number" && matchedDiscountCode.discountValue > 0) {
              if (matchedDiscountCode.discountType === "fixed") {
                discountAmount = Math.min(preDiscountPay, Math.max(0, matchedDiscountCode.discountValue));
              } else if (matchedDiscountCode.discountType === "percentage") {
                const pct = Math.max(0, Math.min(100, matchedDiscountCode.discountValue));
                discountAmount = Math.min(preDiscountPay, Math.round(preDiscountPay * (pct / 100)));
              }
            }

            enginePricing = {
              ...seResult,
              customerFacingPrice: Math.max(0, preDiscountCust - discountAmount),
              payrollBasePrice: Math.max(0, preDiscountPay - discountAmount),
              preDiscountCustomerFacingPrice: preDiscountCust,
              preDiscountPayrollBasePrice: preDiscountPay,
              discountAmount,
              discountType: matchedDiscountCode?.discountType,
              discountValue: matchedDiscountCode?.discountValue,
              packageName: seResult.matchedEntry?.package || pkgName,
              timeLengthOfMix: "",
            };

            complianceReason = "Unknown / No Affiliate Field Required on Sports Entertainment customer form.";

            baseCust = seResult.matchedEntry?.customer ?? currentRec.price;
            basePay = seResult.matchedEntry?.compliant ?? currentRec.price;
          }

        } else if (meta.formType === "school-anthem") {
          canonicalSubtypeId = "school-anthem";
          const saResult = calculateSchoolAnthemOrderPricing({
            packageType: pkgName,
          });

          const preDiscountCust = saResult.customerFacingPrice;
          const preDiscountPay = saResult.payrollBasePrice;

          let discountAmount = 0;
          if (matchedDiscountCode && matchedDiscountCode.discountType && typeof matchedDiscountCode.discountValue === "number" && matchedDiscountCode.discountValue > 0) {
            if (matchedDiscountCode.discountType === "fixed") {
              discountAmount = Math.min(preDiscountPay, Math.max(0, matchedDiscountCode.discountValue));
            } else if (matchedDiscountCode.discountType === "percentage") {
              const pct = Math.max(0, Math.min(100, matchedDiscountCode.discountValue));
              discountAmount = Math.min(preDiscountPay, Math.round(preDiscountPay * (pct / 100)));
            }
          }

          enginePricing = {
            ...saResult,
            customerFacingPrice: Math.max(0, preDiscountCust - discountAmount),
            payrollBasePrice: Math.max(0, preDiscountPay - discountAmount),
            preDiscountCustomerFacingPrice: preDiscountCust,
            preDiscountPayrollBasePrice: preDiscountPay,
            discountAmount,
            discountType: matchedDiscountCode?.discountType,
            discountValue: matchedDiscountCode?.discountValue,
            packageName: saResult.matchedEntry?.package || pkgName,
            timeLengthOfMix: "",
          };

          complianceReason = "Flat $1,250 rate card unconditionally; no compliance adjustment required.";
          baseCust = 1250;
          basePay = 1250;

        } else {
          // Cheer fallback
          canonicalSubtypeId = cheerSubtype;
          enginePricing = calculateCheerOrderPricing({
            cheerFormSubtype: cheerSubtype,
            packageType: pkgName,
            timeLengthOfMix: mixLen,
            musicAffiliate: affiliate,
            hasRallyMix: currentRec.hasRallyMix,
            hasExtend8ctAddon: currentRec.hasExtend8ctAddon,
            hasProcessing8ctSheetsAddon: currentRec.hasProcessing8ctSheetsAddon,
            couponCode: activeCoupon,
            discountCodeObj: matchedDiscountCode,
          });

          if (cheerSubtype === "youth-rec-cheer") {
            complianceReason = "Youth Rec Cheer does not require music affiliate compliance; compliant rate card applies.";
          } else if (enginePricing.complianceStatus === "compliant") {
            complianceReason = `Music affiliate '${affiliate || "Approved Affiliate"}' is on the compliant affiliate list.`;
          } else if (enginePricing.complianceStatus === "non-compliant") {
            complianceReason = `Music affiliate '${affiliate || "Unapproved"}' is not on the compliant list; non-compliant rate card applies.`;
          } else {
            complianceReason = "No music affiliate specified on order.";
          }

          if (
            (cheerSubtype === "school-cheer-viroc-yes" || cheerSubtype === "school-cheer-viroc-no") &&
            currentRec.hasRallyMix
          ) {
            addons.push({
              addon_id: "rally_mix",
              label: "Rally Mix Add-On",
              customer_amount: 350,
              payroll_amount: 350,
              quantity: 1,
              note: "Fixed fee add-on (School Cheer)",
            });
          }

          if (cheerSubtype === "youth-rec-cheer") {
            if (currentRec.hasExtend8ctAddon) {
              addons.push({
                addon_id: "extend_8ct",
                label: "Extend 2 8cs Phrase / Raps",
                customer_amount: 25,
                payroll_amount: 25,
                quantity: 1,
                note: "Megan-controlled add-on (Youth Rec)",
              });
            }
            if (currentRec.hasProcessing8ctSheetsAddon) {
              addons.push({
                addon_id: "process_8ct",
                label: "Processing 8cs Sheets",
                customer_amount: 50,
                payroll_amount: 50,
                quantity: 1,
                note: "Megan-controlled add-on (Youth Rec)",
              });
            }
          }

          baseCust = enginePricing.matchedEntry?.customer ?? currentRec.price;
          basePay = enginePricing.matchedEntry
            ? (enginePricing.complianceStatus === "non-compliant" ? enginePricing.matchedEntry.nonCompliant : enginePricing.matchedEntry.compliant)
            : currentRec.price;
        }

        setCalculatedEnginePricing(enginePricing);

        const isUnpricedSE = meta.formType === "sports-entertainment" && enginePricing.isUnpriced;

        const calculatedBreakdown: PricingBreakdown = {
          form_type: order?.formType || meta.formType || "school-all-star-cheer",
          canonical_subtype_id: canonicalSubtypeId,
          package_id: enginePricing.matchedEntry
            ? (meta.formType === "school-all-star-dance" || meta.formType === "marching-band" || meta.formType === "sports-entertainment" || meta.formType === "school-anthem"
                ? enginePricing.matchedEntry.package
                : `${enginePricing.matchedEntry.tier}-${enginePricing.matchedEntry.limit}`)
            : "pkg-local",
          package_name: enginePricing.matchedEntry
            ? (meta.formType === "school-all-star-dance" || meta.formType === "marching-band" || meta.formType === "sports-entertainment" || meta.formType === "school-anthem"
                ? enginePricing.matchedEntry.package
                : `${enginePricing.matchedEntry.tier} ${enginePricing.matchedEntry.limit}`)
            : currentRec.package,
          pricing_rule_id: null,
          compliance_status: enginePricing.complianceStatus === "non-compliant"
            ? "non-compliant"
            : enginePricing.complianceStatus === "unknown-no-affiliate-field"
            ? ("needs_manual_review" as any)
            : "compliant",
          compliance_reason: complianceReason,
          canonical_affiliate: affiliate || null,
          base_customer_price: baseCust,
          base_payroll_price: basePay,
          addons,
          system_calculated_customer_price: isUnpricedSE
            ? null
            : (enginePricing.customerFacingPrice > 0 ? enginePricing.customerFacingPrice : currentRec.price),
          payroll_base_price: isUnpricedSE
            ? null
            : (enginePricing.payrollBasePrice > 0 ? enginePricing.payrollBasePrice : currentRec.price),
          needs_manual_pricing: isUnpricedSE,
          needs_manual_review: isUnpricedSE,
          summary_line: `Category: ${meta.formType} | Subtype: ${canonicalSubtypeId} | Package: ${enginePricing.packageName} | Customer: $${enginePricing.customerFacingPrice ?? 'TBD'} | Payroll Base: $${enginePricing.payrollBasePrice ?? 'TBD'}`,
          coupon_code: activeCoupon,
          coupon_evaluation: couponEval,
        };

        setBreakdown(calculatedBreakdown);

        let initialCustStr = "";
        let initialPayStr = "";

        if (isUnpricedSE) {
          if (order?.finalCustomerPrice && order.finalCustomerPrice > 0) {
            initialCustStr = String(order.finalCustomerPrice);
          } else if (currentRec.price && currentRec.price > 0) {
            initialCustStr = String(currentRec.price);
          } else {
            initialCustStr = "";
          }
          initialPayStr = initialCustStr;
        } else {
          const custVal = order?.finalCustomerPrice ?? (enginePricing.customerFacingPrice > 0 ? enginePricing.customerFacingPrice : currentRec.price);
          const payVal = enginePricing.payrollBasePrice > 0 ? enginePricing.payrollBasePrice : currentRec.price;
          initialCustStr = String(custVal);
          initialPayStr = String(payVal);
        }

        setFinalCustomerPriceInput(initialCustStr);
        setFinalPayrollPriceInput(initialPayStr);
      } catch (err) {
        console.warn("Failed to calculate pricing breakdown. Falling back to local record price.", err);
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
        setFinalPayrollPriceInput(String(record.price || sysPrice));
      } finally {
        setLoading(false);
      }
    }

    loadBreakdown();
  }, [open, record, linkedOrder, allOrders, discountCodes, modalCouponCode]);

  // Parsed numerical price
  const finalCustomerPriceNum = parseFloat(finalCustomerPriceInput) || 0;
  const systemPriceNum = breakdown?.system_calculated_customer_price ?? record?.price ?? 0;
  const isCustomerPriceOverridden =
    breakdown?.system_calculated_customer_price !== null &&
    Math.abs(finalCustomerPriceNum - systemPriceNum) > 0.001;

  const finalPayrollPriceNum = parseFloat(finalPayrollPriceInput) || breakdown?.payroll_base_price || 0;
  const sysPayrollPrice = calculatedEnginePricing?.payrollBasePrice ?? breakdown?.payroll_base_price ?? record?.price ?? 0;
  const isPayrollPriceOverridden =
    breakdown !== null &&
    Math.abs(finalPayrollPriceNum - sysPayrollPrice) > 0.001;

  const effectiveBreakdown = useMemo(() => {
    if (!breakdown) return null;
    return {
      ...breakdown,
      payroll_base_price: finalPayrollPriceNum,
    };
  }, [breakdown, finalPayrollPriceNum]);

  // Client-side real-time payroll calculation for Step 2
  const activeRateNum = customRateInput !== ""
    ? parseFloat(customRateInput) / 100
    : selectedCaseyRate;

  const activeManualPayoutNum = manualPayoutInput !== "" ? parseFloat(manualPayoutInput) : null;

  const clientPayroll = computeClientPayroll(
    assignedProducerObj,
    finalCustomerPriceNum,
    effectiveBreakdown,
    activeRateNum,
    activeManualPayoutNum,
    breakdown?.canonical_subtype_id
  );

  const isRateOverridden = customRateInput !== "" || (selectedCaseyRate !== null && assignedProducerObj?.initials !== "CM");

  if (!mounted || !open || !record) return null;

  // Step 1 confirm handler
  const handleProceedToPayroll = async () => {
    if (breakdown?.needs_manual_pricing || calculatedEnginePricing?.isUnpriced) {
      if (!finalCustomerPriceInput || finalCustomerPriceNum <= 0) {
        setError("This Sports Entertainment order (OTHER package) requires a manual price quote before it can be completed. Please enter a valid price quote greater than $0.");
        return;
      }
    }

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
              {/* OTHER TBD Warning Banner */}
              {calculatedEnginePricing?.isUnpriced && (
                <div className="flex items-start gap-2.5 rounded-xl border border-brand-warning/40 bg-brand-warning/10 p-3.5 text-[12.5px] text-brand-ink">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-brand-warning mt-0.5" />
                  <div>
                    <p className="font-bold text-brand-warning text-[13px]">Manual Price Quote Required</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-brand-ink-secondary">
                      This Sports Entertainment order uses the <strong>OTHER (mixes longer than 2:30)</strong> package and cannot be priced automatically. Please enter the agreed price quote below before completing the order.
                    </p>
                  </div>
                </div>
              )}

              {/* Form Subtype & Package Header */}
              <div className="rounded-xl border border-brand-line/70 bg-brand-bg/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
                      Form Subtype & Package
                    </p>
                    <p className="mt-1 text-[14px] font-bold text-brand-ink">
                      {getFullClassificationLabel(
                        breakdown?.form_type,
                        breakdown?.canonical_subtype_id,
                        breakdown?.package_name || record.package
                      )}
                    </p>
                  </div>
                  <span className="rounded-lg bg-brand-signature/10 px-2.5 py-1 text-[12px] font-bold text-brand-signature ring-1 ring-inset ring-brand-signature/20">
                    {breakdown?.package_name || record.package}
                  </span>
                </div>
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
                        : breakdown?.compliance_reason?.includes("Unknown")
                        ? "UNKNOWN (NO AFFILIATE FIELD)"
                        : "NEEDS MANUAL REVIEW"}
                    </span>
                  </div>

                  <span className="text-[11px] font-medium text-brand-ink-secondary">
                    {breakdown?.canonical_affiliate
                      ? `Affiliate: ${breakdown.canonical_affiliate}`
                      : "No Affiliate Field Required"}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-brand-ink-secondary">
                  {breakdown?.compliance_reason || "Verified against pricing rules & compliant affiliates map."}
                </p>
              </div>

              {/* Itemized Line-Items Pricing Breakdown */}
              <div className="rounded-xl border border-brand-line/70 bg-brand-elevated overflow-hidden">
                <div className="bg-brand-bg/60 px-4 py-2.5 border-b border-brand-line/60 flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
                    Itemized Pricing Breakdown
                  </span>
                  <span className="text-[11.5px] text-brand-ink-tertiary">
                    Amount
                  </span>
                </div>

                <div className="divide-y divide-brand-line/40 px-4 text-[12.5px]">
                  {/* Customer Facing Price */}
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-brand-ink">
                          Customer Price
                        </span>
                        {isCustomerPriceOverridden && (
                          <span className="inline-flex items-center gap-1 rounded bg-brand-orange/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-orange ring-1 ring-inset ring-brand-orange/25">
                            <Edit3 className="h-2.5 w-2.5" /> edited
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-brand-ink-tertiary">
                        {calculatedEnginePricing?.isUnpriced
                          ? "OTHER package (mixes > 2:30) — Manual quote required"
                          : "Exact customer-facing package price stored/displayed in MTD"}
                      </p>
                    </div>
                    <div className="relative w-[130px]">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-brand-ink text-[14px]">
                        $
                      </span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="Enter quote"
                        value={finalCustomerPriceInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFinalCustomerPriceInput(val);
                          const num = parseFloat(val) || 0;
                          setBreakdown((prev) => (prev ? { ...prev, system_calculated_customer_price: num } : null));
                          if (calculatedEnginePricing?.isUnpriced && (!finalPayrollPriceInput || finalPayrollPriceInput === "0")) {
                            setFinalPayrollPriceInput(val);
                          }
                        }}
                        className={clsx(
                          "w-full rounded-lg border py-1.5 pl-7 pr-2.5 text-right font-bold text-[14px] tabular-nums outline-none focus:ring-2",
                          calculatedEnginePricing?.isUnpriced && (!finalCustomerPriceInput || finalCustomerPriceNum <= 0)
                            ? "border-brand-warning bg-brand-warning/10 text-brand-warning ring-2 ring-brand-warning/30"
                            : "border-brand-line/80 bg-brand-elevated text-brand-ink focus:border-brand-signature focus:ring-brand-signature/20"
                        )}
                      />
                    </div>
                  </div>

                  {/* Music Compliance Adjustment */}
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="font-medium text-brand-ink">
                        Music Compliance Adjustment
                      </span>
                      <p className="text-[11px] text-brand-ink-tertiary">
                        {breakdown?.package_name?.toUpperCase().includes("TITANIUM")
                          ? "Titanium (Fully Licensed) — No adjustment"
                          : breakdown?.compliance_status === "compliant"
                          ? "Compliant Music Affiliate — Licensing fee removed"
                          : breakdown?.compliance_reason?.includes("Unknown")
                          ? "No affiliate required for this category"
                          : "Non-Compliant Music Affiliate — No adjustment"}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        "font-semibold tabular-nums",
                        breakdown?.compliance_status === "compliant" &&
                          !breakdown?.package_name?.toUpperCase().includes("TITANIUM")
                          ? "text-brand-success"
                          : "text-brand-ink-secondary"
                      )}
                    >
                      {breakdown?.package_name?.toUpperCase().includes("TITANIUM") || breakdown?.compliance_reason?.includes("Unknown")
                        ? "$0"
                        : breakdown?.compliance_status === "compliant"
                        ? `-${formatPrice(
                            Math.abs(
                              (breakdown?.base_customer_price ?? record.price) -
                                (breakdown?.base_payroll_price ?? record.price)
                            )
                          )}`
                        : "$0"}
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
                      <span className="font-semibold tabular-nums text-brand-success">
                        +{formatPrice(addon.customer_amount)}
                      </span>
                    </div>
                  ))}

                  {/* Coupon Code Line Item */}
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-brand-signature" />
                        <span className="font-medium text-brand-ink">
                          Coupon Code
                        </span>
                      </div>
                      <p className="text-[11px] text-brand-ink-tertiary mt-0.5">
                        {breakdown?.coupon_evaluation?.status === "valid" && breakdown.coupon_evaluation.match?.description
                          ? breakdown.coupon_evaluation.match.description
                          : breakdown?.coupon_evaluation?.status === "valid"
                          ? "Valid coupon code applied to order"
                          : breakdown?.coupon_evaluation?.status === "potential"
                          ? "Possible match to saved coupon"
                          : modalCouponCode
                          ? "Coupon code unrecognized"
                          : "Apply or edit promo code for this order"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="PROMO CODE"
                        value={modalCouponCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setModalCouponCode(val);
                        }}
                        className="w-[110px] rounded border border-brand-line bg-brand-elevated px-2 py-1 text-right text-[11px] font-bold uppercase tracking-wider text-brand-ink outline-none focus:border-brand-signature focus:ring-1 focus:ring-brand-signature/30"
                      />
                      {breakdown?.coupon_evaluation?.status === "valid" && breakdown.coupon_evaluation.match ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="rounded bg-brand-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-success ring-1 ring-inset ring-brand-success/25">
                            {breakdown.coupon_evaluation.match.discountType === "percentage"
                              ? `${breakdown.coupon_evaluation.match.discountValue}% OFF`
                              : `-$${breakdown.coupon_evaluation.match.discountValue}`}
                          </span>
                          {(calculatedEnginePricing?.discountAmount ?? 0) > 0 && (
                            <span className="font-semibold tabular-nums text-brand-success text-[12.5px]">
                              -{formatPrice(calculatedEnginePricing.discountAmount)}
                            </span>
                          )}
                        </div>
                      ) : breakdown?.coupon_evaluation?.status === "potential" ? (
                        <span className="rounded bg-brand-info/15 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-signature ring-1 ring-inset ring-brand-info/25">
                          Suggested
                        </span>
                      ) : modalCouponCode ? (
                        <span className="rounded bg-brand-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-warning ring-1 ring-inset ring-brand-warning/25">
                          Unrecognized
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Final Payroll Price (Editable Input) */}
                  <div className="flex items-center justify-between py-3 bg-brand-signature/10 -mx-4 px-4 border-t border-brand-signature/20">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-brand-signature text-[14px]">
                          Payroll Price
                        </span>
                        {isPayrollPriceOverridden && (
                          <span className="inline-flex items-center gap-1 rounded bg-brand-orange/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-orange ring-1 ring-inset ring-brand-orange/25">
                            <Edit3 className="h-2.5 w-2.5" /> edited
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-brand-ink-secondary">
                        Amount passed to payroll engine to calculate producer payout
                      </p>
                    </div>

                    <div className="relative w-[130px]">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-brand-signature text-[14px]">
                        $
                      </span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={finalPayrollPriceInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFinalPayrollPriceInput(val);
                          const num = parseFloat(val) || 0;
                          setBreakdown((prev) => (prev ? { ...prev, payroll_base_price: num } : null));
                        }}
                        className="w-full rounded-lg border border-brand-signature/40 bg-brand-elevated py-1.5 pl-7 pr-2.5 text-right font-bold text-[15px] tabular-nums text-brand-signature outline-none focus:border-brand-signature focus:ring-2 focus:ring-brand-signature/20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PAYROLL TRANSITION */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Producer Info & Customer Price Summary */}
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
                      Customer Price
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
