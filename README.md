# Vaishnora

Luxury Indian ethnic wear boutique. npm-workspaces monorepo: two Next.js apps
(shoppers and admin) deployed independently on AWS Amplify, shared server code
in a core package, and two small observability services deployed as Lambdas.

```
apps/
  storefront/        Shopper UI + APIs: catalog, cart, checkout, accounts, auth.   https://<domain>
  admin/             Boutique management: catalog editing, uploads, metrics, alarms. https://admin.<domain>
packages/
  core/              @vaishnora/core   server code both apps import (auth, users, catalog, orders, S3, CloudWatch reads)
  ui/                @vaishnora/ui     design tokens, global stylesheet, self-hosted fonts
  shared-contracts/  @vaishnora/shared-contracts  metric + alarm types
  metrics/           @vaishnora/metrics   app metrics -> CloudWatch, Lambda ingest, infra/template.yaml
  alarmist/          @vaishnora/alarmist  rule evaluation -> SEV2/SEV3 SNS, scheduled Lambda, infra/template.yaml
infra/observability/ CloudFormation: native CloudWatch alarms, SNS topics, dashboard, uptime check
.github/workflows/   one path-filtered pipeline per package
```

Full layout, pipeline table and setup: [README-observability.md](README-observability.md).

## How the two apps fit together

- **One database, one core.** Both apps talk to the same Neon Postgres through
  `@vaishnora/core`. Admin writes the catalog, the storefront reads it.
- **One login.** Only the storefront has login/register. The admin app redirects
  unauthenticated visitors to `<storefront>/login?next=<admin url>` and the login
  page sends them back. In production both hosts share the session cookie via
  `COOKIE_DOMAIN=.vaishnora.shop`; on localhost ports share cookies automatically.
  The storefront's login validates `next` so it cannot be used as an open redirect.
- **Admin-ness is a database flag** (`users.is_admin`). A signed-in non-admin
  reaching the admin app sees `/forbidden`, not a login loop.
- **Cache refresh across apps.** After a catalog write, admin calls
  `<storefront>/api/revalidate` with `REVALIDATE_SECRET`; the storefront
  revalidates the home, shop grid and product page.

## Run locally

```bash
npm install                          # installs all workspaces, links @vaishnora/* packages
cp .env.example apps/storefront/.env.local   # fill in; see the per-app blocks in .env.example
cp .env.example apps/admin/.env.local        # AUTH_SECRET and REVALIDATE_SECRET must match the storefront
npm run dev          # storefront  http://localhost:3000
npm run dev:admin    # admin       http://localhost:3001  (separate terminal)
```

Other commands: `npm run typecheck`, `npm run build`, `npm run build:admin`,
`npm run test:packages`, `npm run bundle:packages`.

## Deploy

Each app is its own Amplify Hosting app pointed at this repo, with the
environment variable `AMPLIFY_MONOREPO_APP_ROOT` set to `apps/storefront` or
`apps/admin`. The root `amplify.yml` carries both build specs. Required
environment variables per app are listed in `.env.example`; in production also
set `COOKIE_DOMAIN`, the two `NEXT_PUBLIC_*_URL` values and `REVALIDATE_SECRET`.

Lambda packages deploy from GitHub Actions (`metrics.yml`, `alarmist.yml`) once
the AWS OIDC role secret exists; the native CloudWatch alarms deploy from the
console per `infra/observability/README.md`.

## Auth details

- Register/login with email or phone; `core/auth.ts` normalises both.
- Passwords: SHA-256 + salt + secret. Session: HMAC-signed token in an httpOnly cookie, 7 days.
- Password reset codes go out via SES (email) or SNS (SMS).
