// Sends password-reset codes via AWS SES (email) and AWS SNS (SMS).
// Requires AWS_REGION + SES_FROM_EMAIL. Credentials come from explicit
// AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY (local dev) if both are set,
// otherwise the SDK's default credential chain (e.g. the Amplify compute
// service role in production).

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import type { OrderDetail } from "./orders";
import { STOREFRONT_URL } from "./urls";
import { productPath } from "./products";

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

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const waLink = (mobile: string) => { const d = mobile.replace(/\D/g, ""); return `https://wa.me/${d.length === 10 ? "91" + d : d}`; };

/**
 * The "new paid order" email: subject, plain text, and an HTML version with
 * each item's photo, product code, colour, size and a link to the product
 * page, so the right piece gets packed. Text is kept for mail apps that
 * strip HTML.
 */
export function orderPaidEmail(o: OrderDetail): { subject: string; body: string; html: string } {
  const ref = o.id.slice(0, 8).toUpperCase();
  const when = (o.paidAt ? new Date(o.paidAt) : new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  const link = (i: { productId: string; colour: string | null }) => `${STOREFRONT_URL}${productPath(i.productId, i.colour)}`;
  const variant = (i: { colour: string | null; size?: string | null }) => [i.colour, i.size].filter(Boolean).join(", ");

  const lines = o.items.map((i) => {
    const v = variant(i);
    return `  - ${i.name}${v ? ` (${v})` : ""} x ${i.qty}  ${inr(i.price * i.qty)}\n    Code ${i.asin ?? "-"} · ${link(i)}`;
  });
  const body =
    `New paid order ${ref}  -  ${inr(o.total)}\n` +
    `Paid ${when} IST\n\n` +
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

  const rows = o.items.map((i) => `
      <tr>
        <td style="padding:10px 10px 10px 0;vertical-align:top;width:72px">
          ${i.imageUrl ? `<a href="${esc(link(i))}"><img src="${esc(i.imageUrl)}" width="72" height="90" alt="" style="display:block;width:72px;height:90px;object-fit:cover;border-radius:8px;border:1px solid #e4c98b"></a>` : `<div style="width:72px;height:90px;border-radius:8px;background:${esc(i.swatch ?? "#f1e4cf")}"></div>`}
        </td>
        <td style="padding:10px 0;vertical-align:top;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#3a2530">
          <a href="${esc(link(i))}" style="color:#7a1230;font-weight:bold;text-decoration:none">${esc(i.name)}</a><br>
          <span style="display:inline-block;margin-top:4px;padding:2px 8px;border:1px solid #c49a4a;border-radius:999px;font-size:12px;letter-spacing:.08em;color:#9a7430">${esc(i.asin ?? "no code")}</span>
          ${i.colour ? `&nbsp; Colour: <b>${esc(i.colour)}</b>` : ""}${i.size ? `&nbsp; Size: <b>${esc(i.size)}</b>` : ""}<br>
          Qty <b>${i.qty}</b> · ${esc(inr(i.price))} each · <b>${esc(inr(i.price * i.qty))}</b>
        </td>
      </tr>`).join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f7eee1;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fdf8f0;border:1px solid #e4c98b;border-radius:14px;padding:22px;font-family:Arial,Helvetica,sans-serif;color:#3a2530">
    <p style="margin:0;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#9a7430">Vaishnora · New paid order</p>
    <h1 style="margin:6px 0 2px;font-size:22px;color:#4e0a1e">Order #${ref} · ${esc(inr(o.total))}</h1>
    <p style="margin:0 0 16px;font-size:13px;color:#7c6470">Paid ${esc(when)} IST</p>

    <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-top:1px solid #eadcc4;border-bottom:1px solid #eadcc4">${rows}</table>

    <h2 style="margin:18px 0 6px;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:#9a7430">Ship to</h2>
    <p style="margin:0;font-size:14px;line-height:1.5">
      <b>${esc(o.customerName)}</b><br>
      <a href="tel:${esc(o.mobile)}" style="color:#7a1230">${esc(o.mobile)}</a> · <a href="${esc(waLink(o.mobile))}" style="color:#7a1230">WhatsApp</a><br>
      ${esc(o.addressLine1)}${o.addressLine2 ? ", " + esc(o.addressLine2) : ""}<br>
      ${o.landmark ? "Landmark: " + esc(o.landmark) + "<br>" : ""}
      ${esc(o.city)}, ${esc(o.state)} - ${esc(o.pincode)}
    </p>

    <h2 style="margin:18px 0 6px;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:#9a7430">Payment</h2>
    <p style="margin:0;font-size:13px;line-height:1.5">
      ${o.razorpayPaymentId ? `<a href="https://dashboard.razorpay.com/app/payments/${esc(o.razorpayPaymentId)}" style="color:#7a1230">${esc(o.razorpayPaymentId)}</a> on Razorpay` : "-"}<br>
      <span style="color:#7c6470">Order id ${esc(o.id)}</span>
    </p>
  </div></body></html>`;

  return { subject: `New paid order ${ref}: ${inr(o.total)} from ${o.customerName}`, body, html };
}

/** Send the paid-order email to each owner. */
export async function sendOrderPaidEmail(to: string[], o: OrderDetail): Promise<void> {
  const { subject, body, html } = orderPaidEmail(o);
  // One send per owner, so an address SES refuses (unverified while the
  // account is in the SES sandbox) does not stop the others.
  const results = await Promise.allSettled(to.map((address) => ses.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!,
      Destination: { ToAddresses: [address] },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: body }, Html: { Data: html } },
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
