// Tell the shop owners about a paid online order: email, and a WhatsApp
// message when the WhatsApp Business API is configured.
//
// Called from the verify route and the webhook, but only by whichever one
// marks the order paid first (markOrderPaid returns "paid" exactly once), so
// one order means one email and one WhatsApp per owner. Failures are logged
// and swallowed: a missing notification must never turn a successful payment
// into an error for the shopper.
//
// Env:
//   ORDER_NOTIFY_EMAIL      comma-separated owner addresses; SES_FROM_EMAIL is the sender
//   ORDER_NOTIFY_WHATSAPP   comma-separated owner numbers, digits with country code (919876543210)
//   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID   from Meta's WhatsApp Business API
//   WHATSAPP_TEMPLATE_NAME  approved template (default vaishnora_new_order), WHATSAPP_TEMPLATE_LANG (default en)

import { getOrderById, type OrderDetail } from "./orders";
import { sendOrderPaidEmail, sendOrderPaidWhatsApp } from "./notify";

const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export async function notifyOrderPaid(orderId: string): Promise<void> {
  let order: OrderDetail | null;
  try {
    order = await getOrderById(orderId);
  } catch (err) {
    console.error(`order-notify: could not load order ${orderId}:`, err);
    return;
  }
  if (!order) { console.error(`order-notify: order ${orderId} not found`); return; }

  const emails = list(process.env.ORDER_NOTIFY_EMAIL);
  if (emails.length === 0) console.warn(`order-notify: ORDER_NOTIFY_EMAIL not set, no email for order ${orderId}`);
  const phones = list(process.env.ORDER_NOTIFY_WHATSAPP).map((p) => p.replace(/\D/g, ""));

  await Promise.all([
    emails.length
      ? sendOrderPaidEmail(emails, order).catch((err) => console.error(`order-notify: email failed for ${orderId}:`, err))
      : Promise.resolve(),
    phones.length
      ? sendOrderPaidWhatsApp(phones, order).catch((err) => console.error(`order-notify: WhatsApp failed for ${orderId}:`, err))
      : Promise.resolve(),
  ]);
}
