import { createClient } from '@/lib/supabase/server'
import ColdCallsClient from './ColdCallsClient'

export const dynamic = 'force-dynamic'

export default async function ColdCallsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch contacts that have been emailed (sent or opened)
  const { data: contacts } = await supabase
    .from('outreach_contacts')
    .select('*')
    
    .in('email_status', ['sent', 'opened'])
    .order('email_opened_at', { ascending: false, nullsFirst: false })

  const allContacts = contacts || []
  const openedCount = allContacts.filter(c => c.email_status === 'opened').length
  const contactedCount = allContacts.filter(c => c.contacted).length
  const bookedCount = allContacts.filter(c => c.audit_booked).length

  return (
    <ColdCallsClient
      initialContacts={allContacts}
      stats={{
        total: allContacts.length,
        opened: openedCount,
        contacted: contactedCount,
        auditsBooked: bookedCount,
      }}
    />
  )
}
