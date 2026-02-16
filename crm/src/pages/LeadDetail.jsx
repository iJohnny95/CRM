import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Phone,
  Globe,
  MapPin,
  Star,
  ExternalLink,
  Trash2,
  Plus,
  MessageSquare,
  Clock,
  Building2,
  Mail,
  User,
  Euro,
  Calendar,
  Paperclip,
  Upload,
  X,
  Edit3,
  Check,
  FileText,
  Image,
  File,
  Download,
  ArrowRight,
  Flame,
  Thermometer,
  Snowflake,
  Bot,
  Send,
  Sparkles,
  Search,
  Users
} from 'lucide-react'
import useStore, { STAGES, PRIORITIES, ACTIVITY_TYPES } from '../store/useStore'
import { format, formatDistanceToNow } from 'date-fns'
import AiChatWidget from '../components/AiChatWidget'
import '../CallMode.css'

// Call Script Data


// Email Templates
const EMAIL_TEMPLATES = [
  {
    id: 'no-answer',
    name: 'No Answer Follow-up',
    subject: 'Following up - [Business Name]',
    body: 'Hi [Contact Name],\n\nI tried calling you earlier regarding our services but couldn\'t reach you. \n\nI wanted to discuss how we can help [Business Name] grow its online presence. Please let me know when would be a good time to catch up briefly.\n\nBest regards,\n[Your Name]'
  },
  {
    id: 'intro',
    name: 'Intro: Web Development',
    subject: 'Improving the online presence for [Business Name]',
    body: 'Hi [Contact Name],\n\nI was looking at [Business Name] and noticed you don\'t have a website yet (or it could use a modern refresh).\n\nIn today\'s market, having a high-converting website is critical. We specialize in building fast, modern sites for businesses like yours.\n\nAre you available for a 5-minute chat this week to see if we can help?\n\nBest regards,\n[Your Name]'
  },
  {
    id: 'meeting-recap',
    name: 'Meeting Recap',
    subject: 'Recap of our meeting - [Business Name]',
    body: 'Hi [Contact Name],\n\nIt was great speaking with you today about [Business Name].\n\nAs we discussed, our next steps are:\n- [Next Step 1]\n- [Next Step 2]\n\nI\'ll send over the formal proposal by [Date]. Looking forward to working together!\n\nBest regards,\n[Your Name]'
  }
]

// Inline editable field component
function EditableField({ value, onSave, type = 'text', placeholder, prefix, suffix, className = '' }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value ?? '')

  const handleSave = () => {
    onSave(type === 'number' ? (editValue === '' ? null : parseFloat(editValue)) : editValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setEditValue(value ?? '')
      setIsEditing(false)
    }
  }

  const hasValue = value !== undefined && value !== null && value !== ''

  if (isEditing) {
    return (
      <div className={`editable-field editing ${className}`}>
        {prefix && <span className="field-prefix">{prefix}</span>}
        <input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          className="inline-input"
          placeholder={placeholder}
        />
        <button className="inline-btn save" onClick={handleSave}><Check size={14} /></button>
      </div>
    )
  }

  return (
    <div className={`editable-field ${className}`} onClick={() => { setIsEditing(true); setEditValue(value ?? '') }}>
      {prefix && <span className="field-prefix">{prefix}</span>}
      <span className={!hasValue ? 'placeholder' : ''}>
        {hasValue ? value : (placeholder || 'Click to add')}
      </span>
      {suffix && <span className="field-suffix">{suffix}</span>}
      <Edit3 size={12} className="edit-icon" />
    </div>
  )
}

// Activity timeline item
function ActivityItem({ activity }) {
  const config = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.note

  const getIcon = () => {
    switch (activity.type) {
      case 'call': return <Phone size={14} />
      case 'email': return <Mail size={14} />
      case 'meeting': return <Calendar size={14} />
      case 'stage_change': return <ArrowRight size={14} />
      case 'file': return <Paperclip size={14} />
      default: return <MessageSquare size={14} />
    }
  }

  return (
    <div className="activity-item">
      <div className="activity-icon" style={{ background: `${config.color}20`, color: config.color }}>
        {getIcon()}
      </div>
      <div className="activity-content">
        <p className="activity-text">{activity.description}</p>
        <span className="activity-time">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}

// File card component
function FileCard({ file, onDelete }) {
  const isImage = file.type?.startsWith('image/')
  const isPdf = file.type === 'application/pdf'

  const getIcon = () => {
    if (isImage) return <Image size={24} />
    if (isPdf) return <FileText size={24} />
    return <File size={24} />
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="file-card">
      {isImage && file.url ? (
        <div className="file-preview" style={{ backgroundImage: `url(${file.url})` }} />
      ) : (
        <div className="file-icon">{getIcon()}</div>
      )}
      <div className="file-info">
        <span className="file-name">{file.name}</span>
        <span className="file-meta">{formatSize(file.size)}</span>
      </div>
      <div className="file-actions">
        {file.url && (
          <a href={file.url} download={file.name} className="btn btn-ghost btn-icon btn-sm">
            <Download size={14} />
          </a>
        )}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(file.id)}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lead = useStore(state => state.getLeadById(id))
  const updateLeadStage = useStore(state => state.updateLeadStage)
  const updateLeadField = useStore(state => state.updateLeadField)
  const addNote = useStore(state => state.addNote)
  const deleteNote = useStore(state => state.deleteNote)
  const deleteLead = useStore(state => state.deleteLead)
  const addFile = useStore(state => state.addFile)
  const deleteFile = useStore(state => state.deleteFile)
  const logCall = useStore(state => state.logCall)
  const logEmail = useStore(state => state.logEmail)
  const logMeeting = useStore(state => state.logMeeting)
  const assignLead = useStore(state => state.assignLead)
  const users = useStore(state => state.users)
  const profile = useStore(state => state.profile)

  const [activeTab, setActiveTab] = useState('overview')
  const [noteContent, setNoteContent] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLogModal, setShowLogModal] = useState(null)

  // Call Mode State


  const [logContent, setLogContent] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Email Automation state
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // Notification state
  const [notifications, setNotifications] = useState([])

  const notify = (title, message, type = 'info') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, title, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }


  if (!lead) {
    return (
      <div className="page lead-detail">
        <div className="card empty-state">
          <Building2 size={40} />
          <h3>Lead not found</h3>
          <p>This lead may have been deleted</p>
          <Link to="/leads" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Back to Leads
          </Link>
        </div>
      </div>
    )
  }

  const currentStage = STAGES.find(s => s.id === lead.stage)
  const currentPriority = PRIORITIES.find(p => p.id === lead.priority) || PRIORITIES[1]

  const handleAddNote = (e) => {
    e.preventDefault()
    if (noteContent.trim()) {
      addNote(lead.id, noteContent.trim())
      setNoteContent('')
    }
  }



  const handleLogActivity = () => {
    if (!logContent.trim()) return

    if (showLogModal === 'email') logEmail(lead.id, logContent)
    else if (showLogModal === 'meeting') logMeeting(lead.id, logContent)

    setLogContent('')
    setShowLogModal(null)
  }

  const handleDelete = () => {
    deleteLead(lead.id)
    navigate('/leads')
  }

  const handleFileUpload = async (files) => {
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Max 5MB per file.')
        continue
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        addFile(lead.id, {
          name: file.name,
          type: file.type,
          size: file.size,
          url: e.target.result
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFileUpload(files)
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'hot': return <Flame size={14} />
      case 'warm': return <Thermometer size={14} />
      case 'cold': return <Snowflake size={14} />
      default: return <Thermometer size={14} />
    }
  }

  const cyclePriority = () => {
    const nextIndex = (PRIORITIES.findIndex(p => p.id === lead.priority) + 1) % PRIORITIES.length
    updateLeadField(lead.id, 'priority', PRIORITIES[nextIndex].id)
  }

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) return

    setIsSendingEmail(true)
    console.log('Starting email send...')

    try {
      const payload = {
        to: lead.email,
        subject: emailSubject,
        body: emailBody,
      }
      console.log('Sending payload:', payload)
      console.log('Target URL:', `${import.meta.env.VITE_BACKEND_URL}/api/send-email`)

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          console.error('Server error data:', errorData)
          throw new Error(errorData.error || 'Failed to send email')
        } else {
          const text = await response.text()
          console.error('Server error text:', text)
          throw new Error(`Server returned error ${response.status}: ${text}`)
        }
      }

      const data = await response.json()
      console.log('Email sent successfully:', data)

      // Log in activity timeline
      logEmail(lead.id, `Subject: ${emailSubject}\n\n${emailBody}`)

      // Switch to activity tab to show it was sent
      setActiveTab('activity')

      // Clear email state
      setEmailSubject('')
      setEmailBody('')
      setSelectedTemplate('')

      notify('Success', 'Email sent successfully!', 'success')
    } catch (error) {
      console.error('Error sending email:', error)
      notify('Error', error.message, 'error')
      // alert(`Failed to send email: ${error.message}`) // Optional: Uncomment if notify is broken
    } finally {
      setIsSendingEmail(false)
    }
  }

  const applyTemplate = (templateId) => {
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId)
    if (!template) return

    setSelectedTemplate(templateId)

    // Replace placeholders
    let subject = template.subject
      .replace('[Business Name]', lead.business_name || 'your business')

    let body = template.body
      .replace('[Business Name]', lead.business_name || 'your business')
      .replace('[Contact Name]', lead.contact_name || 'there')
      .replace('[Your Name]', 'Team LeadCRM')

    setEmailSubject(subject)
    setEmailBody(body)
  }

  const activities = [...(lead.activities || [])].reverse().slice(0, 20)

  return (
    <div className="page lead-detail-v2">
      {/* Header */}
      <header className="detail-header animate-fade-in">
        <Link to="/leads" className="back-link">
          <ArrowLeft size={18} />
          <span>Back to Leads</span>
        </Link>
        <div className="header-actions">
          <button className="btn btn-ghost delete-btn" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </header>

      {/* Hero Card */}
      <section className="hero-card animate-fade-in" style={{ '--stage-color': currentStage?.color }}>
        <div className="hero-content">
          <div className="hero-main">
            <div className="hero-badges">
              <span className="badge stage-badge" style={{ background: currentStage?.color }}>
                {currentStage?.label}
              </span>
              <span
                className="badge priority-badge"
                style={{ background: `${currentPriority.color}20`, color: currentPriority.color }}
                onClick={cyclePriority}
                title="Click to change priority"
              >
                {getPriorityIcon(lead.priority)}
                {currentPriority.label}
              </span>

              {profile?.role === 'admin' && (
                <div className="assignment-control">
                  <Users size={12} />
                  <select
                    value={lead.user_id || ''}
                    onChange={(e) => assignLead(lead.id, e.target.value)}
                    className="assign-select"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <EditableField
              value={lead.business_name}
              onSave={(v) => updateLeadField(lead.id, 'business_name', v)}
              placeholder="Business Name"
              className="hero-name-edit"
            />
            <div className="hero-type">
              <Building2 size={14} />
              <EditableField
                value={lead.business_type}
                onSave={(v) => updateLeadField(lead.id, 'business_type', v)}
                placeholder="Business Type"
                className="hero-type-edit"
              />
            </div>
          </div>

          <div className="quick-actions">
            <button className="quick-btn primary" onClick={() => navigate(`/leads/${lead.id}/call-mode`)}>
              <Phone size={18} />
              <span>Log Call</span>
            </button>
          </div>
        </div>
      </section>

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Lead?</h3>
            <p>Are you sure you want to delete "{lead.business_name}"? This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Backdrop */}
      {showLogModal && (
        <div className="modal-backdrop" onClick={() => setShowLogModal(null)}>

          {/* Call Mode Modal Removed - Now a dedicated page */}
          {showLogModal !== 'call' && (
            // Legacy/Simple Modal for Email/Meeting (if needed in future, though buttons removed)
            <div className="modal log-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {showLogModal === 'email' && <><Mail size={18} /> Log Email</>}
                  {showLogModal === 'meeting' && <><Calendar size={18} /> Log Meeting</>}
                </h3>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowLogModal(null)}>
                  <X size={18} />
                </button>
              </div>
              <textarea
                className="input textarea"
                placeholder={`What happened during the ${showLogModal}?`}
                value={logContent}
                onChange={e => setLogContent(e.target.value)}
                rows={4}
                autoFocus
              />
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowLogModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleLogActivity} disabled={!logContent.trim()}>
                  Save Activity
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Toast Notifications */}
      <div className="toast-container">
        {notifications.map(n => (
          <div key={n.id} className={`toast ${n.type}`}>
            <div className="toast-icon">
              {n.type === 'success' && <Check size={18} />}
              {n.type === 'error' && <X size={18} />}
              {n.type === 'info' && <Bot size={18} />}
            </div>
            <div className="toast-content">
              <div className="toast-title">{n.title}</div>
              <div className="toast-message">{n.message}</div>
            </div>
            <button className="toast-close" onClick={() => removeNotification(n.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs-container animate-fade-in">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity ({activities.length})
        </button>
        <button
          className={`tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          Files ({lead.files?.length || 0})
        </button>
        <button
          className={`tab ${activeTab === 'automation' ? 'active' : ''}`}
          onClick={() => setActiveTab('automation')}
        >
          <Bot size={14} style={{ marginRight: '6px' }} />
          Automation
        </button>
      </div>

      <div className="detail-layout">
        {/* Main Column */}
        <div className="detail-main">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Combined Info Card */}
              <section className="card info-card animate-fade-in">
                {/* Business Info Row */}
                <div className="info-section-row">
                  <div className="info-col">
                    <h4 className="info-col-title">
                      <Building2 size={14} />
                      Business Info
                    </h4>
                    <div className="info-items">
                      <div className="info-item-row">
                        <Phone size={14} className="info-icon" />
                        <span className="info-label">Phone</span>
                        <EditableField
                          value={lead.phone}
                          onSave={(v) => updateLeadField(lead.id, 'phone', v)}
                          placeholder="Add phone..."
                          className="info-value-edit"
                        />
                      </div>
                      <div className="info-item-row">
                        <MapPin size={14} className="info-icon" />
                        <span className="info-label">Address</span>
                        <EditableField
                          value={lead.address}
                          onSave={(v) => updateLeadField(lead.id, 'address', v)}
                          placeholder="Add address..."
                          className="info-value-edit"
                        />
                      </div>
                      <div className="info-item-row">
                        <Globe size={14} className="info-icon" />
                        <span className="info-label">Website</span>
                        <div className="info-value-edit">
                          <EditableField
                            value={lead.website}
                            onSave={(v) => {
                              updateLeadField(lead.id, 'website', v);
                              updateLeadField(lead.id, 'has_website', !!v);
                            }}
                            placeholder="Add website..."
                          />
                        </div>
                      </div>
                      <div className="info-item-row">
                        <Star size={14} className="info-icon" fill="#f59e0b" stroke="#f59e0b" />
                        <span className="info-label">Rating</span>
                        <EditableField
                          value={lead.rating}
                          onSave={(v) => updateLeadField(lead.id, 'rating', v)}
                          placeholder="0.0"
                          type="number"
                          className="info-value-edit"
                          suffix={lead.review_count > 0 ? ` (${lead.review_count} reviews)` : ''}
                        />
                      </div>
                    </div>
                    {lead.google_maps_url && (
                      <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer" className="maps-link">
                        <ExternalLink size={14} />
                        View on Google Maps
                      </a>
                    )}
                  </div>

                  <div className="info-divider" />

                  <div className="info-col">
                    <h4 className="info-col-title">
                      <User size={14} />
                      Contact Person
                    </h4>
                    <div className="contact-fields">
                      <div className="contact-field">
                        <label>Name</label>
                        <EditableField
                          value={lead.contact_name}
                          onSave={(v) => updateLeadField(lead.id, 'contact_name', v)}
                          placeholder="Add name..."
                        />
                      </div>
                      <div className="contact-field">
                        <label>Role</label>
                        <EditableField
                          value={lead.contact_role}
                          onSave={(v) => updateLeadField(lead.id, 'contact_role', v)}
                          placeholder="Owner, Manager..."
                        />
                      </div>
                      <div className="contact-field">
                        <label>Email</label>
                        <EditableField
                          value={lead.email}
                          onSave={(v) => updateLeadField(lead.id, 'email', v)}
                          placeholder="Add email..."
                          type="email"
                        />
                      </div>
                      <div className="contact-field">
                        <label>Alt. Phone</label>
                        <EditableField
                          value={lead.secondary_phone}
                          onSave={(v) => updateLeadField(lead.id, 'secondary_phone', v)}
                          placeholder="Add phone..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Notes Section */}
              <section className="card notes-card animate-fade-in">
                <div className="notes-header">
                  <h3 className="section-title">
                    <MessageSquare size={16} />
                    Notes
                  </h3>
                  <span className="notes-count">{lead.notes?.length || 0}</span>
                </div>

                <form onSubmit={handleAddNote} className="note-form">
                  <textarea
                    className="input textarea"
                    placeholder="Write a note..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={2}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!noteContent.trim()}>
                    <Plus size={16} />
                    Add Note
                  </button>
                </form>

                <div className="notes-list">
                  {(lead.notes?.length || 0) === 0 ? (
                    <p className="empty-text">No notes yet. Add your first note above.</p>
                  ) : (
                    [...lead.notes].reverse().map(note => (
                      <div key={note.id} className="note-item">
                        <div className="note-header">
                          <span className="note-time">
                            <Clock size={12} />
                            {format(new Date(note.created_at), 'MMM d, yyyy • h:mm a')}
                          </span>
                          <button className="btn btn-ghost btn-icon btn-xs" onClick={() => deleteNote(lead.id, note.id)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <p className="note-text">{note.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <section className="card activity-section animate-fade-in">
              <h3 className="section-title">
                <Clock size={16} />
                Activity Timeline
              </h3>
              {activities.length === 0 ? (
                <div className="empty-state-small">
                  <Clock size={32} />
                  <p>No activities yet</p>
                  <span>Log a call, email, or meeting to start tracking</span>
                </div>
              ) : (
                <div className="activity-timeline">
                  {activities.map(activity => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <section className="card files-section animate-fade-in">
              <h3 className="section-title">
                <Paperclip size={16} />
                Files & Documents
              </h3>

              <div
                className={`file-dropzone ${isDragging ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={24} />
                <p>Drop files here or click to upload</p>
                <span>Max 5MB per file • Images, PDFs, Documents</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                  style={{ display: 'none' }}
                />
              </div>

              {(lead.files?.length || 0) === 0 ? (
                <div className="empty-state-small">
                  <Paperclip size={32} />
                  <p>No files uploaded</p>
                  <span>Upload proposals, contracts, or images</span>
                </div>
              ) : (
                <div className="files-grid">
                  {lead.files.map(file => (
                    <FileCard key={file.id} file={file} onDelete={(fileId) => deleteFile(lead.id, fileId)} />
                  ))}
                </div>
              )}
            </section>
          )}
          {/* Automation Tab */}
          {activeTab === 'automation' && (
            <section className="card automation-section animate-fade-in">
              <div className="section-header-row">
                <h3 className="section-title">
                  <Bot size={16} />
                  Email Automation
                </h3>
                <div className="automation-badge">
                  <Sparkles size={12} />
                  Smart Templates
                </div>
              </div>

              {!lead.email ? (
                <div className="empty-state-small warning">
                  <Mail size={32} />
                  <p>No email address found</p>
                  <span>Add an email address in the Overview tab to use automation.</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '12px' }}
                    onClick={() => setActiveTab('overview')}
                  >
                    Go to Overview
                  </button>
                </div>
              ) : (
                <div className="automation-layout">
                  <div className="templates-sidebar">
                    <h4>Templates</h4>
                    <div className="templates-list">
                      {EMAIL_TEMPLATES.map(t => (
                        <button
                          key={t.id}
                          className={`template-item ${selectedTemplate === t.id ? 'active' : ''}`}
                          onClick={() => applyTemplate(t.id)}
                        >
                          {t.name}
                        </button>
                      ))}
                      <button
                        className={`template-item ${selectedTemplate === 'custom' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedTemplate('custom')
                          setEmailSubject('')
                          setEmailBody('')
                        }}
                      >
                        Custom Email
                      </button>
                    </div>
                  </div>

                  <div className="email-editor">
                    <div className="editor-field">
                      <label>To</label>
                      <input className="input" value={lead.email} disabled />
                    </div>
                    <div className="editor-field">
                      <label>Subject</label>
                      <input
                        className="input"
                        placeholder="Email subject..."
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                      />
                    </div>
                    <div className="editor-field body-field">
                      <label>Message</label>
                      <textarea
                        className="input textarea"
                        placeholder="Write your email here..."
                        rows={12}
                        value={emailBody}
                        onChange={e => setEmailBody(e.target.value)}
                      />
                    </div>
                    <div className="editor-footer">
                      <p className="editor-hint">
                        Tip: Placeholders like [Business Name] are automatically filled.
                      </p>
                      <button
                        className="btn btn-primary"
                        disabled={isSendingEmail || !emailSubject.trim() || !emailBody.trim()}
                        onClick={handleSendEmail}
                      >
                        {isSendingEmail ? 'Sending...' : (
                          <>
                            <Send size={16} />
                            Send Email
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="detail-sidebar">
          {/* Deal Value Card */}
          <section className="card deal-card animate-fade-in">
            <h3 className="card-title">
              <Euro size={16} />
              Deal Value
            </h3>
            <div className="deal-amount">
              <EditableField
                value={lead.deal_value}
                onSave={(v) => updateLeadField(lead.id, 'deal_value', v)}
                type="number"
                placeholder="0"
                prefix="€"
                className="deal-field"
              />
            </div>
            <div className="deal-meta">
              <div className="deal-row">
                <span>Expected Close</span>
                <EditableField
                  value={lead.expected_close_date?.slice(0, 10)}
                  onSave={(v) => updateLeadField(lead.id, 'expected_close_date', v ? new Date(v).toISOString() : null)}
                  type="date"
                  placeholder="Set date"
                  className="deal-date-field"
                />
              </div>
              <div className="deal-row">
                <span>Probability</span>
                <span className="deal-probability">{currentStage?.probability || 0}%</span>
              </div>
            </div>
          </section>

          {/* Pipeline Stage */}
          <section className="card stage-card animate-fade-in">
            <h3 className="card-title">Pipeline Stage</h3>
            <div className="stage-list">
              {STAGES.map(stage => (
                <button
                  key={stage.id}
                  className={`stage-btn ${lead.stage === stage.id ? 'active' : ''}`}
                  onClick={() => updateLeadStage(lead.id, stage.id)}
                  style={{ '--stage-color': stage.color }}
                >
                  <span className="stage-indicator" style={{ background: stage.color }} />
                  <span className="stage-label">{stage.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Quick Info */}
          <section className="card meta-card animate-fade-in">
            <h3 className="card-title">Quick Info</h3>
            <div className="meta-list">
              <div className="meta-row">
                <span className="meta-label">Added</span>
                <span className="meta-value">{format(new Date(lead.created_at), 'MMM d, yyyy')}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Updated</span>
                <span className="meta-value">{format(new Date(lead.updated_at), 'MMM d, yyyy')}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Last Contact</span>
                <span className="meta-value">
                  {lead.last_contact_date
                    ? formatDistanceToNow(new Date(lead.last_contact_date), { addSuffix: true })
                    : 'Never'
                  }
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Has Website</span>
                <span className={`meta-value ${!lead.has_website ? 'highlight' : ''}`}>
                  {lead.has_website ? 'Yes' : 'No ✓'}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Source</span>
                <span className="meta-value capitalize">{lead.lead_source || 'Automation'}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Floating AI Chat Widget - Admin only */}
      {profile?.role === 'admin' && <AiChatWidget lead={lead} updateLeadField={updateLeadField} />}

      <style>{`
        .lead-detail-v2 {
          max-width: 100%;
        }
        
        /* Header */
        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--gap-lg);
        }
        
        .back-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          font-size: var(--text-sm);
          font-weight: 500;
        }
        
        .back-link:hover { color: var(--text-primary); }
        
        .delete-btn { color: var(--text-tertiary); transition: all var(--transition); }
        .delete-btn:hover { background: var(--danger-subtle); color: var(--danger); box-shadow: 0 0 15px -5px var(--danger); }
        
        /* Hero Card */
        .hero-card {
          background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px 28px;
          margin-bottom: var(--gap-lg);
          position: relative;
          overflow: hidden;
          transition: all var(--transition);
        }
        
        .hero-card:hover {
          border-color: var(--stage-color, var(--accent));
          box-shadow: 0 10px 30px -10px color-mix(in srgb, var(--stage-color, var(--accent)) 30%, transparent);
        }
        
        .hero-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--stage-color, var(--accent));
        }
        
        .hero-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          flex-wrap: wrap;
        }
        
        .hero-badges {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
        }
        
        .stage-badge {
          color: white;
          font-weight: 600;
        }
        
        .priority-badge {
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: transform var(--transition-fast);
        }
        
        .priority-badge:hover { transform: scale(1.05); }
        
        .hero-main h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 4px;
        }
        
        .hero-type {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
          font-size: var(--text-sm);
        }
        
        /* Quick Actions */
        .quick-actions {
          display: flex;
          gap: 8px;
        }
        
        .quick-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text-secondary);
          font-size: 11px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .quick-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 0 15px -5px var(--accent);
        }
        
        /* Tabs */
        .tabs-container {
          display: flex;
          gap: 4px;
          background: var(--bg-tertiary);
          padding: 4px;
          border-radius: var(--radius);
          margin-bottom: var(--gap-xl);
          width: fit-content;
        }
        
        .tab {
          padding: 8px 20px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: var(--text-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .tab:hover { color: var(--text-primary); }
        
        .tab.active {
          background: var(--bg-secondary);
          color: var(--text-primary);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 10px -5px var(--accent);
          border-bottom: 2px solid var(--accent);
        }
        
        /* Layout */
        .detail-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: var(--gap-xl);
        }
        
        @media (max-width: 1000px) {
          .detail-layout { grid-template-columns: 1fr; }
          .detail-sidebar { order: -1; }
        }
        
        .detail-main {
          display: flex;
          flex-direction: column;
          gap: var(--gap-xl);
        }
        
        .detail-sidebar {
          display: flex;
          flex-direction: column;
          gap: var(--gap-lg);
        }
        
        /* Info Card - New Organized Layout */
        .info-card {
          padding: 0;
          overflow: hidden;
        }
        
        .info-section-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          min-height: 280px;
        }
        
        @media (max-width: 768px) {
          .info-section-row {
            grid-template-columns: 1fr;
          }
          .info-divider { display: none; }
          .info-col { border-bottom: 1px solid var(--border); }
          .info-col:last-child { border-bottom: none; }
        }
        
        .info-col {
          padding: 20px 24px;
        }
        
        .info-divider {
          width: 1px;
          background: var(--border);
        }
        
        .info-col-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          margin-bottom: 16px;
        }
        
        .info-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .info-item-row {
          display: grid;
          grid-template-columns: 20px 80px 1fr;
          gap: 8px;
          align-items: start;
          font-size: var(--text-sm);
        }
        
        .info-icon {
          color: var(--text-muted);
          margin-top: 2px;
        }
        
        .info-label {
          color: var(--text-muted);
          font-weight: 500;
        }
        
        .info-value {
          color: var(--text-primary);
          word-break: break-word;
        }
        
        .info-value a {
          color: var(--accent);
        }
        
        .info-value a:hover {
          text-decoration: underline;
        }
        
        .no-website {
          color: var(--success);
          font-weight: 500;
        }
        
        .maps-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 16px;
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border-radius: var(--radius);
          font-size: var(--text-sm);
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        
        .maps-link:hover {
          background: var(--bg-primary);
          color: var(--accent);
        }
        
        /* Contact Fields */
        .contact-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .contact-field label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        
        /* Editable Field */
        .editable-field {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: var(--bg-tertiary);
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          font-size: var(--text-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .editable-field:hover {
          border-color: var(--accent);
          box-shadow: 0 0 10px -5px var(--accent);
        }
        
        .editable-field .placeholder {
          color: var(--text-muted);
        }
        
        .editable-field .edit-icon {
          margin-left: auto;
          color: var(--text-muted);
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        
        .editable-field:hover .edit-icon { opacity: 1; }
        
        .editable-field.editing {
          background: var(--bg-secondary);
          border-color: var(--accent);
        }
        
        .inline-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: var(--text-sm);
          color: var(--text-primary);
          min-width: 0;
        }
        
        .inline-btn {
          padding: 4px;
          background: var(--accent);
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
        }
        
        .field-prefix, .field-suffix {
          color: var(--text-muted);
          font-weight: 500;
        }

        .hero-name-edit {
          background: transparent !important;
          border: 1px solid transparent !important;
          padding: 0 !important;
          margin-left: -10px;
          margin-bottom: 4px;
        }

        .hero-name-edit:hover {
          border-color: var(--border) !important;
        }

        .hero-name-edit span {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .hero-type-edit {
          background: transparent !important;
          border: 1px solid transparent !important;
          padding: 2px 4px !important;
          margin-left: -4px;
        }

        .info-value-edit {
          flex: 1;
          background: transparent !important;
          border: 1px solid transparent !important;
          padding: 4px 8px !important;
          margin-left: -8px;
        }

        .info-value-edit:hover {
          border-color: var(--border) !important;
        }
        
        /* Notes Card */
        .notes-card {
          padding: 20px 24px;
        }
        
        .notes-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: var(--text-base);
          font-weight: 600;
          margin: 0;
        }
        
        .section-title svg { color: var(--text-muted); }
        
        .notes-count {
          background: var(--bg-tertiary);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
          color: var(--text-muted);
        }
        
        .note-form {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .note-form .textarea {
          flex: 1;
          resize: none;
          min-height: 60px;
        }
        
        .note-form .btn {
          align-self: flex-end;
        }
        
        .notes-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .note-item {
          padding: 12px 14px;
          background: var(--bg-tertiary);
          border-radius: var(--radius);
        }
        
        .note-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        
        .note-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-muted);
        }
        
        .note-text {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          line-height: 1.5;
          white-space: pre-wrap;
        }
        
        /* Activity Timeline */
        .activity-section { padding: 20px 24px; }
        
        .activity-timeline {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 16px;
        }
        
        .activity-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: var(--radius);
          transition: background var(--transition-fast);
        }
        
        .activity-item:hover { background: var(--bg-tertiary); }
        
        .activity-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .activity-content { flex: 1; }
        
        .activity-text {
          font-size: var(--text-sm);
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        
        .activity-time {
          font-size: 11px;
          color: var(--text-muted);
        }
        
        /* Files */
        .files-section { padding: 20px 24px; }
        
        .file-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          background: var(--bg-tertiary);
          cursor: pointer;
          transition: all var(--transition-fast);
          margin: 16px 0;
        }
        
        .file-dropzone:hover, .file-dropzone.dragging {
          border-color: var(--accent);
          background: var(--accent-subtle);
        }
        
        .file-dropzone svg { color: var(--text-muted); margin-bottom: 8px; }
        .file-dropzone p { font-size: var(--text-sm); color: var(--text-primary); margin-bottom: 4px; }
        .file-dropzone span { font-size: 11px; color: var(--text-muted); }
        
        .files-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
        }
        
        .file-card {
          display: flex;
          flex-direction: column;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
        }
        
        .file-preview {
          height: 100px;
          background-size: cover;
          background-position: center;
        }
        
        .file-icon {
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          color: var(--text-muted);
        }
        
        .file-info {
          padding: 10px 12px;
          flex: 1;
        }
        
        .file-name {
          display: block;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .file-meta {
          font-size: 11px;
          color: var(--text-muted);
        }
        
        .file-actions {
          display: flex;
          justify-content: flex-end;
          padding: 0 8px 8px;
          gap: 4px;
        }
        
        /* Deal Card */
        .deal-card .card-title { margin-bottom: 12px; }
        
        .deal-amount { margin-bottom: 16px; }
        
        .deal-field {
          font-size: 1.5rem;
          font-weight: 700;
          padding: 12px 14px;
        }
        
        .deal-field .field-prefix {
          font-size: 1.25rem;
        }
        
        .deal-meta {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .deal-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--text-sm);
        }
        
        .deal-row > span:first-child { color: var(--text-muted); }
        
        .deal-date-field {
          padding: 6px 10px;
          font-size: var(--text-sm);
        }
        
        .deal-probability {
          font-weight: 600;
          color: var(--accent);
        }
        
        /* Stage Card */
        .stage-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 12px;
        }
        
        .stage-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text-secondary);
          font-size: var(--text-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
        }
        
        .stage-btn:hover {
          border-color: var(--stage-color);
          color: var(--text-primary);
        }
        
        .stage-btn.active {
          background: color-mix(in srgb, var(--stage-color) 10%, transparent);
          border-color: var(--stage-color);
          color: var(--text-primary);
          box-shadow: 0 0 15px -5px var(--stage-color);
        }
        
        .stage-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        /* Meta Card */
        .meta-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 12px;
        }
        
        .meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--text-sm);
        }
        
        .meta-label { color: var(--text-muted); }
        .meta-value { color: var(--text-primary); }
        .meta-value.highlight { color: var(--success); font-weight: 500; }
        .meta-value.capitalize { text-transform: capitalize; }
        
        /* Empty States */
        .empty-text {
          color: var(--text-muted);
          font-size: var(--text-sm);
          font-style: italic;
        }
        
        .empty-state-small {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
          color: var(--text-muted);
        }
        
        .empty-state-small svg { margin-bottom: 12px; opacity: 0.5; }
        .empty-state-small p { font-size: var(--text-sm); margin-bottom: 4px; color: var(--text-secondary); }
        .empty-state-small span { font-size: 12px; }
        
        /* Modal */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        
        .modal {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          max-width: 450px;
          width: 100%;
        }
        
        .modal h3 { 
          margin-bottom: 8px; 
          display: flex; 
          align-items: center; 
          gap: 8px; 
        }
        
        .modal > p { 
          margin-bottom: 20px; 
          font-size: var(--text-sm); 
          color: var(--text-secondary); 
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 16px;
        }
        
        .log-modal .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .log-modal .modal-header h3 { margin-bottom: 0; }
        
        .btn-xs { padding: 2px 4px; }

        /* Automation Tab */
        .automation-section { padding: 24px; }
        
        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .automation-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--accent-subtle);
          color: var(--accent);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }

        .automation-layout {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 24px;
        }

        .templates-sidebar h4 {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .templates-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .template-item {
          text-align: left;
          padding: 10px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .template-item:hover {
          border-color: var(--accent);
          color: var(--text-primary);
        }

        .template-item.active {
          background: var(--accent-subtle);
          border-color: var(--accent);
          color: var(--accent);
          font-weight: 500;
        }

        .email-editor {
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: var(--bg-tertiary);
          padding: 20px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
        }

        .editor-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .editor-field label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .editor-field .input {
          background: var(--bg-secondary);
          font-size: 14px;
        }

        .body-field .textarea {
          resize: vertical;
          min-height: 200px;
          line-height: 1.6;
        }

        .editor-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }

        .editor-hint {
          font-size: 11px;
          color: var(--text-muted);
        }

        .empty-state-small.warning {
          background: #f59e0b0d;
          border: 1px dashed #f59e0b40;
          border-radius: var(--radius-lg);
        }

        .assignment-control {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-tertiary);
          transition: all var(--transition-fast);
        }

        .assignment-control:hover {
          border-color: var(--border-hover);
          color: var(--text-secondary);
        }

        .assign-select {
          background: transparent;
          border: none;
          color: inherit;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          padding-right: 4px;
        }

        @media (max-width: 800px) {
          .automation-layout {
            grid-template-columns: 1fr;
          }
        }

      `}</style>
    </div>
  )
}

export default LeadDetail
