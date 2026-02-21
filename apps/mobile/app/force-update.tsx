import { View, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native'
import { Text } from '@/components/primitives'
import { tokens } from '@/design/tokens'

const STORE_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/mockket'
    : 'https://play.google.com/store/apps/details?id=com.mockket'

export default function ForceUpdate() {
  return (
    <View style={styles.container}>
      <Text variant="heading" style={styles.title}>Update Required</Text>
      <Text variant="body" color="secondary" style={styles.body}>
        This version of Mockket is no longer supported. Update to keep trading.
      </Text>
      <TouchableOpacity
        style={styles.cta}
        onPress={() => Linking.openURL(STORE_URL)}
        accessibilityRole="button"
        accessibilityLabel="Update Mockket now"
      >
        <Text variant="label" style={{ color: tokens.colors.text.inverse }}>Update Now</Text>
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
    padding: tokens.spacing[8],
  },
  title: { textAlign: 'center', marginBottom: tokens.spacing[4] },
  body: { textAlign: 'center', lineHeight: 24, marginBottom: tokens.spacing[8] },
  cta: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    paddingVertical: tokens.spacing[4],
    paddingHorizontal: tokens.spacing[8],
  },
})
