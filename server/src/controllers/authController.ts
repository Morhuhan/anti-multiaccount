import type { Request, Response } from 'express'

import { User } from '../models'
import { ingestFingerprintEvent } from '../services/fingerprintIngestService'
import { ApiError } from '../utils/errors'
import { normalizeIdentifier, normalizeOptionalString } from '../utils/http'
import { loginSchema, registerSchema } from '../validation/fingerprintSchemas'

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid register payload',
      details: parsed.error.flatten(),
    })
    return
  }

  const email = normalizeIdentifier(parsed.data.email)

  if (!email) {
    throw new ApiError(400, 'Email is required')
  }

  const existingUser = await User.findOne({
    where: { email },
    attributes: ['id'],
  })

  if (existingUser) {
    throw new ApiError(409, 'User with this email already exists')
  }

  // Здесь запись синхронная: API возвращает fingerprint_id и cookie_id
  const user = await User.create({
    email,
    name: normalizeOptionalString(parsed.data.name) ?? null,
  })

  const fingerprintResult = await ingestFingerprintEvent({
    req,
    res,
    userId: user.id,
    eventType: parsed.data.fingerprintEvent.eventType,
    fingerprint: parsed.data.fingerprintEvent.fingerprint,
    context: parsed.data.fingerprintEvent.context,
    authAccount: parsed.data.fingerprintEvent.authAccount,
  })

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    },
    fingerprint_id: fingerprintResult.fingerprintId,
    cookie_id: fingerprintResult.cookieId,
  })
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid login payload',
      details: parsed.error.flatten(),
    })
    return
  }

  let user: User | null = null

  if (parsed.data.userId) {
    user = await User.findByPk(parsed.data.userId)
  } else if (parsed.data.email) {
    user = await User.findOne({
      where: {
        email: normalizeIdentifier(parsed.data.email),
      },
    })
  }

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  const fingerprintResult = await ingestFingerprintEvent({
    req,
    res,
    userId: user.id,
    eventType: parsed.data.fingerprintEvent.eventType,
    fingerprint: parsed.data.fingerprintEvent.fingerprint,
    context: parsed.data.fingerprintEvent.context,
    authAccount: parsed.data.fingerprintEvent.authAccount,
  })

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    },
    fingerprint_id: fingerprintResult.fingerprintId,
    cookie_id: fingerprintResult.cookieId,
  })
}
