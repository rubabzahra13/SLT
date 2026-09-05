import { apiClient } from "./client";

export interface AddOnLineItem {
  addon_id: string;
  label: string;
  customer_amount: number;
  payroll_amount: number;
  quantity: number;
  note: string | null;
}

export interface PricingBreakdown {
  form_type: string;
  canonical_subtype_id: string | null;
  package_id: string | null;
  package_name: string | null;
  pricing_rule_id: string | null;
  compliance_status: "compliant" | "non-compliant" | "needs_manual_review";
  compliance_reason: string;
  canonical_affiliate: string | null;
  base_customer_price: number | null;
  base_payroll_price: number | null;
  addons: AddOnLineItem[];
  system_calculated_customer_price: number | null;
  payroll_base_price: number | null;
  needs_manual_pricing: boolean;
  needs_manual_review: boolean;
  summary_line: string;
}

export interface CompensationResult {
  status: "computed" | "needs_manual_review" | "hourly_manual" | "not_paid_for_mixing";
  producer_payout: number | null;
  rate_used: number | null;
  rate_source: string;
  old_pricing_payout?: number | null;
  new_pricing_payout?: number | null;
  old_new_trigger_unconfirmed?: boolean;
  manual_input_fields?: Array<{ label: string; rate_or_null: number | null }>;
  slt_portion: number | null;
  final_customer_price: number | null;
  flag: string;
}

export interface OrderPricingResponse {
  order_id: string;
  system_calculated_customer_price: number | null;
  final_customer_price: number | null;
  final_customer_price_overridden: boolean;
  price_compliance: string | null;
  pricing_breakdown: PricingBreakdown | null;
  rate_used?: number | null;
  rate_source?: string | null;
  producer_payout?: number | null;
  slt_portion?: number | null;
  payroll_finalized?: boolean;
  payroll_breakdown?: CompensationResult | null;
}

export interface AddonsInput {
  rush?: boolean;
  double_rush?: boolean;
  dance_voiceover_amount?: number | null;
  cheer_voiceover_amount?: number | null;
  eight_count_sheets?: boolean;
  extra_songs?: number;
  extra_song_added_time?: number;
}

export interface PricingCalculateRequest {
  form_type: string;
  cheer_form_subtype?: string | null;
  dance_form_subtype?: string | null;
  package_name: string;
  music_affiliate?: string | null;
  addons?: AddonsInput;
}

export interface CompletePricingRequest {
  cheer_form_subtype?: string | null;
  dance_form_subtype?: string | null;
  music_affiliate?: string | null;
  addons?: AddonsInput;
  final_customer_price_override?: number | null;
}

export interface FinalizePayrollRequest {
  producer_initials: string;
  final_customer_price?: number | null;
  overridden_rate?: number | null;
}

export async function calculatePricingApi(
  req: PricingCalculateRequest
): Promise<PricingBreakdown> {
  return apiClient.post<PricingBreakdown>("/api/pricing/calculate", req);
}

export async function completePricingApi(
  orderId: string,
  req: CompletePricingRequest
): Promise<OrderPricingResponse> {
  return apiClient.post<OrderPricingResponse>(
    `/api/orders/${orderId}/complete-pricing`,
    req
  );
}

export async function finalizePayrollApi(
  orderId: string,
  req: FinalizePayrollRequest
): Promise<OrderPricingResponse> {
  return apiClient.post<OrderPricingResponse>(
    `/api/orders/${orderId}/finalize-payroll`,
    req
  );
}
