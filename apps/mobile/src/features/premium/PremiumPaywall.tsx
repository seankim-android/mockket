import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Text } from '@/components/primitives'
import { usePremium } from './usePremium'
import { tokens } from '@/design/tokens'

interface PremiumPaywallProps {
  visible: boolean
  onClose: () => void
}

export function PremiumPaywall({ visible, onClose }: PremiumPaywallProps) {
  const { buyPremium, isBuyingPremium } = usePremium()

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text variant="heading" style={styles.title}>Mockket Premium</Text>
          <Text variant="body" color="secondary" style={styles.sub}>
            Unlock real-time agent holdings, advanced analytics, and more.
          </Text>

          <View style={styles.features}>
            {[
              'Real-time agent portfolio view',
              'Advanced performance analytics',
              'Priority recommendation delivery',
            ].map((f) => (
              <View key={f} style={styles.feature}>
                <Text style={{ color: tokens.colors.brand.default }}>✓ </Text>
                <Text variant="body">{f}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.btn, isBuyingPremium && { opacity: 0.6 }]}
            onPress={() => buyPremium('monthly').then(onClose)}
            disabled={isBuyingPremium}
          >
            {isBuyingPremium ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text variant="label" style={{ color: '#fff' }}>Monthly · $4.99/mo</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.annualBtn, isBuyingPremium && { opacity: 0.6 }]}
            onPress={() => buyPremium('annual').then(onClose)}
            disabled={isBuyingPremium}
          >
            <Text variant="label" style={{ color: '#fff' }}>Annual · $39.99/yr</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text variant="label" color="secondary">Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  card: {
    backgroundColor: tokens.colors.bg.secondary,
    borderTopLeftRadius: tokens.radii.xl,
    borderTopRightRadius: tokens.radii.xl,
    padding: tokens.spacing[6],
  },
  title: { marginBottom: tokens.spacing[2] },
  sub: { marginBottom: tokens.spacing[4] },
  features: { marginBottom: tokens.spacing[6], gap: tokens.spacing[2] },
  feature: { flexDirection: 'row', alignItems: 'flex-start' },
  btn: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    alignItems: 'center',
    marginBottom: tokens.spacing[3],
  },
  annualBtn: { backgroundColor: tokens.colors.bg.tertiary },
  closeBtn: { padding: tokens.spacing[3], alignItems: 'center' },
})
