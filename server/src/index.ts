import 'dotenv/config'

import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { sequelize } from './lib/db'
import { fingerprintAuditMiddleware } from './middleware/fingerprintAuditMiddleware'
import './models'
import { apiRouter } from './routes'
import { ApiError } from './utils/errors'

const app = express()
const port = Number.parseInt(process.env.PORT ?? '4000', 10)
const corsOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
)
app.use(helmet())
app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))
app.use(fingerprintAuditMiddleware)

app.get('/health', async (_req, res) => {
  await sequelize.authenticate()
  res.json({ status: 'ok' })
})

app.use('/api', apiRouter)

app.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }

    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.flatten(),
      })
      return
    }

    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  },
)

app.listen(port, () => {
  console.log(`Anti-multiaccount server listening on port ${port}`)
})
