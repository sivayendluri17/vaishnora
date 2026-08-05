import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Vaishnora" };

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/login?next=/admin");
  return <AdminDashboard adminName={admin.name} />;
}
