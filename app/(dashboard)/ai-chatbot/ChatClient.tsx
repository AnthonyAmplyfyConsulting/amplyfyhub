'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Send, Loader2, Bot, User, Trash2, Sparkles,
  Mail, Phone, MessageSquare, Shield
} from 'lucide-react'

type Message = {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

const QUICK_ACTIONS = [
  { label: 'Draft Follow-up Email', prompt: 'Draft a follow-up email for a prospect who showed interest in our AI phone agents but hasn\'t responded in 3 days.', icon: Mail },
  { label: 'Handle "Too Expensive" Objection', prompt: 'A prospect said our services are too expensive. Help me handle this objection for a cold call.', icon: Shield },
  { label: 'Cold Call Script', prompt: 'Write me a cold call script for calling a small business owner about our AI operating systems. Keep it under 60 seconds.', icon: Phone },
  { label: 'Research Talking Points', prompt: 'Give me 5 compelling talking points about why small businesses need AI automation in 2026.', icon: MessageSquare },
]

export default function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!content.trim() || streaming) return

    const userMessage: Message = { role: 'user', content: content.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setStreaming(true)

    // Add placeholder for assistant
    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const historyToSend = messages.filter(m => m.role === 'user' || m.role === 'assistant')
      
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: content.trim(), 
          history: historyToSend 
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to send message')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  fullContent += parsed.content
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = { role: 'assistant', content: fullContent }
                    return updated
                  })
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I encountered a system error. Please check your network connection and API configuration, then try again.'
        }
        return updated
      })
    } finally {
      setLoading(false)
      setStreaming(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearHistory = () => {
    if (!confirm('Clear all conversation history?')) return
    setMessages([])
  }

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-header-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="chat-title">AMPLYFY AI</h1>
            <p className="chat-subtitle">Your AI sales assistant — draft emails, handle objections, strategize outreach</p>
          </div>
        </div>
        <button onClick={clearHistory} className="chat-clear-btn" title="Clear conversation">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">
              <Bot size={36} />
            </div>
            <h2>Hey! I&apos;m the AMPLYFY AI Assistant 👋</h2>
            <p>I can help you draft outreach emails, prepare cold call scripts, handle objections, and strategize your sales approach.</p>

            <div className="chat-quick-actions">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    className="chat-quick-btn"
                  >
                    <Icon size={16} />
                    {action.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble-wrap chat-bubble-${msg.role}`}>
                <div className={`chat-avatar chat-avatar-${msg.role}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`chat-bubble chat-bubble-content-${msg.role}`}>
                  {msg.content || (
                    <div className="chat-typing">
                      <span /><span /><span />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-wrap">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AMPLYFY AI anything..."
            className="chat-input"
            rows={1}
            disabled={streaming}
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="chat-send-btn"
          >
            {streaming ? <Loader2 size={18} className="em-spin" /> : <Send size={18} />}
          </button>
        </form>
        <p className="chat-disclaimer">AMPLYFY AI can make mistakes. Verify important information.</p>
      </div>
    </div>
  )
}
