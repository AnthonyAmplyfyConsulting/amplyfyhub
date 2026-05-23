'use client'

import { useState } from 'react'
import { Plus, Search, Mail, Phone, Building2, Trash2, Loader2, User } from 'lucide-react'
import AddLeadModal from '@/components/AddLeadModal'
import { deleteLead } from '../pipeline/actions'

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

export default function LeadsClient({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.business.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return
    setDeletingId(id)
    try {
      await deleteLead(id)
      setLeads(prev => prev.filter(l => l.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Actions */}
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search leads by name or business..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] shadow-sm"
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 text-white bg-[var(--brand-orange)] rounded-xl hover:opacity-90 shadow-md shadow-orange-500/20 font-bold text-sm transition-all"
        >
          <Plus size={18} />
          Add Lead
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Lead</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Pipeline Stage</th>
                <th className="px-6 py-4">Expected Value</th>
                <th className="px-6 py-4">Notes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <User size={24} className="text-gray-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">No leads found</h3>
                      <p className="text-gray-500 text-sm mb-6">Add a new lead to start building your pipeline.</p>
                      <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 text-[var(--brand-orange)] border border-[var(--brand-orange)] rounded-xl font-bold hover:bg-orange-50 transition-colors">
                        <Plus size={18} /> Add Lead
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 font-bold">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{lead.name}</p>
                          <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                            <Building2 size={12} /> {lead.business}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-gray-600 text-xs font-medium">
                          <Mail size={14} className="text-gray-400" />
                          {lead.email || <span className="text-gray-300 italic">No email</span>}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 text-xs font-medium">
                          <Phone size={14} className="text-gray-400" />
                          {lead.phone || <span className="text-gray-300 italic">No phone</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200 shadow-sm">
                        {lead.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">
                        ${lead.expected_value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </p>
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate text-gray-500 text-xs font-medium">
                      {lead.notes || <span className="italic text-gray-300">No notes...</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(lead.id)}
                        disabled={deletingId === lead.id}
                        className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        {deletingId === lead.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddLeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
