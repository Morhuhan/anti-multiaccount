"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fingerprintAuditMiddleware = fingerprintAuditMiddleware;
const fingerprintQueueService_1 = require("../services/fingerprintQueueService");
const fingerprintIngestService_1 = require("../services/fingerprintIngestService");
const syncHandledPaths = new Set([
    '/auth/register',
    '/auth/login',
    '/promos/activate',
]);
function parseUserId(value) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
        return undefined;
    }
    return value;
}
function extractFingerprintPayload(req) {
    if (syncHandledPaths.has(req.path)) {
        return null;
    }
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
function fingerprintAuditMiddleware(req, res, next) {
    const payload = extractFingerprintPayload(req);
    if (!payload) {
        next();
        return;
    }
    res.on('finish', () => {
        // Schedule after the response lifecycle so activity tracking never delays the caller.
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