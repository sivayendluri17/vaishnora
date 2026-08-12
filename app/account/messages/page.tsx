import Link from "next/link";

export const metadata = { title: "Coming soon — Vaishnora" };

export default function Page() {
  return (
    <section className="section">
      <div className="container empty-state">
        <span className="eyebrow">Your account</span>
        <h2>Coming soon ✦</h2>
        <p style={{ maxWidth: "44ch", margin: "0 auto" }}>
          This section is on its way. In the meantime, reach us any time and we&apos;ll help you directly.
        </p>
        <Link href="/support" className="btn btn-gold" style={{ marginTop: "1rem" }}>Contact support</Link>
      </div>
    </section>
  );
}
