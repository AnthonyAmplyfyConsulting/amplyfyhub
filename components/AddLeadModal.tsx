'use client'

import { useState } from 'react'
import { X, Loader2, UserPlus } from 'lucide-react'
import { addLead } from '@/app/(dashboard)/leads/actions'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
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

export default function AddLeadModal({ isOpen, onClose }: AddLeadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      await addLead(formData)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to add lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 pb-4 flex justify-between items-center border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-50 text-[var(--brand-orange)]">
                <UserPlus size={18} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                Add New Lead
              </h2>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:border-transparent transition-all text-sm font-medium"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Business Name</label>
                <input
                  type="text"
                  name="business"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:border-transparent transition-all text-sm font-medium"
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:border-transparent transition-all text-sm"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:border-transparent transition-all text-sm"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pipeline Stage</label>
              <select
                name="stage"
                required
                defaultValue="New Lead"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:border-transparent transition-all text-sm bg-white font-medium"
              >
                {STAGES.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes</label>
              <textarea
                name="notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:border-transparent transition-all text-sm resize-none"
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
              className="flex items-center px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-colors disabled:opacity-70 bg-[var(--brand-orange)] hover:opacity-90"
            >
              {isSubmitting && <Loader2 className="animate-spin mr-2" size={16} />}
              Add Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
