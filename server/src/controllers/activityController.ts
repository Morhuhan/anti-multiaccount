import type { Request, Response } from 'express'

import { activityTrackSchema } from '../validation/fingerprintSchemas'

export async function trackActivity(req: Request, res: Response): Promise<void> {
  const parsed = activityTrackSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid activity tracking payload',
      details: parsed.error.flatten(),
    })
    return
  }

  res.status(202).json({
    accepted: true,
  })
}
