'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity'

export async function addLead(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const business = formData.get('business') as string
  const phone = formData.get('phone') as string
  const stage = formData.get('stage') as string
  const notes = formData.get('notes') as string

  if (!name || !business || !stage) {
    throw new Error('Name, business, and stage are required')
  }

  const { error } = await supabase
    .from('pipeline_leads')
    .insert([{
      user_id: user.id,
      name,
      email,
      business,
      phone,
      stage,
      notes,
      expected_value: 0
    }])

  if (error) {
    console.error(error)
    throw new Error('Failed to add lead')
  }

  await logActivity(
    supabase,
    user.id,
    'lead',
    `New Lead — ${name}`,
    `Inbound inquiry from ${business} assigned to ${stage}`,
    '👤'
  )

  revalidatePath('/leads')
  revalidatePath('/pipeline')
}

export async function updateLead(id: string, fields: {
  name: string
  business: string
  email: string
  phone: string
  stage: string
  expected_value: number
  notes: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('pipeline_leads')
    .update({
      name: fields.name,
      business: fields.business,
      email: fields.email || null,
      phone: fields.phone || null,
      stage: fields.stage,
      expected_value: fields.expected_value,
      notes: fields.notes || null,
    })
    .eq('id', id)

  if (error) {
    console.error(error)
    throw new Error('Failed to update lead')
  }

  await logActivity(
    supabase,
    user.id,
    'lead',
    `Lead Updated — ${fields.name}`,
    `Updated lead info for ${fields.business}`,
    '✏️'
  )

  revalidatePath('/leads')
  revalidatePath('/pipeline')
  revalidatePath('/')
}
