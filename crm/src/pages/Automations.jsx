import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  Square,
  Search,
  Terminal,
  MapPin,
  Ruler,
  Building2,
  FileOutput,
  Star,
  Globe,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  MessageSquare,
  Phone,
  Download,
  X,
  Users,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import Papa from 'papaparse'
import useStore from '../store/useStore'
import { supabase } from '../lib/supabase'

// Use configured backend URL (Railway)
const API_BASE = import.meta.env.VITE_BACKEND_URL
const API_URL = `${API_BASE}/api`

function Automations() {
  const navigate = useNavigate()
  const importLeads = useStore(state => state.importLeads)
  const profile = useStore(state => state.profile)
  const isAdmin = profile?.role === 'admin'

  // Admin-only guard
  if (!isAdmin) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>Access Denied</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Only administrators can generate leads.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Form state
  const [location, setLocation] = useState('Almada, Portugal')
  const [radius, setRadius] = useState(10000)
  const [types, setTypes] = useState('')
  const [format, setFormat] = useState('csv')
  const [noWebsite, setNoWebsite] = useState(true)
  const [hasPhone, setHasPhone] = useState(false)
  const [minRating, setMinRating] = useState('')
  const [minReviews, setMinReviews] = useState('')
  const [maxReviews, setMaxReviews] = useState('')
  const [noDetails, setNoDetails] = useState(false)

  // Process state
  const [processId, setProcessId] = useState(null)
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [exitCode, setExitCode] = useState(null)
  const [error, setError] = useState(null)
  const [exportedFile, setExportedFile] = useState(null)
  const [leadsFound, setLeadsFound] = useState(0)
  const [currentPhase, setCurrentPhase] = useState('INIT')
  const [progress, setProgress] = useState(0)

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [isImporting, setIsImporting] = useState(false)

  const outputRef = useRef(null)
  const pollInterval = useRef(null)

  // Poll for process updates
  useEffect(() => {
    if (processId && isRunning) {
      pollInterval.current = setInterval(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch(`${API_URL}/process/${processId}`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
          })
          const data = await res.json()

          setOutput(data.output)

          // Parse Phase Markers
          const phaseMatch = data.output.match(/\[PHASE:\s*([^\]]+)\]/i)
          if (phaseMatch) {
            const phase = phaseMatch[1].toUpperCase()
            setCurrentPhase(phase)

            // Set base progress for phases
            if (phase === 'SEARCHING') setProgress(10)
            if (phase === 'FILTERING') setProgress(70)
            if (phase === 'STATS') setProgress(85)
            if (phase === 'EXPORTING') setProgress(95)
          }

          // Parse Search Progress (e.g., Searching for cafe... (2/3))
          const searchProgressMatch = data.output.match(/\((\d+)\/(\d+)\)/)
          if (searchProgressMatch) {
            const current = parseInt(searchProgressMatch[1])
            const total = parseInt(searchProgressMatch[2])
            const searchProgress = Math.round((current / total) * 60) // Up to 60% for search
            setProgress(10 + searchProgress)
          }

          // Detect leads count
          const leadsMatch = data.output.match(/After filtering:\s*(\d+)\s*leads/i) ||
            data.output.match(/Total leads:\s*(\d+)/i) ||
            data.output.match(/Found\s*(\d+)\s*businesses/i)
          if (leadsMatch) {
            setLeadsFound(parseInt(leadsMatch[1]))
          }

          // Detect exported file from output - handle ANSI codes and various formats
          const exportMatch = data.output.match(/Exported to:\s*([^\n\r]+)/i)
          if (exportMatch) {
            let filePath = exportMatch[1].trim()
              .replace(/\x1b\[[0-9;]*m/g, '')
              .replace(/\[[\d;]*m/g, '')
            setExportedFile(filePath)
          }

          if (data.isComplete) {
            setIsRunning(false)
            setIsComplete(true)
            setExitCode(data.exitCode)
            setProgress(100)
            clearInterval(pollInterval.current)

            // Show import modal if successful
            if (data.exitCode === 0) {
              const fileMatch = data.output.match(/Exported to:\s*([^\n\r]+)/i)
              if (fileMatch) {
                let filePath = fileMatch[1].trim()
                  .replace(/\x1b\[[0-9;]*m/g, '')
                  .replace(/\[[\d;]*m/g, '')
                setExportedFile(filePath)
                setShowImportModal(true)
              }
            }
          }
        } catch (err) {
          console.error('Poll error:', err)
        }
      }, 500)

      return () => clearInterval(pollInterval.current)
    }
  }, [processId, isRunning])

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  const handleImportLeads = async () => {
    if (!exportedFile) return

    setIsImporting(true)
    try {
      // Clean up the file path
      const cleanPath = exportedFile
        .replace(/\x1b\[[0-9;]*m/g, '')
        .replace(/\[[\d;]*m/g, '')
        .trim()

      console.log('Importing from:', cleanPath)

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_URL}/csv-data?file=${encodeURIComponent(cleanPath)}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('CSV fetch failed:', res.status, errorData)
        throw new Error(errorData.error || 'Failed to fetch CSV')
      }

      const { content } = await res.json()

      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const count = await importLeads(results.data)
            setImportResult({
              total: results.data.length,
              imported: count,
              skipped: results.data.length - count
            })
          } catch (err) {
            console.error('Import failed:', err)
          } finally {
            setIsImporting(false)
            setShowImportModal(false)
          }
        },
        error: (err) => {
          console.error('Parse error:', err)
          setIsImporting(false)
        }
      })
    } catch (err) {
      console.error('Import error:', err)
      setIsImporting(false)
    }
  }

  const runGenerateLeads = async () => {
    setError(null)
    setOutput('')
    setIsComplete(false)
    setExitCode(null)
    setExportedFile(null)
    setImportResult(null)
    setShowImportModal(false)
    setLeadsFound(0)
    setCurrentPhase('INITIALIZING')
    setProgress(5)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_URL}/generate-leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          location,
          radius,
          types: types || null,
          format,
          noWebsite,
          hasPhone,
          minRating: minRating ? parseFloat(minRating) : null,
          minReviews: minReviews ? parseInt(minReviews) : null,
          maxReviews: maxReviews ? parseInt(maxReviews) : null,
          noDetails
        })
      })

      if (!res.ok) throw new Error('Failed to start process')

      const data = await res.json()
      setProcessId(data.processId)
      setIsRunning(true)
    } catch (err) {
      console.error('Lead generation start failed:', err)
      setError(`Failed to connect to server at ${API_URL}. Make sure to run: npm run server`)
    }
  }

  const stopProcess = async () => {
    if (!processId) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${API_URL}/process/${processId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      setIsRunning(false)
      setOutput(prev => prev + '\n\n[Process terminated by user]')
    } catch (err) {
      console.error('Stop error:', err)
    }
  }

  const testConnection = async () => {
    setError(null)
    setOutput('')
    setIsComplete(false)
    setExitCode(null)
    setExportedFile(null)
    setImportResult(null)
    setShowImportModal(false)
    setCurrentPhase('TESTING')
    setProgress(0)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_URL}/test-connection`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      const data = await res.json()
      setProcessId(data.processId)
      setIsRunning(true)
    } catch (err) {
      console.error('Connection test failed:', err)
      setError(`Failed to connect to server at ${API_URL}. Check if the server is running on port 3001.`)
    }
  }

  // Console Log Helper
  const renderLogLine = (line, index) => {
    if (!line.trim() || line.startsWith('[PHASE:')) return null

    let icon = null
    let className = 'log-line'

    if (line.includes('Searching for')) icon = <Search size={14} className="log-icon-blue" />
    else if (line.includes('Found')) icon = <CheckCircle2 size={14} className="log-icon-green" />
    else if (line.includes('After filtering')) icon = <Zap size={14} className="log-icon-purple" />
    else if (line.includes('Exported to')) icon = <Download size={14} className="log-icon-orange" />
    else if (line.includes('Error')) icon = <XCircle size={14} className="log-icon-red" />
    else if (line.includes('Statistics:')) icon = <Loader2 size={14} className="log-icon-green spin" />
    else if (line.includes('Location:') || line.includes('Radius:') || line.includes('Types:')) icon = <ArrowRight size={12} className="log-icon-muted" />

    return (
      <div key={index} className={className}>
        {icon && <span className="log-icon-wrapper">{icon}</span>}
        <span className="log-text">{line}</span>
      </div>
    )
  }

  return (
    <div className="page automations-page">
      <header className="page-header">
        <div>
          <h1>Automations</h1>
          <p>Run the Lead Generator directly from your CRM</p>
        </div>
        <button className="btn btn-secondary" onClick={testConnection} disabled={isRunning}>
          <Zap size={16} />
          Test Connection
        </button>
      </header>

      {error && (
        <div className="error-banner animate-fade-in">
          <XCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Import Modal - Premium Design */}
      {showImportModal && (
        <div className="modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div className="modal import-modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowImportModal(false)}>
              <X size={20} />
            </button>

            <div className="modal-success-header">
              <div className="success-icon-ring">
                <div className="success-icon">
                  <Sparkles size={28} />
                </div>
              </div>
              <div className="confetti confetti-1"></div>
              <div className="confetti confetti-2"></div>
              <div className="confetti confetti-3"></div>
            </div>

            <div className="modal-body">
              <h2>Generation Complete!</h2>
              <p className="modal-subtitle">Your lead search has finished successfully</p>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">
                    <Users size={20} />
                  </div>
                  <div className="stat-content">
                    <span className="stat-number">{leadsFound}</span>
                    <span className="stat-label">Leads Found</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <MapPin size={20} />
                  </div>
                  <div className="stat-content">
                    <span className="stat-number">{location.split(',')[0]}</span>
                    <span className="stat-label">Location</span>
                  </div>
                </div>
              </div>

              <div className="file-info">
                <Download size={14} />
                <span>{exportedFile?.split(/[/\\]/).pop() || 'leads.csv'}</span>
              </div>

              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setShowImportModal(false)}>
                  Maybe Later
                </button>
                <button
                  className="btn btn-primary btn-lg import-btn"
                  onClick={handleImportLeads}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      Import to CRM
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="automations-layout">
        {/* Configuration Panel */}
        <section className="card config-panel animate-fade-in">
          <h3 className="panel-title">
            <Terminal size={18} />
            Generate Leads
          </h3>
          <p className="panel-description">
            Configure and run the lead generator to find new prospects
          </p>

          <div className="config-form">
            <div className="form-group">
              <label>
                <MapPin size={14} />
                Location
              </label>
              <input
                type="text"
                className="input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Lisbon, Portugal"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  <Ruler size={14} />
                  Radius (m)
                </label>
                <input
                  type="number"
                  className="input"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value) || 10000)}
                  min={1000}
                  max={50000}
                  step={1000}
                />
              </div>

              <div className="form-group">
                <label>
                  <FileOutput size={14} />
                  Format
                </label>
                <select
                  className="input select"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>
                <Building2 size={14} />
                Business Types <span className="label-hint">(comma-separated, optional)</span>
              </label>
              <input
                type="text"
                className="input"
                value={types}
                onChange={(e) => setTypes(e.target.value)}
                placeholder="restaurant,cafe,bar"
              />
            </div>

            <div className="form-group">
              <label>
                <Star size={14} />
                Min Rating <span className="label-hint">(optional)</span>
              </label>
              <input
                type="number"
                className="input"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                placeholder="e.g., 4.0"
                min={1}
                max={5}
                step={0.1}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  <MessageSquare size={14} />
                  Min Reviews <span className="label-hint">(optional)</span>
                </label>
                <input
                  type="number"
                  className="input"
                  value={minReviews}
                  onChange={(e) => setMinReviews(e.target.value)}
                  placeholder="e.g., 10"
                  min={0}
                />
              </div>

              <div className="form-group">
                <label>
                  <MessageSquare size={14} />
                  Max Reviews <span className="label-hint">(optional)</span>
                </label>
                <input
                  type="number"
                  className="input"
                  value={maxReviews}
                  onChange={(e) => setMaxReviews(e.target.value)}
                  placeholder="e.g., 100"
                  min={0}
                />
              </div>
            </div>

            <div className="form-toggles">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={noWebsite}
                  onChange={(e) => setNoWebsite(e.target.checked)}
                />
                <Globe size={14} />
                <span>Only without website <span className="hint">(prime targets)</span></span>
              </label>

              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={hasPhone}
                  onChange={(e) => setHasPhone(e.target.checked)}
                />
                <Phone size={14} />
                <span>Has phone number <span className="hint">(contactable)</span></span>
              </label>

              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={noDetails}
                  onChange={(e) => setNoDetails(e.target.checked)}
                />
                <Zap size={14} />
                <span>Fast mode <span className="hint">(skip detailed info)</span></span>
              </label>
            </div>

            <div className="form-actions">
              {isRunning ? (
                <button className="btn btn-danger btn-lg" onClick={stopProcess}>
                  <Square size={16} />
                  Stop
                </button>
              ) : (
                <button className="btn btn-primary btn-lg" onClick={runGenerateLeads}>
                  <Play size={16} />
                  Generate Leads
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Output Panel */}
        <section className="card output-panel animate-fade-in">
          <div className="output-header">
            <h3 className="panel-title">
              <Terminal size={18} />
              Output
            </h3>
            {isRunning && (
              <span className="running-badge">
                <Loader2 size={14} className="spin" />
                Running...
              </span>
            )}
            {isComplete && (
              <span className={`complete-badge ${exitCode === 0 ? 'success' : 'error'}`}>
                {exitCode === 0 ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {exitCode === 0 ? 'Complete' : 'Error'}
              </span>
            )}
          </div>

          <div className="output-terminal-v2">
            {/* Progress Header */}
            <div className="terminal-progress-header">
              <div className="phase-indicator">
                <span className="phase-label">Status:</span>
                <span className={`phase-value ${isRunning ? 'pulse' : ''}`}>
                  {isComplete ? 'Finished' : (isRunning ? currentPhase : 'Idle')}
                </span>
              </div>
              <div className="progress-value">{progress}%</div>
            </div>

            {/* Progress Bar */}
            <div className="terminal-progress-bar">
              <div
                className={`progress-fill ${isComplete ? 'complete' : ''}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {/* Logs */}
            <div className="terminal-logs" ref={outputRef}>
              {output ? (
                <div className="logs-container">
                  {output.split('\n').map((line, i) => renderLogLine(line, i))}
                </div>
              ) : (
                <div className="output-placeholder">
                  <Terminal size={32} />
                  <p>Output will appear here when you run an automation</p>
                </div>
              )}
            </div>
          </div>

          {importResult && (
            <div className="import-result">
              <CheckCircle2 size={20} />
              <div className="import-info">
                <strong>{importResult.imported} leads imported to CRM</strong>
                {importResult.skipped > 0 && (
                  <span> ({importResult.skipped} duplicates skipped)</span>
                )}
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/leads')}>
                View Leads
              </button>
            </div>
          )}

          {isComplete && exitCode === 0 && exportedFile && !importResult && !showImportModal && (
            <div className="import-prompt">
              <Download size={18} />
              <span>Leads exported. Want to import them?</span>
              <button className="btn btn-primary btn-sm" onClick={() => setShowImportModal(true)}>
                Import to CRM
              </button>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .automations-page {
          max-width: 100%;
        }
        
        .error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: var(--danger-subtle);
          border: 1px solid var(--danger);
          border-radius: var(--radius);
          color: var(--danger);
          font-size: var(--text-sm);
          margin-bottom: var(--gap-xl);
        }
        
        .automations-layout {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: var(--gap-xl);
        }
        
        @media (max-width: 1000px) {
          .automations-layout {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
        
        @media (max-width: 600px) {
          .automations-page {
            padding: 16px;
            overflow-x: hidden;
          }
          .form-row {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .config-panel {
            padding: 16px;
          }
          .btn-lg {
            width: 100%;
          }
        }
        
        .panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: var(--text-lg);
          margin-bottom: 4px;
        }
        
        .panel-description {
          font-size: var(--text-sm);
          color: var(--text-tertiary);
          margin-bottom: var(--gap-xl);
        }
        
        .config-form {
          display: flex;
          flex-direction: column;
          gap: var(--gap-lg);
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .form-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
        }
        
        .form-group label svg {
          color: var(--text-muted);
        }
        
        .label-hint {
          font-weight: 400;
          color: var(--text-muted);
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--gap-lg);
        }
        
        @media (max-width: 480px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
        
        .form-toggles {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px;
          background: var(--bg-tertiary);
          border-radius: var(--radius);
          border: 1px solid var(--border);
          transition: all var(--transition);
        }
        
        .form-toggles:hover {
          border-color: var(--border-hover);
          background: var(--bg-secondary);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .toggle-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: var(--text-sm);
          color: var(--text-secondary);
          cursor: pointer;
        }
        
        .toggle-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--accent);
        }
        
        .toggle-label .hint {
          color: var(--text-muted);
        }
        
        .form-actions {
          margin-top: var(--gap-md);
        }
        
        .form-actions .btn {
          width: 100%;
        }
        
        .output-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .output-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--gap-lg);
        }
        
        .output-header .panel-title {
          margin-bottom: 0;
        }
        
        .running-badge,
        .complete-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          font-size: var(--text-xs);
          font-weight: 500;
          border-radius: var(--radius-sm);
        }
        
        .running-badge {
          background: var(--accent-subtle);
          color: var(--accent);
          box-shadow: 0 0 10px -2px var(--accent);
          animation: pulse-soft 2s infinite;
        }
        
        .complete-badge.success {
          background: var(--success-subtle);
          color: var(--success);
          box-shadow: 0 0 10px -2px var(--success);
        }
        
        .complete-badge.error {
          background: var(--danger-subtle);
          color: var(--danger);
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .output-terminal {
          flex: 1;
          min-height: 400px;
          max-height: 600px;
          overflow-y: auto;
          background: #0a0a0c;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 16px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        }
        
        .output-terminal pre {
          font-size: 12px;
          line-height: 1.6;
          color: #e4e4e7;
          white-space: pre-wrap;
          word-break: break-word;
          margin: 0;
        }
        
        .output-placeholder {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          text-align: center;
        }
        
        .output-placeholder svg {
          margin-bottom: 12px;
          opacity: 0.5;
        }
        
        .output-placeholder p {
          font-size: var(--text-sm);
          font-family: inherit;
        }
        
        .import-result,
        .import-prompt {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: var(--gap-lg);
          padding: 14px 16px;
          border-radius: var(--radius);
        }
        
        .import-result {
          background: var(--success-subtle);
          border: 1px solid var(--success);
          color: var(--success);
        }
        
        .import-prompt {
          background: var(--accent-subtle);
          border: 1px solid var(--accent);
          color: var(--accent);
        }
        
        .import-result svg,
        .import-prompt svg {
          flex-shrink: 0;
        }
        
        .import-info,
        .import-prompt span {
          flex: 1;
          font-size: var(--text-sm);
        }
        
        .import-info span {
          font-weight: 400;
          opacity: 0.8;
        }
        
        /* Premium Modal Styles */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        
        .modal {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 20px;
          width: 100%;
          max-width: 440px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        
        .animate-scale-in {
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 50%;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          z-index: 10;
        }
        
        .modal-close:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          transform: rotate(90deg);
        }
        
        .modal-success-header {
          position: relative;
          padding: 40px 24px 20px;
          background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
          display: flex;
          justify-content: center;
          overflow: hidden;
        }
        
        .success-icon-ring {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse-ring 2s infinite;
          box-shadow: 0 0 30px rgba(255,255,255,0.1);
        }
        
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        
        .success-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 15px rgba(255,255,255,0.8);
        }
        
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }
        
        .confetti-1 {
          top: 30%;
          left: 20%;
          background: #fbbf24;
          animation: confetti-fall 3s infinite;
        }
        
        .confetti-2 {
          top: 20%;
          right: 25%;
          background: #34d399;
          animation: confetti-fall 3s 0.5s infinite;
        }
        
        .confetti-3 {
          top: 40%;
          right: 15%;
          background: #f472b6;
          animation: confetti-fall 3s 1s infinite;
        }
        
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(60px) rotate(360deg); opacity: 0; }
        }
        
        .modal-body {
          padding: 28px 32px 32px;
          text-align: center;
        }
        
        .modal-body h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 6px;
          color: var(--text-primary);
        }
        
        .modal-subtitle {
          color: var(--text-tertiary);
          font-size: var(--text-sm);
          margin-bottom: 24px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 12px;
        }
        
        .stat-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-subtle);
          border-radius: 10px;
          color: var(--accent);
        }
        
        .stat-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        
        .stat-number {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }
        
        .stat-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .file-info {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: var(--bg-tertiary);
          border-radius: 20px;
          font-size: 12px;
          color: var(--text-secondary);
          font-family: 'SF Mono', Monaco, monospace;
          margin-bottom: 24px;
        }
        
        .file-info svg {
          color: var(--text-muted);
        }
        
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        
        .modal-actions .btn-ghost {
          padding: 12px 20px;
        }
        
        .import-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px !important;
          font-weight: 600;
        }
        
        .import-btn:hover svg:last-child {
          transform: translateX(3px);
        }
        
        .import-btn svg {
          transition: transform 0.2s;
        }

        /* Branded Console Styles */
        .output-terminal-v2 {
          background: #0d0d12;
          border: 1px solid var(--border);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 400px;
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.3);
          overflow: hidden;
        }

        .terminal-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .phase-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .phase-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .phase-value {
          font-size: 13px;
          color: var(--accent);
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .phase-value.pulse {
          animation: pulse-soft 2s infinite;
        }

        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .progress-value {
          font-family: 'SF Mono', monospace;
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .terminal-progress-bar {
          height: 4px;
          background: rgba(255,255,255,0.05);
          width: 100%;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent) 0%, #8b5cf6 100%);
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 15px -2px var(--accent);
        }

        .progress-fill.complete {
          background: var(--success);
        }

        .terminal-logs {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent 400px);
          white-space: pre-wrap;
          word-break: break-word;
        }

        .logs-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .log-line {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          animation: fade-in-up 0.3s ease-out;
          font-size: 13px;
          line-height: 1.5;
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .log-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          margin-top: 1px;
        }

        .log-text {
          color: #e4e4e7;
          word-break: break-word;
        }

        .log-icon-blue { color: #3b82f6; }
        .log-icon-green { color: #10b981; }
        .log-icon-purple { color: #8b5cf6; }
        .log-icon-orange { color: #f59e0b; }
        .log-icon-red { color: #ef4444; }
        .log-icon-muted { color: #71717a; }

        .output-terminal-v2::-webkit-scrollbar {
          width: 6px;
        }

        .output-terminal-v2::-webkit-scrollbar-track {
          background: transparent;
        }

        .output-terminal-v2::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }

        .output-terminal-v2::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  )
}

export default Automations
