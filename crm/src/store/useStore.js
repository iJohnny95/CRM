import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

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
    isLoading: false,
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
        set({ user: null, profile: null, leads: [], events: [] })
    },

    // Private property to track auth listener
    _authListener: null,

    // Initialize Auth listener
    initAuth: () => {
        // Prevent multiple listeners during HMR or re-renders
        if (get()._authListener) return

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const user = session?.user || null

            // Handle Logout
            if (!user) {
                set({ user: null, profile: null, leads: [], events: [], initialized: false, isLoading: false })
                return
            }

            // Handle Login / Session Change
            set({ user }) // Set user immediately

            // Fetch profile if not present
            if (!get().profile) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    set({ profile })
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
                    if (newProfile) set({ profile: newProfile })
                }
            }
        })

        set({ _authListener: subscription })
    },

    // Fetch initial data from Supabase
    fetchInitialData: async () => {
        const { user, profile, initialized, isLoading } = get()
        if (!user || initialized) return

        set({ isLoading: true, error: null })
        try {
            const isAdmin = profile?.role === 'admin'

            // Fetch leads, events, and scripts concurrently
            const [leadsRes, eventsRes, scriptsRes] = await Promise.all([
                supabase.from('leads').select('*, activities(*), notes(*), files(*)'),
                supabase.from('events').select('*'),
                supabase.from('scripts').select('*, script_steps(*)')
            ])

            if (leadsRes && leadsRes.error) console.error('Error fetching leads:', leadsRes.error)
            if (eventsRes && eventsRes.error) console.error('Error fetching events:', eventsRes.error)
            if (scriptsRes && scriptsRes.error) console.error('Error fetching scripts:', scriptsRes.error)

            // If admin, also fetch users
            if (isAdmin) {
                await get().fetchUsers()
            }

            // Sanitize leads (ensure missing properties are initialized)
            const leads = (leadsRes?.data || []).map(lead => ({
                ...lead,
                notes: lead.notes || [],
                activities: lead.activities || [],
                files: lead.files || [],
                tags: lead.tags || [],
                services: lead.services || [],
            }))

            set({
                leads,
                events: eventsRes?.data || [],
                scripts: scriptsRes?.data || [],
                activeScriptId: scriptsRes?.data?.find(s => s.is_primary)?.id || (scriptsRes?.data?.length > 0 ? scriptsRes.data[0].id : null),
                isLoading: false,
                initialized: true
            })
        } catch (error) {
            console.error('Fetch initial data failed:', error)
            set({ error: error.message, isLoading: false, initialized: true }) // Set initialized to true anyway to break retry loop
        }
    },

    // Computed: Get all calendar events including historical lead activities
    getAllCalendarEvents: () => {
        const leads = get().leads
        const manualEvents = get().events

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
    setSortBy: (field) => set({ sortBy: field }),
    setSortOrder: (order) => set({ sortOrder: order }),

    // Script Actions
    addScript: (script) => set((state) => {
        const newScript = { ...script, id: generateId() }
        // If it's the first script, make it active/primary
        if (state.scripts.length === 0) {
            newScript.isPrimary = true
            return { scripts: [newScript], activeScriptId: newScript.id }
        }
        return { scripts: [...state.scripts, newScript] }
    }),
    updateScript: (id, updates) => set((state) => ({
        scripts: state.scripts.map(s => s.id === id ? { ...s, ...updates } : s)
    })),
    deleteScript: (id) => set((state) => {
        const newScripts = state.scripts.filter(s => s.id !== id)
        // If we deleted the active script, reset to the first available or null
        let newActiveId = state.activeScriptId
        if (id === state.activeScriptId) {
            newActiveId = newScripts.length > 0 ? newScripts[0].id : null
        }
        return { scripts: newScripts, activeScriptId: newActiveId }
    }),
    setActiveScript: (id) => set({ activeScriptId: id }),
    setPrimaryScript: (id) => set((state) => ({
        scripts: state.scripts.map(s => ({
            ...s,
            isPrimary: s.id === id
        }))
    })),
    reorderScripts: (scripts) => set({ scripts }),

    // Add a single lead
    addLead: async (leadData) => {
        const { user } = get()
        if (!user) return null

        const lead = {
            user_id: user.id,
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

        try {
            await fetch(`${API_URL}/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            })
            set((state) => ({
                leads: state.leads.map(l =>
                    l.id === id
                        ? { ...l, [field]: value, updated_at: new Date().toISOString() }
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

        try {
            await fetch(`${API_URL}/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage })
            })
            set((state) => ({
                leads: state.leads.map(lead =>
                    lead.id === id
                        ? { ...lead, stage, updated_at: new Date().toISOString() }
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
    addFile: (leadId, fileData) => {
        const file = {
            id: generateId(),
            name: fileData.name,
            type: fileData.type,
            size: fileData.size,
            url: fileData.url, // base64 or blob URL
            uploaded_at: new Date().toISOString(),
        }
        set((state) => ({
            leads: state.leads.map(lead =>
                lead.id === leadId
                    ? {
                        ...lead,
                        files: [...(lead.files || []), file],
                        updated_at: new Date().toISOString()
                    }
                    : lead
            )
        }))

        // Add activity
        get().addActivity(leadId, 'file', `Added file: ${fileData.name}`)

        return file
    },

    // Delete file from lead
    deleteFile: (leadId, fileId) => {
        const lead = get().getLeadById(leadId)
        const file = lead?.files?.find(f => f.id === fileId)

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
    logMeeting: (leadId, details, metadata = {}) => {
        const lead = get().getLeadById(leadId)
        if (!lead) return

        get().addActivity(leadId, 'meeting', details || 'Had a meeting', metadata)

        if (metadata.scheduledTime) {
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
            const { data, error } = await supabase
                .from('events')
                .insert([{ ...eventData, user_id: user.id }])
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
