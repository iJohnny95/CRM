import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Target,
  Handshake,
  GitBranch,
  Zap,
  TrendingUp,
  Moon,
  Sun,
  Activity,
  Magnet,
  Calendar,
  LogOut
} from 'lucide-react'
import useStore from '../store/useStore'
import useThemeStore from '../store/useThemeStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { to: '/opportunities', icon: Target, label: 'Opportunities' },
  { to: '/clients', icon: Handshake, label: 'Clients' },
  { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { to: '/activity', icon: Activity, label: 'Activity' },
]

const adminNavItems = [
  { to: '/automations', icon: Zap, label: 'Generate Leads' },
]

function Sidebar() {
  const profile = useStore(state => state.profile)
  const user = useStore(state => state.user)
  const isAdmin = profile?.role === 'admin'
  const theme = useThemeStore(state => state.theme)
  const toggleTheme = useThemeStore(state => state.toggleTheme)
  const initTheme = useThemeStore(state => state.initTheme)

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <Magnet size={20} />
          </div>
          <span className="logo-text">LeadCRM</span>
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
        {isAdmin && adminNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/team"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Team</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-info">
            <span className="user-name">{useStore.getState().profile?.full_name || 'User'}</span>
            <span className="user-email">{useStore.getState().user?.email}</span>
            {useStore.getState().profile?.role === 'admin' && <span className="admin-badge">Admin</span>}
          </div>
          <button className="logout-btn" onClick={() => useStore.getState().logout()} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 50;
        }
        
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 16px;
          border-bottom: 1px solid var(--border);
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .logo-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent);
          border-radius: var(--radius);
          color: white;
          box-shadow: 0 0 20px -5px var(--accent);
          transition: box-shadow var(--transition), transform var(--transition);
        }
        
        .logo:hover .logo-icon {
          box-shadow: 0 0 25px -2px var(--accent);
          transform: scale(1.05);
        }
        
        .logo-text {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--text-primary);
          transition: color var(--transition);
        }
        
        .logo:hover .logo-text {
          color: var(--accent);
        }
        
        .theme-toggle {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition);
        }
        
        .theme-toggle:hover {
          background: var(--bg-hover);
          color: var(--accent);
          border-color: var(--accent);
          box-shadow: 0 0 15px -5px var(--accent);
          transform: rotate(15deg);
        }
        
        .theme-toggle:active {
          transform: rotate(0deg) scale(0.95);
        }
        
        .sidebar-nav {
          flex: 1;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }
        
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: var(--radius);
          color: var(--text-secondary);
          font-size: var(--text-sm);
          font-weight: 500;
          transition: all var(--transition);
          position: relative;
        }
        
        .nav-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%) scaleY(0);
          width: 3px;
          height: 60%;
          background: var(--accent);
          border-radius: 0 3px 3px 0;
          transition: transform var(--transition);
        }
        
        .nav-item:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          padding-left: 16px;
        }
        
        .nav-item:hover::before {
          transform: translateY(-50%) scaleY(1);
        }
        
        .nav-item.active {
          background: var(--accent-subtle);
          color: var(--accent);
          box-shadow: 0 0 20px -10px var(--accent);
        }
        
        .nav-item.active::before {
          transform: translateY(-50%) scaleY(1);
        }
        
        .nav-item svg {
          transition: transform var(--transition);
        }
        
        .nav-item:hover svg {
          transform: scale(1.1);
        }
        
        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--border);
        }
        

        .user-profile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: var(--bg-tertiary);
          border-radius: var(--radius);
          margin-bottom: 16px;
          border: 1px solid var(--border);
        }

        .user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-email {
          font-size: 11px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admin-badge {
          font-size: 10px;
          background: var(--accent);
          color: white;
          padding: 1px 6px;
          border-radius: 10px;
          width: fit-content;
          margin-top: 2px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .logout-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition);
          flex-shrink: 0;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: #ef4444;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.2);
        }
      `}</style>
    </aside>
  )
}

export default Sidebar
