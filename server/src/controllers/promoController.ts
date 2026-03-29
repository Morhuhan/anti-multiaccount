import type { Request, Response } from 'express'

import { setFingerprintAuditPayload } from '../middleware/fingerprintAuditMiddleware'
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

  setFingerprintAuditPayload(res, {
    userId: parsed.data.userId,
    fingerprintEvent: {
      ...parsed.data.fingerprintEvent,
      context: {
        ...parsed.data.fingerprintEvent.context,
        promoCode: parsed.data.promoCode,
      },
    },
  })

  res.json({
    success: true,
    user_id: parsed.data.userId,
    promo_code: parsed.data.promoCode,
  })
}
