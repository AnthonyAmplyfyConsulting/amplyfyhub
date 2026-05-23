import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/email-marketing?error=no_code', request.url))
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userInfo } = await oauth2.userinfo.get()

    // Store tokens in database (upsert to handle reconnection)
    const { error } = await supabase
      .from('gmail_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token!,
        expiry_date: tokens.expiry_date,
        email: userInfo.email,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (error) {
      console.error('Token storage error:', error)
      return NextResponse.redirect(new URL('/email-marketing?error=token_save_failed', request.url))
    }

    return NextResponse.redirect(new URL('/email-marketing?gmail=connected', request.url))

  } catch (error) {
    console.error('Gmail OAuth callback error:', error)
    return NextResponse.redirect(new URL('/email-marketing?error=oauth_failed', request.url))
  }
}
