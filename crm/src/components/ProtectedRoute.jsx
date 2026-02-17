import { Navigate, Outlet } from 'react-router-dom'
import useStore from '../store/useStore'
import { Loader2 } from 'lucide-react'

function ProtectedRoute() {
    const user = useStore(state => state.user)
    const profile = useStore(state => state.profile)
    const isLoading = useStore(state => state.isLoading)

    // Wait for auth to initialize (initAuth handles the user/profile state)
    // We only block if we have neither user nor we are still loading profile
    if (!user && (isLoading || profile === undefined)) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#050505]">
                <div className="text-center">
                    <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
                    <p className="text-gray-400 animate-pulse">Initializing LeadCRM...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    // Check if user needs to change their password
    const needsPasswordChange = user.user_metadata?.needs_password_change === true

    // If they need to change it and aren't on the change page, redirect them
    if (needsPasswordChange && window.location.pathname !== '/change-password') {
        return <Navigate to="/change-password" replace />
    }

    // If they DON'T need to change it but are trying to access the change page, redirect to dashboard
    if (!needsPasswordChange && window.location.pathname === '/change-password') {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}

export default ProtectedRoute
