import FingerprintJS from '@fingerprintjs/fingerprintjs'
import Cookies from 'js-cookie'
import { UAParser } from 'ua-parser-js'

import type {
  EventType,
  FingerprintCollectionResult,
  FingerprintContextPayload,
  FingerprintPayload,
} from '../types'

const COOKIE_NAME = 'aml_cookie_id'
const AFFILIATE_COOKIE_NAME = 'aml_affiliate_id'
const MAX_FORM_AGE_MS = 300_000
let pageLoadStartedAt = performance.now()

type CollectorOptions = {
  eventType: EventType
  promoCode?: string
}

type SignalResult = {
  value?: string
  diagnostic: string
}

type BatteryManagerLike = {
  charging?: boolean
  level?: number
}

declare global {
  interface Navigator {
    getBattery?: () => Promise<BatteryManagerLike>
  }
}

async function hashText(value: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const buffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(value),
    )

    return [...new Uint8Array(buffer)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  return fallbackHash(value)
}

function fallbackHash(value: string): string {
  let hashA = 0x811c9dc5
  let hashB = 0x01000193

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    hashA ^= code
    hashA = Math.imul(hashA, 0x01000193)
    hashB = Math.imul(hashB ^ code, 0x45d9f3b)
  }

  const partA = (hashA >>> 0).toString(16).padStart(8, '0')
  const partB = (hashB >>> 0).toString(16).padStart(8, '0')
  const reversed = `${partB}${partA}`.split('').reverse().join('')

  return `${partA}${partB}${reversed}`.slice(0, 64)
}

function getAffiliateId(): string | undefined {
  const params = new URLSearchParams(window.location.search)
  const fromQuery =
    params.get('aff') ?? params.get('affiliate') ?? params.get('affiliate_id')

  if (fromQuery) {
    Cookies.set(AFFILIATE_COOKIE_NAME, fromQuery, { sameSite: 'Lax', expires: 30 })
    localStorage.setItem(AFFILIATE_COOKIE_NAME, fromQuery)
    return fromQuery
  }

  return (
    Cookies.get(AFFILIATE_COOKIE_NAME) ??
    localStorage.getItem(AFFILIATE_COOKIE_NAME) ??
    undefined
  )
}

async function collectCanvasHash(): Promise<SignalResult> {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 280
    canvas.height = 72
    const context = canvas.getContext('2d')

    if (!context) {
      return {
        diagnostic: 'Canvas 2D context недоступен',
      }
    }

    context.textBaseline = 'top'
    context.font = "16px 'Trebuchet MS'"
    context.fillStyle = '#17324d'
    context.fillRect(8, 8, 264, 56)
    context.fillStyle = '#f4e7bf'
    context.fillText('anti-multiaccount::canvas', 16, 20)
    context.strokeStyle = '#61dafb'
    context.beginPath()
    context.arc(240, 36, 18, 0, Math.PI * 2)
    context.stroke()

    return {
      value: await hashText(canvas.toDataURL()),
      diagnostic: 'Canvas hash успешно собран',
    }
  } catch (error) {
    return {
      diagnostic: `Ошибка Canvas: ${getErrorMessage(error)}`,
    }
  }
}

async function collectAudioHash(): Promise<SignalResult> {
  try {
    const OfflineAudioContextCtor =
      window.OfflineAudioContext ||
      (
        window as typeof window & {
          webkitOfflineAudioContext?: typeof OfflineAudioContext
        }
      ).webkitOfflineAudioContext

    if (!OfflineAudioContextCtor) {
      return {
        diagnostic: 'OfflineAudioContext недоступен',
      }
    }

    const context = new OfflineAudioContextCtor(1, 44100, 44100)
    const oscillator = context.createOscillator()
    const compressor = context.createDynamicsCompressor()

    oscillator.type = 'triangle'
    oscillator.frequency.value = 10000
    compressor.threshold.value = -50
    compressor.knee.value = 40
    compressor.ratio.value = 12
    compressor.attack.value = 0
    compressor.release.value = 0.25

    oscillator.connect(compressor)
    compressor.connect(context.destination)
    oscillator.start(0)

    const rendered = await context.startRendering()
    const channel = rendered.getChannelData(0)
    const sample = Array.from(channel.slice(0, 120)).join(',')
    return {
      value: await hashText(sample),
      diagnostic: 'Audio hash успешно собран',
    }
  } catch (error) {
    return {
      diagnostic: `Ошибка Audio: ${getErrorMessage(error)}`,
    }
  }
}

function collectWebglData(): { vendor?: string; renderer?: string } {
  try {
    const canvas = document.createElement('canvas')
    const context =
      canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')

    if (!context || !(context instanceof WebGLRenderingContext)) {
      return {}
    }

    const debugInfo = context.getExtension('WEBGL_debug_renderer_info')

    if (!debugInfo) {
      return {}
    }

    return {
      vendor: context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string,
      renderer: context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string,
    }
  } catch {
    return {}
  }
}

async function collectBatteryStatus(): Promise<
  FingerprintPayload['battery'] | undefined
> {
  try {
    if (!navigator.getBattery) {
      return undefined
    }

    const battery = await navigator.getBattery()
    return {
      charging: battery.charging,
      level: typeof battery.level === 'number' ? battery.level : null,
    }
  } catch {
    return undefined
  }
}

async function collectWebrtcIp(): Promise<SignalResult> {
  try {
    if (typeof RTCPeerConnection === 'undefined') {
      return {
        diagnostic: 'RTCPeerConnection недоступен',
      }
    }

    const connection = new RTCPeerConnection({ iceServers: [] })
    connection.createDataChannel('anti-multiaccount')

    const foundIp = await new Promise<SignalResult>((resolve) => {
      const timeoutId = window.setTimeout(
        () =>
          resolve({
            diagnostic: 'WebRTC: таймаут ожидания ICE candidate',
          }),
        1200,
      )

      connection.onicecandidate = (event) => {
        const candidate = event.candidate?.candidate
        const parsedIp = extractIpFromIceCandidate(candidate)

        if (parsedIp) {
          window.clearTimeout(timeoutId)
          resolve({
            value: parsedIp,
            diagnostic: `WebRTC IP найден: ${parsedIp}`,
          })
        }
      }

      void connection
        .createOffer()
        .then((offer) => connection.setLocalDescription(offer))
        .catch((error) => {
          window.clearTimeout(timeoutId)
          resolve({
            diagnostic: `Ошибка createOffer/setLocalDescription: ${getErrorMessage(error)}`,
          })
        })
    })

    connection.close()
    return foundIp
  } catch (error) {
    return {
      diagnostic: `Ошибка WebRTC: ${getErrorMessage(error)}`,
    }
  }
}

function extractIpFromIceCandidate(candidate: string | undefined): string | undefined {
  if (!candidate) {
    return undefined
  }

  const parts = candidate.trim().split(/\s+/)
  const candidateAddress = parts[4]

  if (isValidIpv4(candidateAddress) || isValidIpv6(candidateAddress)) {
    return candidateAddress
  }

  const fallbackMatch = candidate.match(
    /\b(?:\d{1,3}\.){3}\d{1,3}\b|(?:(?:[a-fA-F0-9]{1,4}:){2,}[a-fA-F0-9]{1,4})/g,
  )

  if (!fallbackMatch) {
    return undefined
  }

  return fallbackMatch.find((entry) => isValidIpv4(entry) || isValidIpv6(entry))
}

function isValidIpv4(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  const parts = value.split('.')

  if (parts.length !== 4) {
    return false
  }

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) {
      return false
    }

    const parsed = Number.parseInt(part, 10)
    return parsed >= 0 && parsed <= 255
  })
}

function isValidIpv6(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  return /^[a-fA-F0-9:]+$/.test(value) && value.includes(':')
}

function collectScreenResolution(): string | undefined {
  if (!window.screen) {
    return undefined
  }

  return `${window.screen.width}x${window.screen.height}`
}

function collectDeviceModel(): string | undefined {
  const parser = new UAParser(window.navigator.userAgent)
  const device = parser.getDevice()
  const model = [device.vendor, device.model, device.type].filter(Boolean).join(' ')

  if (model.length > 0) {
    return model
  }

  const browser = parser.getBrowser()
  const os = parser.getOS()
  return [browser.name, browser.version, os.name].filter(Boolean).join(' ') || undefined
}

function getRegistrationSpeedMeta(): {
  registrationSpeedMs: number
  formWasReset: boolean
} {
  const now = performance.now()
  const elapsed = Math.max(0, Math.round(now - pageLoadStartedAt))

  if (elapsed > MAX_FORM_AGE_MS) {
    pageLoadStartedAt = now
    return {
      registrationSpeedMs: 0,
      formWasReset: true,
    }
  }

  return {
    registrationSpeedMs: elapsed,
    formWasReset: false,
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export async function collectFingerprintEvent(
  options: CollectorOptions,
): Promise<FingerprintCollectionResult> {
  const agent = await FingerprintJS.load()
  const visitorData = await agent.get()

  const [canvasResult, audioResult, batteryResult, webrtcResult] =
    await Promise.allSettled([
      collectCanvasHash(),
      collectAudioHash(),
      collectBatteryStatus(),
      collectWebrtcIp(),
    ])

  const { vendor, renderer } = collectWebglData()
  const registrationMeta =
    options.eventType === 'register'
      ? getRegistrationSpeedMeta()
      : {
          registrationSpeedMs: undefined,
          formWasReset: false,
        }

  const fingerprint: FingerprintPayload = {
    fHash: visitorData.visitorId,
    canvasId:
      canvasResult.status === 'fulfilled' ? canvasResult.value.value : undefined,
    audioId: audioResult.status === 'fulfilled' ? audioResult.value.value : undefined,
    webglVendor: vendor,
    webglRenderer: renderer,
    userAgent: window.navigator.userAgent,
    screenResolution: collectScreenResolution(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    languages: [...window.navigator.languages],
    battery: batteryResult.status === 'fulfilled' ? batteryResult.value : undefined,
    deviceModel: collectDeviceModel(),
  }

  const context: FingerprintContextPayload = {
    ipWebrtc:
      webrtcResult.status === 'fulfilled' ? webrtcResult.value.value : undefined,
    cookieId: Cookies.get(COOKIE_NAME),
    affiliateId: getAffiliateId(),
    registrationSpeedMs: registrationMeta.registrationSpeedMs,
    promoCode: options.promoCode,
  }

  return {
    event: {
      eventType: options.eventType,
      fingerprint,
      context,
    },
    meta: {
      formWasReset: registrationMeta.formWasReset,
      registrationSpeedMs: registrationMeta.registrationSpeedMs,
      collectedAt: new Date().toISOString(),
      diagnostics: {
        canvas:
          canvasResult.status === 'fulfilled'
            ? canvasResult.value.diagnostic
            : `Ошибка Canvas promise: ${getErrorMessage(canvasResult.reason)}`,
        audio:
          audioResult.status === 'fulfilled'
            ? audioResult.value.diagnostic
            : `Ошибка Audio promise: ${getErrorMessage(audioResult.reason)}`,
        webrtc:
          webrtcResult.status === 'fulfilled'
            ? webrtcResult.value.diagnostic
            : `Ошибка WebRTC promise: ${getErrorMessage(webrtcResult.reason)}`,
      },
    },
  }
}
