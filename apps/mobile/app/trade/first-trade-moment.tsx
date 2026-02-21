import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '@/components/primitives'
import { tokens } from '@/design/tokens'
import { api } from '@/lib/api/client'

export default function FirstTradeMoment() {
  const router = useRouter()

  async function handleContinue() {
    try {
      await api.post('/users/ftue', { made_first_trade: true })
    } catch {
      // non-critical, continue regardless
    }
    router.replace('/(tabs)/')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text variant="heading" style={styles.heading}>First Trade Complete</Text>
      <Text variant="body" color="secondary" style={styles.sub}>
        You just made your first paper trade. From here, every decision builds your track record. Make it count.
      </Text>
      <TouchableOpacity style={styles.cta} onPress={handleContinue}>
        <Text variant="label" style={{ color: '#fff' }}>Start Trading</Text>
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
  emoji: { fontSize: 64, marginBottom: tokens.spacing[6] },
  heading: { textAlign: 'center', marginBottom: tokens.spacing[3] },
  sub: {
    textAlign: 'center',
    marginBottom: tokens.spacing[8],
    lineHeight: 22,
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
