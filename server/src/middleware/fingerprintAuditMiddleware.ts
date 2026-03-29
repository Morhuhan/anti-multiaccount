import type { NextFunction, Request, Response } from 'express'

import type { FingerprintEventInput } from '../types/api'
import { enqueueTask } from '../services/fingerprintQueueService'
import { ingestFingerprintEvent } from '../services/fingerprintIngestService'

const syncHandledPaths = new Set([
  '/auth/register',
  '/auth/login',
  '/promos/activate',
])

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

function extractFingerprintPayload(req: Request): {
  userId: number
  fingerprintEvent: FingerprintEventInput
} | null {
  if (syncHandledPaths.has(req.path)) {
    return null
  }

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

export function fingerprintAuditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const payload = extractFingerprintPayload(req)

  if (!payload) {
    next()
    return
  }

  res.on('finish', () => {
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
