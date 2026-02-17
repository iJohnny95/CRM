import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import {
    History,
    Filter,
    MessageSquare,
    Phone,
    Mail,
    Calendar,
    ArrowRight,
    Paperclip,
    ChevronDown,
    Activity as ActivityIcon,
    Clock,
    CalendarDays,
    Trash2,
    ExternalLink,
    Users,
    Info,
    X
} from 'lucide-react'
import { Link } from 'react-router-dom'
import useStore, { ACTIVITY_TYPES } from '../store/useStore'

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
}

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
}

function StatCard({ title, value, subValue, icon: Icon, color }) {
    return (
        <div className="stat-card">
            <div className="stat-icon" style={{ background: `${color}15`, color }}>
                <Icon size={22} />
            </div>
            <div className="stat-content">
                <span className="stat-value">{value}</span>
                <span className="stat-label">{title}</span>
                <span className="stat-subtext">{subValue}</span>
            </div>
            <div className="stat-progress-wrapper">
                <div className="stat-progress-bar">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="stat-progress-fill"
                        style={{ background: color }}
                    />
                </div>
            </div>
        </div>
    )
}

function Activity() {
    const location = useLocation()
    const leads = useStore(state => state.leads)
    const [filterType, setFilterType] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    const [visibleCount, setVisibleCount] = useState(20)

    // Handle incoming filter from navigation state
    useEffect(() => {
        if (location.state?.filter) {
            setFilterType(location.state.filter)
        }
    }, [location.state])

    // Aggregate all activities from all leads
    const allActivities = useMemo(() => {
        const aggregated = leads.flatMap(lead =>
            (lead.activities || []).map(activity => ({
                ...activity,
                leadId: lead.id,
                business_name: lead.business_name
            }))
        )

        // Sort by date descending
        return aggregated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }, [leads])

    // Filter activities by type and search query
    const filteredActivities = useMemo(() => {
        return allActivities.filter(activity => {
            const matchesType = filterType === 'all' || activity.type === filterType
            const matchesSearch = !searchQuery ||
                activity.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                activity.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ACTIVITY_TYPES[activity.type]?.label.toLowerCase().includes(searchQuery.toLowerCase())

            return matchesType && matchesSearch
        })
    }, [allActivities, filterType, searchQuery])

    // Group activities by date (with limit)
    const groupedActivities = useMemo(() => {
        const groups = {}
        const limitedActivities = filteredActivities.slice(0, visibleCount)

        limitedActivities.forEach(activity => {
            const date = new Date(activity.created_at).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            if (!groups[date]) groups[date] = []
            groups[date].push(activity)
        })
        return Object.entries(groups)
    }, [filteredActivities, visibleCount])

    // Stats (calculated from all activities, not filtered ones)
    const stats = useMemo(() => {
        const now = new Date()
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const recent = allActivities.filter(a => new Date(a.created_at) >= last7Days)

        return {
            total: allActivities.length,
            recent: recent.length,
            calls: recent.filter(a => a.type === 'call').length,
            emails: recent.filter(a => a.type === 'email').length,
        }
    }, [allActivities])

    const getIcon = (type) => {
        const config = ACTIVITY_TYPES[type] || { icon: 'Activity', color: '#6b7280' }
        const IconComponent = {
            MessageSquare,
            Phone,
            Mail,
            Calendar,
            ArrowRight,
            Paperclip,
            Activity: ActivityIcon
        }[config.icon] || ActivityIcon

        return <IconComponent size={16} />
    }

    const getColor = (type) => ACTIVITY_TYPES[type]?.color || '#6b7280'

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 20)
    }

    return (
        <div className="page activity-page">
            <header className="page-header sticky-header">
                <div className="header-info">
                    <h1>Activity</h1>
                    <p>Track all your interactions and actions within the CRM</p>
                </div>
                <button
                    className={`mobile-filter-toggle ${isFiltersOpen ? 'active' : ''}`}
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                >
                    <Filter size={18} />
                    <span>Filters</span>
                </button>
            </header>

            <div className="activity-layout-v2 animate-fade-in">
                {/* Main Timeline Column */}
                <div className="timeline-column">
                    <div className="timeline-header-v2">
                        <div className="search-bar-v2">
                            <History size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search activities, businesses, or types..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="clear-search" onClick={() => setSearchQuery('')}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <div className="activity-count">
                            Showing {Math.min(visibleCount, filteredActivities.length)} of {filteredActivities.length} activities
                        </div>
                    </div>

                    <div className="activity-timeline-container-v2">
                        {groupedActivities.length > 0 ? (
                            <>
                                {groupedActivities.map(([date, activities]) => (
                                    <div key={date} className="date-group-v2">
                                        <div className="date-header-v2">
                                            <div className="date-indicator" />
                                            <span>{date}</span>
                                        </div>
                                        <div className="timeline-items-v2">
                                            {activities.map((activity, idx) => (
                                                <motion.div
                                                    key={activity.id}
                                                    variants={itemVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    className="timeline-item-v2"
                                                >
                                                    <div className="item-marker-v2">
                                                        <div
                                                            className="marker-icon-v2"
                                                            style={{
                                                                background: `${getColor(activity.type)}15`,
                                                                color: getColor(activity.type)
                                                            }}
                                                        >
                                                            {getIcon(activity.type)}
                                                        </div>
                                                        <div className="marker-line-v2"></div>
                                                    </div>
                                                    <div className="item-card-v2">
                                                        <div className="item-header-v2">
                                                            <div className="type-badge" style={{ color: getColor(activity.type), background: `${getColor(activity.type)}10` }}>
                                                                {ACTIVITY_TYPES[activity.type]?.label || 'Activity'}
                                                            </div>
                                                            <span className="item-time-v2">
                                                                <Clock size={12} />
                                                                {new Date(activity.created_at).toLocaleTimeString(undefined, {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                        <p className="item-description-v2">{activity.description}</p>
                                                        <div className="item-footer-v2">
                                                            <Link to={`/leads/${activity.leadId}`} className="lead-link-v2">
                                                                <Users size={12} />
                                                                <span>{activity.business_name}</span>
                                                                <ExternalLink size={10} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {visibleCount < filteredActivities.length && (
                                    <div className="load-more-container">
                                        <button className="btn btn-secondary load-more-btn" onClick={handleLoadMore}>
                                            <ChevronDown size={16} />
                                            Load More Activities
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="empty-activity-v2">
                                <ActivityIcon size={48} className="empty-icon" />
                                <h3>No activities found</h3>
                                <p>We couldn't find any activities matching your filters or search query.</p>
                                <button className="btn btn-ghost" onClick={() => { setFilterType('all'); setSearchQuery(''); }}>
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="sidebar-column">
                    <div className="sticky-sidebar">
                        <div className="sidebar-compact-container">
                            {/* Overview Header */}
                            <div className="sidebar-compact-header">
                                <h3 className="section-title">Overview</h3>
                            </div>

                            {/* Mini Stats Group */}
                            <div className="sidebar-compact-group statistics">
                                <div className="mini-stat-item" style={{ '--stat-color': '#6366f1' }}>
                                    <div className="mini-stat-icon">
                                        <History size={14} />
                                    </div>
                                    <div className="mini-stat-info">
                                        <span className="mini-stat-value">{stats.total}</span>
                                        <span className="mini-stat-label">Total</span>
                                    </div>
                                </div>
                                <div className="mini-stat-item" style={{ '--stat-color': '#22c55e' }}>
                                    <div className="mini-stat-icon">
                                        <ActivityIcon size={14} />
                                    </div>
                                    <div className="mini-stat-info">
                                        <span className="mini-stat-value">{stats.recent}</span>
                                        <span className="mini-stat-label">Recent</span>
                                    </div>
                                </div>
                                <div className="mini-stat-item" style={{ '--stat-color': '#f59e0b' }}>
                                    <div className="mini-stat-icon">
                                        <Phone size={14} />
                                    </div>
                                    <div className="mini-stat-info">
                                        <span className="mini-stat-value">{stats.calls}</span>
                                        <span className="mini-stat-label">Calls</span>
                                    </div>
                                </div>
                                <div className="mini-stat-item" style={{ '--stat-color': '#ec4899' }}>
                                    <div className="mini-stat-icon">
                                        <Mail size={14} />
                                    </div>
                                    <div className="mini-stat-info">
                                        <span className="mini-stat-value">{stats.emails}</span>
                                        <span className="mini-stat-label">Emails</span>
                                    </div>
                                </div>
                            </div>

                            <div className="sidebar-compact-divider" />

                            {/* Filters Header */}
                            <div className="sidebar-compact-header">
                                <h3 className="section-title">Filter By Type</h3>
                            </div>

                            {/* Filters List */}
                            <div className={`sidebar-compact-group filters ${isFiltersOpen ? 'mobile-open' : ''}`}>
                                <button
                                    className={`compact-filter-item ${filterType === 'all' ? 'active' : ''}`}
                                    onClick={() => { setFilterType('all'); setVisibleCount(20); if (window.innerWidth <= 1024) setIsFiltersOpen(false); }}
                                >
                                    <div className="filter-dot" style={{ background: 'var(--accent)' }} />
                                    <span>All Activities</span>
                                </button>
                                {Object.entries(ACTIVITY_TYPES).map(([type, config]) => (
                                    <button
                                        key={type}
                                        className={`compact-filter-item ${filterType === type ? 'active' : ''}`}
                                        onClick={() => { setFilterType(type); setVisibleCount(20); if (window.innerWidth <= 1024) setIsFiltersOpen(false); }}
                                    >
                                        <div className="filter-dot" style={{ background: config.color }} />
                                        <span>{config.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <style>{`
                .activity-page {
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .activity-layout-v2 {
                    display: grid;
                    grid-template-columns: 1fr 280px;
                    gap: var(--gap-xl);
                }

                .timeline-column {
                    min-width: 0;
                }

                .timeline-header-v2 {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--gap-lg);
                    gap: 20px;
                }

                .search-bar-v2 {
                    position: relative;
                    flex: 1;
                    max-width: 400px;
                }

                .search-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-tertiary);
                    pointer-events: none;
                }

                .search-bar-v2 input {
                    width: 100%;
                    padding: 10px 40px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    color: var(--text-primary);
                    font-size: 14px;
                    transition: all var(--transition);
                }

                .search-bar-v2 input:focus {
                    outline: none;
                    border-color: var(--accent);
                    box-shadow: 0 0 0 3px var(--accent-subtle);
                    background: var(--bg-tertiary);
                }

                .clear-search {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: var(--text-tertiary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    border-radius: 50%;
                }

                .clear-search:hover {
                    background: var(--border-subtle);
                    color: var(--text-primary);
                }

                .activity-count {
                    font-size: 13px;
                    color: var(--text-tertiary);
                }

                .activity-timeline-container-v2 {
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                }

                .date-group-v2 {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .date-header-v2 {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 16px;
                    background: var(--bg-tertiary);
                    border-radius: 10px;
                    align-self: flex-start;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    border: 1px solid var(--border-subtle);
                }

                .date-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--accent);
                    box-shadow: 0 0 8px var(--accent);
                }

                .timeline-items-v2 {
                    display: flex;
                    flex-direction: column;
                }

                .timeline-item-v2 {
                    display: flex;
                    gap: 24px;
                }

                .item-marker-v2 {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 40px;
                    flex-shrink: 0;
                }

                .marker-icon-v2 {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2;
                    flex-shrink: 0;
                    border: 1px solid rgba(255,255,255,0.05);
                    box-shadow: var(--shadow-sm);
                }

                .marker-line-v2 {
                    width: 2px;
                    flex: 1;
                    background: linear-gradient(to bottom, var(--border-subtle) 0%, transparent 100%);
                    margin: 8px 0;
                }

                .timeline-item-v2:not(:last-child) .marker-line-v2 {
                    background: var(--border-subtle);
                }

                .item-card-v2 {
                    flex: 1;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                    transition: all var(--transition);
                    position: relative;
                }

                .item-card-v2:hover {
                    border-color: var(--accent-subtle);
                    transform: translateX(4px);
                    background: var(--bg-hover);
                    box-shadow: var(--shadow-md);
                }

                .item-header-v2 {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .type-badge {
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .item-time-v2 {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    color: var(--text-tertiary);
                    font-variant-numeric: tabular-nums;
                }

                .item-description-v2 {
                    font-size: 14px;
                    color: var(--text-primary);
                    line-height: 1.6;
                    margin-bottom: 16px;
                }

                .item-footer-v2 {
                    display: flex;
                }

                .lead-link-v2 {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 500;
                    color: var(--text-secondary);
                    text-decoration: none;
                    transition: all var(--transition);
                }

                .lead-link-v2:hover {
                    background: var(--bg-hover);
                    color: var(--accent);
                    border-color: var(--accent);
                    transform: scale(1.02);
                }

                .load-more-container {
                    display: flex;
                    justify-content: center;
                    padding: 20px 0 40px;
                }

                .load-more-btn {
                    padding: 12px 24px;
                    gap: 10px;
                    border-radius: 12px;
                    font-weight: 600;
                }

                .empty-activity-v2 {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 100px 0;
                    text-align: center;
                    background: var(--bg-secondary);
                    border: 1px dashed var(--border);
                    border-radius: 20px;
                }

                .empty-icon {
                    color: var(--text-tertiary);
                    margin-bottom: 20px;
                    opacity: 0.5;
                }

                .empty-activity-v2 h3 {
                    color: var(--text-primary);
                    margin-bottom: 8px;
                }

                .empty-activity-v2 p {
                    color: var(--text-tertiary);
                    max-width: 300px;
                    margin-bottom: 20px;
                }

                .activity-layout-v2 {
                    display: grid;
                    grid-template-columns: 1fr 340px;
                    gap: var(--gap-xl);
                    align-items: start;
                }

                /* Scaled Sidebar (Maximum Visibility) */
                .sidebar-column {
                    position: sticky;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 10;
                    align-self: start;
                }

                .sticky-sidebar {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    width: 340px;
                }

                .sidebar-compact-container {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    overflow: hidden;
                    backdrop-filter: blur(16px);
                    box-shadow: var(--shadow-lg);
                }

                .sidebar-compact-header {
                    padding: 20px 20px 4px;
                }

                .section-title {
                    font-size: 12px;
                    font-weight: 800;
                    color: var(--text-tertiary);
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                }

                .sidebar-compact-group {
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .sidebar-compact-group.statistics {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .mini-stat-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px;
                    background: var(--bg-tertiary);
                    border-radius: 14px;
                    border: 1px solid var(--border-subtle);
                    transition: all var(--transition);
                }

                .mini-stat-item:hover {
                    border-color: var(--stat-color);
                    background: var(--bg-hover);
                    transform: translateY(-3px);
                    box-shadow: 0 8px 24px -6px var(--stat-color);
                }

                .mini-stat-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: color-mix(in srgb, var(--stat-color), transparent 90%);
                    color: var(--stat-color);
                    transition: all var(--transition);
                }

                .mini-stat-item:hover .mini-stat-icon {
                    background: var(--stat-color);
                    color: white;
                    transform: rotate(-10deg) scale(1.1);
                }

                .mini-stat-info {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                }

                .mini-stat-value {
                    font-size: 18px;
                    font-weight: 800;
                    color: var(--text-primary);
                    line-height: 1.1;
                }

                .mini-stat-label {
                    font-size: 11px;
                    color: var(--text-muted);
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .sidebar-compact-divider {
                    height: 1px;
                    background: var(--border-subtle);
                    margin: 0 20px;
                    opacity: 0.3;
                }

                .compact-filter-item {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 12px 14px;
                    background: transparent;
                    border: 1px solid transparent;
                    border-radius: 12px;
                    color: var(--text-secondary);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    width: 100%;
                    text-align: left;
                    transition: all var(--transition);
                }

                .compact-filter-item:hover {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }

                .compact-filter-item.active {
                    background: var(--accent-subtle);
                    color: var(--accent);
                    border-color: var(--accent-subtle);
                    font-weight: 600;
                }

                .filter-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }



                @media (max-width: 1024px) {
                    .activity-layout-v2 {
                        grid-template-columns: 1fr;
                        gap: var(--gap-lg);
                    }
                    .sidebar-column {
                        position: static;
                        transform: none;
                        order: -1;
                        width: 100%;
                    }
                    .sticky-sidebar {
                        width: 100%;
                        position: static;
                    }
                    .sidebar-compact-container {
                        border-radius: 16px;
                    }
                    
                    /* Hide filters by default on mobile */
                    .sidebar-compact-group.filters {
                        display: none;
                        animation: slide-down 0.3s ease-out;
                    }
                    .sidebar-compact-group.filters.mobile-open {
                        display: flex;
                    }
                    .sidebar-compact-divider {
                        display: none;
                    }
                    .sidebar-compact-header:has(+ .filters) {
                        display: none;
                    }
                }

                @keyframes slide-down {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .mobile-filter-toggle {
                    display: none;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: 99px;
                    color: var(--text-secondary);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition);
                }

                .mobile-filter-toggle.active {
                    background: var(--accent);
                    color: white;
                    border-color: var(--accent);
                    box-shadow: 0 0 15px -3px var(--accent);
                }

                @media (max-width: 600px) {
                    .page-header {
                        margin-bottom: var(--gap-md);
                        align-items: center;
                    }
                    .mobile-filter-toggle {
                        display: flex;
                    }
                    .timeline-column {
                        padding: 0;
                    }
                    .timeline-header-v2 {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 12px;
                        padding: 0 var(--page-padding);
                    }
                    .search-bar-v2 {
                        max-width: none;
                    }
                    .activity-count {
                        text-align: center;
                    }
                    .sidebar-column {
                        padding: 0 var(--page-padding);
                    }
                    .sidebar-compact-group.statistics {
                        gap: 8px;
                        padding: 12px;
                    }
                    .mini-stat-item {
                        padding: 10px;
                        border-radius: 12px;
                    }
                }
            `}</style>
        </div>
    )
}

export default Activity
