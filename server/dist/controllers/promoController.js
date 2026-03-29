"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activatePromo = activatePromo;
const fingerprintAuditMiddleware_1 = require("../middleware/fingerprintAuditMiddleware");
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
    (0, fingerprintAuditMiddleware_1.setFingerprintAuditPayload)(res, {
        userId: parsed.data.userId,
        fingerprintEvent: {
            ...parsed.data.fingerprintEvent,
            context: {
                ...parsed.data.fingerprintEvent.context,
                promoCode: parsed.data.promoCode,
            },
        },
    });
    res.json({
        success: true,
        user_id: parsed.data.userId,
        promo_code: parsed.data.promoCode,
    });
}
//# sourceMappingURL=promoController.js.map