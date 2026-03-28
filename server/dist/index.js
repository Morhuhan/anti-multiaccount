"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const zod_1 = require("zod");
const db_1 = require("./lib/db");
const routes_1 = require("./routes");
const errors_1 = require("./utils/errors");
const app = (0, express_1.default)();
const port = Number.parseInt(process.env.PORT ?? '4000', 10);
const corsOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
app.use((0, cors_1.default)({
    origin: corsOrigin,
    credentials: true,
}));
app.use((0, helmet_1.default)());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '1mb' }));
app.get('/health', async (_req, res) => {
    await db_1.db.query('SELECT 1');
    res.json({ status: 'ok' });
});
app.use('/api', routes_1.apiRouter);
app.use((error, _req, res, _next) => {
    if (error instanceof errors_1.ApiError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
    }
    if (error instanceof zod_1.ZodError) {
        res.status(400).json({
            error: 'Validation failed',
            details: error.flatten(),
        });
        return;
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
});
app.listen(port, () => {
    console.log(`Anti-multiaccount server listening on port ${port}`);
});
//# sourceMappingURL=index.js.map