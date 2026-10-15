# Stripe Setup — JUM PRO ($5/month)

The checkout at `/pro/checkout` runs in **demo mode** today: every button is
tappable, the card form validates (Luhn, expiry, CVC), wallets open the
"you're on the list" sheet — nothing breaks and nothing is charged.
Activation is three console steps, then paste-and-go.

## 1. Product + price

1. dashboard.stripe.com → **Product catalog → + Add product**
2. Name: **JUM PRO** → pricing: **$5 / month** (recurring) → **Save**
3. Copy the **Price ID** (`price_…`) — that's `STRIPE_FOOTBALL_PRICE_ID`

## 2. Webhook endpoint

1. **Developers → Webhooks → + Add endpoint**
2. Endpoint URL: `https://YOUR_DOMAIN/api/webhooks/stripe/`
3. Subscribe to events: `invoice.payment_succeeded`,
   `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the endpoint's **Signing secret** (`whsec_…`) — that's
   `STRIPE_WEBHOOK_SECRET`
5. The handler is signature-verified, idempotent (records the event id), and
   writes `users/{uid}/pro.active` via the service account — so the PRO badge
   appears on every screen within seconds of payment. Without the secret the
   endpoint returns 200 and does nothing (demo mode).

## 3. Keys

1. **Developers → API keys** → copy the **Publishable key** (`pk_live_…` or
   `pk_test_…` while testing) and the **Secret key** (`sk_…`)
2. Fill in `.env.local`:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_FOOTBALL_PRICE_ID=price_...
```

3. `npm run build`, restart the server. That's it.

## Testing with test keys

- Card `4242 4242 4242 4242`, any future expiry, any CVC/ZIP → full loop
  completes and lands on `/pro/success/`
- Wallets: PaymentRequest Apple Pay needs a real Apple Pay device (Safari);
  Google Pay needs Chrome/Android with a card on file — the button only
  renders when `canMakePayment()` confirms, never a broken mount
- Empty or removed keys → every route fails closed back into demo mode
  (`/api/checkout/intent` returns `{ demo: true }`)

## Safety notes

- `sk_…` is read only in `/app/api/*` routes (grep-checked); the publishable
  key is the only Stripe value baked into the client bundle
- `.env.local` is gitignored (`.env*.local`)
- Subscriptions are created with `payment_behavior: default_incomplete` and
  the first invoice's PaymentIntent drives the Element — no trial, no
  surprises, cancel-anytime is honored by `customer.subscription.deleted`
