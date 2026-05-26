'use client'

import { useState } from 'react'
import { X, Loader2, Save, Building2, Mail, Phone, DollarSign, StickyNote, Tag } from 'lucide-react'
import { updateLead } from '@/app/(dashboard)/leads/actions'

type Lead = {
  id: string
  name: string
  email: string | null
  phone: string | null
  business: string
  stage: string
  expected_value: number
  notes: string | null
  created_at: string
}

interface EditLeadModalProps {
  lead: Lead
  isOpen: boolean
  onClose: () => void
  onUpdated: (updated: Lead) => void
}

const STAGES = [
  'New Lead',
  'Contacted',
  'Audit Booked',
  'Audit Finished',
  'Deal Won',
  'Contract Signed',
  'Build in Progress',
  'Payment Received'
]

export default function EditLeadModal({ lead, isOpen, onClose, onUpdated }: EditLeadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(lead.name)
  const [business, setBusiness] = useState(lead.business)
  const [email, setEmail] = useState(lead.email || '')
  const [phone, setPhone] = useState(lead.phone || '')
  const [stage, setStage] = useState(lead.stage)
  const [expectedValue, setExpectedValue] = useState(lead.expected_value)
  const [notes, setNotes] = useState(lead.notes || '')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await updateLead(lead.id, {
        name,
        business,
        email,
        phone,
        stage,
        expected_value: expectedValue,
        notes,
      })
      onUpdated({
        ...lead,
        name,
        business,
        email: email || null,
        phone: phone || null,
        stage,
        expected_value: expectedValue,
        notes: notes || null,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 pb-4 flex justify-between items-center border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 font-bold text-lg">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit Lead</h2>
                <p className="text-xs text-gray-400 font-medium">
                  Added {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            {/* Name + Business */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:border-transparent transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                  <Building2 size={12} /> Business Name
                </label>
                <input
                  type="text"
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:border-transparent transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                  <Mail size={12} /> Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:border-transparent transition-all text-sm"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                  <Phone size={12} /> Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:border-transparent transition-all text-sm"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Stage + Expected Value */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                  <Tag size={12} /> Pipeline Stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:border-transparent transition-all text-sm bg-white font-medium"
                >
                  {STAGES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                  <DollarSign size={12} /> Expected Value
                </label>
                <input
                  type="number"
                  value={expectedValue}
                  onChange={(e) => setExpectedValue(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:border-transparent transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Notes — full height */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <StickyNote size={12} /> Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:border-transparent transition-all text-sm resize-none leading-relaxed"
                placeholder="Enter background info, requirements, or next steps..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-colors disabled:opacity-70 bg-[var(--brand-orange)] hover:opacity-90"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
