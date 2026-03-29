import type { Request, Response } from 'express'

import { User, UserAuthAccount, UserFingerprint } from '../models'
import { getRelatedAccounts } from '../services/relatedAccountsService'
import { ApiError } from '../utils/errors'

function parseUserId(value: string | string[] | undefined): number {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'Invalid user id')
  }

  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ApiError(400, 'Invalid user id')
  }

  return parsed
}

export async function getUserFingerprints(req: Request, res: Response): Promise<void> {
  const userId = parseUserId(req.params.userId)

  const user = await User.findByPk(userId)

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  const [authAccountRows, fingerprintRows] = await Promise.all([
    UserAuthAccount.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    }),
    UserFingerprint.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    }),
  ])

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    },
    authAccounts: authAccountRows.map((account) => ({
      id: account.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      createdAt: account.createdAt.toISOString(),
    })),
    fingerprints: fingerprintRows.map((fingerprint) => ({
      id: fingerprint.id,
      eventType: fingerprint.eventType,
      fHash: fingerprint.fHash,
      ipPrimary: fingerprint.ipPrimary,
      ipWebrtc: fingerprint.ipWebrtc,
      canvasId: fingerprint.canvasId,
      audioId: fingerprint.audioId,
      webglVendor: fingerprint.webglVendor,
      webglRenderer: fingerprint.webglRenderer,
      webglId: fingerprint.webglId,
      cookieId: fingerprint.cookieId,
      affiliateId: fingerprint.affiliateId,
      registrationSpeedMs: fingerprint.registrationSpeedMs,
      payload: fingerprint.payload,
      createdAt: fingerprint.createdAt.toISOString(),
    })),
  })
}

export async function getUserRelatedAccounts(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = parseUserId(req.params.userId)
  const relatedAccounts = await getRelatedAccounts(userId)

  res.json(relatedAccounts)
}
