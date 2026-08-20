import { redirect } from "next/navigation";
import { findOrder, getData } from "@/lib/data";

export default async function OrderDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = findOrder(id);
  const { mtdRecords } = getData();

  if (order?.mtdId) {
    redirect(`/mtd/${order.mtdId}`);
  }

  const mtd = mtdRecords.find((record) => record.orderId === id);
  if (mtd) {
    redirect(`/mtd/${mtd.id}`);
  }

  redirect("/mtd");
}
