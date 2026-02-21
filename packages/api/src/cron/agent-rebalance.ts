import cron from 'node-cron'
import { db } from '../db/client'
import { executeTrade } from '../lib/ledger'
import { getQuotes } from '../lib/alpaca'
import { marcusBullChen, priyaSharma } from '@mockket/agents'
import type { AgentModule } from '@mockket/agents'

const AGENTS: AgentModule[] = [marcusBullChen, priyaSharma]

async function runAgentRebalance(agentId: string) {
  // Find all active hires for this agent
  const { rows: hires } = await db.query(
    `SELECT ah.*, u.portfolio_cash
     FROM agent_hires ah
     JOIN users u ON u.id = ah.user_id
     WHERE ah.agent_id = $1 AND ah.is_active = TRUE AND ah.is_paused = FALSE`,
    [agentId]
  )

  const agent = AGENTS.find(a => a.id === agentId)
  if (!agent) return

  for (const hire of hires) {
    try {
      // Get agent's holdings for this hire
      const { rows: holdingRows } = await db.query(
        `SELECT ticker, quantity, avg_cost FROM holdings
         WHERE user_id = $1 AND agent_hire_id = $2`,
        [hire.user_id, hire.id]
      )

      const heldTickers = holdingRows.map((h: { ticker: string }) => h.ticker)
      const allTickers = [...new Set([...heldTickers, ...agent.watchlist])]
      const prices = allTickers.length > 0 ? await getQuotes(allTickers) : []
      const priceMap = Object.fromEntries(prices.map(p => [p.ticker, p.mid]))
      const askMap = Object.fromEntries(prices.map(p => [p.ticker, p.ask]))
      const bidMap = Object.fromEntries(prices.map(p => [p.ticker, p.bid]))

      const portfolio = {
        cash: Number(hire.allocated_cash),
        holdings: holdingRows.map((h: any) => ({
          ticker: h.ticker,
          quantity: Number(h.quantity),
          avgCost: Number(h.avg_cost),
          currentPrice: priceMap[h.ticker] ?? 0,
        })),
      }

      const trades = await agent.rebalance(portfolio, {
        prices: priceMap,
        ask: askMap,
        bid: bidMap,
        timestamp: new Date().toISOString(),
      })

      for (const trade of trades) {
        try {
          const quote = await getQuotes([trade.ticker])
          const price = trade.action === 'buy' ? quote[0]?.ask : quote[0]?.bid
          if (!price) continue

          await executeTrade({
            userId: hire.user_id,
            agentId: agent.id,
            agentHireId: hire.id,
            ticker: trade.ticker,
            action: trade.action,
            quantity: trade.quantity,
            price,
            rationale: trade.rationale,
          })
        } catch (err: any) {
          console.error(`[agent-cron] trade failed for ${agentId}/${hire.user_id}/${trade.ticker}:`, err.message)
        }
      }
    } catch (err: any) {
      console.error(`[agent-cron] rebalance failed for ${agentId}/${hire.user_id}:`, err.message)
    }
  }
}

// Stocks: daily at 9:35am ET (5 min after market open)
export function startAgentCrons() {
  cron.schedule('35 9 * * 1-5', async () => {
    await Promise.allSettled([
      runAgentRebalance('marcus-bull-chen'),
      runAgentRebalance('priya-sharma'),
    ])
  }, { timezone: 'America/New_York' })

  // Crypto: every 6 hours, 24/7 (no timezone restriction)
  // Only run agents that handle crypto assets
  const CRYPTO_AGENTS = AGENTS.filter(a => a.assetClasses.includes('crypto'))

  cron.schedule('0 */6 * * *', async () => {
    await Promise.allSettled(
      CRYPTO_AGENTS.map(a => runAgentRebalance(a.id))
    )
  })
}
