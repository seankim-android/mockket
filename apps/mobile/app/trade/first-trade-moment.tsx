import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text } from '@/components/primitives'
import { tokens } from '@/design/tokens'
import { api } from '@/lib/api/client'
import { useFtue } from '@/features/ftue/useFtue'

export default function FirstTradeMoment() {
  const router = useRouter()
  const { ticker, action, quantity, price } = useLocalSearchParams<{
    ticker?: string; action?: string; quantity?: string; price?: string
  }>()
  const { markStep } = useFtue()

  async function handleContinue() {
    try {
      await api.post('/users/ftue', { made_first_trade: true })
      markStep({ mission1_trade_done: true, first_trade_annotation_shown: true })
    } catch {
      // non-critical
    }
    router.replace('/(tabs)/')
  }

  async function handleViewMarcus() {
    try {
      await api.post('/users/ftue', { made_first_trade: true })
      markStep({ mission1_trade_done: true, first_trade_annotation_shown: true })
    } catch {
      // non-critical
    }
    router.replace('/agent/marcus-bull-chen')
  }

  return (
    <View style={styles.container}>
      <View style={styles.checkCircle}>
        <Text style={{ fontSize: 32, color: '#fff' }}>✓</Text>
      </View>
      <Text variant="heading" style={styles.heading}>First trade in the books.</Text>
      {ticker && action && quantity && price && (
        <Text variant="body" color="secondary" style={styles.summary}>
          {action.toUpperCase()} {quantity} {ticker} at ${parseFloat(price).toFixed(2)}
        </Text>
      )}

      {ticker && (
        <TouchableOpacity
          style={styles.marcusCta}
          onPress={handleViewMarcus}
          accessibilityRole="button"
          accessibilityLabel={`See what Marcus would have done with ${ticker}`}
        >
          <Text variant="label" style={{ color: tokens.colors.brand.default }}>
            See what Marcus would have done with {ticker} →
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.cta}
        onPress={handleContinue}
        accessibilityRole="button"
        accessibilityLabel="Start trading"
      >
        <Text variant="label" style={{ color: tokens.colors.text.inverse }}>Start Trading</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing[6],
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.colors.brand.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing[6],
  },
  heading: { textAlign: 'center', marginBottom: tokens.spacing[3] },
  summary: { textAlign: 'center', marginBottom: tokens.spacing[6] },
  marcusCta: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[4],
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border.default,
  },
  cta: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    paddingVertical: tokens.spacing[4],
    paddingHorizontal: tokens.spacing[8],
    width: '100%',
    alignItems: 'center',
  },
})
