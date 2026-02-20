import { create } from 'zustand'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '@mockket/shared'

interface AuthState {
  // Supabase session (contains access_token, refresh_token, user)
  session: Session | null
  // App-level user profile (fetched from our DB after auth)
  profile: User | null
  isLoading: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: User | null) => void
  setLoading: (loading: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isLoading: true, // true on init — wait for Supabase to restore session
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  clearAuth: () => set({ session: null, profile: null, isLoading: false }),
}))
