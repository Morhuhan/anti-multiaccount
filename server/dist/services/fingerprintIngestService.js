"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertAuthAccount = upsertAuthAccount;
exports.ingestFingerprintEvent = ingestFingerprintEvent;
const models_1 = require("../models");
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
    const existingAuthAccount = await models_1.UserAuthAccount.findOne({
        where: {
            userId,
            provider,
            providerAccountId,
        },
        attributes: ['id'],
    });
    if (existingAuthAccount) {
        return;
    }
    // We only persist a provider link once per user to keep related-account
    // detection deterministic and avoid duplicate evidence.
    await models_1.UserAuthAccount.create({
        userId,
        provider,
        providerAccountId,
    });
}
async function ingestFingerprintEvent(params) {
    const { req, res, userId, eventType, fingerprint, context, authAccount } = params;
    const user = await models_1.User.findByPk(userId, {
        attributes: ['id'],
    });
    if (!user) {
        throw new errors_1.ApiError(404, 'User not found');
    }
    const cookieId = (0, http_1.normalizeOptionalString)(context?.cookieId) ?? (0, http_1.ensureCookieId)(req, res);
    const ipPrimary = (0, http_1.getRequestIp)(req);
    const webglVendor = (0, http_1.normalizeOptionalString)(fingerprint.webglVendor);
    const webglRenderer = (0, http_1.normalizeOptionalString)(fingerprint.webglRenderer);
    const webglId = (0, http_1.buildWebglId)(webglVendor, webglRenderer);
    const userAgent = (0, http_1.normalizeOptionalString)(fingerprint.userAgent);
    // We keep the full normalized payload in JSON so later heuristics can be extended
    // without changing the narrow indexed columns used for fast lookups.
    const payload = {
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
    };
    await upsertAuthAccount(userId, authAccount);
    // Indexed columns store the fields we query often, while the JSON payload keeps
    // the richer context available for future antifraud rules and manual analysis.
    const record = await models_1.UserFingerprint.create({
        userId,
        eventType,
        fHash: (0, http_1.normalizeOptionalString)(fingerprint.fHash) ?? null,
        ipPrimary: ipPrimary ?? null,
        ipWebrtc: (0, http_1.normalizeOptionalString)(context?.ipWebrtc) ?? null,
        canvasId: (0, http_1.normalizeOptionalString)(fingerprint.canvasId) ?? null,
        audioId: (0, http_1.normalizeOptionalString)(fingerprint.audioId) ?? null,
        webglVendor: webglVendor ?? null,
        webglRenderer: webglRenderer ?? null,
        webglId: webglId ?? null,
        cookieId,
        affiliateId: (0, http_1.normalizeIdentifier)(context?.affiliateId) ?? null,
        registrationSpeedMs: context?.registrationSpeedMs ?? null,
        payload,
    });
    return {
        fingerprintId: record.id,
        cookieId,
    };
}
//# sourceMappingURL=fingerprintIngestService.js.map