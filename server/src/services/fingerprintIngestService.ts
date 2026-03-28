import type { Request, Response } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'

import { db } from '../lib/db'
import type { AuthAccountPayload, FingerprintEventInput } from '../types/api'
import type { UserAuthAccountRow, UserRow } from '../types/models'
import { ApiError } from '../utils/errors'
import {
  buildWebglId,
  ensureCookieId,
  getRequestIp,
  normalizeIdentifier,
  normalizeOptionalString,
} from '../utils/http'

type IngestFingerprintParams = {
  req: Request
  res: Response
  userId: number
  eventType: 'register' | 'login' | 'promo_activation'
  fingerprint: FingerprintEventInput['fingerprint']
  context?: FingerprintEventInput['context'] | undefined
  authAccount?: AuthAccountPayload | undefined
}

function normalizeLanguages(value: string[] | undefined): string[] | undefined {
  if (!value) {
    return undefined
  }

  const normalized = value
    .map((language) => normalizeIdentifier(language))
    .filter((language): language is string => Boolean(language))

  return normalized.length > 0 ? normalized : undefined
}

export async function upsertAuthAccount(
  userId: number,
  authAccount: AuthAccountPayload | undefined,
): Promise<void> {
  if (!authAccount) {
    return
  }

  const provider = normalizeIdentifier(authAccount.provider)
  const providerAccountId = normalizeOptionalString(authAccount.providerAccountId)

  if (!provider || !providerAccountId) {
    return
  }

  const [existingRows] = await db.query<(RowDataPacket & UserAuthAccountRow)[]>(
    'SELECT id, userId, provider, providerAccountId, createdAt FROM `UserAuthAccount` WHERE userId = ? AND provider = ? AND providerAccountId = ? LIMIT 1',
    [userId, provider, providerAccountId],
  )

  if (existingRows[0]) {
    return
  }

  await db.execute(
    'INSERT INTO `UserAuthAccount` (userId, provider, providerAccountId, createdAt) VALUES (?, ?, ?, NOW())',
    [userId, provider, providerAccountId],
  )
}

export async function ingestFingerprintEvent(
  params: IngestFingerprintParams,
): Promise<{ fingerprintId: number; cookieId: string }> {
  const { req, res, userId, eventType, fingerprint, context, authAccount } = params
  const [userRows] = await db.query<(RowDataPacket & Pick<UserRow, 'id'>)[]>(
    'SELECT id FROM `User` WHERE id = ? LIMIT 1',
    [userId],
  )

  if (!userRows[0]) {
    throw new ApiError(404, 'User not found')
  }

  const cookieId = normalizeOptionalString(context?.cookieId) ?? ensureCookieId(req, res)
  const ipPrimary = getRequestIp(req)
  const webglVendor = normalizeOptionalString(fingerprint.webglVendor)
  const webglRenderer = normalizeOptionalString(fingerprint.webglRenderer)
  const webglId = buildWebglId(webglVendor, webglRenderer)
  const userAgent = normalizeOptionalString(fingerprint.userAgent)

  const payload = JSON.stringify({
    fingerprint: {
      fHash: normalizeOptionalString(fingerprint.fHash) ?? null,
      canvasId: normalizeOptionalString(fingerprint.canvasId) ?? null,
      audioId: normalizeOptionalString(fingerprint.audioId) ?? null,
      webglVendor: webglVendor ?? null,
      webglRenderer: webglRenderer ?? null,
      webglId: webglId ?? null,
      userAgent: userAgent ?? null,
      screenResolution: normalizeOptionalString(fingerprint.screenResolution) ?? null,
      timezone: normalizeOptionalString(fingerprint.timezone) ?? null,
      languages: normalizeLanguages(fingerprint.languages) ?? null,
      battery: fingerprint.battery ?? null,
      deviceModel: normalizeOptionalString(fingerprint.deviceModel) ?? null,
    },
    context: {
      ipPrimary: ipPrimary ?? null,
      ipWebrtc: normalizeOptionalString(context?.ipWebrtc) ?? null,
      cookieId,
      affiliateId: normalizeIdentifier(context?.affiliateId) ?? null,
      registrationSpeedMs: context?.registrationSpeedMs ?? null,
      promoCode: normalizeOptionalString(context?.promoCode) ?? null,
    },
  })

  await upsertAuthAccount(userId, authAccount)

  const [result] = await db.execute<ResultSetHeader>(
    'INSERT INTO `UserFingerprint` (userId, eventType, fHash, ipPrimary, ipWebrtc, canvasId, audioId, webglVendor, webglRenderer, webglId, cookieId, affiliateId, registrationSpeedMs, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
    [
      userId,
      eventType,
      normalizeOptionalString(fingerprint.fHash) ?? null,
      ipPrimary ?? null,
      normalizeOptionalString(context?.ipWebrtc) ?? null,
      normalizeOptionalString(fingerprint.canvasId) ?? null,
      normalizeOptionalString(fingerprint.audioId) ?? null,
      webglVendor ?? null,
      webglRenderer ?? null,
      webglId ?? null,
      cookieId,
      normalizeIdentifier(context?.affiliateId) ?? null,
      context?.registrationSpeedMs ?? null,
      payload,
    ],
  )

  return {
    fingerprintId: result.insertId,
    cookieId,
  }
}
