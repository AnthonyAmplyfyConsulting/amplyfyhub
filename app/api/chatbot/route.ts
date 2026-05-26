import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are the AMPLYFY AI Assistant — an expert AI consultant who works for AMPLYFY Consulting (amplyfyconsulting.com).

Your role is to help the AMPLYFY team with:
1. Drafting personalized cold outreach emails for prospects
2. Researching businesses and industries
3. Handling objections during sales calls
4. Providing talking points for cold calls
5. Strategizing on lead nurturing and conversion

About AMPLYFY:
- We build custom AI Operating Systems for small businesses and home services companies
- Our services include: AI Phone Agents (24/7 call answering & booking), Database Reactivation (re-engage past clients via postcards, texts, emails), Smart CRM & Lead Generation, and full custom AI/SaaS products
- We offer free 30-minute AI Audits to analyze businesses and identify where AI can provide immediate value
- After building and launching a system, we focus on ongoing optimization
- Our target market is primarily small/medium businesses who are overwhelmed with admin work and want to automate

Tone: Professional but approachable. Confident, not salesy. Concise and actionable.

When drafting emails:
- Keep them short (under 150 words)
- Personalize based on the prospect's business
- Lead with value, not features
- Include a clear, low-pressure CTA (usually a 15-min call)
- Never be pushy or use high-pressure tactics

When handling objections:
- Acknowledge the concern genuinely
- Reframe around value and ROI
- Use social proof when possible
- Always offer the free audit as a no-risk next step`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, history: rawHistory } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      )
    }

    const anthropic = new Anthropic({ apiKey })

    // --- CRM CONTEXT INJECTION (AIOS BRAIN) ---
    // Fetch critical business data to inject into the system prompt
    const [{ data: outreachData }, { data: pipelineData }, { data: transactionsData }, { data: activityData }] = await Promise.all([
      supabase.from('outreach_contacts').select('name, business, source, email_status, email_sent_at'),
      supabase.from('pipeline_leads').select('name, business, expected_value, stage'),
      supabase.from('transactions').select('type, amount, date, category'),
      supabase.from('activity_logs').select('type, title, created_at').order('created_at', { ascending: false }).limit(10)
    ])

    // --- Process Outreach Stats ---
    const totalOutreach = outreachData?.length || 0
    const pendingOutreach = outreachData?.filter(c => c.email_status === 'pending').length || 0
    const sentOutreach = outreachData?.filter(c => ['sent', 'opened'].includes(c.email_status)).length || 0
    const openedOutreach = outreachData?.filter(c => c.email_status === 'opened').length || 0
    const openRate = sentOutreach > 0 ? Math.round((openedOutreach / sentOutreach) * 100) : 0
    
    // Group outreach by business to infer industry
    const businessNames = Array.from(new Set(outreachData?.map(c => c.business) || [])).slice(0, 20).join(', ')
    
    // Get recent 5 contacted
    const recentContacts = [...(outreachData || [])]
      .filter(c => c.email_status !== 'pending' && c.email_sent_at)
      .sort((a, b) => new Date(b.email_sent_at as string).getTime() - new Date(a.email_sent_at as string).getTime())
      .slice(0, 5)
      .map(c => `${c.name} at ${c.business} (${c.email_status})`)
      .join(', ') || 'None recently'

    // --- Process Pipeline Stats ---
    const activeLeads = pipelineData || []
    const totalPipelineValue = activeLeads.reduce((sum, lead) => sum + (Number(lead.expected_value) || 0), 0)
    const pipelineByStage = activeLeads.reduce((acc, lead) => {
      const stage = lead.stage || 'unknown'
      acc[stage] = (acc[stage] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const pipelineStageSummary = Object.entries(pipelineByStage).map(([stage, count]) => `- ${stage}: ${count} leads`).join('\n')

    // --- Process Financials ---
    const transactions = transactionsData || []
    const totalRevenue = transactions.filter(t => t.type === 'revenue').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const netProfit = totalRevenue - totalExpenses
    
    // Calculate Monthly Average Revenue for Projections
    // Find the earliest transaction date to calculate months active
    const earliestDate = transactions.length > 0 
      ? new Date(Math.min(...transactions.map(t => new Date(t.date).getTime())))
      : new Date()
    const monthsActive = Math.max(1, (new Date().getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
    const averageMonthlyRevenue = totalRevenue / monthsActive
    const projectedYearlyRevenue = averageMonthlyRevenue * 12

    // --- Process Activity Logs ---
    const recentActivity = activityData?.map(a => `- ${a.title} (${new Date(a.created_at).toLocaleDateString()})`).join('\n') || 'No recent activity.'

    // Build the dynamic payload
    const LIVE_CRM_CONTEXT = `
--- LIVE CRM DATABASE STATE ---
You have direct access to the user's real-time business metrics. ALWAYS use this data to provide highly specific, personalized insights. If asked about revenue, projections, pipeline health, or outreach strategy, base your answer heavily on the numbers below.

Financial Overview:
- Total Revenue (All Time): $${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Total Expenses (All Time): $${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Net Profit: $${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Average Monthly Revenue: $${averageMonthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Projected Yearly Revenue (Run Rate): $${projectedYearlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Sales Pipeline Health:
- Total Expected Pipeline Value: $${totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Total Active Leads: ${activeLeads.length}
- Leads by Stage:
${pipelineStageSummary || '- No active leads'}

Outreach & Email Marketing:
- Total Leads Scraped: ${totalOutreach}
- Leads Pending Email: ${pendingOutreach}
- Total Emails Sent: ${sentOutreach}
- Total Emails Opened: ${openedOutreach}
- Current Email Open Rate: ${openRate}%
- Sample of Scraped Businesses (Use this to infer target industries): ${businessNames || 'None'}
- Most recently contacted: ${recentContacts}

Recent User Activity in CRM:
${recentActivity}

INSTRUCTIONS FOR DATA ANALYSIS:
1. Projections: When asked for projections, use the "Projected Yearly Revenue" provided above. Explain that it is based on the average monthly revenue of $${averageMonthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} annualized over 12 months.
2. Pipeline Bottlenecks: If there are many leads in early stages but few in later stages, advise the user on how to nurture them.
3. Industry Scraping: If asked what industries to scrape, look at the "Sample of Scraped Businesses". Suggest adjacent industries or highlight if the current open rate (${openRate}%) means they should pivot to a new niche.
4. "Why is my open rate X%?": Don't just state the rate. Explain common reasons (subject line, spam filters, poor targeting) and offer to write a better email template based on their target business names.
-------------------------------
`
    const DYNAMIC_SYSTEM_PROMPT = SYSTEM_PROMPT + '\n\n' + LIVE_CRM_CONTEXT
    // ------------------------------------------

    // Process and sanitize history to ensure strictly alternating roles for Anthropic
    const collapsedHistory: { role: 'user' | 'assistant'; content: string }[] = []
    
    if (Array.isArray(rawHistory)) {
      for (const msg of rawHistory) {
        if (!msg.content || typeof msg.content !== 'string' || msg.content.includes('encountered a system error')) {
          continue
        }
        const role = msg.role === 'assistant' ? 'assistant' : 'user'
        
        if (collapsedHistory.length > 0 && collapsedHistory[collapsedHistory.length - 1].role === role) {
          // Collapse consecutive messages of the same role
          collapsedHistory[collapsedHistory.length - 1].content += '\n\n' + msg.content
        } else {
          collapsedHistory.push({ role, content: msg.content })
        }
      }
    }

    // Stream the response
    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      temperature: 0.7,
      system: DYNAMIC_SYSTEM_PROMPT,
      messages: [
        ...collapsedHistory,
        { role: 'user', content: message },
      ],
      stream: true,
    })

    // Create a streaming response
    const encoder = new TextEncoder()
    let fullResponse = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
              const content = chunk.delta.text || ''
              if (content) {
                fullResponse += content
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Chatbot error:', error)
    return NextResponse.json(
      { error: 'Failed to process message', details: String(error) },
      { status: 500 }
    )
  }
}
