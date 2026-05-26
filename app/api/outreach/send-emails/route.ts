import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

function buildEmailHtml(name: string, business: string, trackingId: string) {
  const firstName = name.split(' ')[0]
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/outreach/track/${trackingId}`
  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/outreach/unsubscribe`

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.7; font-size: 15px;">
      <p>Hi ${firstName},</p>
      
      <p>I came across <strong>${business}</strong> and was genuinely impressed by what you've built.</p>
      
      <p>I'm Anthony from <strong>AMPLYFY</strong> — we help businesses like yours scale by building custom <strong>AI Operating Systems (AIOS)</strong>. Essentially, we create custom software with a "digital brain" tailored specifically to your business to execute your daily tasks.</p>
      
      <ul style="padding-left: 20px; margin: 16px 0;">
        <li>🧠 A central AI brain that knows your business inside and out</li>
        <li>⚙️ Custom software to execute repetitive admin and operational tasks</li>
        <li>📈 Seamless automation that runs 24/7 in the background</li>
      </ul>
      
      <p>We recently helped a similar business implement their own AIOS, cutting their manual admin time in half while significantly increasing their operational efficiency.</p>
      
      <p>Would you be open to a quick <strong>15-minute call</strong> to see how a custom AIOS could work for ${business}? Totally free, no strings attached.</p>
      
      <p>Best,<br/>
      <strong>Anthony Pernerewski</strong><br/>
      AMPLYFY Consulting<br/>
      <a href="https://amplyfyconsulting.com" style="color: #E8751A;">amplyfyconsulting.com</a></p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      
      <p style="font-size: 11px; color: #999; line-height: 1.5;">
        You're receiving this because we think AMPLYFY could help ${business} grow.<br/>
        <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a><br/>
        AMPLYFY Consulting | United States
      </p>
      
      <img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />
    </div>
  `
}

function buildSubject(business: string) {
  const subjects = [
    `Quick question about ${business}`,
    `Custom AIOS for ${business}`,
    `Giving ${business} a digital brain`,
    `Automating tasks for ${business}`,
  ]
  return subjects[Math.floor(Math.random() * subjects.length)]
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Gmail tokens
    const { data: tokens } = await supabase
      .from('gmail_tokens')
      .select('*')
      
      .single()

    if (!tokens) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please connect your Gmail account first.' },
        { status: 400 }
      )
    }

    // Set up Gmail API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    })

    // Refresh token if expired
    const { credentials } = await oauth2Client.refreshAccessToken()
    oauth2Client.setCredentials(credentials)

    // Update stored tokens
    if (credentials.access_token !== tokens.access_token) {
      await supabase
        .from('gmail_tokens')
        .update({
          access_token: credentials.access_token,
          expiry_date: credentials.expiry_date,
          updated_at: new Date().toISOString(),
        })
        
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Get pending contacts (limit to 30 per day)
    const { data: pendingContacts } = await supabase
      .from('outreach_contacts')
      .select('*')
      
      .eq('email_status', 'pending')
      .limit(30)

    if (!pendingContacts || pendingContacts.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: 'No pending contacts to email.'
      })
    }

    let sent = 0
    let failed = 0

    for (const contact of pendingContacts) {
      try {
        const subject = buildSubject(contact.business)
        const htmlBody = buildEmailHtml(contact.name, contact.business, contact.tracking_id)

        const senderEmail = tokens.email || user.email || 'anthony@amplyfyconsulting.com'

        const encodedSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`

        // Build RFC 2822 message
        const messageParts = [
          `From: Anthony Pernerewski <${senderEmail}>`,
          `To: ${contact.email}`,
          `Subject: ${encodedSubject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=utf-8',
          '',
          htmlBody,
        ]
        const message = messageParts.join('\r\n')

        // Encode to base64url
        const encodedMessage = Buffer.from(message)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')

        // Send via Gmail API
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        })

        // Update contact status
        await supabase
          .from('outreach_contacts')
          .update({
            email_status: 'sent',
            email_sent_at: new Date().toISOString(),
            email_subject: subject,
            email_body: htmlBody,
          })
          .eq('id', contact.id)

        sent++

        // Small delay between sends to avoid throttling
        await new Promise(resolve => setTimeout(resolve, 3000))

      } catch (emailError) {
        console.error(`Failed to send to ${contact.email}:`, emailError)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      message: `Sent ${sent} emails. ${failed > 0 ? `${failed} failed.` : ''}`
    })

  } catch (error) {
    console.error('Send emails error:', error)
    return NextResponse.json(
      { error: 'Failed to send emails', details: String(error) },
      { status: 500 }
    )
  }
}
