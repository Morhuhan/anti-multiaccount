"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COOKIE_NAME = void 0;
exports.normalizeOptionalString = normalizeOptionalString;
exports.normalizeIdentifier = normalizeIdentifier;
exports.getRequestIp = getRequestIp;
exports.ensureCookieId = ensureCookieId;
exports.buildWebglId = buildWebglId;
const node_crypto_1 = require("node:crypto");
exports.COOKIE_NAME = 'aml_cookie_id';
function normalizeOptionalString(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}
function normalizeIdentifier(value) {
    const normalized = normalizeOptionalString(value);
    return normalized?.toLowerCase();
}
function getRequestIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0]?.trim();
    }
    if (Array.isArray(forwarded)) {
        return forwarded[0]?.trim();
    }
    return req.socket.remoteAddress ?? undefined;
}
function ensureCookieId(req, res) {
    const existing = normalizeOptionalString(req.cookies?.[exports.COOKIE_NAME]);
    if (existing) {
        return existing;
    }
    const generated = (0, node_crypto_1.randomUUID)();
    res.cookie(exports.COOKIE_NAME, generated, {
        httpOnly: false,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 365,
    });
    return generated;
}
function buildWebglId(vendor, renderer) {
    if (!vendor || !renderer) {
        return undefined;
    }
    return `${vendor.toLowerCase()}::${renderer.toLowerCase()}`;
}
//# sourceMappingURL=http.js.map