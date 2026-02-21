import { useState } from 'react'
import { FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Text, Screen } from '@/components/primitives'
import { useLivePrices } from '@/features/markets/hooks/useLivePrices'
import { api } from '@/lib/api/client'
import { tokens } from '@/design/tokens'

type MarketStatus = 'open' | 'closed' | 'pre-market' | 'after-hours'

interface TickerInfo {
  ticker: string
  name: string
  type: 'stock' | 'crypto'
}

interface EarningsEntry {
  reportsAt: string
  isWithin7Days: boolean
}

const TICKERS: TickerInfo[] = [
  { ticker: 'AAPL', name: 'Apple', type: 'stock' },
  { ticker: 'MSFT', name: 'Microsoft', type: 'stock' },
  { ticker: 'NVDA', name: 'NVIDIA', type: 'stock' },
  { ticker: 'TSLA', name: 'Tesla', type: 'stock' },
  { ticker: 'AMD', name: 'AMD', type: 'stock' },
  { ticker: 'GOOGL', name: 'Alphabet', type: 'stock' },
  { ticker: 'AMZN', name: 'Amazon', type: 'stock' },
  { ticker: 'META', name: 'Meta', type: 'stock' },
  { ticker: 'BTC-USD', name: 'Bitcoin', type: 'crypto' },
  { ticker: 'ETH-USD', name: 'Ethereum', type: 'crypto' },
]

// Only stock tickers are queried — Polygon earnings don't cover crypto.
const STOCK_TICKERS = TICKERS.filter((t) => t.type === 'stock').map((t) => t.ticker)

const STATUS_COLORS: Record<MarketStatus, string> = {
  open: tokens.colors.positive,
  'pre-market': tokens.colors.warning,
  'after-hours': tokens.colors.warning,
  closed: tokens.colors.text.muted,
}

const STATUS_LABELS: Record<MarketStatus, string> = {
  open: 'OPEN',
  'pre-market': 'PRE-MARKET',
  'after-hours': 'AFTER-HOURS',
  closed: 'CLOSED',
}

export default function MarketsScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const prices = useLivePrices(TICKERS.map((t) => t.ticker))

  const { data: statusData } = useQuery<{ status: MarketStatus }>({
    queryKey: ['market-status'],
    queryFn: () => api.get<{ status: MarketStatus }>('/market-status'),
    refetchInterval: 60_000,
  })

  const { data: earningsData } = useQuery<Record<string, EarningsEntry>>({
    queryKey: ['earnings', STOCK_TICKERS],
    queryFn: () =>
      api.get<Record<string, EarningsEntry>>(
        `/markets/earnings?tickers=${STOCK_TICKERS.join(',')}`
      ),
    // Refresh once per hour — earnings dates don't change frequently.
    refetchInterval: 60 * 60_000,
    staleTime: 30 * 60_000,
  })

  const status = statusData?.status ?? 'closed'

  const filtered = TICKERS.filter(
    (t) =>
      t.ticker.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Screen>
      {/* Market status badge */}
      <View style={styles.header}>
        <Text variant="heading">Markets</Text>
        <View style={[styles.statusBadge, { borderColor: STATUS_COLORS[status] }]}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
          <Text variant="caption" style={{ color: STATUS_COLORS[status] }}>
            {STATUS_LABELS[status]}
          </Text>
        </View>
      </View>

      {/* Search */}
      <TextInput
        style={styles.search}
        placeholder="Search tickers..."
        placeholderTextColor={tokens.colors.text.muted}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="characters"
      />

      {/* Ticker list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.ticker}
        renderItem={({ item }) => {
          const price = prices[item.ticker]
          const hasEarnings = earningsData?.[item.ticker]?.isWithin7Days ?? false
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/trade/${item.ticker}`)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={styles.rowTitleRow}>
                  <Text variant="label">{item.ticker}</Text>
                  {hasEarnings && (
                    <View style={styles.earningsBadge}>
                      <Text variant="caption" style={{ color: tokens.colors.warning }}>EARNINGS</Text>
                    </View>
                  )}
                  {item.type === 'crypto' && (
                    <View style={styles.cryptoBadge}>
                      <Text variant="caption" style={{ color: tokens.colors.text.muted }}>24/7</Text>
                    </View>
                  )}
                </View>
                <Text variant="caption" color="secondary">{item.name}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text variant="mono">
                  {price ? `$${price.mid.toFixed(2)}` : '--'}
                </Text>
                {price && (
                  <Text variant="caption" color="secondary">
                    {`${price.bid.toFixed(2)} / ${price.ask.toFixed(2)}`}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing[4],
    marginBottom: tokens.spacing[3],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[1],
    borderWidth: 1,
    borderRadius: tokens.radii.full,
    paddingHorizontal: tokens.spacing[2],
    paddingVertical: tokens.spacing[1],
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  search: {
    backgroundColor: tokens.colors.bg.secondary,
    color: tokens.colors.text.primary,
    marginHorizontal: tokens.spacing[4],
    marginBottom: tokens.spacing[3],
    borderRadius: tokens.radii.md,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[2],
    fontSize: tokens.fontSize.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
  },
  rowLeft: {
    flex: 1,
    gap: tokens.spacing[1],
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[2],
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: tokens.spacing[1],
  },
  earningsBadge: {
    backgroundColor: '#FBBF2420',
    borderRadius: tokens.radii.sm,
    paddingHorizontal: tokens.spacing[1],
    paddingVertical: 2,
  },
  cryptoBadge: {
    backgroundColor: tokens.colors.bg.tertiary,
    borderRadius: tokens.radii.sm,
    paddingHorizontal: tokens.spacing[1],
    paddingVertical: 2,
  },
  separator: {
    height: 1,
    backgroundColor: tokens.colors.border.default,
    marginHorizontal: tokens.spacing[4],
  },
})
