"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompleteToPayrollModal = CompleteToPayrollModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const lucide_react_1 = require("lucide-react");
const data_1 = require("@/lib/data");
const editor_assignment_1 = require("@/lib/editor-assignment");
const pricing_display_1 = require("@/lib/pricing-display");
const AppStateContext_1 = require("@/context/AppStateContext");
const mtd_filters_1 = require("@/lib/mtd-filters");
const pricing_engine_1 = require("@/lib/pricing-engine");
const package_1 = require("@/lib/package");
const discount_codes_1 = require("@/lib/discount-codes");
const pricing_1 = require("@/lib/api/pricing");
const SetPricingModal_1 = require("@/components/mtd/SetPricingModal");
const clsx_1 = __importDefault(require("clsx"));
function couponSuggestionHint(suggestion) {
    if (suggestion.reason === "spacing") {
        return "Same code with different spacing.";
    }
    if (suggestion.reason === "capitalization") {
        return "Same code with different capitalization.";
    }
    return "Very close spelling.";
}
function resolvePayrollCoupon(customerCode, resolvedCode, discountCodes) {
    const customerEval = (0, discount_codes_1.evaluateCouponCode)(customerCode, discountCodes);
    if (customerEval.status === "valid") {
        return {
            customerEval,
            appliedCode: customerCode.trim(),
            appliedEval: customerEval,
            matchedDiscountCode: customerEval.match ?? null,
        };
    }
    const trimmedResolved = resolvedCode?.trim() ?? "";
    if (trimmedResolved) {
        const resolvedEval = (0, discount_codes_1.evaluateCouponCode)(trimmedResolved, discountCodes);
        if (resolvedEval.status === "valid") {
            return {
                customerEval,
                appliedCode: trimmedResolved,
                appliedEval: resolvedEval,
                matchedDiscountCode: resolvedEval.match ?? null,
            };
        }
    }
    return {
        customerEval,
        appliedCode: null,
        appliedEval: null,
        matchedDiscountCode: null,
    };
}
function CompleteToPayrollModal({ open, record, allOrders, producers, onClose, onConfirm, }) {
    const [mounted, setMounted] = (0, react_1.useState)(false);
    const [step, setStep] = (0, react_1.useState)(1);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    // Pricing Breakdown from backend calculation
    const [breakdown, setBreakdown] = (0, react_1.useState)(null);
    const [finalCustomerPriceInput, setFinalCustomerPriceInput] = (0, react_1.useState)("");
    const [finalPayrollPriceInput, setFinalPayrollPriceInput] = (0, react_1.useState)("");
    const [calculatedEnginePricing, setCalculatedEnginePricing] = (0, react_1.useState)(null);
    const [customerCouponCode, setCustomerCouponCode] = (0, react_1.useState)("");
    const [resolvedCouponCode, setResolvedCouponCode] = (0, react_1.useState)(null);
    const [pricingRefOpen, setPricingRefOpen] = (0, react_1.useState)(false);
    // Step 2 Payroll state
    const [selectedCaseyRate, setSelectedCaseyRate] = (0, react_1.useState)(null); // 0.72 or 0.70
    const [customRateInput, setCustomRateInput] = (0, react_1.useState)(""); // e.g. "72"
    const [manualPayoutInput, setManualPayoutInput] = (0, react_1.useState)(""); // for Riley / hourly
    (0, react_1.useEffect)(() => {
        setMounted(true);
    }, []);
    // Lock body scroll when modal open
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);
    const { discountCodes } = (0, AppStateContext_1.useAppState)();
    // Find linked order and assigned producer
    const linkedOrder = (0, react_1.useMemo)(() => {
        if (!record)
            return undefined;
        return (0, editor_assignment_1.findLinkedOrder)(record, allOrders);
    }, [record, allOrders]);
    const assignedProducerObj = (0, react_1.useMemo)(() => {
        if (!record?.assignedProducer)
            return undefined;
        return (0, editor_assignment_1.findProducerByAssignmentKey)(record.assignedProducer, producers);
    }, [record, producers]);
    // Reset modal state on open
    (0, react_1.useEffect)(() => {
        if (!open || !record)
            return;
        setStep(1);
        setError(null);
        setSelectedCaseyRate(null);
        setCustomRateInput("");
        setManualPayoutInput("");
        const order = linkedOrder;
        const initialCoupon = order?.couponCode || order?.formData?.couponCode || record?.couponCode || "";
        setCustomerCouponCode(initialCoupon);
        setResolvedCouponCode(null);
    }, [open, record, linkedOrder]);
    // Reset & load pricing breakdown when modal opens or coupon code changes
    (0, react_1.useEffect)(() => {
        if (!open || !record)
            return;
        async function loadBreakdown() {
            if (!record)
                return;
            const currentRec = record;
            setLoading(true);
            try {
                const order = linkedOrder;
                const orderById = new Map();
                for (const o of allOrders) {
                    if (o.id)
                        orderById.set(o.id, o);
                    if (o.legacyId)
                        orderById.set(o.legacyId, o);
                    if (o.uuid)
                        orderById.set(o.uuid, o);
                }
                const meta = (0, mtd_filters_1.resolveMTDFormMeta)(currentRec, orderById);
                const cheerSubtype = meta.cheerFormSubtype;
                const danceSubtype = meta.danceFormSubtype;
                const pkgName = order?.packageType || currentRec.package;
                const mixLen = order?.timeLengthOfMix || (0, package_1.parsePackage)(currentRec.package).limit;
                const affiliate = order?.musicAffiliate || currentRec.musicTheme || currentRec.musicAffiliate;
                const activeCoupon = customerCouponCode ||
                    order?.couponCode ||
                    order?.formData?.couponCode ||
                    currentRec?.couponCode ||
                    "";
                const { customerEval: couponEval, appliedCode, appliedEval, matchedDiscountCode, } = resolvePayrollCoupon(activeCoupon, resolvedCouponCode, discountCodes);
                let enginePricing;
                let canonicalSubtypeId = "";
                let complianceReason = "";
                const addons = [];
                let baseCust = 0;
                let basePay = 0;
                if (meta.formType === "school-all-star-dance") {
                    canonicalSubtypeId = danceSubtype;
                    const danceResult = (0, pricing_engine_1.calculateDanceOrderPricing)({
                        danceFormSubtype: danceSubtype,
                        packageType: pkgName,
                        musicAffiliate: affiliate,
                        ...currentRec,
                    });
                    let discountAmount = 0;
                    if (matchedDiscountCode && matchedDiscountCode.discountType && typeof matchedDiscountCode.discountValue === "number" && matchedDiscountCode.discountValue > 0) {
                        const preDiscountBase = danceResult.payrollBasePrice;
                        if (matchedDiscountCode.discountType === "fixed") {
                            discountAmount = Math.min(preDiscountBase, Math.max(0, matchedDiscountCode.discountValue));
                        }
                        else if (matchedDiscountCode.discountType === "percentage") {
                            const pct = Math.max(0, Math.min(100, matchedDiscountCode.discountValue));
                            discountAmount = Math.min(preDiscountBase, Math.round(preDiscountBase * (pct / 100)));
                        }
                    }
                    const preDiscountCust = danceResult.customerFacingPrice;
                    const preDiscountPay = danceResult.payrollBasePrice;
                    enginePricing = {
                        ...danceResult,
                        customerFacingPrice: preDiscountCust,
                        payrollBasePrice: preDiscountPay,
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
                    }
                    else if (enginePricing.complianceStatus === "compliant") {
                        complianceReason = `Music affiliate '${affiliate || "Approved Affiliate"}' is on the compliant affiliate list.`;
                    }
                    else if (enginePricing.complianceStatus === "non-compliant") {
                        complianceReason = `Music affiliate '${affiliate || "Unapproved"}' is not on the compliant list; non-compliant rate card applies.`;
                    }
                    else {
                        complianceReason = "No music affiliate specified on order.";
                    }
                    baseCust = danceResult.matchedEntry?.customer ?? currentRec.price;
                    basePay = danceResult.matchedEntry
                        ? (danceResult.alwaysFixedPayroll
                            ? danceResult.matchedEntry.compliant
                            : danceResult.complianceStatus === "non-compliant"
                                ? danceResult.matchedEntry.nonCompliant
                                : danceResult.matchedEntry.compliant)
                        : currentRec.price;
                }
                else if (meta.formType === "marching-band") {
                    canonicalSubtypeId = "marching-band";
                    const sheetMusic = Boolean(currentRec.hasSheetMusicAdd ?? order?.hasSheetMusicAdd);
                    const addVocals = Boolean(currentRec.hasAddVocals ?? order?.hasAddVocals);
                    const mbResult = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
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
                        }
                        else if (matchedDiscountCode.discountType === "percentage") {
                            const pct = Math.max(0, Math.min(100, matchedDiscountCode.discountValue));
                            discountAmount = Math.min(preDiscountPay, Math.round(preDiscountPay * (pct / 100)));
                        }
                    }
                    enginePricing = {
                        ...mbResult,
                        customerFacingPrice: preDiscountCust,
                        payrollBasePrice: preDiscountPay,
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
                    }
                    else if (mbResult.complianceStatus === "unknown-no-affiliate-field") {
                        complianceReason = "Unknown / No Affiliate Field Required on Marching Band customer form.";
                    }
                    else if (mbResult.complianceStatus === "compliant") {
                        complianceReason = `Music affiliate '${affiliate || "Approved Affiliate"}' is on the compliant affiliate list.`;
                    }
                    else {
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
                }
                else if (meta.formType === "sports-entertainment") {
                    canonicalSubtypeId = "sports-entertainment";
                    const isRush = currentRec.isRushOrder ?? order?.isRushOrder;
                    const seResult = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
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
                    }
                    else {
                        const preDiscountCust = seResult.customerFacingPrice ?? 0;
                        const preDiscountPay = seResult.payrollBasePrice ?? 0;
                        let discountAmount = 0;
                        if (matchedDiscountCode && matchedDiscountCode.discountType && typeof matchedDiscountCode.discountValue === "number" && matchedDiscountCode.discountValue > 0) {
                            if (matchedDiscountCode.discountType === "fixed") {
                                discountAmount = Math.min(preDiscountPay, Math.max(0, matchedDiscountCode.discountValue));
                            }
                            else if (matchedDiscountCode.discountType === "percentage") {
                                const pct = Math.max(0, Math.min(100, matchedDiscountCode.discountValue));
                                discountAmount = Math.min(preDiscountPay, Math.round(preDiscountPay * (pct / 100)));
                            }
                        }
                        enginePricing = {
                            ...seResult,
                            customerFacingPrice: preDiscountCust,
                            payrollBasePrice: preDiscountPay,
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
                }
                else if (meta.formType === "school-anthem") {
                    canonicalSubtypeId = "school-anthem";
                    const saResult = (0, pricing_engine_1.calculateSchoolAnthemOrderPricing)({
                        packageType: pkgName,
                    });
                    const preDiscountCust = saResult.customerFacingPrice;
                    const preDiscountPay = saResult.payrollBasePrice;
                    let discountAmount = 0;
                    if (matchedDiscountCode && matchedDiscountCode.discountType && typeof matchedDiscountCode.discountValue === "number" && matchedDiscountCode.discountValue > 0) {
                        if (matchedDiscountCode.discountType === "fixed") {
                            discountAmount = Math.min(preDiscountPay, Math.max(0, matchedDiscountCode.discountValue));
                        }
                        else if (matchedDiscountCode.discountType === "percentage") {
                            const pct = Math.max(0, Math.min(100, matchedDiscountCode.discountValue));
                            discountAmount = Math.min(preDiscountPay, Math.round(preDiscountPay * (pct / 100)));
                        }
                    }
                    enginePricing = {
                        ...saResult,
                        customerFacingPrice: preDiscountCust,
                        payrollBasePrice: preDiscountPay,
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
                }
                else {
                    // Cheer fallback
                    canonicalSubtypeId = cheerSubtype;
                    enginePricing = (0, pricing_engine_1.calculateCheerOrderPricing)({
                        cheerFormSubtype: cheerSubtype,
                        packageType: pkgName,
                        timeLengthOfMix: mixLen,
                        musicAffiliate: affiliate,
                        ...currentRec,
                        couponCode: activeCoupon,
                        discountCodeObj: matchedDiscountCode,
                    });
                    if (cheerSubtype === "youth-rec-cheer") {
                        complianceReason = "Youth Rec Cheer does not require music affiliate compliance; compliant rate card applies.";
                    }
                    else if (enginePricing.complianceStatus === "compliant") {
                        complianceReason = `Music affiliate '${affiliate || "Approved Affiliate"}' is on the compliant affiliate list.`;
                    }
                    else if (enginePricing.complianceStatus === "non-compliant") {
                        complianceReason = `Music affiliate '${affiliate || "Unapproved"}' is not on the compliant list; non-compliant rate card applies.`;
                    }
                    else {
                        complianceReason = "No music affiliate specified on order.";
                    }
                    baseCust = enginePricing.matchedEntry?.customer ?? currentRec.price;
                    basePay = enginePricing.matchedEntry
                        ? (enginePricing.complianceStatus === "non-compliant" ? enginePricing.matchedEntry.nonCompliant : enginePricing.matchedEntry.compliant)
                        : currentRec.price;
                }
                const miscAddonResult = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(currentRec);
                for (const addOn of miscAddonResult.items) {
                    if (!addons.some((a) => a.addon_id === addOn.id)) {
                        addons.push({
                            addon_id: addOn.id,
                            label: addOn.label,
                            customer_amount: 0,
                            payroll_amount: addOn.payrollAmount,
                            quantity: addOn.quantity ?? 1,
                            note: addOn.note ?? "Miscellaneous Payroll Add-On",
                        });
                    }
                }
                setCalculatedEnginePricing(enginePricing);
                const isUnpricedSE = meta.formType === "sports-entertainment" && enginePricing.isUnpriced;
                const calculatedBreakdown = {
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
                            ? "needs_manual_review"
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
                    applied_coupon_code: appliedCode ?? undefined,
                    applied_coupon_evaluation: appliedEval ?? undefined,
                };
                setBreakdown(calculatedBreakdown);
                let initialCustStr = "";
                let initialPayStr = "";
                if (isUnpricedSE) {
                    if (order?.finalCustomerPrice && order.finalCustomerPrice > 0) {
                        initialCustStr = String(order.finalCustomerPrice);
                    }
                    else if (currentRec.price && currentRec.price > 0) {
                        initialCustStr = String(currentRec.price);
                    }
                    else {
                        initialCustStr = "";
                    }
                    initialPayStr = initialCustStr;
                }
                else {
                    const custVal = order?.finalCustomerPrice ?? (enginePricing.customerFacingPrice > 0 ? enginePricing.customerFacingPrice : currentRec.price);
                    const payVal = enginePricing.payrollBasePrice > 0 ? enginePricing.payrollBasePrice : currentRec.price;
                    initialCustStr = String(custVal);
                    initialPayStr = String(payVal);
                }
                setFinalCustomerPriceInput(initialCustStr);
                setFinalPayrollPriceInput(initialPayStr);
            }
            catch (err) {
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
            }
            finally {
                setLoading(false);
            }
        }
        loadBreakdown();
    }, [open, record, linkedOrder, allOrders, discountCodes, customerCouponCode, resolvedCouponCode]);
    // Parsed numerical price
    const finalCustomerPriceNum = parseFloat(finalCustomerPriceInput) || 0;
    const systemPriceNum = breakdown?.system_calculated_customer_price ?? record?.price ?? 0;
    const isCustomerPriceOverridden = breakdown?.system_calculated_customer_price !== null &&
        Math.abs(finalCustomerPriceNum - systemPriceNum) > 0.001;
    const finalPayrollPriceNum = parseFloat(finalPayrollPriceInput) || breakdown?.payroll_base_price || 0;
    const sysPayrollPrice = calculatedEnginePricing?.payrollBasePrice ?? breakdown?.payroll_base_price ?? record?.price ?? 0;
    const isPayrollPriceOverridden = breakdown !== null &&
        Math.abs(finalPayrollPriceNum - sysPayrollPrice) > 0.001;
    const effectiveBreakdown = (0, react_1.useMemo)(() => {
        if (!breakdown)
            return null;
        return {
            ...breakdown,
            payroll_base_price: finalPayrollPriceNum,
        };
    }, [breakdown, finalPayrollPriceNum]);
    if (!mounted || !open || !record)
        return null;
    // Client-side real-time payroll calculation for Step 2
    const activeRateNum = customRateInput !== ""
        ? parseFloat(customRateInput) / 100
        : selectedCaseyRate;
    const activeManualPayoutNum = manualPayoutInput !== "" ? parseFloat(manualPayoutInput) : null;
    const rushQty = typeof record.rushFeeQuantity === "number"
        ? record.rushFeeQuantity
        : record.rushFeeOption === "double"
            ? 2
            : record.rushFeeOption === "single" || record.isRushOrder === "yes" || record.isRushOrder === true
                ? 1
                : 0;
    const clientPayroll = (0, pricing_display_1.computeClientPayroll)(assignedProducerObj, finalCustomerPriceNum, effectiveBreakdown, activeRateNum, activeManualPayoutNum, breakdown?.canonical_subtype_id, finalPayrollPriceNum, {
        rushFeeQuantity: rushQty,
        rushFeeCompensationRate: record.rushFeeCompensationRate ?? assignedProducerObj?.rushFeeRate ?? 1.0,
        formType: breakdown?.form_type,
    });
    const isRateOverridden = customRateInput !== "" || (selectedCaseyRate !== null && assignedProducerObj?.initials !== "CM");
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
                await (0, pricing_1.completePricingApi)(linkedOrder.id, {
                    final_customer_price_override: isCustomerPriceOverridden ? finalCustomerPriceNum : undefined,
                });
            }
            setStep(2);
        }
        catch (err) {
            console.warn("Could not save complete-pricing to backend, proceeding to step 2 locally.", err);
            setStep(2);
        }
        finally {
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
                await (0, pricing_1.finalizePayrollApi)(linkedOrder.id, {
                    producer_initials: producerInitials,
                    final_customer_price: finalCustomerPriceNum,
                    overridden_rate: finalRate ?? undefined,
                });
            }
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
            }, linkedOrder ? {
                finalCustomerPrice: finalCustomerPriceNum,
                systemCalculatedCustomerPrice: systemPriceNum,
                finalCustomerPriceOverridden: isCustomerPriceOverridden,
                producerPayout: clientPayroll.producerPayout ?? undefined,
                sltPortion: clientPayroll.sltPortion ?? undefined,
                rateUsed: finalRate ?? undefined,
                rateSource: clientPayroll.rateSource,
                payrollFinalized: true,
            } : undefined);
            onClose();
        }
        catch (err) {
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
        }
        finally {
            setLoading(false);
        }
    };
    return (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-[100] flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/50 backdrop-blur-[3px]", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "complete-payroll-title", className: "relative w-full max-w-[540px] max-h-[90vh] flex flex-col overflow-hidden rounded-[24px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.32)]", children: [(0, jsx_runtime_1.jsx)("div", { className: "shrink-0 border-b border-brand-line/60 px-6 py-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: step === 1 ? "Complete to payroll" : "Payroll setup" }), (0, jsx_runtime_1.jsx)("h2", { id: "complete-payroll-title", className: "mt-0.5 truncate text-[17px] font-semibold tracking-[-0.02em] text-brand-ink", children: (0, data_1.titleCase)(record.programName) }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 truncate text-[12px] text-brand-ink-secondary", children: step === 1
                                        ? [
                                            (0, data_1.titleCase)(record.contactName),
                                            record.invoice ? `Inv #${record.invoice}` : null,
                                        ]
                                            .filter(Boolean)
                                            .join(" · ")
                                        : `Producer: ${record.assignedProducer ? (0, data_1.titleCase)(record.assignedProducer) : "Unassigned"}` })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 space-y-4 overflow-y-auto px-6 py-5", children: [error && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2.5 rounded-xl border border-brand-warning/30 bg-brand-warning/10 p-3.5 text-[12.5px] text-brand-ink", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { className: "h-4 w-4 shrink-0 text-brand-warning mt-0.5" }), (0, jsx_runtime_1.jsx)("p", { children: error })] })), step === 1 && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [calculatedEnginePricing?.isUnpriced && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2.5 rounded-xl border border-brand-warning/40 bg-brand-warning/10 p-3.5 text-[12.5px] text-brand-ink", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { className: "h-5 w-5 shrink-0 text-brand-warning mt-0.5" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "font-bold text-brand-warning text-[13px]", children: "Manual Price Quote Required" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[12px] leading-relaxed text-brand-ink-secondary", children: ["This Sports Entertainment order uses the ", (0, jsx_runtime_1.jsx)("strong", { children: "OTHER (mixes longer than 2:30)" }), " package and cannot be priced automatically. Please enter the agreed price quote below before completing the order."] })] })] })), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-line/70 bg-brand-bg/30 px-4 py-3.5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[15px] font-bold leading-snug text-brand-ink", children: breakdown?.package_name || record.package }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[11px] font-medium text-brand-ink-tertiary", children: (() => {
                                                    const formLabel = (0, pricing_display_1.getFormTypeLabel)(breakdown?.form_type).replace(/^School \/ /, "");
                                                    const subLabel = (0, pricing_display_1.getSubtypeLabel)(breakdown?.canonical_subtype_id);
                                                    return subLabel && subLabel !== formLabel
                                                        ? `${formLabel} · ${subLabel}`
                                                        : formLabel;
                                                })() }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-3 flex min-w-0 items-center gap-2 border-t border-brand-line/50 pt-3", children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]", breakdown?.compliance_status === "compliant"
                                                            ? "bg-brand-success/20 text-emerald-800 ring-1 ring-inset ring-brand-success/35"
                                                            : breakdown?.compliance_status === "non-compliant"
                                                                ? "bg-brand-warning/15 text-amber-900 ring-1 ring-inset ring-brand-warning/30"
                                                                : "bg-brand-orange/15 text-brand-orange ring-1 ring-inset ring-brand-orange/30"), children: breakdown?.compliance_status === "compliant"
                                                            ? "Compliant"
                                                            : breakdown?.compliance_status === "non-compliant"
                                                                ? "Non-compliant"
                                                                : breakdown?.compliance_reason?.includes("Unknown")
                                                                    ? "Unknown"
                                                                    : "Review" }), breakdown?.canonical_affiliate ? ((0, jsx_runtime_1.jsx)("span", { className: "min-w-0 truncate text-[11px] text-brand-ink-secondary", children: breakdown.canonical_affiliate })) : ((0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-brand-ink-tertiary", children: "No affiliate on order" }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "overflow-hidden rounded-xl border border-brand-line/70 bg-brand-elevated", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3 border-b border-brand-line/60 bg-brand-bg/50 px-4 py-2.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "Pricing breakdown" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setPricingRefOpen(true), className: "inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-brand-orange transition hover:text-brand-orange-hover hover:underline", title: "Open reference pricing table for this order type", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { className: "h-3.5 w-3.5" }), "Pricing reference"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "divide-y divide-brand-line/40 px-4 text-[12.5px]", children: (() => {
                                                    const breakdownRowClass = "grid grid-cols-[minmax(0,1fr)_130px] items-center gap-x-4 py-2.5";
                                                    const breakdownFieldWrap = "relative w-full shrink-0";
                                                    const breakdownAmountInputClass = "w-full rounded-lg border border-brand-line/80 bg-brand-elevated py-1.5 pl-7 pr-2.5 text-right font-bold text-[14px] tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:border-brand-signature focus:ring-2 focus:ring-brand-signature/20";
                                                    const breakdownPrefixClass = "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-[14px] text-brand-ink";
                                                    const musicComplianceAmount = breakdown?.package_name?.toUpperCase().includes("TITANIUM") ||
                                                        breakdown?.compliance_reason?.includes("Unknown") ||
                                                        breakdown?.compliance_status !== "compliant"
                                                        ? 0
                                                        : -Math.abs((breakdown?.base_customer_price ?? record.price) -
                                                            (breakdown?.base_payroll_price ?? record.price));
                                                    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: breakdownRowClass, children: [(0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-ink", children: "Package price" }), isCustomerPriceOverridden && ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 rounded bg-brand-orange/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-orange ring-1 ring-inset ring-brand-orange/25", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Edit3, { className: "h-2.5 w-2.5" }), " edited"] }))] }) }), (0, jsx_runtime_1.jsxs)("div", { className: breakdownFieldWrap, children: [(0, jsx_runtime_1.jsx)("span", { className: breakdownPrefixClass, children: "$" }), (0, jsx_runtime_1.jsx)("input", { type: "number", step: "1", min: "0", placeholder: "Enter quote", value: finalCustomerPriceInput, onChange: (e) => {
                                                                                    const val = e.target.value;
                                                                                    setFinalCustomerPriceInput(val);
                                                                                    const num = parseFloat(val) || 0;
                                                                                    setBreakdown((prev) => (prev ? { ...prev, system_calculated_customer_price: num } : null));
                                                                                    if (calculatedEnginePricing?.isUnpriced && (!finalPayrollPriceInput || finalPayrollPriceInput === "0")) {
                                                                                        setFinalPayrollPriceInput(val);
                                                                                    }
                                                                                }, className: (0, clsx_1.default)(breakdownAmountInputClass, "text-brand-ink", calculatedEnginePricing?.isUnpriced && (!finalCustomerPriceInput || finalCustomerPriceNum <= 0)
                                                                                    ? "border-brand-warning bg-brand-warning/10 text-brand-warning ring-2 ring-brand-warning/30"
                                                                                    : "focus:ring-brand-signature/20") })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: breakdownRowClass, children: [(0, jsx_runtime_1.jsx)("span", { className: "font-medium text-brand-ink", children: "Music compliance" }), (0, jsx_runtime_1.jsxs)("div", { className: breakdownFieldWrap, children: [(0, jsx_runtime_1.jsx)("span", { className: breakdownPrefixClass, children: "$" }), (0, jsx_runtime_1.jsx)("input", { type: "text", readOnly: true, tabIndex: -1, value: String(musicComplianceAmount), className: (0, clsx_1.default)(breakdownAmountInputClass, "cursor-default focus:ring-0", musicComplianceAmount < 0
                                                                                    ? "text-brand-danger"
                                                                                    : "text-brand-ink-secondary") })] })] }), breakdown?.addons.map((addon) => {
                                                                const rawAmt = addon.payroll_amount !== 0 ? addon.payroll_amount : addon.customer_amount;
                                                                const isDeduction = rawAmt < 0;
                                                                const addonLabel = isDeduction
                                                                    ? `-${(0, data_1.formatPrice)(Math.abs(rawAmt))}`
                                                                    : `+${(0, data_1.formatPrice)(rawAmt)}`;
                                                                const normalizeAddonText = (value) => value
                                                                    .replace(/\s*[—–]\s*/g, " ")
                                                                    .replace(/\s+/g, " ")
                                                                    .trim()
                                                                    .toLowerCase();
                                                                const showAddonNote = addon.note &&
                                                                    normalizeAddonText(addon.note) !== normalizeAddonText(addon.label);
                                                                return ((0, jsx_runtime_1.jsxs)("div", { className: breakdownRowClass, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "font-medium text-brand-ink", children: addon.label.replace(/\s*[—–]\s*/g, " ") }), showAddonNote && addon.note ? ((0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-brand-ink-tertiary", children: addon.note.replace(/\s*[—–]\s*/g, " ") })) : null] }), (0, jsx_runtime_1.jsx)("div", { className: breakdownFieldWrap, children: (0, jsx_runtime_1.jsx)("input", { type: "text", readOnly: true, tabIndex: -1, value: addonLabel, className: (0, clsx_1.default)(breakdownAmountInputClass, "cursor-default pl-2.5 focus:ring-0", isDeduction ? "text-brand-danger" : "text-brand-success") }) })] }, addon.addon_id));
                                                            }), customerCouponCode.trim() ? ((0, jsx_runtime_1.jsx)("div", { className: "py-2.5", children: (() => {
                                                                    const customerEval = breakdown?.coupon_evaluation;
                                                                    const appliedEval = breakdown?.applied_coupon_evaluation;
                                                                    const appliedMatch = appliedEval?.status === "valid" ? appliedEval.match : null;
                                                                    const suggestions = customerEval?.status !== "valid"
                                                                        ? customerEval?.suggestions ?? []
                                                                        : [];
                                                                    const hasSuggestions = suggestions.length > 0;
                                                                    const isUnrecognized = customerEval?.status !== "valid";
                                                                    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [isUnrecognized ? ((0, jsx_runtime_1.jsx)("span", { className: "inline-flex rounded-full bg-brand-warning/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-warning ring-1 ring-inset ring-brand-warning/20", children: "Unrecognized" })) : null, (0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("grid grid-cols-[minmax(0,1fr)_130px] items-center gap-x-4", isUnrecognized && "mt-1"), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-center justify-between gap-x-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Tag, { className: "h-3.5 w-3.5 shrink-0 text-brand-signature" }), (0, jsx_runtime_1.jsx)("span", { className: "font-medium text-brand-ink", children: "Coupon" })] }), appliedMatch ? ((0, jsx_runtime_1.jsx)("span", { className: "inline-flex shrink-0 rounded-full bg-brand-danger/12 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-danger ring-1 ring-inset ring-brand-danger/20", children: appliedMatch.discountType === "percentage"
                                                                                                    ? `${appliedMatch.discountValue}% off`
                                                                                                    : `-${(0, data_1.formatPrice)(appliedMatch.discountValue)}` })) : null] }), (0, jsx_runtime_1.jsx)("div", { className: "w-full shrink-0", children: (0, jsx_runtime_1.jsx)("div", { className: "rounded-lg border border-brand-line/70 bg-brand-surface/50 px-2.5 py-1.5 text-right", children: (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-bold uppercase tracking-wider text-brand-ink", children: customerCouponCode }) }) })] }), hasSuggestions ? ((0, jsx_runtime_1.jsxs)("div", { className: "mt-2 w-full rounded-lg border border-brand-line/60 bg-brand-surface/40 px-2.5 py-2", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] leading-snug text-brand-ink-secondary", children: "Apply a saved close match" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-1.5 flex flex-wrap gap-1.5", children: suggestions.map((suggestion) => {
                                                                                            const code = suggestion.code.code;
                                                                                            const selected = resolvedCouponCode?.trim().toUpperCase() ===
                                                                                                code.trim().toUpperCase();
                                                                                            return ((0, jsx_runtime_1.jsx)("button", { type: "button", title: couponSuggestionHint(suggestion), "aria-pressed": selected, onClick: () => setResolvedCouponCode(selected ? null : code), className: (0, clsx_1.default)("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ring-1 ring-inset", selected
                                                                                                    ? "bg-brand-signature text-white ring-brand-signature/50 shadow-sm hover:bg-brand-signature-hover"
                                                                                                    : "bg-brand-elevated text-brand-ink ring-brand-line/70 hover:bg-brand-signature/10 hover:ring-brand-signature/30"), children: code }, suggestion.code.id));
                                                                                        }) })] })) : null] }));
                                                                })() })) : null, (0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)(breakdownRowClass, "border-t border-brand-signature/20 bg-brand-signature/10 py-3 -mx-4 px-4"), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[14px] font-bold text-brand-signature", children: "Payroll price" }), isPayrollPriceOverridden && ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 rounded bg-brand-orange/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-orange ring-1 ring-inset ring-brand-orange/25", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Edit3, { className: "h-2.5 w-2.5" }), " edited"] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: breakdownFieldWrap, children: [(0, jsx_runtime_1.jsx)("span", { className: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-brand-signature", children: "$" }), (0, jsx_runtime_1.jsx)("input", { type: "number", step: "1", min: "0", value: finalPayrollPriceInput, onChange: (e) => {
                                                                                    const val = e.target.value;
                                                                                    setFinalPayrollPriceInput(val);
                                                                                    const num = parseFloat(val) || 0;
                                                                                    setBreakdown((prev) => (prev ? { ...prev, payroll_base_price: num } : null));
                                                                                }, className: (0, clsx_1.default)(breakdownAmountInputClass, "border-brand-signature/40 text-brand-signature") })] })] })] }));
                                                })() })] })] })), step === 2 && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-line/70 bg-brand-bg/40 p-3.5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary", children: "Producer" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[14px] font-bold text-brand-ink", children: assignedProducerObj?.name || record.assignedProducer || "None" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-brand-ink-secondary", children: assignedProducerObj?.specialty || "Music Producer" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-line/70 bg-brand-bg/40 p-3.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary", children: "Customer Price" }), isCustomerPriceOverridden && ((0, jsx_runtime_1.jsx)("span", { className: "rounded bg-brand-orange/10 px-1 py-0.2 text-[9px] font-semibold uppercase text-brand-orange", children: "edited" }))] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[15px] font-bold tabular-nums text-brand-ink", children: (0, data_1.formatPrice)(finalCustomerPriceNum) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-signature/30 bg-brand-signature/8 p-3.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wider text-brand-signature", children: "Payroll Price" }), isPayrollPriceOverridden && ((0, jsx_runtime_1.jsx)("span", { className: "rounded bg-brand-orange/10 px-1 py-0.2 text-[9px] font-semibold uppercase text-brand-orange", children: "edited" }))] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[15px] font-bold tabular-nums text-brand-signature", children: (0, data_1.formatPrice)(finalPayrollPriceNum) })] })] }), rushQty > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-line/70 bg-brand-bg/40 p-4 space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-bold text-brand-ink", children: "Rush Fee" }), (0, jsx_runtime_1.jsxs)("span", { className: "rounded bg-brand-blue-soft px-2 py-0.5 text-[11px] font-semibold text-brand-blue", children: ["Quantity: ", rushQty] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-2 text-[12px] pt-1 border-t border-brand-line/40", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-brand-ink-tertiary", children: "Compensation Rate: " }), (0, jsx_runtime_1.jsxs)("span", { className: "font-semibold text-brand-ink", children: [Math.round(((record.rushFeeCompensationRate ?? assignedProducerObj?.rushFeeRate ?? 1.0) <= 1 ? (record.rushFeeCompensationRate ?? assignedProducerObj?.rushFeeRate ?? 1.0) * 100 : (record.rushFeeCompensationRate ?? assignedProducerObj?.rushFeeRate ?? 1.0))), "%"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-right", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-brand-ink-tertiary", children: "Editor Payout: " }), (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-brand-success", children: (0, data_1.formatPrice)(clientPayroll.rushFeePayout ?? 0) })] })] })] })), clientPayroll.status === "not_paid_for_mixing" && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-line/70 bg-brand-bg/60 p-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: clientPayroll.message }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] text-brand-ink-secondary", children: "Steve does not receive per-mix compensation. Payout is $0.00." })] })), clientPayroll.status === "hourly_manual" && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-line/70 bg-brand-bg/60 p-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: clientPayroll.message }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] text-brand-ink-secondary", children: "Hourly employee payout is handled via regular pay sheets. You may optionally enter a manual payout amount below." })] })), clientPayroll.status === "needs_manual_review" && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-warning/30 bg-brand-warning/10 p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 text-brand-warning font-semibold text-[13px]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { className: "h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { children: "No rate on file / Manual review required" })] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] text-brand-ink-secondary", children: clientPayroll.message })] })), clientPayroll.isCaseyAmbiguous && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-signature/30 bg-brand-signature/8 p-4 space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[13px] font-bold text-brand-ink", children: "Casey Pricing Tier Selection" }), (0, jsx_runtime_1.jsx)("span", { className: "rounded bg-brand-signature/20 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-signature", children: "Requires Choice" })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] text-brand-ink-secondary", children: "Casey has two rates configured. Select the correct rate tier for this mix:" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-3 pt-1", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => {
                                                            setSelectedCaseyRate(0.72);
                                                            setCustomRateInput("");
                                                        }, className: (0, clsx_1.default)("rounded-xl border p-3 text-left transition shadow-sm", selectedCaseyRate === 0.72
                                                            ? "border-brand-signature bg-brand-signature/15 text-brand-ink ring-2 ring-brand-signature/30"
                                                            : "border-brand-line/70 bg-brand-elevated text-brand-ink hover:border-brand-line"), children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-semibold text-brand-ink", children: "Old Pricing (72%)" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[14px] font-bold text-brand-ink tabular-nums", children: (0, data_1.formatPrice)(clientPayroll.oldPricingPayout ?? 0) })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => {
                                                            setSelectedCaseyRate(0.70);
                                                            setCustomRateInput("");
                                                        }, className: (0, clsx_1.default)("rounded-xl border p-3 text-left transition shadow-sm", selectedCaseyRate === 0.70
                                                            ? "border-brand-signature bg-brand-signature/15 text-brand-ink ring-2 ring-brand-signature/30"
                                                            : "border-brand-line/70 bg-brand-elevated text-brand-ink hover:border-brand-line"), children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-semibold text-brand-ink", children: "New Pricing (70%)" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[14px] font-bold text-brand-ink tabular-nums", children: (0, data_1.formatPrice)(clientPayroll.newPricingPayout ?? 0) })] })] })] })), clientPayroll.status === "computed" && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-line/70 bg-brand-elevated p-4 space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("label", { htmlFor: "compensation-rate-input", className: "text-[13px] font-semibold text-brand-ink flex items-center gap-1.5", children: ["Producer Rate Percentage", isRateOverridden && ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 rounded bg-brand-orange/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-orange ring-1 ring-inset ring-brand-orange/25", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Edit3, { className: "h-2.5 w-2.5" }), " edited"] }))] }), (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-brand-ink-tertiary", children: clientPayroll.rateSource })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative flex-1", children: [(0, jsx_runtime_1.jsx)("input", { id: "compensation-rate-input", type: "number", step: "1", min: "0", max: "100", value: customRateInput !== ""
                                                                    ? customRateInput
                                                                    : selectedCaseyRate !== null
                                                                        ? (selectedCaseyRate * 100).toString()
                                                                        : clientPayroll.rateUsed !== null
                                                                            ? (clientPayroll.rateUsed * 100).toString()
                                                                            : "", onChange: (e) => setCustomRateInput(e.target.value), className: "w-full rounded-lg border border-brand-line bg-brand-bg/50 py-2 pl-3 pr-8 text-[14px] font-semibold tabular-nums text-brand-ink focus:border-brand-signature focus:outline-none focus:ring-2 focus:ring-brand-signature/20", placeholder: "e.g. 72" }), (0, jsx_runtime_1.jsx)("span", { className: "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 font-semibold text-brand-ink-tertiary", children: "%" })] }), customRateInput !== "" && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setCustomRateInput(""), className: "rounded-lg border border-brand-line/60 bg-brand-bg px-2.5 py-2 text-[11px] font-medium text-brand-ink-secondary hover:bg-brand-line/30", children: "Reset" }))] })] })), (clientPayroll.status === "needs_manual_review" || clientPayroll.status === "hourly_manual") && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-line/70 bg-brand-elevated p-4 space-y-2", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "manual-payout-input", className: "text-[13px] font-semibold text-brand-ink", children: "Manual Payout Amount ($)" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("div", { className: "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-brand-ink-tertiary", children: (0, jsx_runtime_1.jsx)(lucide_react_1.DollarSign, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsx)("input", { id: "manual-payout-input", type: "number", step: "0.01", value: manualPayoutInput, onChange: (e) => setManualPayoutInput(e.target.value), className: "w-full rounded-lg border border-brand-line bg-brand-bg/50 py-2 pl-8 pr-3 text-[14px] font-semibold tabular-nums text-brand-ink focus:border-brand-signature focus:outline-none focus:ring-2 focus:ring-brand-signature/20", placeholder: "Enter producer payout dollar amount" })] })] })), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-success/30 bg-brand-success/8 p-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wider text-brand-success", children: "Instant Calculated Payout Breakdown" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-3 text-[13px]", children: (0, jsx_runtime_1.jsxs)("div", { className: "rounded-lg bg-brand-elevated p-3 border border-brand-line/50", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-medium text-brand-ink-tertiary", children: "Producer Payout" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[16px] font-bold tabular-nums text-brand-success", children: clientPayroll.producerPayout !== null
                                                                ? (0, data_1.formatPrice)(clientPayroll.producerPayout)
                                                                : "N/A" })] }) }), clientPayroll.message && ((0, jsx_runtime_1.jsx)("p", { className: "mt-2.5 text-[11px] text-brand-ink-secondary", children: clientPayroll.message }))] })] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-t border-brand-line/60 px-6 py-4 bg-brand-bg/40", children: [step === 2 ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setStep(1), disabled: loading, className: "inline-flex items-center gap-1.5 rounded-xl border border-brand-line/70 bg-brand-elevated px-4 py-2.5 text-[13px] font-semibold text-brand-ink transition hover:bg-brand-bg", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "h-4 w-4" }), " Back"] })) : ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-xl border border-brand-line/70 bg-brand-elevated px-4 py-2.5 text-[13px] font-semibold text-brand-ink transition hover:bg-brand-bg", children: "Cancel" })), step === 1 ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleProceedToPayroll, disabled: loading, className: "inline-flex items-center gap-1.5 rounded-xl bg-brand-signature px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-brand-signature/90 shadow-sm disabled:opacity-50", children: loading ? "Applying..." : "Apply pricing & set up payroll" })) : ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleFinalize, disabled: loading, className: "inline-flex items-center gap-1.5 rounded-xl bg-brand-success px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-brand-success/90 shadow-sm disabled:opacity-50", children: loading ? "Finalizing..." : "Confirm & Move to Payroll" }))] })] }), (0, jsx_runtime_1.jsx)(SetPricingModal_1.SetPricingModal, { open: pricingRefOpen, order: linkedOrder, record: record, onClose: () => setPricingRefOpen(false) })] }), document.body);
}
