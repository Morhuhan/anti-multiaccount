const baseUrl = (process.env.API_BASE_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '')

function createFingerprintEvent(overrides = {}) {
  return {
    eventType: 'register',
    fingerprint: {
      fHash: 'base-fhash',
      canvasId: 'shared-canvas',
      audioId: 'shared-audio',
      webglVendor: 'NVIDIA',
      webglRenderer: 'RTX-Shared',
      userAgent: 'ScenarioBrowser/1.0',
      screenResolution: '1920x1080',
      timezone: 'UTC',
      languages: ['ru-RU', 'en-US'],
      battery: {
        charging: true,
        level: 0.82,
      },
      deviceModel: 'Scenario Device',
      ...overrides.fingerprint,
    },
    context: {
      ipWebrtc: '192.168.0.10',
      cookieId: 'cookie-base',
      affiliateId: undefined,
      registrationSpeedMs: 1200,
      ...overrides.context,
    },
    authAccount: overrides.authAccount,
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  const text = await response.text()
  const body = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${path}: ${JSON.stringify(body)}`)
  }

  return body
}

async function resetDemoData() {
  return request('/api/admin/reset-demo-data', { method: 'POST' })
}

async function registerUser({
  email,
  name,
  fingerprintEvent,
  forwardedFor,
}) {
  return request('/api/auth/register', {
    method: 'POST',
    headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : undefined,
    body: JSON.stringify({
      email,
      name,
      fingerprintEvent,
    }),
  })
}

async function getRelatedAccounts(userId) {
  return request(`/api/users/${userId}/related-accounts`, { method: 'GET' })
}

async function getAnalytics() {
  return request('/api/analytics/relationships', { method: 'GET' })
}

function printHeader(title) {
  console.log(`\n=== ${title} ===`)
}

async function main() {
  printHeader('Reset demo data')
  await resetDemoData()
  console.log(`API base: ${baseUrl}`)

  const baseUser = await registerUser({
    email: 'score100-anchor@mail.ru',
    name: 'База',
    forwardedFor: '10.10.10.10',
    fingerprintEvent: createFingerprintEvent({
      fingerprint: {
        fHash: 'fhash-100-anchor',
        userAgent: 'UA-LOW-50',
      },
      context: {
        cookieId: 'cookie-anchor',
        ipWebrtc: '192.168.50.50',
        affiliateId: 'aff-low',
      },
    }),
  })

  await registerUser({
    email: 'score100@mail.ru',
    name: 'Score 100',
    forwardedFor: '10.10.10.11',
    fingerprintEvent: createFingerprintEvent({
      fingerprint: {
        fHash: 'fhash-100-anchor',
        canvasId: 'unique-canvas-100',
        audioId: 'unique-audio-100',
        webglVendor: 'Vendor-100',
        webglRenderer: 'Renderer-100',
        userAgent: 'UA-100',
      },
      context: {
        cookieId: 'cookie-100',
        ipWebrtc: '172.16.0.100',
        affiliateId: 'aff-100',
      },
    }),
  })

  await registerUser({
    email: 'score80@mail.ru',
    name: 'Score 80',
    forwardedFor: '20.20.20.20',
    fingerprintEvent: createFingerprintEvent({
      fingerprint: {
        fHash: 'fhash-80',
        userAgent: 'UA-80',
      },
      context: {
        cookieId: 'cookie-80',
        ipWebrtc: '172.16.0.80',
        affiliateId: 'aff-80',
      },
    }),
  })

  await registerUser({
    email: 'score50@mail.ru',
    name: 'Score 50',
    forwardedFor: '10.10.10.10',
    fingerprintEvent: createFingerprintEvent({
      fingerprint: {
        fHash: 'fhash-50',
        canvasId: 'unique-canvas-50',
        audioId: 'unique-audio-50',
        webglVendor: 'Vendor-50',
        webglRenderer: 'Renderer-50',
        userAgent: 'UA-LOW-50',
      },
      context: {
        cookieId: 'cookie-50',
        ipWebrtc: '192.168.50.50',
        affiliateId: 'aff-50',
      },
    }),
  })

  await registerUser({
    email: 'score30@mail.ru',
    name: 'Score 30',
    forwardedFor: '10.10.10.10',
    fingerprintEvent: createFingerprintEvent({
      fingerprint: {
        fHash: 'fhash-30',
        canvasId: 'unique-canvas-30',
        audioId: 'unique-audio-30',
        webglVendor: 'Vendor-30',
        webglRenderer: 'Renderer-30',
        userAgent: 'UA-30',
      },
      context: {
        cookieId: 'cookie-30',
        ipWebrtc: '192.168.30.30',
        affiliateId: 'aff-low',
      },
    }),
  })

  printHeader('Analytics users')
  const analytics = await getAnalytics()
  for (const user of analytics.users) {
    console.log(
      `#${user.id} ${user.email} | fingerprints=${user.fingerprintCount} | related=${user.relatedAccountsCount} | topScore=${user.topConfidenceScore}`,
    )
  }

  printHeader('Anchor user related accounts')
  const relatedAccounts = await getRelatedAccounts(baseUser.user.id)
  for (const account of relatedAccounts) {
    console.log(
      `related_user_id=${account.related_user_id} | score=${account.confidence_score} | reasons=${account.match_reasons.join(',')}`,
    )
  }

  printHeader('Expected direct scores from anchor')
  console.log('score100@mail.ru -> 100')
  console.log('score80@mail.ru -> 80')
  console.log('score50@mail.ru -> 50')
  console.log('score30@mail.ru -> 30')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
