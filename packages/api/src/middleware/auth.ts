import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_JWT_SECRET) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // Fast path: verify JWT locally using Supabase JWT secret
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as { sub?: string }
    if (!decoded.sub) throw new Error('No sub claim')
    res.locals.userId = decoded.sub
    return next()
  } catch {
    // Fallback: remote verification (handles key rotation edge cases)
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) return res.status(401).json({ error: 'Unauthorized' })
      res.locals.userId = user.id
      next()
    } catch {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }
}
