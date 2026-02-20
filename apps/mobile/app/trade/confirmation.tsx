import { StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Text } from '@/components/primitives'
import { api } from '@/lib/api/client'
import { tokens } from '@/design/tokens'

export default function TradeConfirmation() {
  const router = useRouter()
  const { ticker, action, quantity, price } = useLocalSearchParams<{
    ticker: string; action: 'buy' | 'sell'; quantity: string; price: string
  }>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const qty = parseFloat(quantity)
  const px = parseFloat(price)
  const total = qty * px

  async function confirm() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.post('/trades', { ticker, action, quantity: qty })
      router.replace({
        pathname: '/trade/success',
        params: { ticker, action, quantity, price, dayTradeCount: data.dayTradeCount },
      })
    } catch (err: any) {
      setError(err.message ?? 'Trade failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="heading" style={styles.title}>Confirm {action === 'buy' ? 'Buy' : 'Sell'}</Text>

      <View style={styles.card}>
        <Row label="Ticker" value={ticker} />
        <Row label="Action" value={action.toUpperCase()} />
        <Row label="Shares" value={qty.toString()} />
        <Row label={action === 'buy' ? 'Ask price' : 'Bid price'} value={`$${px.toFixed(2)}`} />
        <View style={styles.divider} />
        <Row label="Total" value={`$${total.toFixed(2)}`} bold />
      </View>

      <Text variant="caption" color="secondary" style={styles.disclaimer}>
        {action === 'buy'
          ? 'Fills at the ask price. Price may vary slightly during execution.'
          : 'Fills at the bid price. Price may vary slightly during execution.'}
      </Text>

      {error && <Text variant="caption" style={{ color: tokens.colors.negative, marginBottom: tokens.spacing[3] }}>{error}</Text>}

      <TouchableOpacity style={[styles.cta, loading && styles.ctaDisabled]} onPress={confirm} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text variant="label" style={{ color: '#fff' }}>
            Confirm {action === 'buy' ? 'Buy' : 'Sell'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancel} onPress={() => router.back()}>
        <Text variant="label" color="secondary">Cancel</Text>
      </TouchableOpacity>
    </View>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <Text variant="caption" color="secondary">{label}</Text>
      <Text variant={bold ? 'label' : 'caption'}>{value}</Text>
    </View>
  )
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.spacing[2] },
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
    padding: tokens.spacing[4],
    paddingTop: 60,
  },
  title: { marginBottom: tokens.spacing[6] },
  card: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[4],
  },
  divider: {
    height: 1,
    backgroundColor: tokens.colors.border.default,
    marginVertical: tokens.spacing[2],
  },
  disclaimer: {
    marginBottom: tokens.spacing[6],
    lineHeight: 18,
  },
  cta: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    alignItems: 'center',
    marginBottom: tokens.spacing[3],
  },
  ctaDisabled: { opacity: 0.6 },
  cancel: {
    padding: tokens.spacing[4],
    alignItems: 'center',
  },
})
