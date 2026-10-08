import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
// Server routes create and update application records. Use the service-role
// key when it is configured so Supabase RLS does not block profile syncing.
// Keep the anon-key fallback for existing local development setups.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Check your .env file.')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
