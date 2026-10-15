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
  | "school-anthem"
  | "school-all-star-dance";

export async function fetchPricingRulesApi(
  formType?: DbBackedFormType,
  subtypeId?: string | null
): Promise<BackendPricingRule[]> {
  const params = new URLSearchParams();
  if (formType) params.set("form_type", formType);
  if (subtypeId) params.set("subtype_id", subtypeId);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const rows = await apiClient.get<BackendPricingRule[]>(
    `/api/pricing-rules${qs}`
  );
  return Array.isArray(rows) ? rows : [];
}

export async function savePricingRulesApi(
  formType: DbBackedFormType,
  packages: PricingRulePackageUpdate[],
  subtypeId?: string | null
): Promise<BackendPricingRule[]> {
  const body: {
    form_type: DbBackedFormType;
    packages: PricingRulePackageUpdate[];
    subtype_id?: string;
  } = {
    form_type: formType,
    packages,
  };
  if (subtypeId) body.subtype_id = subtypeId;
  const rows = await apiClient.put<BackendPricingRule[]>(
    "/api/pricing-rules",
    body
  );
  return Array.isArray(rows) ? rows : [];
}
