import { z } from 'zod'

const batterySchema = z
  .object({
    charging: z.boolean().optional(),
    level: z.number().min(0).max(1).nullable().optional(),
  })
  .partial()
  .optional()

const fingerprintSchema = z.object({
  fHash: z.string().trim().min(1).max(255).optional(),
  canvasId: z.string().trim().min(1).max(255).optional(),
  audioId: z.string().trim().min(1).max(255).optional(),
  webglVendor: z.string().trim().min(1).max(255).optional(),
  webglRenderer: z.string().trim().min(1).max(255).optional(),
  userAgent: z.string().trim().min(1).max(2000).optional(),
  screenResolution: z.string().trim().min(1).max(64).optional(),
  timezone: z.string().trim().min(1).max(128).optional(),
  languages: z.array(z.string().trim().min(1).max(32)).max(20).optional(),
  battery: batterySchema,
  deviceModel: z.string().trim().min(1).max(255).optional(),
})

const contextSchema = z
  .object({
    ipWebrtc: z.string().trim().min(1).max(64).optional(),
    cookieId: z.string().trim().min(1).max(255).optional(),
    affiliateId: z.string().trim().min(1).max(255).optional(),
    registrationSpeedMs: z.number().int().min(0).max(300_000).optional(),
    promoCode: z.string().trim().min(1).max(255).optional(),
    activityType: z.string().trim().min(1).max(128).optional(),
    activityTarget: z.string().trim().min(1).max(255).optional(),
  })
  .optional()

const authAccountSchema = z
  .object({
    provider: z.string().trim().min(1).max(64),
    providerAccountId: z.string().trim().min(1).max(255),
  })
  .optional()

export const genericFingerprintEventSchema = z.object({
  eventType: z.enum(['register', 'login', 'promo_activation', 'activity']),
  fingerprint: fingerprintSchema,
  context: contextSchema,
  authAccount: authAccountSchema,
})

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().email().max(255),
  fingerprintEvent: genericFingerprintEventSchema.extend({
    eventType: z.literal('register'),
  }),
})

export const loginSchema = z.object({
  userId: z.number().int().positive().optional(),
  email: z.string().trim().email().max(255).optional(),
  fingerprintEvent: genericFingerprintEventSchema.extend({
    eventType: z.literal('login'),
  }),
})

export const promoActivationSchema = z.object({
  userId: z.number().int().positive(),
  promoCode: z.string().trim().min(1).max(255),
  fingerprintEvent: genericFingerprintEventSchema.extend({
    eventType: z.literal('promo_activation'),
  }),
})

export const activityTrackSchema = z.object({
  userId: z.number().int().positive(),
  fingerprintEvent: genericFingerprintEventSchema.extend({
    eventType: z.literal('activity'),
  }),
})
