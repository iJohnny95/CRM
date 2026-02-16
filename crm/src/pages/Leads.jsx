import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Search,
  ExternalLink,
  Phone,
  Globe,
  Star,
  X,
  ArrowUpDown,
  Upload,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  FilterX,
  Trash2,
  Square,
  CheckSquare,
  Sparkles,
  Zap,
  Mail,
  User,
  Layout,
  ArrowUp,
  ChevronDown
} from 'lucide-react'
import useStore, { STAGES, PRIORITIES } from '../store/useStore'
import { format } from 'date-fns'
import Papa from 'papaparse'

function Leads() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const leads = useStore(state => state.getFilteredLeads())
  const searchQuery = useStore(state => state.searchQuery)
  const setSearchQuery = useStore(state => state.setSearchQuery)
  const filterStage = useStore(state => state.filterStage)
  const setFilterStage = useStore(state => state.setFilterStage)
  const sortBy = useStore(state => state.sortBy)
  const setSortBy = useStore(state => state.setSortBy)
  const sortOrder = useStore(state => state.sortOrder)
  const setSortOrder = useStore(state => state.setSortOrder)
  const importLeads = useStore(state => state.importLeads)
  const addLead = useStore(state => state.addLead)
  const deleteLeads = useStore(state => state.deleteLeads)
  const updateLead = useStore(state => state.updateLead)
  const allLeads = useStore(state => state.leads)
  const users = useStore(state => state.users)
  const setFilterAgent = useStore(state => state.setFilterAgent)
  const filterAgent = useStore(state => state.filterAgent)

  // Filter states from store
  const filterPriority = useStore(state => state.filterPriority)
  const setFilterPriority = useStore(state => state.setFilterPriority)
  const filterWebsite = useStore(state => state.filterWebsite)
  const setFilterWebsite = useStore(state => state.setFilterWebsite)
  const filterMinRating = useStore(state => state.filterMinRating)
  const setFilterMinRating = useStore(state => state.setFilterMinRating)
  const filterMinReviews = useStore(state => state.filterMinReviews)
  const setFilterMinReviews = useStore(state => state.setFilterMinReviews)
  const filterIndustry = useStore(state => state.filterIndustry)
  const setFilterIndustry = useStore(state => state.setFilterIndustry)
  const filterDateRange = useStore(state => state.filterDateRange)
  const setFilterDateRange = useStore(state => state.setFilterDateRange)
  const filterHasPhone = useStore(state => state.filterHasPhone)
  const setFilterHasPhone = useStore(state => state.setFilterHasPhone)
  const filterHasEmail = useStore(state => state.filterHasEmail)
  const setFilterHasEmail = useStore(state => state.setFilterHasEmail)
  const filterNeedsAttention = useStore(state => state.filterNeedsAttention)
  const setFilterNeedsAttention = useStore(state => state.setFilterNeedsAttention)

  // Handle agent filter from URL (?agent=userId from Team page)
  useEffect(() => {
    const agentId = searchParams.get('agent')
    setFilterAgent(agentId || null)
    return () => setFilterAgent(null) // Clear on unmount
  }, [searchParams])

  // Handle incoming filters from location state
  useEffect(() => {
    if (location.state?.filterWebsite) {
      setFilterWebsite(location.state.filterWebsite)
    }
    if (location.state?.filterNeedsAttention) {
      setFilterNeedsAttention(true)
    }
  }, [location.state])

  // Derived state
  const industries = [...new Set(allLeads.map(l => l.business_type).filter(Boolean))].sort()

  // Selection state
  const [selectedLeads, setSelectedLeads] = useState([])
  const [isFixingTypes, setIsFixingTypes] = useState(false)
  const [fixSuccess, setFixSuccess] = useState(false)

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false)
  const [showNewLeadModal, setShowNewLeadModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState(null)
  const fileInputRef = useRef(null)

  const [newLead, setNewLead] = useState({
    business_name: '',
    phone: '',
    business_type: '',
    address: '',
    rating: '',
    website: ''
  })

  // Pagination & Scroll state
  const [itemsToShow, setItemsToShow] = useState(25)
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Scroll handler for "Back to Top"
  useState(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const loadMore = () => {
    setItemsToShow(prev => prev + 25)
  }

  const visibleLeads = leads.slice(0, itemsToShow)

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterStage('all')
    setFilterPriority('all')
    setFilterWebsite('all')
    setFilterMinRating(0)
    setFilterMinReviews(0)
    setFilterIndustry('all')
    setFilterDateRange('all')
    setFilterHasPhone('all')
    setFilterHasEmail('all')
    setFilterNeedsAttention(false)
    setSortBy('created_at')
    setSortOrder('desc')
    setItemsToShow(25)
  }

  const hasActiveFilters = searchQuery ||
    filterStage !== 'all' ||
    filterPriority !== 'all' ||
    filterWebsite !== 'all' ||
    filterMinRating > 0 ||
    filterMinReviews > 0 ||
    filterIndustry !== 'all' ||
    filterDateRange !== 'all' ||
    filterHasPhone !== 'all' ||
    filterHasEmail !== 'all' ||
    filterNeedsAttention

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null
    return <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(leads.map(l => l.id))
    }
  }

  const toggleSelectLead = (id) => {
    setSelectedLeads(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleBulkDelete = () => {
    setShowDeleteModal(true)
  }

  const confirmBulkDelete = () => {
    deleteLeads(selectedLeads)
    setSelectedLeads([])
    setShowDeleteModal(false)
  }

  // Import handlers
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setImportError('Please upload a CSV file')
      return
    }

    setImportError(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setImportError(`Error parsing CSV: ${results.errors[0].message}`)
          return
        }
        const count = importLeads(results.data)
        setImportResult({
          total: results.data.length,
          imported: count,
          skipped: results.data.length - count
        })
      },
      error: (error) => {
        setImportError(`Error reading file: ${error.message}`)
      }
    })
  }

  const handleSmartDetect = async () => {
    if (selectedLeads.length === 0) return

    setIsFixingTypes(true)
    try {
      const selectedData = selectedLeads.map(id => {
        const lead = useStore.getState().getLeadById(id)
        return {
          id: lead.id,
          place_id: lead.place_id,
          types: lead.types,
          business_type: lead.business_type
        }
      })

      const res = await fetch('http://localhost:3001/api/fix-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: selectedData })
      })

      if (!res.ok) throw new Error('Failed to fix types')

      const { updates } = await res.json()

      // Update store
      Object.entries(updates).forEach(([id, data]) => {
        updateLead(id, {
          business_type: data.business_type,
          types: data.types
        })
      })

      // Show success feedback
      setFixSuccess(true)
      setTimeout(() => setFixSuccess(false), 3000)

      // Clear selection after a delay if desired
      // setTimeout(() => setSelectedLeads([]), 1000)
    } catch (err) {
      console.error('Smart detect error:', err)
    } finally {
      setIsFixingTypes(false)
    }
  }

  const closeImportModal = () => {
    setShowImportModal(false)
    setImportResult(null)
    setImportError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // New lead handlers
  const handleNewLeadChange = (e) => {
    setNewLead({ ...newLead, [e.target.name]: e.target.value })
  }

  const handleNewLeadSubmit = (e) => {
    e.preventDefault()
    if (!newLead.business_name.trim()) return

    addLead({
      business_name: newLead.business_name,
      phone: newLead.phone || null,
      business_type: newLead.business_type || 'business',
      address: newLead.address || null,
      rating: newLead.rating ? parseFloat(newLead.rating) : 0,
      website: newLead.website || null,
      has_website: !!newLead.website,
      review_count: 0,
      google_maps_url: null,
      place_id: null
    })

    setNewLead({
      business_name: '',
      phone: '',
      business_type: '',
      address: '',
      rating: '',
      website: ''
    })
    setShowNewLeadModal(false)
  }

  const agentUser = filterAgent ? users.find(u => u.id === filterAgent) : null

  return (
    <div className="page leads-page">
      {agentUser && (
        <div className="agent-filter-banner" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', marginBottom: '16px', borderRadius: '8px',
          background: 'var(--accent-subtle)', border: '1px solid var(--accent)',
          color: 'var(--accent)', fontSize: '14px', fontWeight: 500
        }}>
          <span>
            <User size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            Viewing leads assigned to: <strong>{agentUser.full_name || agentUser.email}</strong>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leads')} style={{ color: 'var(--accent)' }}>
            <X size={14} /> Clear Filter
          </button>
        </div>
      )}
      <header className="page-header">
        <div>
          <h1>Leads</h1>
          <p>{leads.length} leads found</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
            <Upload size={16} />
            Import
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewLeadModal(true)}>
            <Plus size={16} />
            New Lead
          </button>
        </div>
      </header>

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-backdrop" onClick={closeImportModal}>
          <div className="modal-content import-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FileSpreadsheet size={20} /> Import Leads</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={closeImportModal}>
                <X size={18} />
              </button>
            </div>

            {importResult ? (
              <div className="import-success">
                <CheckCircle2 size={40} />
                <h3>Import Complete!</h3>
                <p><strong>{importResult.imported}</strong> leads imported</p>
                {importResult.skipped > 0 && (
                  <p className="skipped">{importResult.skipped} duplicates skipped</p>
                )}
                <button className="btn btn-primary" onClick={closeImportModal}>
                  Done
                </button>
              </div>
            ) : (
              <div className="import-content">
                {importError && (
                  <div className="import-error">
                    <AlertCircle size={16} />
                    {importError}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <div
                  className="drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={32} />
                  <p>Click to select a CSV file</p>
                  <span>or drag and drop</span>
                </div>
                <p className="import-hint">
                  Import CSV files from Lead Generator or other sources
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {showNewLeadModal && (
        <div className="modal-backdrop" onClick={() => setShowNewLeadModal(false)}>
          <div className="modal-content new-lead-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Plus size={20} /> New Lead</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowNewLeadModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleNewLeadSubmit}>
              <div className="form-group">
                <label>Business Name *</label>
                <input
                  type="text"
                  name="business_name"
                  className="input"
                  value={newLead.business_name}
                  onChange={handleNewLeadChange}
                  placeholder="Company name"
                  required
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    className="input"
                    value={newLead.phone}
                    onChange={handleNewLeadChange}
                    placeholder="+351..."
                  />
                </div>
                <div className="form-group">
                  <label>Business Type</label>
                  <input
                    type="text"
                    name="business_type"
                    className="input"
                    value={newLead.business_type}
                    onChange={handleNewLeadChange}
                    placeholder="e.g., restaurant"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  className="input"
                  value={newLead.address}
                  onChange={handleNewLeadChange}
                  placeholder="Full address"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    name="website"
                    className="input"
                    value={newLead.website}
                    onChange={handleNewLeadChange}
                    placeholder="https://..."
                  />
                </div>
                <div className="form-group">
                  <label>Rating (1-5)</label>
                  <input
                    type="number"
                    name="rating"
                    className="input"
                    value={newLead.rating}
                    onChange={handleNewLeadChange}
                    placeholder="4.5"
                    min="1"
                    max="5"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewLeadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className={`filters-container animate-fade-in ${showFilters ? 'filters-expanded' : ''}`}>
        <div className="search-section">
          <div className="search-wrapper-v2">
            <Search size={18} className="search-icon-v2" />
            <input
              type="text"
              className="input search-input-v2"
              placeholder="Search by name, phone, address, or business type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="search-actions-v2">
              {searchQuery && (
                <button className="clear-btn-v2" onClick={() => setSearchQuery('')}>
                  <X size={16} />
                </button>
              )}
              <button
                className={`btn-filter-toggle ${showFilters ? 'active' : ''} ${hasActiveFilters ? 'has-active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
                title={showFilters ? "Hide Filters" : "Show Filters"}
              >
                <SlidersHorizontal size={18} />
                <span>Filters</span>
                {hasActiveFilters && <span className="filter-badge" />}
              </button>
            </div>
          </div>
        </div>

        <div className="collapsible-filters">
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">Stage</label>
              <select
                className={`input select filter-select ${filterStage !== 'all' ? 'active-input' : ''}`}
                value={filterStage}
                onChange={(e) => {
                  setFilterStage(e.target.value)
                  setItemsToShow(25)
                }}
              >
                <option value="all">All Stages</option>
                {STAGES.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Priority</label>
              <select
                className={`input select filter-select ${filterPriority !== 'all' ? 'active-input' : ''}`}
                value={filterPriority}
                onChange={(e) => {
                  setFilterPriority(e.target.value)
                  setItemsToShow(25)
                }}
              >
                <option value="all">All Priorities</option>
                <option value="hot">🔥 Hot</option>
                <option value="warm">⚡ Warm</option>
                <option value="cold">❄️ Cold</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Industry</label>
              <select
                className={`input select filter-select ${filterIndustry !== 'all' ? 'active-input' : ''}`}
                value={filterIndustry}
                onChange={(e) => {
                  setFilterIndustry(e.target.value)
                  setItemsToShow(25)
                }}
              >
                <option value="all">All Industries</option>
                {industries.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Date Added</label>
              <select
                className={`input select filter-select ${filterDateRange !== 'all' ? 'active-input' : ''}`}
                value={filterDateRange}
                onChange={(e) => {
                  setFilterDateRange(e.target.value)
                  setItemsToShow(25)
                }}
              >
                <option value="all">Any Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Website</label>
              <select
                className={`input select filter-select ${filterWebsite !== 'all' ? 'active-input' : ''}`}
                value={filterWebsite}
                onChange={(e) => {
                  setFilterWebsite(e.target.value)
                  setItemsToShow(25)
                }}
              >
                <option value="all">Web: All</option>
                <option value="has_website">Has Website</option>
                <option value="no_website">No Website</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Phone</label>
              <select
                className={`input select filter-select ${filterHasPhone !== 'all' ? 'active-input' : ''}`}
                value={filterHasPhone}
                onChange={(e) => {
                  setFilterHasPhone(e.target.value)
                  setItemsToShow(25)
                }}
              >
                <option value="all">Phone: All</option>
                <option value="has_phone">Has Phone</option>
                <option value="no_phone">No Phone</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Email</label>
              <select
                className={`input select filter-select ${filterHasEmail !== 'all' ? 'active-input' : ''}`}
                value={filterHasEmail}
                onChange={(e) => {
                  setFilterHasEmail(e.target.value)
                  setItemsToShow(25)
                }}
              >
                <option value="all">Email: All</option>
                <option value="has_email">Has Email</option>
                <option value="no_email">No Email</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Attention</label>
              <select
                className={`input select filter-select ${filterNeedsAttention ? 'active-input' : ''}`}
                value={filterNeedsAttention ? 'needs_attention' : 'all'}
                onChange={(e) => {
                  setFilterNeedsAttention(e.target.value === 'needs_attention')
                  setItemsToShow(25)
                }}
              >
                <option value="all">Attention: All</option>
                <option value="needs_attention">Needs Attention</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Min Rating</label>
              <select
                className={`input select filter-select ${filterMinRating > 0 ? 'active-input' : ''}`}
                value={filterMinRating}
                onChange={(e) => {
                  setFilterMinRating(parseFloat(e.target.value))
                  setItemsToShow(25)
                }}
              >
                <option value="0">All Ratings</option>
                <option value="3">3+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Min Reviews</label>
              <select
                className={`input select filter-select ${filterMinReviews > 0 ? 'active-input' : ''}`}
                value={filterMinReviews}
                onChange={(e) => {
                  setFilterMinReviews(parseInt(e.target.value))
                  setItemsToShow(25)
                }}
              >
                <option value="0">All Reviews</option>
                <option value="10">10+ Reviews</option>
                <option value="50">50+ Reviews</option>
                <option value="100">100+ Reviews</option>
              </select>
            </div>

            <div className="filter-actions-inline">
              <button
                className="btn btn-ghost btn-sm clear-all-btn"
                onClick={clearFilters}
                style={{ visibility: hasActiveFilters ? 'visible' : 'hidden' }}
              >
                <FilterX size={14} />
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Leads Table or Empty State */}
      {leads.length === 0 ? (
        <div className="empty-state-v3 animate-fade-in">
          <div className="empty-state-header">
            <div className="empty-state-icon-wrapper">
              <Sparkles size={40} className="sparkle-icon" />
            </div>
            <h3>Welcome to your lead pipeline</h3>
            <p>Start building your business by adding your first leads through one of the methods below.</p>
          </div>

          <div className="empty-state-grid">
            <Link to="/automations" className="empty-state-card primary">
              <div className="card-icon">
                <Zap size={24} />
              </div>
              <div className="card-content">
                <h4>Generate Automatically</h4>
                <p>Search Google Maps for businesses in your target area and industry.</p>
              </div>
              <div className="card-action">
                <span>Go to Automations →</span>
              </div>
            </Link>

            <button className="empty-state-card" onClick={() => setShowNewLeadModal(true)}>
              <div className="card-icon">
                <Plus size={24} />
              </div>
              <div className="card-content">
                <h4>Add Manually</h4>
                <p>Quickly add a single lead with specific contact information.</p>
              </div>
              <div className="card-action">
                <span>New Lead Form →</span>
              </div>
            </button>

            <button className="empty-state-card" onClick={() => setShowImportModal(true)}>
              <div className="card-icon">
                <Upload size={24} />
              </div>
              <div className="card-content">
                <h4>Import CSV</h4>
                <p>Bulk upload your existing lead list from a spreadsheet.</p>
              </div>
              <div className="card-action">
                <span>Upload File →</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="table-container animate-fade-in">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <div className="checkbox-wrapper" onClick={toggleSelectAll}>
                    {selectedLeads.length === leads.length && leads.length > 0 ? (
                      <CheckSquare size={18} className="checkbox-icon checked" />
                    ) : (
                      <Square size={18} className="checkbox-icon" />
                    )}
                  </div>
                </th>
                <th onClick={() => toggleSort('business_name')} className="sortable" style={{ width: '25%' }}>
                  Business <SortIcon field="business_name" />
                </th>
                <th onClick={() => toggleSort('priority')} className="sortable">
                  Priority <SortIcon field="priority" />
                </th>
                <th>Contact</th>
                <th onClick={() => toggleSort('rating')} className="sortable">
                  Rating <SortIcon field="rating" />
                </th>
                <th style={{ width: '50px', textAlign: 'center' }}>Web</th>
                <th>Stage</th>
                <th onClick={() => toggleSort('created_at')} className="sortable">
                  Added <SortIcon field="created_at" />
                </th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map(lead => {
                const stage = STAGES.find(s => s.id === lead.stage)
                const priority = PRIORITIES.find(p => p.id === lead.priority)
                const isSelected = selectedLeads.includes(lead.id)
                return (
                  <tr key={lead.id} className={isSelected ? 'row-selected' : ''}>
                    <td>
                      <div className="checkbox-wrapper" onClick={() => toggleSelectLead(lead.id)}>
                        {isSelected ? (
                          <CheckSquare size={18} className="checkbox-icon checked" />
                        ) : (
                          <Square size={18} className="checkbox-icon" />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <Link to={`/leads/${lead.id}`} className="lead-link">
                          {lead.business_name}
                        </Link>
                        <div className="lead-meta">
                          <span className="cell-subtitle">{lead.business_type}</span>
                          {lead.address && (
                            <span className="location-hint">
                              • {lead.address.split(',').slice(-3, -2)[0]?.trim() || lead.address.split(',').slice(0, 1)[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {priority ? (
                        <span className="priority-pill" style={{ '--p-color': priority.color }}>
                          {priority.label}
                        </span>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                    <td>
                      <div className="cell-stack">
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`} className="contact-link" title={lead.phone}>
                            <Phone size={12} />
                            {lead.phone}
                          </a>
                        ) : (
                          <span className="no-data">No phone</span>
                        )}
                        {lead.email ? (
                          <a href={`mailto:${lead.email}`} className="contact-link" title={lead.email}>
                            <Mail size={12} />
                            <span className="truncate-email">{lead.email}</span>
                          </a>
                        ) : (
                          <span className="no-data">No email</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {lead.rating > 0 ? (
                        <div className="rating-display">
                          <Star size={13} fill="#f59e0b" stroke="#f59e0b" />
                          <span>{lead.rating}</span>
                          {lead.review_count > 0 && (
                            <span className="rating-count">({lead.review_count})</span>
                          )}
                        </div>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {lead.website ? (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="web-icon-link"
                            title={lead.website}
                          >
                            <Globe size={16} />
                          </a>
                        ) : (
                          <div className="no-data-icon"><Globe size={16} style={{ opacity: 0.2 }} /></div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{ background: `${stage?.color}15`, color: stage?.color }}
                      >
                        <div className="status-dot" style={{ background: stage?.color }} />
                        {stage?.label}
                      </span>
                    </td>
                    <td>
                      <span className="date-text">
                        {format(new Date(lead.created_at), 'MMM d, yyyy')}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <Link to={`/leads/${lead.id}`} className="btn btn-ghost btn-sm btn-view">
                          View
                        </Link>
                        {lead.google_maps_url && (
                          <a
                            href={lead.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Open in Maps"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {leads.length > itemsToShow && (
            <div className="load-more-section">
              <button className="btn btn-secondary load-more-btn" onClick={loadMore}>
                <ChevronDown size={18} />
                Load More ({leads.length - itemsToShow} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions Bar */}
      <div className={`bulk-actions-bar ${selectedLeads.length > 0 ? 'visible' : ''}`}>
        <div className="bulk-info">
          <span className="selection-count">{selectedLeads.length}</span>
          <span className="selection-label">leads selected</span>
        </div>
        <div className="bulk-buttons">
          <button className="btn btn-ghost" onClick={() => setSelectedLeads([])}>
            Cancel
          </button>
          <button
            className={`btn ${fixSuccess ? 'btn-success' : 'btn-secondary'}`}
            onClick={handleSmartDetect}
            disabled={isFixingTypes || fixSuccess}
          >
            {isFixingTypes ? (
              <>
                <Zap size={16} className="spin" />
                Fixing...
              </>
            ) : fixSuccess ? (
              <>
                <CheckCircle2 size={16} />
                Types Updated!
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Smart Detect Types
              </>
            )}
          </button>
          <button className="btn btn-danger" onClick={handleBulkDelete}>
            <Trash2 size={16} />
            Delete Selected
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-modal animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="delete-icon-wrapper">
                <Trash2 size={24} />
              </div>
              <h3>Delete Leads?</h3>
              <button className="btn-close" onClick={() => setShowDeleteModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{selectedLeads.length}</strong> leads? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmBulkDelete}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back to Top Widget */}
      <button
        className={`back-to-top ${showScrollTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        title="Scroll to Top"
      >
        <ArrowUp size={24} />
      </button>

      <style>{`
        .leads-page {
          max-width: 100%;
        }
        
        .header-actions {
          display: flex;
          gap: var(--gap-md);
        }
        
        .filters-container {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px 20px;
          margin-bottom: var(--gap-xl);
          display: flex;
          flex-direction: column;
          gap: 0;
          box-shadow: var(--shadow-sm);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .filters-expanded {
          gap: 20px;
          padding-bottom: 24px;
        }
        
        .search-section {
          width: 100%;
        }

        .search-wrapper-v2 {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          width: 100%;
        }
        
        .search-icon-v2 {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
          z-index: 1;
        }
        
        .search-input-v2 {
          padding-left: 48px;
          padding-right: 120px;
          height: 48px;
          font-size: var(--text-base);
          background: var(--bg-primary);
          border-color: var(--border);
          transition: all var(--transition);
          flex: 1;
        }

        .search-input-v2:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-subtle), 0 0 20px -5px var(--accent);
          background: var(--bg-secondary);
        }
        
        .search-input-v2:focus + .search-actions-v2 .search-icon-v2,
        .search-wrapper-v2:focus-within .search-icon-v2 {
          color: var(--accent);
        }

        .search-actions-v2 {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 2;
        }
        
        .clear-btn-v2 {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-tertiary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .clear-btn-v2:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .btn-filter-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 36px;
          padding: 0 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: var(--text-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition);
        }

        .btn-filter-toggle:hover {
          background: var(--bg-hover);
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .btn-filter-toggle.active {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }

        .collapsible-filters {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .filters-expanded .collapsible-filters {
          grid-template-rows: 1fr;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          align-items: flex-end;
          width: 100%;
          min-height: 0;
          overflow: hidden;
          padding-top: 4px;
          padding-bottom: 4px;
        }

        .filter-actions-inline {
          display: flex;
          align-items: center;
          height: 40px;
        }

        @media (max-width: 1200px) {
          .filters-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .search-input-v2 {
            padding-right: 48px;
          }
          .search-actions-v2 {
            position: static;
            transform: none;
          }
          .btn-filter-toggle span {
            display: none;
          }
          .btn-filter-toggle {
            padding: 0 10px;
          }
        }

        @media (max-width: 640px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
          .filter-actions {
            grid-column: span 1;
            justify-content: center;
          }
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          padding-left: 4px;
        }

        .filter-select {
          height: 40px;
          background: var(--bg-primary);
          border-color: var(--border);
          font-size: var(--text-sm);
          cursor: pointer;
          color-scheme: dark light;
        }
        
        .filter-select option {
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .filter-select:hover {
          border-color: var(--border-hover);
        }

        .filter-actions {
          display: flex;
          align-items: center;
          height: 40px;
        }

        .clear-all-btn {
          color: var(--text-muted);
          font-weight: 500;
        }

        .clear-all-btn:hover {
          color: var(--danger);
          background: var(--danger-subtle);
        }
        
        .sortable {
          cursor: pointer;
          user-select: none;
        }
        
        .sortable:hover {
          color: var(--text-secondary);
        }
        
        .sort-indicator {
          margin-left: 4px;
          color: var(--accent);
        }
        
        .cell-stack {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .lead-link {
          font-weight: 500;
          color: var(--text-primary);
        }
        
        .lead-link:hover {
          color: var(--accent);
        }
        
        .cell-subtitle {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: capitalize;
        }
        
        .contact-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        
        .contact-link:hover {
          color: var(--accent);
        }
        
        .truncate-email {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lead-meta {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .location-hint {
          font-size: 10px;
          color: var(--text-muted);
          background: var(--bg-tertiary);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .priority-pill {
          display: inline-flex;
          align-items: center;
          padding: 2px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          background: color-mix(in srgb, var(--p-color), transparent 85%);
          color: var(--p-color);
          border: 1px solid color-mix(in srgb, var(--p-color), transparent 70%);
          transition: all var(--transition);
        }
        
        .priority-pill:hover {
          box-shadow: 0 0 12px -3px var(--p-color);
          transform: translateY(-1px);
        }

        .web-icon-link {
          color: var(--accent);
          background: var(--accent-subtle);
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
        }

        .web-icon-link:hover {
          background: var(--accent);
          color: white;
          transform: scale(1.1);
          box-shadow: 0 0 15px -3px var(--accent);
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-right: 6px;
          box-shadow: 0 0 6px -1px currentColor;
        }

        .btn-view {
          background: var(--bg-tertiary);
          font-weight: 600;
        }

        .btn-view:hover {
          background: var(--accent);
          color: white;
          box-shadow: 0 0 15px -5px var(--accent);
          transform: translateY(-1px);
        }
        
        .no-data {
          color: var(--text-muted);
          font-size: var(--text-sm);
        }
        
        .rating-display {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: var(--text-sm);
        }
        
        .rating-count {
          color: var(--text-muted);
          font-size: var(--text-xs);
        }
        
        .date-text {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        
        .actions-cell {
          display: flex;
          justify-content: center;
          gap: 4px;
        }
        
        .empty-actions {
          display: flex;
          gap: var(--gap-md);
          margin-top: 16px;
        }

        /* Empty State V3 */
        .empty-state-v3 {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 60px 20px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          border-style: dashed;
          margin-top: 20px;
        }

        .empty-state-header {
          text-align: center;
          max-width: 500px;
          margin-bottom: 48px;
        }

        .empty-state-icon-wrapper {
          width: 80px;
          height: 80px;
          background: var(--accent-subtle);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .sparkle-icon {
          color: var(--accent);
        }

        .empty-state-header h3 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
          color: var(--text-primary);
        }

        .empty-state-header p {
          color: var(--text-secondary);
          font-size: 16px;
          line-height: 1.5;
        }

        .empty-state-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          width: 100%;
          max-width: 900px;
        }

        .empty-state-card {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          text-align: left;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .empty-state-card:hover {
          border-color: var(--accent);
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }

        .empty-state-card.primary {
          border-color: var(--accent);
          background: linear-gradient(145deg, var(--bg-primary), var(--accent-subtle));
        }

        .card-icon {
          width: 48px;
          height: 48px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
        }

        .primary .card-icon {
          background: var(--accent);
          color: white;
        }

        .card-content h4 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .card-content p {
          margin: 0;
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .card-action {
          margin-top: auto;
          font-size: 13px;
          font-weight: 600;
          color: var(--accent);
        }

        @media (max-width: 850px) {
          .empty-state-grid {
            grid-template-columns: 1fr;
            max-width: 400px;
          }
        }
        
        /* Modal styles */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 500px;
          box-shadow: var(--shadow-2xl);
          position: relative;
        }

        .delete-modal {
          max-width: 400px;
        }

        .modal-header {
          padding: 24px 24px 16px;
          display: flex;
          align-items: center; /* Changed from flex-start to center for better consistency */
          justify-content: space-between;
          position: relative;
        }

        .modal-header h2, .modal-header h3 {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }

        .delete-modal .modal-header {
          align-items: flex-start;
          flex-direction: column;
        }

        .delete-icon-wrapper {
          width: 48px;
          height: 48px;
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 24px;
          color: var(--text-muted);
          cursor: pointer;
          position: absolute;
          top: 20px;
          right: 20px;
        }

        .modal-body {
          padding: 0 24px 24px;
        }

        .modal-body p {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .modal-footer {
          padding: 16px 24px 24px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .animate-pop-in {
          animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes pop-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border);
        }
        
        .modal-header h2 {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: var(--text-lg);
          margin: 0;
        }
        
        .import-content,
        .import-success {
          padding: 20px;
        }
        
        .import-success {
          text-align: center;
        }
        
        .import-success svg {
          color: var(--success);
          margin-bottom: 12px;
        }
        
        .import-success h3 {
          margin-bottom: 8px;
        }
        
        .import-success .skipped {
          color: var(--text-tertiary);
          font-size: var(--text-sm);
        }
        
        .import-success .btn {
          margin-top: 20px;
        }
        
        .import-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--danger-subtle);
          color: var(--danger);
          border-radius: var(--radius);
          font-size: var(--text-sm);
          margin-bottom: 16px;
        }
        
        .drop-zone {
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all var(--transition);
        }
        
        .drop-zone:hover {
          border-color: var(--accent);
          background: var(--accent-subtle);
        }
        
        .drop-zone svg {
          margin-bottom: 12px;
          color: var(--text-muted);
        }
        
        .drop-zone:hover svg {
          color: var(--accent);
        }
        
        .drop-zone p {
          margin-bottom: 4px;
          font-weight: 500;
        }
        
        .drop-zone span {
          font-size: var(--text-sm);
          color: var(--text-muted);
        }
        
        .import-hint {
          margin-top: 16px;
          font-size: var(--text-sm);
          color: var(--text-tertiary);
          text-align: center;
        }
        
        .new-lead-modal form {
          padding: 20px;
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
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--gap-lg);
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--gap-md);
          padding-top: var(--gap-lg);
          border-top: 1px solid var(--border);
        }

        /* Bulk Selection Styles */
        .checkbox-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .checkbox-wrapper:hover {
          background: var(--bg-tertiary);
        }

        .checkbox-icon {
          color: var(--text-muted);
          transition: all var(--transition-fast);
        }

        .checkbox-icon.checked {
          color: var(--accent);
        }

        .row-selected {
          background-color: var(--accent-subtle) !important;
        }

        .row-selected:hover {
          background-color: var(--accent-subtle) !important;
        }

        .bulk-actions-bar {
          position: fixed;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          padding: 8px 12px 8px 24px;
          display: flex;
          align-items: center;
          gap: 32px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
          z-index: 50;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          opacity: 0;
          visibility: hidden;
        }

        .bulk-actions-bar.visible {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
          visibility: visible;
        }

        .bulk-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .selection-count {
          background: var(--accent);
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }

        .selection-label {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
        }

        .bulk-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-danger:hover {
          background: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }

        /* Back to Top Widget */
        .back-to-top {
          position: fixed;
          bottom: 32px;
          right: 32px;
          width: 48px;
          height: 48px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          opacity: 0;
          visibility: hidden;
          transform: translateY(20px);
          z-index: 100;
        }

        .back-to-top.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .back-to-top:hover {
          background: #4f46e5;
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4);
        }

        /* Pagination / Load More */
        .load-more-section {
          display: flex;
          justify-content: center;
          padding: 32px 0 48px;
        }

        .load-more-btn {
          min-width: 240px;
          height: 44px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
        }

        .load-more-btn:hover {
          background: var(--bg-hover);
          border-color: var(--accent);
          color: var(--accent);
          transform: translateY(-2px);
        }

        /* Active Filter Indicators */
        .active-input {
          border-color: var(--accent) !important;
          background: var(--bg-tertiary) !important;
          color: var(--accent);
          font-weight: 600;
          box-shadow: 0 0 0 2px var(--accent-subtle);
        }

        .btn-filter-toggle.has-active {
          border-color: var(--accent);
          color: var(--accent);
        }

        .btn-filter-toggle.active {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }

        .filter-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 10px;
          height: 10px;
          background: #ef4444;
          border: 2px solid var(--bg-secondary);
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
        }
      `}</style>
    </div>
  )
}

export default Leads
