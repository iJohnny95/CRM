import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { UserPlus, Mail, Lock, User, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      {success ? (
        <div className="auth-card success-state animate-scale-in">
          <div className="auth-header">
            <div className="success-icon-wrapper">
              <div className="success-pulse"></div>
              <CheckCircle2 size={48} className="success-icon" />
            </div>
            <h1>Check your inbox!</h1>
            <p>We've sent a verification link to <strong>{email}</strong>.</p>
            <p className="success-hint">Please confirm your email to start using LeadCRM.</p>
          </div>
          <div className="auth-actions">
            <Link to="/login" className="btn btn-primary w-full">
              Go to Login
            </Link>
          </div>
        </div>
      ) : (
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <UserPlus size={32} />
            </div>
            <h1>Create Account</h1>
            <p>Join LeadCRM to manage your pipeline</p>
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-with-icon">
                <User size={18} />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Register'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Login here</Link></p>
          </div>
        </div>
      )}

      <style>{`
        /* Reuse styles from Login.jsx or put them in index.css */
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          padding: 20px;
        }

        .auth-card {
          width: 100%;
          max-width: 400px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 40px;
          box-shadow: var(--shadow-xl);
          text-align: center;
        }

        .auth-header {
          margin-bottom: 32px;
        }

        .auth-logo {
          width: 64px;
          height: 64px;
          background: var(--accent-subtle);
          color: var(--accent);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        .auth-logo.success {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }

        .auth-header h1 {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .auth-header p {
          color: var(--text-muted);
          font-size: 14px;
        }

        .auth-error {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 12px 16px;
          border-radius: var(--radius);
          margin-bottom: 24px;
          font-size: 14px;
          border: 1px solid rgba(239, 68, 68, 0.2);
          text-align: left;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          text-align: left;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-icon svg {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
        }

        .input-with-icon input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text-primary);
          transition: all var(--transition);
        }

        .input-with-icon input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-subtle);
          outline: none;
        }

        .auth-btn {
          margin-top: 12px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .auth-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 14px;
          color: var(--text-muted);
        }

        .auth-footer a {
          color: var(--accent);
          font-weight: 500;
        }

        .success-icon-wrapper {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .success-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          background: rgba(34, 197, 94, 0.15);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .success-icon {
          color: #22c55e;
          position: relative;
          z-index: 1;
        }

        .success-hint {
          font-size: 13px;
          margin-top: 12px;
          color: var(--text-tertiary);
          background: var(--bg-tertiary);
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
        }

        .auth-actions {
          margin-top: 24px;
        }

        .w-full { width: 100%; }

        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          70% { transform: scale(1.1); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }

        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .animate-scale-in {
          animation: scaleIn 0.3s ease-out forwards;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default Register
