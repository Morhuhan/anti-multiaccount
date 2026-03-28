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
  const [actionState, setActionState] = useState('Ожидание')
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
      const [details, related] = await Promise.all([
        fetchUserDetails(userId),
        fetchRelatedAccounts(userId),
      ])

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
    setActionState('Сбор отпечатка для регистрации...')

    try {
      const collected = await loadFingerprintEvent('register')
      setLastCollectedData(collected)
      setActionState(
        collected.meta.formWasReset
          ? 'Форма была открыта слишком долго, таймер регистрации сброшен'
          : 'Отправка регистрации...',
      )

      const response = await registerUser({
        name: registerForm.name || undefined,
        email: registerForm.email,
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
      setActionState(`Пользователь #${response.user.id} зарегистрирован`)
      await refreshAnalytics(response.user.id)
      await loadUserPanel(response.user.id)
    } catch (error) {
      setActionState('Ошибка регистрации')
      setErrorMessage(extractErrorMessage(error))
    }
  }

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setActionState('Сбор отпечатка для входа...')

    try {
      const collected = await loadFingerprintEvent('login')
      setLastCollectedData(collected)
      setActionState('Отправка входа...')

      const response = await loginUser({
        email: loginForm.email || undefined,
        userId: loginForm.userId ? Number.parseInt(loginForm.userId, 10) : undefined,
        fingerprintEvent: collected.event,
      })

      setActionState(`Отпечаток входа записан для пользователя #${response.user.id}`)
      await refreshAnalytics(response.user.id)
      await loadUserPanel(response.user.id)
    } catch (error) {
      setActionState('Ошибка входа')
      setErrorMessage(extractErrorMessage(error))
    }
  }

  async function handlePromoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setActionState('Сбор отпечатка для промокода...')

    try {
      const collected = await loadFingerprintEvent(
        'promo_activation',
        promoForm.promoCode,
      )
      setLastCollectedData(collected)
      setActionState('Отправка активации промокода...')

      const response = await activatePromo({
        userId: Number.parseInt(promoForm.userId, 10),
        promoCode: promoForm.promoCode,
        fingerprintEvent: collected.event,
      })

      setActionState(`Промокод активирован для пользователя #${response.user_id}`)
      await refreshAnalytics(response.user_id)
      await loadUserPanel(response.user_id)
    } catch (error) {
      setActionState('Ошибка активации промокода')
      setErrorMessage(extractErrorMessage(error))
    }
  }

  async function handleResetDatabase(): Promise<void> {
    setErrorMessage(null)
    setActionState('Очистка базы...')

    try {
      await resetDemoData()
      setAnalyticsUsers([])
      setSelectedUserId(null)
      setSelectedUserDetails(null)
      setRelatedAccounts([])
      setLastCollectedData(null)
      setActionState('База очищена')
      await refreshAnalytics()
    } catch (error) {
      setActionState('Ошибка очистки базы')
      setErrorMessage(extractErrorMessage(error))
    }
  }

  return (
    <main className="app">
      <h1>Анти-мультиаккаунт</h1>
      <p className="subtitle">Только функциональный интерфейс для демо и проверки связей.</p>

      <section className="block">
        <h2>Статус</h2>
        <p>Текущее состояние: {actionState}</p>
        <p>Пользователей в системе: {analyticsUsers.length}</p>
        <p>Выбранный пользователь: {selectedUserId ?? 'не выбран'}</p>
        <button type="button" onClick={() => void handleResetDatabase()}>
          Очистить базу полностью
        </button>
        {errorMessage ? <p className="error">Ошибка: {errorMessage}</p> : null}
      </section>

      <section className="block">
        <h2>Текущие собранные данные</h2>
        {lastCollectedData ? (
          <>
            <p>Время сбора: {new Date(lastCollectedData.meta.collectedAt).toLocaleString()}</p>
            <p>
              Время от загрузки до отправки формы:{' '}
              {lastCollectedData.meta.registrationSpeedMs ?? 'не применяется'} мс
            </p>
            <p>
              Форма устарела и таймер был сброшен:{' '}
              {lastCollectedData.meta.formWasReset ? 'да' : 'нет'}
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
          <p>Пока ничего не собрано. Отправьте любую форму.</p>
        )}
      </section>

      <section className="block">
        <h2>Действия</h2>
        <div className="forms">
          <form onSubmit={handleRegisterSubmit} className="form">
            <h3>Регистрация</h3>
            <input
              placeholder="Имя"
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
              placeholder="Провайдер"
              value={registerForm.provider}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  provider: event.target.value,
                }))
              }
            />
            <input
              placeholder="ID аккаунта провайдера"
              value={registerForm.providerAccountId}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  providerAccountId: event.target.value,
                }))
              }
            />
            <button type="submit">Зарегистрировать</button>
          </form>

          <form onSubmit={handleLoginSubmit} className="form">
            <h3>Вход</h3>
            <input
              type="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={(event) =>
                setLoginForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <input
              placeholder="или ID пользователя"
              value={loginForm.userId}
              onChange={(event) =>
                setLoginForm((current) => ({ ...current, userId: event.target.value }))
              }
            />
            <button type="submit">Записать вход</button>
          </form>

          <form onSubmit={handlePromoSubmit} className="form">
            <h3>Активация промокода</h3>
            <input
              required
              placeholder="ID пользователя"
              value={promoForm.userId}
              onChange={(event) =>
                setPromoForm((current) => ({ ...current, userId: event.target.value }))
              }
            />
            <input
              required
              placeholder="Промокод"
              value={promoForm.promoCode}
              onChange={(event) =>
                setPromoForm((current) => ({ ...current, promoCode: event.target.value }))
              }
            />
            <button type="submit">Активировать</button>
          </form>
        </div>
      </section>

      <section className="block">
        <div className="section-head">
          <h2>Пользователи</h2>
          <button type="button" onClick={() => void refreshAnalytics(selectedUserId ?? undefined)}>
            {loadingAnalytics ? 'Обновление...' : 'Обновить'}
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Отпечатков</th>
              <th>Связей</th>
              <th>Макс. score</th>
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
                <td colSpan={5}>Пока нет пользователей.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="block">
        <h2>Связанные аккаунты</h2>
        <p>{loadingDetails ? 'Загрузка...' : `Найдено связей: ${relatedAccounts.length}`}</p>
        <table>
          <thead>
            <tr>
              <th>ID связанного пользователя</th>
              <th>Score</th>
              <th>Причины</th>
              <th>Совпавших событий</th>
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
                <td colSpan={4}>Для выбранного пользователя связей не найдено.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="block">
        <h2>История отпечатков</h2>
        {selectedUserDetails ? (
          <>
            <p>
              Пользователь: #{selectedUserDetails.user.id} {selectedUserDetails.user.email}
            </p>
            <p>
              Внешние аккаунты:{' '}
              {selectedUserDetails.authAccounts.length > 0
                ? selectedUserDetails.authAccounts
                    .map((account) => `${account.provider}:${account.providerAccountId}`)
                    .join(', ')
                : 'нет'}
            </p>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Событие</th>
                  <th>f_hash</th>
                  <th>IP</th>
                  <th>WebRTC</th>
                  <th>Cookie</th>
                  <th>Affiliate</th>
                  <th>Время</th>
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
          <p>Выберите пользователя, чтобы посмотреть его историю.</p>
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

  return 'Неизвестная ошибка'
}

export default App
