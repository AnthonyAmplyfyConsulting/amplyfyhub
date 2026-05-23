import { createClient } from '@/lib/supabase/server'
import EmailMarketingClient from './EmailMarketingClient'

export const dynamic = 'force-dynamic'

export default async function EmailMarketingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch outreach contacts
  const { data: contacts } = await supabase
    .from('outreach_contacts')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  // Check Gmail connection
  const { data: gmailTokens } = await supabase
    .from('gmail_tokens')
    .select('email')
    .eq('user_id', user?.id)
    .single()

  // Calculate stats
  const allContacts = contacts || []
  const sentToday = allContacts.filter(c => {
    if (!c.email_sent_at) return false
    const sent = new Date(c.email_sent_at)
    const today = new Date()
    return sent.toDateString() === today.toDateString()
  }).length

  const totalSent = allContacts.filter(c => c.email_status !== 'pending').length
  const totalOpened = allContacts.filter(c => c.email_status === 'opened').length
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0
  const pendingCount = allContacts.filter(c => c.email_status === 'pending').length

  return (
    <EmailMarketingClient
      initialContacts={allContacts}
      gmailConnected={!!gmailTokens}
      gmailEmail={gmailTokens?.email || null}
      stats={{
        sentToday,
        totalSent,
        totalOpened,
        openRate,
        pendingCount,
        totalContacts: allContacts.length,
      }}
    />
  )
}
