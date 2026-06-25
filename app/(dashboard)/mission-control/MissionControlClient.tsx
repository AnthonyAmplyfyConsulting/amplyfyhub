'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Network, 
  Play, 
  Terminal, 
  Bot, 
  User, 
  Mail, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Search,
  MessageSquare
} from 'lucide-react'
import { triggerWorkflowAction, getRunDetailsAction } from './actions'

interface Run {
  id: string;
  run_date: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  ceo_plan: string | null;
  daily_report: string | null;
  created_at: string;
  completed_at: string | null;
}

interface Log {
  id: string;
  run_id: string;
  agent_name: 'ceo' | 'researcher' | 'copywriter' | 'reviewer';
  log_type: 'thought' | 'tool_call' | 'output' | 'error';
  content: string;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  business: string;
  email: string;
  email_status: 'pending' | 'sent' | 'opened' | 'bounced' | 'replied';
  email_sent_at: string | null;
  email_opened_at: string | null;
  email_subject: string | null;
  scraped_at: string;
  source: string;
}

interface Props {
  initialRuns: Run[];
  initialLogs: Log[];
  initialContacts: Contact[];
}

export default function MissionControlClient({ initialRuns, initialLogs, initialContacts }: Props) {
  const [runs, setRuns] = useState<Run[]>(initialRuns)
  const [activeRun, setActiveRun] = useState<Run | null>(initialRuns[0] || null)
  const [logs, setLogs] = useState<Log[]>(initialLogs)
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  
  const [selectedAgent, setSelectedAgent] = useState<'ceo' | 'researcher' | 'copywriter' | 'reviewer'>('ceo')
  const [triggering, setTriggering] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const logsEndRef = useRef<HTMLDivElement>(null)

  // Polling for updates if the active run is currently running
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (activeRun && activeRun.status === 'running') {
      interval = setInterval(async () => {
        const details = await getRunDetailsAction(activeRun.id)
        if (details.run) {
          // Update active run
          setActiveRun(details.run)
          setLogs(details.logs)
          setContacts(details.contacts)
          
          // Update runs list
          setRuns(prev => prev.map(r => r.id === details.run.id ? details.run : r))
          
          // Stop polling if complete
          if (details.run.status !== 'running') {
            clearInterval(interval)
          }
        }
      }, 3000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeRun?.status, activeRun?.id])

  // Scroll logs to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Handles manual run trigger
  const handleTriggerRun = async () => {
    if (triggering || (activeRun && activeRun.status === 'running')) return
    
    setTriggering(true)
    
    // Optimistic run creation (temporary local state until server action returns)
    const tempRun: Run = {
      id: 'temp-id',
      run_date: new Date().toISOString().split('T')[0],
      status: 'running',
      ceo_plan: 'Initializing daily operation planning...',
      daily_report: null,
      created_at: new Date().toISOString(),
      completed_at: null
    }
    
    setActiveRun(tempRun)
    setRuns(prev => [tempRun, ...prev])
    setLogs([
      {
        id: 'temp-log',
        run_id: 'temp-id',
        agent_name: 'ceo',
        log_type: 'thought',
        content: 'Triggering daily operations manually. Activating the CEO agent...',
        created_at: new Date().toISOString()
      }
    ])
    
    const result = await triggerWorkflowAction()
    
    if (result.success && result.run) {
      // Replace temp run with actual run
      setActiveRun(result.run)
      setRuns(prev => prev.map(r => r.id === 'temp-id' ? result.run : r))
      
      // Fetch details to populate logs
      const details = await getRunDetailsAction(result.run.id)
      setLogs(details.logs)
      setContacts(details.contacts)
    } else {
      // Failed
      const failedRun: Run = {
        id: 'failed-id',
        run_date: new Date().toISOString().split('T')[0],
        status: 'failed',
        ceo_plan: 'Workflow execution failed.',
        daily_report: null,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      }
      setActiveRun(failedRun)
      setRuns(prev => prev.map(r => r.id === 'temp-id' ? failedRun : r))
      setLogs(prev => [
        ...prev,
        {
          id: 'failed-log',
          run_id: 'failed-id',
          agent_name: 'ceo',
          log_type: 'error',
          content: `Workflow failed: ${result.error || 'Unknown error'}`,
          created_at: new Date().toISOString()
        }
      ])
    }
    
    setTriggering(false)
  }

  // Switches history details view
  const handleSelectHistoryRun = async (run: Run) => {
    setActiveRun(run)
    const details = await getRunDetailsAction(run.id)
    setLogs(details.logs)
  }

  // Filter logs for the selected agent
  const filteredLogs = logs.filter(log => log.agent_name === selectedAgent)

  // Filter contacts list
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.business.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesFilter = filterStatus === 'all' || contact.email_status === filterStatus;
    
    return matchesSearch && matchesFilter;
  })

  // Determine active agent based on last logs when running
  const getActiveAgentName = () => {
    if (!activeRun || activeRun.status !== 'running') return null
    if (logs.length === 0) return 'ceo'
    
    const lastLog = logs[logs.length - 1]
    return lastLog.agent_name
  }

  const activeAgent = getActiveAgentName()

  // Agent descriptions for the sidebar panel
  const agentDetails = {
    ceo: {
      role: 'CEO Orchestrator',
      description: 'Responsible for formulating the daily campaign strategy, managing the subordinate agents, compiling final daily reports, and overseeing system operations.',
      prompt: 'Formulates plans targeting wealthy communities in CT, MA, NY. Initiates the research phase, directs email outreach drafts, monitors stats, and writes reports.',
      icon: User
    },
    researcher: {
      role: 'Lead Researcher & Prospector',
      description: 'Uses the Apollo.io REST Search and match API to query verified real estate agents in high-net-worth neighborhoods across CT, MA, and NY.',
      prompt: 'Filters results for verified emails, matches details to reveal full name/agency, and registers leads in the database for copywriting.',
      icon: Users
    },
    copywriter: {
      role: 'Outreach & Copywriting Specialist',
      description: 'Uses advanced copywriting techniques to craft highly personal, direct, and short cold emails offering AI-generated walkthrough videos from listing photos.',
      prompt: 'Creates subject lines and plain-text body containing a tracking pixel, then sends emails using OAuth credentials via the Gmail API.',
      icon: Mail
    },
    reviewer: {
      role: 'Performance Analyst',
      description: 'Monitors opens, tracks unsubscribe clicks, and scans the connected Gmail inbox for replies from prospected contacts to evaluate campaign effectiveness.',
      prompt: 'Calculates response ratios, flags replied accounts, logs notifications in the CRM, and reports metrics back to the CEO.',
      icon: MessageSquare
    }
  }

  const AgentIcon = agentDetails[selectedAgent].icon

  return (
    <div className="mc-container">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-charcoal">
            <Network className="text-brand-orange" size={26} />
            Mission Control
          </h1>
          <p className="text-sm text-gray-500">Orchestrate and monitor your CRM\'s automated daily AI workflows.</p>
        </div>
        
        <button
          onClick={handleTriggerRun}
          disabled={triggering || (activeRun && activeRun.status === 'running')}
          className="em-btn em-btn-primary flex items-center gap-2"
        >
          {triggering || (activeRun && activeRun.status === 'running') ? (
            <>
              <RefreshCw className="animate-spin" size={16} />
              Running Operations...
            </>
          ) : (
            <>
              <Play fill="white" size={14} />
              Run Daily Campaign
            </>
          )}
        </button>
      </div>

      {/* Main Pyramid and Logs Grid */}
      <div className="mc-grid">
        {/* Pyramid Card */}
        <div className="mc-pyramid-card">
          <div className="mc-pyramid-title">
            <Bot size={18} className="text-brand-orange" />
            <h3>Agent Network Grid</h3>
          </div>

          <div className="mc-pyramid-canvas">
            {/* SVG Connections Layer */}
            <svg className="mc-svg-connections" viewBox="0 0 600 380">
              {/* CEO to Researcher */}
              <path 
                d="M 300 70 L 115 300" 
                className={`mc-line ${activeRun?.status === 'running' ? 'mc-line-active' : ''} ${activeAgent === 'researcher' ? 'mc-pulse' : ''}`}
              />
              {/* CEO to Copywriter */}
              <path 
                d="M 300 70 L 300 300" 
                className={`mc-line ${activeRun?.status === 'running' ? 'mc-line-active' : ''} ${activeAgent === 'copywriter' ? 'mc-pulse' : ''}`}
              />
              {/* CEO to Reviewer */}
              <path 
                d="M 300 70 L 485 300" 
                className={`mc-line ${activeRun?.status === 'running' ? 'mc-line-active' : ''} ${activeAgent === 'reviewer' ? 'mc-pulse' : ''}`}
              />
            </svg>

            {/* CEO Agent Node (Apex) */}
            <div 
              onClick={() => setSelectedAgent('ceo')}
              className={`mc-node mc-node-ceo ${selectedAgent === 'ceo' ? 'border-brand-orange ring-2 ring-brand-orange/20' : ''} ${activeAgent === 'ceo' ? 'mc-node-active' : ''} ${activeRun && activeRun.status !== 'running' ? 'mc-node-sleeping' : ''}`}
            >
              <div className="mc-node-icon">
                <User size={22} />
              </div>
              <span className="mc-node-label">CEO Agent</span>
              <span className="mc-node-status">
                {activeRun?.status === 'running' && activeAgent === 'ceo' ? 'Active' : 'Sleeping'}
              </span>
            </div>

            {/* Researcher Agent Node (Bottom Left) */}
            <div 
              onClick={() => setSelectedAgent('researcher')}
              className={`mc-node mc-node-researcher ${selectedAgent === 'researcher' ? 'border-brand-orange ring-2 ring-brand-orange/20' : ''} ${activeAgent === 'researcher' ? 'mc-node-active' : ''} ${activeRun && activeRun.status !== 'running' ? 'mc-node-sleeping' : ''}`}
            >
              <div className="mc-node-icon">
                <Users size={22} />
              </div>
              <span className="mc-node-label">Researcher</span>
              <span className="mc-node-status">
                {activeRun?.status === 'running' && activeAgent === 'researcher' ? 'Active' : 'Sleeping'}
              </span>
            </div>

            {/* Copywriter Agent Node (Bottom Center) */}
            <div 
              onClick={() => setSelectedAgent('copywriter')}
              className={`mc-node mc-node-copywriter ${selectedAgent === 'copywriter' ? 'border-brand-orange ring-2 ring-brand-orange/20' : ''} ${activeAgent === 'copywriter' ? 'mc-node-active' : ''} ${activeRun && activeRun.status !== 'running' ? 'mc-node-sleeping' : ''}`}
            >
              <div className="mc-node-icon">
                <Mail size={22} />
              </div>
              <span className="mc-node-label">Copywriter</span>
              <span className="mc-node-status">
                {activeRun?.status === 'running' && activeAgent === 'copywriter' ? 'Active' : 'Sleeping'}
              </span>
            </div>

            {/* Reviewer Agent Node (Bottom Right) */}
            <div 
              onClick={() => setSelectedAgent('reviewer')}
              className={`mc-node mc-node-reviewer ${selectedAgent === 'reviewer' ? 'border-brand-orange ring-2 ring-brand-orange/20' : ''} ${activeAgent === 'reviewer' ? 'mc-node-active' : ''} ${activeRun && activeRun.status !== 'running' ? 'mc-node-sleeping' : ''}`}
            >
              <div className="mc-node-icon">
                <MessageSquare size={22} />
              </div>
              <span className="mc-node-label">Reviewer</span>
              <span className="mc-node-status">
                {activeRun?.status === 'running' && activeAgent === 'reviewer' ? 'Active' : 'Sleeping'}
              </span>
            </div>
          </div>
        </div>

        {/* Selected Agent Logs & Detail Panel */}
        <div className="mc-panel-card">
          <div className="mc-panel-header">
            <div className="mc-panel-agent-info">
              <div className="w-10 h-10 rounded-full bg-brand-gradient-soft text-brand-orange-deep flex items-center justify-center">
                <AgentIcon size={20} />
              </div>
              <div>
                <h4 className="mc-panel-title">{agentDetails[selectedAgent].role}</h4>
                <p className="mc-panel-subtitle">{agentDetails[selectedAgent].description}</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
              <Terminal size={10} />
              LOGS
            </span>
          </div>

          <div className="mc-logs-scroll">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
                <Clock size={32} strokeWidth={1.5} className="opacity-60" />
                <p>No activity logged for this agent in this run.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {filteredLogs.map((log) => {
                  const logTypeClass = 
                    log.log_type === 'thought' ? 'mc-log-entry-thought' :
                    log.log_type === 'output' ? 'mc-log-entry-output' :
                    log.log_type === 'error' ? 'mc-log-entry-error' : '';

                  return (
                    <div key={log.id} className={`mc-log-entry ${logTypeClass}`}>
                      <div className="flex items-baseline mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {log.log_type}
                        </span>
                        <span className="mc-log-time">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="mc-log-text">{log.content}</div>
                    </div>
                  )
                })}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reports and Historical Runs Grid */}
      <div className="mc-report-section">
        {/* Daily Report Detail */}
        <div className="mc-report-card">
          <h3>
            <Clock size={18} className="text-brand-orange" />
            CEO Daily Plan & Report — {activeRun ? new Date(activeRun.created_at).toLocaleDateString() : 'No Runs'}
          </h3>

          {!activeRun ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <AlertCircle size={40} className="mb-2 opacity-55" />
              <p>No daily runs recorded yet. Click "Run Daily Campaign" to begin.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {activeRun.ceo_plan && (
                <div>
                  <h4 className="text-sm font-bold text-charcoal mb-2 uppercase tracking-wide text-brand-orange-deep">Daily Plan (8:00 AM)</h4>
                  <div className="mc-report-content bg-gray-50/50 p-4 border rounded-xl whitespace-pre-wrap">
                    {activeRun.ceo_plan}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold text-charcoal mb-2 uppercase tracking-wide text-brand-orange-deep">Daily Report</h4>
                {activeRun.status === 'running' ? (
                  <div className="flex items-center gap-3 p-4 bg-orange-50/40 border border-orange-100 rounded-xl text-brand-orange-deep font-semibold text-sm">
                    <RefreshCw className="animate-spin" size={16} />
                    CEO is currently executing daily actions. Final report will compile upon completion.
                  </div>
                ) : activeRun.daily_report ? (
                  <div className="mc-report-content bg-gray-50/50 p-4 border rounded-xl whitespace-pre-wrap">
                    {activeRun.daily_report}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No report compiled for this run.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* History Checklist Card */}
        <div className="mc-history-card">
          <h3>Campaign Log History</h3>
          {runs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No execution logs.</p>
          ) : (
            <div className="mc-history-list">
              {runs.map((run) => {
                const isActive = activeRun?.id === run.id;
                const statusClass = 
                  run.status === 'completed' ? 'mc-status-completed' :
                  run.status === 'failed' ? 'mc-status-failed' : 'mc-status-running';

                return (
                  <div
                    key={run.id}
                    onClick={() => handleSelectHistoryRun(run)}
                    className={`mc-history-item ${isActive ? 'mc-history-item-active' : ''}`}
                  >
                    <span className="mc-history-date">
                      {new Date(run.created_at).toLocaleDateString()} at {new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`mc-history-status ${statusClass}`}>
                      {run.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Generated Leads & Outreach Status */}
      <div className="em-table-wrapper mt-4">
        <div className="p-5 border-b flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-md font-bold text-charcoal flex items-center gap-2">
              <Users className="text-brand-orange" size={20} />
              Realtor Outreach List
            </h3>
            <p className="text-xs text-gray-500">Leads generated by Researcher and emailed by Copywriter.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Box */}
            <div className="em-search-box max-w-[240px]">
              <Search size={16} className="em-search-icon" />
              <input
                type="text"
                placeholder="Search realtors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="em-search-input"
              />
            </div>

            {/* Filter Buttons */}
            <div className="em-filter-group">
              {['all', 'pending', 'sent', 'opened', 'replied'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`em-filter-btn ${filterStatus === status ? 'em-filter-active' : ''}`}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="em-empty">
            <div className="em-empty-icon">
              <Users size={32} />
            </div>
            <h3>No contacts found</h3>
            <p>Try running the campaign or adjusting your search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="em-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Agency / Business</th>
                  <th>Status</th>
                  <th>Emailed Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => {
                  const statusClass = 
                    contact.email_status === 'replied' ? 'bg-success-light text-success' :
                    contact.email_status === 'opened' ? 'bg-success-light text-success' :
                    contact.email_status === 'sent' ? 'bg-info-light text-info' : 'bg-gray-100 text-gray-500';

                  return (
                    <tr key={contact.id} className="em-row">
                      <td>
                        <div className="em-contact-cell">
                          <div className="em-contact-avatar">
                            {contact.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="em-contact-name">{contact.name}</div>
                            <div className="text-[10px] text-gray-400 capitalize">Source: {contact.source}</div>
                          </div>
                        </div>
                      </td>
                      <td className="em-email-cell">{contact.email}</td>
                      <td className="em-phone-cell font-semibold">{contact.business}</td>
                      <td>
                        <span className={`em-status-badge ${statusClass}`}>
                          {contact.email_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="em-date-cell">
                        {contact.email_sent_at 
                          ? new Date(contact.email_sent_at).toLocaleDateString() + ' ' + new Date(contact.email_sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Not sent yet'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
