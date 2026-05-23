'use client'

import { useState } from 'react'
import {
  Phone, Eye, Search, CheckCircle2, Calendar, UserPlus,
  Loader2, Mail, Building2, ExternalLink, X
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
  contacted: boolean
  contacted_at: string | null
  audit_booked: boolean
  pipeline_lead_id: string | null
}

type Stats = {
  total: number
  opened: number
  contacted: number
  auditsBooked: number
}

export default function ColdCallsClient({ initialContacts, stats }: { initialContacts: Contact[]; stats: Stats }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'opened' | 'pending'>('all')
  const [auditModal, setAuditModal] = useState<{ contactId: string; name: string; business: string } | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.business.toLowerCase().includes(searchTerm.toLowerCase())
    if (filter === 'opened') return matchesSearch && c.email_status === 'opened' && !c.contacted
    if (filter === 'pending') return matchesSearch && !c.contacted
    return matchesSearch
  })

  // Separate active vs completed
  const activeContacts = filteredContacts.filter(c => !c.contacted)
  const completedContacts = filteredContacts.filter(c => c.contacted)

  const handleToggle = async (contactId: string, name: string, business: string) => {
    // Show the audit modal
    setAuditModal({ contactId, name, business })
  }

  const handleAuditDecision = async (auditBooked: boolean) => {
    if (!auditModal) return
    setProcessing(auditModal.contactId)

    try {
      // First toggle contacted
      await fetch('/api/outreach/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: auditModal.contactId, contacted: true }),
      })

      // Then create pipeline lead
      const res = await fetch('/api/outreach/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: auditModal.contactId, auditBooked }),
      })

      const data = await res.json()

      if (data.success) {
        setContacts(prev => prev.map(c =>
          c.id === auditModal.contactId
            ? { ...c, contacted: true, contacted_at: new Date().toISOString(), audit_booked: auditBooked, pipeline_lead_id: data.lead?.id }
            : c
        ))
      }
    } catch (error) {
      console.error('Error processing contact:', error)
    } finally {
      setProcessing(null)
      setAuditModal(null)
    }
  }

  return (
    <div className="cc-page">
      {/* Header */}
      <div className="page-header mb-8">
        <h1 className="page-title">Cold Calls</h1>
        <p className="page-subtitle">Call prospects who received outreach emails. Toggle when contacted and track audit bookings.</p>
      </div>

      {/* KPI Strip */}
      <div className="cc-kpi-strip">
        <div className="cc-kpi-item">
          <span className="cc-kpi-num">{stats.total}</span>
          <span className="cc-kpi-text">Total Leads</span>
        </div>
        <div className="cc-kpi-divider" />
        <div className="cc-kpi-item">
          <span className="cc-kpi-num cc-green">{stats.opened}</span>
          <span className="cc-kpi-text">Opened Email</span>
        </div>
        <div className="cc-kpi-divider" />
        <div className="cc-kpi-item">
          <span className="cc-kpi-num cc-blue">{stats.contacted}</span>
          <span className="cc-kpi-text">Contacted</span>
        </div>
        <div className="cc-kpi-divider" />
        <div className="cc-kpi-item">
          <span className="cc-kpi-num cc-orange">{stats.auditsBooked}</span>
          <span className="cc-kpi-text">Audits Booked</span>
        </div>
      </div>

      {/* Filters */}
      <div className="cc-toolbar">
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
          {(['all', 'opened', 'pending'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`em-filter-btn ${filter === f ? 'em-filter-active' : ''}`}
            >
              {f === 'all' ? 'All' : f === 'opened' ? '🔥 Opened' : 'Not Called'}
            </button>
          ))}
        </div>
      </div>

      {/* Active Contacts */}
      {activeContacts.length > 0 && (
        <div className="cc-section">
          <h2 className="cc-section-title">
            <Phone size={18} />
            To Call ({activeContacts.length})
          </h2>
          <div className="cc-grid">
            {activeContacts.map(contact => (
              <div key={contact.id} className={`cc-card ${contact.email_status === 'opened' ? 'cc-card-hot' : ''}`}>
                <div className="cc-card-header">
                  <div className="cc-card-avatar">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="cc-card-info">
                    <h3 className="cc-card-name">{contact.name}</h3>
                    <p className="cc-card-biz">
                      <Building2 size={12} />
                      {contact.business}
                    </p>
                  </div>
                  {contact.email_status === 'opened' && (
                    <div className="cc-opened-badge">
                      <Eye size={12} />
                      Opened
                    </div>
                  )}
                </div>

                <div className="cc-card-details">
                  <div className="cc-detail-row">
                    <Mail size={14} />
                    <span>{contact.email}</span>
                  </div>
                  {contact.phone && (
                    <div className="cc-detail-row">
                      <Phone size={14} />
                      <a href={`tel:${contact.phone}`} className="cc-phone-link">{contact.phone}</a>
                    </div>
                  )}
                  {contact.website && (
                    <div className="cc-detail-row">
                      <ExternalLink size={14} />
                      <a href={contact.website} target="_blank" rel="noreferrer" className="cc-web-link">
                        {contact.website.replace(/^https?:\/\//, '').slice(0, 30)}
                      </a>
                    </div>
                  )}
                </div>

                <div className="cc-card-footer">
                  <span className="cc-sent-date">
                    Emailed {contact.email_sent_at
                      ? new Date(contact.email_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'
                    }
                  </span>
                  <button
                    onClick={() => handleToggle(contact.id, contact.name, contact.business)}
                    disabled={processing === contact.id}
                    className="cc-toggle-btn"
                  >
                    {processing === contact.id ? (
                      <Loader2 size={16} className="em-spin" />
                    ) : (
                      <>
                        <Phone size={14} />
                        Mark Contacted
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Contacts */}
      {completedContacts.length > 0 && (
        <div className="cc-section">
          <h2 className="cc-section-title cc-section-muted">
            <CheckCircle2 size={18} />
            Contacted ({completedContacts.length})
          </h2>
          <div className="cc-grid">
            {completedContacts.map(contact => (
              <div key={contact.id} className="cc-card cc-card-done">
                <div className="cc-card-header">
                  <div className="cc-card-avatar cc-avatar-done">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="cc-card-info">
                    <h3 className="cc-card-name">{contact.name}</h3>
                    <p className="cc-card-biz">
                      <Building2 size={12} />
                      {contact.business}
                    </p>
                  </div>
                  {contact.audit_booked ? (
                    <div className="cc-booked-badge">
                      <Calendar size={12} />
                      Audit Booked
                    </div>
                  ) : (
                    <div className="cc-newlead-badge">
                      <UserPlus size={12} />
                      New Lead
                    </div>
                  )}
                </div>
                <div className="cc-card-footer">
                  <span className="cc-sent-date">
                    Called {contact.contacted_at
                      ? new Date(contact.contacted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'
                    }
                  </span>
                  <span className="cc-done-label">✓ Done</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredContacts.length === 0 && (
        <div className="em-empty" style={{ marginTop: '60px' }}>
          <div className="em-empty-icon"><Phone size={24} /></div>
          <h3>No contacts to call</h3>
          <p>Contacts will appear here after outreach emails are sent from the Email Marketing page.</p>
        </div>
      )}

      {/* Audit Modal */}
      {auditModal && (
        <div className="cc-modal-overlay" onClick={() => setAuditModal(null)}>
          <div className="cc-modal" onClick={e => e.stopPropagation()}>
            <button className="cc-modal-close" onClick={() => setAuditModal(null)}>
              <X size={18} />
            </button>
            <div className="cc-modal-icon-wrap">
              <Calendar size={28} />
            </div>
            <h2 className="cc-modal-title">Was an audit booked?</h2>
            <p className="cc-modal-desc">
              You contacted <strong>{auditModal.name}</strong> from <strong>{auditModal.business}</strong>.
              <br />Did they book an AI audit?
            </p>
            <div className="cc-modal-buttons">
              <button
                onClick={() => handleAuditDecision(false)}
                disabled={processing === auditModal.contactId}
                className="cc-modal-btn cc-modal-btn-no"
              >
                <UserPlus size={18} />
                No — Add as New Lead
              </button>
              <button
                onClick={() => handleAuditDecision(true)}
                disabled={processing === auditModal.contactId}
                className="cc-modal-btn cc-modal-btn-yes"
              >
                {processing === auditModal.contactId ? (
                  <Loader2 size={18} className="em-spin" />
                ) : (
                  <Calendar size={18} />
                )}
                Yes — Audit Booked!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
