import { Router, Request, Response, NextFunction } from 'express'
import { getStreamMode, setTestStream } from '../ws/alpaca-stream'

export const devRouter = Router()

// Bearer token guard — requires Authorization: Bearer <DEV_SECRET>
function requireDevSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.DEV_SECRET
  if (!secret) {
    res.status(503).json({ error: 'DEV_SECRET not configured' })
    return
  }
  const auth = req.headers.authorization ?? ''
  if (auth !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

devRouter.use(requireDevSecret)

// GET /dev/sim — current stream mode
devRouter.get('/sim', (_req, res) => {
  res.json({ mode: getStreamMode() })
})

// POST /dev/sim — set or toggle stream mode
// Body: { mode: 'test' | 'iex' }  (omit to toggle)
devRouter.post('/sim', (req, res) => {
  const { mode } = req.body as { mode?: 'test' | 'iex' }
  const current = getStreamMode()
  const next = mode === 'test' || mode === 'iex' ? mode : current === 'test' ? 'iex' : 'test'
  setTestStream(next === 'test')
  res.json({ mode: next })
})
