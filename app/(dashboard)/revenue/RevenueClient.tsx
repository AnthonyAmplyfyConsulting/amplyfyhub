'use client'

import { useState } from 'react'
import { Plus, ArrowDownRight, ArrowUpRight, Trash2, FileText, Loader2, Download, Search, Calendar } from 'lucide-react'
import TransactionModal from '@/components/TransactionModal'
import { deleteTransaction } from './actions'

type Transaction = {
  id: string
  type: 'revenue' | 'expense'
  amount: number
  description: string
  category: string | null
  notes: string | null
  receipt_url: string | null
  date: string
}

export default function RevenueClient({ initialTransactions }: { initialTransactions: Transaction[] }) {
  const [modalType, setModalType] = useState<'revenue' | 'expense' | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const totalRevenue = initialTransactions
    .filter(t => t.type === 'revenue')
    .reduce((sum, t) => sum + t.amount, 0)
    
  const totalExpenses = initialTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const netProfit = totalRevenue - totalExpenses
  const isPositive = netProfit >= 0

  // Calculate simple mock % change for visual purposes based on the screenshot
  const percentChange = 18.6 

  const handleDelete = async (id: string, receipt_url: string | null) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return
    
    setDeletingId(id)
    try {
      await deleteTransaction(id, receipt_url)
    } catch (error) {
      console.error('Failed to delete', error)
      alert('Failed to delete transaction')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Centered Dashboard Header */}
      <div className="flex flex-col items-center justify-center relative py-12 text-center">
        <div className="flex items-center gap-2 mb-4 text-gray-500 font-medium text-sm">
          Net Profit (Revenue - Expenses)
          <div className="w-4 h-4 rounded-full bg-gray-200 text-white flex items-center justify-center text-[10px]">i</div>
        </div>
        
        <h1 className={`text-[4rem] md:text-[5rem] leading-none font-bold mb-6 tracking-tight ${isPositive ? 'text-[#16a34a]' : 'text-red-500'}`}>
          {isPositive ? '+' : '-'}${Math.abs(netProfit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </h1>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${isPositive ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-red-100 text-red-500'}`}>
            {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {isPositive ? '+' : '-'}{percentChange}%
          </div>
          <span className="text-gray-400 font-medium text-sm">vs. last month</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button 
          onClick={() => setModalType('revenue')}
          className="flex items-center gap-2 px-6 py-3 text-white bg-[var(--brand-orange)] rounded-xl hover:opacity-95 shadow-md shadow-orange-500/20 font-semibold text-sm transition-all"
        >
          <Plus size={18} />
          Add Revenue
        </button>
        <button 
          onClick={() => setModalType('expense')}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-[var(--brand-orange)] text-[var(--brand-orange)] rounded-xl hover:bg-orange-50 font-semibold text-sm transition-all"
        >
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      {/* Transaction History Table */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        
        {/* Table Header & Filters */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Download size={16} /> Export
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Search transactions..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]" />
            </div>
            <select className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white min-w-[140px] focus:outline-none">
              <option>All Types</option>
              <option>Revenue</option>
              <option>Expense</option>
            </select>
            <select className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white min-w-[140px] focus:outline-none">
              <option>All Categories</option>
              <option>Consulting</option>
              <option>Software</option>
            </select>
            <div className="relative min-w-[220px]">
              <input type="text" value="May 1, 2025 - May 31, 2025" readOnly className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white" />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Date <ArrowDownRight size={14} className="inline ml-1" /></th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Receipt</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <FileText size={24} className="text-gray-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">No transactions yet</h3>
                      <p className="text-gray-500 text-sm mb-6">Add your first revenue or expense to get started.</p>
                      <button onClick={() => setModalType('revenue')} className="flex items-center gap-2 px-5 py-2.5 text-[var(--brand-orange)] border border-[var(--brand-orange)] rounded-lg font-medium hover:bg-orange-50 transition-colors">
                        <Plus size={18} /> Add Revenue
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                initialTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-5 text-gray-900 font-medium">
                      {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-5">
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${tx.type === 'revenue' ? 'text-[#16a34a]' : 'text-red-500'}`}>
                        {tx.type === 'revenue' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {tx.type === 'revenue' ? 'Revenue' : 'Expense'}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-gray-900 font-medium">
                      {tx.description}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${tx.type === 'revenue' ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#fee2e2] text-red-600'}`}>
                        {tx.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className={`px-6 py-5 font-bold ${tx.type === 'revenue' ? 'text-[#16a34a]' : 'text-red-500'}`}>
                      {tx.type === 'revenue' ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-5">
                      {tx.receipt_url ? (
                        <a href={tx.receipt_url} target="_blank" rel="noreferrer" className="text-red-500 hover:text-red-600 transition-colors">
                          <FileText size={20} />
                        </a>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button 
                        onClick={() => handleDelete(tx.id, tx.receipt_url)}
                        disabled={deletingId === tx.id}
                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                      >
                        {deletingId === tx.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionModal 
        isOpen={modalType !== null} 
        onClose={() => setModalType(null)} 
        type={modalType || 'revenue'} 
      />
    </div>
  )
}
