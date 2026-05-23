'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity'

export async function updateLeadStage(id: string, newStage: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('pipeline_leads')
    .update({ 
      stage: newStage,
      last_advanced_at: new Date().toISOString()
    })
    .eq('id', id)
    
  if (error) {
    throw new Error('Failed to update lead stage')
  }
  
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    // We should ideally fetch the lead name to make a nice log, but for simplicity we log the ID or generic info.
    // Fetching lead to get the name:
    const { data: lead } = await supabase.from('pipeline_leads').select('name').eq('id', id).single()
    if (lead) {
      await logActivity(
        supabase,
        user.id,
        'deal',
        `Pipeline Updated — ${lead.name}`,
        `Lead advanced to ${newStage}`,
        '➡️'
      )
    }
  }

  revalidatePath('/pipeline')
  revalidatePath('/')
}

export async function updateLeadEV(id: string, expectedValue: number) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('pipeline_leads')
    .update({ 
      expected_value: expectedValue 
    })
    .eq('id', id)
    
  if (error) {
    throw new Error('Failed to update expected value')
  }
  
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: lead } = await supabase.from('pipeline_leads').select('name').eq('id', id).single()
    if (lead) {
      await logActivity(
        supabase,
        user.id,
        'deal',
        `Expected Value Set — ${lead.name}`,
        `Potential deal value updated to $${expectedValue.toLocaleString()}`,
        '💰'
      )
    }
  }

  revalidatePath('/pipeline')
  revalidatePath('/')
}

export async function deleteLead(id: string) {
  const supabase = await createClient()
  
  // Clear the foreign key reference in outreach_contacts so we don't get a PostgreSQL constraint error
  await supabase
    .from('outreach_contacts')
    .update({ pipeline_lead_id: null })
    .eq('pipeline_lead_id', id)
  
  const { error } = await supabase
    .from('pipeline_leads')
    .delete()
    .eq('id', id)
    
  if (error) {
    throw new Error('Failed to delete lead')
  }
  
  revalidatePath('/pipeline')
  revalidatePath('/leads')
  revalidatePath('/')
}
