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
    const [{ data: outreachData }, { data: pipelineData }] = await Promise.all([
      supabase.from('outreach_contacts').select('name, business, email_status, email_sent_at').eq('user_id', user.id),
      supabase.from('pipeline_leads').select('expected_value, stage').eq('user_id', user.id)
    ])

    // Calculate outreach stats
    const totalOutreach = outreachData?.length || 0
    const pendingOutreach = outreachData?.filter(c => c.email_status === 'pending').length || 0
    const sentOutreach = outreachData?.filter(c => ['sent', 'opened'].includes(c.email_status)).length || 0
    const openedOutreach = outreachData?.filter(c => c.email_status === 'opened').length || 0
    const openRate = sentOutreach > 0 ? Math.round((openedOutreach / sentOutreach) * 100) : 0
    
    // Get recent 5 contacted
    const recentContacts = [...(outreachData || [])]
      .filter(c => c.email_status !== 'pending' && c.email_sent_at)
      .sort((a, b) => new Date(b.email_sent_at as string).getTime() - new Date(a.email_sent_at as string).getTime())
      .slice(0, 5)
      .map(c => `${c.name} at ${c.business} (${c.email_status})`)
      .join(', ') || 'None recently'

    // Calculate pipeline stats
    const totalPipelineValue = pipelineData?.reduce((sum, lead) => sum + (Number(lead.expected_value) || 0), 0) || 0
    const activeLeadsCount = pipelineData?.length || 0

    // Build the dynamic payload
    const LIVE_CRM_CONTEXT = `
--- LIVE CRM DATABASE STATE ---
You have direct access to the user's real-time business metrics. Always reference this data if the user asks about their business performance, leads, or outreach.

Outreach & Email Marketing:
- Total Leads Scraped: ${totalOutreach}
- Leads Pending Email: ${pendingOutreach}
- Total Emails Sent: ${sentOutreach}
- Total Emails Opened: ${openedOutreach}
- Current Email Open Rate: ${openRate}%
- Most recently contacted businesses: ${recentContacts}

Sales Pipeline:
- Active Leads in Pipeline: ${activeLeadsCount}
- Total Expected Pipeline Value: $${totalPipelineValue.toLocaleString()}
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
      model: 'claude-3-5-sonnet-20241022',
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
