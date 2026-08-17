import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import {
  SplitConfig, Recipient, PaymentRecord,
  AnalyticsSummary, CreateSplitBody, RecipientPayout
} from '../types';

// In-memory store
const splits = new Map<string, SplitConfig>();
const payments = new Map<string, PaymentRecord[]>();
const recipients = new Map<string, Recipient[]>();

// Stripe client (mock if no key)
let stripe: Stripe | null = null;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';

if (STRIPE_KEY && STRIPE_KEY.startsWith('sk_')) {
  stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' as any });
}

// ──────────────────────────────────────────────
// Split Config CRUD
// ──────────────────────────────────────────────

export function createSplit(body: CreateSplitBody): SplitConfig {
  if (body.recipients.length === 0) throw new Error('At least one recipient required');
  const total = body.recipients.reduce((sum, r) => sum + (r.percentage || 0), 0);
  if (total !== 100) throw new Error(`Recipient percentages must sum to 100 (got ${total})`);
  if (body.amount <= 0) throw new Error('Amount must be positive');

  const id = `split_${uuidv4().slice(0, 12)}`;
  const now = new Date().toISOString();

  const recs: Recipient[] = body.recipients.map(r => ({
    ...r,
    id: `recip_${uuidv4().slice(0, 8)}`
  }));

  const split: SplitConfig = {
    id,
    name: body.name,
    description: body.description,
    productName: body.productName,
    amount: body.amount,
    currency: body.currency || 'usd',
    recipients: recs,
    webhookUrl: body.webhookUrl,
    createdAt: now,
    updatedAt: now,
    active: true,
  };

  splits.set(id, split);
  recipients.set(id, recs);
  payments.set(id, []);
  return split;
}

export function listSplits(): SplitConfig[] {
  return Array.from(splits.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getSplit(id: string): SplitConfig | null {
  return splits.get(id) || null;
}

export function deleteSplit(id: string): boolean {
  return splits.delete(id);
}

export function toggleSplit(id: string): SplitConfig | null {
  const split = splits.get(id);
  if (!split) return null;
  split.active = !split.active;
  split.updatedAt = new Date().toISOString();
  splits.set(id, split);
  return split;
}

// ──────────────────────────────────────────────
// Stripe Integration
// ──────────────────────────────────────────────

export async function createStripePaymentLink(splitId: string): Promise<{ url: string; id: string }> {
  const split = splits.get(splitId);
  if (!split) throw new Error('Split not found');

  if (!stripe) {
    // Mock mode — return a fake link
    const fakeId = `plink_${uuidv4().slice(0, 16)}`;
    const fakeUrl = `https://buy.stripe.com/mock/${fakeId}`;
    split.stripePaymentLinkId = fakeId;
    split.updatedAt = new Date().toISOString();
    splits.set(splitId, split);
    return { url: fakeUrl, id: fakeId };
  }

  // Create Price
  const price = await stripe.prices.create({
    unit_amount: split.amount,
    currency: split.currency,
    product_data: { name: split.productName },
  });

  // Create Payment Link
  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    after_completion: { type: 'hosted_confirmation' },
  });

  split.stripePriceId = price.id;
  split.stripePaymentLinkId = link.id;
  split.updatedAt = new Date().toISOString();
  splits.set(splitId, split);

  return { url: link.url!, id: link.id };
}

// ──────────────────────────────────────────────
// Record a payment (webhook / manual simulation)
// ──────────────────────────────────────────────

export function recordPayment(splitId: string, data: {
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: PaymentRecord['status'];
}): PaymentRecord {
  const split = splits.get(splitId);
  if (!split) throw new Error('Split not found');

  const recPayouts: RecipientPayout[] = split.recipients.map(r => {
    const amount = r.fixedAmount
      ? r.fixedAmount
      : Math.floor((data.amount * r.percentage) / 100);
    return {
      recipientId: r.id,
      email: r.email,
      amount,
      status: 'pending',
    };
  });

  const record: PaymentRecord = {
    id: `pay_${uuidv4().slice(0, 12)}`,
    splitConfigId: splitId,
    stripePaymentIntentId: data.stripePaymentIntentId,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    recipientPayouts: recPayouts,
    createdAt: new Date().toISOString(),
  };

  const existing = payments.get(splitId) || [];
  existing.push(record);
  payments.set(splitId, existing);

  return record;
}

// ──────────────────────────────────────────────
// Analytics
// ──────────────────────────────────────────────

export function getAnalytics(splitId?: string): AnalyticsSummary {
  const targetSplits = splitId
    ? [splits.get(splitId)].filter(Boolean) as SplitConfig[]
    : Array.from(splits.values());

  let totalRevenue = 0;
  let totalPayments = 0;
  let succeededPayments = 0;
  const byRecipient: AnalyticsSummary['byRecipient'] = {};

  for (const s of targetSplits) {
    const recs = recipients.get(s.id) || [];
    for (const r of recs) {
      if (!byRecipient[r.id]) {
        byRecipient[r.id] = { totalPaid: 0, pending: 0, payments: 0 };
      }
    }

    const ps = payments.get(s.id) || [];
    for (const p of ps) {
      totalPayments++;
      if (p.status === 'succeeded') {
        succeededPayments++;
        totalRevenue += p.amount;
        for (const rp of p.recipientPayouts) {
          if (!byRecipient[rp.recipientId]) {
            byRecipient[rp.recipientId] = { totalPaid: 0, pending: 0, payments: 0 };
          }
          if (rp.status === 'paid') {
            byRecipient[rp.recipientId].totalPaid += rp.amount;
          } else if (rp.status === 'pending') {
            byRecipient[rp.recipientId].pending += rp.amount;
          }
          byRecipient[rp.recipientId].payments++;
        }
      }
    }
  }

  return {
    totalRevenue,
    totalPayments,
    successRate: totalPayments > 0 ? Math.round((succeededPayments / totalPayments) * 100) : 0,
    byRecipient,
  };
}

// ──────────────────────────────────────────────
// Simulate webhook for testing (no real Stripe needed)
// ──────────────────────────────────────────────

export function simulatePayment(splitId: string): PaymentRecord {
  const split = splits.get(splitId);
  if (!split) throw new Error('Split not found');

  return recordPayment(splitId, {
    stripePaymentIntentId: `pi_mock_${uuidv4().slice(0, 12)}`,
    amount: split.amount,
    currency: split.currency,
    status: 'succeeded',
  });
}

export function getPayments(splitId: string): PaymentRecord[] {
  return payments.get(splitId) || [];
}
