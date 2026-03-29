import axios from 'axios'

import type {
  AnalyticsUser,
  FingerprintEventDto,
  RelatedAccount,
  UserDetails,
} from '../types'
import { loadFingerprintEvent } from './loadCollector'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

type ActivityTrackParams = {
  userId: number
  activityType: string
  activityTarget?: string
}

type TrackedActionParams<T> = ActivityTrackParams & {
  operation: () => Promise<T>
}

export async function fetchAnalyticsUsers(): Promise<AnalyticsUser[]> {
  const response = await api.get<{ users: AnalyticsUser[] }>('/analytics/relationships')
  return response.data.users
}

export async function fetchRelatedAccounts(userId: number): Promise<RelatedAccount[]> {
  const response = await api.get<RelatedAccount[]>(`/users/${userId}/related-accounts`)
  return response.data
}

export async function fetchUserDetails(userId: number): Promise<UserDetails> {
  const response = await api.get<UserDetails>(`/users/${userId}/fingerprints`)
  return response.data
}

export async function registerUser(payload: {
  name?: string
  email: string
  fingerprintEvent: FingerprintEventDto
}): Promise<{ user: UserDetails['user'] }> {
  const response = await api.post('/auth/register', payload)
  return response.data
}

export async function loginUser(payload: {
  userId?: number
  email?: string
  fingerprintEvent: FingerprintEventDto
}): Promise<{ user: UserDetails['user'] }> {
  const response = await api.post('/auth/login', payload)
  return response.data
}

export async function activatePromo(payload: {
  userId: number
  promoCode: string
  fingerprintEvent: FingerprintEventDto
}): Promise<{ user_id: number; promo_code: string; success: boolean }> {
  const response = await api.post('/promos/activate', payload)
  return response.data
}

export async function resetDemoData(): Promise<{ success: boolean; message: string }> {
  const response = await api.post<{ success: boolean; message: string }>('/admin/reset-demo-data')
  return response.data
}

export async function trackUserActivity(params: ActivityTrackParams): Promise<void> {
  const collected = await loadFingerprintEvent('activity')

  await api.post('/activity/track', {
    userId: params.userId,
    fingerprintEvent: {
      ...collected.event,
      context: {
        ...collected.event.context,
        activityType: params.activityType,
        activityTarget: params.activityTarget,
      },
    },
  })
}

export async function withTrackedUserAction<T>(params: TrackedActionParams<T>): Promise<T> {
  const result = await params.operation()

  void trackUserActivity({
    userId: params.userId,
    activityType: params.activityType,
    activityTarget: params.activityTarget,
  }).catch((error: unknown) => {
    console.error('Activity tracking failed', error)
  })

  return result
}
