import cron from 'node-cron'
import { db } from '../db/client'
import { getQuote } from '../lib/alpaca'
import { marcusBullChen, priyaSharma } from '@mockket/agents'
import { sendPushToUser } from '../lib/fcm'

async function generateRecommendations(agentId: string) {
  const agent = agentId === 'marcus-bull-chen' ? marcusBullChen : priyaSharma

  // Find advisory hires for this agent
  const { rows: hires } = await db.query(
    `SELECT ah.*, u.portfolio_cash FROM agent_hires ah
     JOIN users u ON u.id = ah.user_id
     WHERE ah.agent_id = $1 AND ah.mode = 'advisory'
       AND ah.is_active = TRUE AND ah.is_paused = FALSE`,
    [agentId]
  )

  for (const hire of hires) {
    // Check: has this agent already sent a recommendation today?
    const { rows: existing } = await db.query(
      `SELECT id FROM agent_recommendations
       WHERE user_id = $1 AND agent_id = $2
         AND created_at > NOW() - INTERVAL '24 hours'
         AND status = 'pending'`,
      [hire.user_id, agentId]
    )
    if (existing.length > 0) continue

    // Generate a recommendation (simplified: pick a ticker from watchlist)
    const watchlist = agentId === 'marcus-bull-chen'
      ? ['NVDA', 'TSLA', 'AMD']
      : ['JNJ', 'MSFT', 'AAPL']

    const ticker = watchlist[Math.floor(Math.random() * watchlist.length)]
    const quote = await getQuote(ticker)
    const quantity = Math.floor(1000 / quote.ask) // ~$1000 position
    if (quantity < 1) continue

    const action = 'buy'
    const rationale = agent.getRationale({
      id: '',
      userId: hire.user_id,
      agentId,
      ticker,
      action,
      quantity,
      priceAtExecution: quote.ask,
      rationale: '',
      challengeId: null,
      executedAt: new Date().toISOString(),
    })

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const { rows } = await db.query(
      `INSERT INTO agent_recommendations
         (user_id, agent_hire_id, agent_id, ticker, action, quantity, rationale, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [hire.user_id, hire.id, agentId, ticker, action, quantity, rationale, expiresAt]
    )

    const recId = rows[0].id

    // Push notification
    await sendPushToUser(
      hire.user_id,
      `${agent.shortName} has a recommendation`,
      `${action.toUpperCase()} ${ticker} — tap to review`,
      { url: `https://mockket.app/recommendation/${recId}` },
      db
    )
  }
}

// Run once daily at 9:30am ET (market open)
export function startRecommendationCron() {
  cron.schedule('30 9 * * 1-5', () => {
    generateRecommendations('marcus-bull-chen')
    generateRecommendations('priya-sharma')
  }, { timezone: 'America/New_York' })
}
