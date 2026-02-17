import { useState, useRef } from 'react'
import {
    User,
    Lock,
    Settings as SettingsIcon,
    Camera,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Bell,
    Shield,
    Palette
} from 'lucide-react'
import useStore from '../store/useStore'
import { supabase } from '../lib/supabase'

function Settings() {
    const { user, profile, updateProfile, uploadAvatar } = useStore()
    const [activeTab, setActiveTab] = useState('profile')
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })
    const fileInputRef = useRef(null)

    // Profile Form State
    const [fullName, setFullName] = useState(profile?.full_name || '')

    // Security Form State
    const [passwords, setPasswords] = useState({
        new: '',
        confirm: ''
    })

    const showMessage = (type, text) => {
        setMessage({ type, text })
        setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    }

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        const { error } = await updateProfile({ full_name: fullName })
        setIsSaving(false)
        if (error) {
            showMessage('error', error.message)
        } else {
            showMessage('success', 'Profile updated successfully!')
        }
    }

    const handleUpdatePassword = async (e) => {
        e.preventDefault()
        if (passwords.new !== passwords.confirm) {
            showMessage('error', 'Passwords do not match')
            return
        }
        if (passwords.new.length < 6) {
            showMessage('error', 'Password must be at least 6 characters')
            return
        }

        setIsSaving(true)
        const { error } = await supabase.auth.updateUser({ password: passwords.new })
        setIsSaving(false)

        if (error) {
            showMessage('error', error.message)
        } else {
            showMessage('success', 'Password updated successfully!')
            setPasswords({ new: '', confirm: '' })
        }
    }

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsSaving(true)
        const { error } = await uploadAvatar(file)
        setIsSaving(false)

        if (error) {
            showMessage('error', error.message)
        } else {
            showMessage('success', 'Profile picture updated!')
        }
    }

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'preferences', label: 'Preferences', icon: Palette },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ]

    return (
        <div className="settings-page">
            <header className="page-header">
                <div className="header-content">
                    <div className="title-area">
                        <h1>Account Settings</h1>
                        <p className="subtitle">Manage your profile, security, and preferences</p>
                    </div>
                </div>
            </header>

            <div className="settings-container">
                {/* Sidebar Tabs */}
                <aside className="tabs-sidebar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <Icon size={18} />
                                <span>{tab.label}</span>
                            </button>
                        )
                    })}
                </aside>

                {/* Main Content Area */}
                <main className="settings-main">
                    {message.text && (
                        <div className={`status-msg ${message.type}`}>
                            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            <span>{message.text}</span>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="settings-section animate-in">
                            <h2>Public Profile</h2>
                            <p className="section-desc">Change how you appear to others in the team.</p>

                            <div className="avatar-upload-area">
                                <div className="avatar-preview">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt="Profile" />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {fullName.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <button
                                        className="avatar-edit-btn"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isSaving}
                                    >
                                        <Camera size={16} />
                                    </button>
                                </div>
                                <div className="upload-info">
                                    <h3>Profile Picture</h3>
                                    <p>PNG, JPG or GIF. Max 2MB.</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        hidden
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                    />
                                </div>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="settings-form">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="disabled-input"
                                    />
                                    <p className="input-hint">Email cannot be changed manually for security reasons.</p>
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn-primary" disabled={isSaving}>
                                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Save Profile Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="settings-section animate-in">
                            <h2>Password & Security</h2>
                            <p className="section-desc">Update your password to keep your account secure.</p>

                            <form onSubmit={handleUpdatePassword} className="settings-form">
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        value={passwords.new}
                                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                        placeholder="Minimum 6 characters"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                        placeholder="Repeat your new password"
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn-primary" disabled={isSaving}>
                                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {(activeTab === 'preferences' || activeTab === 'notifications') && (
                        <div className="settings-section animate-in coming-soon">
                            <div className="coming-soon-content">
                                <SettingsIcon size={48} className="icon-muted" />
                                <h2>Coming Soon</h2>
                                <p>Advanced {activeTab} settings are under development.</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <style>{`
        .settings-page {
          padding: 32px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .settings-container {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 40px;
          margin-top: 32px;
        }

        .tabs-sidebar {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius);
          color: var(--text-secondary);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all var(--transition);
          text-align: left;
          font-weight: 500;
        }

        .tab-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .tab-btn.active {
          background: var(--accent-subtle);
          color: var(--accent);
          box-shadow: 0 0 15px -10px var(--accent);
        }

        .settings-main {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 32px;
          min-height: 500px;
        }

        .settings-section h2 {
          font-size: 20px;
          margin-bottom: 8px;
        }

        .section-desc {
          color: var(--text-muted);
          margin-bottom: 32px;
          font-size: 14px;
        }

        .avatar-upload-area {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 40px;
          padding: 24px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-lg);
          border: 1px dashed var(--border);
        }

        .avatar-preview {
          position: relative;
          width: 80px;
          height: 80px;
        }

        .avatar-preview img, .avatar-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 20px;
          object-fit: cover;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent);
          color: white;
          font-size: 32px;
          font-weight: 700;
        }

        .avatar-edit-btn {
          position: absolute;
          bottom: -8px;
          right: -8px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition);
          box-shadow: var(--shadow-md);
        }

        .avatar-edit-btn:hover {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        .upload-info h3 {
          font-size: 16px;
          margin-bottom: 4px;
        }

        .upload-info p {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 500px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .form-group input {
          padding: 12px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text-primary);
          font-size: 14px;
          transition: all var(--transition);
        }

        .form-group input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-subtle);
          outline: none;
        }

        .disabled-input {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .input-hint {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .btn-primary {
          padding: 12px 24px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: var(--radius);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition);
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-primary:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .status-msg {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius);
          margin-bottom: 24px;
          font-size: 14px;
        }

        .status-msg.success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-msg.error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .coming-soon {
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          height: 100%;
        }

        .coming-soon-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .icon-muted {
          color: var(--text-tertiary);
          opacity: 0.5;
        }

        .animate-in {
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 900px) {
          .settings-container {
            grid-template-columns: 1fr;
          }
          
          .tabs-sidebar {
            flex-direction: row;
            overflow-x: auto;
            padding-bottom: 8px;
          }
          
          .tab-btn {
             white-space: nowrap;
          }
        }
      `}</style>
        </div>
    )
}

export default Settings
