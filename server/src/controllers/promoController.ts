import type { Request, Response } from 'express'

import { ingestFingerprintEvent } from '../services/fingerprintIngestService'
import { promoActivationSchema } from '../validation/fingerprintSchemas'

export async function activatePromo(req: Request, res: Response): Promise<void> {
  const parsed = promoActivationSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid promo activation payload',
      details: parsed.error.flatten(),
    })
    return
  }

  const fingerprintResult = await ingestFingerprintEvent({
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
  })

  res.json({
    success: true,
    user_id: parsed.data.userId,
    promo_code: parsed.data.promoCode,
    fingerprint_id: fingerprintResult.fingerprintId,
    cookie_id: fingerprintResult.cookieId,
  })
}
