"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promoActivationSchema = exports.loginSchema = exports.registerSchema = exports.genericFingerprintEventSchema = void 0;
const zod_1 = require("zod");
const batterySchema = zod_1.z
    .object({
    charging: zod_1.z.boolean().optional(),
    level: zod_1.z.number().min(0).max(1).nullable().optional(),
})
    .partial()
    .optional();
const fingerprintSchema = zod_1.z.object({
    fHash: zod_1.z.string().trim().min(1).max(255).optional(),
    canvasId: zod_1.z.string().trim().min(1).max(255).optional(),
    audioId: zod_1.z.string().trim().min(1).max(255).optional(),
    webglVendor: zod_1.z.string().trim().min(1).max(255).optional(),
    webglRenderer: zod_1.z.string().trim().min(1).max(255).optional(),
    userAgent: zod_1.z.string().trim().min(1).max(2000).optional(),
    screenResolution: zod_1.z.string().trim().min(1).max(64).optional(),
    timezone: zod_1.z.string().trim().min(1).max(128).optional(),
    languages: zod_1.z.array(zod_1.z.string().trim().min(1).max(32)).max(20).optional(),
    battery: batterySchema,
    deviceModel: zod_1.z.string().trim().min(1).max(255).optional(),
});
const contextSchema = zod_1.z
    .object({
    ipWebrtc: zod_1.z.string().trim().min(1).max(64).optional(),
    cookieId: zod_1.z.string().trim().min(1).max(255).optional(),
    affiliateId: zod_1.z.string().trim().min(1).max(255).optional(),
    registrationSpeedMs: zod_1.z.number().int().min(0).max(300_000).optional(),
    promoCode: zod_1.z.string().trim().min(1).max(255).optional(),
})
    .optional();
const authAccountSchema = zod_1.z
    .object({
    provider: zod_1.z.string().trim().min(1).max(64),
    providerAccountId: zod_1.z.string().trim().min(1).max(255),
})
    .optional();
exports.genericFingerprintEventSchema = zod_1.z.object({
    eventType: zod_1.z.enum(['register', 'login', 'promo_activation', 'activity']),
    fingerprint: fingerprintSchema,
    context: contextSchema,
    authAccount: authAccountSchema,
});
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(255).optional(),
    email: zod_1.z.string().trim().email().max(255),
    fingerprintEvent: exports.genericFingerprintEventSchema.extend({
        eventType: zod_1.z.literal('register'),
    }),
});
exports.loginSchema = zod_1.z.object({
    userId: zod_1.z.number().int().positive().optional(),
    email: zod_1.z.string().trim().email().max(255).optional(),
    fingerprintEvent: exports.genericFingerprintEventSchema.extend({
        eventType: zod_1.z.literal('login'),
    }),
});
exports.promoActivationSchema = zod_1.z.object({
    userId: zod_1.z.number().int().positive(),
    promoCode: zod_1.z.string().trim().min(1).max(255),
    fingerprintEvent: exports.genericFingerprintEventSchema.extend({
        eventType: zod_1.z.literal('promo_activation'),
    }),
});
//# sourceMappingURL=fingerprintSchemas.js.map