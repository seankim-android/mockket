import { useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '@/components/primitives'
import { supabase } from '@/lib/supabase'
import { tokens } from '@/design/tokens'

export default function SignUp() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignUp() {
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signUp({ email: trimmedEmail, password })
    setLoading(false)
    if (err) {
      setError(err.message)
    }
    // Auth gate in _layout.tsx redirects to (tabs) on session
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text variant="heading" style={styles.title}>
        Create account
      </Text>
      <Text variant="body" color="secondary" style={styles.sub}>
        Start with $100,000 in paper cash.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={tokens.colors.text.muted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Email address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={tokens.colors.text.muted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel="Password"
      />

      {error && (
        <Text
          variant="caption"
          style={styles.errorText}
        >
          {error}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.cta, loading && styles.ctaDisabled]}
        onPress={handleSignUp}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Create account"
      >
        {loading ? (
          <ActivityIndicator color={tokens.colors.text.inverse} />
        ) : (
          <Text variant="label" style={styles.ctaLabel}>
            Create Account
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.signIn}
        onPress={() => router.push('/(auth)/sign-in')}
        accessibilityRole="button"
        accessibilityLabel="Sign in to existing account"
      >
        <Text variant="label" color="secondary">
          Already have an account? Sign in
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
    padding: tokens.spacing[6],
    paddingTop: 80,
  },
  title: { marginBottom: tokens.spacing[2] },
  sub: { marginBottom: tokens.spacing[8] },
  input: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing[4],
    color: tokens.colors.text.primary,
    fontSize: tokens.fontSize.base,
    marginBottom: tokens.spacing[3],
    borderWidth: 1,
    borderColor: tokens.colors.border.default,
  },
  errorText: {
    color: tokens.colors.error,
    marginBottom: tokens.spacing[3],
  },
  cta: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    alignItems: 'center',
    marginBottom: tokens.spacing[3],
  },
  ctaDisabled: { opacity: 0.6 },
  ctaLabel: { color: tokens.colors.text.inverse },
  signIn: { padding: tokens.spacing[3], alignItems: 'center' },
})
