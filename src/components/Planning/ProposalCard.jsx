import React from 'react';
import { FileText, CheckCircle2, XCircle, PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';

const TYPE_LABELS = {
    add: { label: 'Ajout', icon: <PlusCircle size={14} color="#10b981" />, className: 'change-add' },
    remove: { label: 'Suppression', icon: <MinusCircle size={14} color="#ef4444" />, className: 'change-remove' },
    modify: { label: 'Modification', icon: <RefreshCw size={14} color="#f59e0b" />, className: 'change-modify' },
};

const calcDuration = (start, end) => {
    if (!start || !end) return '';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm);
    if (mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const ChangeRow = ({ change }) => {
    const type = TYPE_LABELS[change.type] || { label: change.type, emoji: '•', className: '' };

    return (
        <div className={`change-row ${type.className}`}>
            <span className="change-badge">
                {type.icon} {type.label}
            </span>
            <span className="change-employee">{change.employeeName}</span>
            <span className="change-date">{formatDate(change.date)}</span>

            {change.type === 'add' && (
                <span className="change-hours new">
                    {change.startTime} → {change.endTime}
                    <span className="change-duration">({calcDuration(change.startTime, change.endTime)})</span>
                </span>
            )}

            {change.type === 'remove' && (
                <span className="change-hours removed">
                    <s>{change.startTime} → {change.endTime}</s>
                    <span className="change-duration">({calcDuration(change.startTime, change.endTime)})</span>
                </span>
            )}

            {change.type === 'modify' && (
                <span className="change-hours modify">
                    <s className="old-time">{change.oldStartTime} → {change.oldEndTime}</s>
                    <span className="arrow">→</span>
                    <span className="new-time">{change.startTime} → {change.endTime}</span>
                    <span className="change-duration">({calcDuration(change.startTime, change.endTime)})</span>
                </span>
            )}
        </div>
    );
};

const ProposalCard = ({ proposal, status, onAccept, onReject }) => {
    if (!proposal) return null;

    const isApplied = status === 'applied';
    const isRejected = status === 'rejected';
    const isDone = isApplied || isRejected;

    return (
        <div className={`proposal-card ${isDone ? `proposal-${status}` : ''}`}>
            <div className="proposal-header">
                <div className="proposal-icon-wrapper">
                    <FileText size={24} className="proposal-icon" />
                </div>
                <div style={{ flex: 1 }}>
                    <div className="proposal-title">Proposition de planning</div>
                    <div className="proposal-description">{proposal.description}</div>
                </div>
                {isApplied && <span className="proposal-status-badge applied"><CheckCircle2 size={14} /> Appliqué</span>}
                {isRejected && <span className="proposal-status-badge rejected"><XCircle size={14} /> Refusé</span>}
            </div>

            <div className="proposal-changes">
                {(proposal.changes || []).map((change, i) => (
                    <ChangeRow key={i} change={change} />
                ))}
            </div>

            {!isDone && (
                <div className="proposal-actions">
                    <button className="btn-accept" onClick={() => onAccept(proposal.changes)}>
                        <CheckCircle2 size={16} /> Appliquer
                    </button>
                    <button className="btn-reject" onClick={onReject}>
                        <XCircle size={16} /> Refuser
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProposalCard;
