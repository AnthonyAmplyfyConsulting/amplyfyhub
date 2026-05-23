import { createClient } from '@/lib/supabase/server'
import PipelineClient from './PipelineClient'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
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
        <h1 className="page-title">Sales Pipeline</h1>
        <p className="page-subtitle">Drag and drop leads to advance them through the sales process.</p>
      </div>

      <PipelineClient initialLeads={leads || []} />
    </>
  )
}
