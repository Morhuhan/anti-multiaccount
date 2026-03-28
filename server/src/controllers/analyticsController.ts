import type { Request, Response } from 'express'

import { getAnalyticsRelationships } from '../services/relatedAccountsService'

export async function getRelationships(
  _req: Request,
  res: Response,
): Promise<void> {
  const analytics = await getAnalyticsRelationships()
  res.json(analytics)
}
