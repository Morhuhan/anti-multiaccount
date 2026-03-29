import type { EventType, FingerprintCollectionResult } from '../types'

export async function loadFingerprintEvent(
  eventType: EventType,
  promoCode?: string,
): Promise<FingerprintCollectionResult> {
  // Ленивая загрузка уменьшает стартовый бандл страницы
  const { collectFingerprintEvent } = await import('./fingerprintCollector')
  return collectFingerprintEvent({ eventType, promoCode })
}
