import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://igtxjnulkagtmcbanqxd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlndHhqbnVsa2FndG1jYmFucXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4OTgzNDgsImV4cCI6MjA3ODQ3NDM0OH0.N46jGEB4QlPjQ4rYSPX4CUg13L05knmjU_VwLNuIQSY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true }
})


// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: { persistSession: true, autoRefreshToken: true }
// })

// // Ensure we always have a session
// await supabase.auth.getSession() ?? supabase.auth.signInAnonymously()

// export async function ensureAnonSession() {
//   const { data: { session } } = await supabase.auth.getSession()
//   if (!session) await supabase.auth.signInAnonymously()
// }