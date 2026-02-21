const RC_BASE = 'https://api.revenuecat.com/v1'

interface RcTransaction {
  id: string
  purchase_date: string
  store_transaction_id: string
}

interface RcSubscriberResponse {
  subscriber: {
    non_subscriptions: Record<string, RcTransaction[]>
  }
}

async function getSubscriber(userId: string): Promise<RcSubscriberResponse | null> {
  const res = await fetch(`${RC_BASE}/subscribers/${encodeURIComponent(userId)}`, {
    headers: {
      Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) return null
  return res.json() as Promise<RcSubscriberResponse>
}

// Returns all RevenueCat transaction IDs for the portfolio reset product for this user.
// Returns an empty array if the user has no purchases or the API call fails.
export async function getPortfolioResetTransactionIds(userId: string): Promise<string[]> {
  const data = await getSubscriber(userId)
  if (!data) return []
  const purchases = data.subscriber.non_subscriptions['mockket_portfolio_reset'] ?? []
  return purchases.map((p) => p.id)
}
