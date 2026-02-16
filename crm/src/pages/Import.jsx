import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  FileUp
} from 'lucide-react'
import Papa from 'papaparse'
import useStore from '../store/useStore'

function Import() {
  const navigate = useNavigate()
  const importLeads = useStore(state => state.importLeads)
  const fileInputRef = useRef(null)

  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const processFile = (file) => {
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    setFile(file)
    setError(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Error parsing CSV: ${results.errors[0].message}`)
          return
        }
        setPreview({
          data: results.data,
          fields: results.meta.fields,
          count: results.data.length
        })
      },
      error: (error) => {
        setError(`Error reading file: ${error.message}`)
      }
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0])
    }
  }

  const handleImport = () => {
    if (!preview) return
    const count = importLeads(preview.data)
    setImportResult({
      total: preview.data.length,
      imported: count,
      skipped: preview.data.length - count
    })
    setPreview(null)
    setFile(null)
  }

  const resetImport = () => {
    setFile(null)
    setPreview(null)
    setImportResult(null)
    setError(null)
  }

  return (
    <div className="page import-page">
      <header className="page-header">
        <div>
          <h1>Import Leads</h1>
          <p>Import leads from your Lead Generator CSV exports</p>
        </div>
      </header>

      <div className="import-content">
        {/* Success State */}
        {importResult && (
          <div className="card success-card animate-fade-in">
            <div className="success-icon">
              <CheckCircle2 size={48} />
            </div>
            <h2>Import Complete!</h2>
            <div className="result-stats">
              <div className="result-item">
                <span className="result-number success">{importResult.imported}</span>
                <span className="result-label">Leads imported</span>
              </div>
              {importResult.skipped > 0 && (
                <div className="result-item">
                  <span className="result-number warning">{importResult.skipped}</span>
                  <span className="result-label">Duplicates skipped</span>
                </div>
              )}
            </div>
            <div className="success-actions">
              <button className="btn btn-secondary" onClick={resetImport}>
                Import More
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/leads')}>
                View Leads <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-banner animate-fade-in">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setError(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Drop Zone */}
        {!importResult && !preview && (
          <div
            className={`drop-zone ${dragActive ? 'active' : ''} animate-fade-in`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            <div className="drop-icon">
              <FileUp size={32} />
            </div>
            <h3>Drop your CSV file here</h3>
            <p>or click to browse</p>
            <span className="drop-hint">Supports CSV files from Lead Generator</span>
          </div>
        )}

        {/* Preview */}
        {preview && !importResult && (
          <div className="card preview-card animate-fade-in">
            <div className="preview-header">
              <div className="file-badge">
                <FileSpreadsheet size={20} />
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-count">{preview.count} leads found</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={resetImport}>
                <X size={14} /> Cancel
              </button>
            </div>

            <div className="preview-table-wrap">
              <table className="preview-table">
                <thead>
                  <tr>
                    {['business_name', 'phone', 'business_type', 'rating'].filter(f => preview.fields.includes(f)).map(field => (
                      <th key={field}>{field.replace('_', ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.data.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {['business_name', 'phone', 'business_type', 'rating'].filter(f => preview.fields.includes(f)).map(field => (
                        <td key={field}>{row[field] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.count > 5 && (
                <p className="preview-more">...and {preview.count - 5} more leads</p>
              )}
            </div>

            <button className="btn btn-primary btn-lg import-btn" onClick={handleImport}>
              <CheckCircle2 size={18} />
              Import {preview.count} Leads
            </button>
          </div>
        )}

        {/* Instructions */}
        {!importResult && (
          <div className="card instructions-card animate-fade-in">
            <h3>How to import leads</h3>
            <ol>
              <li>
                Generate leads using the CLI:
                <code>python main.py search --location "Lisbon" --format csv</code>
              </li>
              <li>Find the CSV file in the <code>data/</code> folder</li>
              <li>Drag and drop it above, or click to browse</li>
              <li>Review the preview and click Import</li>
            </ol>
            <p className="hint">Duplicates (same phone or name) will be automatically skipped.</p>
          </div>
        )}
      </div>

      <style>{`
        .import-page {
          max-width: 100%;
        }
        
        .import-content {
          max-width: 700px;
          display: flex;
          flex-direction: column;
          gap: var(--gap-xl);
        }
        
        .drop-zone {
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: all var(--transition);
          background: var(--bg-secondary);
        }
        
        .drop-zone:hover,
        .drop-zone.active {
          border-color: var(--accent);
          background: var(--accent-subtle);
          box-shadow: 0 0 25px -10px var(--accent);
          transform: translateY(-2px);
        }
        
        .drop-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border-radius: var(--radius-lg);
          color: var(--text-muted);
          transition: all var(--transition);
        }
        
        .drop-zone:hover .drop-icon,
        .drop-zone.active .drop-icon {
          background: var(--accent);
          color: white;
          box-shadow: 0 0 20px -5px var(--accent);
        }
        
        .drop-zone h3 {
          margin-bottom: 4px;
          font-size: var(--text-lg);
        }
        
        .drop-zone p {
          font-size: var(--text-sm);
        }
        
        .drop-hint {
          display: block;
          margin-top: 16px;
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        
        .success-card {
          text-align: center;
          padding: 48px 24px;
        }
        
        .success-icon {
          color: var(--success);
          margin-bottom: 16px;
          filter: drop-shadow(0 0 15px var(--success-subtle));
        }
        
        .success-card h2 {
          margin-bottom: 24px;
        }
        
        .result-stats {
          display: flex;
          justify-content: center;
          gap: 48px;
          margin-bottom: 32px;
        }
        
        .result-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .result-number {
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1;
        }
        
        .result-number.success { color: var(--success); text-shadow: 0 0 15px var(--success-subtle); }
        .result-number.warning { color: var(--warning); text-shadow: 0 0 15px var(--warning-subtle); }
        
        .result-label {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin-top: 4px;
        }
        
        .success-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
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
        }
        
        .error-banner span {
          flex: 1;
        }
        
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--gap-xl);
        }
        
        .file-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--accent);
        }
        
        .file-info {
          display: flex;
          flex-direction: column;
        }
        
        .file-name {
          font-weight: 500;
          color: var(--text-primary);
        }
        
        .file-count {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        
        .preview-table-wrap {
          overflow-x: auto;
          margin-bottom: var(--gap-xl);
        }
        
        .preview-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .preview-table th,
        .preview-table td {
          padding: 10px 14px;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        
        .preview-table th {
          font-size: var(--text-xs);
          text-transform: uppercase;
          color: var(--text-tertiary);
          background: var(--bg-tertiary);
        }
        
        .preview-table td {
          font-size: var(--text-sm);
        }
        
        .preview-more {
          text-align: center;
          font-size: var(--text-sm);
          color: var(--text-muted);
          margin-top: 12px;
        }
        
        .import-btn {
          width: 100%;
        }
        
        .instructions-card h3 {
          margin-bottom: var(--gap-lg);
        }
        
        .instructions-card ol {
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          color: var(--text-secondary);
          font-size: var(--text-sm);
        }
        
        .instructions-card code {
          display: block;
          margin-top: 8px;
          padding: 10px 14px;
          background: var(--bg-tertiary);
          border-radius: var(--radius);
          font-size: var(--text-xs);
          color: var(--text-primary);
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        }
        
        .instructions-card .hint {
          margin-top: 16px;
          font-size: var(--text-sm);
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}

export default Import
