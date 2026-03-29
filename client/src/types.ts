export type EventType = 'register' | 'login' | 'promo_activation' | 'activity'

export type FingerprintPayload = {
  fHash?: string
  canvasId?: string
  audioId?: string
  webglVendor?: string
  webglRenderer?: string
  userAgent?: string
  screenResolution?: string
  timezone?: string
  languages?: string[]
  battery?: {
    charging?: boolean
    level?: number | null
  }
  deviceModel?: string
}

export type FingerprintContextPayload = {
  ipWebrtc?: string
  cookieId?: string
  affiliateId?: string
  registrationSpeedMs?: number
  promoCode?: string
}

export type FingerprintEventDto = {
  eventType: EventType
  fingerprint: FingerprintPayload
  context?: FingerprintContextPayload
  authAccount?: {
    provider: string
    providerAccountId: string
  }
}

export type FingerprintCollectionMeta = {
  formWasReset: boolean
  registrationSpeedMs?: number
  collectedAt: string
  diagnostics: {
    canvas: string
    audio: string
    webrtc: string
  }
  debug?: {
    webrtc: string[]
  }
}

export type FingerprintCollectionResult = {
  event: FingerprintEventDto
  meta: FingerprintCollectionMeta
}

export type AnalyticsUser = {
  id: number
  email: string
  name: string | null
  createdAt: string
  fingerprintCount: number
  relatedAccountsCount: number
  topConfidenceScore: number
}

export type RelatedAccount = {
  related_user_id: number
  confidence_score: number
  match_reasons: string[]
  matched_events_count: number
  last_matched_at: string
}

export type FingerprintRecord = {
  id: number
  eventType: EventType
  fHash: string | null
  ipPrimary: string | null
  ipWebrtc: string | null
  canvasId: string | null
  audioId: string | null
  webglVendor: string | null
  webglRenderer: string | null
  webglId: string | null
  cookieId: string | null
  affiliateId: string | null
  registrationSpeedMs: number | null
  payload: unknown
  createdAt: string
}

export type UserDetails = {
  user: {
    id: number
    email: string
    name: string | null
    createdAt: string
  }
  authAccounts: Array<{
    id: number
    provider: string
    providerAccountId: string
    createdAt: string
  }>
  fingerprints: FingerprintRecord[]
}
