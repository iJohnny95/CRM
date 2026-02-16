import { useState } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line,
    ComposedChart
} from 'recharts'
import { motion } from 'framer-motion'
import {
    TrendingUp, Users, Target, Clock,
    ArrowUpRight, ArrowDownRight, Award, Filter,
    Activity, Layout, ChevronDown, Zap,
    BarChart as BarIcon
} from 'lucide-react'
import useStore from '../store/useStore'

// Branding Colors
const COLORS = {
    primary: '#6366f1',
    secondary: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#a855f7',
    pink: '#ec4899',
    gray: '#71717a'
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
}

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
}

function GlassCard({ children, className = "", title, icon: Icon }) {
    return (
        <motion.div
            variants={itemVariants}
            className={`glass-card ${className}`}
        >
            <div className="glass-card-header">
                <div className="glass-card-title-group">
                    {Icon && <Icon size={16} className="glass-card-icon" />}
                    <h3 className="glass-card-title">{title}</h3>
                </div>
            </div>
            <div className="glass-card-content">
                {children}
            </div>
        </motion.div>
    )
}

function StatCard({ title, value, subValue, trendValue, icon: Icon, color }) {
    const isPositive = trendValue >= 0

    return (
        <motion.div variants={itemVariants} className="premium-stat-card">
            <div className="stat-main">
                <div className="stat-info">
                    <span className="stat-label">{title}</span>
                    <div className="stat-value-group">
                        <span className="stat-value">{value}</span>
                        {trendValue !== 0 && (
                            <div className={`stat-trend ${isPositive ? 'up' : 'down'}`}>
                                {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {Math.abs(trendValue)}%
                            </div>
                        )}
                    </div>
                    <span className="stat-subtext">{subValue}</span>
                </div>
                <div className="stat-visual" style={{ background: `${color}15`, color }}>
                    <Icon size={24} />
                </div>
            </div>
            <div className="stat-progress">
                <div className="stat-progress-bar" style={{ background: `${color}20` }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '70%' }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="stat-progress-fill"
                        style={{ background: color }}
                    />
                </div>
            </div>
        </motion.div>
    )
}

function CustomTooltip({ active, payload, label, currency = false }) {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="tooltip-label">{label}</p>
                <div className="tooltip-items">
                    {payload.map((entry, index) => (
                        <div key={index} className="tooltip-item" style={{ color: entry.color }}>
                            <span className="tooltip-dot" style={{ background: entry.color }} />
                            <span className="tooltip-name">{entry.name}:</span>
                            <span className="tooltip-value">
                                {currency ? `€${entry.value.toLocaleString()}` : entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }
    return null
}

function Analytics() {
    const [timeframe, setTimeframe] = useState(30)
    const analytics = useStore(state => state.getAnalyticsData(timeframe))

    const formatCurrency = (val) => new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(val)

    return (
        <div className="page analytics-premium">
            <header className="page-header">
                <div className="header-left">
                    <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        Operational Analytics
                    </motion.h1>
                    <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        Comprehensive insights into your sales performance and lead data
                    </motion.p>
                </div>

                <div className="header-right">
                    <div className="timeframe-selector">
                        <span className="filter-label">Timeframe</span>
                        <div className="select-wrapper">
                            <select
                                value={timeframe}
                                onChange={(e) => setTimeframe(Number(e.target.value))}
                                className="premium-select"
                            >
                                <option value={7}>Last 7 Days</option>
                                <option value={30}>Last 30 Days</option>
                                <option value={90}>Last 90 Days</option>
                                <option value={365}>Last Year</option>
                            </select>
                            <ChevronDown size={14} className="select-icon" />
                        </div>
                    </div>
                </div>
            </header>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="bento-grid"
            >
                {/* Top KPIs */}
                <StatCard
                    title="Revenue Generated"
                    value={formatCurrency(analytics.kpis.revenue.value)}
                    trendValue={analytics.kpis.revenue.trend}
                    subValue="Closed won deals"
                    icon={Award}
                    color={COLORS.success}
                />
                <StatCard
                    title="New Leads"
                    value={analytics.kpis.leads.value}
                    trendValue={analytics.kpis.leads.trend}
                    subValue="Acquisition pipeline"
                    icon={Users}
                    color={COLORS.primary}
                />
                <StatCard
                    title="Conversion"
                    value={`${analytics.kpis.conversion.value}%`}
                    trendValue={analytics.kpis.conversion.trend}
                    subValue="Outcome efficiency"
                    icon={Target}
                    color={COLORS.warning}
                />
                <StatCard
                    title="Sales Cycle"
                    value={`${analytics.kpis.cycle.value} Days`}
                    trendValue={analytics.kpis.cycle.trend}
                    subValue="Avg. time to close"
                    icon={Clock}
                    color={COLORS.purple}
                />

                {/* First Row Block: Revenue(3-2) + Small Charts (1-1 stack) */}
                <GlassCard title="Revenue Trajectory" icon={TrendingUp} className="span-3-2">
                    <div className="chart-container-large">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.revenueTrend}>
                                <defs>
                                    <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorPipe" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                                <YAxis
                                    axisLine={false} tickLine={false}
                                    tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                                    tickFormatter={(val) => `€${val >= 1000 ? val / 1000 + 'k' : val}`}
                                />
                                <Tooltip content={<CustomTooltip currency={true} />} />
                                <Area type="monotone" dataKey="won" stroke={COLORS.success} strokeWidth={3} fill="url(#colorWon)" name="Won" />
                                <Area type="monotone" dataKey="pipeline" stroke={COLORS.primary} strokeWidth={3} fill="url(#colorPipe)" name="Pipeline" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Small Column Stack */}
                <GlassCard title="Win/Loss Analysis" icon={BarIcon} className="span-1-1">
                    <div className="chart-container-vsmall">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.outcomesTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                <XAxis dataKey="date" hide />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
                                <Bar dataKey="won" fill={COLORS.success} stackId="a" radius={[0, 0, 0, 0]} name="Won" />
                                <Bar dataKey="lost" fill={COLORS.danger} stackId="a" radius={[4, 4, 0, 0]} name="Lost" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                <GlassCard title="Lead Velocity" icon={Zap} className="span-1-1">
                    <div className="chart-container-vsmall">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analytics.stageVelocity}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                <XAxis dataKey="stage" hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="days" stroke={COLORS.purple} strokeWidth={3} dot={{ r: 4, fill: COLORS.purple }} polyline="" name="Avg. Days" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Second Row Block: Industry Performance(2-2) + Funnel/Split (1-2 each) */}
                <GlassCard title="Industry Performance" icon={Layout} className="span-2-2">
                    <div className="chart-container-large">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart layout="vertical" data={analytics.industryPerformance} margin={{ left: 10, right: 30, top: 40, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                                <XAxis xAxisId="left" type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                                <XAxis xAxisId="right" orientation="top" type="number" axisLine={false} tickLine={false} unit="%" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
                                    width={120}
                                    tickFormatter={(val) => val.length > 25 ? val.substring(0, 22) + '...' : val}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" align="right" iconType="circle" />
                                <Bar xAxisId="left" dataKey="leads" fill={COLORS.primary} radius={[0, 4, 4, 0]} name="Leads" barSize={15} />
                                <Line xAxisId="right" type="monotone" dataKey="conversion" stroke={COLORS.success} strokeWidth={3} name="Conv %" dot={{ r: 4, fill: COLORS.success }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                <GlassCard title="Operational Funnel" icon={Filter} className="span-1-2">
                    <div className="chart-container-large">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analytics.stageData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationDuration={1500}
                                >
                                    {analytics.stageData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" formatter={(v) => <span className="legend-text">{v}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                <GlassCard title="Industry Split" icon={Layout} className="span-1-2">
                    <div className="chart-container-large">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.industryData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={90} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
                                <Bar dataKey="value" fill={COLORS.pink} radius={[0, 4, 4, 0]} barSize={10} name="Leads" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Bottom Block: Acquisition Trend (4x2) */}
                <GlassCard title="Acquisition Trend" icon={Activity} className="span-4-2">
                    <div className="chart-container-large">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.leadsTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} interval={timeframe > 30 ? 60 : timeframe > 7 ? 6 : 0} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
                                <Bar dataKey="leads" fill={COLORS.secondary} radius={[4, 4, 0, 0]} barSize={20} name="Leads" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            </motion.div>

            <style>{`
        .analytics-premium {
          color: var(--text-primary);
        }

        .timeframe-selector {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          padding: 8px 16px;
          border-radius: 99px;
          backdrop-filter: blur(8px);
        }

        .filter-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .premium-select {
          appearance: none;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 600;
          padding-right: 20px;
          cursor: pointer;
          outline: none;
        }

        .select-icon {
          position: absolute;
          right: 0;
          pointer-events: none;
          color: var(--text-tertiary);
        }

        /* Bento Grid */
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 32px;
          margin-top: 32px;
        }

        .span-4-2 { grid-column: span 4; grid-row: span 2; }
        .span-3-2 { grid-column: span 3; grid-row: span 2; }
        .span-2-2 { grid-column: span 2; grid-row: span 2; }
        .span-1-2 { grid-column: span 1; grid-row: span 2; }
        .span-1-1 { grid-column: span 1; grid-row: span 1; }

        @media (max-width: 1400px) {
          .bento-grid { gap: 24px; }
        }

        @media (max-width: 1200px) {
          .bento-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .span-4-2, .span-3-2, .span-2-2, .span-1-2 { grid-column: span 2; }
        }

        @media (max-width: 768px) {
          .bento-grid {
            grid-template-columns: 1fr;
          }
          .span-4-2, .span-3-2, .span-2-2, .span-1-2, .span-1-1 { grid-column: span 1; }
        }

        /* Premium Stat Card */
        .premium-stat-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .premium-stat-card:hover {
          border-color: var(--accent);
          transform: translateY(-4px);
          box-shadow: 0 20px 40px -20px var(--accent);
        }

        .stat-main {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value-group {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 12px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .stat-trend.up { background: var(--success-subtle); color: var(--success); }
        .stat-trend.down { background: var(--danger-subtle); color: var(--danger); }

        .stat-subtext {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .stat-visual {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition);
        }
        
        .premium-stat-card:hover .stat-visual {
          transform: scale(1.1);
          box-shadow: 0 0 20px -5px currentColor;
        }

        .stat-progress {
          width: 100%;
        }

        .stat-progress-bar {
          height: 4px;
          width: 100%;
          border-radius: 2px;
          overflow: hidden;
        }

        .stat-progress-fill {
          height: 100%;
          border-radius: 2px;
        }

        /* Glass Card */
        .glass-card {
          background: color-mix(in srgb, var(--bg-secondary), transparent 20%);
          border: 1px solid var(--border);
          border-radius: 24px;
          backdrop-filter: blur(16px);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          transition: all var(--transition);
        }
        
        .glass-card:hover {
          border-color: var(--border-hover);
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.3);
        }

        .glass-card-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .glass-card-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .glass-card-icon {
          color: var(--accent);
        }

        .glass-card-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .glass-card-content {
          padding: 24px;
          flex: 1;
        }

        /* Chart Containers */
        .chart-container-large { height: 400px; }
        .chart-container-vsmall { height: 180px; }

        .legend-text {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 500;
          margin-left: 4px;
        }

        /* Custom Tooltip */
        .custom-tooltip {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          padding: 12px;
          border-radius: 12px;
          backdrop-filter: blur(12px);
          box-shadow: var(--shadow-lg);
          z-index: 1000;
        }

        .tooltip-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .tooltip-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tooltip-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        .tooltip-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .tooltip-name { color: var(--text-tertiary); }
        .tooltip-value { font-weight: 700; }

        .premium-select option {
          background-color: var(--bg-elevated);
          color: var(--text-primary);
        }
      `}</style>
        </div>
    )
}

export default Analytics
