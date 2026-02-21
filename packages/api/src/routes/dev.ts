import { Router } from 'express'
import { getStreamMode, setTestStream } from '../ws/alpaca-stream'

export const devRouter = Router()

// GET /dev/sim — current stream mode
devRouter.get('/sim', (_req, res) => {
  res.json({ mode: getStreamMode() })
})

// POST /dev/sim — toggle or set stream mode
// Body: { mode: 'test' | 'iex' }  (omit to toggle)
devRouter.post('/sim', (req, res) => {
  const { mode } = req.body as { mode?: 'test' | 'iex' }
  const current = getStreamMode()
  const next = mode === 'test' || mode === 'iex' ? mode : current === 'test' ? 'iex' : 'test'
  setTestStream(next === 'test')
  res.json({ mode: next })
})
