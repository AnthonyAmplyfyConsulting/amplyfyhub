import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApifyClient } from 'apify-client'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const searchQuery = body.searchQuery || 'small businesses near me'
    const maxResults = body.maxResults || 30

    const apifyToken = process.env.APIFY_API_TOKEN
    if (!apifyToken) {
      return NextResponse.json({ error: 'Apify API token not configured' }, { status: 500 })
    }

    const client = new ApifyClient({ token: apifyToken })

    // Run Google Maps Email Extractor actor
    const fetchLimit = 100
    const run = await client.actor('leadsbrary/google-maps-email-extractor').call({
      searchStringsArray: [searchQuery],
      maxCrawledPlacesPerSearch: fetchLimit,
      maxResults: fetchLimit,
      limit: fetchLimit,
      
      language: 'en',
      countryCode: 'us',
      extractEmails: true,
      scrapeEmails: true,
    })

    // Fetch results
    const { items } = await client.dataset(run.defaultDatasetId).listItems()

    let inserted = 0
    let skipped = 0

    for (const item of items) {
      // Extract contact info from scraped data (handling both Google Maps and LinkedIn schemas)
      const raw = item as Record<string, string | string[] | undefined>
      const emails = Array.isArray(raw.emails) ? raw.emails : []
      const foundEmail = (raw.email as string) || (raw.emailAddress as string) || emails[0] || null
      
      const contact = {
        user_id: user.id,
        name: (raw.fullName as string) || (raw.title as string) || (raw.name as string) || 'Unknown',
        business: (raw.company as string) || (raw.companyName as string) || (raw.title as string) || 'Unknown Business',
        email: foundEmail,
        phone: (raw.phone as string) || (raw.phoneNumber as string) || null,
        website: (raw.website as string) || (raw.url as string) || (raw.linkedinUrl as string) || null,
        source: 'apify_linkedin',
        email_status: 'pending' as const,
      }

      // Skip if no email found
      if (!contact.email) {
        skipped++
        continue
      }

      // Try to insert (unique constraint on email will prevent duplicates)
      const { error } = await supabase
        .from('outreach_contacts')
        .insert([contact])

      if (error) {
        if (error.code === '23505') {
          // Duplicate email — skip
          skipped++
        } else {
          console.error('Insert error:', error)
          skipped++
        }
      } else {
        inserted++
      }

      // Stop once we have reached the exact number requested by the user
      if (inserted >= maxResults) {
        break
      }
    }

    return NextResponse.json({
      success: true,
      scraped: items.length,
      inserted,
      skipped,
      message: `Scraped ${items.length} contacts. Added ${inserted} new, skipped ${skipped} (duplicates or missing email).`
    })

  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { error: 'Failed to scrape contacts', details: String(error) },
      { status: 500 }
    )
  }
}
