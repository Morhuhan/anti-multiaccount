import { Router } from 'express'

import { resetDemoData } from '../controllers/adminController'
import { trackActivity } from '../controllers/activityController'
import { getRelationships } from '../controllers/analyticsController'
import { login, register } from '../controllers/authController'
import { activatePromo } from '../controllers/promoController'
import {
  getUserFingerprints,
  getUserRelatedAccounts,
} from '../controllers/userController'

export const apiRouter = Router()

apiRouter.post('/auth/register', register)
apiRouter.post('/auth/login', login)
apiRouter.post('/promos/activate', activatePromo)
apiRouter.post('/activity/track', trackActivity)
apiRouter.post('/admin/reset-demo-data', resetDemoData)
apiRouter.get('/users/:userId/related-accounts', getUserRelatedAccounts)
apiRouter.get('/users/:userId/fingerprints', getUserFingerprints)
apiRouter.get('/analytics/relationships', getRelationships)
