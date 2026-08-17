import { Router, Request, Response } from 'express';
import {
  createSplit, listSplits, getSplit, deleteSplit, toggleSplit,
  createStripePaymentLink, recordPayment, getAnalytics,
  getPayments, simulatePayment
} from '../services/store';
import { ApiResponse, CreateSplitBody } from '../types';

const router = Router();

// Health
router.get('/health', (_req: Request, res: Response) => {
  const r: ApiResponse = { success: true, message: 'RevSplit API is running. 💸' };
  res.json(r);
});

// Create a split config
router.post('/splits', (req: Request, res: Response) => {
  try {
    const body = req.body as CreateSplitBody;
    if (!body.name || !body.productName || !body.amount || !body.recipients) {
      const r: ApiResponse = { success: false, error: 'Missing required fields: name, productName, amount, recipients' };
      res.status(400).json(r);
      return;
    }
    const split = createSplit(body);
    const r: ApiResponse<typeof split> = { success: true, data: split, message: 'Split created successfully' };
    res.status(201).json(r);
  } catch (e: any) {
    const r: ApiResponse = { success: false, error: e.message };
    res.status(400).json(r);
  }
});

// List all splits
router.get('/splits', (_req: Request, res: Response) => {
  const splits = listSplits();
  const r: ApiResponse = { success: true, data: splits };
  res.json(r);
});

// Get single split
router.get('/splits/:id', (req: Request, res: Response) => {
  const split = getSplit((req.params.id as string));
  if (!split) {
    const r: ApiResponse = { success: false, error: 'Split not found' };
    res.status(404).json(r);
    return;
  }
  const r: ApiResponse = { success: true, data: split };
  res.json(r);
});

// Delete a split
router.delete('/splits/:id', (req: Request, res: Response) => {
  const deleted = deleteSplit((req.params.id as string));
  const r: ApiResponse = { success: deleted, error: deleted ? undefined : 'Not found' };
  res.status(deleted ? 200 : 404).json(r);
});

// Toggle split active/inactive
router.patch('/splits/:id/toggle', (req: Request, res: Response) => {
  const split = toggleSplit((req.params.id as string));
  if (!split) {
    const r: ApiResponse = { success: false, error: 'Split not found' };
    res.status(404).json(r);
    return;
  }
  const r: ApiResponse = { success: true, data: split, message: `Split is now ${split.active ? 'active' : 'inactive'}` };
  res.json(r);
});

// Create Stripe payment link for a split
router.post('/splits/:id/payment-link', async (req: Request, res: Response) => {
  try {
    const link = await createStripePaymentLink((req.params.id as string));
    const r: ApiResponse = { success: true, data: link, message: 'Payment link created' };
    res.status(201).json(r);
  } catch (e: any) {
    const r: ApiResponse = { success: false, error: e.message };
    res.status(400).json(r);
  }
});

// Record a payment (webhook endpoint)
router.post('/webhooks/stripe', (req: Request, res: Response) => {
  try {
    const { splitId, paymentIntentId, amount, currency, status } = req.body;
    if (!splitId) {
      const r: ApiResponse = { success: false, error: 'splitId required' };
      res.status(400).json(r);
      return;
    }
    const payment = recordPayment(splitId, {
      stripePaymentIntentId: paymentIntentId || `pi_${Date.now()}`,
      amount: amount || 0,
      currency: currency || 'usd',
      status: status || 'succeeded',
    });
    const r: ApiResponse = { success: true, data: payment, message: 'Payment recorded' };
    res.json(r);
  } catch (e: any) {
    const r: ApiResponse = { success: false, error: e.message };
    res.status(400).json(r);
  }
});

// Simulate a successful payment (test helper — no Stripe needed)
router.post('/splits/:id/simulate', (req: Request, res: Response) => {
  try {
    const payment = simulatePayment((req.params.id as string));
    const r: ApiResponse = { success: true, data: payment, message: 'Payment simulated — recipients credited' };
    res.status(201).json(r);
  } catch (e: any) {
    const r: ApiResponse = { success: false, error: e.message };
    res.status(400).json(r);
  }
});

// Get payments for a split
router.get('/splits/:id/payments', (req: Request, res: Response) => {
  const split = getSplit((req.params.id as string));
  if (!split) {
    const r: ApiResponse = { success: false, error: 'Split not found' };
    res.status(404).json(r);
    return;
  }
  const p = getPayments((req.params.id as string));
  const r: ApiResponse = { success: true, data: p };
  res.json(r);
});

// Analytics
router.get('/analytics', (req: Request, res: Response) => {
  const splitId = req.query.splitId as string | undefined;
  const stats = getAnalytics(splitId);
  const r: ApiResponse = { success: true, data: stats };
  res.json(r);
});

export default router;
