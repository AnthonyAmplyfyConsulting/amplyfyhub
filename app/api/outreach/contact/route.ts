import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

// PATCH — Toggle contacted status
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contactId, contacted } = await request.json()

    const { error } = await supabase
      .from('outreach_contacts')
      .update({
        contacted,
        contacted_at: contacted ? new Date().toISOString() : null,
      })
      .eq('id', contactId)
      

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Contact update error:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}

// POST — Book audit / create pipeline lead
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contactId, auditBooked } = await request.json()

    // Get the contact details
    const { data: contact } = await supabase
      .from('outreach_contacts')
      .select('*')
      .eq('id', contactId)
      
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const stage = auditBooked ? 'Audit Booked' : 'New Lead'

    // Create pipeline lead
    const { data: newLead, error: leadError } = await supabase
      .from('pipeline_leads')
      .insert([{
        user_id: user.id,
        name: contact.name,
        business: contact.business,
        email: contact.email,
        phone: contact.phone,
        stage,
        expected_value: 0,
        notes: `Source: Cold outreach. ${auditBooked ? 'Audit booked via cold call.' : 'Added from cold call — no audit booked yet.'}`,
      }])
      .select()
      .single()

    if (leadError) {
      throw leadError
    }

    // Update the outreach contact with pipeline link
    await supabase
      .from('outreach_contacts')
      .update({
        audit_booked: auditBooked,
        pipeline_lead_id: newLead.id,
      })
      .eq('id', contactId)

    // Log activity
    await logActivity(
      supabase,
      user.id,
      'lead',
      auditBooked
        ? `Audit Booked — ${contact.name}`
        : `New Lead — ${contact.name}`,
      auditBooked
        ? `${contact.name} from ${contact.business} booked an AI audit via cold call`
        : `${contact.name} from ${contact.business} added to pipeline from cold call`,
      auditBooked ? '📅' : '👤'
    )

    return NextResponse.json({
      success: true,
      lead: newLead,
      stage,
    })

  } catch (error) {
    console.error('Audit booking error:', error)
    return NextResponse.json({ error: 'Failed to create pipeline lead' }, { status: 500 })
  }
}
