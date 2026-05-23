'use client'

import { useState } from 'react'
import { addTransaction } from '@/app/(dashboard)/revenue/actions'
import { X, UploadCloud, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'revenue' | 'expense'
}

export default function TransactionModal({ isOpen, onClose, type }: TransactionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.append('type', type)

    try {
      await addTransaction(formData)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isRevenue = type === 'revenue'
  const themeColor = isRevenue ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
  const buttonColor = isRevenue ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
  
  // Format current date as YYYY-MM-DD for the default date picker value
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 pb-4 flex justify-between items-center border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${themeColor}`}>
                {isRevenue ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                Add {isRevenue ? 'Revenue' : 'Expense'}
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

            {/* Row 1: Amount & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-medium">$</span>
                  </div>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    min="0"
                    required
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors text-sm font-medium"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={today}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors text-sm font-medium text-gray-900"
                />
              </div>
            </div>

            {/* Row 2: Client / Vendor */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {isRevenue ? 'Client' : 'Vendor'}
              </label>
              <input
                type="text"
                name="description"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors text-sm"
                placeholder={isRevenue ? 'e.g. Acme Inc.' : 'e.g. Office Depot'}
              />
            </div>

            {/* Row 3: Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
              <select
                name="category"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors text-sm bg-white"
              >
                <option value="" disabled selected>Select category</option>
                <option value="Consulting">Consulting</option>
                <option value="Software">Software</option>
                <option value="Supplies">Supplies</option>
                <option value="Travel">Travel</option>
                <option value="Marketing">Marketing</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Row 4: Description (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description (Optional)</label>
              <textarea
                name="notes"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors text-sm resize-none"
                placeholder="Enter description..."
              />
            </div>

            {/* Row 5: Receipt */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Receipt (Optional)</label>
              <label className="flex flex-col items-center justify-center w-full py-4 px-4 border border-gray-200 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 mb-1 text-gray-700">
                  <UploadCloud size={16} />
                  <span className="text-sm font-medium">{fileName ? 'Selected:' : 'Upload receipt'}</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {fileName || 'PNG, JPG, PDF up to 10MB'}
                </p>
                <input 
                  type="file" 
                  name="receipt"
                  className="hidden" 
                  accept="image/png, image/jpeg, application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setFileName(file.name)
                  }}
                />
              </label>
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
              className={`flex items-center px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-colors disabled:opacity-70 ${buttonColor}`}
            >
              {isSubmitting && <Loader2 className="animate-spin mr-2" size={16} />}
              Save {isRevenue ? 'Revenue' : 'Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
