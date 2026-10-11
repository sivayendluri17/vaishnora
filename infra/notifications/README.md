# Owner notifications

When a shopper pays online, the storefront emails the shop owners (and sends a
WhatsApp message once the WhatsApp Business API is configured). This folder
holds the AWS side of that.

## What is where

| Piece | Where it lives | Managed by |
|---|---|---|
| SES production access | granted 2026-10-11 for us-west-2 (SES console → Account dashboard) | one-time support request, no template possible |
| Who gets notified | Amplify → `vaishnora` app → Environment variables: `ORDER_NOTIFY_EMAIL`, `ORDER_NOTIFY_WHATSAPP` | Amplify console (the apps are not under CloudFormation yet) |
| WhatsApp sender | Meta for Developers → WhatsApp Business API: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, template `vaishnora_new_order` | Meta console + Amplify variables |
| Sending code | `packages/core/src/order-notify.ts`, `packages/core/src/notify.ts` | repo |

Secrets (Razorpay keys, WhatsApp token) are never committed. They are set in
Amplify and copied into `.env.production` at build time by `amplify.yml`.

## SES

The account left the SES sandbox on 2026-10-11 (us-west-2), so any address can
receive mail: owner alerts and customer password resets alike. Nothing to
deploy. If a new AWS account or region is ever used, request production access
again (SES → Get set up → Request production access) before relying on email.

## WhatsApp template

Business-initiated WhatsApp messages must use an approved template. Create one
named `vaishnora_new_order`, category Utility, language English, body:

```
New paid order {{1}} for {{2}} from {{3}} ({{4}} items). Details are in your email.
```

The code fills the four placeholders with order ref, amount, customer name and
item count. A different name or language goes in `WHATSAPP_TEMPLATE_NAME` /
`WHATSAPP_TEMPLATE_LANG`.
