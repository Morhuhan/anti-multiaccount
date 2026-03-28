"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFingerprints = getUserFingerprints;
exports.getUserRelatedAccounts = getUserRelatedAccounts;
const db_1 = require("../lib/db");
const relatedAccountsService_1 = require("../services/relatedAccountsService");
const errors_1 = require("../utils/errors");
function parseUserId(value) {
    if (typeof value !== 'string') {
        throw new errors_1.ApiError(400, 'Invalid user id');
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new errors_1.ApiError(400, 'Invalid user id');
    }
    return parsed;
}
async function getUserFingerprints(req, res) {
    const userId = parseUserId(req.params.userId);
    const [userRows] = await db_1.db.query('SELECT id, email, name, createdAt FROM `User` WHERE id = ? LIMIT 1', [userId]);
    const user = userRows[0];
    if (!user) {
        throw new errors_1.ApiError(404, 'User not found');
    }
    const [authAccountRows] = await db_1.db.query('SELECT id, userId, provider, providerAccountId, createdAt FROM `UserAuthAccount` WHERE userId = ? ORDER BY createdAt DESC', [userId]);
    const [fingerprintRows] = await db_1.db.query('SELECT id, userId, eventType, fHash, ipPrimary, ipWebrtc, canvasId, audioId, webglVendor, webglRenderer, webglId, cookieId, affiliateId, registrationSpeedMs, payload, createdAt FROM `UserFingerprint` WHERE userId = ? ORDER BY createdAt DESC', [userId]);
    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt.toISOString(),
        },
        authAccounts: authAccountRows.map((account) => ({
            id: account.id,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            createdAt: account.createdAt.toISOString(),
        })),
        fingerprints: fingerprintRows.map((fingerprint) => ({
            id: fingerprint.id,
            eventType: fingerprint.eventType,
            fHash: fingerprint.fHash,
            ipPrimary: fingerprint.ipPrimary,
            ipWebrtc: fingerprint.ipWebrtc,
            canvasId: fingerprint.canvasId,
            audioId: fingerprint.audioId,
            webglVendor: fingerprint.webglVendor,
            webglRenderer: fingerprint.webglRenderer,
            webglId: fingerprint.webglId,
            cookieId: fingerprint.cookieId,
            affiliateId: fingerprint.affiliateId,
            registrationSpeedMs: fingerprint.registrationSpeedMs,
            payload: typeof fingerprint.payload === 'string'
                ? JSON.parse(fingerprint.payload)
                : fingerprint.payload,
            createdAt: fingerprint.createdAt.toISOString(),
        })),
    });
}
async function getUserRelatedAccounts(req, res) {
    const userId = parseUserId(req.params.userId);
    const relatedAccounts = await (0, relatedAccountsService_1.getRelatedAccounts)(userId);
    res.json(relatedAccounts);
}
//# sourceMappingURL=userController.js.map