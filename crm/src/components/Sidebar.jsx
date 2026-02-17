import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Reorder, useDragControls } from 'framer-motion'
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
  LogOut,
  Settings,
  GripVertical
} from 'lucide-react'
import useStore from '../store/useStore'
import useThemeStore from '../store/useThemeStore'

const ALL_NAV_ITEMS = [
  { id: 'dashboard', to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'calendar', to: '/calendar', icon: Calendar, label: 'Calendar' },
  { id: 'leads', to: '/leads', icon: Users, label: 'Leads' },
  { id: 'pipeline', to: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { id: 'opportunities', to: '/opportunities', icon: Target, label: 'Opportunities' },
  { id: 'clients', to: '/clients', icon: Handshake, label: 'Clients' },
  { id: 'analytics', to: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { id: 'activity', to: '/activity', icon: Activity, label: 'Activity' },
  { id: 'automations', to: '/automations', icon: Zap, label: 'Generate Leads', adminOnly: true },
  { id: 'team', to: '/team', icon: Users, label: 'Team', adminOnly: true },
  { id: 'settings', to: '/settings', icon: Settings, label: 'Settings' },
]

function SidebarItem({ item }) {
  const dragControls = useDragControls()

  return (
    <Reorder.Item
      value={item}
      id={item.id}
      dragListener={false}
      dragControls={dragControls}
      className="reorder-item-wrapper"
    >
      <NavLink
        to={item.to}
        draggable="false"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <div className="nav-item-content">
          <item.icon size={18} />
          <span>{item.label}</span>
        </div>
        <div
          className="drag-handle"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical size={14} />
        </div>
      </NavLink>
    </Reorder.Item>
  )
}

function Sidebar() {
  const profile = useStore(state => state.profile)
  const user = useStore(state => state.user)
  const updateSettings = useStore(state => state.updateSettings)
  const isAdmin = profile?.role === 'admin'
  const theme = useThemeStore(state => state.theme)
  const toggleTheme = useThemeStore(state => state.toggleTheme)
  const initTheme = useThemeStore(state => state.initTheme)

  // Manage Nav Order State
  const [items, setItems] = useState([])

  // Initialize and Sync Items
  useEffect(() => {
    if (!profile) return

    const savedOrder = profile.settings?.nav_order || []

    // Filter out items the user shouldn't see
    const accessibleItems = ALL_NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)

    let sortedItems = []
    if (savedOrder.length > 0) {
      // 1. Sort existing accessible items by saved order
      const existingItemsInOrder = savedOrder
        .map(id => accessibleItems.find(item => item.id === id))
        .filter(Boolean)

      // 2. Find any new items that weren't in the saved order (e.g. new features)
      const newItems = accessibleItems.filter(item => !savedOrder.includes(item.id))

      sortedItems = [...existingItemsInOrder, ...newItems]
    } else {
      sortedItems = accessibleItems
    }

    setItems(sortedItems)
  }, [profile, isAdmin])

  // Save order when it changes
  const handleReorder = (newOrder) => {
    setItems(newOrder)
    const orderIds = newOrder.map(item => item.id)
    updateSettings({ nav_order: orderIds })
  }

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
        <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="reorder-group">
          {items.map((item) => (
            <SidebarItem key={item.id} item={item} />
          ))}
        </Reorder.Group>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar-container">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">
                {(profile?.full_name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            {isAdmin && <div className="status-indicator"></div>}
          </div>

          <div className="user-info">
            <span className="user-name">{profile?.full_name || 'User'}</span>
            <span className="user-email">{user?.email}</span>
            {isAdmin && <span className="admin-badge">Admin</span>}
          </div>

          <button className="logout-btn" onClick={() => useStore.getState().logout()} title="Logout">
            <LogOut size={16} />
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
          overflow-y: auto;
          overflow-x: hidden;
        }

        /* Drag & Drop Reorder Styles */
        .reorder-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .reorder-item-wrapper {
          position: relative;
          z-index: 1;
        }

        .reorder-item-wrapper:active {
          z-index: 100;
        }

        .nav-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border-radius: var(--radius);
          color: var(--text-secondary);
          font-size: var(--text-sm);
          font-weight: 500;
          transition: all var(--transition);
          position: relative;
          background: transparent;
          cursor: pointer;
          user-select: none;
        }

        .nav-item-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        
        .drag-handle {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          opacity: 0;
          transition: all var(--transition);
          cursor: grab;
          padding: 4px;
          margin-right: -4px;
        }

        .nav-item:hover .drag-handle {
          opacity: 0.5;
        }

        .drag-handle:hover {
          opacity: 1 !important;
          color: var(--accent);
          transform: scale(1.1);
        }

        .drag-handle:active {
          cursor: grabbing;
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
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          position: relative;
          transition: all var(--transition);
        }

        .user-profile:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--accent-subtle);
        }

        .user-avatar-container {
          position: relative;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
        }

        .user-avatar, .user-avatar-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 12px;
          object-fit: cover;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          background: var(--accent);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }

        .status-indicator {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          background: #10b981;
          border: 2px solid var(--bg-secondary);
          border-radius: 50%;
        }

        .user-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
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
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition);
          flex-shrink: 0;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
          transform: translateY(-1px);
        }
      `}</style>
    </aside>
  )
}

export default Sidebar
