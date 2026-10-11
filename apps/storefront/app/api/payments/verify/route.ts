// Step 2 of online payment: the popup reported success, prove it, then write
// the confirmed order.
//
// Razorpay signs order_id|payment_id with our key secret. Only Razorpay has
// that secret, so a valid signature means the payment really happened for
// this order and this amount (the amount is fixed on the order). The attempt
// must also belong to the signed-in shopper. Confirming is idempotent, so a
// retried request or a webhook arriving first is harmless.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@vaishnora/core/auth";
import { confirmAttemptPaid, findAttemptByRazorpayOrderId } from "@vaishnora/core/payment-attempts";
import { fetchRazorpayPayment, verifyPaymentSignature } from "@vaishnora/core/payments";
import { notifyOrderPaid } from "@vaishnora/core/order-notify";
import { toPaise } from "@vaishnora/core/pricing";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const orderId = String(body?.razorpay_order_id ?? "");
  const paymentId = String(body?.razorpay_payment_id ?? "");
  const signature = String(body?.razorpay_signature ?? "");
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  }

  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    console.warn(`verify: bad signature for ${orderId} / ${paymentId} from user ${session.sub}`);
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  const attempt = await findAttemptByRazorpayOrderId(orderId);
  if (!attempt) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (attempt.userId !== session.sub) {
    console.warn(`verify: user ${session.sub} tried to confirm attempt ${attempt.id} owned by ${attempt.userId}`);
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // Belt and braces: ask Razorpay what it charged. The signature already proves
  // the payment, so a network hiccup here must not block a genuine shopper.
  try {
    const p = await fetchRazorpayPayment(paymentId);
    if (p.orderId !== orderId || p.amount !== toPaise(attempt.total) || !(p.status === "captured" || p.status === "authorized")) {
      console.error(`verify: payment ${paymentId} does not match attempt ${attempt.id}:`, p);
      return NextResponse.json({ error: "Payment details do not match this order." }, { status: 400 });
    }
  } catch (err) {
    console.warn("verify: could not fetch payment from Razorpay, trusting signature:", err);
  }

  const result = await confirmAttemptPaid(orderId, paymentId);
  switch (result.outcome) {
    case "paid":
      await notifyOrderPaid(result.orderId);
      return NextResponse.json({ ok: true, orderId: result.orderId });
    case "already_paid":
      return NextResponse.json({ ok: true, orderId: result.orderId });
    case "conflict":
      console.error(`verify: attempt for ${orderId} already paid by ${result.existingPaymentId}, got ${paymentId}`);
      return NextResponse.json({ error: "This order was already paid. If you were charged twice, the extra payment will be refunded." }, { status: 409 });
    default:
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
}
