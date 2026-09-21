import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";

const categories = [
  { name: "Sarees", bg: "linear-gradient(160deg,#5e0e26 0%,#8e1d45 55%,#b8325e 110%)" },
  { name: "Dresses", bg: "linear-gradient(160deg,#f1e4cf 0%,#e4c98b 55%,#c49a4a 110%)" },
  { name: "Ethnic Wear", bg: "linear-gradient(160deg,#4e0a1e 0%,#7a1230 60%,#c49a4a 140%)" },
  { name: "Accessories", bg: "linear-gradient(160deg,#1b1b1b 0%,#4f3b2d 45%,#b48b5d 110%)" },
  { name: "Jewellery", bg: "linear-gradient(160deg,#3e2a0a 0%,#8e6a1d 46%,#d4b15b 110%)" },
];

export const dynamic = "force-dynamic";

function slugifyCategory(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

export default async function AdminProductsIndexPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/login?next=/admin/products");

  return (
    <section className="section">
      <div className="container">
        <span className="eyebrow">Boutique management</span>
        <h2>Choose a collection to add</h2>
        <div className="card-grid" style={{ marginTop: "1.5rem" }}>
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/admin/products/${slugifyCategory(category.name)}`}
              className="collection-card"
              style={{ background: category.bg }}
            >
              <span className="glow" aria-hidden="true" />
              <span className="label">
                <h3>{category.name}</h3>
                <p>Add new products and upload category images</p>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
