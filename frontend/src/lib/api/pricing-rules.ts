import { apiClient } from "./client";

export type BackendPricingRule = {
  id: string;
  form_type: string;
  subtype_id?: string | null;
  package_id: string;
  package_name: string;
  customer_facing_price: number | null;
  payroll_base_compliant: number | null;
  payroll_base_non_compliant: number | null;
  compliance_sensitive?: boolean;
  note?: string | null;
};

export type PricingRulePackageUpdate = {
  package_id?: string;
  package_name: string;
  customer_facing_price: number | null;
  payroll_base_compliant: number | null;
  payroll_base_non_compliant: number | null;
  note?: string | null;
};

export type DbBackedFormType =
  | "marching-band"
  | "sports-entertainment"
  | "school-anthem";

export async function fetchPricingRulesApi(
  formType?: DbBackedFormType
): Promise<BackendPricingRule[]> {
  const qs = formType
    ? `?form_type=${encodeURIComponent(formType)}`
    : "";
  const rows = await apiClient.get<BackendPricingRule[]>(
    `/api/pricing-rules${qs}`
  );
  return Array.isArray(rows) ? rows : [];
}

export async function savePricingRulesApi(
  formType: DbBackedFormType,
  packages: PricingRulePackageUpdate[]
): Promise<BackendPricingRule[]> {
  const rows = await apiClient.put<BackendPricingRule[]>("/api/pricing-rules", {
    form_type: formType,
    packages,
  });
  return Array.isArray(rows) ? rows : [];
}
