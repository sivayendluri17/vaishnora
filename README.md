# Vaishnora — Boutique Website

Luxury Indian ethnic wear boutique. Next.js 14 (App Router) + TypeScript, pure CSS (no Tailwind), zero extra runtime dependencies.

## Pages
| Route | Status | Notes |
|---|---|---|
| `/` | ✅ Ready | Landing page with brand logo, collections, story, launch signup |
| `/search` | ✅ Working stub | Live search + category filter over mock catalog (`lib/products.ts`) |
| `/product/[id]` | ✅ Working stub | Detail page with add-to-cart |
| `/cart` | ✅ Working | localStorage cart via React context |
| `/checkout` | 🔒 Protected | Requires sign-in (middleware). Demo order flow — no payments yet |
| `/login`, `/register` | ✅ Working | Email **or** phone + password |

## Auth
- Register/login with email or phone (`lib/auth.ts` normalizes both).
- Passwords hashed (SHA-256 + salt + secret), session = HMAC-signed token in an httpOnly cookie.
- `middleware.ts` protects `/checkout` (authorization example).
- ⚠️ Users are stored **in-memory** — resets on restart. Swap for PostgreSQL before launch.

## Run locally
```bash
npm install
cp .env.example .env.local   # set a long random AUTH_SECRET
npm run dev                  # http://localhost:3000
```

## Deploy (Vercel)
1. Push to GitHub
2. Import repo in Vercel
3. Add env var `AUTH_SECRET` (long random string)
4. Deploy

## Next steps (in order)
1. Replace gradient swatches with real product photos (`public/products/…`)
2. Move users + products to PostgreSQL (Neon free tier, or your RDS)
3. Add password reset + optionally OTP for phone signups (Twilio/MSG91)
4. Payments: Stripe (US) / Razorpay (India)
5. Buy the domain (vaishnora.com) and connect it in Vercel
