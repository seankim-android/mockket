import { useEffect } from 'react'
import { Platform } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from '@/features/auth/hooks/useSession'
import { useAuthStore } from '@/features/auth/store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
})

function AuthGate({ children }: { children: React.ReactNode }) {
  useSession()

  const { session, isLoading } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()
  const inAuthGroup = segments[0] === '(auth)'

  useEffect(() => {
    if (isLoading) return

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/welcome')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/')
    }
  }, [session, isLoading, inAuthGroup, router])

  useEffect(() => {
    if (!session) return
    async function checkVersion() {
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'}/config/app-version`)
        const config = await res.json()
        const platform = Platform.OS === 'ios' ? config.ios : config.android
        if (platform?.updateMode === 'hard') {
          router.replace('/force-update')
        }
      } catch {
        // ignore — don't block launch on version check failure
      }
    }
    checkVersion()
  }, [session, router])

  if (isLoading) return null

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGate>
    </QueryClientProvider>
  )
}
