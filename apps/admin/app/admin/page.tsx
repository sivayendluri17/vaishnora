import { requireAdmin } from "@/lib/guard";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Vaishnora" };

export default async function AdminPage() {
  const admin = await requireAdmin("/admin");
  return <AdminDashboard adminName={admin.name} />;
}
