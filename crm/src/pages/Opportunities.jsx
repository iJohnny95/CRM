import { Link } from 'react-router-dom'
import {
  Search,
  ExternalLink,
  Phone,
  Star,
  FileText,
  Calendar
} from 'lucide-react'
import useStore, { STAGES } from '../store/useStore'
import { format } from 'date-fns'

function Opportunities() {
  const leads = useStore(state => state.leads)
  const opportunities = leads.filter(l => l.stage === 'proposal')

  return (
    <div className="page opportunities-page">
      <header className="page-header">
        <div>
          <h1>Opportunities</h1>
          <p>{opportunities.length} proposals sent — awaiting response</p>
        </div>
      </header>

      {opportunities.length === 0 ? (
        <div className="page-content-centered animate-fade-in">
          <div className="empty-state">
            <FileText />
            <h3>No opportunities yet</h3>
            <p>Move leads to "Proposal" stage to see them here</p>
            <Link to="/pipeline" className="btn btn-primary">
              View Pipeline
            </Link>
          </div>
        </div>
      ) : (
        <div className="opportunities-grid animate-fade-in">
          {opportunities.map(lead => (
            <Link to={`/leads/${lead.id}`} key={lead.id} className="opportunity-card">
              <div className="opp-header">
                <h3>{lead.business_name}</h3>
                <span className="opp-type">{lead.business_type}</span>
              </div>

              <div className="opp-details">
                {lead.phone && (
                  <div className="opp-row">
                    <Phone size={14} />
                    <span>{lead.phone}</span>
                  </div>
                )}
                {lead.rating > 0 && (
                  <div className="opp-row">
                    <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
                    <span>{lead.rating} ({lead.review_count})</span>
                  </div>
                )}
              </div>

              <div className="opp-footer">
                <span className="opp-date">
                  <Calendar size={12} />
                  Updated {format(new Date(lead.updated_at), 'MMM d')}
                </span>
                {lead.notes.length > 0 && (
                  <span className="opp-notes">{lead.notes.length} notes</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .opportunities-page {
          max-width: 100%;
        }
        
        .opportunities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--gap-lg);
        }
        
        .opportunity-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          transition: all var(--transition);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .opportunity-card:hover {
          border-color: var(--accent);
          transform: translateY(-3px);
          box-shadow: var(--shadow-md), 0 0 25px -8px var(--accent);
        }
        
        .opp-header h3 {
          font-size: var(--text-base);
          margin-bottom: 4px;
          color: var(--text-primary);
        }
        
        .opp-type {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: capitalize;
        }
        
        .opp-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .opp-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        
        .opp-row svg {
          color: var(--text-muted);
          flex-shrink: 0;
        }
        
        .opp-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid var(--border);
          margin-top: auto;
        }
        
        .opp-date {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        
        .opp-notes {
          font-size: var(--text-xs);
          color: var(--accent);
          background: var(--accent-subtle);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          transition: all var(--transition);
        }
        
        .opp-notes:hover {
          box-shadow: 0 0 10px -3px var(--accent);
        }
      `}</style>
    </div>
  )
}

export default Opportunities
