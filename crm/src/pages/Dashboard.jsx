import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Users,
  Target,
  Euro,
  ArrowRight,
  Upload,
  Building2,
  Flame,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Globe,
  Clock,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  AlertCircle,
  Star,
  Info
} from 'lucide-react'
import useStore, { STAGES } from '../store/useStore'
import { formatDistanceToNow } from 'date-fns'

function StatCard({ icon: Icon, label, value, color, subtext, trend, trendUp, description, progress }) {
  return (
    <div className="stat-card">
      {description && (
        <div className="stat-tooltip-container top-right">
          <Info size={14} className="stat-info-icon" />
          <div className="stat-tooltip">{description}</div>
        </div>
      )}
      <div className="stat-icon" style={{ background: `${color}15`, color }}>
        <Icon size={22} />
      </div>
      <div className="stat-content">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
        {subtext && (
          <span className={`stat-subtext ${trend ? (trendUp ? 'up' : 'down') : ''}`}>
            {trend && (trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />)}
            {subtext}
          </span>
        )}
      </div>
      {progress !== undefined && (
        <div className="stat-progress-wrapper">
          <div className="stat-progress-bar">
            <div
              className="stat-progress-fill"
              style={{ width: `${Math.min(100, progress)}%`, background: color }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function QuickStat({ icon: Icon, value, label, className, description }) {
  return (
    <div className="quick-stat">
      <Icon size={16} className={className} />
      <span className="qs-value">{value}</span>
      <span className="qs-label">
        {label}
        {description && (
          <div className="stat-tooltip-container mini">
            <Info size={12} className="stat-info-icon" />
            <div className="stat-tooltip">{description}</div>
          </div>
        )}
      </span>
    </div>
  )
}

function Dashboard() {
  const stats = useStore(state => state.getStats())

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000) {
      return `€${(value / 1000).toFixed(1)}k`
    }
    return `€${value}`
  }

  return (
    <div className="page dashboard">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Sales overview and key metrics</p>
        </div>
        <div className="page-header-actions">
          <Link to="/automations" className="btn btn-primary">
            <Upload size={16} />
            Generate Leads
          </Link>
        </div>
      </header>

      {/* Stats Grid - Sales KPIs */}
      <section className="stats-section animate-fade-in">
        <div className="stats-grid">
          <StatCard
            icon={Euro}
            label="Pipeline Value"
            value={formatCurrency(stats.pipelineValue)}
            color="#6366f1"
            subtext={`€${stats.totalPotential.toLocaleString()} total`}
            description="Total value of all active deals weighted by their stage probability (e.g., 10% for new leads)."
            progress={(stats.pipelineValue / (stats.totalPotential || 1)) * 100}
          />
          <StatCard
            icon={Target}
            label="Active Leads"
            value={stats.activeDeals}
            color="#3b82f6"
            subtext={`${stats.inPipeline} in pipeline`}
            description="Leads currently in the pipeline (excluding those won or lost)."
            progress={(stats.inPipeline / (stats.activeDeals || 1)) * 100}
          />
          <StatCard
            icon={Percent}
            label="Conversion Rate"
            value={`${stats.conversionRate}%`}
            color={stats.conversionRate >= 50 ? '#22c55e' : stats.conversionRate >= 25 ? '#f59e0b' : '#ef4444'}
            subtext="Proposal to Close"
            description="Percentage of proposals successfully converted to won deals."
            progress={stats.conversionRate}
          />
          <StatCard
            icon={Flame}
            label="Hot Leads"
            value={stats.hotLeads}
            color="#ef4444"
            subtext={`${stats.noWebsiteLeads} need website`}
            description="High-priority leads that require immediate attention based on their hot status."
            progress={(stats.hotLeads / (stats.activeDeals || 1)) * 100}
          />
        </div>
      </section>

      {/* Quick Stats Row */}
      <section className="quick-stats animate-fade-in">
        <QuickStat
          icon={CheckCircle}
          value={`€${stats.revenueWon.toLocaleString()}`}
          label="Revenue Won"
          className="icon-success"
          description="Total value of all deals successfully closed as Won."
        />
        <QuickStat
          icon={XCircle}
          value={`€${stats.revenueLost.toLocaleString()}`}
          label="Revenue Lost"
          className="icon-danger"
          description="Total value of all deals marked as Lost (Closed Lost)."
        />
        <QuickStat
          icon={Users}
          value={stats.total}
          label="Total Leads"
          className="icon-info"
          description="The cumulative count of all leads ever entered or imported into the system."
        />
        <QuickStat
          icon={TrendingUp}
          value={stats.leadsThisMonth}
          label="This Month"
          className="icon-primary"
          description="Number of new leads generated or added during the current calendar month."
        />
      </section>

      {/* Main Content Grid - Row 1 */}
      <div className="dashboard-grid">
        {/* Pipeline Overview */}
        <section className="card pipeline-section animate-fade-in">
          <div className="card-header">
            <h3 className="card-title">Pipeline Overview</h3>
            <Link to="/pipeline" className="btn btn-ghost btn-sm">
              View Pipeline <ArrowRight size={14} />
            </Link>
          </div>
          <div className="pipeline-stages">
            {STAGES.map(stage => {
              const count = stats.byStage?.[stage.id] || 0
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
              return (
                <div key={stage.id} className="pipeline-row">
                  <div className="pipeline-info">
                    <span className="stage-dot" style={{ background: stage.color }} />
                    <span className="stage-name">{stage.label}</span>
                  </div>
                  <div className="pipeline-bar-container">
                    <div
                      className="pipeline-bar"
                      style={{ width: `${percentage}%`, background: stage.color }}
                    />
                  </div>
                  <span className="stage-count" style={{ color: stage.color }}>{count}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Recent Leads */}
        <section className="card recent-section animate-fade-in">
          <div className="card-header">
            <h3 className="card-title">Recent Leads</h3>
            <Link to="/leads" className="btn btn-ghost btn-sm">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {stats.recentLeads.length === 0 ? (
            <div className="empty-state-small recent-empty">
              <Building2 size={32} />
              <h3>No leads yet</h3>
              <p>New leads will appear here after generation.</p>
              <Link to="/automations" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>
                <Upload size={14} />
                Generate Leads
              </Link>
            </div>
          ) : (
            <div className="leads-list scrollable">
              {stats.recentLeads.map(lead => {
                const stage = STAGES.find(s => s.id === lead.stage)
                return (
                  <Link to={`/leads/${lead.id}`} key={lead.id} className="lead-row">
                    <div className="lead-info">
                      <span className="lead-name">{lead.business_name}</span>
                      <span className="lead-type">
                        {lead.deal_value ? `€${lead.deal_value}` : lead.business_type}
                      </span>
                    </div>
                    <span
                      className="badge"
                      style={{ background: `${stage?.color}15`, color: stage?.color }}
                    >
                      {stage?.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Second Row - New Widgets */}
      <div className="dashboard-grid second-row">
        {/* Website Opportunities */}
        <section className="card opportunities-section animate-fade-in">
          <div className="card-header">
            <h3 className="card-title">
              <Globe size={16} className="title-icon" />
              Website Opportunities
            </h3>
            <Link to="/leads" state={{ filterWebsite: 'no_website' }} className="header-badge clickable" title="Ver todos">
              {stats.noWebsiteLeads}
            </Link>
          </div>

          {stats.websiteOpportunities?.length === 0 ? (
            <div className="empty-state-small">
              <Globe size={32} />
              <p>All leads have websites</p>
            </div>
          ) : (
            <div className="opportunity-list scrollable">
              {stats.websiteOpportunities?.map(lead => (
                <Link to={`/leads/${lead.id}`} key={lead.id} className="opportunity-row">
                  <div className="opp-info">
                    <span className="opp-name">{lead.business_name}</span>
                    <span className="opp-meta">
                      {lead.rating > 0 && (
                        <span className="opp-rating">
                          <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
                          {lead.rating}
                        </span>
                      )}
                      {lead.phone && <span className="opp-phone">Has phone</span>}
                    </span>
                  </div>
                  <ArrowRight size={14} className="opp-arrow" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Needs Attention */}
        <section className="card attention-section animate-fade-in">
          <div className="card-header">
            <h3 className="card-title">
              <AlertCircle size={16} className="title-icon warning" />
              Needs Attention
            </h3>
            <Link to="/leads" state={{ filterNeedsAttention: true }} className="header-badge warning clickable" title="Ver todos">
              {stats.needsAttention?.length || 0}
            </Link>
          </div>

          {stats.needsAttention?.length === 0 ? (
            <div className="empty-state-small">
              <CheckCircle size={32} className="success" />
              <p>All leads are up to date!</p>
            </div>
          ) : (
            <div className="attention-list">
              {stats.needsAttention?.map(lead => {
                const lastDate = lead.last_contact_date || lead.created_at
                return (
                  <Link to={`/leads/${lead.id}`} key={lead.id} className="attention-row">
                    <div className="att-info">
                      <span className="att-name">{lead.business_name}</span>
                      <span className="att-time">
                        <Clock size={12} />
                        {formatDistanceToNow(new Date(lastDate), { addSuffix: true })}
                      </span>
                    </div>
                    <span className="att-stage">
                      {STAGES.find(s => s.id === lead.stage)?.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Activity Summary */}
        <section className="card activity-section animate-fade-in">
          <div className="card-header">
            <h3 className="card-title">This Week's Activity</h3>
            <Link to="/activity" className="header-badge primary clickable" title="Ver tudo">
              {stats.activitySummary?.total || 0}
            </Link>
          </div>

          <div className="activity-grid">
            <Link to="/activity" state={{ filter: 'call' }} className="activity-stat">
              <div className="act-icon" style={{ background: '#22c55e20', color: '#22c55e' }}>
                <Phone size={18} />
              </div>
              <span className="act-value">{stats.activitySummary?.calls || 0}</span>
              <span className="act-label">Calls</span>
            </Link>
            <Link to="/activity" state={{ filter: 'email' }} className="activity-stat">
              <div className="act-icon" style={{ background: '#3b82f620', color: '#3b82f6' }}>
                <Mail size={18} />
              </div>
              <span className="act-value">{stats.activitySummary?.emails || 0}</span>
              <span className="act-label">Emails</span>
            </Link>
            <Link to="/activity" state={{ filter: 'meeting' }} className="activity-stat">
              <div className="act-icon" style={{ background: '#a855f720', color: '#a855f7' }}>
                <Calendar size={18} />
              </div>
              <span className="act-value">{stats.activitySummary?.meetings || 0}</span>
              <span className="act-label">Meetings</span>
            </Link>
            <Link to="/activity" state={{ filter: 'note' }} className="activity-stat">
              <div className="act-icon" style={{ background: '#6366f120', color: '#6366f1' }}>
                <MessageSquare size={18} />
              </div>
              <span className="act-value">{stats.activitySummary?.notes || 0}</span>
              <span className="act-label">Notes</span>
            </Link>
            <Link to="/activity" state={{ filter: 'stage_change' }} className="activity-stat">
              <div className="act-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                <ArrowRight size={18} />
              </div>
              <span className="act-value">{stats.activitySummary?.stageChanges || 0}</span>
              <span className="act-label">Stage Changes</span>
            </Link>
            <Link to="/activity" state={{ filter: 'file' }} className="activity-stat">
              <div className="act-icon" style={{ background: '#ec489920', color: '#ec4899' }}>
                <Upload size={18} />
              </div>
              <span className="act-value">{stats.activitySummary?.files || 0}</span>
              <span className="act-label">Files</span>
            </Link>
          </div>
        </section>
      </div>

      <style>{`
        .dashboard {
          max-width: 100%;
          padding: var(--page-padding);
        }
        
        @media (max-width: 768px) {
          .dashboard {
             padding: 16px;
             overflow-x: hidden;
          }
          
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          
          .page-header-actions {
            width: 100%;
          }
          
          .page-header-actions .btn {
            width: 100%;
          }

          .page-header h1 {
            font-size: 24px;
          }
          
          .page-header p {
            font-size: 13px;
          }
        }
        
        .stats-section {
          margin-bottom: var(--gap-lg);
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--gap-lg);
        }
        
        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
        
        .stat-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          transition: all var(--transition);
          position: relative;
          /* Removed overflow: hidden to allow tooltips to show above the card */
        }
        
        .stat-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-3px);
          box-shadow: var(--shadow-md), 0 0 30px -10px var(--accent);
        }

        .stat-tooltip-container.top-right {
          position: absolute;
          top: 12px;
          right: 12px;
          color: var(--text-muted);
          cursor: help;
          display: flex;
          align-items: center;
          z-index: 20;
        }

        .stat-info-icon {
          opacity: 0.4;
          transition: all var(--transition-fast);
        }

        .stat-tooltip-container:hover .stat-info-icon {
          opacity: 1;
          color: var(--accent);
          transform: scale(1.1);
        }

        .stat-tooltip {
          position: absolute;
          bottom: 100%;
          right: 0;
          transform: translateY(-10px);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 10px 14px;
          border-radius: var(--radius);
          font-size: 11px;
          line-height: 1.5;
          width: 220px;
          z-index: 100;
          opacity: 0;
          visibility: hidden;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-lg);
          backdrop-filter: blur(16px);
          pointer-events: none;
        }

        .stat-tooltip-container:hover .stat-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateY(-8px);
        }

        .stat-progress-wrapper {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--bg-tertiary);
          /* Clip the progress bar to the card's bottom corners */
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
          overflow: hidden;
        }

        .stat-progress-bar {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .stat-progress-fill {
          height: 100%;
          transition: width 1s ease-out;
          opacity: 0.7;
        }
        
        .stat-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-weight: bold;
          transition: transform var(--transition), box-shadow var(--transition);
        }
        
        .stat-card:hover .stat-icon {
          transform: scale(1.05);
          box-shadow: 0 0 20px -5px currentColor;
        }
        
        .stat-content {
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding-top: 2px;
        }
        
        .stat-value {
          font-size: 1.875rem;
          font-weight: 800;
          line-height: 1;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        
        .stat-label {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
          margin-top: 6px;
        }
        
        .stat-subtext {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          margin-top: 6px;
        }
        
        .stat-subtext.up { color: var(--success); }
        .stat-subtext.down { color: var(--danger); }
        
        /* Quick Stats Row */
        .quick-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--gap-md);
          margin-bottom: var(--gap-xl);
        }
        
        @media (max-width: 900px) {
          .quick-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 480px) {
          .quick-stats {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .quick-stat {
            padding: 12px;
          }
        }
        
        .quick-stat {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          transition: all var(--transition);
          position: relative;
        }
        
        .quick-stat:hover {
          border-color: var(--border-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }

        .stat-tooltip-container.mini {
          position: relative;
          display: inline-flex;
          align-items: center;
          margin-left: 6px;
          vertical-align: middle;
        }

        .stat-tooltip-container.mini .stat-tooltip {
          right: -10px;
          bottom: calc(100% + 10px);
        }
        
        .quick-stat:hover svg {
          filter: drop-shadow(0 0 6px currentColor);
        }
        
        .quick-stat svg { flex-shrink: 0; }
        
        .icon-success { color: #22c55e; }
        .icon-danger { color: #ef4444; }
        .icon-info { color: #3b82f6; }
        .icon-primary { color: #6366f1; }
        
        .qs-value {
          font-weight: 600;
          color: var(--text-primary);
          font-size: var(--text-base);
        }
        
        .qs-label {
          font-size: var(--text-xs);
          color: var(--text-muted);
          margin-left: auto;
        }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: var(--gap-xl);
          margin-bottom: var(--gap-xl);
        }
        
        .dashboard-grid.second-row {
          grid-template-columns: 1fr 1fr 1fr;
        }
        
        @media (max-width: 1200px) {
          .dashboard-grid.second-row {
            grid-template-columns: 1fr 1fr;
          }
        }
        
        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
            gap: var(--gap-lg);
          }
        }

        @media (max-width: 768px) {
          .dashboard-grid,
          .dashboard-grid.second-row {
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 24px;
          }
        }
        
        .pipeline-stages {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .pipeline-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 0;
          border-radius: var(--radius-sm);
          transition: all var(--transition);
        }
        
        .pipeline-row:hover {
          background: var(--bg-tertiary);
          padding-left: 8px;
          padding-right: 8px;
          margin-left: -8px;
          margin-right: -8px;
        }
        
        @media (max-width: 768px) {
          .pipeline-row:hover {
            margin-left: 0;
            margin-right: 0;
            padding-left: 0;
            padding-right: 0;
          }
          .pipeline-info {
            width: 100px;
          }
          .pipeline-bar-container {
            margin: 0 4px;
          }
        }
        
        .pipeline-info {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 120px;
          flex-shrink: 0;
        }
        
        .stage-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 8px -2px currentColor;
        }
        
        .stage-name {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .pipeline-bar-container {
          flex: 1;
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;
        }
        
        .pipeline-bar {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        
        .stage-count {
          width: 28px;
          text-align: right;
          font-size: var(--text-sm);
          font-weight: 600;
        }
        
        .leads-list {
          display: flex;
          flex-direction: column;
        }
        
        .lead-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          margin: 0 -8px;
          border-bottom: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          transition: all var(--transition);
          text-decoration: none;
        }
        
        .lead-row:last-child {
          border-bottom: none;
        }
        
        .lead-row:hover {
          background: var(--bg-tertiary);
          box-shadow: inset 3px 0 0 var(--accent);
          padding-left: 14px;
        }

        @media (max-width: 768px) {
          .lead-row {
            margin: 0;
          }
          .lead-row:hover {
            padding-left: 8px;
          }
        }
        
        .lead-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
          gap: 2px;
        }
        
        .lead-name {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .lead-type {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: capitalize;
        }
        
        /* Card Headers with icons */
        .card-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .title-icon { color: var(--text-muted); }
        .title-icon.warning { color: #f59e0b; }
        
        .header-badge {
          background: var(--bg-tertiary);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        
        .header-badge.warning { 
          background: #f59e0b20; 
          color: #f59e0b; 
        }
        
        .header-badge.primary { 
          background: #6366f120; 
          color: #6366f1; 
        }
        
        /* Scrollable Lists (Recent Leads & Opportunities) */
        .leads-list.scrollable,
        .opportunity-list.scrollable {
          max-height: 280px;
          overflow-y: auto;
          padding-right: 8px;
        }

        /* Modern Custom Scrollbar for Dashboard Lists */
        .leads-list.scrollable::-webkit-scrollbar,
        .opportunity-list.scrollable::-webkit-scrollbar {
          width: 5px;
        }

        .leads-list.scrollable::-webkit-scrollbar-track,
        .opportunity-list.scrollable::-webkit-scrollbar-track {
          background: transparent;
        }

        .leads-list.scrollable::-webkit-scrollbar-thumb,
        .opportunity-list.scrollable::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
        }

        .leads-list.scrollable::-webkit-scrollbar-thumb:hover,
        .opportunity-list.scrollable::-webkit-scrollbar-thumb:hover {
          background: var(--border-hover);
        }

        .opportunity-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-subtle);
          transition: all var(--transition-fast);
          text-decoration: none;
        }

        .opportunity-row:last-child { border-bottom: none; }
        .opportunity-row:hover { padding-left: 4px; }
        .opportunity-row:hover .opp-arrow { opacity: 1; }

        .opp-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .opp-name {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
        }

        .opp-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .opp-rating {
          display: flex;
          align-items: center;
          gap: 3px;
          color: #f59e0b;
        }

        .opp-phone { color: #22c55e; }

        .opp-arrow {
          color: var(--text-muted);
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        
        /* Attention List */
        .attention-list {
          display: flex;
          flex-direction: column;
        }
        
        .attention-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-subtle);
          transition: all var(--transition-fast);
          text-decoration: none;
        }
        
        .attention-row:last-child { border-bottom: none; }
        .attention-row:hover { padding-left: 4px; }
        
        .att-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }
        
        .att-name {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
        }
        
        .att-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #f59e0b;
        }
        
        .att-stage {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        
        /* Activity Grid */
        .activity-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 8px;
        }
        
        @media (max-width: 400px) {
          .activity-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .activity-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 16px 8px;
          background: var(--bg-tertiary);
          border-radius: var(--radius);
          transition: all var(--transition);
          text-decoration: none;
          border: 1px solid transparent;
        }
        
        .activity-stat:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
          background: var(--bg-hover);
          border-color: var(--border);
        }

        .header-badge.clickable {
          cursor: pointer;
          transition: all var(--transition);
          text-decoration: none;
        }

        .header-badge.clickable:hover {
          filter: brightness(1.1);
          transform: scale(1.05);
          box-shadow: 0 0 10px -2px currentColor;
        }
        
        .activity-stat:hover .act-icon {
          transform: scale(1.1);
          box-shadow: 0 0 15px -3px currentColor;
        }
        
        .act-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          transition: all var(--transition);
        }
        
        .act-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        
        .act-label {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        @media (max-width: 600px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .card {
            padding: 16px;
            overflow: hidden;
          }
          .pipeline-info {
            width: 80px;
          }
          .pipeline-row {
            gap: 8px;
          }
        }
        
        /* Empty states */
        .empty-state-small {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          text-align: center;
          color: var(--text-muted);
        }
        
        .empty-state-small svg { margin-bottom: 8px; opacity: 0.5; }
        .empty-state-small svg.success { color: #22c55e; opacity: 1; }
        .empty-state-small.recent-empty {
          padding: 40px 20px;
          min-height: 280px;
        }
        
        .recent-empty h3 {
          font-size: var(--text-base);
          margin: 12px 0 4px;
        }
        
        .recent-empty p {
          max-width: 200px;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  )
}

export default Dashboard
