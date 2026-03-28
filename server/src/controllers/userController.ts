import type { Request, Response } from 'express'
import type { RowDataPacket } from 'mysql2'

import { db } from '../lib/db'
import { getRelatedAccounts } from '../services/relatedAccountsService'
import type { UserAuthAccountRow, UserFingerprintRow, UserRow } from '../types/models'
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

  const [userRows] = await db.query<(RowDataPacket & UserRow)[]>(
    'SELECT id, email, name, createdAt FROM `User` WHERE id = ? LIMIT 1',
    [userId],
  )
  const user = userRows[0]

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  const [authAccountRows] = await db.query<(RowDataPacket & UserAuthAccountRow)[]>(
    'SELECT id, userId, provider, providerAccountId, createdAt FROM `UserAuthAccount` WHERE userId = ? ORDER BY createdAt DESC',
    [userId],
  )
  const [fingerprintRows] = await db.query<(RowDataPacket & UserFingerprintRow)[]>(
    'SELECT id, userId, eventType, fHash, ipPrimary, ipWebrtc, canvasId, audioId, webglVendor, webglRenderer, webglId, cookieId, affiliateId, registrationSpeedMs, payload, createdAt FROM `UserFingerprint` WHERE userId = ? ORDER BY createdAt DESC',
    [userId],
  )

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
      payload:
        typeof fingerprint.payload === 'string'
          ? JSON.parse(fingerprint.payload)
          : fingerprint.payload,
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
