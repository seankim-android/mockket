import { useState } from 'react'
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text } from '@/components/primitives'
import { useLivePrices } from '@/features/markets/hooks/useLivePrices'
import { tokens } from '@/design/tokens'

export default function TradeScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>()
  const router = useRouter()
  const prices = useLivePrices()
  const [action, setAction] = useState<'buy' | 'sell'>('buy')
  const [quantity, setQuantity] = useState('')

  const price = prices[ticker]
  const executionPrice = price ? (action === 'buy' ? price.ask : price.bid) : null
  const totalCost = executionPrice && quantity ? executionPrice * parseFloat(quantity) : null

  const canProceed = !!quantity && parseFloat(quantity) > 0 && !!executionPrice

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="heading" style={styles.title}>{ticker}</Text>

      {/* Buy/Sell toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, action === 'buy' && styles.toggleBuyActive]}
          onPress={() => setAction('buy')}
        >
          <Text variant="label" style={action === 'buy' ? { color: '#fff' } : { color: tokens.colors.text.secondary }}>
            Buy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, action === 'sell' && styles.toggleSellActive]}
          onPress={() => setAction('sell')}
        >
          <Text variant="label" style={action === 'sell' ? { color: '#fff' } : { color: tokens.colors.text.secondary }}>
            Sell
          </Text>
        </TouchableOpacity>
      </View>

      {/* Price info */}
      <View style={styles.priceCard}>
        <View style={styles.priceRow}>
          <Text variant="caption" color="secondary">Ask</Text>
          <Text variant="mono">{price ? `$${price.ask.toFixed(2)}` : '--'}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text variant="caption" color="secondary">Bid</Text>
          <Text variant="mono">{price ? `$${price.bid.toFixed(2)}` : '--'}</Text>
        </View>
        <View style={[styles.priceRow, styles.executionRow]}>
          <Text variant="label" color="secondary">
            {action === 'buy' ? 'You buy at the ask' : 'You sell at the bid'}
          </Text>
          <Text variant="label" style={{ color: action === 'buy' ? tokens.colors.positive : tokens.colors.negative }}>
            {executionPrice ? `$${executionPrice.toFixed(2)}` : '--'}
          </Text>
        </View>
      </View>

      {/* Quantity input */}
      <View style={styles.inputGroup}>
        <Text variant="label" color="secondary" style={styles.inputLabel}>Shares</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={tokens.colors.text.muted}
        />
      </View>

      {/* Total */}
      {totalCost !== null && (
        <View style={styles.totalRow}>
          <Text variant="body" color="secondary">Estimated total</Text>
          <Text variant="body">${totalCost.toFixed(2)}</Text>
        </View>
      )}

      {/* CTA */}
      <TouchableOpacity
        style={[styles.cta, !canProceed && styles.ctaDisabled]}
        disabled={!canProceed}
        onPress={() =>
          router.push({
            pathname: '/trade/confirmation',
            params: {
              ticker,
              action,
              quantity,
              price: executionPrice!.toFixed(2),
            },
          })
        }
      >
        <Text variant="label" style={{ color: '#fff' }}>
          Review {action === 'buy' ? 'Buy' : 'Sell'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bg.primary },
  content: { padding: tokens.spacing[4], paddingTop: 60 },
  title: { marginBottom: tokens.spacing[6] },
  toggle: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[1],
    marginBottom: tokens.spacing[4],
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: tokens.spacing[2],
    alignItems: 'center',
    borderRadius: tokens.radii.md,
  },
  toggleBuyActive: { backgroundColor: tokens.colors.positive },
  toggleSellActive: { backgroundColor: tokens.colors.negative },
  priceCard: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[4],
    gap: tokens.spacing[2],
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  executionRow: {
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.default,
    paddingTop: tokens.spacing[2],
    marginTop: tokens.spacing[1],
  },
  inputGroup: { marginBottom: tokens.spacing[4] },
  inputLabel: { marginBottom: tokens.spacing[2] },
  input: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing[3],
    color: tokens.colors.text.primary,
    fontSize: 24,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing[6],
  },
  cta: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.4 },
})
