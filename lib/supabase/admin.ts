import { createClient } from '@supabase/supabase-js'

// Admin client bypasses RLS — used for tracking pixel updates and cron jobs
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceKey)
}
