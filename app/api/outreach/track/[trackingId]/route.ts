import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This is a PUBLIC endpoint — no auth required
// It serves a 1x1 transparent pixel and records email opens

// 1x1 transparent GIF in base64
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params

  try {
    // Use admin client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update the contact's email status to "opened"
    await supabase
      .from('outreach_contacts')
      .update({
        email_status: 'opened',
        email_opened_at: new Date().toISOString(),
      })
      .eq('tracking_id', trackingId)
      .eq('email_status', 'sent') // Only update if currently "sent" (avoid re-opening)

  } catch (error) {
    // Don't fail the pixel response even if DB update fails
    console.error('Tracking update error:', error)
  }

  // Always return the pixel
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_GIF.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
