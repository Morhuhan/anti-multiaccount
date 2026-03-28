import type { RowDataPacket } from 'mysql2'

import { db } from '../lib/db'
import type { RelatedAccountMatch } from '../types/api'
import type { UserAuthAccountRow, UserFingerprintRow, UserRow } from '../types/models'
import { ApiError } from '../utils/errors'
import { buildWebglId } from '../utils/http'

const RULE_WEIGHTS = {
  f_hash: 100,
  cookie_id: 100,
  device_stack: 80,
  network_signature: 50,
  affiliate_overlap: 30,
  auth_provider_account: 100,
} as const

const RULE_REASON_MAP: Record<keyof typeof RULE_WEIGHTS, string[]> = {
  f_hash: ['f_hash'],
  cookie_id: ['cookie_id'],
  device_stack: ['canvas', 'audio', 'webgl'],
  network_signature: ['ip_primary', 'ip_webrtc', 'user_agent'],
  affiliate_overlap: ['ip_primary', 'affiliate_id'],
  auth_provider_account: ['auth_provider_account'],
}

type CandidateAccumulator = {
  related_user_id: number
  matchedRuleKeys: Set<keyof typeof RULE_WEIGHTS>
  matchReasonSet: Set<string>
  matchedEventIds: Set<number>
  lastMatchedAt: Date
}

function parseFingerprintPayload(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return (value as Record<string, unknown>) ?? {}
}

function getUserAgentFingerprint(entry: UserFingerprintRow): string | undefined {
  const payload = parseFingerprintPayload(entry.payload)
  const fingerprint = payload.fingerprint as Record<string, unknown> | undefined
  const userAgent = fingerprint?.userAgent
  return typeof userAgent === 'string' && userAgent.length > 0 ? userAgent : undefined
}

function applyRule(
  candidate: CandidateAccumulator,
  ruleKey: keyof typeof RULE_WEIGHTS,
  otherFingerprintId: number,
  otherCreatedAt: Date,
): void {
  candidate.matchedRuleKeys.add(ruleKey)
  candidate.matchedEventIds.add(otherFingerprintId)

  for (const reason of RULE_REASON_MAP[ruleKey]) {
    candidate.matchReasonSet.add(reason)
  }

  if (otherCreatedAt > candidate.lastMatchedAt) {
    candidate.lastMatchedAt = otherCreatedAt
  }
}

function evaluateFingerprintPair(
  currentFingerprint: UserFingerprintRow,
  otherFingerprint: UserFingerprintRow,
  candidate: CandidateAccumulator,
): void {
  if (
    currentFingerprint.fHash &&
    otherFingerprint.fHash &&
    currentFingerprint.fHash === otherFingerprint.fHash
  ) {
    applyRule(candidate, 'f_hash', otherFingerprint.id, otherFingerprint.createdAt)
  }

  if (
    currentFingerprint.cookieId &&
    otherFingerprint.cookieId &&
    currentFingerprint.cookieId === otherFingerprint.cookieId
  ) {
    applyRule(candidate, 'cookie_id', otherFingerprint.id, otherFingerprint.createdAt)
  }

  const currentWebglId = buildWebglId(
    currentFingerprint.webglVendor ?? undefined,
    currentFingerprint.webglRenderer ?? undefined,
  )
  const otherWebglId = buildWebglId(
    otherFingerprint.webglVendor ?? undefined,
    otherFingerprint.webglRenderer ?? undefined,
  )

  if (
    currentFingerprint.canvasId &&
    otherFingerprint.canvasId &&
    currentFingerprint.canvasId === otherFingerprint.canvasId &&
    currentFingerprint.audioId &&
    otherFingerprint.audioId &&
    currentFingerprint.audioId === otherFingerprint.audioId &&
    currentWebglId &&
    otherWebglId &&
    currentWebglId === otherWebglId &&
    currentFingerprint.ipPrimary &&
    otherFingerprint.ipPrimary &&
    currentFingerprint.ipPrimary !== otherFingerprint.ipPrimary
  ) {
    applyRule(candidate, 'device_stack', otherFingerprint.id, otherFingerprint.createdAt)
  }

  const currentUserAgent = getUserAgentFingerprint(currentFingerprint)
  const otherUserAgent = getUserAgentFingerprint(otherFingerprint)

  if (
    currentFingerprint.ipPrimary &&
    otherFingerprint.ipPrimary &&
    currentFingerprint.ipPrimary === otherFingerprint.ipPrimary &&
    currentFingerprint.ipWebrtc &&
    otherFingerprint.ipWebrtc &&
    currentFingerprint.ipWebrtc === otherFingerprint.ipWebrtc &&
    currentUserAgent &&
    otherUserAgent &&
    currentUserAgent === otherUserAgent
  ) {
    applyRule(
      candidate,
      'network_signature',
      otherFingerprint.id,
      otherFingerprint.createdAt,
    )
  }

  if (
    currentFingerprint.ipPrimary &&
    otherFingerprint.ipPrimary &&
    currentFingerprint.ipPrimary === otherFingerprint.ipPrimary &&
    currentFingerprint.affiliateId &&
    otherFingerprint.affiliateId &&
    currentFingerprint.affiliateId === otherFingerprint.affiliateId
  ) {
    applyRule(
      candidate,
      'affiliate_overlap',
      otherFingerprint.id,
      otherFingerprint.createdAt,
    )
  }
}

function calculateConfidenceScore(
  matchedRuleKeys: Set<keyof typeof RULE_WEIGHTS>,
): number {
  let score = 0

  for (const ruleKey of matchedRuleKeys) {
    score = Math.max(score, RULE_WEIGHTS[ruleKey])
  }

  return score
}

function groupByUserId<T extends { userId: number }>(items: T[]): Map<number, T[]> {
  const grouped = new Map<number, T[]>()

  for (const item of items) {
    const existing = grouped.get(item.userId)
    if (existing) {
      existing.push(item)
    } else {
      grouped.set(item.userId, [item])
    }
  }

  return grouped
}

export async function getRelatedAccounts(userId: number): Promise<RelatedAccountMatch[]> {
  const [userRows] = await db.query<(RowDataPacket & UserRow)[]>(
    'SELECT id, email, name, createdAt FROM `User` WHERE id = ? LIMIT 1',
    [userId],
  )
  const user = userRows[0]

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  const [currentFingerprintRows] = await db.query<(RowDataPacket & UserFingerprintRow)[]>(
    'SELECT id, userId, eventType, fHash, ipPrimary, ipWebrtc, canvasId, audioId, webglVendor, webglRenderer, webglId, cookieId, affiliateId, registrationSpeedMs, payload, createdAt FROM `UserFingerprint` WHERE userId = ? ORDER BY createdAt DESC',
    [userId],
  )
  const [currentAuthRows] = await db.query<(RowDataPacket & UserAuthAccountRow)[]>(
    'SELECT id, userId, provider, providerAccountId, createdAt FROM `UserAuthAccount` WHERE userId = ? ORDER BY createdAt DESC',
    [userId],
  )
  const [otherUserRows] = await db.query<(RowDataPacket & UserRow)[]>(
    'SELECT id, email, name, createdAt FROM `User` WHERE id <> ? ORDER BY id ASC',
    [userId],
  )
  const [otherFingerprintRows] = await db.query<(RowDataPacket & UserFingerprintRow)[]>(
    'SELECT id, userId, eventType, fHash, ipPrimary, ipWebrtc, canvasId, audioId, webglVendor, webglRenderer, webglId, cookieId, affiliateId, registrationSpeedMs, payload, createdAt FROM `UserFingerprint` WHERE userId <> ? ORDER BY createdAt DESC',
    [userId],
  )
  const [otherAuthRows] = await db.query<(RowDataPacket & UserAuthAccountRow)[]>(
    'SELECT id, userId, provider, providerAccountId, createdAt FROM `UserAuthAccount` WHERE userId <> ? ORDER BY createdAt DESC',
    [userId],
  )

  const fingerprintsByUserId = groupByUserId(otherFingerprintRows)
  const authAccountsByUserId = groupByUserId(otherAuthRows)
  const ownProviderAccounts = new Set(
    currentAuthRows.map(
      (account) => `${account.provider.toLowerCase()}::${account.providerAccountId}`,
    ),
  )

  const results: CandidateAccumulator[] = []

  for (const otherUser of otherUserRows) {
    const candidate: CandidateAccumulator = {
      related_user_id: otherUser.id,
      matchedRuleKeys: new Set(),
      matchReasonSet: new Set(),
      matchedEventIds: new Set(),
      lastMatchedAt: new Date(0),
    }

    for (const currentFingerprint of currentFingerprintRows) {
      for (const otherFingerprint of fingerprintsByUserId.get(otherUser.id) ?? []) {
        evaluateFingerprintPair(currentFingerprint, otherFingerprint, candidate)
      }
    }

    for (const account of authAccountsByUserId.get(otherUser.id) ?? []) {
      const composite = `${account.provider.toLowerCase()}::${account.providerAccountId}`
      if (ownProviderAccounts.has(composite)) {
        applyRule(
          candidate,
          'auth_provider_account',
          Number.MIN_SAFE_INTEGER + account.id,
          account.createdAt,
        )
      }
    }

    if (candidate.matchedRuleKeys.size > 0) {
      results.push(candidate)
    }
  }

  return results
    .map((candidate) => ({
      related_user_id: candidate.related_user_id,
      confidence_score: calculateConfidenceScore(candidate.matchedRuleKeys),
      match_reasons: [...candidate.matchReasonSet].sort(),
      matched_events_count: candidate.matchedEventIds.size,
      last_matched_at: candidate.lastMatchedAt.toISOString(),
    }))
    .sort((left, right) => {
      if (right.confidence_score !== left.confidence_score) {
        return right.confidence_score - left.confidence_score
      }

      return (
        new Date(right.last_matched_at).getTime() -
        new Date(left.last_matched_at).getTime()
      )
    })
}

export async function getAnalyticsRelationships(): Promise<{
  users: Array<{
    id: number
    email: string
    name: string | null
    createdAt: string
    fingerprintCount: number
    relatedAccountsCount: number
    topConfidenceScore: number
  }>
}> {
  const [users] = await db.query<(RowDataPacket & UserRow)[]>(
    'SELECT id, email, name, createdAt FROM `User` ORDER BY id ASC',
  )
  const [fingerprints] = await db.query<(RowDataPacket & Pick<UserFingerprintRow, 'userId'>)[]>(
    'SELECT userId FROM `UserFingerprint`',
  )

  const fingerprintCounts = new Map<number, number>()

  for (const fingerprint of fingerprints) {
    fingerprintCounts.set(
      fingerprint.userId,
      (fingerprintCounts.get(fingerprint.userId) ?? 0) + 1,
    )
  }

  const enriched = await Promise.all(
    users.map(async (user) => {
      const relatedAccounts = await getRelatedAccounts(user.id)
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        fingerprintCount: fingerprintCounts.get(user.id) ?? 0,
        relatedAccountsCount: relatedAccounts.length,
        topConfidenceScore: relatedAccounts[0]?.confidence_score ?? 0,
      }
    }),
  )

  return { users: enriched }
}
