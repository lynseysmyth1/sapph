import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Create a .env file with these values from your Supabase project settings.'
  )
  console.warn(
    'If Supabase is not responding, your project might be paused. Go to Supabase Dashboard → click "Restore" → wait 1-2 minutes.'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: (...args) => {
      // Add timeout to detect paused projects faster
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
      
      return fetch(...args, { signal: controller.signal })
        .then(response => {
          clearTimeout(timeoutId)
          return response
        })
        .catch(error => {
          clearTimeout(timeoutId)
          if (error.name === 'AbortError') {
            console.error('Supabase request timed out. Your project might be paused.')
            console.error('Fix: Go to Supabase Dashboard → click "Restore" → wait 1-2 minutes')
          }
          throw error
        })
    }
  }
})
