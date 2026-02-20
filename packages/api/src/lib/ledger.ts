import { db } from '../db/client'

interface TradeInput {
  userId: string
  agentId?: string
  agentHireId?: string
  challengeId?: string
  ticker: string
  action: 'buy' | 'sell'
  quantity: number
  price: number // ask for buy, bid for sell
  rationale?: string
}

export async function executeTrade(trade: TradeInput): Promise<void> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    if (trade.action === 'buy') {
      const cost = trade.quantity * trade.price

      // Deduct cash — fails if insufficient
      const { rows } = await client.query(
        `UPDATE users SET portfolio_cash = portfolio_cash - $1, updated_at = NOW()
         WHERE id = $2 AND portfolio_cash >= $1 RETURNING id`,
        [cost, trade.userId]
      )
      if (rows.length === 0) throw new Error('Insufficient cash')

      // Upsert holding — use partial index for main portfolio, full constraint for segments
      if (!trade.agentHireId && !trade.challengeId) {
        await client.query(
          `INSERT INTO holdings (user_id, agent_hire_id, challenge_id, ticker, quantity, avg_cost)
           VALUES ($1, NULL, NULL, $2, $3, $4)
           ON CONFLICT (user_id, ticker) WHERE agent_hire_id IS NULL AND challenge_id IS NULL
           DO UPDATE SET
             avg_cost = (holdings.quantity * holdings.avg_cost + $3 * $4) / (holdings.quantity + $3),
             quantity = holdings.quantity + $3`,
          [trade.userId, trade.ticker, trade.quantity, trade.price]
        )
      } else {
        await client.query(
          `INSERT INTO holdings (user_id, agent_hire_id, challenge_id, ticker, quantity, avg_cost)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, agent_hire_id, challenge_id, ticker)
           DO UPDATE SET
             avg_cost = (holdings.quantity * holdings.avg_cost + $5 * $6) / (holdings.quantity + $5),
             quantity = holdings.quantity + $5`,
          [trade.userId, trade.agentHireId ?? null, trade.challengeId ?? null,
           trade.ticker, trade.quantity, trade.price]
        )
      }
    } else {
      // Sell: reduce holding, return cash at bid price
      const proceeds = trade.quantity * trade.price

      const holdingResult = await client.query(
        `UPDATE holdings SET quantity = quantity - $1
         WHERE user_id = $2 AND ticker = $3 AND agent_hire_id IS NOT DISTINCT FROM $4
         AND challenge_id IS NOT DISTINCT FROM $5 AND quantity >= $1`,
        [trade.quantity, trade.userId, trade.ticker,
         trade.agentHireId ?? null, trade.challengeId ?? null]
      )
      if ((holdingResult.rowCount ?? 0) === 0) throw new Error('Insufficient holding quantity')

      await client.query(
        `UPDATE users SET portfolio_cash = portfolio_cash + $1, updated_at = NOW()
         WHERE id = $2`,
        [proceeds, trade.userId]
      )

      // Clean up zero-quantity holdings
      await client.query(
        `DELETE FROM holdings WHERE user_id = $1 AND ticker = $2 AND quantity = 0
         AND agent_hire_id IS NOT DISTINCT FROM $3 AND challenge_id IS NOT DISTINCT FROM $4`,
        [trade.userId, trade.ticker, trade.agentHireId ?? null, trade.challengeId ?? null]
      )
    }

    // Record trade in permanent ledger (never deleted)
    await client.query(
      `INSERT INTO trades (user_id, agent_id, agent_hire_id, ticker, action, quantity,
        price_at_execution, rationale, challenge_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [trade.userId, trade.agentId ?? null, trade.agentHireId ?? null,
       trade.ticker, trade.action, trade.quantity, trade.price,
       trade.rationale ?? '', trade.challengeId ?? null]
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getPortfolio(userId: string) {
  const client = await db.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ')

    const userRow = await client.query(
      `SELECT portfolio_cash FROM users WHERE id = $1`,
      [userId]
    )
    if (userRow.rows.length === 0) throw new Error('User not found')

    const holdingsRow = await client.query(
      `SELECT ticker, quantity, avg_cost FROM holdings
       WHERE user_id = $1 AND agent_hire_id IS NULL AND challenge_id IS NULL`,
      [userId]
    )

    await client.query('COMMIT')

    return {
      cash: Number(userRow.rows[0].portfolio_cash),
      holdings: holdingsRow.rows.map(h => ({
        ticker: h.ticker,
        quantity: Number(h.quantity),
        avgCost: Number(h.avg_cost),
      })),
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
