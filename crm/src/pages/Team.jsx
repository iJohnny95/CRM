import { useNavigate } from 'react-router-dom'
import { Users, Mail, Shield, ShieldAlert, ArrowRight } from 'lucide-react'
import useStore from '../store/useStore'

function Team() {
    const profile = useStore(state => state.profile)
    const users = useStore(state => state.users)
    const navigate = useNavigate()

    // Redirect if not admin
    if (profile && profile.role !== 'admin') {
        return (
            <div className="page team-page">
                <div className="card empty-state">
                    <ShieldAlert size={40} />
                    <h3>Access Denied</h3>
                    <p>Only administrators can access the Team page.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/')}>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="page team-page animate-fade-in">
            <header className="page-header">
                <div>
                    <h1>Team Management</h1>
                    <p>Manage your team members and monitor performance</p>
                </div>
            </header>

            <div className="team-grid">
                {users.map(user => (
                    <div key={user.id} className="card user-card">
                        <div className="user-header">
                            <div className="user-avatar">
                                {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                            </div>
                            <div className="user-info">
                                <h3>{user.full_name || 'Unnamed User'}</h3>
                                <div className="user-email">
                                    <Mail size={14} />
                                    <span>{user.email}</span>
                                </div>
                            </div>
                            <div className={`role-badge ${user.role}`}>
                                {user.role === 'admin' ? <Shield size={12} /> : <Users size={12} />}
                                {user.role}
                            </div>
                        </div>

                        <div className="user-footer">
                            <span className="user-id">ID: {user.id.slice(0, 8)}...</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/leads?agent=${user.id}`)}>
                                View Leads
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .team-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: var(--gap-xl);
                }

                .user-card {
                    padding: var(--gap-xl);
                    display: flex;
                    flex-direction: column;
                    gap: var(--gap-lg);
                }

                .user-header {
                    display: flex;
                    align-items: center;
                    gap: var(--gap-lg);
                    position: relative;
                }

                .user-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    background: var(--accent-subtle);
                    color: var(--accent);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .user-info h3 {
                    font-size: var(--text-base);
                    font-weight: 600;
                    margin-bottom: 4px;
                }

                .user-email {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: var(--text-sm);
                    color: var(--text-tertiary);
                }

                .role-badge {
                    position: absolute;
                    top: 0;
                    right: 0;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .role-badge.admin {
                    background: var(--danger-subtle);
                    color: var(--danger);
                }

                .role-badge.user {
                    background: var(--accent-subtle);
                    color: var(--accent);
                }

                .user-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: var(--gap-md);
                    border-top: 1px solid var(--border-subtle);
                }

                .user-id {
                    font-family: monospace;
                    font-size: 10px;
                    color: var(--text-muted);
                }
            `}</style>
        </div>
    )
}

export default Team
