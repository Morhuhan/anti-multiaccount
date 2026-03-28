"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertAuthAccount = upsertAuthAccount;
exports.ingestFingerprintEvent = ingestFingerprintEvent;
const db_1 = require("../lib/db");
const errors_1 = require("../utils/errors");
const http_1 = require("../utils/http");
function normalizeLanguages(value) {
    if (!value) {
        return undefined;
    }
    const normalized = value
        .map((language) => (0, http_1.normalizeIdentifier)(language))
        .filter((language) => Boolean(language));
    return normalized.length > 0 ? normalized : undefined;
}
async function upsertAuthAccount(userId, authAccount) {
    if (!authAccount) {
        return;
    }
    const provider = (0, http_1.normalizeIdentifier)(authAccount.provider);
    const providerAccountId = (0, http_1.normalizeOptionalString)(authAccount.providerAccountId);
    if (!provider || !providerAccountId) {
        return;
    }
    const [existingRows] = await db_1.db.query('SELECT id, userId, provider, providerAccountId, createdAt FROM `UserAuthAccount` WHERE userId = ? AND provider = ? AND providerAccountId = ? LIMIT 1', [userId, provider, providerAccountId]);
    if (existingRows[0]) {
        return;
    }
    await db_1.db.execute('INSERT INTO `UserAuthAccount` (userId, provider, providerAccountId, createdAt) VALUES (?, ?, ?, NOW())', [userId, provider, providerAccountId]);
}
async function ingestFingerprintEvent(params) {
    const { req, res, userId, eventType, fingerprint, context, authAccount } = params;
    const [userRows] = await db_1.db.query('SELECT id FROM `User` WHERE id = ? LIMIT 1', [userId]);
    if (!userRows[0]) {
        throw new errors_1.ApiError(404, 'User not found');
    }
    const cookieId = (0, http_1.normalizeOptionalString)(context?.cookieId) ?? (0, http_1.ensureCookieId)(req, res);
    const ipPrimary = (0, http_1.getRequestIp)(req);
    const webglVendor = (0, http_1.normalizeOptionalString)(fingerprint.webglVendor);
    const webglRenderer = (0, http_1.normalizeOptionalString)(fingerprint.webglRenderer);
    const webglId = (0, http_1.buildWebglId)(webglVendor, webglRenderer);
    const userAgent = (0, http_1.normalizeOptionalString)(fingerprint.userAgent);
    const payload = JSON.stringify({
        fingerprint: {
            fHash: (0, http_1.normalizeOptionalString)(fingerprint.fHash) ?? null,
            canvasId: (0, http_1.normalizeOptionalString)(fingerprint.canvasId) ?? null,
            audioId: (0, http_1.normalizeOptionalString)(fingerprint.audioId) ?? null,
            webglVendor: webglVendor ?? null,
            webglRenderer: webglRenderer ?? null,
            webglId: webglId ?? null,
            userAgent: userAgent ?? null,
            screenResolution: (0, http_1.normalizeOptionalString)(fingerprint.screenResolution) ?? null,
            timezone: (0, http_1.normalizeOptionalString)(fingerprint.timezone) ?? null,
            languages: normalizeLanguages(fingerprint.languages) ?? null,
            battery: fingerprint.battery ?? null,
            deviceModel: (0, http_1.normalizeOptionalString)(fingerprint.deviceModel) ?? null,
        },
        context: {
            ipPrimary: ipPrimary ?? null,
            ipWebrtc: (0, http_1.normalizeOptionalString)(context?.ipWebrtc) ?? null,
            cookieId,
            affiliateId: (0, http_1.normalizeIdentifier)(context?.affiliateId) ?? null,
            registrationSpeedMs: context?.registrationSpeedMs ?? null,
            promoCode: (0, http_1.normalizeOptionalString)(context?.promoCode) ?? null,
        },
    });
    await upsertAuthAccount(userId, authAccount);
    const [result] = await db_1.db.execute('INSERT INTO `UserFingerprint` (userId, eventType, fHash, ipPrimary, ipWebrtc, canvasId, audioId, webglVendor, webglRenderer, webglId, cookieId, affiliateId, registrationSpeedMs, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())', [
        userId,
        eventType,
        (0, http_1.normalizeOptionalString)(fingerprint.fHash) ?? null,
        ipPrimary ?? null,
        (0, http_1.normalizeOptionalString)(context?.ipWebrtc) ?? null,
        (0, http_1.normalizeOptionalString)(fingerprint.canvasId) ?? null,
        (0, http_1.normalizeOptionalString)(fingerprint.audioId) ?? null,
        webglVendor ?? null,
        webglRenderer ?? null,
        webglId ?? null,
        cookieId,
        (0, http_1.normalizeIdentifier)(context?.affiliateId) ?? null,
        context?.registrationSpeedMs ?? null,
        payload,
    ]);
    return {
        fingerprintId: result.insertId,
        cookieId,
    };
}
//# sourceMappingURL=fingerprintIngestService.js.map