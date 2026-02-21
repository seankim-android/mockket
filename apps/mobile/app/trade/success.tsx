import { useEffect } from 'react'
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text } from '@/components/primitives'
import { tokens } from '@/design/tokens'
import { api } from '@/lib/api/client'

interface AgentReaction {
  agentId: string
  agentName: string
  reaction: string
}

export default function TradeSuccess() {
  const router = useRouter()
  const { ticker, action, quantity, price, dayTradeCount, reactions: reactionsParam } = useLocalSearchParams<{
    ticker: string; action: string; quantity: string; price: string; dayTradeCount: string; reactions: string
  }>()
  const reactions: AgentReaction[] = reactionsParam ? JSON.parse(reactionsParam) : []
  const dtCount = dayTradeCount ? Number(dayTradeCount) : 0

  useEffect(() => {
    async function checkFirstTrade() {
      try {
        const ftue = await api.get<{ madeFirstTrade?: boolean }>('/users/ftue')
        if (!ftue.madeFirstTrade) {
          router.replace({
            pathname: '/trade/first-trade-moment',
            params: { ticker, action, quantity, price },
          })
        }
      } catch {
        // non-critical
      }
    }
    checkFirstTrade()
  }, [ticker, action, quantity, price, router])

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.iconWrapper}>
        <Text style={{ fontSize: 48 }}>✓</Text>
      </View>

      <Text variant="heading" style={styles.heading}>
        {action === 'buy' ? 'Bought' : 'Sold'} {quantity} {ticker}
      </Text>
      <Text variant="body" color="secondary" style={styles.sub}>
        at ${parseFloat(price).toFixed(2)} per share
      </Text>

      {dtCount >= 3 && (
        <View style={styles.pdtBanner}>
          <Text variant="label" style={styles.pdtTitle}>⚠️  PDT Warning</Text>
          <Text variant="caption" style={styles.pdtBody}>
            You've made {dtCount} day trades in the past 5 days. The SEC's Pattern Day Trader rule applies to accounts with 4+ day trades in 5 days.
          </Text>
        </View>
      )}

      {reactions.length > 0 && (
        <View style={styles.reactionsSection}>
          {reactions.map((r) => (
            <View key={r.agentId} style={styles.reactionCard}>
              <Text variant="label" style={styles.reactionAgent}>{r.agentName}</Text>
              <Text variant="caption" style={styles.reactionText}>{r.reaction}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.cta}
        onPress={() => router.replace('/(tabs)/')}
      >
        <Text variant="label" style={{ color: '#fff' }}>Back to Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondary}
        onPress={() => router.push(`/trade/${ticker}`)}
      >
        <Text variant="label" color="secondary">Trade Again</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing[6],
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.colors.brand.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing[6],
  },
  heading: { textAlign: 'center', marginBottom: tokens.spacing[2] },
  sub: { textAlign: 'center', marginBottom: tokens.spacing[8] },
  cta: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    paddingVertical: tokens.spacing[4],
    paddingHorizontal: tokens.spacing[8],
    marginBottom: tokens.spacing[3],
    width: '100%',
    alignItems: 'center',
  },
  secondary: {
    padding: tokens.spacing[4],
    width: '100%',
    alignItems: 'center',
  },
  pdtBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[4],
    width: '100%',
  },
  pdtTitle: {
    color: '#92400E',
    marginBottom: tokens.spacing[1],
  },
  pdtBody: {
    color: '#92400E',
    lineHeight: 18,
  },
  reactionsSection: {
    width: '100%',
    marginBottom: tokens.spacing[4],
    gap: tokens.spacing[3],
  },
  reactionCard: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    borderLeftWidth: 3,
    borderLeftColor: tokens.colors.brand.default,
    padding: tokens.spacing[4],
  },
  reactionAgent: {
    color: tokens.colors.brand.default,
    marginBottom: tokens.spacing[1],
  },
  reactionText: {
    color: tokens.colors.text.primary,
    lineHeight: 20,
  },
})
