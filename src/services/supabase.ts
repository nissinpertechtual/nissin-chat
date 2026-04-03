import { createClient } from '@supabase/supabase-js'

// Hardcoded values as fallback - ensures app works even without .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://equhkblxsdznexhytbob.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdWhrYmx4c2R6bmV4aHl0Ym9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDY4NDcsImV4cCI6MjA5MDY4Mjg0N30.RCCan910e9PrOi4wAR8URVazIPIoYiHL9KNZKoQS_Mw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export default supabase
