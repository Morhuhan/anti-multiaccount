import type { Request, Response } from 'express'

import { User, UserAuthAccount, UserFingerprint } from '../models'
import type { AuthAccountPayload, FingerprintEventInput } from '../types/api'
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
  eventType: 'register' | 'login' | 'promo_activation' | 'activity'
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

  const existingAuthAccount = await UserAuthAccount.findOne({
    where: {
      userId,
      provider,
      providerAccountId,
    },
    attributes: ['id'],
  })

  if (existingAuthAccount) {
    return
  }

  await UserAuthAccount.create({
    userId,
    provider,
    providerAccountId,
  })
}

export async function ingestFingerprintEvent(
  params: IngestFingerprintParams,
): Promise<{ fingerprintId: number; cookieId: string }> {
  const { req, res, userId, eventType, fingerprint, context, authAccount } = params
  const user = await User.findByPk(userId, {
    attributes: ['id'],
  })

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  const cookieId = normalizeOptionalString(context?.cookieId) ?? ensureCookieId(req, res)
  const ipPrimary = getRequestIp(req)
  const webglVendor = normalizeOptionalString(fingerprint.webglVendor)
  const webglRenderer = normalizeOptionalString(fingerprint.webglRenderer)
  const webglId = buildWebglId(webglVendor, webglRenderer)
  const userAgent = normalizeOptionalString(fingerprint.userAgent)

  const payload = {
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
  }

  await upsertAuthAccount(userId, authAccount)

  const record = await UserFingerprint.create({
    userId,
    eventType,
    fHash: normalizeOptionalString(fingerprint.fHash) ?? null,
    ipPrimary: ipPrimary ?? null,
    ipWebrtc: normalizeOptionalString(context?.ipWebrtc) ?? null,
    canvasId: normalizeOptionalString(fingerprint.canvasId) ?? null,
    audioId: normalizeOptionalString(fingerprint.audioId) ?? null,
    webglVendor: webglVendor ?? null,
    webglRenderer: webglRenderer ?? null,
    webglId: webglId ?? null,
    cookieId,
    affiliateId: normalizeIdentifier(context?.affiliateId) ?? null,
    registrationSpeedMs: context?.registrationSpeedMs ?? null,
    payload,
  })

  return {
    fingerprintId: record.id,
    cookieId,
  }
}
