import { STOREFRONT_URL } from "@vaishnora/core/urls";

export const metadata = { title: "Not authorised — Vaishnora Admin" };

export default function ForbiddenPage() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <span className="eyebrow">Boutique management</span>
        <h2>This account is not an administrator</h2>
        <p>
          You are signed in, but this account does not have admin access. Ask the boutique owner to set the
          <code> is_admin</code> flag on your user, or sign in with an admin account.
        </p>
        <p style={{ marginTop: "1.5rem" }}>
          <a className="btn btn-primary" href={STOREFRONT_URL}>Back to the store</a>
        </p>
      </div>
    </section>
  );
}
