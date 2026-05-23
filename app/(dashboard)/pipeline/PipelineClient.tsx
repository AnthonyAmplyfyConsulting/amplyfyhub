'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Trash2, Loader2, DollarSign } from 'lucide-react'
import { updateLeadStage, updateLeadEV, deleteLead } from './actions'

type Lead = {
  id: string
  name: string
  business: string
  stage: string
  expected_value: number
  created_at: string
  last_advanced_at: string
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

export default function PipelineClient({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [evModalOpen, setEvModalOpen] = useState(false)
  const [evLeadId, setEvLeadId] = useState<string | null>(null)
  const [evValue, setEvValue] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Calculate temperature
  const getTemp = (lead: Lead) => {
    if (lead.stage !== 'New Lead') return 'hot'
    
    const created = new Date(lead.created_at).getTime()
    const now = new Date().getTime()
    const twoWeeks = 14 * 24 * 60 * 60 * 1000
    
    if (now - created > twoWeeks) return 'cold'
    return 'warm'
  }
  
  const getLeadsByStage = (stageName: string) => {
    return leads.filter(l => l.stage === stageName)
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStage = destination.droppableId

    // Optimistically update UI
    setLeads(prev => prev.map(l => 
      l.id === draggableId 
        ? { ...l, stage: newStage, last_advanced_at: new Date().toISOString() } 
        : l
    ))

    try {
      await updateLeadStage(draggableId, newStage)
      
      if (newStage === 'Audit Finished') {
        setEvLeadId(draggableId)
        setEvModalOpen(true)
      }
    } catch (e) {
      console.error(e)
      setLeads(initialLeads) // Revert on failure
    }
  }

  const handleEVSumbit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!evLeadId) return
    
    const val = parseFloat(evValue) || 0
    
    setLeads(prev => prev.map(l => 
      l.id === evLeadId ? { ...l, expected_value: val } : l
    ))
    
    setEvModalOpen(false)
    setEvValue('')
    const targetLeadId = evLeadId
    setEvLeadId(null)
    
    try {
      await updateLeadEV(targetLeadId, val)
    } catch (e) {
      console.error(e)
    }
  }
  
  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this lead?")) return
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
    <div className="flex h-[calc(100vh-180px)] w-full overflow-x-auto overflow-y-hidden pb-4 gap-5 animate-in fade-in duration-500 scrollbar-hide">
      <DragDropContext onDragEnd={onDragEnd}>
        {STAGES.map(stage => (
          <div key={stage} className="flex-shrink-0 w-[300px] flex flex-col bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-4 bg-white/50 border-b border-gray-100 flex items-center justify-between backdrop-blur-sm sticky top-0 z-10">
              <h3 className="font-semibold text-gray-900 text-sm tracking-tight">{stage}</h3>
              <span className="text-[11px] font-bold bg-white shadow-sm border border-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {getLeadsByStage(stage).length}
              </span>
            </div>
            
            <Droppable droppableId={stage}>
              {(provided, snapshot) => (
                <div 
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 p-3 min-h-0 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-orange-50/30' : ''}`}
                >
                  {getLeadsByStage(stage).map((lead, index) => {
                    const temp = getTemp(lead)
                    return (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 bg-white p-4 rounded-xl border border-gray-100 relative group transition-all duration-200 ${snapshot.isDragging ? 'shadow-2xl scale-[1.04] rotate-2 z-50 ring-2 ring-[var(--brand-orange)] ring-opacity-50' : 'shadow-sm hover:border-[var(--brand-orange)] hover:shadow-md'}`}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-bold text-gray-900 text-sm">{lead.name}</h4>
                                <p className="text-xs text-gray-500 font-medium">{lead.business}</p>
                              </div>
                              <div className="flex items-center">
                                {/* Temp Indicator */}
                                {temp === 'hot' && <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" title="Hot Lead" />}
                                {temp === 'warm' && <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]" title="Warm Lead" />}
                                {temp === 'cold' && <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" title="Cold Lead" />}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                              <div className="text-[11px] font-bold text-gray-700 bg-gray-50/80 px-2 py-1 rounded-md flex items-center gap-1">
                                <DollarSign size={12} className="text-gray-400" />
                                {lead.expected_value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                              </div>
                              <button 
                                onClick={() => handleDelete(lead.id)}
                                disabled={deletingId === lead.id}
                                className="text-gray-300 hover:text-red-500 p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                              >
                                {deletingId === lead.id ? <Loader2 size={14} className="animate-spin text-red-500" /> : <Trash2 size={14} />}
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </DragDropContext>

      {/* EV Modal */}
      {evModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Set Expected Value</h2>
            <p className="text-sm text-gray-500 mb-6">Enter the estimated deal value for this pipeline stage.</p>
            
            <form onSubmit={handleEVSumbit}>
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="text-gray-400" size={16} />
                </div>
                <input
                  type="number"
                  value={evValue}
                  onChange={e => setEvValue(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] font-semibold"
                  placeholder="0"
                  autoFocus
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-[var(--brand-orange)] text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-md shadow-orange-500/20 transition-all"
              >
                Save Value
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
