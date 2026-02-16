import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
    ArrowLeft,
    Phone,
    Clock,
    MessageSquare,
    Check,
    X,
    Plus,
    Trash2,
    Edit3,
    ChevronDown,
    ChevronUp,
    Settings,
    Save,
    Play,
    FileText
} from 'lucide-react'
import useStore from '../store/useStore'
import { formatDistanceToNow } from 'date-fns'
import '../CallMode.css'

const DEFAULT_OBJECTIONS = [
    {
        id: 'no_time',
        label: "Não tenho tempo agora",
        response: "Perfeito, compreendo.\nSó para não o incomodar mais, qual seria a melhor hora para voltar a ligar?"
    },
    {
        id: 'send_email',
        label: "Mande email",
        response: "Envio sim, sem problema.\nSó para não lhe mandar algo genérico, prefere algo mais focado em atrair clientes ou em poupar tempo com automatismos?"
    },
    {
        id: 'have_website',
        label: "Já temos website",
        response: "Claro, a maioria já tem.\nA minha chamada não é sobre ter ou não site, é perceber se o site está mesmo a trazer contactos.\nHoje em dia, costuma receber pedidos pelo site ou mais por telefone?"
    },
    {
        id: 'have_someone',
        label: "Já temos quem trate disso",
        response: "Perfeito, faz todo o sentido.\nNormalmente falo com negócios que já têm alguém, mas que querem comparar ou melhorar resultados.\nHoje estão satisfeitos com os resultados ou é algo que nunca foi muito medido?"
    },
    {
        id: 'not_interested',
        label: "Não estamos interessados",
        response: "Perfeito, agradeço a franqueza.\nSó por curiosidade, é porque já têm isso resolvido ou porque não é prioridade neste momento?"
    },
    {
        id: 'no_budget',
        label: "Não temos orçamento",
        response: "Compreendo.\nPor isso é que normalmente começo por perceber se faz sentido, antes de falar em valores.\nSe não trouxer retorno, não vale a pena avançar."
    },
    {
        id: 'not_priority',
        label: "Isso agora não é prioridade",
        response: "Perfeito.\nE normalmente quando passa a ser prioridade, é por falta de clientes ou por falta de tempo?"
    },
    {
        id: 'too_busy',
        label: "Estamos cheios de trabalho",
        response: "Isso é ótimo sinal.\nMuitos negócios com quem trabalho estavam cheios, mas perdiam tempo em tarefas que podiam ser automatizadas.\nJá pensou nisso dessa forma?"
    },
    {
        id: 'who_is_this',
        label: "Quem é você mesmo?",
        response: "[Seu Nome], trabalho com negócios locais aqui da zona a melhorar presença online e contacto com clientes."
    }
]

const CALL_OUTCOMES = [
    { id: 'no_answer', label: 'No Answer', color: '#6b7280' },
    { id: 'left_voicemail', label: 'Left Voicemail', color: '#f59e0b' },
    { id: 'interested', label: 'Interested', color: '#3b82f6' },
    { id: 'meeting_booked', label: 'Meeting Booked', color: '#8b5cf6' },
    { id: 'not_interested', label: 'Not Interested', color: '#ef4444' },
    { id: 'wrong_number', label: 'Wrong Number', color: '#ef4444' },
    { id: 'callback_later', label: 'Call Back Later', color: '#f59e0b' },
]

const SCRIPT_VARIABLES = [
    { label: 'Nome Contacto', value: '{{nome}}', field: 'contact_name' },
    { label: 'Nome Empresa', value: '{{empresa}}', field: 'business_name' },
    { label: 'Indústria', value: '{{industria}}', field: 'industry' },
    { label: 'Cidade', value: '{{cidade}}', field: 'city' },
]

export default function CallModePage() {
    const { id } = useParams()
    const navigate = useNavigate()

    // Store access
    const lead = useStore(state => state.getLeadById(id))
    const logCall = useStore(state => state.logCall)
    const scripts = useStore(state => state.scripts || [])
    const activeScriptId = useStore(state => state.activeScriptId)
    const setActiveScript = useStore(state => state.setActiveScript)
    const addScript = useStore(state => state.addScript)
    const updateScript = useStore(state => state.updateScript)
    const deleteScript = useStore(state => state.deleteScript)
    const setPrimaryScript = useStore(state => state.setPrimaryScript)
    const reorderScripts = useStore(state => state.reorderScripts)

    // Local state
    const [callOutcome, setCallOutcome] = useState(CALL_OUTCOMES[0].id)
    const [callObservation, setCallObservation] = useState('')
    const [callAnswers, setCallAnswers] = useState({})
    const [elapsedTime, setElapsedTime] = useState(0)
    const [isScriptEditing, setIsScriptEditing] = useState(false)
    const [editedScript, setEditedScript] = useState(null)
    const [showScriptMenu, setShowScriptMenu] = useState(false)
    const [focusedInput, setFocusedInput] = useState(null) // { index, field }
    const [draggedScript, setDraggedScript] = useState(null)
    const [followupDate, setFollowupDate] = useState('')
    const [followupTime, setFollowupTime] = useState('')

    // Timer
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Initialize active script logic
    useEffect(() => {
        if (!activeScriptId && scripts.length > 0) {
            // Find primary or default to first
            const primary = scripts.find(s => s.isPrimary)
            setActiveScript(primary ? primary.id : scripts[0].id)
        }
    }, [activeScriptId, scripts, setActiveScript])

    const activeScript = scripts.find(s => s.id === activeScriptId) || scripts[0]

    // Initialize edit state when switching scripts
    useEffect(() => {
        if (activeScript) {
            setEditedScript(JSON.parse(JSON.stringify(activeScript)))
        }
    }, [activeScript])

    if (!lead) return <div className="page">Lead not found</div>

    // Format timer
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Stats
    const previousCalls = (lead.activities || []).filter(a => a.type === 'call')
    const lastCall = previousCalls.length > 0 ? previousCalls[previousCalls.length - 1] : null

    const handleSaveCall = () => {
        const outcomeLabel = CALL_OUTCOMES.find(o => o.id === callOutcome)?.label || callOutcome
        const metadata = { duration: elapsedTime }

        let description = `Call Outcome: ${outcomeLabel}\n`
        description += `Duration: ${formatTime(elapsedTime)}\n`

        if ((callOutcome === 'callback_later' || callOutcome === 'meeting_booked') && followupDate) {
            const scheduledDateTime = `${followupDate}T${followupTime || '09:00'}`
            if (callOutcome === 'callback_later') {
                metadata.scheduledFollowup = scheduledDateTime
                description += `Scheduled Call Back: ${new Date(scheduledDateTime).toLocaleString()}\n`
            } else {
                metadata.scheduledTime = scheduledDateTime
                description += `Meeting Booked: ${new Date(scheduledDateTime).toLocaleString()}\n`
            }
        }

        if (callObservation.trim()) {
            description += `Observation: ${callObservation}\n`
        }

        const answers = Object.entries(callAnswers).filter(([_, v]) => v && v.trim())
        if (answers.length > 0 && activeScript) {
            description += `\nScript Responses (${activeScript.name}):\n`
            answers.forEach(([stepId, value]) => {
                const step = activeScript.steps.find(s => s.id === stepId)
                if (step) {
                    description += `- ${step.question}: ${value}\n`
                }
            })
        }

        logCall(lead.id, description, metadata)

        // If meeting booked, also log meeting separately to ensure it's tracked as a meeting activity if needed
        if (callOutcome === 'meeting_booked' && followupDate) {
            const scheduledDateTime = `${followupDate}T${followupTime || '09:00'}`
            // useStore.logMeeting handles adding it to events
            useStore.getState().logMeeting(lead.id, `Meeting booked via call: ${callObservation}`, {
                scheduledTime: scheduledDateTime
            })
        }

        navigate(`/leads/${id}`)
    }

    const handleCreateScript = () => {
        const newScript = {
            name: 'Novo Script',
            steps: [
                { id: '1', text: 'Olá...', question: 'Questão?' }
            ]
        }
        addScript(newScript)
        // The store action should automatically set it as active if it's the first, 
        // but if not we might want to switch to it. 
        // For now user can switch manually.
    }

    const handleSaveScriptConfig = () => {
        if (editedScript) {
            updateScript(editedScript.id, editedScript)
            setIsScriptEditing(false)
        }
    }

    const handleStepChange = (index, field, value) => {
        if (!editedScript) return
        const newSteps = [...editedScript.steps]
        newSteps[index] = { ...newSteps[index], [field]: value }
        setEditedScript({ ...editedScript, steps: newSteps })
    }

    const handleAddStep = () => {
        if (!editedScript) return
        setEditedScript({
            ...editedScript,
            steps: [...editedScript.steps, { id: Date.now().toString(), text: '', question: '' }]
        })
    }

    const handleRemoveStep = (index) => {
        if (!editedScript) return
        const newSteps = editedScript.steps.filter((_, i) => i !== index)
        setEditedScript({ ...editedScript, steps: newSteps })
    }

    const handleInsertVariable = (variable) => {
        if (!editedScript || !focusedInput) return
        const { index, field } = focusedInput
        const currentText = editedScript.steps[index][field] || ''
        handleStepChange(index, field, currentText + variable)
    }

    const handleDragStart = (e, script) => {
        setDraggedScript(script)
        e.dataTransfer.effectAllowed = 'move'
        // e.target.style.opacity = '0.5' // Optional visual feedback
    }

    const handleDragOver = (e, targetScript) => {
        e.preventDefault()
        if (!draggedScript || draggedScript.id === targetScript.id) return

        const currentScripts = [...scripts]
        const draggedIndex = currentScripts.findIndex(s => s.id === draggedScript.id)
        const targetIndex = currentScripts.findIndex(s => s.id === targetScript.id)

        if (draggedIndex === -1 || targetIndex === -1) return

        // Swap directly in store for live feedback
        const newScripts = [...currentScripts]
        newScripts.splice(draggedIndex, 1)
        newScripts.splice(targetIndex, 0, draggedScript)

        reorderScripts(newScripts)
    }

    const handleDragEnd = (e) => {
        setDraggedScript(null)
        e.target.style.opacity = '1'
    }

    const replaceVariables = (text) => {
        if (!text) return ''
        let newText = text
        SCRIPT_VARIABLES.forEach(v => {
            const val = lead[v.field] || `[${v.label}]`
            newText = newText.replaceAll(v.value, val)
        })
        return newText
    }

    return (
        <div className="page call-mode-page">
            {/* Header */}
            <header className="call-header">
                <div className="header-left">
                    <Link to={`/leads/${id}`} className="back-link">
                        <ArrowLeft size={18} />
                        Back to Lead
                    </Link>
                    <div className="lead-info">
                        <h2>{lead.business_name}</h2>
                        {lead.contact_name && <span className="contact-name">{lead.contact_name}</span>}
                    </div>
                </div>
                <div className="header-timer">
                    <div className={`timer-badge ${elapsedTime > 300 ? 'warning' : ''}`}>
                        <div className="recording-dot"></div>
                        <span>{formatTime(elapsedTime)}</span>
                    </div>
                </div>
            </header>

            <div className="call-page-layout">
                {/* Left Sidebar: Settings & Stats */}
                <aside className="call-sidebar-left">
                    <div className="card sidebar-card script-selector-card">
                        <div className="card-header">
                            <h4><FileText size={16} /> Scripts</h4>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={handleCreateScript} title="New Script">
                                <Plus size={16} />
                            </button>
                        </div>

                        <div className="script-list">
                            {scripts.map(script => (
                                <div
                                    key={script.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, script)}
                                    onDragOver={(e) => handleDragOver(e, script)}
                                    onDragEnd={handleDragEnd}
                                    className={`script-option ${activeScriptId === script.id ? 'active' : ''}`}
                                    style={{ opacity: draggedScript?.id === script.id ? 0.5 : 1 }}
                                    onClick={() => setActiveScript(script.id)}
                                >
                                    <div className="script-option-header">
                                        <span style={{ color: activeScriptId === script.id ? 'var(--accent)' : 'inherit', fontWeight: activeScriptId === script.id ? '600' : '500' }}>
                                            {script.name}
                                        </span>
                                        {script.isPrimary && <span className="badge badge-xs">Active</span>}
                                    </div>
                                    {activeScriptId === script.id && (
                                        <div className="script-actions">
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <button
                                                    className={`btn btn-ghost btn-xs ${isScriptEditing ? 'active' : ''}`}
                                                    onClick={(e) => { e.stopPropagation(); setIsScriptEditing(!isScriptEditing); }}
                                                    title={isScriptEditing ? "Concluir Edição" : "Editar Script"}
                                                >
                                                    {isScriptEditing ? <Check size={14} /> : <Edit3 size={14} />}
                                                </button>
                                                {!script.isPrimary && !isScriptEditing && (
                                                    <button
                                                        className="btn btn-ghost btn-xs text-danger"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (window.confirm('Tem a certeza que quer eliminar este script?')) {
                                                                deleteScript(script.id)
                                                            }
                                                        }}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            {!script.isPrimary && (
                                                <button
                                                    className="btn btn-ghost btn-xs text-secondary"
                                                    onClick={(e) => { e.stopPropagation(); setPrimaryScript(script.id); }}
                                                    title="Set as Primary"
                                                >
                                                    Set Primary
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card sidebar-card stats-card">
                        <h4><Clock size={16} /> History</h4>
                        <div className="stat-row">
                            <span className="stat-label">Total Calls</span>
                            <span className="stat-value">{previousCalls.length}</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Last Outcome</span>
                            <span className="stat-value">
                                {lastCall ? (
                                    <span
                                        className="badge badge-sm"
                                        style={{
                                            backgroundColor: CALL_OUTCOMES.find(o => o.label === lastCall.description?.split('\n')[0]?.replace('Call Outcome: ', ''))?.color + '20',
                                            color: CALL_OUTCOMES.find(o => o.label === lastCall.description?.split('\n')[0]?.replace('Call Outcome: ', ''))?.color
                                        }}
                                    >
                                        {lastCall.description?.split('\n')[0]?.replace('Call Outcome: ', '') || 'Unknown'}
                                    </span>
                                ) : 'None'}
                            </span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Last Call</span>
                            <span className="stat-value">
                                {lastCall ? formatDistanceToNow(new Date(lastCall.created_at)) + ' ago' : '-'}
                            </span>
                        </div>
                    </div>
                </aside>

                {/* Center: Script */}
                <main className="call-main">
                    <div className="card script-card">
                        {isScriptEditing && editedScript ? (
                            <div className="script-editor">
                                <div className="variables-toolbar">
                                    <span className="text-xs font-bold text-secondary uppercase mr-2">Inserir:</span>
                                    {SCRIPT_VARIABLES.map(v => (
                                        <button
                                            key={v.value}
                                            className="badge badge-outline cursor-pointer hover:bg-slate-100"
                                            onClick={() => handleInsertVariable(v.value)}
                                            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
                                        >
                                            {v.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="form-group">
                                    <label>Script Name</label>
                                    <input
                                        className="input"
                                        value={editedScript.name}
                                        onChange={(e) => setEditedScript({ ...editedScript, name: e.target.value })}
                                    />
                                </div>
                                <div className="script-steps-edit">
                                    {editedScript.steps.map((step, idx) => (
                                        <div key={step.id} className="edit-step-item" style={focusedInput?.index === idx ? { borderColor: 'var(--accent)' } : {}}>
                                            <div className="edit-step-header">
                                                <span>Step {idx + 1}</span>
                                                <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => handleRemoveStep(idx)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <textarea
                                                className="input textarea"
                                                placeholder="Script text... (Use variaveis como {{nome}})"
                                                value={step.text}
                                                onChange={(e) => handleStepChange(idx, 'text', e.target.value)}
                                                onFocus={() => setFocusedInput({ index: idx, field: 'text' })}
                                            />
                                            <input
                                                className="input"
                                                placeholder="Question/Data to capture..."
                                                value={step.question}
                                                onChange={(e) => handleStepChange(idx, 'question', e.target.value)}
                                                onFocus={() => setFocusedInput({ index: idx, field: 'question' })}
                                            />
                                        </div>
                                    ))}
                                    <button className="btn btn-secondary full-width" onClick={handleAddStep}>
                                        <Plus size={14} /> Add Step
                                    </button>
                                </div>
                                <div className="editor-actions">
                                    <button className="btn btn-secondary" onClick={() => { setIsScriptEditing(false); setEditedScript(JSON.parse(JSON.stringify(activeScript))); }}>Cancel</button>
                                    <button className="btn btn-primary" onClick={handleSaveScriptConfig}>Save Changes</button>
                                </div>
                            </div>
                        ) : (
                            <div className="script-viewer">
                                <div className="script-header">
                                    <h3>{activeScript?.name}</h3>
                                    {/* Replace variables could go here */}
                                </div>
                                <div className="script-steps-list">
                                    {activeScript?.steps.map((step, idx) => (
                                        <div key={step.id} className="script-step-row">
                                            <div className="step-marker">{idx + 1}</div>
                                            <div className="step-content">
                                                <div className="step-text">
                                                    {replaceVariables(step.text)}
                                                </div>
                                                <div className="step-input-wrapper">
                                                    <label>{step.question}</label>
                                                    <input
                                                        className="input"
                                                        placeholder="Resposta..."
                                                        value={callAnswers[step.id] || ''}
                                                        onChange={(e) => setCallAnswers({ ...callAnswers, [step.id]: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Right: Objections & Outcome */}
                <aside className="call-sidebar-right">
                    <div className="card sidebar-card objections-card">
                        <h4>Common Objections</h4>
                        <div className="objection-list">
                            {DEFAULT_OBJECTIONS.map(obj => (
                                <div key={obj.id} className="objection-item">
                                    <details>
                                        <summary>{obj.label}</summary>
                                        <p>{obj.response}</p>
                                    </details>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card sidebar-card outcome-card">
                        <h4>Call Outcome</h4>
                        <div className="form-group">
                            <label>Result</label>
                            <select
                                className="input"
                                value={callOutcome}
                                onChange={(e) => setCallOutcome(e.target.value)}
                            >
                                {CALL_OUTCOMES.map(o => (
                                    <option key={o.id} value={o.id}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {(callOutcome === 'callback_later' || callOutcome === 'meeting_booked') && (
                            <div className="followup-scheduling-section animate-fadeIn">
                                <div className="form-group">
                                    <label>
                                        {callOutcome === 'callback_later' ? 'Call Back Date' : 'Meeting Date'}
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="date"
                                            className="input"
                                            value={followupDate}
                                            onChange={(e) => setFollowupDate(e.target.value)}
                                        />
                                        <input
                                            type="time"
                                            className="input"
                                            value={followupTime}
                                            onChange={(e) => setFollowupTime(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-secondary mt-1">Optional: Leave blank if not confirmed yet.</p>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Observations</label>
                            <textarea
                                className="input textarea"
                                rows={4}
                                placeholder="Notas da chamada..."
                                value={callObservation}
                                onChange={(e) => setCallObservation(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary full-width" onClick={handleSaveCall}>
                            <Save size={16} /> Save & Finish
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    )
}
