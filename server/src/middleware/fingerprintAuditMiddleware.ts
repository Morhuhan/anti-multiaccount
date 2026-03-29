import type { NextFunction, Request, Response } from 'express'

import type { FingerprintEventInput } from '../types/api'
import type { FingerprintAuditPayload } from '../types/express'
import { enqueueTask } from '../services/fingerprintQueueService'
import { ingestFingerprintEvent } from '../services/fingerprintIngestService'

type FingerprintCarrier = {
  userId?: unknown
  fingerprintEvent?: unknown
}

function parseUserId(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return undefined
  }

  return value
}

function extractFingerprintPayload(req: Request): FingerprintAuditPayload | null {
  const body = req.body as FingerprintCarrier | undefined
  const userId = parseUserId(body?.userId)
  const fingerprintEvent = body?.fingerprintEvent as FingerprintEventInput | undefined

  if (!userId || !fingerprintEvent) {
    return null
  }

  return {
    userId,
    fingerprintEvent,
  }
}

export function setFingerprintAuditPayload(
  res: Response,
  payload: FingerprintAuditPayload,
): void {
  res.locals.fingerprintAuditPayload = payload
}

export function fingerprintAuditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.on('finish', () => {
    const payload =
      (res.locals.fingerprintAuditPayload as FingerprintAuditPayload | undefined) ??
      extractFingerprintPayload(req)

    if (!payload) {
      return
    }

    // Пишем отпечаток после ответа
    setImmediate(() => {
      enqueueTask(async () => {
        await ingestFingerprintEvent({
          req,
          res,
          userId: payload.userId,
          eventType: payload.fingerprintEvent.eventType,
          fingerprint: payload.fingerprintEvent.fingerprint,
          context: payload.fingerprintEvent.context,
          authAccount: payload.fingerprintEvent.authAccount,
        })
      })
    })
  })

  next()
}
