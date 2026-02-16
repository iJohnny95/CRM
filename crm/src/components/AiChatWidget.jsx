import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  X,
  MessageSquare,
  Bot,
  Phone,
  ArrowRight,
  Star,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  Minimize2,
  Maximize2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { getLeadAiInsight, researchLead } from '../services/gemini'

const AiChatWidget = ({ lead, updateLeadField }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'ai',
      content: `Hi! I'm your AI Assistant. How can I help with **${lead.business_name}** today?`
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [proposedUpdates, setProposedUpdates] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const addMessage = (content, type = 'ai') => {
    setMessages(prev => [...prev, { id: Date.now(), type, content }])
  }

  const handleAction = async (type) => {
    const actionLabels = {
      briefing: 'Get Briefing',
      call_prep: 'Prepare Call',
      follow_up: 'Prepare Follow-up',
      closing: 'Sales Strategy',
      research: 'Research & Verify'
    }

    addMessage(actionLabels[type], 'user')
    setIsLoading(true)
    setProposedUpdates(null)

    try {
      if (type === 'research') {
        const result = await researchLead(lead)
        setProposedUpdates(result)
        addMessage(result.summary || "Research complete. Here is what I found:", 'ai')
      } else {
        const insight = await getLeadAiInsight(lead, type)
        addMessage(insight, 'ai')
      }
    } catch (err) {
      addMessage(`Error: ${err.message}. Please try again.`, 'ai')
    } finally {
      setIsLoading(false)
    }
  }

  const applyUpdate = (update) => {
    updateLeadField(lead.id, update.field, update.suggested)
    setProposedUpdates(prev => ({
      ...prev,
      discrepancies: prev.discrepancies.filter(d => d.field !== update.field)
    }))
  }

  const applyAllUpdates = () => {
    if (!proposedUpdates?.discrepancies) return
    proposedUpdates.discrepancies.forEach(update => {
      updateLeadField(lead.id, update.field, update.suggested)
    })
    setProposedUpdates(null)
    addMessage("All suggestions applied successfully! ✓", 'ai')
  }

  const rejectUpdate = (field) => {
    setProposedUpdates(prev => ({
      ...prev,
      discrepancies: prev.discrepancies.filter(d => d.field !== field)
    }))
  }

  return (
    <>
      <style>{`
        .ai-chat-container {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 10000;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .ai-chat-trigger {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          border: none;
          color: white;
          box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4), 0 0 20px rgba(168, 85, 247, 0.2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          padding: 0;
        }

        .ai-chat-trigger:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 15px 35px rgba(99, 102, 241, 0.6), 0 0 30px rgba(168, 85, 247, 0.4);
        }

        .ai-chat-widget {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 380px;
          height: calc(100vh - 100px);
          max-height: 600px;
          background: color-mix(in srgb, var(--bg-elevated), transparent 10%);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 20px rgba(99, 102, 241, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: bottom right;
        }

        [data-theme="light"] .ai-chat-widget {
          background: rgba(255, 255, 255, 0.9);
        }

        .ai-chat-widget.minimized {
          height: 60px;
          width: 250px;
          cursor: pointer;
        }

        .ai-chat-header {
          padding: 16px 20px;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        }

        .ai-chat-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 15px;
        }

        .ai-chat-controls {
          display: flex;
          gap: 8px;
        }

        .ai-chat-controls button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }

        .ai-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: var(--bg-primary);
          opacity: 0.95;
        }

        .message-bubble {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.5;
          position: relative;
        }

        .message-bubble.ai {
          align-self: flex-start;
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border);
          border-bottom-left-radius: 4px;
          box-shadow: var(--shadow-sm);
          display: flex;
          gap: 10px;
          transition: transform 0.2s;
        }
        
        .message-bubble.ai:hover {
          transform: translateX(4px);
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
        }

        .message-bubble.ai .msg-content * {
          color: inherit;
        }

        .message-bubble.user {
          align-self: flex-end;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: white;
          border-bottom-right-radius: 4px;
          box-shadow: 0 10px 20px -5px rgba(99,102,241,0.4);
          transition: transform 0.2s;
        }
        
        .message-bubble.user:hover {
          transform: translateX(-4px);
          box-shadow: 0 12px 24px -5px rgba(99,102,241,0.6);
        }

        .message-bubble.user .msg-content * {
          color: white !important;
        }

        .msg-icon {
          flex-shrink: 0;
          color: #6366f1;
          margin-top: 3px;
        }

        .msg-content p { margin: 0; }
        .msg-content p + p { margin-top: 8px; }

        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 4px 0;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #cbd5e1;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .updates-bubble {
          width: 90%;
          max-width: 90%;
          flex-direction: column;
          gap: 12px;
          background: var(--bg-tertiary) !important;
          border: 1px solid var(--border);
        }

        .updates-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
        }

        .update-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 8px;
          background: var(--bg-elevated);
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .field-name {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .update-comparison {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .update-comparison .old {
          color: var(--danger);
          text-decoration: line-through;
          opacity: 0.6;
        }

        .update-comparison .new {
           color: var(--success);
          font-weight: 600;
        }

        .update-actions {
          display: flex;
          gap: 4px;
        }

        .update-actions button {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .update-actions button.accept { background: var(--success-subtle); color: var(--success); }
        .update-actions button.reject { background: var(--danger-subtle); color: var(--danger); }

        .ai-chat-actions {
          padding: 16px 20px;
          background: var(--bg-elevated);
          border-top: 1px solid var(--border);
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .action-btn {
          flex: 1;
          min-width: calc(50% - 4px);
          padding: 10px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .action-btn:hover:not(:disabled) {
          background: var(--bg-hover);
          border-color: var(--accent);
          color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
        }

        .action-btn.research {
          flex-basis: 100%;
          background: var(--accent-subtle);
          border-color: var(--accent);
          color: var(--accent);
        }

        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes scale-in {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="ai-chat-container">
        {!isOpen ? (
          <button
            className="ai-chat-trigger animate-bounce-slow"
            onClick={() => setIsOpen(true)}
            title="Open AI Assistant"
          >
            <Sparkles size={24} />
          </button>
        ) : (
          <div className={`ai-chat-widget ${isMinimized ? 'minimized' : ''} animate-scale-in`}>
            {/* Header */}
            <div className="ai-chat-header" onClick={() => isMinimized && setIsMinimized(false)}>
              <div className="ai-chat-title">
                <Bot size={18} />
                <span>AI Strategist</span>
              </div>
              <div className="ai-chat-controls">
                <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }} title={isMinimized ? "Expand" : "Minimize"}>
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button onClick={() => setIsOpen(false)} title="Close">
                  <X size={16} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="ai-chat-messages">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`message-bubble ${msg.type}`}>
                      {msg.type === 'ai' && <Bot size={14} className="msg-icon" />}
                      <div className="msg-content">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="message-bubble ai">
                      <Bot size={14} className="msg-icon" />
                      <div className="typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  )}

                  {proposedUpdates && proposedUpdates.discrepancies?.length > 0 && (
                    <div className="message-bubble ai updates-bubble">
                      <strong>Data Verification</strong>
                      <button className="btn btn-xs btn-primary" onClick={applyAllUpdates}>Apply All</button>
                      <div className="updates-list">
                        {proposedUpdates.discrepancies.map((update, idx) => (
                          <div key={idx} className="update-item">
                            <div className="update-info">
                              <span className="field-name">{update.field.replace('_', ' ')}</span>
                              <div className="update-comparison">
                                <span className="old">{update.current || 'Empty'}</span>
                                <ArrowRight size={10} />
                                <span className="new">{update.suggested}</span>
                              </div>
                            </div>
                            <div className="update-actions">
                              <button className="reject" onClick={() => rejectUpdate(update.field)} title="Reject"><X size={12} /></button>
                              <button className="accept" onClick={() => applyUpdate(update)} title="Accept"><Check size={12} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="ai-chat-actions">
                  <button className="action-btn" onClick={() => handleAction('briefing')} disabled={isLoading}>
                    <MessageSquare size={14} /> Briefing
                  </button>
                  <button className="action-btn" onClick={() => handleAction('call_prep')} disabled={isLoading}>
                    <Phone size={14} /> Prepare Call
                  </button>
                  <button className="action-btn" onClick={() => handleAction('follow_up')} disabled={isLoading}>
                    <ArrowRight size={14} /> Follow-up
                  </button>
                  <button className="action-btn" onClick={() => handleAction('closing')} disabled={isLoading}>
                    <Star size={14} /> Closing
                  </button>
                  <button className="action-btn research" onClick={() => handleAction('research')} disabled={isLoading}>
                    <Search size={14} /> Research & Verify
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}


export default AiChatWidget
