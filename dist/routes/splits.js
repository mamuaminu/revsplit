"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../services/store");
const router = (0, express_1.Router)();
// Health
router.get('/health', (_req, res) => {
    const r = { success: true, message: 'RevSplit API is running. 💸' };
    res.json(r);
});
// Create a split config
router.post('/splits', (req, res) => {
    try {
        const body = req.body;
        if (!body.name || !body.productName || !body.amount || !body.recipients) {
            const r = { success: false, error: 'Missing required fields: name, productName, amount, recipients' };
            res.status(400).json(r);
            return;
        }
        const split = (0, store_1.createSplit)(body);
        const r = { success: true, data: split, message: 'Split created successfully' };
        res.status(201).json(r);
    }
    catch (e) {
        const r = { success: false, error: e.message };
        res.status(400).json(r);
    }
});
// List all splits
router.get('/splits', (_req, res) => {
    const splits = (0, store_1.listSplits)();
    const r = { success: true, data: splits };
    res.json(r);
});
// Get single split
router.get('/splits/:id', (req, res) => {
    const split = (0, store_1.getSplit)(req.params.id);
    if (!split) {
        const r = { success: false, error: 'Split not found' };
        res.status(404).json(r);
        return;
    }
    const r = { success: true, data: split };
    res.json(r);
});
// Delete a split
router.delete('/splits/:id', (req, res) => {
    const deleted = (0, store_1.deleteSplit)(req.params.id);
    const r = { success: deleted, error: deleted ? undefined : 'Not found' };
    res.status(deleted ? 200 : 404).json(r);
});
// Toggle split active/inactive
router.patch('/splits/:id/toggle', (req, res) => {
    const split = (0, store_1.toggleSplit)(req.params.id);
    if (!split) {
        const r = { success: false, error: 'Split not found' };
        res.status(404).json(r);
        return;
    }
    const r = { success: true, data: split, message: `Split is now ${split.active ? 'active' : 'inactive'}` };
    res.json(r);
});
// Create Stripe payment link for a split
router.post('/splits/:id/payment-link', async (req, res) => {
    try {
        const link = await (0, store_1.createStripePaymentLink)(req.params.id);
        const r = { success: true, data: link, message: 'Payment link created' };
        res.status(201).json(r);
    }
    catch (e) {
        const r = { success: false, error: e.message };
        res.status(400).json(r);
    }
});
// Record a payment (webhook endpoint)
router.post('/webhooks/stripe', (req, res) => {
    try {
        const { splitId, paymentIntentId, amount, currency, status } = req.body;
        if (!splitId) {
            const r = { success: false, error: 'splitId required' };
            res.status(400).json(r);
            return;
        }
        const payment = (0, store_1.recordPayment)(splitId, {
            stripePaymentIntentId: paymentIntentId || `pi_${Date.now()}`,
            amount: amount || 0,
            currency: currency || 'usd',
            status: status || 'succeeded',
        });
        const r = { success: true, data: payment, message: 'Payment recorded' };
        res.json(r);
    }
    catch (e) {
        const r = { success: false, error: e.message };
        res.status(400).json(r);
    }
});
// Simulate a successful payment (test helper — no Stripe needed)
router.post('/splits/:id/simulate', (req, res) => {
    try {
        const payment = (0, store_1.simulatePayment)(req.params.id);
        const r = { success: true, data: payment, message: 'Payment simulated — recipients credited' };
        res.status(201).json(r);
    }
    catch (e) {
        const r = { success: false, error: e.message };
        res.status(400).json(r);
    }
});
// Get payments for a split
router.get('/splits/:id/payments', (req, res) => {
    const split = (0, store_1.getSplit)(req.params.id);
    if (!split) {
        const r = { success: false, error: 'Split not found' };
        res.status(404).json(r);
        return;
    }
    const p = (0, store_1.getPayments)(req.params.id);
    const r = { success: true, data: p };
    res.json(r);
});
// Analytics
router.get('/analytics', (req, res) => {
    const splitId = req.query.splitId;
    const stats = (0, store_1.getAnalytics)(splitId);
    const r = { success: true, data: stats };
    res.json(r);
});
exports.default = router;
