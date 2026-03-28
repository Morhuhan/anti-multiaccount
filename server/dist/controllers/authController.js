"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const db_1 = require("../lib/db");
const fingerprintIngestService_1 = require("../services/fingerprintIngestService");
const errors_1 = require("../utils/errors");
const http_1 = require("../utils/http");
const fingerprintSchemas_1 = require("../validation/fingerprintSchemas");
async function register(req, res) {
    const parsed = fingerprintSchemas_1.registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: 'Invalid register payload',
            details: parsed.error.flatten(),
        });
        return;
    }
    const email = (0, http_1.normalizeIdentifier)(parsed.data.email);
    if (!email) {
        throw new errors_1.ApiError(400, 'Email is required');
    }
    const [existingRows] = await db_1.db.query('SELECT id FROM `User` WHERE email = ? LIMIT 1', [email]);
    if (existingRows[0]) {
        throw new errors_1.ApiError(409, 'User with this email already exists');
    }
    const [insertResult] = await db_1.db.execute('INSERT INTO `User` (email, name, createdAt) VALUES (?, ?, NOW())', [email, (0, http_1.normalizeOptionalString)(parsed.data.name) ?? null]);
    const [userRows] = await db_1.db.query('SELECT id, email, name, createdAt FROM `User` WHERE id = ? LIMIT 1', [insertResult.insertId]);
    const user = userRows[0];
    if (!user) {
        throw new errors_1.ApiError(500, 'Failed to create user');
    }
    const fingerprintResult = await (0, fingerprintIngestService_1.ingestFingerprintEvent)({
        req,
        res,
        userId: user.id,
        eventType: parsed.data.fingerprintEvent.eventType,
        fingerprint: parsed.data.fingerprintEvent.fingerprint,
        context: parsed.data.fingerprintEvent.context,
        authAccount: parsed.data.fingerprintEvent.authAccount,
    });
    res.status(201).json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt.toISOString(),
        },
        fingerprint_id: fingerprintResult.fingerprintId,
        cookie_id: fingerprintResult.cookieId,
    });
}
async function login(req, res) {
    const parsed = fingerprintSchemas_1.loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: 'Invalid login payload',
            details: parsed.error.flatten(),
        });
        return;
    }
    let user;
    if (parsed.data.userId) {
        const [rows] = await db_1.db.query('SELECT id, email, name, createdAt FROM `User` WHERE id = ? LIMIT 1', [parsed.data.userId]);
        user = rows[0];
    }
    else if (parsed.data.email) {
        const [rows] = await db_1.db.query('SELECT id, email, name, createdAt FROM `User` WHERE email = ? LIMIT 1', [(0, http_1.normalizeIdentifier)(parsed.data.email)]);
        user = rows[0];
    }
    if (!user) {
        throw new errors_1.ApiError(404, 'User not found');
    }
    const fingerprintResult = await (0, fingerprintIngestService_1.ingestFingerprintEvent)({
        req,
        res,
        userId: user.id,
        eventType: parsed.data.fingerprintEvent.eventType,
        fingerprint: parsed.data.fingerprintEvent.fingerprint,
        context: parsed.data.fingerprintEvent.context,
        authAccount: parsed.data.fingerprintEvent.authAccount,
    });
    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt.toISOString(),
        },
        fingerprint_id: fingerprintResult.fingerprintId,
        cookie_id: fingerprintResult.cookieId,
    });
}
//# sourceMappingURL=authController.js.map