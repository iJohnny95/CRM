import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GripVertical, Phone, Star, Building2 } from 'lucide-react'
import useStore, { STAGES } from '../store/useStore'

function Pipeline() {
  const leads = useStore(state => state.leads)
  const updateLeadStage = useStore(state => state.updateLeadStage)

  const [draggedLead, setDraggedLead] = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedLead(null)
    setDragOverStage(null)
  }

  const handleDragOver = (e, stageId) => {
    e.preventDefault()
    setDragOverStage(stageId)
  }

  const handleDrop = (e, stageId) => {
    e.preventDefault()
    if (draggedLead && draggedLead.stage !== stageId) {
      updateLeadStage(draggedLead.id, stageId)
    }
    setDraggedLead(null)
    setDragOverStage(null)
  }

  const getLeadsByStage = (stageId) => leads.filter(l => l.stage === stageId)

  return (
    <div className="page pipeline-page">
      <header className="page-header">
        <div>
          <h1>Pipeline</h1>
          <p>Drag leads between stages to update their status</p>
        </div>
      </header>

      <div className="pipeline-board">
        {STAGES.map(stage => {
          const stageLeads = getLeadsByStage(stage.id)
          return (
            <div
              key={stage.id}
              className={`pipeline-column ${dragOverStage === stage.id ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => handleDrop(e, stage.id)}
              style={{ '--stage-color': stage.color }}
            >
              <div className="column-header">
                <div className="column-title">
                  <span className="column-dot" style={{ background: stage.color }} />
                  <h3>{stage.label}</h3>
                </div>
                <span className="column-count">{stageLeads.length}</span>
              </div>

              <div className="column-body">
                {stageLeads.length === 0 ? (
                  <div className="column-empty">
                    <span>No leads</span>
                  </div>
                ) : (
                  stageLeads.map(lead => (
                    <div
                      key={lead.id}
                      className={`pipeline-card ${draggedLead?.id === lead.id ? 'dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="card-grip">
                        <GripVertical size={14} />
                      </div>
                      <div className="card-body">
                        <Link to={`/leads/${lead.id}`} className="card-name">
                          {lead.business_name}
                        </Link>
                        <span className="card-type">{lead.business_type}</span>

                        <div className="card-meta">
                          {lead.phone && (
                            <span className="meta-tag">
                              <Phone size={10} />
                              {lead.phone.substring(0, 14)}
                            </span>
                          )}
                          {lead.rating > 0 && (
                            <span className="meta-tag">
                              <Star size={10} fill="#f59e0b" stroke="#f59e0b" />
                              {lead.rating}
                            </span>
                          )}
                        </div>

                        {lead.notes?.length > 0 && (
                          <span className="notes-tag">
                            {lead.notes.length} note{lead.notes.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        .pipeline-page {
          height: calc(100vh - 48px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .pipeline-page .page-header {
          flex-shrink: 0;
        }
        
        .pipeline-board {
          display: flex;
          gap: 12px;
          flex: 1;
          overflow-x: auto;
          padding-bottom: 16px;
        }
        
        .pipeline-column {
          flex: 0 0 260px;
          min-width: 260px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          max-height: 100%;
          transition: all var(--transition-fast);
        }
        
        .pipeline-column.drag-over {
          border-color: var(--stage-color);
          background: color-mix(in srgb, var(--stage-color) 5%, var(--bg-secondary));
          box-shadow: 0 0 30px -10px var(--stage-color);
        }
        
        .column-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        
        .column-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .column-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 8px -2px var(--stage-color);
          transition: box-shadow var(--transition), transform var(--transition);
        }
        
        .column-header:hover .column-dot {
          box-shadow: 0 0 12px 0px var(--stage-color);
          transform: scale(1.2);
        }
        
        .column-header h3 {
          font-size: var(--text-sm);
          font-weight: 600;
        }
        
        .column-count {
          min-width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border-radius: 9999px;
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-secondary);
        }
        
        .column-body {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .column-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: var(--text-sm);
        }
        
        .pipeline-card {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px;
          cursor: grab;
          display: flex;
          gap: 8px;
          transition: all var(--transition);
        }
        
        .pipeline-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md), 0 0 20px -10px var(--accent);
        }
        
        .pipeline-card.dragging {
          opacity: 0.4;
          cursor: grabbing;
        }
        
        .card-grip {
          color: var(--text-muted);
          flex-shrink: 0;
          padding-top: 2px;
          transition: color var(--transition);
        }
        
        .pipeline-card:hover .card-grip {
          color: var(--accent);
        }
        
        .card-body {
          flex: 1;
          min-width: 0;
        }
        
        .card-name {
          display: block;
          font-weight: 500;
          font-size: var(--text-sm);
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }
        
        .card-name:hover {
          color: var(--accent);
        }
        
        .card-type {
          display: block;
          font-size: var(--text-xs);
          color: var(--text-muted);
          text-transform: capitalize;
        }
        
        .card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        
        .meta-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: var(--text-tertiary);
        }
        
        .notes-tag {
          display: inline-block;
          margin-top: 8px;
          font-size: 10px;
          color: var(--accent);
          background: var(--accent-subtle);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          transition: all var(--transition);
        }
        
        .notes-tag:hover {
          box-shadow: 0 0 10px -3px var(--accent);
        }
      `}</style>
    </div>
  )
}

export default Pipeline
