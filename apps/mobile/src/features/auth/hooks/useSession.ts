import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '../store'

// Call this once at the root layout to initialize and watch the Supabase session
export function useSession() {
  const { setSession, setLoading } = useAuthStore()

  useEffect(() => {
    // Get initial session (restores from SecureStore if available)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])
}
