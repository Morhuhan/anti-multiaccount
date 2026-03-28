export type FingerprintPayload = {
  fHash?: string | undefined
  canvasId?: string | undefined
  audioId?: string | undefined
  webglVendor?: string | undefined
  webglRenderer?: string | undefined
  userAgent?: string | undefined
  screenResolution?: string | undefined
  timezone?: string | undefined
  languages?: string[] | undefined
  battery?: {
    charging?: boolean | undefined
    level?: number | null | undefined
  } | undefined
  deviceModel?: string | undefined
}

export type FingerprintContextPayload = {
  ipWebrtc?: string | undefined
  cookieId?: string | undefined
  affiliateId?: string | undefined
  registrationSpeedMs?: number | undefined
  promoCode?: string | undefined
}

export type AuthAccountPayload = {
  provider: string
  providerAccountId: string
}

export type FingerprintEventInput = {
  userId?: number
  eventType: 'register' | 'login' | 'promo_activation'
  fingerprint: FingerprintPayload
  context?: FingerprintContextPayload | undefined
  authAccount?: AuthAccountPayload | undefined
}

export type RelatedAccountMatch = {
  related_user_id: number
  confidence_score: number
  match_reasons: string[]
  matched_events_count: number
  last_matched_at: string
}
