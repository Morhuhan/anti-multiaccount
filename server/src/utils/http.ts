import { randomUUID } from 'node:crypto'
import type { Request, Response } from 'express'

export const COOKIE_NAME = 'aml_cookie_id'

export function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

export function normalizeIdentifier(value: unknown): string | undefined {
  const normalized = normalizeOptionalString(value)
  return normalized?.toLowerCase()
}

export function getRequestIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for']

  if (typeof forwarded === 'string') {
    // Берём первый IP из цепочки прокси
    return forwarded.split(',')[0]?.trim()
  }

  if (Array.isArray(forwarded)) {
    return forwarded[0]?.trim()
  }

  return req.socket.remoteAddress ?? undefined
}

export function ensureCookieId(req: Request, res: Response): string {
  const existing = normalizeOptionalString(req.cookies?.[COOKIE_NAME])

  if (existing) {
    return existing
  }

  const generated = randomUUID()
  // Cookie должен жить между визитами, иначе связь событий теряется
  res.cookie(COOKIE_NAME, generated, {
    httpOnly: false,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 365,
  })

  return generated
}

export function buildWebglId(
  vendor: string | undefined,
  renderer: string | undefined,
): string | undefined {
  if (!vendor || !renderer) {
    return undefined
  }

  // Склеиваем GPU-подпись в один ключ для быстрых сравнений
  return `${vendor.toLowerCase()}::${renderer.toLowerCase()}`
}
