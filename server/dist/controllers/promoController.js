"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activatePromo = activatePromo;
const fingerprintIngestService_1 = require("../services/fingerprintIngestService");
const fingerprintSchemas_1 = require("../validation/fingerprintSchemas");
async function activatePromo(req, res) {
    const parsed = fingerprintSchemas_1.promoActivationSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: 'Invalid promo activation payload',
            details: parsed.error.flatten(),
        });
        return;
    }
    const fingerprintResult = await (0, fingerprintIngestService_1.ingestFingerprintEvent)({
        req,
        res,
        userId: parsed.data.userId,
        eventType: parsed.data.fingerprintEvent.eventType,
        fingerprint: parsed.data.fingerprintEvent.fingerprint,
        context: {
            ...parsed.data.fingerprintEvent.context,
            promoCode: parsed.data.promoCode,
        },
        authAccount: parsed.data.fingerprintEvent.authAccount,
    });
    res.json({
        success: true,
        user_id: parsed.data.userId,
        promo_code: parsed.data.promoCode,
        fingerprint_id: fingerprintResult.fingerprintId,
        cookie_id: fingerprintResult.cookieId,
    });
}
//# sourceMappingURL=promoController.js.map