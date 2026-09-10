"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormTypeLabel = getFormTypeLabel;
exports.getSubtypeLabel = getSubtypeLabel;
exports.getFullClassificationLabel = getFullClassificationLabel;
exports.getProducerCategoryRate = getProducerCategoryRate;
exports.computeClientPayroll = computeClientPayroll;
const editor_assignment_1 = require("./editor-assignment");
function getFormTypeLabel(formType) {
    switch (formType) {
        case "school-all-star-cheer":
            return "School / All-Star Cheer";
        case "school-all-star-dance":
            return "School / All-Star Dance";
        case "marching-band":
            return "Marching Band";
        case "sports-entertainment":
            return "Sports Entertainment";
        case "school-anthem":
            return "School Anthems";
        default:
            return formType || "Cheer";
    }
}
function getSubtypeLabel(subtypeId) {
    if (!subtypeId)
        return "";
    switch (subtypeId) {
        case "all-star-cheer":
            return "All-Star Cheer";
        case "school-cheer-viroc-yes":
            return "VIROC";
        case "school-cheer":
        case "school-cheer-viroc-no":
            return "School Cheer";
        case "youth-rec-cheer":
            return "Youth Rec Cheer";
        case "pom":
            return "POM";
        case "hip-hop":
            return "Hip Hop";
        case "team-performance-variety":
            return "Team Performance & Variety";
        case "gameday":
            return "Gameday";
        case "jazz-kick":
            return "Jazz / Kick";
        default:
            return subtypeId;
    }
}
function getFullClassificationLabel(formType, subtypeId, packageName) {
    const formLabel = getFormTypeLabel(formType);
    const subLabel = getSubtypeLabel(subtypeId);
    const pkgLabel = packageName || "TBD";
    if (subLabel && subLabel !== formLabel) {
        return `${formLabel} > ${subLabel} > ${pkgLabel}`;
    }
    return `${formLabel} > ${pkgLabel}`;
}
/**
 * Resolves the category-specific compensation rate for a producer on an order category or subtype.
 */
function getProducerCategoryRate(producer, categoryOrSubtype, formType) {
    const categoryName = (0, editor_assignment_1.orderCategoryToProducerCategory)(formType || undefined, categoryOrSubtype || undefined, categoryOrSubtype || undefined);
    if (producer.ratesByCategory && Object.keys(producer.ratesByCategory).length > 0) {
        // 1. Direct canonical match
        if (categoryName && producer.ratesByCategory[categoryName] !== undefined) {
            const raw = producer.ratesByCategory[categoryName];
            return {
                rate: raw > 1 ? raw / 100 : raw,
                source: `rates_by_category[${categoryName}]`,
                categoryName,
            };
        }
        // 2. Case-insensitive / normalized match in ratesByCategory
        const targetKey = (categoryName || categoryOrSubtype || "").trim().toLowerCase();
        for (const [key, val] of Object.entries(producer.ratesByCategory)) {
            if (key.trim().toLowerCase() === targetKey ||
                (0, editor_assignment_1.orderCategoryToProducerCategory)(undefined, undefined, key).trim().toLowerCase() === targetKey) {
                return {
                    rate: val > 1 ? val / 100 : val,
                    source: `rates_by_category[${key}]`,
                    categoryName: categoryName || key,
                };
            }
        }
    }
    // Fallback to producer.defaultRate if present
    if (producer.defaultRate !== undefined && producer.defaultRate !== null) {
        const raw = producer.defaultRate;
        return {
            rate: raw > 1 ? raw / 100 : raw,
            source: "default_rate",
            categoryName: categoryName || categoryOrSubtype || "",
        };
    }
    return {
        rate: null,
        source: "no_rate_configured",
        categoryName: categoryName || categoryOrSubtype || "",
    };
}
function computeClientPayroll(producer, finalCustomerPrice, breakdown, selectedRate, manualPayoutInput, canonicalSubtypeId, finalPayrollPriceOverride, options) {
    // percentage_of_payroll_base: MUST use final payroll price (payrollBase), never base customer/package price
    const payrollBase = typeof finalPayrollPriceOverride === "number" && !isNaN(finalPayrollPriceOverride)
        ? finalPayrollPriceOverride
        : (breakdown?.payroll_base_price ?? finalCustomerPrice);
    if (!producer) {
        return {
            status: "needs_manual_review",
            producerPayout: manualPayoutInput,
            sltPortion: manualPayoutInput !== null ? Math.max(0, payrollBase - manualPayoutInput) : null,
            rateUsed: null,
            rateSource: "no_producer",
            isCaseyAmbiguous: false,
            message: "No producer assigned. Enter manual payout.",
        };
    }
    const model = producer.compensationModel;
    if (model === "not_paid_for_mixing") {
        return {
            status: "not_paid_for_mixing",
            producerPayout: 0,
            sltPortion: payrollBase,
            rateUsed: 0,
            rateSource: "not_paid_for_mixing",
            isCaseyAmbiguous: false,
            message: `${producer.name} is not paid for mixing`,
        };
    }
    if (model === "hourly_manual") {
        return {
            status: "hourly_manual",
            producerPayout: manualPayoutInput,
            sltPortion: manualPayoutInput !== null ? Math.max(0, payrollBase - manualPayoutInput) : null,
            rateUsed: null,
            rateSource: "hourly_manual",
            isCaseyAmbiguous: false,
            message: `${producer.name} is paid manually via pay sheet`,
        };
    }
    // Calculate Rush Fee payout
    const rushQty = options?.rushFeeQuantity ?? 0;
    const rushCustomerCharge = rushQty * 150;
    const rawRushRate = options?.rushFeeCompensationRate ?? producer.rushFeeRate ?? 1.0;
    const rushFeeRateUsed = rawRushRate > 1 ? rawRushRate / 100 : rawRushRate;
    const rushFeePayout = Math.round(150 * rushQty * rushFeeRateUsed * 100) / 100;
    // Calculate Voiceover payout based on producer's specific VO rates
    let voiceoverPayout = 0;
    let voiceoverRateUsed;
    const isDance = options?.formType === "school-all-star-dance" ||
        Boolean(options?.danceVoiceover) ||
        Boolean(options?.hasTraditionalVoiceover) ||
        Boolean(options?.hasThemedVoiceover);
    if (isDance) {
        const rawDanceVo = producer.danceVoiceoverRate ?? 0.8;
        voiceoverRateUsed = rawDanceVo > 1 ? rawDanceVo / 100 : rawDanceVo;
        let voBase = 0;
        const danceVo = options?.danceVoiceover;
        const trad = Boolean(options?.hasTraditionalVoiceover);
        const themed = Boolean(options?.hasThemedVoiceover);
        if (danceVo === "100" || (trad && themed)) {
            voBase = 100;
        }
        else if (danceVo === "75" || themed) {
            voBase = 75;
        }
        else if (danceVo === "25" || trad) {
            voBase = 25;
        }
        voiceoverPayout = Math.round(voBase * voiceoverRateUsed * 100) / 100;
    }
    else {
        // Cheer Voiceover
        const rawCheerVo = producer.cheerVoiceoverRate ?? 1.0;
        voiceoverRateUsed = rawCheerVo > 1 ? rawCheerVo / 100 : rawCheerVo;
        let voBase = 0;
        if (options?.cheerVoiceover20)
            voBase += 20;
        if (options?.cheerVoiceover40)
            voBase += 40;
        voiceoverPayout = Math.round(voBase * voiceoverRateUsed * 100) / 100;
    }
    // Base Package Payroll Amount (subtracting customer rush fee charge to avoid double counting)
    const basePackagePayrollPrice = Math.max(0, payrollBase - rushCustomerCharge);
    // Determine initial category rate if none selected
    let defaultRate = selectedRate;
    let source = "manual_override";
    let isCasey = false;
    let oldPayout;
    let newPayout;
    if (producer.initials === "CM" || (producer.rateOverrides?.old_pricing && producer.rateOverrides?.new_pricing)) {
        isCasey = true;
        const oldRate = producer.rateOverrides?.old_pricing ?? 0.72;
        const newRate = producer.rateOverrides?.new_pricing ?? 0.70;
        const oldCatPayout = Math.round(basePackagePayrollPrice * oldRate * 100) / 100;
        const newCatPayout = Math.round(basePackagePayrollPrice * newRate * 100) / 100;
        oldPayout = Math.round((oldCatPayout + rushFeePayout + voiceoverPayout) * 100) / 100;
        newPayout = Math.round((newCatPayout + rushFeePayout + voiceoverPayout) * 100) / 100;
        if (selectedRate === null) {
            // Unconfirmed trigger
            return {
                status: "computed",
                producerPayout: null,
                sltPortion: null,
                rateUsed: null,
                rateSource: "rate_overrides[old_pricing|new_pricing]",
                isCaseyAmbiguous: true,
                oldPricingPayout: oldPayout,
                newPricingPayout: newPayout,
                rushFeePayout,
                rushFeeQuantity: rushQty,
                rushFeeRateUsed,
                voiceoverPayout,
                voiceoverRateUsed,
                message: "Casey has two rates: Old (72%) & New (70%). Select rate to finalize.",
            };
        }
    }
    if (defaultRate === null) {
        const catOrSub = canonicalSubtypeId || breakdown?.canonical_subtype_id;
        const formType = breakdown?.form_type || options?.formType;
        const resolved = getProducerCategoryRate(producer, catOrSub, formType);
        defaultRate = resolved.rate;
        source = resolved.source;
    }
    if (defaultRate === null) {
        const catOrSub = canonicalSubtypeId || breakdown?.canonical_subtype_id || breakdown?.form_type || options?.formType || "this order";
        const rawFormType = breakdown?.form_type || options?.formType || undefined;
        const categoryName = (0, editor_assignment_1.orderCategoryToProducerCategory)(rawFormType, canonicalSubtypeId || undefined, catOrSub || undefined) || catOrSub;
        return {
            status: "needs_manual_review",
            producerPayout: manualPayoutInput,
            sltPortion: manualPayoutInput !== null ? Math.max(0, payrollBase - manualPayoutInput) : null,
            rateUsed: null,
            rateSource: "no_rate_configured",
            isCaseyAmbiguous: false,
            message: `Compensation percentage is not configured for ${producer.name} on category "${categoryName}". Please configure it in Settings → Producers.`,
        };
    }
    const normalizedCategoryRate = defaultRate > 1 ? defaultRate / 100 : defaultRate;
    const categoryPayout = Math.round(basePackagePayrollPrice * normalizedCategoryRate * 100) / 100;
    const payout = Math.round((categoryPayout + rushFeePayout + voiceoverPayout) * 100) / 100;
    const slt = Math.round((payrollBase - payout) * 100) / 100;
    return {
        status: "computed",
        producerPayout: payout,
        sltPortion: slt,
        rateUsed: defaultRate,
        rateSource: source,
        isCaseyAmbiguous: isCasey && selectedRate === null,
        oldPricingPayout: oldPayout,
        newPricingPayout: newPayout,
        categoryPayout,
        rushFeePayout,
        rushFeeQuantity: rushQty,
        rushFeeRateUsed,
        voiceoverPayout,
        voiceoverRateUsed,
        message: rushFeePayout || voiceoverPayout
            ? `Payout: $${payout.toFixed(2)} (${(normalizedCategoryRate * 100).toFixed(0)}% base + addons)`
            : `Payout: $${payout.toFixed(2)} (${(normalizedCategoryRate * 100).toFixed(0)}%)`,
    };
}
