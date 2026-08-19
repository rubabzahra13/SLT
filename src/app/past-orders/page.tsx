import { redirect } from "next/navigation";

export default function PastOrdersPage() {
  redirect("/orders?tab=past");
}
