"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const splits_1 = __importDefault(require("./routes/splits"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)({ origin: '*' }));
app.use(express_1.default.json());
// Rate limiting (simple in-memory)
const requestCounts = new Map();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60 * 1000; // 1 minute
app.use((req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const record = requestCounts.get(key);
    if (!record || now > record.resetAt) {
        requestCounts.set(key, { count: 1, resetAt: now + RATE_WINDOW });
        return next();
    }
    if (record.count >= RATE_LIMIT) {
        return res.status(429).json({ success: false, error: 'Rate limit exceeded. Try again in a minute.' });
    }
    record.count++;
    next();
});
// Routes
app.use('/', splits_1.default);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Not found — see /health' });
});
app.listen(PORT, () => {
    console.log(`\n🚀 RevSplit API running on http://localhost:${PORT}`);
    console.log(`📖 Health: GET /health`);
    console.log(`💸 Create split: POST /splits`);
    console.log(`📊 List splits: GET /splits`);
    console.log(`🔗 Payment link: POST /splits/:id/payment-link`);
    console.log(`📈 Analytics: GET /analytics`);
    console.log(`⚡ Simulate: POST /splits/:id/simulate\n`);
});
exports.default = app;
