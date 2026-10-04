# Vaishnora production monitoring

Metrics, SEV2/SEV3 alarms and notifications all live in **CloudWatch**, not in the
Next.js app. That way alarms keep firing and the dashboard keeps working even
when the storefront itself is down. The app only *reads* CloudWatch to show the
same data at `/admin/metrics` and `/admin/alarms`.

```
Shoppers' browsers ──RUM──┐                 ┌─▶ SNS vaishnora-sev2 ─▶ email + SMS
Amplify Hosting CDN ──────┼─▶ CloudWatch ───┼─▶ SNS vaishnora-sev3 ─▶ email
Route 53 health check ────┘   alarms +      └─▶ dashboard "vaishnora-prod"
                              dashboard            ▲
                                                   └── /admin/metrics, /admin/alarms (read-only)
```

## What you get

| Severity | Alarm | Fires when | Notified via |
|---|---|---|---|
| **SEV2** | `site-down` (us-east-1 stack) | Site fails HTTPS probes from several regions for ~2 min | email + SMS |
| **SEV2** | `site-5xx-error-rate` | >5% of CDN requests are 5xx for 10 min (needs ≥20 req / 5 min) | email + SMS |
| **SEV2** | `browser-http-5xx` | Shoppers' browsers log >5 HTTP 5xx per 5 min for 10 min | email + SMS |
| **SEV2** | `js-error-spike` | >50 JS errors per 5 min for 10 min (usually a bad deploy) | email + SMS |
| **SEV3** | `js-errors-elevated` | >10 JS errors in 15 min | email |
| **SEV3** | `site-4xx-error-rate` | >25% of requests are 4xx for 30 min (needs ≥50 req) | email |
| **SEV3** | `cdn-latency-p95` | CDN time-to-first-byte p95 above threshold for 15 min | email |
| **SEV3** | `lcp-p75-poor` | Largest Contentful Paint p75 > 4 s over an hour | email |

Every alarm also sends an **OK** notification when it recovers.

Dashboard `vaishnora-prod`: alarm status strip, requests, 4xx/5xx, TTFB p50/p95/p99,
sessions, JS errors, browser HTTP errors, LCP / FID / CLS / page-load p75.

## Deploy (about 15 minutes, all in the AWS console)

### 0. Collect three values

| Value | Where |
|---|---|
| **Amplify App ID** | Amplify console → your app → *App settings → General* → App ID (looks like `d1a2b3c4d5e6f7`) |
| **RUM app monitor name** | CloudWatch console → *Application Signals → RUM* → the monitor's **name** (not the GUID in `RumMonitor.tsx`) |
| **Storefront host** | e.g. `vaishnora.shop` or `www.vaishnora.shop`, whichever actually serves the site |

### 1. Main stack — region **us-west-2**

1. CloudFormation → *Create stack → With new resources* → *Upload a template file* → `vaishnora-observability.yaml`.
2. Stack name: `vaishnora-observability`.
3. Parameters: `AmplifyAppId`, `RumAppMonitorName`, `Sev2Email`, optional `Sev2PhoneNumber` (E.164, e.g. `+14085551234`), optional `Sev3Email`.
4. Tick *I acknowledge that AWS CloudFormation might create IAM resources with custom names* (it creates one read-only managed policy).
5. Create. Takes ~1 minute.

### 2. Uptime stack — region **us-east-1** (required: Route 53 health-check metrics only exist there)

1. Switch the console region to **N. Virginia (us-east-1)**.
2. CloudFormation → *Create stack* → upload `vaishnora-uptime-us-east-1.yaml`.
3. Stack name: `vaishnora-uptime`. Parameters: `SiteHostName`, `Sev2Email`, optional `Sev2PhoneNumber`.

### 3. Confirm the subscriptions

AWS emails each address a *"AWS Notification - Subscription Confirmation"* message.
**Click Confirm in each one** or you will never receive alarms. There will be one
per topic: `vaishnora-sev2`, `vaishnora-sev3`, `vaishnora-sev2-uptime`.

SMS: a new AWS account is in the **SNS SMS sandbox** and can only text verified
numbers. Either verify your number under *SNS → Text messaging (SMS) → Sandbox
destination phone numbers*, or request production access there. SMS also needs
a spend quota above $0 (default $1/month is enough for alarms).

### 4. Let the app read CloudWatch

The stack output `ObservabilityReadPolicyArn` is a managed policy named
`vaishnora-observability-read`. Attach it:

- **Production:** IAM → Roles → the Amplify compute/SSR service role for this app
  (Amplify console → *App settings → IAM roles* shows its name) → *Add permissions → Attach policies*.
- **Local dev:** IAM → Users → `vaishnora-local-dev` → attach the same policy.

Then in Amplify → *Hosting → Environment variables* add:

```
AMPLIFY_APP_ID=<same as the stack parameter>
RUM_APP_MONITOR_NAME=<same as the stack parameter>
```

and redeploy (`amplify.yml` already copies them into `.env.production`). Put the
same two lines in `.env.local` for `npm run dev`.

### 5. Test it

- Open `/admin/alarms`: all alarms should show **OK** or **NO DATA** (new RUM metrics take a few minutes).
- Force a test notification: CloudWatch → Alarms → `vaishnora-SEV3-js-errors-elevated` → *Actions → Set alarm state → ALARM*. You should get the email within a minute. Set it back to OK (or wait, it self-corrects on the next evaluation).

## Day-to-day

- **Viewing metrics:** `/admin/metrics` (quick glance, 1h/24h/7d) or the CloudWatch
  dashboard link at the top of that page for full charts. The **AWS Console Mobile
  App** shows the same dashboard and alarms on your phone.
- **Tuning thresholds:** CloudFormation → stack → *Update* → *Use current template* →
  change `LatencyP95Threshold`, or edit the YAML and upload again. Edit the YAML
  rather than the console so the repo stays the source of truth.
- **Adding an alarm:** copy any `AWS::CloudWatch::Alarm` block, give it a
  `vaishnora-SEV2-…` or `vaishnora-SEV3-…` name, point it at the matching topic,
  and add its `.Arn` to the dashboard's alarm widget. The admin page picks it up
  automatically by name prefix.

## Known caveats

- **Latency unit.** Amplify Hosting's `Latency` metric unit is not documented
  consistently. After the first hour, open the TTFB widget and check the axis.
  If it reads in seconds, update `LatencyP95Threshold` to `3` instead of `3000`.
- **Low traffic.** Error-rate alarms deliberately ignore windows with fewer than
  20 (SEV2) or 50 (SEV3) requests so one bot hitting a 404 does not page you.
  Raw-count alarms (JS errors, browser 5xx) still fire at any traffic level.
- **JS errors are noisy** on real browsers (extensions, old Safari). If the SEV3
  JS alarm fires without a real cause, raise its threshold or add a RUM
  extended-metric filter; the SEV2 spike alarm at 50 is the one that matters.
- **Cost.** Roughly: 8 alarms ≈ $0.80/month, dashboard free (first 3), Route 53
  HTTPS health check ≈ $1–2/month, SNS email free, SMS a few cents per message.

## Files

- `vaishnora-observability.yaml` — SNS topics, 7 alarms, dashboard, read policy (us-west-2)
- `vaishnora-uptime-us-east-1.yaml` — Route 53 health check + site-down alarm (us-east-1)
- `../../packages/core/src/cloudwatch.ts` — read helpers used by the admin pages
- `../../apps/admin/app/admin/metrics/page.tsx`, `../../apps/admin/app/admin/alarms/page.tsx`
