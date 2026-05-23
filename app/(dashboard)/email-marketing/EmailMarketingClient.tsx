'use client'

import { useState } from 'react'
import {
  Mail, Send, Search, Zap, CheckCircle2, Clock, Eye,
  AlertCircle, Loader2, Link2, Unlink, RefreshCw,
  Users, MailOpen, Timer, Database
} from 'lucide-react'

type Contact = {
  id: string
  name: string
  business: string
  email: string
  phone: string | null
  website: string | null
  email_status: string
  email_sent_at: string | null
  email_opened_at: string | null
  tracking_id: string
  created_at: string
}

type Stats = {
  sentToday: number
  totalSent: number
  totalOpened: number
  openRate: number
  pendingCount: number
  totalContacts: number
}

type Props = {
  initialContacts: Contact[]
  gmailConnected: boolean
  gmailEmail: string | null
  stats: Stats
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: '#9E9E9E', bg: 'rgba(158,158,158,0.1)', icon: <Clock size={12} /> },
  sent: { label: 'Sent', color: '#2196F3', bg: 'rgba(33,150,243,0.1)', icon: <Send size={12} /> },
  opened: { label: 'Opened', color: '#4CAF50', bg: 'rgba(76,175,80,0.1)', icon: <Eye size={12} /> },
  bounced: { label: 'Bounced', color: '#E53935', bg: 'rgba(229,57,53,0.1)', icon: <AlertCircle size={12} /> },
  replied: { label: 'Replied', color: '#FF9800', bg: 'rgba(255,152,0,0.1)', icon: <CheckCircle2 size={12} /> },
}

export default function EmailMarketingClient({ initialContacts, gmailConnected, gmailEmail, stats }: Props) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [scraping, setScraping] = useState(false)
  const [sending, setSending] = useState(false)
  const [scrapeQuery, setScrapeQuery] = useState('')
  const [showScrapeModal, setShowScrapeModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.business.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.email_status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleScrape = async () => {
    if (!scrapeQuery.trim()) return
    setScraping(true)
    setMessage(null)
    try {
      const res = await fetch('/api/outreach/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery: scrapeQuery, maxResults: 2 }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        // Reload page to get fresh data
        window.location.reload()
      } else {
        setMessage({ type: 'error', text: data.error || 'Scrape failed' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to connect to scraper' })
    } finally {
      setScraping(false)
      setShowScrapeModal(false)
    }
  }

  const handleSendEmails = async () => {
    if (!gmailConnected) {
      setMessage({ type: 'error', text: 'Connect Gmail first!' })
      return
    }
    setSending(true)
    setMessage(null)
    try {
      const res = await fetch('/api/outreach/send-emails', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        window.location.reload()
      } else {
        setMessage({ type: 'error', text: data.error || 'Send failed' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send emails' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="em-page">
      {/* Header */}
      <div className="page-header mb-8">
        <div className="em-header-row">
          <div>
            <h1 className="page-title">Email Marketing</h1>
            <p className="page-subtitle">Automate lead scraping, cold outreach, and track engagement — all on autopilot.</p>
          </div>
          <div className="em-gmail-status">
            {gmailConnected ? (
              <div className="em-gmail-connected">
                <Link2 size={14} />
                <span>{gmailEmail || 'Gmail Connected'}</span>
                <div className="em-status-dot em-dot-green" />
              </div>
            ) : (
              <a href="/api/auth/gmail" className="em-gmail-connect-btn">
                <Unlink size={14} />
                Connect Gmail
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Alert message */}
      {message && (
        <div className={`em-alert em-alert-${message.type}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="em-alert-close">×</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="em-kpi-grid">
        <div className="em-kpi-card">
          <div className="em-kpi-icon" style={{ background: 'rgba(33,150,243,0.1)', color: '#2196F3' }}>
            <Send size={20} />
          </div>
          <div className="em-kpi-info">
            <span className="em-kpi-value">{stats.sentToday}</span>
            <span className="em-kpi-label">Sent Today</span>
          </div>
        </div>
        <div className="em-kpi-card">
          <div className="em-kpi-icon" style={{ background: 'rgba(76,175,80,0.1)', color: '#4CAF50' }}>
            <MailOpen size={20} />
          </div>
          <div className="em-kpi-info">
            <span className="em-kpi-value">{stats.openRate}%</span>
            <span className="em-kpi-label">Open Rate</span>
          </div>
        </div>
        <div className="em-kpi-card">
          <div className="em-kpi-icon" style={{ background: 'rgba(245,166,35,0.1)', color: '#F5A623' }}>
            <Database size={20} />
          </div>
          <div className="em-kpi-info">
            <span className="em-kpi-value">{stats.totalContacts}</span>
            <span className="em-kpi-label">Total Contacts</span>
          </div>
        </div>
        <div className="em-kpi-card">
          <div className="em-kpi-icon" style={{ background: 'rgba(156,39,176,0.1)', color: '#9C27B0' }}>
            <Timer size={20} />
          </div>
          <div className="em-kpi-info">
            <span className="em-kpi-value">{stats.pendingCount}</span>
            <span className="em-kpi-label">Pending Queue</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="em-actions-bar">
        <div className="em-search-box">
          <Search className="em-search-icon" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search contacts..."
            className="em-search-input"
          />
        </div>

        <div className="em-filter-group">
          {['all', 'pending', 'sent', 'opened', 'bounced'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`em-filter-btn ${statusFilter === status ? 'em-filter-active' : ''}`}
            >
              {status === 'all' ? 'All' : STATUS_CONFIG[status]?.label}
            </button>
          ))}
        </div>

        <div className="em-action-btns">
          <button onClick={() => setShowScrapeModal(true)} className="em-btn em-btn-secondary" disabled={scraping}>
            {scraping ? <Loader2 size={16} className="em-spin" /> : <Zap size={16} />}
            Scrape Leads
          </button>
          <button onClick={handleSendEmails} className="em-btn em-btn-primary" disabled={sending || !gmailConnected}>
            {sending ? <Loader2 size={16} className="em-spin" /> : <Send size={16} />}
            Send Emails
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="em-table-wrapper">
        <table className="em-table">
          <thead>
            <tr>
              <th>Contact</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Opened</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="em-empty">
                    <div className="em-empty-icon"><Users size={24} /></div>
                    <h3>No contacts found</h3>
                    <p>Run the scraper to find leads or adjust your filters.</p>
                    <button onClick={() => setShowScrapeModal(true)} className="em-btn em-btn-secondary" style={{ marginTop: '16px' }}>
                      <Zap size={16} /> Scrape Leads
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredContacts.map(contact => {
                const statusCfg = STATUS_CONFIG[contact.email_status] || STATUS_CONFIG.pending
                return (
                  <tr key={contact.id} className="em-row">
                    <td>
                      <div className="em-contact-cell">
                        <div className="em-contact-avatar">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="em-contact-name">{contact.name}</div>
                          <div className="em-contact-biz">{contact.business}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="em-email-cell">{contact.email}</span>
                    </td>
                    <td>
                      <span className="em-phone-cell">{contact.phone || '—'}</span>
                    </td>
                    <td>
                      <span
                        className="em-status-badge"
                        style={{ color: statusCfg.color, background: statusCfg.bg }}
                      >
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </td>
                    <td>
                      <span className="em-date-cell">
                        {contact.email_sent_at
                          ? new Date(contact.email_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'
                        }
                      </span>
                    </td>
                    <td>
                      <span className="em-date-cell">
                        {contact.email_opened_at
                          ? new Date(contact.email_opened_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                          : '—'
                        }
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Scrape Modal */}
      {showScrapeModal && (
        <div className="em-modal-overlay" onClick={() => setShowScrapeModal(false)}>
          <div className="em-modal" onClick={e => e.stopPropagation()}>
            <div className="em-modal-header">
              <Zap size={20} className="em-modal-icon" />
              <h2>Scrape New Leads</h2>
            </div>
            <p className="em-modal-desc">
              Enter a search query to find small/medium businesses. The scraper will find up to 2 contacts with emails and phone numbers (for testing).
            </p>
            <div className="em-modal-body">
              <label className="em-modal-label">Search Query</label>
              <input
                type="text"
                value={scrapeQuery}
                onChange={e => setScrapeQuery(e.target.value)}
                placeholder='e.g. "dentists in Miami" or "HVAC contractors near Orlando"'
                className="em-modal-input"
                autoFocus
              />
              <div className="em-modal-examples">
                <span className="em-modal-examples-label">Examples:</span>
                {['plumbers in Austin TX', 'restaurants in Miami', 'chiropractors in Orlando'].map(ex => (
                  <button key={ex} onClick={() => setScrapeQuery(ex)} className="em-example-chip">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
            <div className="em-modal-actions">
              <button onClick={() => setShowScrapeModal(false)} className="em-btn em-btn-ghost">Cancel</button>
              <button onClick={handleScrape} className="em-btn em-btn-primary" disabled={scraping || !scrapeQuery.trim()}>
                {scraping ? <Loader2 size={16} className="em-spin" /> : <Zap size={16} />}
                {scraping ? 'Scraping...' : 'Start Scrape'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
