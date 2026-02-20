import { Router } from 'express'
import { db } from '../db/client'

export const configRouter = Router()

// GET /config/app-version?platform=ios|android
configRouter.get('/app-version', async (req, res) => {
  const platform = req.query.platform as string // 'ios' | 'android'
  const { rows } = await db.query(
    `SELECT version, minimum_version, update_mode FROM app_versions
     WHERE platform = $1 OR platform = 'both'
     ORDER BY created_at DESC LIMIT 1`,
    [platform]
  )

  if (!rows[0]) return res.json({ minimumVersion: '1.0.0', latestVersion: '1.0.0', updateMode: null })

  res.json({
    minimumVersion: rows[0].minimum_version,
    latestVersion: rows[0].version,
    updateMode: rows[0].update_mode,
  })
})

// GET /config/changelog?version=1.2.0
configRouter.get('/changelog', async (req, res) => {
  const { version } = req.query
  const { rows } = await db.query(
    `SELECT ce.type, ce.text, ce.sort_order
     FROM changelog_entries ce
     JOIN app_versions av ON av.id = ce.app_version_id
     WHERE av.version = $1
     ORDER BY ce.sort_order`,
    [version]
  )
  res.json(rows)
})
