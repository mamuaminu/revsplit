# RevSplit — Revenue Splitter API

> Split Stripe payments between multiple recipients automatically. Built for platforms, marketplaces, and indie hackers who need to divide revenue in real-time.

## What it does

RevSplit lets you:
- **Create split configs** — define a product, amount, currency, and list of recipients with percentages
- **Generate payment links** — create Stripe Payment Links directly from a split config
- **Record payments** — webhook endpoint receives payment events and credits recipients
- **Track analytics** — total revenue, success rate, per-recipient earnings
- **Simulate payments** — test the full flow without Stripe (great for demos)

## Quick Start

```bash
npm install
cp .env.example .env   # optionally add STRIPE_SECRET_KEY
npm run build
npm start
```

API runs on `http://localhost:3000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/splits` | Create a split config |
| `GET` | `/splits` | List all splits |
| `GET` | `/splits/:id` | Get a single split |
| `DELETE` | `/splits/:id` | Delete a split |
| `PATCH` | `/splits/:id/toggle` | Activate/deactivate a split |
| `POST` | `/splits/:id/payment-link` | Generate Stripe Payment Link |
| `GET` | `/splits/:id/payments` | List payments for a split |
| `POST` | `/splits/:id/simulate` | Simulate a payment (no Stripe needed) |
| `POST` | `/webhooks/stripe` | Receive Stripe webhook events |
| `GET` | `/analytics` | Aggregate analytics (optional `?splitId=`) |

## Create a Split

```bash
curl -X POST http://localhost:3000/splits \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SaaS Course Revenue Split",
    "productName": "Advanced React Course",
    "amount": 4900,
    "currency": "usd",
    "recipients": [
      { "email": "instructor@example.com", "name": "John", "percentage": 70 },
      { "email": "platform@revsplit.com", "percentage": 20 },
      { "email": "affiliate@partner.com", "percentage": 10 }
    ]
  }'
```

## Revenue Model

**Freemium:**
- Free: 5 splits, 50 payments/month
- Pro ($9/mo): 25 splits, unlimited payments, webhook support, analytics
- Business ($29/mo): Unlimited splits, priority support, custom domains

**Open-source:** Self-host free. Hosted version = recurring revenue.

## Tech Stack

- **Node.js** + **Express** + **TypeScript**
- **Stripe SDK** for payment link generation
- In-memory store (swap for Redis/Postgres in production)
- Self-contained — no external DB required for MVP

## Deploy

```bash
# Docker
docker build -t revsplit .
docker run -p 3000:3000 revsplit

# PM2
pm2 start dist/app.js --name revsplit
```

## License

MIT
