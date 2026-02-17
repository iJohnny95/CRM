import { Menu, Magnet } from 'lucide-react'
import useThemeStore from '../store/useThemeStore'
import { Moon, Sun } from 'lucide-react'

function MobileHeader({ onMenuClick }) {
  const theme = useThemeStore(state => state.theme)
  const toggleTheme = useThemeStore(state => state.toggleTheme)

  return (
    <header className="mobile-header">
      <div className="header-left">
        <button className="menu-toggle-btn" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div className="mobile-logo">
          <Magnet size={20} className="logo-icon" />
          <span className="logo-text">LeadCRM</span>
        </div>
      </div>

      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <style>{`
        .mobile-header {
          display: none;
          height: 64px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          padding: 0 16px;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .menu-toggle-btn {
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          margin-left: -8px;
          border-radius: var(--radius);
          transition: background var(--transition);
        }

        .menu-toggle-btn:hover {
          background: var(--bg-tertiary);
        }

        .mobile-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mobile-logo .logo-icon {
          color: var(--accent);
        }

        .mobile-logo .logo-text {
          font-weight: 700;
          font-size: 18px;
          letter-spacing: -0.02em;
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
        }

        .theme-toggle:active {
          transform: scale(0.95);
        }

        @media (max-width: 768px) {
          .mobile-header {
            display: flex;
          }
        }
      `}</style>
    </header>
  )
}

export default MobileHeader
