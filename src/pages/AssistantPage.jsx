import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from '../components/UI/Icons';
import { LineChart, ChevronLeft, ChevronRight, BarChart3, Trash2, MessageSquare, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { useClaude } from '../hooks/useClaude';
import { useData } from '../context/DataContext';
import ProposalCard from '../components/Planning/ProposalCard';
import { supabase } from '../lib/supabase';
import AuditModal from '../components/UI/AuditModal';

const SUGGESTIONS = [
    "Analyse la conformité du planning",
    "Quel est le coût estimé de la semaine ?",
    "Y a-t-il des alertes légales ?",
    "Propose une optimisation du planning cette semaine",
    "Qui peut remplacer un absent ce soir ?"
];

// Rendu Markdown complet : titres, listes, gras, italique, séparateurs
const MarkdownRenderer = ({ content }) => {
    if (!content) return null;
    const lines = content.split('\n');
    const elements = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith('### ')) {
            elements.push(<h3 key={i} className="md-h3">{renderInline(line.slice(4))}</h3>);
            i++; continue;
        }
        if (line.startsWith('## ')) {
            elements.push(<h2 key={i} className="md-h2">{renderInline(line.slice(3))}</h2>);
            i++; continue;
        }
        if (line.trim() === '---' || line.trim() === '━━━━━━━━━━━━━━━━━━━━━━━━━━━') {
            elements.push(<hr key={i} className="md-hr" />);
            i++; continue;
        }
        if (/^(\s*[-*•])\s/.test(line)) {
            const listItems = [];
            while (i < lines.length && /^(\s*[-*•])\s/.test(lines[i])) {
                const text = lines[i].replace(/^\s*[-*•]\s/, '');
                listItems.push(<li key={i}>{renderInline(text)}</li>);
                i++;
            }
            elements.push(<ul key={`ul-${i}`} className="md-ul">{listItems}</ul>);
            continue;
        }
        if (/^\d+\.\s/.test(line)) {
            const listItems = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
                const text = lines[i].replace(/^\d+\.\s/, '');
                listItems.push(<li key={i}>{renderInline(text)}</li>);
                i++;
            }
            elements.push(<ol key={`ol-${i}`} className="md-ol">{listItems}</ol>);
            continue;
        }
        if (line.trim() === '') { i++; continue; }
        elements.push(<p key={i} className="md-p">{renderInline(line)}</p>);
        i++;
    }
    return <div className="markdown-body">{elements}</div>;
};

const renderInline = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={idx}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={idx}>{part.slice(1, -1)}</em>;
        if (part.startsWith('`') && part.endsWith('`')) return <code key={idx} className="md-code-inline">{part.slice(1, -1)}</code>;
        return part;
    });
};

const AssistantPage = () => {
    const { askClaude, isAILoading, runStrategicAudit } = useClaude();
    const { currentShifts, updateShifts, currentRestaurantId, currentRevenueData, upsertRevenueData } = useData();
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [showKpiPanel, setShowKpiPanel] = useState(false);
    const [kpiSaved, setKpiSaved] = useState(false);
    const messagesEndRef = useRef(null);

    // ── Audit Stratégique ────────────────────────────────────────────────────
    const [auditOpen, setAuditOpen] = useState(false);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditData, setAuditData] = useState(null);

    const handleAudit = async (weekStart = null, viewType = 'week') => {
        // Sécurisation : si la fonction est appelée via un onClick natif, weekStart est un SyntheticEvent
        const finalWeekStart = typeof weekStart === 'string' ? weekStart : selectedKpiWeek;
        const finalViewType = typeof viewType === 'string' ? viewType : 'week';

        setAuditOpen(true);
        setAuditLoading(true);
        const result = await runStrategicAudit(finalWeekStart, finalViewType);
        setAuditData(result);
        setAuditLoading(false);
    };

    // ── Helpers de semaine ───────────────────────────────────────────────────
    const getMondayOf = (date) => {
        let d;
        if (typeof date === 'string') {
            const [y, m, da] = date.split('-').map(Number);
            d = new Date(y, m - 1, da);
        } else {
            d = new Date(date);
        }
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().split('T')[0];
    };
    const addWeeks = (isoDate, n) => {
        const d = new Date(isoDate);
        d.setDate(d.getDate() + n * 7);
        return d.toISOString().split('T')[0];
    };
    const fmtWeekLabel = (isoDate) => {
        const [y, m, da] = isoDate.split('-').map(Number);
        const d = new Date(y, m - 1, da);
        const end = new Date(y, m - 1, da);
        end.setDate(d.getDate() + 6);
        const opts = { day: '2-digit', month: 'short' };
        return `${d.toLocaleDateString('fr-FR', opts)} — ${end.toLocaleDateString('fr-FR', opts)}`;
    };

    const [selectedKpiWeek, setSelectedKpiWeek] = useState(() => getMondayOf(new Date()));

    const existingKpi = currentRevenueData[selectedKpiWeek] || {};
    const [kpiForm, setKpiForm] = useState({ ca: '', couverts: '' });

    useEffect(() => {
        if (showKpiPanel) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setKpiForm({
                ca: existingKpi.caPrevisionnel || '',
                couverts: existingKpi.nbCouverts || '',
            });
            setKpiSaved(false);
        }
    }, [showKpiPanel, selectedKpiWeek, existingKpi.caPrevisionnel, existingKpi.nbCouverts]);

    // ── Chargement de l'historique depuis Supabase ──────────────────────────
    const loadHistory = useCallback(async () => {
        // setIsLoadingHistory(true) is handled by the initial state or manually if needed, 
        // but here we ensure it doesn't trigger sync render issues.
        const { data, error } = await supabase
            .from('ai_messages')
            .select('*')
            .eq('restaurant_id', currentRestaurantId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setChatMessages(data.map(row => ({
                id: row.id,
                role: row.role,
                content: row.content,
                proposal: row.proposal,
                proposalStatus: row.proposal_status,
            })));
        }
        setIsLoadingHistory(false);
    }, [currentRestaurantId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadHistory();
    }, [loadHistory]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // ── Sauvegarde d'un message en base ────────────────────────────────────
    const saveMessage = async (role, content, proposal = null) => {
        const { data } = await supabase
            .from('ai_messages')
            .insert([{
                restaurant_id: currentRestaurantId,
                role,
                content,
                proposal: proposal || null,
                proposal_status: null,
            }])
            .select();
        return data?.[0]?.id;
    };

    // ── Mise à jour du statut d'une proposition ──────────────────────────
    const updateProposalStatus = async (msgId, status) => {
        await supabase.from('ai_messages').update({ proposal_status: status }).eq('id', msgId);
    };

    // ── Application d'une proposition ──────────────────────────────────────
    const applyProposal = async (changes, messageIdx) => {
        let updatedShifts = [...currentShifts];
        changes.forEach(change => {
            if (change.type === 'add') {
                const newId = Math.max(0, ...updatedShifts.map(s => s.id)) + 1;
                updatedShifts.push({
                    id: newId,
                    employeeId: change.employeeId,
                    date: change.date,
                    startTime: change.startTime,
                    endTime: change.endTime,
                    note: 'Optimisation automatique Analyse IA',
                });
            } else if (change.type === 'remove') {
                updatedShifts = updatedShifts.filter(s => s.id !== change.shiftId);
            } else if (change.type === 'modify') {
                updatedShifts = updatedShifts.map(s =>
                    s.id === change.shiftId
                        ? { ...s, startTime: change.startTime, endTime: change.endTime }
                        : s
                );
            }
        });
        updateShifts(updatedShifts);

        const msg = chatMessages[messageIdx];
        if (msg?.id) await updateProposalStatus(msg.id, 'applied');

        setChatMessages(prev => prev.map((m, idx) =>
            idx === messageIdx ? { ...m, proposalStatus: 'applied' } : m
        ));
    };

    const rejectProposal = async (messageIdx) => {
        const msg = chatMessages[messageIdx];
        if (msg?.id) await updateProposalStatus(msg.id, 'rejected');
        setChatMessages(prev => prev.map((m, idx) =>
            idx === messageIdx ? { ...m, proposalStatus: 'rejected' } : m
        ));
    };

    // ── Envoi d'un message ──────────────────────────────────────────────────
    const sendMessage = async (question) => {
        if (!question.trim() || isAILoading) return;

        const userMsg = { role: 'user', content: question };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        const userMsgId = await saveMessage('user', question);
        setChatMessages(prev => prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, id: userMsgId } : m
        ));

        const history = [...chatMessages, userMsg];
        const { text, proposal } = await askClaude(question, history);

        const aiMsgId = await saveMessage('assistant', text, proposal);
        const aiMsg = { id: aiMsgId, role: 'assistant', content: text, proposal, proposalStatus: null };
        setChatMessages(prev => [...prev, aiMsg]);
    };

    // ── Effacer l'historique ────────────────────────────────────────────────
    const clearHistory = async () => {
        await supabase.from('ai_messages').delete().eq('restaurant_id', currentRestaurantId);
        setChatMessages([]);
    };

    // ── Panneau KPI ────────────────────────────────────────────────────────────
    const saveKpi = async () => {
        if (!selectedKpiWeek) return;
        await upsertRevenueData(
            selectedKpiWeek,
            kpiForm.ca ? parseFloat(kpiForm.ca) : null,
            kpiForm.couverts ? parseInt(kpiForm.couverts) : null,
        );
        setKpiSaved(true);
    };

    return (
        <>
            <div className="assistant-container">
                <div className="assistant-card">
                    <div className="assistant-header">
                        <div className="assistant-title">
                            <LineChart className="icon-sparkle" size={20} />
                            <span>Analyse IA</span>
                            <span className="badge-beta">PRO</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Bouton Audit Stratégique */}
                            <button
                                onClick={handleAudit}
                                disabled={isAILoading}
                                title="Lancer l'audit stratégique des KPI"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                                    color: 'white',
                                    border: 'none', borderRadius: '8px',
                                    padding: '6px 14px', cursor: 'pointer', fontSize: '0.82rem',
                                    fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px',
                                    transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                                    opacity: isAILoading ? 0.6 : 1,
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                <TrendingUp size={14} /> Audit Stratégique
                            </button>
                            <button
                                onClick={() => setShowKpiPanel(p => !p)}
                                title="Renseigner le CA et les couverts de la semaine"
                                style={{
                                    background: showKpiPanel ? 'var(--primary)' : 'none',
                                    color: showKpiPanel ? 'white' : 'var(--text-secondary)',
                                    border: '1px solid var(--border)', borderRadius: '8px',
                                    padding: '5px 12px', cursor: 'pointer', fontSize: '0.82rem',
                                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <BarChart3 size={14} /> KPI Hebdo
                            </button>
                            <div className="assistant-subtitle">Expert HCR &amp; Code du Travail</div>
                            {chatMessages.length > 0 && (
                                <button
                                    onClick={clearHistory}
                                    title="Effacer l'historique"
                                    style={{
                                        background: 'none', border: '1px solid var(--border)',
                                        borderRadius: '6px', padding: '4px 10px', cursor: 'pointer',
                                        fontSize: '0.78rem', color: 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                >
                                    <Trash2 size={12} /> Effacer
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Panneau KPI inline */}
                    {showKpiPanel && (
                        <div style={{
                            borderTop: '1px solid var(--border)', padding: '16px 20px',
                            background: 'var(--bg-secondary)', display: 'flex', gap: '16px',
                            alignItems: 'flex-end', flexWrap: 'wrap',
                        }}>
                            {/* Sélecteur de semaine */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><BarChart3 size={14} /> PERFORMANCE —</span>
                                <button onClick={() => setSelectedKpiWeek(w => addWeeks(w, -1))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-primary)' }}><ChevronLeft size={16} /></button>
                                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: 180, textAlign: 'center' }}>
                                    {fmtWeekLabel(selectedKpiWeek)}
                                </span>
                                <button onClick={() => setSelectedKpiWeek(w => addWeeks(w, 1))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-primary)' }}><ChevronRight size={16} /></button>
                                <button onClick={() => setSelectedKpiWeek(getMondayOf(new Date()))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 10px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Aujourd'hui</button>
                                {existingKpi.caPrevisionnel && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--success, #22c55e)', marginLeft: 8, display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Validé : {existingKpi.caPrevisionnel}€{existingKpi.nbCouverts ? ` — ${existingKpi.nbCouverts} couverts` : ''}</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>CA prévisionnel (€)</label>
                                <input
                                    type="number"
                                    value={kpiForm.ca}
                                    onChange={e => { setKpiForm(f => ({ ...f, ca: e.target.value })); setKpiSaved(false); }}
                                    placeholder="ex: 12500"
                                    style={{
                                        padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                                        background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.9rem', width: '160px',
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Nb couverts prévus</label>
                                <input
                                    type="number"
                                    value={kpiForm.couverts}
                                    onChange={e => { setKpiForm(f => ({ ...f, couverts: e.target.value })); setKpiSaved(false); }}
                                    placeholder="ex: 450"
                                    style={{
                                        padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                                        background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.9rem', width: '140px',
                                    }}
                                />
                            </div>
                            <button
                                onClick={saveKpi}
                                style={{
                                    padding: '9px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    background: kpiSaved ? 'var(--success, #22c55e)' : 'var(--primary)',
                                    color: 'white', fontWeight: 700, fontSize: '0.88rem', transition: 'background 0.3s',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                {kpiSaved ? <><CheckCircle2 size={16} /> Enregistré</> : 'Enregistrer'}
                            </button>
                            {existingKpi.caPrevisionnel && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    Dernier CA enregistré : <strong>{existingKpi.caPrevisionnel}€</strong>
                                    {existingKpi.nbCouverts ? ` — ${existingKpi.nbCouverts} couverts` : ''}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="chat-messages">
                        {isLoadingHistory ? (
                            <div className="empty-state">
                                <Clock className="icon-pulse" size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p>Chargement de l'analyse…</p>
                            </div>
                        ) : chatMessages.length === 0 ? (
                            <div className="empty-state">
                                <MessageSquare size={48} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                                <h3>Comment puis-je vous aider aujourd'hui ?</h3>
                                <p>Posez-moi une question sur vos coûts, votre conformité ou demandez une optimisation de planning.</p>
                            </div>
                        ) : (
                            chatMessages.map((msg, idx) => (
                                <div key={msg.id || idx} className={`message ${msg.role}`}>
                                    <div className="message-content">
                                        {msg.role === 'assistant' ? (
                                            <>
                                                <MarkdownRenderer content={msg.content} />
                                                {msg.proposal && (
                                                    <ProposalCard
                                                        proposal={msg.proposal}
                                                        status={msg.proposalStatus}
                                                        onAccept={(changes) => applyProposal(changes, idx)}
                                                        onReject={() => rejectProposal(idx)}
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        {isAILoading && (
                            <div className="message assistant loading">
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="input-area-wrapper">
                        <div className="suggestions-scroll">
                            {SUGGESTIONS.map((s, i) => (
                                <button key={i} className="suggestion-chip" onClick={() => sendMessage(s)} disabled={isAILoading}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div className="input-area">
                            <input
                                type="text"
                                className="chat-input"
                                placeholder="Posez votre question ou demandez une proposition..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage(chatInput)}
                                disabled={isAILoading}
                            />
                            <button className="btn-send" onClick={() => sendMessage(chatInput)} disabled={isAILoading || !chatInput.trim()}>
                                <Icons.Send size={18} style={{ marginRight: '6px' }} />
                                <span>Envoyer</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Audit Stratégique */}
            <AuditModal
                isOpen={auditOpen}
                onClose={() => setAuditOpen(false)}
                onRefresh={handleAudit}
                metrics={auditData?.metrics}
                prevMetrics={auditData?.prevMetrics}
                analysisText={auditData?.analysisText}
                weekStart={auditData?.weekStart}
                isLoading={auditLoading}
            />
        </>
    );
};

export default AssistantPage;
