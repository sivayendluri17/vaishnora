# Repository layout and pipelines

This repo is an npm workspace. Each package is isolated by **use**: changing one
builds, tests and deploys only that one. The single root `package-lock.json` is
the shared version set, so every package resolves the same dependency versions;
force a pin for everyone with root `overrides`.

```
apps/
├── storefront/            @vaishnora/storefront  shopper UI + APIs. Amplify app #1 (AMPLIFY_MONOREPO_APP_ROOT=apps/storefront)
├── admin/                 @vaishnora/admin       catalog editing, uploads, /admin/metrics, /admin/alarms. Amplify app #2 (…=apps/admin)
├── metrics-dashboard/     mock UI (sample data) - superseded by /admin/metrics; safe to delete
└── alarms-dashboard/      mock UI (sample data) - superseded by /admin/alarms; safe to delete
packages/
├── core/                  @vaishnora/core              auth, users, catalog, orders, addresses, S3, notify, CloudWatch reads, urls, revalidate
├── ui/                    @vaishnora/ui                globals.css + fonts (brand tokens)
├── shared-contracts/      @vaishnora/shared-contracts  types shared by metrics + alarmist (no runtime deps)
├── metrics/               @vaishnora/metrics           record app metrics -> CloudWatch; Lambda ingest; infra/template.yaml
└── alarmist/              @vaishnora/alarmist          evaluate rules -> SEV2/SEV3 SNS; scheduled Lambda; infra/template.yaml
infra/observability/       CloudFormation: native CloudWatch alarms, SNS topics, dashboard, uptime check
.github/workflows/         storefront.yml, admin.yml, metrics.yml, alarmist.yml (all path-filtered)
amplify.yml                monorepo build spec: one block per Amplify app
```

| Change touches | Pipeline that runs | Deploys |
|---|---|---|
| `apps/storefront/**` | `storefront.yml` (typecheck + build gate) then Amplify app #1 | storefront |
| `apps/admin/**` | `admin.yml` then Amplify app #2 | admin |
| `packages/core/**`, `packages/ui/**` | both app gates; both Amplify apps rebuild | storefront + admin |
| `packages/metrics/**` | `metrics.yml` | `vaishnora-metrics` stack |
| `packages/alarmist/**` | `alarmist.yml` | `vaishnora-alarmist` stack |
| `packages/shared-contracts/**` | `metrics.yml` + `alarmist.yml` | both stacks |
| `infra/observability/**` | none yet (deploy by hand from the console) | native alarms |

Amplify rebuilds an app on any push to the branch. To make each Amplify app
rebuild only when its own files change, set `AMPLIFY_DIFF_DEPLOY=true` on both
apps; with `AMPLIFY_MONOREPO_APP_ROOT` set, Amplify diffs that app root. Note
this will NOT pick up changes under `packages/core` or `packages/ui`, so leave
diff-deploy off until you are comfortable triggering manual redeploys after a
shared-package change, or add `AMPLIFY_DIFF_DEPLOY_ROOT` paths as Amplify allows.

## Commands

```bash
npm install                      # installs root + all workspaces, links @vaishnora/* packages
npm run dev / npm run dev:admin  # storefront :3000, admin :3001
npm run typecheck                # both apps
npm run build / build:admin      # Next.js builds
npm run build:packages           # shared-contracts, then metrics + alarmist (tsc)
npm run test:packages            # node:test for metrics + alarmist
npm run bundle:packages          # esbuild Lambda bundles -> packages/*/dist/lambda/handler.mjs
```

## Monitoring layers

| Layer | What | Where defined |
|---|---|---|
| Infrastructure | 5xx rate, uptime, CDN latency, Web Vitals, JS errors | `infra/observability/*.yaml` (native CloudWatch alarms, no code) |
| Application | checkout failures, order API p95, anything the code counts | `@vaishnora/metrics` emits, `@vaishnora/alarmist` evaluates |
| Viewing | `/admin/metrics`, `/admin/alarms` (admin app), CloudWatch dashboard `vaishnora-prod` | `packages/core/src/cloudwatch.ts`, `apps/admin/app/admin/{metrics,alarms}` |

## Cross-app contracts (storefront <-> admin)

| Concern | Mechanism | Config |
|---|---|---|
| Login | admin middleware redirects to `<storefront>/login?next=<admin url>`; login validates `next` against both origins | `NEXT_PUBLIC_STOREFRONT_URL`, `NEXT_PUBLIC_ADMIN_URL` |
| Shared session | same `AUTH_SECRET`; cookie `Domain` from `COOKIE_DOMAIN` in prod | `AUTH_SECRET` (identical), `COOKIE_DOMAIN=.vaishnora.shop` |
| Not an admin | `users.is_admin` checked per page; non-admins land on admin `/forbidden` | — |
| Cache refresh | admin POSTs `<storefront>/api/revalidate` with a shared secret after catalog writes | `REVALIDATE_SECRET` (identical), `STOREFRONT_URL` on admin |

## Pipeline setup (one time, GitHub repo settings)

1. Create an IAM role with an OIDC trust for `repo:sivayendluri17/vaishnora:*` and
   permissions for CloudFormation, Lambda, IAM (role create for the stacks), S3
   (artifact bucket), Events, Logs and CloudWatch alarms.
2. Secrets: `AWS_DEPLOY_ROLE_ARN`, `METRICS_INGEST_TOKEN`.
3. Variables: `AWS_REGION`, `ARTIFACT_BUCKET`, `SEV2_TOPIC_ARN`, `SEV3_TOPIC_ARN`
   (the two ARNs are outputs of the `vaishnora-observability` stack).
4. Until the secrets exist, the Lambda workflows still build and test on every PR
   and simply skip the deploy job. The two app workflows never deploy; Amplify does.

## Amplify setup for the split (one time)

1. Existing Amplify app (storefront): add env var `AMPLIFY_MONOREPO_APP_ROOT=apps/storefront`,
   plus `COOKIE_DOMAIN`, `REVALIDATE_SECRET`, `NEXT_PUBLIC_STOREFRONT_URL`, `NEXT_PUBLIC_ADMIN_URL`. Redeploy.
2. New Amplify app (admin): connect the same repo and branch, set
   `AMPLIFY_MONOREPO_APP_ROOT=apps/admin`, copy the admin block of `.env.example`
   (same `AUTH_SECRET` and `REVALIDATE_SECRET` as the storefront), attach the
   `vaishnora-observability-read` policy to its compute role, and add the
   `admin.<domain>` custom domain.
3. Verify: open `admin.<domain>` signed out, you should land on the storefront
   login and return to admin after signing in with an `is_admin` account.
