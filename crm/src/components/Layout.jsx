import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Animated background orbs */}
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
          overflow: visible;
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
        
        /* Reduce animation for users who prefer reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .orb {
            animation: none;
          }
        }
        
        /* Ensure page content is above the background */
        .main-content > *:not(.ambient-bg) {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  )
}

export default Layout
