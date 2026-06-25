'use server'

import { createClient } from '@/lib/supabase/server'
import { runWorkflow } from '@/lib/agents/agents'

export async function triggerWorkflowAction() {
  try {
    // Run the workflow
    const runResult = await runWorkflow()
    return { success: true, run: runResult }
  } catch (error: any) {
    console.error('Action triggerWorkflowAction error:', error)
    return { success: false, error: error.message || String(error) }
  }
}

export async function getRunDetailsAction(runId: string) {
  const supabase = await createClient()
  
  const { data: run } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .single()
    
  const { data: logs } = await supabase
    .from('agent_logs')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true })
    
  const { data: contacts } = await supabase
    .from('outreach_contacts')
    .select('*')
    .order('created_at', { ascending: false })
    
  return { 
    run, 
    logs: logs || [], 
    contacts: contacts || [] 
  }
}
