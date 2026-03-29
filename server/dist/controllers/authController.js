"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const models_1 = require("../models");
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
    const existingUser = await models_1.User.findOne({
        where: { email },
        attributes: ['id'],
    });
    if (existingUser) {
        throw new errors_1.ApiError(409, 'User with this email already exists');
    }
    // Registration remains synchronous because the current API contract
    // returns the created fingerprint and cookie identifiers to the client.
    const user = await models_1.User.create({
        email,
        name: (0, http_1.normalizeOptionalString)(parsed.data.name) ?? null,
    });
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
    let user = null;
    if (parsed.data.userId) {
        user = await models_1.User.findByPk(parsed.data.userId);
    }
    else if (parsed.data.email) {
        user = await models_1.User.findOne({
            where: {
                email: (0, http_1.normalizeIdentifier)(parsed.data.email),
            },
        });
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