import { View, ActivityIndicator, StyleSheet } from 'react-native'

// Landing route for OAuth deep links (mockket://auth/callback?code=...).
// The actual code exchange is handled by useOAuthDeepLink in _layout.tsx.
// This screen just prevents the "unmatched route" error.
export default function AuthCallback() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10B981" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
})
