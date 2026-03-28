import type { Request, Response } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'

import { db } from '../lib/db'
import { ingestFingerprintEvent } from '../services/fingerprintIngestService'
import type { UserRow } from '../types/models'
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

  const [existingRows] = await db.query<(RowDataPacket & Pick<UserRow, 'id'>)[]>(
    'SELECT id FROM `User` WHERE email = ? LIMIT 1',
    [email],
  )

  if (existingRows[0]) {
    throw new ApiError(409, 'User with this email already exists')
  }

  const [insertResult] = await db.execute<ResultSetHeader>(
    'INSERT INTO `User` (email, name, createdAt) VALUES (?, ?, NOW())',
    [email, normalizeOptionalString(parsed.data.name) ?? null],
  )

  const [userRows] = await db.query<(RowDataPacket & UserRow)[]>(
    'SELECT id, email, name, createdAt FROM `User` WHERE id = ? LIMIT 1',
    [insertResult.insertId],
  )
  const user = userRows[0]

  if (!user) {
    throw new ApiError(500, 'Failed to create user')
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

  let user: UserRow | undefined

  if (parsed.data.userId) {
    const [rows] = await db.query<(RowDataPacket & UserRow)[]>(
      'SELECT id, email, name, createdAt FROM `User` WHERE id = ? LIMIT 1',
      [parsed.data.userId],
    )
    user = rows[0]
  } else if (parsed.data.email) {
    const [rows] = await db.query<(RowDataPacket & UserRow)[]>(
      'SELECT id, email, name, createdAt FROM `User` WHERE email = ? LIMIT 1',
      [normalizeIdentifier(parsed.data.email)],
    )
    user = rows[0]
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
