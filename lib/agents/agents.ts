import { createAdminClient } from '@/lib/supabase/admin'
import { findAndEnrichRealtors } from '@/lib/apollo'
import Anthropic from '@anthropic-ai/sdk'
import { google } from 'googleapis'

export interface AgentRunState {
  id: string;
  runDate: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  ceoPlan?: string;
  dailyReport?: string;
}

// Helper to log thoughts and outputs for the UI
export async function logAgentActivity(
  runId: string,
  agentName: 'ceo' | 'researcher' | 'copywriter' | 'reviewer',
  logType: 'thought' | 'tool_call' | 'output' | 'error',
  content: string
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('agent_logs').insert({
    run_id: runId,
    agent_name: agentName,
    log_type: logType,
    content: content,
  });
  if (error) {
    console.error(`Failed to write agent log for ${agentName}:`, error);
  }
}

// Helper to parse JSON from Claude responses (handles raw text or markdown JSON blocks)
function extractJson(text: string): any {
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerError) {
        throw new Error(`Failed to parse inner JSON: ${innerError}. Raw: ${text}`);
      }
    }
    throw new Error(`No JSON found in response. Raw: ${text}`);
  }
}

export async function runWorkflow(): Promise<any> {
  const supabase = createAdminClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const modelName = 'claude-sonnet-4-6';

  // 1. Create a new run record
  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      status: 'running',
    })
    .select('*')
    .single();

  if (runError || !run) {
    throw new Error(`Failed to initialize agent run: ${runError?.message}`);
  }

  const runId = run.id;
  const runState: AgentRunState = {
    id: runId,
    runDate: run.run_date,
    status: 'running',
  };

  try {
    console.log(`Starting Workflow Run: ${runId}`);
    await logAgentActivity(runId, 'ceo', 'thought', 'Initializing Mission Control workflow. Commencing daily agent runs.');

    // Get default user ID to assign to leads (using the first profile in the system)
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const defaultUserId = profiles && profiles.length > 0 ? profiles[0].id : null;

    if (!defaultUserId) {
      throw new Error('No user profile found in the database. Please sign in once first to create a profile.');
    }

    // --- PHASE 1: CEO FORMULATES DAILY PLAN ---
    await logAgentActivity(runId, 'ceo', 'thought', 'CEO: Reviewing previous campaigns and formulating today\'s strategic outreach plan.');

        const targetAreas = ['Greenwich, CT', 'Newton, MA', 'Hamptons, NY', 'Wellesley, MA', 'Scarsdale, NY'];
    
    // 1. Find previous completed runs to select the least targeted city (round-robin memory)
    const { data: previousRuns } = await supabase
      .from('agent_runs')
      .select('ceo_plan')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    const areaCounts: { [key: string]: number } = {};
    for (const area of targetAreas) {
      areaCounts[area] = 0;
    }
    if (previousRuns) {
      for (const run of previousRuns) {
        if (!run.ceo_plan) continue;
        for (const area of targetAreas) {
          if (run.ceo_plan.includes(area)) {
            areaCounts[area]++;
            break;
          }
        }
      }
    }

    let chosenArea = targetAreas[0];
    let minCount = Infinity;
    for (const area of targetAreas) {
      if (areaCounts[area] < minCount) {
        minCount = areaCounts[area];
        chosenArea = area;
      }
    }

    const page = areaCounts[chosenArea] + 1;

    const apolloLocationMap: { [key: string]: string } = {
      'Greenwich, CT': 'Greenwich, Connecticut',
      'Newton, MA': 'Newton, Massachusetts',
      'Hamptons, NY': 'Hamptons, New York',
      'Wellesley, MA': 'Wellesley, Massachusetts',
      'Scarsdale, NY': 'Scarsdale, New York'
    };
    const apolloLocation = apolloLocationMap[chosenArea] || chosenArea;

    const planPrompt = `You are the CEO Agent of AMPLYFY CRM. Today you are coordinating a workflow to target wealthy communities in CT, MA, NY.
You have chosen the target location: ${chosenArea}.
Write a short daily outreach plan (100-150 words) in markdown. State that we will have the Researcher Agent find 30 realtors in ${chosenArea} (fetching page ${page} of the search results), the Copywriter Agent draft personalized emails offering a free AI house tour video made from property listing photos, and the Reviewer Agent analyze previous statistics. Keep it professional, highly focused, and action-oriented.`;

    const planResponse = await anthropic.messages.create({
      model: modelName,
      max_tokens: 500,
      system: 'You are the CEO Agent of the CRM.',
      messages: [{ role: 'user', content: planPrompt }],
    });

    const ceoPlan = planResponse.content[0].type === 'text' ? planResponse.content[0].text : 'Plan formulated.';
    await supabase.from('agent_runs').update({ ceo_plan: ceoPlan }).eq('id', runId);
    await logAgentActivity(runId, 'ceo', 'output', `CEO Daily Plan:\n\n${ceoPlan}`);

    // --- PHASE 2: RESEARCHER AGENT FINDS LEADS ---
    await logAgentActivity(runId, 'ceo', 'thought', `CEO: Instructing the Researcher Agent to find 30 realtors in ${chosenArea} (using page ${page}).`);
    await logAgentActivity(runId, 'researcher', 'thought', `Researcher: Commencing search for realtors in ${chosenArea} (page ${page}) using Apollo.io.`);

    // Call the Apollo API to search and enrich realtors
    const enrichedRealtors = await findAndEnrichRealtors(apolloLocation, page, 30);
    await logAgentActivity(runId, 'researcher', 'tool_call', `Called Apollo.io mixed_people/api_search (page ${page}) and enriched contacts for ${chosenArea}.`);

    if (enrichedRealtors.length === 0) {
      await logAgentActivity(runId, 'researcher', 'error', 'Researcher: No realtors found or enriched. Aborting run.');
      throw new Error('Researcher found no realtor leads.');
    }

    // Insert leads into outreach_contacts
    let newLeadsCount = 0;
    const addedLeads = [];

    for (const lead of enrichedRealtors) {
      const { data: existing } = await supabase
        .from('outreach_contacts')
        .select('id')
        .eq('email', lead.email)
        .maybeSingle();

      if (!existing) {
        const { data: inserted, error: insertErr } = await supabase
          .from('outreach_contacts')
          .insert({
            user_id: defaultUserId,
            name: lead.name,
            business: lead.organization_name || 'Real Estate Agency',
            email: lead.email,
            source: 'apollo',
            email_status: 'pending',
          })
          .select('*')
          .single();

        if (!insertErr && inserted) {
          newLeadsCount++;
          addedLeads.push(inserted);
        }
      }
    }

    const researcherSummary = `Researcher: Found and enriched ${enrichedRealtors.length} realtor profiles. Successfully added ${newLeadsCount} new leads to the outreach campaign.\n\nList:\n` + 
      enrichedRealtors.map(r => `- ${r.name} (${r.organization_name}) - ${r.email}`).join('\n');
    await logAgentActivity(runId, 'researcher', 'output', researcherSummary);

    // --- PHASE 3: COPYWRITER CRAFTS & SENDS EMAILS ---
    if (addedLeads.length === 0) {
      await logAgentActivity(runId, 'copywriter', 'thought', 'Copywriter: No pending new leads to email. Skipping outreach.');
    } else {
      await logAgentActivity(runId, 'ceo', 'thought', `CEO: Directing Copywriter Agent to write and send personalized emails to the ${addedLeads.length} new prospects.`);
      await logAgentActivity(runId, 'copywriter', 'thought', `Copywriter: Getting Gmail connection and starting email generation.`);

      // Setup Gmail API
      const { data: tokens } = await supabase.from('gmail_tokens').select('*').single();
      if (!tokens) {
        await logAgentActivity(runId, 'copywriter', 'error', 'Copywriter: Gmail tokens not found. Make sure Gmail is connected. Aborting outreach.');
        throw new Error('Gmail not connected.');
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      });

      // Refresh token if needed
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      if (credentials.access_token !== tokens.access_token) {
        await supabase
          .from('gmail_tokens')
          .update({
            access_token: credentials.access_token,
            expiry_date: credentials.expiry_date,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tokens.id);
      }

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const senderEmail = tokens.email || 'anthony@amplyfyconsulting.com';

      // Iterate through the leads and draft + send emails
      for (const lead of addedLeads) {
        await logAgentActivity(runId, 'copywriter', 'thought', `Copywriter: Writing cold email copy for ${lead.name} (${lead.business}).`);

        const copyPrompt = `You are an expert cold email copywriter and sales outreach specialist at AMPLYFY Consulting. Your mission is to write a short, highly personalized cold email to:
Realtor Name: ${lead.name}
Agency: ${lead.business}
Location/State: ${chosenArea}

Our product: We make professional AI-generated house tour walkthrough videos using only the property listing photos. These videos are perfect for promoting listings on social media (Instagram, TikTok, YouTube) and marketing online.
Goal: Get them to reply to this email. If they reply, we will build them a free custom house tour video from one of their active listings as a sample, no strings attached.

Email Constraints:
1. Extremely short and to the point (under 80-120 words).
2. Tone should be professional, direct, non-salesy, and write like a human. Avoid clichés like "I hope this email finds you well" or "As a busy real estate agent...". Go straight to the value.
3. Personalize using their name and agency.
4. Include a clear, low-friction call to action offering a free custom video walkthrough sample if they reply.

Return a JSON object containing:
{
  "subject": "The email subject line",
  "body": "The email body in plain HTML (use <br/> for line breaks, <p> tags, etc.)"
}

Do not return any conversational text, only the raw JSON.`;

        const copyResponse = await anthropic.messages.create({
          model: modelName,
          max_tokens: 400,
          temperature: 0.8,
          messages: [{ role: 'user', content: copyPrompt }],
        });

        const rawJsonText = copyResponse.content[0].type === 'text' ? copyResponse.content[0].text : '{}';
        const parsedCopy = extractJson(rawJsonText);
        
        const subject = parsedCopy.subject || `AI Walkthrough Videos for ${lead.business}`;
        const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/outreach/track/${lead.tracking_id}`;
        const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/outreach/unsubscribe`;

        // Inject tracking pixel and formatting to email body
        const htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.7; font-size: 15px;">
            ${parsedCopy.body}
            <br/><br/>
            <p style="font-size: 11px; color: #999; line-height: 1.5; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
              AMPLYFY Consulting | United States<br/>
              <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
            </p>
            <img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />
          </div>
        `;

        // Build and send RFC 2822 message
        const encodedSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
          `From: Anthony Pernerewski <${senderEmail}>`,
          `To: ${lead.email}`,
          `Subject: ${encodedSubject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=utf-8',
          '',
          htmlBody,
        ];
        const rawMessage = messageParts.join('\r\n');
        const encodedMessage = Buffer.from(rawMessage)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        // Send via Gmail
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        });

        // Update database
        await supabase
          .from('outreach_contacts')
          .update({
            email_status: 'sent',
            email_sent_at: new Date().toISOString(),
            email_subject: subject,
            email_body: htmlBody,
          })
          .eq('id', lead.id);

        await logAgentActivity(
          runId,
          'copywriter',
          'output',
          `Sent email to ${lead.name} (${lead.email})\nSubject: ${subject}\nDraft Preview:\n${parsedCopy.body}`
        );

        // Sleep briefly to prevent throttling
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    // --- PHASE 4: REVIEWER AGENT TRACKS METRICS & CHECK REPLIES ---
    await logAgentActivity(runId, 'ceo', 'thought', 'CEO: Instructing the Reviewer Agent to analyze campaign performance and scan Gmail for new replies.');
    await logAgentActivity(runId, 'reviewer', 'thought', 'Reviewer: Commencing daily review. Fetching historical data and checking for Gmail replies.');

    // Fetch sent email stats
    const { data: allOutreach } = await supabase.from('outreach_contacts').select('email, email_status');
    const totalSent = allOutreach?.filter(c => ['sent', 'opened', 'replied'].includes(c.email_status || '')).length || 0;
    const totalOpened = allOutreach?.filter(c => ['opened', 'replied'].includes(c.email_status || '')).length || 0;
    const totalReplied = allOutreach?.filter(c => c.email_status === 'replied').length || 0;

    const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
    const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;

    // Scan Gmail Inbox for replies
    let newRepliesCount = 0;
    try {
      const { data: tokens } = await supabase.from('gmail_tokens').select('*').single();
      if (tokens) {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GMAIL_CLIENT_ID,
          process.env.GMAIL_CLIENT_SECRET,
          process.env.GMAIL_REDIRECT_URI
        );
        oauth2Client.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
        });

        // Search messages in last 2 days
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const listRes = await gmail.users.messages.list({
          userId: 'me',
          q: `after:${Math.floor(Date.now() / 1000 - 2 * 24 * 3600)}`,
        });

        const messages = listRes.data.messages || [];
        const activeContactEmails = allOutreach?.map(c => c.email.toLowerCase()) || [];

        for (const msgInfo of messages) {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msgInfo.id!,
            format: 'metadata',
            metadataHeaders: ['From'],
          });

          const fromHeader = detail.data.payload?.headers?.find(h => h.name === 'From')?.value || '';
          // Extract email from "Name <email@domain.com>"
          const emailMatch = fromHeader.match(/<([^>]+)>/) || [null, fromHeader];
          const senderEmail = emailMatch[1]?.trim().toLowerCase();

          if (senderEmail && activeContactEmails.includes(senderEmail)) {
            // Check if this contact has been marked as replied
            const { data: matchContact } = await supabase
              .from('outreach_contacts')
              .select('id, name, email_status')
              .eq('email', senderEmail)
              .single();

            if (matchContact && matchContact.email_status !== 'replied') {
              // Update status in outreach_contacts
              await supabase
                .from('outreach_contacts')
                .update({ email_status: 'replied' })
                .eq('id', matchContact.id);

              // Log new activity in activity_logs
              await supabase.from('activity_logs').insert({
                user_id: defaultUserId,
                type: 'reply',
                title: `Reply received from ${matchContact.name}`,
                description: `Email reply from ${senderEmail} matching realtor outreach.`,
                icon: 'Mail',
              });

              newRepliesCount++;
              await logAgentActivity(runId, 'reviewer', 'output', `Reviewer: Detected new email response from ${matchContact.name} (${senderEmail})! Updated lead status to 'replied'.`);
            }
          }
        }
      }
    } catch (inboxError) {
      console.error('Error scanning Gmail inbox for replies:', inboxError);
      await logAgentActivity(runId, 'reviewer', 'error', `Reviewer: Warning - failed to scan Gmail inbox for replies: ${inboxError}`);
    }

    const reviewSummary = `Reviewer: Performance Analysis Completed.
- Total Active Outreach Leads: ${allOutreach?.length || 0}
- Sent: ${totalSent}
- Opened: ${totalOpened + newRepliesCount} (Open Rate: ${openRate}%)
- Replies Tracked: ${totalReplied + newRepliesCount} (Reply Rate: ${replyRate}%)
- New Replies Detected Today: ${newRepliesCount}`;

    await logAgentActivity(runId, 'reviewer', 'output', reviewSummary);

    // --- PHASE 5: CEO COMPILING DAILY REPORT ---
    await logAgentActivity(runId, 'ceo', 'thought', 'CEO: Formulating the final daily report and compiling statistics.');

    const reportPrompt = `You are the CEO Agent in AMPLYFY CRM. Today's run is complete.
Summarize today's workflow in a daily report markdown.
- Target Location: ${chosenArea}
- Realtor Leads Scraped & Enriched: ${enrichedRealtors.length}
- Emails Sent: ${addedLeads.length}
- New replies found today: ${newRepliesCount}
- Overall Campaign Stats: Sent: ${totalSent + addedLeads.length}, Open Rate: ${openRate}%, Reply Rate: ${replyRate}%

Include a brief summary paragraph of the day's operations. The tone should be highly professional, structured, and premium.`;

    const reportResponse = await anthropic.messages.create({
      model: modelName,
      max_tokens: 600,
      system: 'You are the CEO Agent.',
      messages: [{ role: 'user', content: reportPrompt }],
    });

    const dailyReport = reportResponse.content[0].type === 'text' ? reportResponse.content[0].text : 'Daily report compiled.';
    
    await supabase
      .from('agent_runs')
      .update({
        daily_report: dailyReport,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    await logAgentActivity(runId, 'ceo', 'output', `CEO: Daily Run Completed successfully. Daily Report compiled.\n\n${dailyReport}`);
    
    const { data: completedRun } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('id', runId)
      .single();
    return completedRun;

  } catch (err: any) {
    console.error('Agent workflow crashed:', err);
    await logAgentActivity(runId, 'ceo', 'error', `CEO: Workflow failed during run. Error details: ${err.message || err}`);
    
    await supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    const { data: failedRun } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('id', runId)
      .single();
    return failedRun;
  }
}
