import { NextRequest, NextResponse } from 'next/server'
import { runWorkflow } from '@/lib/agents/agents'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Allow up to 5 minutes execution on supported Vercel tiers

export async function GET(request: NextRequest) {
  try {
    // Optional secret check if needed:
    // const authHeader = request.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }

    console.log('Cron triggered: Starting agent workflow...')
    console.log('DEBUG: ANTHROPIC_API_KEY from process.env:', {
      exists: !!process.env.ANTHROPIC_API_KEY,
      length: process.env.ANTHROPIC_API_KEY?.length,
      prefix: process.env.ANTHROPIC_API_KEY?.substring(0, 15)
    })
    const runResult = await runWorkflow()
    
    return NextResponse.json({
      success: true,
      message: 'Agent workflow executed successfully.',
      run: runResult
    })
  } catch (error: any) {
    console.error('Cron agent workflow failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Agent workflow execution failed.',
        details: error.message || String(error)
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
