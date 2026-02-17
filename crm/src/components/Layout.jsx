import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileHeader from './MobileHeader'

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768)
  const location = useLocation()

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }, [location])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Animated background orbs moved inside or handled via CSS */}
        <div className="ambient-bg">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <Outlet />
      </main>

      <style>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
        }
        
        .main-content {
          flex: 1;
          margin-left: var(--sidebar-width);
          min-height: 100vh;
          background: var(--bg-primary);
          position: relative;
          overflow-x: hidden;
          transition: margin-left var(--transition);
        }

        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
            padding-bottom: 80px; 
          }
        }
        
        /* Ambient Background */
        .ambient-bg {
          position: fixed;
          top: 0;
          left: var(--sidebar-width);
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
          transition: left var(--transition);
        }

        @media (max-width: 768px) {
          .ambient-bg {
            left: 0;
          }
        }
        
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(200px);
          opacity: 0.08;
          animation: floatOrb 20s ease-in-out infinite;
        }
        
        .orb-1 {
          width: 900px;
          height: 900px;
          background: var(--accent);
          top: -30%;
          right: -20%;
          animation-delay: 0s;
          animation-duration: 45s;
        }
        
        .orb-2 {
          width: 800px;
          height: 800px;
          background: var(--success);
          bottom: -30%;
          left: -10%;
          animation-delay: -15s;
          animation-duration: 50s;
        }
        
        .orb-3 {
          width: 700px;
          height: 700px;
          background: var(--warning);
          top: 20%;
          right: 40%;
          animation-delay: -25s;
          animation-duration: 38s;
        }
        
        @keyframes floatOrb {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          15% {
            transform: translate(150px, -100px) scale(1.15);
          }
          30% {
            transform: translate(-100px, 150px) scale(0.85);
          }
          45% {
            transform: translate(200px, 80px) scale(1.1);
          }
          60% {
            transform: translate(-150px, -120px) scale(0.9);
          }
          75% {
            transform: translate(100px, 180px) scale(1.05);
          }
          90% {
            transform: translate(-180px, 50px) scale(0.95);
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .orb {
            animation: none;
          }
        }
        
        .main-content > *:not(.ambient-bg) {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  )
}

export default Layout
