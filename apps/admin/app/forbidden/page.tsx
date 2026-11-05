import { STOREFRONT_URL } from "@vaishnora/core/urls";

export const metadata = { title: "Not authorised — Vaishnora Admin" };

export default async function ForbiddenPage({ searchParams }: { searchParams: Promise<{ owner?: string }> }) {
  const ownerOnly = (await searchParams).owner === "1";
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <span className="eyebrow">Boutique management</span>
        <h2>{ownerOnly ? "This page is for owners" : "This account does not have admin access"}</h2>
        <p>
          {ownerOnly
            ? "Metrics, alarms, customer details and access management are only for Vaishnora's owners. Your products and orders are under Catalog and Orders."
            : "You are signed in, but this account has no admin access. Ask a Vaishnora owner to grant it on the admin's People page, using the email or phone you sign in with."}
        </p>
        <p style={{ marginTop: "1.5rem" }}>
          {ownerOnly ? <a className="btn btn-primary" href="/admin">Back to your products</a> : <a className="btn btn-primary" href={STOREFRONT_URL}>Back to the store</a>}
        </p>
      </div>
    </section>
  );
}
