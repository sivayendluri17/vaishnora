// Every order in one place: what was bought (code, colour, size, photo), who
// bought it, where to send it, and how it was paid. The same facts as the
// owner email, so nothing depends on finding an email later.
import Link from "next/link";
import { productPath } from "@vaishnora/core/products";
import { requireAdmin } from "@/lib/guard";
import { listOrders } from "@vaishnora/core/orders";
import { STOREFRONT_URL } from "@vaishnora/core/urls";
import { formatINR } from "@vaishnora/core/format";
import OpsShell, { OpsNotice } from "@/components/ops/OpsShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders — Vaishnora Admin" };

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";
}

function waLink(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? "91" + digits : digits}`;
}

export default async function OrdersPage() {
  await requireAdmin("/admin/orders");
  let orders: Awaited<ReturnType<typeof listOrders>> = [];
  let problem = "";
  try {
    orders = await listOrders(200);
  } catch (err) {
    problem = err instanceof Error ? err.message : "Couldn't load orders.";
  }
  const paid = orders.filter((o) => o.paymentStatus === "paid").length;

  return (
    <OpsShell active="orders" title="Orders" subtitle={`${orders.length} orders · ${paid} paid online · newest first`}>
      {problem && <OpsNotice tone="error">{problem}</OpsNotice>}
      {orders.length === 0 && !problem && <OpsNotice tone="info">No orders yet.</OpsNotice>}

      <div className="orders-list">
        {orders.map((o) => (
          <article key={o.id} className="order-admin-card">
            <header className="order-admin-head">
              <div>
                <strong className="order-admin-ref">#{o.id.slice(0, 8).toUpperCase()}</strong>
                <span className="order-admin-when">{when(o.createdAt)}</span>
                {o.channel === "online" ? (
                  <span className="order-channel order-pay-status is-paid">✓ Paid online</span>
                ) : (
                  <span className="order-channel">via {o.channel} · settle directly</span>
                )}
              </div>
              <strong className="order-admin-total">{formatINR(o.total)}</strong>
            </header>

            <div className="order-admin-body">
              <div className="order-admin-items">
                {o.items.map((it, idx) => (
                  <div key={idx} className="order-admin-item">
                    {it.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.imageUrl} alt="" />
                    ) : (
                      <span className="order-admin-swatch" style={{ background: it.swatch ?? "var(--parchment)" }} />
                    )}
                    <div>
                      <a href={`${STOREFRONT_URL}${productPath(it.productId, it.colour)}`} target="_blank" rel="noreferrer">{it.name}</a>
                      <div className="order-admin-meta">
                        {it.asin && <span className="order-admin-code">{it.asin}</span>}
                        {it.colour && <span>Colour: {it.colour}</span>}
                        {it.size && <span>Size: {it.size}</span>}
                        <span>Qty {it.qty}</span>
                        <span>{formatINR(it.price * it.qty)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-admin-ship">
                <div className="order-admin-label">Ship to</div>
                <div>{o.customerName}</div>
                <div>
                  <a href={`tel:${o.mobile}`}>{o.mobile}</a>
                  {" · "}
                  <a href={waLink(o.mobile)} target="_blank" rel="noreferrer">WhatsApp</a>
                </div>
                <div>{o.addressLine1}{o.addressLine2 ? ", " + o.addressLine2 : ""}</div>
                {o.landmark && <div>Landmark: {o.landmark}</div>}
                <div>{o.city}, {o.state} - {o.pincode}</div>
                {o.razorpayPaymentId && (
                  <div className="order-admin-pay">
                    <a href={`https://dashboard.razorpay.com/app/payments/${o.razorpayPaymentId}`} target="_blank" rel="noreferrer">{o.razorpayPaymentId} ↗</a>
                    {o.paidAt && <span> · paid {when(o.paidAt)}</span>}
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="form-hint" style={{ marginTop: "1rem" }}>
        Showing the latest 200. Product codes link to the live product page; the Razorpay link opens the payment for refunds.
        {" "}<Link href="/admin">Back to catalogue</Link>
      </p>
    </OpsShell>
  );
}
