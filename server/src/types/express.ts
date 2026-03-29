import type { FingerprintEventInput } from './api'

export type FingerprintAuditPayload = {
  userId: number
  fingerprintEvent: FingerprintEventInput
}
