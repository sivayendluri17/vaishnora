// Sends password-reset codes via AWS SES (email) and AWS SNS (SMS).
// Requires AWS_REGION + SES_FROM_EMAIL. Credentials come from explicit
// AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY (local dev) if both are set,
// otherwise the SDK's default credential chain (e.g. the Amplify compute
// service role in production).

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import type { OrderDetail } from "./orders";

const region = process.env.AWS_REGION || "us-west-2";
const credentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

const ses = new SESClient({ region, ...(credentials ? { credentials } : {}) });
const sns = new SNSClient({ region, ...(credentials ? { credentials } : {}) });

export async function sendResetCodeEmail(toEmail: string, code: string): Promise<void> {
  await ses.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: "Your Vaishnora password reset code" },
        Body: { Text: { Data: `Your password reset code is ${code}. It expires in 15 minutes.` } },
      },
    })
  );
}

export async function sendResetCodeSms(toPhoneE164: string, code: string): Promise<void> {
  await sns.send(
    new PublishCommand({
      PhoneNumber: toPhoneE164,
      Message: `Vaishnora password reset code: ${code}. Expires in 15 minutes.`,
    })
  );
}

const inr = (n: number) => "\u20B9" + n.toLocaleString("en-IN");

/** Plain-text "new paid order" email to the shop owner with everything needed to pack and ship. */
export async function sendOrderPaidEmail(to: string[], o: OrderDetail): Promise<void> {
  const ref = o.id.slice(0, 8).toUpperCase();
  const lines = o.items.map((i) => `  - ${i.name}${i.colour ? ` (${i.colour})` : ""} x ${i.qty}  ${inr(i.price * i.qty)}`);
  const when = o.paidAt ? new Date(o.paidAt) : new Date();
  const body =
    `New paid order ${ref}  -  ${inr(o.total)}\n` +
    `Paid ${when.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST\n\n` +
    `Items:\n${lines.join("\n")}\n\n` +
    `Ship to:\n` +
    `  ${o.customerName}\n` +
    `  ${o.mobile}\n` +
    `  ${o.addressLine1}${o.addressLine2 ? ", " + o.addressLine2 : ""}\n` +
    (o.landmark ? `  Landmark: ${o.landmark}\n` : "") +
    `  ${o.city}, ${o.state} - ${o.pincode}\n\n` +
    `Payment: ${o.razorpayPaymentId ?? "-"} (Razorpay order ${o.razorpayOrderId ?? "-"})\n` +
    `Razorpay dashboard: https://dashboard.razorpay.com/app/payments/${o.razorpayPaymentId ?? ""}\n\n` +
    `Order id: ${o.id}\n`;
  // One send per owner, so an address SES refuses (unverified while the
  // account is in the SES sandbox) does not stop the others.
  const results = await Promise.allSettled(to.map((address) => ses.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!,
      Destination: { ToAddresses: [address] },
      Message: {
        Subject: { Data: `New paid order ${ref}: ${inr(o.total)} from ${o.customerName}` },
        Body: { Text: { Data: body } },
      },
    })
  )));
  const failed = results
    .map((r, i) => (r.status === "rejected" ? `${to[i]}: ${(r.reason as Error)?.message ?? r.reason}` : null))
    .filter(Boolean);
  if (failed.length) throw new Error(failed.join("; "));
}

/**
 * WhatsApp message to the shop owners via Meta's WhatsApp Business (Cloud) API.
 * Business-initiated messages must use an approved template; this one expects
 * four body parameters: order ref, amount, customer name, item count. Numbers
 * are digits with country code (919876543210). Skipped when not configured.
 */
export async function sendOrderPaidWhatsApp(to: string[], o: OrderDetail): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.warn("notify: WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set, skipping WhatsApp");
    return;
  }
  const template = process.env.WHATSAPP_TEMPLATE_NAME || "vaishnora_new_order";
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || "en";
  const count = o.items.reduce((n, i) => n + i.qty, 0);
  const params = [o.id.slice(0, 8).toUpperCase(), inr(o.total), o.customerName, String(count)];

  const results = await Promise.allSettled(to.map(async (number) => {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: number,
        type: "template",
        template: {
          name: template,
          language: { code: lang },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`WhatsApp to ${number}: ${res.status} ${body.slice(0, 300)}`);
    }
  }));
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed.length) throw new Error(failed.map((f) => String(f.reason?.message ?? f.reason)).join("; "));
}
