"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFingerprints = getUserFingerprints;
exports.getUserRelatedAccounts = getUserRelatedAccounts;
const models_1 = require("../models");
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
    const user = await models_1.User.findByPk(userId);
    if (!user) {
        throw new errors_1.ApiError(404, 'User not found');
    }
    const [authAccountRows, fingerprintRows] = await Promise.all([
        models_1.UserAuthAccount.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
        }),
        models_1.UserFingerprint.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
        }),
    ]);
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
            payload: fingerprint.payload,
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