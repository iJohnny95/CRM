import React, { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { useNavigate } from 'react-router-dom'
import { format, parse, startOfWeek, getDay, addMinutes, differenceInMinutes, isToday, startOfMonth, endOfMonth, startOfWeek as startOfWeekFn, endOfWeek, isWithinInterval, isSameDay, addDays, isFuture, isPast, startOfDay } from 'date-fns'
import { pt, enUS } from 'date-fns/locale'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Plus, Calendar as CalendarIcon, Phone, Users,
    Clock, X, Activity, PhoneCall, ChevronRight,
    CalendarCheck, Sparkles, ArrowRight, Bell, CheckCircle2, Info
} from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import '../Calendar.css'
import useStore from '../store/useStore'

const dashboardStyles = `
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

    .stat-card.active-pill {
        border-color: var(--accent);
        background: var(--accent-subtle);
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
        font-size: var(--text-xs);
        color: var(--text-tertiary);
        margin-top: 6px;
    }

    .stat-progress-wrapper {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--bg-tertiary);
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
        transition: width 0.3s ease;
        opacity: 0.7;
    }

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
`;

const locales = { 'en-US': enUS, 'pt': pt }

const localizer = dateFnsLocalizer({
    format, parse, startOfWeek, getDay, locales,
})

// Custom formats for better localization and clarity
const formats = {
    agendaHeaderFormat: ({ start }, culture, localizer) =>
        localizer.format(start, 'EEEE, d MMMM yyyy', culture),
    dayHeaderFormat: (date, culture, localizer) =>
        localizer.format(date, 'EEEE, d MMMM yyyy', culture),
    dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
        localizer.format(start, 'dd MMM', culture) + ' — ' + localizer.format(end, 'dd MMM yyyy', culture),
}

// Premium Event Card Component - adapts to view type
const EventCard = ({ event, view }) => {
    const navigate = useNavigate()
    const cardRef = useRef(null)
    const [showTooltip, setShowTooltip] = useState(false)
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })

    const eventType = event.resource?.type || 'default'
    const isDayView = view === 'day'
    const isAgenda = view === 'agenda'

    const businessName = event.title?.replace(/^(Call|Meeting|Follow-up):\s*/i, '') || event.title
    const startTime = format(event.start, 'h:mm a')

    // Smart Duration Formatter
    const getDurationDisplay = () => {
        let totalMinutes = 0;
        const noteMatch = event.resource?.notes?.match(/(?:Duration|Duração):\s*(\d+):(\d+)/i);

        if (noteMatch) {
            const m = parseInt(noteMatch[1], 10);
            const s = parseInt(noteMatch[2], 10);
            totalMinutes = Math.round(m + s / 60);
            if (totalMinutes === 0 && (m > 0 || s > 0)) totalMinutes = 1;
        } else if (event.resource?.duration) {
            const d = event.resource.duration;
            if (typeof d === 'string' && d.includes(':')) {
                const parts = d.split(':');
                const m = parseInt(parts[0], 10);
                const s = parseInt(parts[1], 10);
                totalMinutes = Math.round(m + s / 60);
            } else if (!isNaN(d)) {
                totalMinutes = d > 60 ? Math.round(d / 60) : d;
            }
        } else {
            totalMinutes = differenceInMinutes(event.end, event.start);
        }

        if (totalMinutes < 60) return `${totalMinutes}m`;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return m > 0 ? `${h}h${m}m` : `${h}h`;
    }

    const displayDuration = getDurationDisplay()
    const leadId = event.resource?.leadId || event.resource?.lead_id

    const getTypeEmoji = () => {
        switch (eventType) {
            case 'call': return '📞'
            case 'planned_call': return '📲'
            case 'meeting': return '👥'
            default: return '📅'
        }
    }

    const getTypeLabel = () => {
        switch (eventType) {
            case 'call': return 'Call'
            case 'planned_call': return 'Follow-up'
            case 'meeting': return 'Meeting'
            default: return 'Event'
        }
    }

    const [isAbove, setIsAbove] = useState(false)

    const handleMouseEnter = () => {
        if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect()
            const spaceBelow = window.innerHeight - rect.bottom
            const tooltipHeightEstimate = 300 // Safe estimate for large tooltips

            // If space below is less than estimate, show above
            const shouldShowAbove = spaceBelow < tooltipHeightEstimate && rect.top > tooltipHeightEstimate

            setIsAbove(shouldShowAbove)
            setTooltipPos({
                top: shouldShowAbove
                    ? rect.top + window.scrollY
                    : rect.bottom + window.scrollY,
                left: rect.left + rect.width / 2 + window.scrollX
            })
            setShowTooltip(true)
        }
    }

    const handleCardClick = (e) => {
        e.stopPropagation()
        if (leadId) navigate(`/leads/${leadId}`)
    }

    const handleBusinessClick = (e) => {
        e.stopPropagation()
        if (leadId) navigate(`/leads/${leadId}`)
    }

    // Portal-based Tooltip Component
    const TooltipPortal = () => {
        if (!showTooltip) return null;

        const noteDurationMatch = event.resource?.notes?.match(/Duration:\s*(\d+:\d+)/i);
        const effectiveDuration = noteDurationMatch ? noteDurationMatch[1] : displayDuration;
        const cleanNotes = event.resource?.notes?.replace(/Duration:\s*\d+:\d+\s*[-–]?\s*/i, '').trim();

        const dayOfWeek = getDay(event.start)
        let alignmentClass = ''
        if (dayOfWeek <= 1) alignmentClass = 'align-left'
        else if (dayOfWeek >= 5) alignmentClass = 'align-right'

        return createPortal(
            <div
                className={`event-tooltip-hover portal-tooltip ${alignmentClass} ${isAbove ? 'is-above' : ''}`}
                style={{
                    position: 'absolute',
                    top: `${tooltipPos.top}px`,
                    left: `${tooltipPos.left}px`,
                    zIndex: 9999,
                    pointerEvents: 'none',
                    visibility: 'visible',
                    opacity: 1,
                    // transform is now handled largely by CSS classes for better performance/shorthand
                }}
            >
                <div className="tooltip-header">
                    <span className="tooltip-emoji">{getTypeEmoji()}</span>
                    <span className="tooltip-type">{getTypeLabel()}</span>
                </div>
                <div className="tooltip-business">{businessName}</div>
                <div className="tooltip-meta">
                    <Clock size={12} /> {startTime} • {effectiveDuration}
                </div>
                {cleanNotes && (
                    <div className="tooltip-notes">
                        "{cleanNotes}"
                    </div>
                )}
            </div>,
            document.body
        )
    }

    if (isDayView || isAgenda) {
        return (
            <div
                ref={cardRef}
                className={`premium-event event-type-${eventType} day-expanded`}
                onClick={handleCardClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <span className="event-emoji">{getTypeEmoji()}</span>
                <span className="event-time-badge">{startTime}</span>
                <span className="event-name clickable" onClick={handleBusinessClick}>
                    {businessName}
                </span>
                <span className="event-duration">{displayDuration}</span>
                <TooltipPortal />
            </div>
        )
    }

    return (
        <div
            ref={cardRef}
            className={`premium-event event-type-${eventType} compact`}
            onClick={handleCardClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <span className="event-emoji">{getTypeEmoji()}</span>
            <span className="event-name clickable" onClick={handleBusinessClick}>
                {businessName}
            </span>
            <TooltipPortal />
        </div>
    )
}

// Upcoming Event Row Component
const UpcomingEventRow = ({ event, isNext, onClick }) => {
    const eventType = event.resource?.type || 'default'
    const startTime = format(event.start, 'h:mm a')
    const businessName = event.title?.replace(/^(Call|Meeting|Follow-up):\s*/i, '') || event.title
    const dayLabel = isToday(event.start) ? 'Today' : format(event.start, 'EEE, MMM d')

    const getTypeConfig = () => {
        switch (eventType) {
            case 'call': return { emoji: '📞', color: '#22c55e', label: 'Call' }
            case 'planned_call': return { emoji: '📲', color: '#f59e0b', label: 'Follow-up' }
            case 'meeting': return { emoji: '👥', color: '#a855f7', label: 'Meeting' }
            default: return { emoji: '📅', color: '#6366f1', label: 'Event' }
        }
    }

    const config = getTypeConfig()

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`upcoming-event-row ${isNext ? 'next-up' : ''}`}
            onClick={onClick}
        >
            {isNext && (
                <div className="next-badge">
                    <Sparkles size={10} />
                    NEXT UP
                </div>
            )}
            <div className="event-left">
                <div className="event-avatar" style={{ background: `${config.color}20`, color: config.color }}>
                    <span>{config.emoji}</span>
                </div>
                <div className="event-details">
                    <span className="event-business">{businessName}</span>
                    <span className="event-meta">
                        <span className="event-type-label" style={{ color: config.color }}>{config.label}</span>
                        <span className="dot">•</span>
                        <span>{dayLabel} at {startTime}</span>
                    </span>
                </div>
            </div>
            <ChevronRight size={16} className="event-arrow" />
        </motion.div>
    )
}



// Stat Card Component - matching Dashboard
const StatCard = ({ icon: Icon, label, value, color, subtext, description }) => (
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
            {subtext && <span className="stat-subtext">{subtext}</span>}
        </div>
    </div>
)

// Mini Quick Stat Component
const QuickStat = ({ icon: Icon, value, label, className, description }) => (
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

const CalendarPage = () => {
    const getAllCalendarEvents = useStore(state => state.getAllCalendarEvents)
    const addEvent = useStore(state => state.addEvent)
    const leads = useStore(state => state.leads || [])
    const events = useStore(state => state.events || []) // Subscribe to manual events updates
    const updateEvent = useStore(state => state.updateEvent)
    const deleteEvent = useStore(state => state.deleteEvent)

    const [view, setView] = useState('week')
    const [date, setDate] = useState(() => startOfDay(new Date()))

    const handleNavigate = (newDate) => {
        setDate(startOfDay(newDate))
    }

    const handleViewChange = (newView) => {
        setView(newView)
        // Ensure switch back to start of day
        setDate(prevDate => startOfDay(prevDate))
    }

    const [isModalOpen, setIsModalOpen] = useState(false) // For creating NEW events
    const [isEditModalOpen, setIsEditModalOpen] = useState(false) // For EDITING events
    const [selectedEventId, setSelectedEventId] = useState(null)

    const [bookingForm, setBookingForm] = useState({
        title: '',
        leadId: '',
        type: 'planned_call',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '09:00',
        duration: '30',
        notes: ''
    })

    // Pre-populate form when editing
    const handleEventClick = (event) => {
        const leadId = event.resource?.leadId || event.resource?.lead_id
        const startTime = new Date(event.start)
        const endTime = new Date(event.end)
        const duration = differenceInMinutes(endTime, startTime)

        const notes = event.resource?.notes?.replace(/Duration:\s*\d+:\d+\s*[-–]?\s*/i, '').trim() || ''

        setBookingForm({
            title: event.title,
            leadId: leadId || '',
            type: event.resource?.type || 'default',
            date: format(startTime, 'yyyy-MM-dd'),
            time: format(startTime, 'HH:mm'),
            duration: duration.toString(),
            notes: notes
        })
        setSelectedEventId(event.id)
        setIsEditModalOpen(true)
    }

    // Handle updates
    const handleEditSubmit = (e) => {
        e.preventDefault()
        const start = new Date(`${bookingForm.date}T${bookingForm.time}`)
        const end = addMinutes(start, parseInt(bookingForm.duration))

        updateEvent(selectedEventId, {
            title: bookingForm.title,
            start: start.toISOString(),
            end: end.toISOString(),
            type: bookingForm.type,
            leadId: bookingForm.leadId,
            notes: bookingForm.notes
        })
        setIsEditModalOpen(false)
    }

    const handleDeleteEvent = () => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            deleteEvent(selectedEventId)
            setIsEditModalOpen(false)
        }
    }

    const handleCreateSubmit = (e) => {
        e.preventDefault()
        const lead = leads.find(l => l.id === bookingForm.leadId)
        const start = new Date(`${bookingForm.date}T${bookingForm.time}`)
        const end = addMinutes(start, parseInt(bookingForm.duration))

        addEvent({
            title: bookingForm.title || `${bookingForm.type === 'meeting' ? 'Meeting' : 'Call'}: ${lead?.business_name || 'Generic'}`,
            start: start.toISOString(),
            end: end.toISOString(),
            type: bookingForm.type,
            leadId: bookingForm.leadId,
            notes: bookingForm.notes
        })

        setIsModalOpen(false)
        resetForm()
    }

    const resetForm = () => {
        setBookingForm({
            title: '', leadId: '', type: 'planned_call',
            date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', duration: '30', notes: ''
        })
    }

    // ... (rest of memo's same) ...
    // Transform and memoize events
    const calendarEvents = useMemo(() => {
        const rawEvents = getAllCalendarEvents()
        return rawEvents.map(event => {
            const start = new Date(event.start)
            // Use exact end time - NO minimum visual override, per user request
            const end = new Date(event.end)
            const duration = differenceInMinutes(end, start)

            return {
                id: event.id,
                title: event.title,
                start,
                end,
                allDay: event.allDay || false,
                resource: { ...event, originalDuration: duration }
            }
        })
    }, [getAllCalendarEvents, leads, events])

    // Stats calculation
    const stats = useMemo(() => {
        const now = new Date()
        const weekStart = startOfWeekFn(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

        const todayEvents = calendarEvents.filter(e => isToday(e.start))
        const weekEvents = calendarEvents.filter(e => isWithinInterval(e.start, { start: weekStart, end: weekEnd }))
        // Filter to only show events that START in the future (not already happened today)
        const upcomingEvents = calendarEvents
            .filter(e => e.start > now)
            .sort((a, b) => a.start - b.start)
            .slice(0, 10)

        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        const monthlyEvents = calendarEvents.filter(e => isWithinInterval(e.start, { start: monthStart, end: monthEnd }))

        return {
            today: todayEvents.length,
            thisWeek: weekEvents.length,
            calls: todayEvents.filter(e => e.resource?.type === 'call' || e.resource?.type === 'planned_call').length,
            meetings: todayEvents.filter(e => e.resource?.type === 'meeting').length,
            upcoming: upcomingEvents,
            monthTotal: monthlyEvents.length,
            monthCalls: monthlyEvents.filter(e => e.resource?.type === 'call' || e.resource?.type === 'planned_call').length,
            monthMeetings: monthlyEvents.filter(e => e.resource?.type === 'meeting').length,
            pending: calendarEvents.filter(e => e.start > now).length
        }
    }, [calendarEvents])

    // Simplified: always show all events now that filtering cards are non-interactive
    const filteredEvents = useMemo(() => calendarEvents, [calendarEvents])

    const eventStyleGetter = (event) => ({
        className: `calendar-event-wrapper event-${event.resource?.type || 'default'}`
    })

    return (
        <div className={`page calendar-page-v2 ${isToday(date) ? 'is-viewing-today' : ''}`}>
            {/* Dashboard-style Header */}
            <header className="page-header">
                <div>
                    <h1>Calendar</h1>
                    <p>Manage your schedule and upcoming activities</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-primary btn-glow" onClick={() => { resetForm(); setIsModalOpen(true) }}>
                        <Plus size={18} />
                        <span>New Event</span>
                    </button>
                </div>
            </header>

            <style>{`
                @media (max-width: 768px) {
                    .calendar-page-v2 {
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
                    .page-header-actions button {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>

            {/* Stats Grid - matching Dashboard style */}
            <section className="stats-section animate-fade-in" style={{ marginBottom: 'var(--gap-lg)' }}>
                <div className="stats-grid">
                    <StatCard
                        icon={CalendarCheck}
                        label="Today's Events"
                        value={stats.today}
                        color="#22c55e"
                        subtext="Scheduled for today"
                        description="Total number of events, calls, and meetings scheduled for today."
                    />
                    <StatCard
                        icon={Activity}
                        label="Weekly Total"
                        value={stats.thisWeek}
                        color="#3b82f6"
                        subtext="Events this week"
                        description="Total activities scheduled for the current week (Monday to Sunday)."
                    />
                    <StatCard
                        icon={Phone}
                        label="Calls"
                        value={stats.calls}
                        color="#f59e0b"
                        subtext="Calls scheduled"
                        description="Number of phone calls and follow-up activities scheduled for today."
                    />
                    <StatCard
                        icon={Users}
                        label="Meetings"
                        value={stats.meetings}
                        color="#a855f7"
                        subtext="Meetings scheduled"
                        description="Number of in-person or virtual meetings scheduled for today."
                    />
                </div>
            </section>

            {/* Quick Stats Row - matching Dashboard style */}
            <section className="quick-stats animate-fade-in" style={{ marginBottom: 'var(--gap-xl)' }}>
                <QuickStat
                    icon={CheckCircle2}
                    value={stats.monthTotal}
                    label="Month Total"
                    className="icon-success"
                    description="Total activities (events, calls, and meetings) recorded this month."
                />
                <QuickStat
                    icon={Phone}
                    value={stats.monthCalls}
                    label="Month Calls"
                    className="icon-info"
                    description="Total number of calls and follow-ups completed or scheduled this month."
                />
                <QuickStat
                    icon={Users}
                    value={stats.monthMeetings}
                    label="Month Meetings"
                    className="icon-primary"
                    description="Total number of meetings completed or scheduled this month."
                />
                <QuickStat
                    icon={Clock}
                    value={stats.pending}
                    label="Future Pending"
                    className="icon-danger"
                    description="Total activities scheduled for future dates beyond today."
                />
            </section>

            {/* Main Content - Split View */}
            <div className="calendar-split-layout">
                {/* Calendar Grid */}
                <section className="calendar-main-grid">
                    <Calendar
                        localizer={localizer}
                        events={filteredEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '800px' }}
                        view={view}
                        onView={handleViewChange}
                        date={date}
                        onNavigate={handleNavigate}
                        eventPropGetter={eventStyleGetter}
                        selectable
                        popup
                        culture="pt"
                        formats={formats}
                        views={['month', 'week', 'day', 'agenda']}
                        length={1} // Shows only 1 day in Agenda view
                        step={5}
                        timeslots={1}
                        min={new Date(0, 0, 0, 6, 0, 0)}
                        max={new Date(0, 0, 0, 23, 0, 0)}
                        scrollToTime={new Date()}
                        messages={{
                            noEventsInRange: (
                                <div className="agenda-empty-state-wrapper">
                                    <div className="empty-state-content">
                                        <div className="empty-icon-glow">
                                            <CalendarIcon size={40} />
                                        </div>
                                        <h3>Your agenda is clear</h3>
                                        <p>No events found for the selected period.</p>
                                        <button className="btn btn-primary btn-glow" onClick={() => setIsModalOpen(true)}>
                                            <Plus size={18} />
                                            <span>Schedule Event</span>
                                        </button>
                                    </div>
                                </div>
                            )
                        }}
                        components={{
                            event: (props) => <EventCard {...props} view={view} />
                        }}
                    />
                </section>

                {/* Sidebar - Upcoming Events */}
                <aside className="calendar-sidebar">
                    <div className="sidebar-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className="sidebar-header">
                            <h3><Bell size={16} /> Upcoming</h3>
                            <span className="count-badge">{stats.upcoming.length}</span>
                        </div>
                        <div className="upcoming-list" style={{ flex: 1, overflowY: 'auto' }}>
                            {stats.upcoming.length === 0 ? (
                                <div className="empty-upcoming">
                                    <CheckCircle2 size={32} />
                                    <p>All clear! No upcoming events.</p>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(true)}>
                                        <Plus size={14} /> Schedule Something
                                    </button>
                                </div>
                            ) : (
                                stats.upcoming.map((event, idx) => (
                                    <UpcomingEventRow
                                        key={event.id}
                                        event={event}
                                        isNext={idx === 0}
                                        onClick={() => handleEventClick(event)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            {/* CREATE Modal Overlay */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="modal-overlay-fixed" onClick={() => setIsModalOpen(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="modal-glass"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-header-premium">
                                <div className="modal-title-group">
                                    <div className="modal-icon">
                                        <CalendarIcon size={20} />
                                    </div>
                                    <div>
                                        <h2>Schedule Activity</h2>
                                        <p>Add a new call or meeting</p>
                                    </div>
                                </div>
                                <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubmit} className="modal-form">
                                {/* Activity Type */}
                                <div className="activity-type-selector">
                                    <button
                                        type="button"
                                        className={`type-option ${bookingForm.type === 'planned_call' ? 'active' : ''}`}
                                        onClick={() => setBookingForm({ ...bookingForm, type: 'planned_call' })}
                                    >
                                        <div className="type-icon call-icon">📲</div>
                                        <span>Call Back</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`type-option ${bookingForm.type === 'meeting' ? 'active' : ''}`}
                                        onClick={() => setBookingForm({ ...bookingForm, type: 'meeting' })}
                                    >
                                        <div className="type-icon meeting-icon">👥</div>
                                        <span>Meeting</span>
                                    </button>
                                </div>

                                {/* Form Fields */}
                                <div className="form-group">
                                    <label>Select Lead</label>
                                    <select
                                        className="input select"
                                        required
                                        value={bookingForm.leadId}
                                        onChange={(e) => setBookingForm({ ...bookingForm, leadId: e.target.value })}
                                    >
                                        <option value="">Choose a lead...</option>
                                        {leads.map(l => (
                                            <option key={l.id} value={l.id}>{l.business_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            required
                                            value={bookingForm.date}
                                            onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Time</label>
                                        <input
                                            type="time"
                                            className="input"
                                            required
                                            value={bookingForm.time}
                                            onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Duration</label>
                                    <div className="duration-pills">
                                        {['15', '30', '60', '120'].map(d => (
                                            <button
                                                key={d}
                                                type="button"
                                                className={`duration-pill ${bookingForm.duration === d ? 'active' : ''}`}
                                                onClick={() => setBookingForm({ ...bookingForm, duration: d })}
                                            >
                                                {d === '60' ? '1h' : d === '120' ? '2h' : `${d}m`}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Notes</label>
                                    <textarea
                                        className="input textarea"
                                        rows={2}
                                        value={bookingForm.notes}
                                        onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                                    />
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary"><Plus size={16} /> Create Event</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* EDIT Modal Overlay */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <div className="modal-overlay-fixed" onClick={() => setIsEditModalOpen(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="modal-glass"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-header-premium">
                                <div className="modal-title-group">
                                    <div className="modal-icon">
                                        <CalendarCheck size={20} />
                                    </div>
                                    <div>
                                        <h2>Edit Event</h2>
                                        <p>Update event details</p>
                                    </div>
                                </div>
                                <button className="modal-close" onClick={() => setIsEditModalOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleEditSubmit} className="modal-form">
                                {/* Activity Type */}
                                <div className="activity-type-selector">
                                    <button
                                        type="button"
                                        className={`type-option ${bookingForm.type === 'planned_call' ? 'active' : ''}`}
                                        onClick={() => setBookingForm({ ...bookingForm, type: 'planned_call' })}
                                    >
                                        <div className="type-icon call-icon">📲</div>
                                        <span>Call Back</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`type-option ${bookingForm.type === 'meeting' ? 'active' : ''}`}
                                        onClick={() => setBookingForm({ ...bookingForm, type: 'meeting' })}
                                    >
                                        <div className="type-icon meeting-icon">👥</div>
                                        <span>Meeting</span>
                                    </button>
                                </div>

                                {/* Form Fields */}
                                <div className="form-group">
                                    <label>Lead (Read-only)</label>
                                    <select
                                        className="input select"
                                        disabled
                                        value={bookingForm.leadId}
                                        style={{ opacity: 0.7 }}
                                    >
                                        <option value="">{bookingForm.title}</option>
                                        {leads.map(l => (
                                            <option key={l.id} value={l.id}>{l.business_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            required
                                            value={bookingForm.date}
                                            onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Time</label>
                                        <input
                                            type="time"
                                            className="input"
                                            required
                                            value={bookingForm.time}
                                            onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Duration</label>
                                    <div className="duration-pills">
                                        {['15', '30', '60', '120'].map(d => (
                                            <button
                                                key={d}
                                                type="button"
                                                className={`duration-pill ${bookingForm.duration === d ? 'active' : ''}`}
                                                onClick={() => setBookingForm({ ...bookingForm, duration: d })}
                                            >
                                                {d === '60' ? '1h' : d === '120' ? '2h' : `${d}m`}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Notes</label>
                                    <textarea
                                        className="input textarea"
                                        rows={2}
                                        value={bookingForm.notes}
                                        onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                                    />
                                </div>

                                <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                                    <button type="button" className="btn btn-danger" onClick={handleDeleteEvent}>
                                        Delete
                                    </button>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button type="button" className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                                        <button type="submit" className="btn btn-primary">Save Changes</button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <style>{`
                ${dashboardStyles}
                .calendar-page-v2 {
                    max-width: 100%;
                }
                
                .calendar-split-layout {
                    display: grid;
                    grid-template-columns: 1fr 300px;
                    gap: var(--gap-xl);
                    height: calc(100vh - 450px);
                    min-height: 500px;
                }
                
                @media (max-width: 1024px) {
                    .calendar-split-layout {
                        grid-template-columns: 1fr;
                        height: auto;
                    }
                    .calendar-sidebar {
                        display: none;
                    }
                }

                .calendar-main-grid {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    padding: 20px;
                    box-shadow: var(--shadow-sm);
                }

                .calendar-sidebar {
                    display: flex;
                    flex-direction: column;
                    gap: var(--gap-lg);
                }

                .sidebar-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--border);
                }

                .sidebar-header h3 {
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-primary);
                }

                .count-badge {
                    background: var(--bg-tertiary);
                    color: var(--text-secondary);
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
            `}</style>
        </div>
    )
}

export default CalendarPage
