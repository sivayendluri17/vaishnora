import Link from "next/link";
import Image from "next/image";
import Divider from "@/components/Divider";
import { listActiveProducts, } from "@/lib/products-db";
import { thumbnailFor } from "@/lib/products";

export const dynamic = "force-dynamic";

const collections = [
  {
    name: "Sarees",
    note: "Banarasi, Kanjivaram & handloom silks",
    href: "/search?cat=Sarees",
    bg: "linear-gradient(160deg,#5e0e26 0%,#8e1d45 55%,#b8325e 110%)",
  },
  {
    name: "Dresses",
    note: "Anarkalis, shararas & festive gowns",
    href: "/search?cat=Dresses",
    bg: "linear-gradient(160deg,#f1e4cf 0%,#e4c98b 55%,#c49a4a 110%)",
  },
  {
    name: "Ethnic Wear",
    note: "Lehengas, kurta sets & occasion wear",
    href: "/search?cat=Ethnic Wear",
    bg: "linear-gradient(160deg,#4e0a1e 0%,#7a1230 60%,#c49a4a 140%)",
  },
];

// Pick one representative product image per category for the collection cards.
async function categoryImages(): Promise<Record<string, string | null>> {
  const map: Record<string, string | null> = { Sarees: null, Dresses: null, "Ethnic Wear": null };
  try {
    const products = await listActiveProducts();
    for (const cat of Object.keys(map)) {
      const match = products.find((p) => p.category === cat && thumbnailFor(p));
      map[cat] = match ? thumbnailFor(match) : null;
    }
  } catch {
    // leave nulls → gradient fallback
  }
  return map;
}

export default async function Home() {
  const catImg = await categoryImages();
  return (
    <>
      {/* ===== Hero ===== */}
      <section className="container hero">
        <div className="hero-copy">
          <span className="eyebrow">Ethnic Wear • Sarees • Dresses</span>
          <h1>
            Woven in tradition, <em>draped in gold.</em>
          </h1>
          <p className="hero-lede">
            Vaishnora brings heritage Indian craftsmanship to the modern
            wardrobe — handpicked sarees, festive dresses, and occasion wear in
            our signature maroon and gold.
          </p>
          <div className="hero-actions">
            <Link href="/search" className="btn btn-primary">Explore the collection</Link>
            <Link href="/register" className="btn btn-outline">Join Vaishnora</Link>
          </div>
        </div>

        <div className="jharokha" aria-hidden="true">
          <div className="jharokha-inner">
            <Image
              src="/logo.jpg"
              alt="Vaishnora — a gold V draped in a maroon saree"
              width={520}
              height={650}
              priority
            />
          </div>
        </div>
      </section>

      <div className="zari-strip" aria-hidden="true" />

      {/* ===== Collections ===== */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">The collections</span>
            <h2>Three houses of Vaishnora</h2>
            <p>
              Every piece is chosen for its weave, its story, and the way it
              carries celebration.
            </p>
          </div>
          <div className="card-grid">
            {collections.map((c) => {
              const img = catImg[c.name];
              return (
                <Link key={c.name} href={c.href} className="collection-card" style={{ background: c.bg }}>
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={c.name} className="collection-card-img" />
                  )}
                  <span className="glow" aria-hidden="true" />
                  <span className="label">
                    <h3>{c.name}</h3>
                    <p>{c.note}</p>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Story band ===== */}
      <section className="section story">
        <div className="container">
          <span className="eyebrow">Our promise</span>
          <h2>From the loom to your celebration</h2>
          <div className="story-grid">
            <div className="story-item">
              <h3>Handpicked weaves</h3>
              <p>Sourced from artisan clusters known for Banarasi, Kanjivaram, and chikankari traditions.</p>
            </div>
            <div className="story-item">
              <h3>True to heritage</h3>
              <p>Authentic zari, natural silks, and embroidery that honors the original craft.</p>
            </div>
            <div className="story-item">
              <h3>Made for occasions</h3>
              <p>Weddings, festivals, and every celebration in between — dressed in maroon and gold.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
