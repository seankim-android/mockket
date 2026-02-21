import cron from 'node-cron'
import { db } from '../db/client'
import { getQuotes } from '../lib/alpaca'
import { marcusBullChen, priyaSharma } from '@mockket/agents'
import { sendPushToUser } from '../lib/fcm'
import type { AgentModule } from '@mockket/agents'

const AGENTS: AgentModule[] = [marcusBullChen, priyaSharma]

async function generateRecommendations(agentId: string) {
  const agent = AGENTS.find(a => a.id === agentId)
  if (!agent) return

  const { rows: hires } = await db.query(
    `SELECT ah.*, u.portfolio_cash FROM agent_hires ah
     JOIN users u ON u.id = ah.user_id
     WHERE ah.agent_id = $1 AND ah.mode = 'advisory'
       AND ah.is_active = TRUE AND ah.is_paused = FALSE`,
    [agentId]
  )

  for (const hire of hires) {
    try {
      // Check: has this agent already sent a recommendation today?
      const { rows: existing } = await db.query(
        `SELECT id FROM agent_recommendations
         WHERE user_id = $1 AND agent_id = $2
           AND created_at > NOW() - INTERVAL '24 hours'
           AND status = 'pending'`,
        [hire.user_id, agentId]
      )
      if (existing.length > 0) continue

      // Get agent's current holdings for this hire
      const { rows: holdingRows } = await db.query(
        `SELECT ticker, quantity, avg_cost FROM holdings
         WHERE user_id = $1 AND agent_hire_id = $2`,
        [hire.user_id, hire.id]
      )

      // Fetch current prices for all held tickers + agent watchlist
      const watchlist = agentId === 'marcus-bull-chen'
        ? ['NVDA', 'TSLA', 'AMD', 'META', 'AMZN']
        : ['JNJ', 'MSFT', 'AAPL', 'KO', 'PG']
      const heldTickers = holdingRows.map((h: any) => h.ticker)
      const allTickers = [...new Set([...heldTickers, ...watchlist])]

      const quotes = await getQuotes(allTickers)
      const priceMap = Object.fromEntries(quotes.map(q => [q.ticker, q.mid]))

      const portfolio = {
        cash: Number(hire.allocated_cash),
        holdings: holdingRows.map((h: any) => ({
          ticker: h.ticker,
          quantity: Number(h.quantity),
          avgCost: Number(h.avg_cost),
          currentPrice: priceMap[h.ticker] ?? 0,
        })),
      }

      // Use agent's rebalance logic to determine what trades to recommend
      const trades = await agent.rebalance(portfolio, {
        prices: priceMap,
        ask: Object.fromEntries(quotes.map(q => [q.ticker, q.ask])),
        bid: Object.fromEntries(quotes.map(q => [q.ticker, q.bid])),
        timestamp: new Date().toISOString(),
      })

      if (trades.length === 0) continue

      // Take the first trade as today's recommendation
      const trade = trades[0]
      const quote = quotes.find(q => q.ticker === trade.ticker)
      if (!quote) continue

      const price = trade.action === 'buy' ? quote.ask : quote.bid
      // For advisory recommendations, target ~$1000 position size for buys
      // For sells, recommend selling the full quantity the agent would sell
      const quantity = trade.action === 'buy'
        ? Math.max(1, Math.floor(1000 / price))
        : trade.quantity

      if (quantity < 1) continue

      const rationale = agent.getRationale({
        ...trade,
        userId: hire.user_id,
        priceAtExecution: price,
        quantity,
      })

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

      const { rows } = await db.query(
        `INSERT INTO agent_recommendations
           (user_id, agent_hire_id, agent_id, ticker, action, quantity, rationale, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [hire.user_id, hire.id, agentId, trade.ticker, trade.action, quantity, rationale, expiresAt]
      )

      const recId = rows[0].id
      await sendPushToUser(
        hire.user_id,
        `${agent.shortName} has a recommendation`,
        `${trade.action.toUpperCase()} ${trade.ticker} — tap to review`,
        { url: `https://mockket.app/recommendation/${recId}` },
      )
    } catch (err) {
      console.error(`[recommendations] Failed for hire ${hire.id}:`, err)
    }
  }
}

// Run once daily at 9:30am ET (market open)
export function startRecommendationCron() {
  cron.schedule('30 9 * * 1-5', async () => {
    await Promise.allSettled([
      generateRecommendations('marcus-bull-chen'),
      generateRecommendations('priya-sharma'),
    ])
  }, { timezone: 'America/New_York' })
}
