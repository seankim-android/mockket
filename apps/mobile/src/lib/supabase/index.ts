export { supabase } from './client'

// Tracks OAuth codes already exchanged — prevents double-exchange when both
// openAuthSessionAsync (iOS) and Linking.addEventListener fire for the same callback URL.
export const processedOAuthCodes = new Set<string>()
