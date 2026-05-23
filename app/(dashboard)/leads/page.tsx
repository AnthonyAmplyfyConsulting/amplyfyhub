import { createClient } from '@/lib/supabase/server'
import LeadsClient from './LeadsClient'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: leads } = await supabase
    .from('pipeline_leads')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <div className="page-header mb-8">
        <h1 className="page-title">Leads Directory</h1>
        <p className="page-subtitle">Manage all your contacts, sync them with the pipeline, and track their value.</p>
      </div>

      <LeadsClient initialLeads={leads || []} />
    </>
  )
}
