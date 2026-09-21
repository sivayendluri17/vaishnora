import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import AdminDashboard from "@/app/admin/AdminDashboard";

const categoryMap: Record<string, string> = {
  sarees: "Sarees",
  dresses: "Dresses",
  "ethnic-wear": "Ethnic Wear",
  accessories: "Accessories",
  jewellery: "Jewellery",
};

export const dynamic = "force-dynamic";

export default async function CategoryAdminPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const admin = await getAdminUser();
  if (!admin) redirect("/login?next=/admin/products");

  const resolved = categoryMap[category] ?? "Sarees";

  return <AdminDashboard adminName={admin.name} defaultCategory={resolved} />;
}
