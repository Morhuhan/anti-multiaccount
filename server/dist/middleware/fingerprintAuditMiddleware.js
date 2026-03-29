"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setFingerprintAuditPayload = setFingerprintAuditPayload;
exports.fingerprintAuditMiddleware = fingerprintAuditMiddleware;
const fingerprintQueueService_1 = require("../services/fingerprintQueueService");
const fingerprintIngestService_1 = require("../services/fingerprintIngestService");
function parseUserId(value) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
        return undefined;
    }
    return value;
}
function extractFingerprintPayload(req) {
    const body = req.body;
    const userId = parseUserId(body?.userId);
    const fingerprintEvent = body?.fingerprintEvent;
    if (!userId || !fingerprintEvent) {
        return null;
    }
    return {
        userId,
        fingerprintEvent,
    };
}
function setFingerprintAuditPayload(res, payload) {
    res.locals.fingerprintAuditPayload = payload;
}
function fingerprintAuditMiddleware(req, res, next) {
    res.on('finish', () => {
        const payload = res.locals.fingerprintAuditPayload ??
            extractFingerprintPayload(req);
        if (!payload) {
            return;
        }
        // Пишем отпечаток после ответа
        setImmediate(() => {
            (0, fingerprintQueueService_1.enqueueTask)(async () => {
                await (0, fingerprintIngestService_1.ingestFingerprintEvent)({
                    req,
                    res,
                    userId: payload.userId,
                    eventType: payload.fingerprintEvent.eventType,
                    fingerprint: payload.fingerprintEvent.fingerprint,
                    context: payload.fingerprintEvent.context,
                    authAccount: payload.fingerprintEvent.authAccount,
                });
            });
        });
    });
    next();
}
//# sourceMappingURL=fingerprintAuditMiddleware.js.map