import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://gndhowliybqjqrxdedwm.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduZGhvd2xpeWJxanFyeGRlZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwMDkwODMsImV4cCI6MjA2MDU4NTA4M30.SyzpSPfQR4ZjixCV3w6FrH-LtilA2l32OZSbl43IOAI"

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Create a server-side client (for server components and API routes)
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
