export type UserRow = {
  id: number
  email: string
  name: string | null
  createdAt: Date
}

export type UserAuthAccountRow = {
  id: number
  userId: number
  provider: string
  providerAccountId: string
  createdAt: Date
}

export type UserFingerprintRow = {
  id: number
  userId: number
  eventType: 'register' | 'login' | 'promo_activation' | 'activity'
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
  createdAt: Date
}
