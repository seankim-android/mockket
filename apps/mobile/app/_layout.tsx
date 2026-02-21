import { useEffect, useState } from 'react'
import { Platform, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as WebBrowser from 'expo-web-browser'
import { useSession } from '@/features/auth/hooks/useSession'
import { useAuthStore } from '@/features/auth/store'
import { supabase, processedOAuthCodes } from '@/lib/supabase'
import { connectPriceFeed, disconnectPriceFeed } from '@/lib/ws/client'

// Required for WebBrowser.openAuthSessionAsync to close the browser after OAuth redirect
WebBrowser.maybeCompleteAuthSession()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
})

const STORE_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/mockket'
    : 'https://play.google.com/store/apps/details?id=com.mockket'

function AuthGate({ children }: { children: React.ReactNode }) {
  useSession()

  const { session, isLoading } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()
  const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'auth'
  const [forceUpdate, setForceUpdate] = useState<boolean | null>(null)

  useEffect(() => {
    if (session?.access_token) {
      connectPriceFeed(session.access_token)
    } else {
      disconnectPriceFeed()
    }
  }, [session?.access_token])

  useEffect(() => {
    if (isLoading || forceUpdate === null) return

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/welcome')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, isLoading, inAuthGroup, router, forceUpdate])

  useEffect(() => {
    if (!session) {
      setForceUpdate(null)
      return
    }
    async function checkVersion() {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'}/config/app-version`, { signal: controller.signal })
        clearTimeout(timeout)
        if (!res.ok) { setForceUpdate(false); return }
        const config = await res.json()
        const platform = Platform.OS === 'ios' ? config.ios : config.android
        setForceUpdate(platform?.updateMode === 'hard')
      } catch {
        setForceUpdate(false) // don't block launch on version check failure
      }
    }
    checkVersion()
  }, [session])

  if (isLoading || (session && forceUpdate === null)) return null

  if (forceUpdate) {
    return (
      <View style={fuStyles.container}>
        <Text style={fuStyles.title}>Update Required</Text>
        <Text style={fuStyles.body}>
          This version of Mockket is no longer supported. Update to keep trading.
        </Text>
        <TouchableOpacity
          style={fuStyles.cta}
          onPress={() => Linking.openURL(STORE_URL)}
          accessibilityRole="button"
          accessibilityLabel="Update Mockket now"
        >
          <Text style={fuStyles.ctaLabel}>Update Now</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return <>{children}</>
}

const fuStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { color: '#F8FAFC', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  body: { color: '#94A3B8', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  cta: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32 },
  ctaLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
})

function useOAuthDeepLink() {
  const router = useRouter()

  useEffect(() => {
    async function handleUrl(url: string) {
      if (!url.includes('auth/callback')) return
      const code = new URL(url).searchParams.get('code')
      if (!code || processedOAuthCodes.has(code)) return
      processedOAuthCodes.add(code)
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) router.replace('/(auth)/sign-in')
    }

    // App already open — catch the deep link
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url))

    // App cold-started from a deep link — wait for Supabase to finish
    // rehydrating from secure store before processing the URL
    Linking.getInitialURL().then(async (url) => {
      if (!url) return
      await supabase.auth.getSession()
      handleUrl(url)
    })

    return () => sub.remove()
  }, [router])
}

export default function RootLayout() {
  useOAuthDeepLink()

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGate>
    </QueryClientProvider>
  )
}
