import { startTransition, useEffect, useState } from 'react'
import axios from 'axios'

import './App.css'
import {
  activatePromo,
  fetchAnalyticsUsers,
  fetchRelatedAccounts,
  fetchUserDetails,
  loginUser,
  registerUser,
  resetDemoData,
  withTrackedUserAction,
} from './lib/api'
import { loadFingerprintEvent } from './lib/loadCollector'
import type {
  AnalyticsUser,
  FingerprintCollectionResult,
  RelatedAccount,
  UserDetails,
} from './types'

function App() {
  const [analyticsUsers, setAnalyticsUsers] = useState<AnalyticsUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserDetails | null>(null)
  const [relatedAccounts, setRelatedAccounts] = useState<RelatedAccount[]>([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [actionState, setActionState] = useState('РћР¶РёРґР°РЅРёРµ')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastCollectedData, setLastCollectedData] =
    useState<FingerprintCollectionResult | null>(null)

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    provider: '',
    providerAccountId: '',
  })
  const [loginForm, setLoginForm] = useState({
    email: '',
    userId: '',
  })
  const [promoForm, setPromoForm] = useState({
    userId: '',
    promoCode: '',
  })

  async function refreshAnalytics(preferredUserId?: number): Promise<void> {
    setLoadingAnalytics(true)

    try {
      const users = await fetchAnalyticsUsers()
      startTransition(() => {
        setAnalyticsUsers(users)
        setSelectedUserId((current) => {
          if (preferredUserId) {
            return preferredUserId
          }

          if (current && users.some((user) => user.id === current)) {
            return current
          }

          return users[0]?.id ?? null
        })
      })
    } finally {
      setLoadingAnalytics(false)
    }
  }

  async function loadUserPanel(userId: number): Promise<void> {
    setLoadingDetails(true)

    try {
      const [details, related] = await withTrackedUserAction({
        userId,
        activityType: 'open_user_panel',
        activityTarget: String(userId),
        operation: async () =>
          Promise.all([
            fetchUserDetails(userId),
            fetchRelatedAccounts(userId),
          ]),
      })

      startTransition(() => {
        setSelectedUserDetails(details)
        setRelatedAccounts(related)
      })
    } finally {
      setLoadingDetails(false)
    }
  }

  useEffect(() => {
    void refreshAnalytics()
  }, [])

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUserDetails(null)
      setRelatedAccounts([])
      return
    }

    void loadUserPanel(selectedUserId)
  }, [selectedUserId])

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    const email = registerForm.email.trim()

    if (!isValidEmail(email)) {
      setActionState('РџСЂРѕРІРµСЂРєР° С„РѕСЂРјС‹')
      setErrorMessage('Р’РІРµРґРёС‚Рµ РєРѕСЂСЂРµРєС‚РЅС‹Р№ email Р°РґСЂРµСЃ')
      return
    }
    setActionState('РЎР±РѕСЂ РѕС‚РїРµС‡Р°С‚РєР° РґР»СЏ СЂРµРіРёСЃС‚СЂР°С†РёРё...')

    try {
      const collected = await loadFingerprintEvent('register')
      setLastCollectedData(collected)
      setActionState(
        collected.meta.formWasReset
          ? 'Р¤РѕСЂРјР° Р±С‹Р»Р° РѕС‚РєСЂС‹С‚Р° СЃР»РёС€РєРѕРј РґРѕР»РіРѕ, С‚Р°Р№РјРµСЂ СЂРµРіРёСЃС‚СЂР°С†РёРё СЃР±СЂРѕС€РµРЅ'
          : 'РћС‚РїСЂР°РІРєР° СЂРµРіРёСЃС‚СЂР°С†РёРё...',
      )

      const response = await registerUser({
        name: registerForm.name || undefined,
        email,
        fingerprintEvent: {
          ...collected.event,
          authAccount:
            registerForm.provider && registerForm.providerAccountId
              ? {
                  provider: registerForm.provider,
                  providerAccountId: registerForm.providerAccountId,
                }
              : undefined,
        },
      })

      setRegisterForm({
        name: '',
        email: '',
        provider: '',
        providerAccountId: '',
      })
      setActionState(`РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ #${response.user.id} Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°РЅ`)
      await refreshAnalytics(response.user.id)
    } catch (error) {
      setActionState('РћС€РёР±РєР° СЂРµРіРёСЃС‚СЂР°С†РёРё')
      setErrorMessage(extractErrorMessage(error))
    }
  }

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    const email = loginForm.email.trim()

    if (email && !isValidEmail(email)) {
      setActionState('РџСЂРѕРІРµСЂРєР° С„РѕСЂРјС‹')
      setErrorMessage('Р’РІРµРґРёС‚Рµ РєРѕСЂСЂРµРєС‚РЅС‹Р№ email Р°РґСЂРµСЃ')
      return
    }
    setActionState('РЎР±РѕСЂ РѕС‚РїРµС‡Р°С‚РєР° РґР»СЏ РІС…РѕРґР°...')

    try {
      const collected = await loadFingerprintEvent('login')
      setLastCollectedData(collected)
      setActionState('РћС‚РїСЂР°РІРєР° РІС…РѕРґР°...')

      const response = await loginUser({
        email: email || undefined,
        userId: loginForm.userId ? Number.parseInt(loginForm.userId, 10) : undefined,
        fingerprintEvent: collected.event,
      })

      setActionState(`РћС‚РїРµС‡Р°С‚РѕРє РІС…РѕРґР° Р·Р°РїРёСЃР°РЅ РґР»СЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ #${response.user.id}`)
      await refreshAnalytics(response.user.id)
    } catch (error) {
      setActionState('РћС€РёР±РєР° РІС…РѕРґР°')
      setErrorMessage(extractErrorMessage(error))
    }
  }

  async function handlePromoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setActionState('РЎР±РѕСЂ РѕС‚РїРµС‡Р°С‚РєР° РґР»СЏ РїСЂРѕРјРѕРєРѕРґР°...')

    try {
      const collected = await loadFingerprintEvent(
        'promo_activation',
        promoForm.promoCode,
      )
      setLastCollectedData(collected)
      setActionState('РћС‚РїСЂР°РІРєР° Р°РєС‚РёРІР°С†РёРё РїСЂРѕРјРѕРєРѕРґР°...')

      const response = await activatePromo({
        userId: Number.parseInt(promoForm.userId, 10),
        promoCode: promoForm.promoCode,
        fingerprintEvent: collected.event,
      })

      setActionState(`РџСЂРѕРјРѕРєРѕРґ Р°РєС‚РёРІРёСЂРѕРІР°РЅ РґР»СЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ #${response.user_id}`)
      await refreshAnalytics(response.user_id)
    } catch (error) {
      setActionState('РћС€РёР±РєР° Р°РєС‚РёРІР°С†РёРё РїСЂРѕРјРѕРєРѕРґР°')
      setErrorMessage(extractErrorMessage(error))
    }
  }

  async function handleResetDatabase(): Promise<void> {
    setErrorMessage(null)
    setActionState('РћС‡РёСЃС‚РєР° Р±Р°Р·С‹...')

    try {
      await resetDemoData()
      setAnalyticsUsers([])
      setSelectedUserId(null)
      setSelectedUserDetails(null)
      setRelatedAccounts([])
      setLastCollectedData(null)
      setActionState('Р‘Р°Р·Р° РѕС‡РёС‰РµРЅР°')
      await refreshAnalytics()
    } catch (error) {
      setActionState('РћС€РёР±РєР° РѕС‡РёСЃС‚РєРё Р±Р°Р·С‹')
      setErrorMessage(extractErrorMessage(error))
    }
  }

  return (
    <main className="app">
      <h1>РђРЅС‚Рё-РјСѓР»СЊС‚РёР°РєРєР°СѓРЅС‚</h1>
      <p className="subtitle">РўРѕР»СЊРєРѕ С„СѓРЅРєС†РёРѕРЅР°Р»СЊРЅС‹Р№ РёРЅС‚РµСЂС„РµР№СЃ РґР»СЏ РґРµРјРѕ Рё РїСЂРѕРІРµСЂРєРё СЃРІСЏР·РµР№.</p>

      <section className="block">
        <h2>РЎС‚Р°С‚СѓСЃ</h2>
        <p>РўРµРєСѓС‰РµРµ СЃРѕСЃС‚РѕСЏРЅРёРµ: {actionState}</p>
        <p>РџРѕР»СЊР·РѕРІР°С‚РµР»РµР№ РІ СЃРёСЃС‚РµРјРµ: {analyticsUsers.length}</p>
        <p>Р’С‹Р±СЂР°РЅРЅС‹Р№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ: {selectedUserId ?? 'РЅРµ РІС‹Р±СЂР°РЅ'}</p>
        <button type="button" onClick={() => void handleResetDatabase()}>
          РћС‡РёСЃС‚РёС‚СЊ Р±Р°Р·Сѓ РїРѕР»РЅРѕСЃС‚СЊСЋ
        </button>
        {errorMessage ? <p className="error">РћС€РёР±РєР°: {errorMessage}</p> : null}
      </section>

      <section className="block">
        <h2>РўРµРєСѓС‰РёРµ СЃРѕР±СЂР°РЅРЅС‹Рµ РґР°РЅРЅС‹Рµ</h2>
        {lastCollectedData ? (
          <>
            <p>Р’СЂРµРјСЏ СЃР±РѕСЂР°: {new Date(lastCollectedData.meta.collectedAt).toLocaleString()}</p>
            <p>
              Р’СЂРµРјСЏ РѕС‚ Р·Р°РіСЂСѓР·РєРё РґРѕ РѕС‚РїСЂР°РІРєРё С„РѕСЂРјС‹:{' '}
              {lastCollectedData.meta.registrationSpeedMs ?? 'РЅРµ РїСЂРёРјРµРЅСЏРµС‚СЃСЏ'} РјСЃ
            </p>
            <p>
              Р¤РѕСЂРјР° СѓСЃС‚Р°СЂРµР»Р° Рё С‚Р°Р№РјРµСЂ Р±С‹Р» СЃР±СЂРѕС€РµРЅ:{' '}
              {lastCollectedData.meta.formWasReset ? 'РґР°' : 'РЅРµС‚'}
            </p>
            <p>Canvas: {lastCollectedData.meta.diagnostics.canvas}</p>
            <p>Audio: {lastCollectedData.meta.diagnostics.audio}</p>
            <p>WebRTC: {lastCollectedData.meta.diagnostics.webrtc}</p>
            {lastCollectedData.meta.debug?.webrtc.length ? (
              <pre className="debug-box">
                {lastCollectedData.meta.debug.webrtc.join('\n')}
              </pre>
            ) : null}
            <pre className="debug-box">
              {JSON.stringify(lastCollectedData.event, null, 2)}
            </pre>
          </>
        ) : (
          <p>РџРѕРєР° РЅРёС‡РµРіРѕ РЅРµ СЃРѕР±СЂР°РЅРѕ. РћС‚РїСЂР°РІСЊС‚Рµ Р»СЋР±СѓСЋ С„РѕСЂРјСѓ.</p>
        )}
      </section>

      <section className="block">
        <h2>Р”РµР№СЃС‚РІРёСЏ</h2>
        <div className="forms">
          <form onSubmit={handleRegisterSubmit} className="form">
            <h3>Р РµРіРёСЃС‚СЂР°С†РёСЏ</h3>
            <input
              placeholder="РРјСЏ"
              value={registerForm.name}
              onChange={(event) =>
                setRegisterForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={registerForm.email}
              onChange={(event) =>
                setRegisterForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <input
              placeholder="РџСЂРѕРІР°Р№РґРµСЂ"
              value={registerForm.provider}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  provider: event.target.value,
                }))
              }
            />
            <input
              placeholder="ID Р°РєРєР°СѓРЅС‚Р° РїСЂРѕРІР°Р№РґРµСЂР°"
              value={registerForm.providerAccountId}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  providerAccountId: event.target.value,
                }))
              }
            />
            <button type="submit">Р—Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°С‚СЊ</button>
          </form>

          <form onSubmit={handleLoginSubmit} className="form">
            <h3>Р’С…РѕРґ</h3>
            <input
              type="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={(event) =>
                setLoginForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <input
              placeholder="РёР»Рё ID РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ"
              value={loginForm.userId}
              onChange={(event) =>
                setLoginForm((current) => ({ ...current, userId: event.target.value }))
              }
            />
            <button type="submit">Р—Р°РїРёСЃР°С‚СЊ РІС…РѕРґ</button>
          </form>

          <form onSubmit={handlePromoSubmit} className="form">
            <h3>РђРєС‚РёРІР°С†РёСЏ РїСЂРѕРјРѕРєРѕРґР°</h3>
            <input
              required
              placeholder="ID РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ"
              value={promoForm.userId}
              onChange={(event) =>
                setPromoForm((current) => ({ ...current, userId: event.target.value }))
              }
            />
            <input
              required
              placeholder="РџСЂРѕРјРѕРєРѕРґ"
              value={promoForm.promoCode}
              onChange={(event) =>
                setPromoForm((current) => ({ ...current, promoCode: event.target.value }))
              }
            />
            <button type="submit">РђРєС‚РёРІРёСЂРѕРІР°С‚СЊ</button>
          </form>
        </div>
      </section>

      <section className="block">
        <div className="section-head">
          <h2>РџРѕР»СЊР·РѕРІР°С‚РµР»Рё</h2>
          <button type="button" onClick={() => void refreshAnalytics(selectedUserId ?? undefined)}>
            {loadingAnalytics ? 'РћР±РЅРѕРІР»РµРЅРёРµ...' : 'РћР±РЅРѕРІРёС‚СЊ'}
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>РћС‚РїРµС‡Р°С‚РєРѕРІ</th>
              <th>РЎРІСЏР·РµР№</th>
              <th>РњР°РєСЃ. score</th>
            </tr>
          </thead>
          <tbody>
            {analyticsUsers.map((user) => (
              <tr
                key={user.id}
                className={selectedUserId === user.id ? 'selected' : ''}
                onClick={() => setSelectedUserId(user.id)}
              >
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>{user.fingerprintCount}</td>
                <td>{user.relatedAccountsCount}</td>
                <td>{user.topConfidenceScore}</td>
              </tr>
            ))}
            {analyticsUsers.length === 0 ? (
              <tr>
                <td colSpan={5}>РџРѕРєР° РЅРµС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="block">
        <h2>РЎРІСЏР·Р°РЅРЅС‹Рµ Р°РєРєР°СѓРЅС‚С‹</h2>
        <p>{loadingDetails ? 'Р—Р°РіСЂСѓР·РєР°...' : `РќР°Р№РґРµРЅРѕ СЃРІСЏР·РµР№: ${relatedAccounts.length}`}</p>
        <table>
          <thead>
            <tr>
              <th>ID СЃРІСЏР·Р°РЅРЅРѕРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ</th>
              <th>Score</th>
              <th>РџСЂРёС‡РёРЅС‹</th>
              <th>РЎРѕРІРїР°РІС€РёС… СЃРѕР±С‹С‚РёР№</th>
            </tr>
          </thead>
          <tbody>
            {relatedAccounts.map((account) => (
              <tr key={`${account.related_user_id}-${account.last_matched_at}`}>
                <td>{account.related_user_id}</td>
                <td>{account.confidence_score}</td>
                <td>{account.match_reasons.join(', ')}</td>
                <td>{account.matched_events_count}</td>
              </tr>
            ))}
            {selectedUserId && relatedAccounts.length === 0 ? (
              <tr>
                <td colSpan={4}>Р”Р»СЏ РІС‹Р±Р°РЅРЅРѕРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ СЃРІСЏР·РµР№ РЅРµ РЅР°Р№РґРµРЅРѕ.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="block">
        <h2>РСЃС‚РѕСЂРёСЏ РѕС‚РїРµС‡Р°С‚РєРѕРІ</h2>
        {selectedUserDetails ? (
          <>
            <p>
              РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ: #{selectedUserDetails.user.id} {selectedUserDetails.user.email}
            </p>
            <p>
              Р’РЅРµС€РЅРёРµ Р°РєРєР°СѓРЅС‚С‹:{' '}
              {selectedUserDetails.authAccounts.length > 0
                ? selectedUserDetails.authAccounts
                    .map((account) => `${account.provider}:${account.providerAccountId}`)
                    .join(', ')
                : 'РЅРµС‚'}
            </p>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>РЎРѕР±С‹С‚РёРµ</th>
                  <th>f_hash</th>
                  <th>IP</th>
                  <th>WebRTC</th>
                  <th>Cookie</th>
                  <th>Affiliate</th>
                  <th>Р’СЂРµРјСЏ</th>
                </tr>
              </thead>
              <tbody>
                {selectedUserDetails.fingerprints.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.eventType}</td>
                    <td>{item.fHash ?? '-'}</td>
                    <td>{item.ipPrimary ?? '-'}</td>
                    <td>{item.ipWebrtc ?? '-'}</td>
                    <td>{item.cookieId ?? '-'}</td>
                    <td>{item.affiliateId ?? '-'}</td>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p>Р’С‹Р±РµСЂРёС‚Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ, С‡С‚РѕР±С‹ РїРѕСЃРјРѕС‚СЂРµС‚СЊ РµРіРѕ РёСЃС‚РѕСЂРёСЋ.</p>
        )}
      </section>
    </main>
  )
}

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: string } | undefined)?.error ??
      error.message
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'РќРµРёР·РІРµСЃС‚РЅР°СЏ РѕС€РёР±РєР°'
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default App
