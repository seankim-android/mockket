import { Router } from 'express'
import { db } from '../db/client'

export const webhooksRouter = Router()

// RevenueCat webhook — update premium status
webhooksRouter.post('/revenuecat', async (req, res) => {
  const { event } = req.body
  if (!event) return res.status(400).end()

  const userId = event.app_user_id
  const isPremium = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE'].includes(event.type)
  const isExpired = ['EXPIRATION', 'CANCELLATION'].includes(event.type)

  if (isPremium) {
    await db.query(`UPDATE users SET is_premium = TRUE WHERE id = $1`, [userId])
  } else if (isExpired) {
    await db.query(`UPDATE users SET is_premium = FALSE WHERE id = $1`, [userId])
  }

  res.status(200).end()
})
