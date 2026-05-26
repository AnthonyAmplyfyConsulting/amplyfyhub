import { createClient } from '@/lib/supabase/server'
import RevenueClient from './RevenueClient'

export const dynamic = 'force-dynamic'

export default async function RevenuePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch transactions sorted by newest
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    
    .order('date', { ascending: false })

  return (
    <>
      <RevenueClient initialTransactions={transactions || []} />
    </>
  )
}
