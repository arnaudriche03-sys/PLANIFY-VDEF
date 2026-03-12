import React from 'react';
import { X, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, XCircle, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

// ... (getStatus, STATUS_CONFIG, GaugeBar, Delta, KpiCard remain same)

// ── Helpers de statut ────────────────────────────────────────────────────────

const getStatus = (key, value) => {
    if (value === null || value === undefined) return 'na';
    switch (key) {
        case 'ratioMasseSalariale':
            if (value < 35) return 'ok';
            if (value <= 45) return 'warning';
            return 'danger';
        case 'productiviteHoraire':
            if (value > 80) return 'ok';
            if (value >= 60) return 'warning';
            return 'danger';
        case 'ticketMoyen':
            if (value > 25) return 'ok';
            if (value >= 15) return 'warning';
            return 'danger';
        case 'tauxFrequentation':
            if (value > 70) return 'ok';
            if (value >= 50) return 'warning';
            return 'danger';
        default:
            return 'na';
    }
};

const STATUS_CONFIG = {
    ok: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: '#10b981', label: 'Optimal', Icon: CheckCircle },
    warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: '#f59e0b', label: 'Attention', Icon: AlertTriangle },
    danger: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: '#ef4444', label: 'Critique', Icon: XCircle },
    na: { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: '#334155', label: 'N/D', Icon: Minus },
};

// ── Jauge de barre ───────────────────────────────────────────────────────────

const GaugeBar = ({ value, maxVal, status }) => {
    const pct = maxVal > 0 ? Math.min(100, (value / maxVal) * 100) : 0;
    const { color } = STATUS_CONFIG[status] || STATUS_CONFIG.na;
    return (
        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 8 }}>
            <div style={{
                height: '100%', width: `${pct}%`, background: color,
                borderRadius: 2, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)'
            }} />
        </div>
    );
};

// ── Delta vs semaine précédente ──────────────────────────────────────────────

const Delta = ({ current, prev, invert = false }) => {
    if (current === null || prev === null) return null;
    const diff = Math.round((current - prev) * 10) / 10;
    if (diff === 0) return <span style={{ fontSize: '0.75rem', color: '#64748b' }}>= stable</span>;
    // invert : pour RMS, une hausse est mauvaise
    const isGood = invert ? diff < 0 : diff > 0;
    const color = isGood ? '#10b981' : '#ef4444';
    const Icon = diff > 0 ? TrendingUp : TrendingDown;
    return (
        <span style={{ fontSize: '0.75rem', color, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon size={12} />
            {diff > 0 ? '+' : ''}{diff}{typeof current === 'number' && current < 1000 && current !== Math.round(current) ? '' : ''}
            {' vs S-1'}
        </span>
    );
};

// ── Carte KPI individuelle ───────────────────────────────────────────────────

const KpiCard = ({ title, value, unit, prev, metricKey, maxVal, invert, thresholds }) => {
    const status = getStatus(metricKey, value);
    const { color, bg, border, label, Icon } = STATUS_CONFIG[status];

    return (
        <div style={{
            background: bg, border: `1px solid ${border}22`, borderLeft: `3px solid ${border}`,
            borderRadius: 10, padding: '16px 18px', flex: '1 1 200px',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 700 }}>
                    {title}
                </span>
                <span style={{
                    fontSize: '0.65rem', fontWeight: 700, color,
                    background: `${color}22`, padding: '2px 7px', borderRadius: 4,
                    display: 'flex', alignItems: 'center', gap: 3
                }}>
                    <Icon size={10} />{label}
                </span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {value !== null ? (
                    <>{value}<span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#94a3b8', marginLeft: 2 }}>{unit}</span></>
                ) : (
                    <span style={{ fontSize: '1rem', color: '#475569' }}>— CA requis</span>
                )}
            </div>
            {thresholds && (
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 4, letterSpacing: '0.02em', fontStyle: 'italic' }}>
                    {thresholds}
                </div>
            )}
            <div style={{ marginTop: 4 }}>
                <Delta current={value} prev={prev} invert={invert} />
            </div>
            {value !== null && <GaugeBar value={value} maxVal={maxVal} status={status} />}
        </div>
    );
};

// ── Rendu Markdown minimal ───────────────────────────────────────────────────

const AuditMarkdown = ({ content }) => {
    if (!content) return null;
    return (
        <div style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.75 }}>
            {content.split('\n').map((line, i) => {
                if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
                if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', margin: '18px 0 6px' }}>{line.slice(4)}</h3>;
                if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', margin: '20px 0 6px' }}>{line.slice(3)}</h2>;
                if (line.startsWith('- ') || line.startsWith('• ')) return (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 3 }}>
                        <span style={{ color: '#6366f1', marginTop: 5, flexShrink: 0 }}>›</span>
                        <span>{line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}</span>
                    </div>
                );
                if (line.trim() === '---') return <hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '12px 0' }} />;
                return <p key={i} style={{ margin: '3px 0' }}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
            })}
        </div>
    );
};

// ── Composant principal ──────────────────────────────────────────────────────

const AuditModal = ({ isOpen, onClose, onRefresh, metrics, prevMetrics, analysisText, weekStart, isLoading }) => {
    if (!isOpen) return null;

    // Helper local pour normaliser au lundi
    const getMonday = (date) => {
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
        return d.toISOString().split('T')[0];
    };

    const [currentDate, setCurrentDate] = React.useState(() => {
        const initial = weekStart || new Date().toISOString().split('T')[0];
        return getMonday(initial);
    });
    const [viewType, setViewType] = React.useState('week'); // 'week' | 'month'

    // Formater la période affichée
    const formatDateRange = () => {
        const d = new Date(currentDate);
        if (viewType === 'month') {
            return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        }
        const start = new Date(getMonday(d));
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    };

    const handlePrev = () => {
        const d = new Date(currentDate);
        if (viewType === 'month') d.setMonth(d.getMonth() - 1);
        else d.setDate(d.getDate() - 7);
        const newDate = getMonday(d.toISOString().split('T')[0]);
        setCurrentDate(newDate);
        onRefresh(newDate, viewType);
    };

    const handleNext = () => {
        const d = new Date(currentDate);
        if (viewType === 'month') d.setMonth(d.getMonth() + 1);
        else d.setDate(d.getDate() + 7);
        const newDate = getMonday(d.toISOString().split('T')[0]);
        setCurrentDate(newDate);
        onRefresh(newDate, viewType);
    };

    const kpis = [
        {
            key: 'ratioMasseSalariale',
            title: 'Ratio Masse Salariale',
            unit: '%',
            maxVal: 60,
            invert: true,
            thresholds: 'Optimal < 35% | Critique > 45%',
        },
        {
            key: 'productiviteHoraire',
            title: 'Productivité Horaire',
            unit: '€/h',
            maxVal: 150,
            invert: false,
            thresholds: 'Optimal > 80€ | Critique < 60€',
        },
        {
            key: 'ticketMoyen',
            title: 'Ticket Moyen',
            unit: '€',
            maxVal: 60,
            invert: false,
            thresholds: 'Cible par défaut : > 25€',
        },
        {
            key: 'tauxFrequentation',
            title: 'Taux de Fréquentation',
            unit: '%',
            maxVal: 100,
            invert: false,
            thresholds: 'Optimal > 70%',
        },
    ];

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
                    backdropFilter: 'blur(6px)', zIndex: 1000,
                    animation: 'auditFadeIn 0.2s ease'
                }}
            />

            {/* Panel */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: 'min(520px, 100vw)',
                background: '#0f172a',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                zIndex: 1001, overflowY: 'auto',
                animation: 'auditSlideIn 0.25s cubic-bezier(0.4,0,0.2,1)',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    position: 'sticky', top: 0, background: '#0f172a', zIndex: 10,
                }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6366f1', fontWeight: 700, marginBottom: 4 }}>
                            Analyse stratégique
                        </div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' }}>
                            Audit de performance
                        </h2>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, padding: '6px', cursor: 'pointer', color: '#94a3b8',
                        display: 'flex', alignItems: 'center', transition: 'all 0.15s'
                    }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Sélecteur de période */}
                <div style={{
                    padding: '12px 24px', background: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setViewType('week'); onRefresh(currentDate, 'week'); }} style={{
                            padding: '4px 10px', fontSize: '0.7rem', fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                            background: viewType === 'week' ? '#6366f1' : 'transparent',
                            color: viewType === 'week' ? '#fff' : '#64748b',
                            border: 'none', transition: 'all 0.2s'
                        }}>Semaine</button>
                        <button onClick={() => { setViewType('month'); onRefresh(currentDate, 'month'); }} style={{
                            padding: '4px 10px', fontSize: '0.7rem', fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                            background: viewType === 'month' ? '#6366f1' : 'transparent',
                            color: viewType === 'month' ? '#fff' : '#64748b',
                            border: 'none', transition: 'all 0.2s'
                        }}>Mois</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={handlePrev} style={{
                            background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, padding: '4px', cursor: 'pointer', color: '#94a3b8'
                        }}><ChevronLeft size={16} /></button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 120, justifyContent: 'center' }}>
                            <Calendar size={14} style={{ color: '#6366f1' }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap' }}>
                                {formatDateRange()}
                            </span>
                        </div>

                        <button onClick={handleNext} style={{
                            background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, padding: '4px', cursor: 'pointer', color: '#94a3b8'
                        }}><ChevronRight size={16} /></button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px', flex: 1 }}>
                    {/* Section KPI */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', fontWeight: 700, marginBottom: 12 }}>
                            Indicateurs clés — {viewType === 'week' ? 'Semaine' : 'Mois'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {kpis.map(k => (
                                <KpiCard
                                    key={k.key}
                                    metricKey={k.key}
                                    title={k.title}
                                    value={metrics?.[k.key] ?? null}
                                    prev={prevMetrics?.[k.key] ?? null}
                                    unit={k.unit}
                                    maxVal={k.maxVal}
                                    invert={k.invert}
                                    thresholds={k.thresholds}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Récap chiffré */}
                    {metrics && (
                        <div style={{
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: 10, padding: '14px 18px', marginBottom: 24,
                            display: 'flex', gap: 24, flexWrap: 'wrap'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Heures planifiées</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>{metrics.totalHeures ?? '—'}h</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Coût chargé</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>{metrics.coutChargeTotal ? `${metrics.coutChargeTotal}€` : '—'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>CA prévisionnel</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>{metrics.ca ? `${metrics.ca}€` : '— non renseigné'}</div>
                            </div>
                        </div>
                    )}

                    {/* Séparateur */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', fontWeight: 700 }}>
                            Analyse IA
                        </span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                    </div>

                    {/* Analyse Claude */}
                    {isLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
                            {[80, 60, 90, 50, 70].map((w, i) => (
                                <div key={i} style={{
                                    height: 12, width: `${w}%`, background: 'rgba(255,255,255,0.05)',
                                    borderRadius: 4, animation: 'auditPulse 1.4s ease infinite',
                                    animationDelay: `${i * 0.15}s`
                                }} />
                            ))}
                        </div>
                    ) : (
                        <AuditMarkdown content={analysisText} />
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    position: 'sticky', bottom: 0, background: '#0f172a',
                }}>
                    <span style={{ fontSize: '0.7rem', color: '#334155' }}>Généré par Claude 3 Haiku · Planify</span>
                    <button onClick={onClose} style={{
                        padding: '7px 18px', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                        color: '#94a3b8', fontSize: '0.82rem', cursor: 'pointer',
                        fontWeight: 600, transition: 'all 0.15s'
                    }}>
                        Fermer
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes auditFadeIn { from { opacity: 0 } to { opacity: 1 } }
                @keyframes auditSlideIn { from { transform: translateX(30px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
                @keyframes auditPulse { 0%, 100% { opacity: 0.4 } 50% { opacity: 0.8 } }
            `}</style>
        </>
    );
};

export default AuditModal;
