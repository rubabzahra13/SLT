import { redirect } from "next/navigation";

/** Payroll detail was removed — send deep links to the list with focus. */
export default async function PayrollDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/payroll?focus=${encodeURIComponent(id)}`);
}
