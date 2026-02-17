import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase.js'

// Pipeline stages configuration
export const STAGES = [
    { id: 'new', label: 'New Lead', color: '#3b82f6', probability: 10 },
    { id: 'contacted', label: 'Contacted', color: '#6366f1', probability: 20 },
    { id: 'interested', label: 'Interested', color: '#f59e0b', probability: 40 },
    { id: 'meeting', label: 'Meeting', color: '#a855f7', probability: 60 },
    { id: 'proposal', label: 'Proposal', color: '#ec4899', probability: 80 },
    { id: 'won', label: 'Closed Won', color: '#22c55e', probability: 100 },
    { id: 'lost', label: 'Closed Lost', color: '#ef4444', probability: 0 },
]

// Priority levels
export const PRIORITIES = [
    { id: 'hot', label: 'Hot', color: '#ef4444' },
    { id: 'warm', label: 'Warm', color: '#f59e0b' },
    { id: 'cold', label: 'Cold', color: '#6b7280' },
]

// Activity types
export const ACTIVITY_TYPES = {
    note: { label: 'Note', icon: 'MessageSquare', color: '#6366f1' },
    call: { label: 'Call', icon: 'Phone', color: '#22c55e' },
    email: { label: 'Email', icon: 'Mail', color: '#3b82f6' },
    meeting: { label: 'Meeting', icon: 'Calendar', color: '#a855f7' },
    stage_change: { label: 'Stage Change', icon: 'ArrowRight', color: '#f59e0b' },
    file: { label: 'File Added', icon: 'Paperclip', color: '#ec4899' },
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15)

// Create Zustand store
const useStore = create((set, get) => ({
    // State
    user: null,
    profile: null,
    leads: [],
    events: [],
    users: [], // Team members (for admins)
    scripts: [],
    activeScriptId: null,
    isLoading: true, // Start in loading state to block premature redirects
    initialized: false, // Prevent double-fetching
    error: null,

    // Filters
    searchQuery: '',
    filterStage: 'all',
    filterPriority: 'all',
    filterWebsite: 'all',
    filterMinRating: 0,
    filterMinReviews: 0,
    filterIndustry: 'all',
    filterDateRange: 'all',
    filterHasPhone: 'all',
    filterHasEmail: 'all',
    filterNeedsAttention: false,
    filterAgent: null,
    sortBy: 'created_at',
    sortOrder: 'desc',

    // Auth Actions
    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),

    // Fetch team members (Admin only)
    fetchUsers: async () => {
        const { profile } = get()
        if (profile?.role !== 'admin') return

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name, role')
            if (error) throw error
            set({ users: data })
        } catch (error) {
            console.error('Failed to fetch users:', error)
        }
    },

    // Assign lead to another user (Admin only)
    assignLead: async (leadId, targetUserId) => {
        const { profile } = get()
        if (profile?.role !== 'admin') return

        try {
            const { error } = await supabase
                .from('leads')
                .update({ user_id: targetUserId, updated_at: new Date().toISOString() })
                .eq('id', leadId)

            if (error) throw error

            // Add activity for assignment
            const targetUser = get().users.find(u => u.id === targetUserId)
            get().addActivity(leadId, 'note', `Lead assigned to ${targetUser?.full_name || targetUser?.email || 'another user'}`)

            set((state) => ({
                leads: state.leads.map(lead =>
                    lead.id === leadId ? { ...lead, user_id: targetUserId } : lead
                )
            }))
        } catch (error) {
            console.error('Failed to assign lead:', error)
        }
    },
    logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, leads: [], events: [], initialized: false, isLoading: false })
    },

    // Private property to track auth listener
    _authListener: null,
    _authInitializing: false, // New flag to prevent strict mode double-firing

    // Initialize Auth listener
    initAuth: async () => {
        // Prevent multiple listeners during HMR or re-renders
        if (get()._authListener || get()._authInitializing) return
        set({ _authInitializing: true })

        // Safety timeout: forced unlock of 'isLoading' after 5s if stuck
        const safetyTimeout = setTimeout(() => {
            if (get().isLoading) {
                console.warn('Auth initialization timed out, forcing unlock')
                set({ isLoading: false, _authInitializing: false })
            }
        }, 5000)

        // 1. Check for existing session immediately to avoid flash of logged-out state
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                console.log('Restored session for:', session.user.email)
                set({ user: session.user }) // Keep isLoading: true until initial data fetch starts
            } else {
                // No session found, stop loading immediately
                set({ isLoading: false })
            }
        } catch (err) {
            console.error('Error restoring session:', err)
            set({ isLoading: false })
        }

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth event:', event, session?.user?.email)
            const user = session?.user || null

            // Handle Logout or Session Expiry
            if (!user || event === 'SIGNED_OUT') {
                set({ user: null, profile: null, leads: [], events: [], initialized: false, isLoading: false })
                return
            }

            // Handle Login / Session Change
            set((state) => ({ user, isLoading: true })) // Ensure loading is true while we fetch profile

            // Fetch profile if not present
            let currentProfile = get().profile
            // If profile ID doesn't match new user, reset it
            if (currentProfile && currentProfile.id !== user.id) {
                currentProfile = null
                set({ profile: null })
            }

            if (!currentProfile) {
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single()

                    if (profile) {
                        set({ profile })
                        currentProfile = profile
                    } else {
                        // Fallback create
                        const { data: newProfile } = await supabase
                            .from('profiles')
                            .insert([{
                                id: user.id,
                                email: user.email,
                                full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'New User',
                                role: 'user'
                            }])
                            .select()
                            .single()
                        if (newProfile) {
                            set({ profile: newProfile })
                            currentProfile = newProfile
                        }
                    }
                } catch (err) {
                    console.error('Error fetching profile:', err)
                }
            }

            // Now fetch initial data if not already loaded
            if (!get().initialized && currentProfile) {
                await get().fetchInitialData() // Wait for data
            }

            // Finally clear loading state
            set({ isLoading: false })
            clearTimeout(safetyTimeout) // Clear timeout if successful
        })

        set({ _authListener: subscription, _authInitializing: false })
    },

    // Refresh user profile from database
    refreshProfile: async () => {
        const { user } = get()
        if (!user) return

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error) throw error
            if (profile) {
                set({ profile })
            }
        } catch (err) {
            console.error('Error refreshing profile:', err)
        }
    },

    // Fetch initial data from Supabase
    fetchInitialData: async () => {
        const { user, profile, initialized, isLoading } = get()
        if (!user || initialized) return

        set({ isLoading: true, error: null })
        try {
            const isAdmin = profile?.role === 'admin'

            // Fetch leads, events, and scripts concurrently
            // Non-admins only see leads assigned to them OR created by them
            let leadsQuery = supabase.from('leads').select('*, activities(*), notes(*), files(*)')

            if (!isAdmin) {
                // Use 'or' filter to check both columns
                leadsQuery = leadsQuery.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
            }

            // Execute queries individually to prevent one failure from blocking others
            // and to better handle AbortErrors if they occur
            // Use .then(res => res, err => ({ error: err })) because Supabase builders are thenables but may lack .catch
            const [leadsRes, eventsRes, scriptsRes] = await Promise.all([
                leadsQuery.then(res => res, err => ({ error: err })),
                supabase.from('events').select('*').then(res => res, err => ({ error: err })),
                supabase.from('scripts').select('*, script_steps(*)').then(res => res, err => ({ error: err }))
            ])

            let fetchedLeads = [];
            let fetchedEvents = [];
            let fetchedScripts = [];

            if (leadsRes.error) {
                if (leadsRes.error.message?.includes('AbortError')) {
                    console.log('Leads fetch aborted')
                } else {
                    console.error('Error fetching leads:', leadsRes.error)
                }
            } else if (leadsRes.data) {
                // Sanitize leads (ensure missing properties are initialized)
                fetchedLeads = (leadsRes.data || []).map(lead => ({
                    ...lead,
                    notes: lead.notes || [],
                    activities: lead.activities || [],
                    files: lead.files || [],
                    tags: lead.tags || [],
                    services: lead.services || [],
                }))
                set({ leads: fetchedLeads })
            }

            if (eventsRes.error) {
                if (!eventsRes.error.message?.includes('AbortError')) {
                    console.error('Error fetching events:', eventsRes.error)
                }
            } else if (eventsRes.data) {
                fetchedEvents = eventsRes.data;
                set({ events: fetchedEvents })
            }

            if (scriptsRes.error) {
                if (!scriptsRes.error.message?.includes('AbortError')) {
                    console.error('Error fetching scripts:', scriptsRes.error)
                }
            } else if (scriptsRes.data) {
                fetchedScripts = scriptsRes.data;
                set({
                    scripts: fetchedScripts,
                    activeScriptId: fetchedScripts.find(s => s.is_primary)?.id || (fetchedScripts.length > 0 ? fetchedScripts[0].id : null),
                })
            }

            // If admin, also fetch users
            if (isAdmin) {
                await get().fetchUsers()
            }


            set({ initialized: true })
        } catch (error) {
            console.error('Fetch initial data failed:', error)
            set({ error: error.message, isLoading: false, initialized: true }) // Set initialized to true anyway to break retry loop
        }
    },

    // Computed: Get all calendar events including historical lead activities
    getAllCalendarEvents: () => {
        const leads = get().leads
        // Map DB events (start_time/end_time) to Calendar events (start/end)
        const manualEvents = (get().events || []).map(event => ({
            ...event,
            start: event.start_time || event.start, // Fallback for safety
            end: event.end_time || event.end
        }))

        const leadActivities = leads.flatMap(lead => {
            return (lead.activities || []).map(activity => {
                // For calls, only show on calendar if it was a real call (not just a scheduling record)
                // or if it was explicitly scheduled.
                if (activity.type === 'call') {
                    const duration = activity.metadata?.duration || 300
                    // If it has a scheduledFollowup, the 'call' activity record itself
                    // is usually just the log of the scheduling action.
                    // We prefer to let the manual event handle the future date.
                    const start = new Date(activity.created_at)
                    const end = new Date(start.getTime() + duration * 1000)

                    return {
                        id: activity.id,
                        title: `Call: ${lead.business_name}`,
                        start: start.toISOString(),
                        end: end.toISOString(),
                        type: 'call',
                        leadId: lead.id,
                        notes: activity.description
                    }
                }
                // For meetings, activities might have a scheduled time
                if (activity.type === 'meeting' && activity.metadata?.scheduledTime) {
                    const start = new Date(activity.metadata.scheduledTime)
                    const end = activity.metadata.endTime
                        ? new Date(activity.metadata.endTime)
                        : new Date(start.getTime() + 60 * 60000)

                    return {
                        id: activity.id,
                        title: `Meeting: ${lead.business_name}`,
                        start: start.toISOString(),
                        end: end.toISOString(),
                        type: 'meeting',
                        leadId: lead.id,
                        notes: activity.description
                    }
                }
                return null
            }).filter(Boolean)
        })

        // Merge and remove duplicates (manual events that correspond to an activityId)
        const activityIds = new Set(manualEvents.map(e => e.activityId).filter(Boolean))
        const uniqueLeadActivities = leadActivities.filter(e => !activityIds.has(e.id))

        return [...manualEvents, ...uniqueLeadActivities]
    },

    // Script State
    scripts: [
        {
            id: 'default-script',
            name: 'Script Padrão (Cold Call)',
            isPrimary: true,
            steps: [
                {
                    id: 'intro',
                    text: "Olá, o meu nome é [Seu Nome] da LeadCRM. Estou a ligar para a {{empresa}} porque reparei que ainda não estão a aproveitar todo o potencial digital. Tem um minuto, {{nome}}?",
                    question: "É uma boa altura?"
                },
                {
                    id: 'value',
                    text: "Ótimo. Nós ajudamos empresas de {{industria}} a automatizar a angariação de clientes. Como é que estão a gerir os novos contactos atualmente em {{cidade}}?",
                    question: "Processo atual?"
                },
                {
                    id: 'pain',
                    text: "Compreendo. E se pudesse automatizar uma parte desse processo para poupar tempo, qual seria?",
                    question: "Maior dificuldade?"
                },
                {
                    id: 'close',
                    text: "Acho que podemos ajudar com isso. Gostaria de lhe mostrar uma demonstração rápida de 10 minutos. [Dia] às [Hora] funciona para si?",
                    question: "Demo agendada?"
                }
            ]
        }
    ],
    activeScriptId: 'default-script',

    // Actions
    setSearchQuery: (query) => set({ searchQuery: query }),
    setFilterStage: (stage) => set({ filterStage: stage }),
    setFilterPriority: (priority) => set({ filterPriority: priority }),
    setFilterWebsite: (status) => set({ filterWebsite: status }),
    setFilterMinRating: (rating) => set({ filterMinRating: rating }),
    setFilterMinReviews: (count) => set({ filterMinReviews: count }),
    setFilterIndustry: (industry) => set({ filterIndustry: industry }),
    setFilterDateRange: (range) => set({ filterDateRange: range }),
    setFilterHasPhone: (status) => set({ filterHasPhone: status }),
    setFilterHasEmail: (status) => set({ filterHasEmail: status }),
    setFilterNeedsAttention: (status) => set({ filterNeedsAttention: status }),
    setFilterAgent: (agentId) => set({ filterAgent: agentId }),
    setSortBy: (field) => set({ sortBy: field }),
    setSortOrder: (order) => set({ sortOrder: order }),

    // Script Actions
    // Script Actions
    addScript: async (script) => {
        const { user } = get()
        if (!user) {
            console.error('Failed to add script: No user logged in')
            return null
        }

        try {
            const newScript = {
                ...script,
                user_id: user.id,
                created_at: new Date().toISOString()
            }

            const { data, error } = await supabase
                .from('scripts')
                .insert([newScript])
                .select()
                .single()

            if (error) {
                console.error('Supabase scripts insert error:', JSON.stringify(error, null, 2))
                throw error
            }

            set((state) => {
                // If it's the first script, make it active/primary
                if (state.scripts.length === 0) {
                    return { scripts: [data], activeScriptId: data.id }
                }
                return { scripts: [...state.scripts, data] }
            })
            return data
        } catch (error) {
            console.error('Failed to add script:', error)
            return null
        }
    },

    updateScript: async (id, updates) => {
        try {
            const { error } = await supabase
                .from('scripts')
                .update(updates)
                .eq('id', id)

            if (error) {
                console.error('Supabase scripts update error:', JSON.stringify(error, null, 2))
                throw error
            }

            set((state) => ({
                scripts: state.scripts.map(s => s.id === id ? { ...s, ...updates } : s)
            }))
        } catch (error) {
            console.error('Failed to update script:', error)
        }
    },

    deleteScript: async (id) => {
        try {
            const { error } = await supabase
                .from('scripts')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Supabase scripts delete error:', JSON.stringify(error, null, 2))
                throw error
            }

            set((state) => {
                const newScripts = state.scripts.filter(s => s.id !== id)
                // If we deleted the active script, reset to the first available or null
                let newActiveId = state.activeScriptId
                if (id === state.activeScriptId) {
                    newActiveId = newScripts.length > 0 ? newScripts[0].id : null
                }
                return { scripts: newScripts, activeScriptId: newActiveId }
            })
        } catch (error) {
            console.error('Failed to delete script:', error)
        }
    },

    setActiveScript: (id) => set({ activeScriptId: id }),

    setPrimaryScript: async (id) => {
        try {
            // 1. Reset all others
            // This is tricky with simple RLS updates if we can't do batch updates easily across rows we don't own?
            // But user owns their scripts.
            // Ideally we'd do a transaction or two calls.
            // For now, let's just set the target one to true. 
            // Logic to un-set others relies on UI or fetching.
            // Supabase doesn't support 'UPDATE ... WHERE id != target' easily in one go if filters are complex?
            // Actually it does: .neq('id', id).update({ isPrimary: false })?
            // But let's keep it simple: update the target.
            // The UI handles the visual 'only one active'.

            const { error } = await supabase
                .from('scripts')
                .update({ isPrimary: true })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                scripts: state.scripts.map(s => ({
                    ...s,
                    isPrimary: s.id === id
                }))
            }))
        } catch (error) {
            console.error('Failed to set primary script:', error)
        }
    },


    reorderScripts: (scripts) => set({ scripts }),

    // Add a single lead
    addLead: async (leadData) => {
        const { user } = get()
        if (!user) return null

        const lead = {
            user_id: user.id,
            created_by: user.id,
            ...leadData,
            business_name: leadData.business_name || '',
            address: leadData.address || '',
            phone: leadData.phone || '',
            website: leadData.website || '',
            google_maps_url: leadData.google_maps_url || '',
            rating: parseFloat(leadData.rating) || 0,
            review_count: parseInt(leadData.review_count) || 0,
            business_type: leadData.business_type || '',
            types: leadData.types || [],
            place_id: leadData.place_id || null,
            has_website: leadData.has_website === 'True' || leadData.has_website === true || Boolean(leadData.website),
            contact_name: leadData.contact_name || '',
            contact_role: leadData.contact_role || '',
            email: leadData.email || '',
            secondary_phone: leadData.secondary_phone || '',
            preferred_contact: leadData.preferred_contact || 'phone',
            deal_value: leadData.deal_value || null,
            expected_close_date: leadData.expected_close_date || null,
            services: leadData.services || [],
            stage: leadData.stage || 'new',
            priority: leadData.priority || 'warm',
            tags: leadData.tags || [],
            lead_source: leadData.lead_source || 'automation',
            last_contact_date: leadData.last_contact_date || null,
            next_followup_date: leadData.next_followup_date || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }

        try {
            const { data, error } = await supabase
                .from('leads')
                .insert([lead])
                .select()
                .single()

            if (error) throw error
            const newLead = { ...data, notes: [], activities: [], files: [] }
            set((state) => ({ leads: [...state.leads, newLead] }))
            return newLead
        } catch (error) {
            console.error('Failed to add lead:', error)
            // If it's an abort error, it might be due to rapid state changes, try to log more info
            if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
                console.warn('Lead add was aborted. This usually happens during rapid UI transitions.')
            }
            return null
        }
    },

    // Import multiple leads
    importLeads: async (leadsData) => {
        const { user } = get()
        if (!user) return 0

        const existingLeads = get().leads
        const existingPhones = new Map(existingLeads.map(l => [l.phone, l]).filter(([p]) => p))
        const existingNames = new Map(existingLeads.map(l => [l.business_name?.toLowerCase(), l]).filter(([n]) => n))

        let updatedCount = 0
        const newLeads = []

        for (const leadData of leadsData) {
            const phoneMatch = leadData.phone && existingPhones.get(leadData.phone)
            const nameMatch = leadData.business_name && existingNames.get(leadData.business_name.toLowerCase())
            const match = phoneMatch || nameMatch

            if (match) {
                // Patch existing lead
                if (!match.place_id && leadData.place_id) {
                    await get().updateLead(match.id, { place_id: leadData.place_id })
                    updatedCount++
                }
                continue
            }

            // Parse business type
            let bType = leadData.business_type || ''
            if (typeof bType === 'string' && bType.startsWith('[') && bType.endsWith(']')) {
                bType = bType.slice(1, -1).replace(/['"]/g, '').trim()
            }

            newLeads.push({
                user_id: user.id,
                created_by: user.id,
                business_name: leadData.business_name || '',
                address: leadData.address || '',
                phone: leadData.phone || '',
                website: leadData.website || '',
                google_maps_url: leadData.google_maps_url || '',
                rating: parseFloat(leadData.rating) || 0,
                review_count: parseInt(leadData.review_count) || 0,
                business_type: bType,
                types: Array.isArray(leadData.types) ? leadData.types : [],
                place_id: leadData.place_id || null,
                has_website: leadData.has_website === 'True' || leadData.has_website === true,
                stage: 'new',
                priority: 'warm',
                lead_source: 'automation',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
        }

        if (newLeads.length > 0) {
            try {
                const { data, error } = await supabase
                    .from('leads')
                    .insert(newLeads)
                    .select()

                if (error) throw error
                const sanitizedNewLeads = data.map(l => ({ ...l, notes: [], activities: [], files: [] }))
                set((state) => ({ leads: [...state.leads, ...sanitizedNewLeads] }))
            } catch (error) {
                console.error('Bulk import failed:', error)
            }
        }

        return newLeads.length + updatedCount
    },

    // Update a lead
    updateLead: async (id, updates) => {
        try {
            const updated_at = new Date().toISOString()
            const { error } = await supabase
                .from('leads')
                .update({ ...updates, updated_at })
                .eq('id', id)

            if (error) throw error
            set((state) => ({
                leads: state.leads.map(lead =>
                    lead.id === id ? { ...lead, ...updates, updated_at } : lead
                )
            }))
        } catch (error) {
            console.error('Failed to update lead:', error)
        }
    },

    // Update a single field (for inline editing)
    updateLeadField: async (id, field, value) => {
        const lead = get().getLeadById(id)
        if (!lead) return

        const oldValue = lead[field]
        const updated_at = new Date().toISOString()

        try {
            const { error } = await supabase
                .from('leads')
                .update({ [field]: value, updated_at })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                leads: state.leads.map(l =>
                    l.id === id
                        ? { ...l, [field]: value, updated_at }
                        : l
                )
            }))

            // Add activity for important field changes
            if (['contact_name', 'deal_value', 'email'].includes(field) && oldValue !== value) {
                get().addActivity(id, 'note', `Updated ${field.replace('_', ' ')}: ${value || 'cleared'}`)
            }
        } catch (error) {
            console.error('Failed to update lead field:', error)
        }
    },

    // Update lead stage
    updateLeadStage: async (id, stage) => {
        const lead = get().getLeadById(id)
        if (!lead) return

        const oldStage = STAGES.find(s => s.id === lead.stage)
        const newStage = STAGES.find(s => s.id === stage)
        const updated_at = new Date().toISOString()

        try {
            const { error } = await supabase
                .from('leads')
                .update({ stage, updated_at })
                .eq('id', id)

            if (error) throw error

            set((state) => ({
                leads: state.leads.map(lead =>
                    lead.id === id
                        ? { ...lead, stage, updated_at }
                        : lead
                )
            }))

            // Add stage change activity
            if (oldStage && newStage && oldStage.id !== newStage.id) {
                get().addActivity(id, 'stage_change', `Stage changed from "${oldStage.label}" to "${newStage.label}"`)
            }
        } catch (error) {
            console.error('Failed to update lead stage:', error)
        }
    },

    // Add note to lead
    addNote: async (leadId, content) => {
        const { user } = get()
        if (!user) return null

        try {
            const { data, error } = await supabase
                .from('notes')
                .insert([{ lead_id: leadId, user_id: user.id, content }])
                .select()
                .single()

            if (error) throw error

            set((state) => ({
                leads: state.leads.map(lead =>
                    lead.id === leadId
                        ? { ...lead, notes: [...(lead.notes || []), data], updated_at: new Date().toISOString() }
                        : lead
                )
            }))
            // Also add to activity timeline
            get().addActivity(leadId, 'note', content)
            return data
        } catch (error) {
            console.error('Failed to add note:', error)
            return null
        }
    },

    // Delete note from lead
    deleteNote: async (leadId, noteId) => {
        try {
            const { error } = await supabase.from('notes').delete().eq('id', noteId)
            if (error) throw error

            set((state) => ({
                leads: state.leads.map(lead =>
                    lead.id === leadId
                        ? { ...lead, notes: (lead.notes || []).filter(n => n.id !== noteId) }
                        : lead
                )
            }))
        } catch (error) {
            console.error('Failed to delete note:', error)
        }
    },

    // Add activity to timeline
    addActivity: async (leadId, type, description, metadata = {}) => {
        const { user } = get()
        if (!user) return null

        try {
            const { data, error } = await supabase
                .from('activities')
                .insert([{ lead_id: leadId, user_id: user.id, type, description, metadata }])
                .select()
                .single()

            if (error) throw error

            set((state) => ({
                leads: state.leads.map(lead =>
                    lead.id === leadId
                        ? {
                            ...lead,
                            activities: [...(lead.activities || []), data],
                            last_contact_date: ['call', 'email', 'meeting'].includes(type)
                                ? new Date().toISOString()
                                : lead.last_contact_date,
                            updated_at: new Date().toISOString()
                        }
                        : lead
                )
            }))
            return data
        } catch (error) {
            console.error('Failed to add activity:', error)
            return null
        }
    },

    // Add file to lead
    addFile: async (leadId, fileData) => {
        const { user } = get()
        // Ensure user exists before trying to upload
        if (!user) {
            console.error('Failed to add file: No user logged in')
            return null
        }

        const file = {
            lead_id: leadId,
            user_id: user.id,
            name: fileData.name,
            type: fileData.type,
            size: fileData.size,
            url: fileData.url, // base64 or blob URL
            uploaded_at: new Date().toISOString(),
        }

        try {
            const { data, error } = await supabase
                .from('files')
                .insert([file])
                .select()
                .single()

            if (error) {
                console.error('Supabase insert error payload:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                })
                throw error
            }

            set((state) => ({
                leads: state.leads.map(lead =>
                    lead.id === leadId
                        ? {
                            ...lead,
                            files: [...(lead.files || []), data],
                            updated_at: new Date().toISOString()
                        }
                        : lead
                )
            }))

            // Add activity
            get().addActivity(leadId, 'file', `Added file: ${fileData.name}`)

            return data
        } catch (error) {
            // Log full error object for debugging
            console.error('Failed to add file:', JSON.stringify(error, null, 2))
            return null
        }
    },

    // Delete file from lead
    deleteFile: async (leadId, fileId) => {
        const lead = get().getLeadById(leadId)
        const file = lead?.files?.find(f => f.id === fileId)

        try {
            const { error } = await supabase
                .from('files')
                .delete()
                .eq('id', fileId)

            if (error) throw error

            set((state) => ({
                leads: state.leads.map(lead =>
                    lead.id === leadId
                        ? { ...lead, files: (lead.files || []).filter(f => f.id !== fileId) }
                        : lead
                )
            }))

            if (file) {
                get().addActivity(leadId, 'note', `Removed file: ${file.name}`)
            }
        } catch (error) {
            console.error('Failed to delete file:', error)
        }
    },

    // Log a call
    logCall: (leadId, notes, metadata = {}) => {
        const lead = get().getLeadById(leadId)
        if (!lead) return

        const activity = get().addActivity(leadId, 'call', notes || 'Made a phone call', metadata)

        // Auto-create calendar event for the call
        if (metadata.duration) {
            const now = new Date()
            const startTime = new Date(now.getTime() - (metadata.duration * 1000))

            get().addEvent({
                title: `Call: ${lead.business_name}`,
                start: startTime.toISOString(),
                end: now.toISOString(),
                type: 'call',
                leadId: leadId,
                activityId: activity.id,
                notes: notes
            })
        }

        // Handle scheduled follow-up
        if (metadata.scheduledFollowup) {
            get().updateLead(leadId, {
                next_followup_date: metadata.scheduledFollowup
            })

            get().addEvent({
                title: `Follow-up: ${lead.business_name}`,
                start: metadata.scheduledFollowup,
                end: new Date(new Date(metadata.scheduledFollowup).getTime() + 30 * 60000).toISOString(), // 30 min duration default
                type: 'planned_call',
                leadId: leadId,
                activityId: activity.id, // Linked for deduplication
                notes: 'Scheduled follow-up'
            })
        }
    },

    // Log an email
    logEmail: (leadId, subject) => {
        get().addActivity(leadId, 'email', subject || 'Sent an email')
    },

    // Schedule/log a meeting
    logMeeting: async (leadId, details, metadata = {}) => {
        const lead = get().getLeadById(leadId)
        if (!lead) return

        const activity = await get().addActivity(leadId, 'meeting', details || 'Had a meeting', metadata)

        if (metadata.scheduledTime && activity) {
            get().addEvent({
                title: `Meeting: ${lead.business_name}`,
                start: metadata.scheduledTime,
                end: metadata.endTime || new Date(new Date(metadata.scheduledTime).getTime() + 60 * 60000).toISOString(),
                type: 'meeting',
                leadId: leadId,
                activityId: activity.id, // Linked for deduplication
                notes: details
            })
        }
    },

    // Event management
    addEvent: async (eventData) => {
        const { user } = get()
        if (!user) return null

        try {
            const eventPayload = {
                user_id: user.id,
                title: eventData.title,
                description: eventData.notes || eventData.description, // Map notes to description if needed, or keep notes
                start_time: eventData.start, // Map start to start_time (common convention) or keep start
                end_time: eventData.end,   // Map end to end_time
                type: eventData.type,
                lead_id: eventData.leadId, // Map camelCase to snake_case
                metadata: eventData.metadata || {}
            }

            // The error explicitly says "null value in column 'start_time'"
            // This means the DB expects 'start_time' (and likely 'end_time'), NOT 'start'/'end'.
            const dbPayload = {
                user_id: user.id,
                title: eventData.title,
                start_time: eventData.start,
                end_time: eventData.end,
                type: eventData.type,
                notes: eventData.notes || eventData.description,
                lead_id: eventData.leadId
            }

            const { data, error } = await supabase
                .from('events')
                .insert([dbPayload])
                .select()
                .single()

            if (error) throw error
            set((state) => ({ events: [...state.events, data] }))
            return data
        } catch (error) {
            console.error('Failed to add event:', error)
            return null
        }
    },

    updateEvent: async (id, updates) => {
        try {
            const { error } = await supabase.from('events').update(updates).eq('id', id)
            if (error) throw error

            set((state) => ({
                events: state.events.map(e => e.id === id ? { ...e, ...updates } : e)
            }))
        } catch (error) {
            console.error('Failed to update event:', error)
        }
    },

    deleteEvent: async (id) => {
        try {
            const { error } = await supabase.from('events').delete().eq('id', id)
            if (error) throw error

            set((state) => ({
                events: state.events.filter(e => e.id !== id)
            }))
        } catch (error) {
            console.error('Failed to delete event:', error)
        }
    },

    // Delete multiple leads
    deleteLeads: async (ids) => {
        try {
            const { error } = await supabase.from('leads').delete().in('id', ids)
            if (error) throw error

            set((state) => ({
                leads: state.leads.filter(lead => !ids.includes(lead.id))
            }))
        } catch (error) {
            console.error('Failed to delete leads:', error)
        }
    },

    // Delete a lead
    deleteLead: async (id) => {
        try {
            const { error } = await supabase.from('leads').delete().eq('id', id)
            if (error) throw error

            set((state) => ({
                leads: state.leads.filter(lead => lead.id !== id)
            }))
        } catch (error) {
            console.error('Failed to delete lead:', error)
        }
    },

    // Get lead by ID
    getLeadById: (id) => get().leads.find(lead => lead.id === id),

    // Get filtered and sorted leads
    getFilteredLeads: () => {
        const {
            leads, searchQuery, filterStage, filterPriority,
            filterWebsite, filterMinRating, filterMinReviews,
            filterIndustry, filterDateRange, filterHasPhone,
            filterHasEmail, filterNeedsAttention, sortBy, sortOrder
        } = get()

        let filtered = [...leads]

        // Apply agent filter (from Team page)
        const filterAgent = get().filterAgent
        if (filterAgent) {
            filtered = filtered.filter(lead => lead.user_id === filterAgent)
        }

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(lead =>
                lead.business_name?.toLowerCase().includes(query) ||
                lead.phone?.includes(query) ||
                lead.address?.toLowerCase().includes(query) ||
                lead.business_type?.toLowerCase().includes(query) ||
                lead.contact_name?.toLowerCase().includes(query) ||
                lead.email?.toLowerCase().includes(query)
            )
        }

        // Apply stage filter
        if (filterStage !== 'all') {
            filtered = filtered.filter(lead => lead.stage === filterStage)
        }

        // Apply priority filter
        if (filterPriority !== 'all') {
            filtered = filtered.filter(lead => lead.priority === filterPriority)
        }

        // Apply website filter
        if (filterWebsite === 'has_website') {
            filtered = filtered.filter(lead => lead.has_website)
        } else if (filterWebsite === 'no_website') {
            filtered = filtered.filter(lead => !lead.has_website)
        }

        // Apply rating filter
        if (filterMinRating > 0) {
            filtered = filtered.filter(lead => lead.rating >= filterMinRating)
        }

        // Apply reviews filter
        if (filterMinReviews > 0) {
            filtered = filtered.filter(lead => lead.review_count >= filterMinReviews)
        }

        // Apply industry filter
        if (filterIndustry !== 'all') {
            filtered = filtered.filter(lead => lead.business_type === filterIndustry)
        }

        // Apply phone status filter
        if (filterHasPhone === 'has_phone') {
            filtered = filtered.filter(lead => !!lead.phone)
        } else if (filterHasPhone === 'no_phone') {
            filtered = filtered.filter(lead => !lead.phone)
        }

        // Apply email status filter
        if (filterHasEmail === 'has_email') {
            filtered = filtered.filter(lead => !!lead.email)
        } else if (filterHasEmail === 'no_email') {
            filtered = filtered.filter(lead => !lead.email)
        }

        // Apply date range filter
        if (filterDateRange !== 'all') {
            const now = new Date()
            let startDate = new Date()

            if (filterDateRange === 'today') {
                startDate.setHours(0, 0, 0, 0)
            } else if (filterDateRange === 'week') {
                startDate.setDate(now.getDate() - 7)
            } else if (filterDateRange === 'month') {
                startDate.setMonth(now.getMonth() - 1)
            }

            filtered = filtered.filter(lead => new Date(lead.created_at) >= startDate)
        }

        // Apply needs attention filter
        if (filterNeedsAttention) {
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            filtered = filtered.filter(lead => {
                if (['won', 'lost'].includes(lead.stage)) return false
                const lastContact = lead.last_contact_date ? new Date(lead.last_contact_date) : new Date(lead.created_at)
                return lastContact < sevenDaysAgo
            })
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aVal = a[sortBy]
            let bVal = b[sortBy]

            if (sortBy === 'rating' || sortBy === 'review_count' || sortBy === 'deal_value') {
                aVal = Number(aVal) || 0
                bVal = Number(bVal) || 0
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase()
                bVal = bVal?.toLowerCase() || ''
            }

            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1
            } else {
                return aVal < bVal ? 1 : -1
            }
        })

        return filtered
    },

    // Get leads by stage (for pipeline)
    getLeadsByStage: (stage) => get().leads.filter(lead => lead.stage === stage),

    // Get stats for dashboard
    getStats: () => {
        const leads = get().leads

        // Calculate won and lost deals
        const wonDeals = leads.filter(l => l.stage === 'won')
        const lostDeals = leads.filter(l => l.stage === 'lost')
        const activeDeals = leads.filter(l => !['won', 'lost'].includes(l.stage))
        const closedDeals = [...wonDeals, ...lostDeals]

        // Calculate pipeline value (deals with value that are not won/lost)
        const pipelineValue = activeDeals.reduce((sum, l) => {
            const value = parseFloat(l.deal_value) || 0
            const stage = STAGES.find(s => s.id === l.stage)
            const probability = stage?.probability || 0
            return sum + (value * probability / 100) // Weighted by probability
        }, 0)

        // Total potential (all active deal values)
        const totalPotential = activeDeals.reduce((sum, l) => sum + (parseFloat(l.deal_value) || 0), 0)

        // Revenue won
        const revenueWon = wonDeals.reduce((sum, l) => sum + (parseFloat(l.deal_value) || 0), 0)

        // Revenue lost
        const revenueLost = lostDeals.reduce((sum, l) => sum + (parseFloat(l.deal_value) || 0), 0)

        // Conversion rate (won / leads in proposal, won, or lost stages)
        const proposalLeads = leads.filter(l => l.stage === 'proposal')
        const proposalPlusClosedCount = proposalLeads.length + wonDeals.length + lostDeals.length
        const conversionRate = proposalPlusClosedCount > 0
            ? Math.round((wonDeals.length / proposalPlusClosedCount) * 100)
            : 0

        // Leads without website (opportunities!)
        const noWebsiteLeads = leads.filter(l => !l.has_website)

        // Hot leads count
        const hotLeads = activeDeals.filter(l => l.priority === 'hot')

        // This month's leads
        const thisMonth = new Date()
        thisMonth.setDate(1)
        thisMonth.setHours(0, 0, 0, 0)
        const leadsThisMonth = leads.filter(l => new Date(l.created_at) >= thisMonth)

        // Stages in active pipeline (contacted, interested, meeting, proposal)
        const inPipeline = leads.filter(l => ['contacted', 'interested', 'meeting', 'proposal'].includes(l.stage))

        const stats = {
            total: leads.length,
            byStage: {},
            withWebsite: leads.filter(l => l.has_website).length,
            withPhone: leads.filter(l => l.phone).length,
            averageRating: 0,

            // Sales KPIs
            pipelineValue: Math.round(pipelineValue),
            totalPotential: Math.round(totalPotential),
            revenueWon: Math.round(revenueWon),
            revenueLost: Math.round(revenueLost),
            conversionRate,

            // Lead counts
            activeDeals: activeDeals.length,
            wonDeals: wonDeals.length,
            lostDeals: lostDeals.length,
            inPipeline: inPipeline.length,
            hotLeads: hotLeads.length,
            noWebsiteLeads: noWebsiteLeads.length,
            leadsThisMonth: leadsThisMonth.length,

            // Recent
            recentLeads: leads
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 20),
        }

        // Count by stage
        STAGES.forEach(stage => {
            stats.byStage[stage.id] = leads.filter(l => l.stage === stage.id).length
        })

        // Calculate average rating
        const rated = leads.filter(l => l.rating > 0)
        if (rated.length > 0) {
            stats.averageRating = (rated.reduce((sum, l) => sum + l.rating, 0) / rated.length).toFixed(1)
        }

        // Website opportunities (leads without website, not closed)
        stats.websiteOpportunities = leads
            .filter(l => !l.has_website && !['won', 'lost'].includes(l.stage))
            .sort((a, b) => b.rating - a.rating)

        // Leads needing attention (no contact in 7+ days, not closed)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        stats.needsAttention = leads
            .filter(l => {
                if (['won', 'lost'].includes(l.stage)) return false
                const lastContact = l.last_contact_date ? new Date(l.last_contact_date) : new Date(l.created_at)
                return lastContact < sevenDaysAgo
            })
            .sort((a, b) => {
                const aDate = a.last_contact_date ? new Date(a.last_contact_date) : new Date(a.created_at)
                const bDate = b.last_contact_date ? new Date(b.last_contact_date) : new Date(b.created_at)
                return aDate - bDate // Oldest first
            })
            .slice(0, 5)

        // Activity summary (count activities by type this week)
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const allActivities = leads.flatMap(l => l.activities || [])
        const recentActivities = allActivities.filter(a => new Date(a.created_at) >= oneWeekAgo)

        stats.activitySummary = {
            calls: recentActivities.filter(a => a.type === 'call').length,
            emails: recentActivities.filter(a => a.type === 'email').length,
            meetings: recentActivities.filter(a => a.type === 'meeting').length,
            notes: recentActivities.filter(a => a.type === 'note').length,
            stageChanges: recentActivities.filter(a => a.type === 'stage_change').length,
            files: recentActivities.filter(a => a.type === 'file').length,
            total: recentActivities.length
        }

        return stats
    },

    // Get detailed analytics data for charts with dynamic trends
    getAnalyticsData: (days = 30) => {
        const leads = get().leads
        const now = new Date()

        // Helper to get leads in a date range
        const getLeadsInRange = (start, end) => {
            return leads.filter(l => {
                const date = new Date(l.created_at)
                return date >= start && date <= end
            })
        }

        // Define periods
        const currentStart = new Date(now)
        currentStart.setDate(currentStart.getDate() - days)
        const previousStart = new Date(currentStart)
        previousStart.setDate(previousStart.getDate() - days)

        const currentLeads = getLeadsInRange(currentStart, now)
        const previousLeads = getLeadsInRange(previousStart, currentStart)

        // 1. Calculate Growth Trends
        const calculateGrowth = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0
            return Math.round(((current - previous) / previous) * 100)
        }

        // 2. Leads Trend (Grouped by Day)
        const leadsByDay = {}
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now)
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]
            leadsByDay[dateStr] = 0
        }

        currentLeads.forEach(l => {
            const dateStr = new Date(l.created_at).toISOString().split('T')[0]
            if (leadsByDay[dateStr] !== undefined) leadsByDay[dateStr]++
        })

        const leadsTrend = Object.entries(leadsByDay).map(([date, count]) => ({
            date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            leads: count
        }))

        // 3. Outcomes Trend (Won vs Lost)
        const outcomesTrend = []
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now)
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]
            const dLeads = currentLeads.filter(l => new Date(l.updated_at).toISOString().split('T')[0] === dateStr)

            outcomesTrend.push({
                date: new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                won: dLeads.filter(l => l.stage === 'won').length,
                lost: dLeads.filter(l => l.stage === 'lost').length
            })
        }

        // 4. Revenue Trend
        const revenueTrend = []
        let cumWon = 0
        let cumPipe = 0

        // Sort by date for cumulative
        const sortedLeads = [...currentLeads].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

        // Group by day or week depending on range
        const interval = days > 30 ? 7 : 1
        const groupings = {}

        sortedLeads.forEach(l => {
            const d = new Date(l.created_at)
            let key = d.toISOString().split('T')[0]
            if (interval === 7) {
                const week = Math.ceil(d.getDate() / 7)
                key = `${d.getFullYear()}-${d.getMonth()}-W${week}`
            }

            if (!groupings[key]) groupings[key] = { won: 0, pipeline: 0, date: d }
            const val = parseFloat(l.deal_value) || 0
            if (l.stage === 'won') groupings[key].won += val
            else if (!['won', 'lost'].includes(l.stage)) {
                const stage = STAGES.find(s => s.id === l.stage)
                groupings[key].pipeline += (val * (stage?.probability || 0) / 100)
            }
        })

        Object.values(groupings).forEach(g => {
            cumWon += g.won
            cumPipe += g.pipeline
            revenueTrend.push({
                name: g.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                won: Math.round(cumWon),
                pipeline: Math.round(cumPipe)
            })
        })

        // 5. KPI Calculations
        const currentWon = currentLeads.filter(l => l.stage === 'won')
        const previousWon = previousLeads.filter(l => l.stage === 'won')

        const currentRevenue = currentWon.reduce((s, l) => s + (parseFloat(l.deal_value) || 0), 0)
        const previousRevenue = previousWon.reduce((s, l) => s + (parseFloat(l.deal_value) || 0), 0)

        // Conversion rate helper
        const getConvRate = (lList) => {
            const won = lList.filter(l => l.stage === 'won').length
            const totalClosed = lList.filter(l => ['won', 'lost'].includes(l.stage)).length
            return totalClosed > 0 ? Math.round((won / totalClosed) * 100) : 0
        }

        // 6. Industry/Source Performance & Radar Data
        const sources = {}
        leads.forEach(l => {
            const src = l.lead_source || 'Unknown'
            if (!sources[src]) sources[src] = { name: src, value: 0, won: 0, totalVal: 0 }
            sources[src].value++
            if (l.stage === 'won') {
                sources[src].won++
                sources[src].totalVal += parseFloat(l.deal_value) || 0
            }
        })

        const industries = {}
        leads.forEach(l => {
            const ind = l.business_type || 'Other'
            if (!industries[ind]) industries[ind] = { name: ind, leads: 0, won: 0 }
            industries[ind].leads++
            if (l.stage === 'won') industries[ind].won++
        })

        const industryConvData = Object.values(industries)
            .sort((a, b) => b.leads - a.leads)
            .slice(0, 6)
            .map(ind => ({
                name: ind.name,
                leads: ind.leads,
                conversion: ind.leads > 0 ? Math.round((ind.won / ind.leads) * 100) : 0
            }))

        // 7. Stage Velocity (Avg days spent in each stage)
        const stageVelocity = STAGES.map(s => {
            const leadsInStage = leads.filter(l => l.stage === s.id)
            let avgDays = 0
            if (leadsInStage.length > 0) {
                const total = leadsInStage.reduce((sum, l) => {
                    const start = new Date(l.created_at)
                    const end = l.updated_at ? new Date(l.updated_at) : now
                    return sum + (end - start)
                }, 0)
                avgDays = Math.round(total / (leadsInStage.length * 1000 * 60 * 60 * 24))
            }
            return { stage: s.label, days: avgDays }
        })

        // 8. Sales Cycle
        const getAvgCycle = (lList) => {
            const won = lList.filter(l => l.stage === 'won')
            if (won.length === 0) return 0
            const total = won.reduce((s, l) => s + (new Date(l.updated_at) - new Date(l.created_at)), 0)
            return Math.round(total / (won.length * 1000 * 60 * 60 * 24))
        }

        return {
            kpis: {
                revenue: {
                    value: currentRevenue,
                    trend: calculateGrowth(currentRevenue, previousRevenue)
                },
                leads: {
                    value: currentLeads.length,
                    trend: calculateGrowth(currentLeads.length, previousLeads.length)
                },
                conversion: {
                    value: getConvRate(currentLeads),
                    trend: calculateGrowth(getConvRate(currentLeads), getConvRate(previousLeads))
                },
                cycle: {
                    value: getAvgCycle(currentLeads),
                    trend: calculateGrowth(getAvgCycle(currentLeads), getAvgCycle(previousLeads)) * -1 // Lower is better
                }
            },
            leadsTrend,
            outcomesTrend,
            revenueTrend,
            industryPerformance: industryConvData,
            industryData: Object.values(industries).sort((a, b) => b.leads - a.leads).slice(0, 5).map(i => ({ name: i.name, value: i.leads })),
            stageVelocity,
            stageData: STAGES.map(s => ({
                name: s.label,
                value: leads.filter(l => l.stage === s.id).length,
                color: s.color
            })).filter(s => s.value > 0)
        }
    },
}))

export default useStore
