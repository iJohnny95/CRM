import { Link } from 'react-router-dom'
import {
  Phone,
  Star,
  CheckCircle2,
  Calendar,
  MessageSquare,
  ExternalLink,
  Trophy
} from 'lucide-react'
import useStore from '../store/useStore'
import { format } from 'date-fns'

function Clients() {
  const leads = useStore(state => state.leads)
  const clients = leads.filter(l => l.stage === 'won')

  return (
    <div className="page clients-page">
      <header className="page-header">
        <div>
          <h1>Clients</h1>
          <p>{clients.length} closed won — your customers</p>
        </div>
      </header>

      {clients.length === 0 ? (
        <div className="page-content-centered animate-fade-in">
          <div className="empty-state">
            <Trophy />
            <h3>No clients yet</h3>
            <p>Close deals to see your customers here</p>
            <Link to="/pipeline" className="btn btn-primary">
              View Pipeline
            </Link>
          </div>
        </div>
      ) : (
        <div className="clients-grid animate-fade-in">
          {clients.map(lead => (
            <div key={lead.id} className="client-card">
              <div className="client-header">
                <div className="client-badge">
                  <CheckCircle2 size={16} />
                </div>
                <div className="client-info">
                  <Link to={`/leads/${lead.id}`} className="client-name">
                    {lead.business_name}
                  </Link>
                  <span className="client-type">{lead.business_type}</span>
                </div>
              </div>

              <div className="client-details">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="client-contact">
                    <Phone size={14} />
                    <span>{lead.phone}</span>
                  </a>
                )}
                {lead.rating > 0 && (
                  <div className="client-rating">
                    <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
                    <span>{lead.rating}</span>
                  </div>
                )}
              </div>

              <div className="client-footer">
                <span className="client-date">
                  <Calendar size={12} />
                  Won {format(new Date(lead.updated_at), 'MMM d, yyyy')}
                </span>
                <div className="client-actions">
                  {lead.notes.length > 0 && (
                    <span className="client-notes">
                      <MessageSquare size={12} />
                      {lead.notes.length}
                    </span>
                  )}
                  <Link to={`/leads/${lead.id}`} className="btn btn-ghost btn-sm">
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .clients-page {
          max-width: 100%;
        }
        
        .clients-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: var(--gap-lg);
        }
        
        @media (max-width: 480px) {
          .clients-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .client-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all var(--transition);
        }
        
        .client-card:hover {
          border-color: var(--success);
          box-shadow: 0 0 25px -8px var(--success);
          transform: translateY(-2px);
        }
        
        .client-card:hover .client-badge {
          box-shadow: 0 0 15px -3px var(--success);
          transform: scale(1.05);
        }
        
        .client-header {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        
        .client-badge {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--success-subtle);
          color: var(--success);
          border-radius: var(--radius);
          flex-shrink: 0;
          transition: all var(--transition);
        }
        
        .client-info {
          flex: 1;
          min-width: 0;
        }
        
        .client-name {
          display: block;
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        
        .client-name:hover {
          color: var(--accent);
        }
        
        .client-type {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: capitalize;
        }
        
        .client-details {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .client-contact {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        
        .client-contact:hover {
          color: var(--accent);
        }
        
        .client-contact svg {
          color: var(--text-muted);
        }
        
        .client-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        
        .client-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid var(--border);
          margin-top: auto;
        }
        
        .client-date {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        
        .client-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .client-notes {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  )
}

export default Clients
