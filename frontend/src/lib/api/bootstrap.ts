import { apiClient } from "./client";
import { transformProducer, type BackendProducer } from "./producers";
import { transformOrder, type BackendOrder } from "./orders";
import { transformMTDRecord, type BackendMTDRecord } from "./mtd";
import {
  transformDiscountCode,
  type BackendDiscountCode,
} from "./discount-codes";
import type { BackendPayrollAddon } from "./payroll-addons";
import type { PayrollAddon, Producer, Order, MTDRecord, DiscountCode } from "@/types";
import type { StudioPersonalReason } from "@/lib/producer-time-off";
import type { EmailTemplatesState } from "@/lib/email-templates";
import {
  transformStudioPersonalReason,
  type BackendStudioPersonalReason,
  type BackendEmailTemplate,
} from "./studio-settings";
import {
  packagePricesFromRows,
  secretMenuFromBackend,
  type BackendPackagePrice,
  type BackendSecretMenuPricing,
} from "./catalog-pricing";
import { normalizeEmailTemplates } from "@/lib/email-templates";
import { ensurePersonalReasonsList } from "@/lib/producer-time-off";
import { normalizeProducer, normalizeProducerList } from "@/lib/producers";
import { normalizeDiscountCode } from "@/lib/discount-codes";
import { normalizeOrder } from "@/lib/order-form";
import type { SecretMenuPricing } from "@/lib/pricing";

function mapPayrollAddon(raw: BackendPayrollAddon): PayrollAddon {
  let mtdId = raw.mtd_id ?? null;
  let orderId = raw.order_id ?? null;
  if (raw.notes) {
    const mtdMatch = raw.notes.match(/mtd_id:([^\s\]]+)/);
    if (mtdMatch && !mtdId) mtdId = mtdMatch[1];
    const orderMatch = raw.notes.match(/order_id:([^\s\]]+)/);
    if (orderMatch && !orderId) orderId = orderMatch[1];
  }
  return {
    id: raw.id,
    programName: raw.program_name,
    contactName: raw.contact_name ?? null,
    teamName: raw.team_name ?? null,
    orderId,
    mtdId,
    category: raw.category,
    addonType: raw.addon_type,
    amount: Number(raw.amount),
    rateSource: raw.rate_source,
    producerId: raw.producer_id ?? null,
    producerInitials: raw.producer_initials ?? null,
    notes: raw.notes ?? null,
    createdAt: raw.created_at,
  };
}

export type BootstrapPayload = {
  producers: Producer[];
  activeOrders: Order[];
  pastOrders: Order[];
  mtdRecords: MTDRecord[];
  discountCodes: DiscountCode[];
  payrollAddons: PayrollAddon[];
  personalReasons: StudioPersonalReason[];
  emailTemplates: EmailTemplatesState | null;
  packagePrices: Record<string, number> | null;
  secretMenuPricing: SecretMenuPricing | null;
};

type RawBootstrap = {
  producers?: BackendProducer[];
  orders?: BackendOrder[];
  mtd?: BackendMTDRecord[];
  discount_codes?: BackendDiscountCode[];
  payroll_addons?: BackendPayrollAddon[];
  studio_personal_reasons?: BackendStudioPersonalReason[];
  email_templates?: BackendEmailTemplate[];
  package_prices?: BackendPackagePrice[];
  secret_menu_pricing?: BackendSecretMenuPricing;
};

/** Single round-trip warm-start — avoids 8 parallel Vercel cold starts. */
export async function fetchBootstrapApi(): Promise<BootstrapPayload> {
  // One attempt, longer budget for Vercel cold start + DB — no double 20s retry.
  const raw = await apiClient.get<RawBootstrap>("/api/bootstrap", {
    timeoutMs: 45_000,
    retry: false,
  });

  const producers = normalizeProducerList(
    (raw.producers || []).map((p) => normalizeProducer(transformProducer(p)))
  );

  const activeOrders: Order[] = [];
  const pastOrders: Order[] = [];
  for (const bo of raw.orders || []) {
    const transformed = normalizeOrder(transformOrder(bo));
    if (bo.is_past_order || bo.status === "completed") {
      pastOrders.push(transformed);
    } else {
      activeOrders.push(transformed);
    }
  }

  let emailTemplates: EmailTemplatesState | null = null;
  if (raw.email_templates && raw.email_templates.length > 0) {
    const mapped: Record<string, unknown> = {};
    for (const row of raw.email_templates) {
      mapped[row.id] = {
        subject: row.subject,
        greeting: row.greeting,
        intro: row.intro,
        footer: row.footer,
        signature: row.signature,
      };
    }
    emailTemplates = normalizeEmailTemplates(mapped as any);
  }

  return {
    producers,
    activeOrders,
    pastOrders,
    mtdRecords: (raw.mtd || []).map(transformMTDRecord),
    discountCodes: (raw.discount_codes || []).map((c) =>
      normalizeDiscountCode(transformDiscountCode(c))
    ),
    payrollAddons: (raw.payroll_addons || []).map(mapPayrollAddon),
    personalReasons: ensurePersonalReasonsList(
      (raw.studio_personal_reasons || []).map(transformStudioPersonalReason)
    ),
    emailTemplates,
    packagePrices: raw.package_prices?.length
      ? packagePricesFromRows(raw.package_prices)
      : null,
    secretMenuPricing: raw.secret_menu_pricing
      ? secretMenuFromBackend(raw.secret_menu_pricing)
      : null,
  };
}
