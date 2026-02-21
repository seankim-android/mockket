import { useState, useEffect } from 'react'
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
import * as WebBrowser from 'expo-web-browser'
import { Text } from '@/components/primitives'
import { supabase } from '@/lib/supabase'
import { tokens } from '@/design/tokens'

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    WebBrowser.warmUpAsync()
    return () => { WebBrowser.coolDownAsync() }
  }, [])

  async function handleSignIn() {
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
    setLoading(false)
    if (err) setError(err.message)
    // AuthGate in _layout.tsx redirects to (tabs) on session
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setOauthLoading(provider)
    setError(null)
    const redirectTo = 'mockket://auth/callback'
    const { data, error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    })
    if (err || !data.url) {
      setError(err?.message ?? 'Sign-in failed. Please try again.')
      setOauthLoading(null)
      return
    }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    if (result.type === 'success') {
      const { error: sessionErr } = await supabase.auth.exchangeCodeForSession(result.url)
      if (sessionErr) setError(sessionErr.message)
    }
    setOauthLoading(null)
  }

  const anyLoading = loading || oauthLoading !== null

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text variant="heading" style={styles.title}>
        Welcome back
      </Text>
      <Text variant="body" color="secondary" style={styles.sub}>
        Sign in to your account.
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
        <Text variant="caption" style={styles.errorText}>
          {error}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.cta, anyLoading && styles.ctaDisabled]}
        onPress={handleSignIn}
        disabled={anyLoading}
        accessibilityRole="button"
        accessibilityLabel="Sign in"
      >
        {loading ? (
          <ActivityIndicator color={tokens.colors.text.inverse} />
        ) : (
          <Text variant="label" style={styles.ctaLabel}>
            Sign In
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text variant="caption" color="secondary" style={styles.dividerLabel}>
          or
        </Text>
        <View style={styles.dividerLine} />
      </View>

      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.oauthButton, anyLoading && styles.ctaDisabled]}
          onPress={() => handleOAuth('apple')}
          disabled={anyLoading}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
        >
          {oauthLoading === 'apple' ? (
            <ActivityIndicator color={tokens.colors.text.primary} />
          ) : (
            <Text variant="label" color="primary">
               Continue with Apple
            </Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.oauthButton, anyLoading && styles.ctaDisabled]}
        onPress={() => handleOAuth('google')}
        disabled={anyLoading}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        {oauthLoading === 'google' ? (
          <ActivityIndicator color={tokens.colors.text.primary} />
        ) : (
          <Text variant="label" color="primary">
            G  Continue with Google
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.signUp}
        onPress={() => router.push('/(auth)/sign-up')}
        accessibilityRole="button"
        accessibilityLabel="Create a new account"
      >
        <Text variant="label" color="secondary">
          Don't have an account? Sign up
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
    marginBottom: tokens.spacing[4],
  },
  ctaDisabled: { opacity: 0.6 },
  ctaLabel: { color: tokens.colors.text.inverse },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing[4],
    gap: tokens.spacing[3],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: tokens.colors.border.default,
  },
  dividerLabel: {
    flexShrink: 0,
  },
  oauthButton: {
    borderWidth: 1,
    borderColor: tokens.colors.border.default,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    alignItems: 'center',
    marginBottom: tokens.spacing[3],
  },
  signUp: {
    padding: tokens.spacing[3],
    alignItems: 'center',
    marginTop: tokens.spacing[2],
  },
})
