import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import LeadDetail from './pages/LeadDetail'
import CallModePage from './pages/CallModePage'
import Opportunities from './pages/Opportunities'
import Clients from './pages/Clients'
import Pipeline from './pages/Pipeline'
import Automations from './pages/Automations'
import Analytics from './pages/Analytics'
import Activity from './pages/Activity'
import Calendar from './pages/Calendar'
import Team from './pages/Team'
import Settings from './pages/Settings'
import Login from './pages/auth/Login'
import ChangePassword from './pages/auth/ChangePassword'
import ProtectedRoute from './components/ProtectedRoute'
import { useEffect } from 'react'
import useStore from './store/useStore'

function App() {
    const fetchInitialData = useStore(state => state.fetchInitialData)
    const initAuth = useStore(state => state.initAuth)
    const user = useStore(state => state.user)
    const profile = useStore(state => state.profile)
    const initialized = useStore(state => state.initialized)

    useEffect(() => {
        initAuth()
    }, [initAuth])

    // Trigger initial data load once authenticated
    useEffect(() => {
        if (user && !initialized) {
            fetchInitialData()
        }
    }, [user, initialized, fetchInitialData])

    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/change-password" element={<ChangePassword />} />

                {/* Protected CRM Routes */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="leads" element={<Leads />} />
                        <Route path="leads/:id" element={<LeadDetail />} />
                        <Route path="leads/:id/call-mode" element={<CallModePage />} />
                        <Route path="opportunities" element={<Opportunities />} />
                        <Route path="clients" element={<Clients />} />
                        <Route path="pipeline" element={<Pipeline />} />
                        <Route path="automations" element={<Automations />} />
                        <Route path="activity" element={<Activity />} />
                        <Route path="calendar" element={<Calendar />} />
                        <Route path="team" element={<Team />} />
                        <Route path="settings" element={<Settings />} />
                    </Route>
                </Route>

                {/* Redirect any other path to Dashboard (which will trigger login if no session) */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
