"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackActivity = trackActivity;
const fingerprintSchemas_1 = require("../validation/fingerprintSchemas");
async function trackActivity(req, res) {
    const parsed = fingerprintSchemas_1.activityTrackSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: 'Invalid activity tracking payload',
            details: parsed.error.flatten(),
        });
        return;
    }
    res.status(202).json({
        accepted: true,
    });
}
//# sourceMappingURL=activityController.js.map