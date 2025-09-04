import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anon key are required.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configure session persistence
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    // Set session to expire after 30 days when "remember me" is checked
    // Note: actual session length is also controlled by Supabase dashboard settings
    storageKey: 'sb-auth-token',
  },
})
