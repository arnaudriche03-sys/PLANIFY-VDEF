import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Calendar as CalendarIcon, Clock, User, LogOut, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, ArrowRightLeft, X, Users } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getVacantTimeSlots } from '../../utils/calculations';

const EmployeeDashboard = () => {
    const {
        currentRestaurant, employees, currentRestaurantId, currentShifts,
        currentEmployeeId, logout, offerShift, takeShift, claimVacantShift,
        shiftRequests, currentAvailabilities, updateAvailability, deleteAvailability, refreshData
    } = useData();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState('planning'); // 'planning' | 'dispos' | 'profil' | 'bourse'
    const [actionLoading, setActionLoading] = useState(false);

    // États pour le calendrier de dispos
    const [disposView, setDisposView] = useState('week'); // 'week' | 'month'
    const [disposDate, setDisposDate] = useState(new Date());
    const [selectedDateForAction, setSelectedDateForAction] = useState(null);
    const [localType, setLocalType] = useState(null);
    const [localStart, setLocalStart] = useState('08:00');
    const [localEnd, setLocalEnd] = useState('12:00');
    const [localNote, setLocalNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [partialShiftSelection, setPartialShiftSelection] = useState(null); // { shiftId, date, startTime, endTime }


    // Initialiser le formulaire quand on sélectionne une date
    React.useEffect(() => {
        if (selectedDateForAction) {
            const dayAvail = currentAvailabilities.find(a => a.date === selectedDateForAction && a.employeeId === currentEmployeeId);
            setLocalType(dayAvail?.type || null);
            setLocalStart(dayAvail?.startTime || '08:00');
            setLocalEnd(dayAvail?.endTime || '12:00');
            setLocalNote(dayAvail?.note || '');
        }
    }, [selectedDateForAction, currentAvailabilities, currentEmployeeId]);


    // Récupérer les infos de l'employé connecté
    const me = useMemo(() => {
        const restEmployees = employees[currentRestaurantId] || [];
        return restEmployees.find(e => e.id === currentEmployeeId);
    }, [employees, currentRestaurantId, currentEmployeeId]);

    // Semaine actuelle
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    // Filtrer les shifts de CET employé
    const myShiftsThisWeek = useMemo(() => {
        return currentShifts.filter(s => s.employeeId === currentEmployeeId);
    }, [currentShifts, currentEmployeeId]);

    const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
    const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));

    if (!me) return <div style={{ color: 'white', padding: 20 }}>Employé introuvable...</div>;

    const renderPlanning = () => {
        // Obtenir tous les shifts vacants pour la semaine
        const vacantShifts = currentShifts.filter(s => (s.employeeId === null || s.employeeId === undefined) && s.date >= format(weekStart, 'yyyy-MM-dd') && s.date <= format(addDays(weekStart, 6), 'yyyy-MM-dd'));

        // Helper: même logique que PlanningPage pour le positionnement
        const getShiftStyle = (shift, allVisibleCards) => {
            const startHour = 7;
            const endHour = 26;
            const totalMinutes = (endHour - startHour) * 60;

            const [startH, startM] = shift.startTime.split(':').map(Number);
            const [endH, endM] = shift.endTime.split(':').map(Number);

            const endHNorm = endH < startHour ? endH + 24 : endH;
            const startMinutes = (startH * 60 + startM) - (startHour * 60);
            let durationMinutes = (endHNorm * 60 + endM) - (startH * 60 + startM);
            if (durationMinutes <= 0) durationMinutes += 24 * 60;

            const top = (startMinutes / totalMinutes) * 100;
            const height = (durationMinutes / totalMinutes) * 100;

            const overlaps = allVisibleCards.filter(s => {
                const [s1H, s1M] = s.startTime.split(':').map(Number);
                const [e1H, e1M] = s.endTime.split(':').map(Number);
                const e1Norm = e1H < startHour ? e1H + 24 : e1H;
                const s1Min = s1H * 60 + s1M;
                const e1Min = e1Norm * 60 + e1M;
                const s2Min = startH * 60 + startM;
                const e2Min = endHNorm * 60 + endM;
                return s1Min < e2Min && s2Min < e1Min;
            });

            const overlapIndex = overlaps.findIndex(s => s.id === shift.id);
            const width = 100 / overlaps.length;
            const left = width * overlapIndex;

            return {
                top: `${Math.max(top, 0)}%`,
                height: `${Math.max(height, 2)}%`,
                left: `${left}%`,
                width: `${width}%`,
                position: 'absolute'
            };
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handlePrevWeek} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={handleNextWeek} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <div style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '1.1rem', textTransform: 'capitalize' }}>
                        {format(weekStart, 'MMMM yyyy', { locale: fr })}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px' }}>
                        Semaine du {format(weekStart, 'd')} au {format(addDays(weekStart, 6), 'd MMM.')}
                    </div>
                </div>

                {/* Grille de Planning (Style Desktop Adapté) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '1px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    minHeight: '700px'
                }}>
                    {weekDays.map((day, idx) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isTodayFlag = isToday(day);

                        // Mes shifts
                        const myShifts = myShiftsThisWeek.filter(s => s.date === dateStr);
                        // Les besoins (vacants groupés)
                        const dayVacants = vacantShifts.filter(s => s.date === dateStr);
                        const groupedVacant = [];
                        const vacantMap = new Map();
                        dayVacants.forEach(vs => {
                            const key = `${vs.startTime}-${vs.endTime}`;
                            if (vacantMap.has(key)) {
                                vacantMap.get(key).count++;
                                vacantMap.get(key).ids.push(vs.id);
                            } else {
                                const group = { id: `vg-${vs.id}`, startTime: vs.startTime, endTime: vs.endTime, count: 1, ids: [vs.id], isVacant: true };
                                vacantMap.set(key, group);
                                groupedVacant.push(group);
                            }
                        });

                        const allVisible = [...myShifts, ...groupedVacant];

                        return (
                            <div key={idx} style={{
                                background: isTodayFlag ? 'rgba(99, 102, 241, 0.03)' : 'var(--bg-card)',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative'
                            }}>
                                {/* Header Jour */}
                                <div style={{
                                    padding: '12px 4px',
                                    textAlign: 'center',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    background: isTodayFlag ? 'var(--primary)' : 'transparent',
                                }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: isTodayFlag ? 'white' : '#94a3b8', textTransform: 'uppercase' }}>{format(day, 'EEE', { locale: fr })}</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isTodayFlag ? 'white' : '#f1f5f9' }}>{format(day, 'd')}</div>
                                </div>

                                {/* Contenu Jour */}
                                <div style={{ flex: 1, position: 'relative', minHeight: '600px', padding: '4px' }}>
                                    {/* Lignes de temps (subtiles) */}
                                    {Array.from({ length: 10 }).map((_, i) => (
                                        <div key={i} style={{ position: 'absolute', top: `${(i / 9) * 100}%`, left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.02)', pointerEvents: 'none' }} />
                                    ))}

                                    {/* Mes shifts */}
                                    {myShifts.map(shift => (
                                        <div key={shift.id} style={{
                                            ...getShiftStyle(shift, allVisible),
                                            background: 'rgba(99, 102, 241, 0.15)',
                                            borderLeft: '3px solid var(--primary)',
                                            borderRadius: '6px',
                                            padding: '4px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            zIndex: 2,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}>
                                            <div style={{ fontSize: '0.7rem', color: '#f1f5f9', fontWeight: 700, lineHeight: 1 }}>MOI</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 600 }}>{shift.startTime}-{shift.endTime}</div>
                                        </div>
                                    ))}

                                    {/* Besoins */}
                                    {groupedVacant.map(group => (
                                        <div
                                            key={group.id}
                                            onClick={() => {
                                                setPartialShiftSelection({
                                                    shiftId: group.ids[0],
                                                    date: dateStr,
                                                    startTime: group.startTime,
                                                    endTime: group.endTime,
                                                    originalStart: group.startTime,
                                                    originalEnd: group.endTime
                                                });
                                            }}

                                            style={{
                                                ...getShiftStyle(group, allVisible),
                                                background: 'rgba(139, 92, 246, 0.1)',
                                                border: '1px dashed #8b5cf6',
                                                borderLeft: '4px solid #8b5cf6',
                                                borderRadius: '6px',
                                                padding: '4px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: '0.2s',
                                                zIndex: 1
                                            }}
                                        >
                                            <div style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 700 }}>BESOIN</div>
                                            <div style={{ fontSize: '0.6rem', color: '#f1f5f9', fontWeight: 600 }}>{group.startTime}-{group.endTime}</div>
                                            {group.count > 1 && <div style={{ fontSize: '0.55rem', color: '#a78bfa' }}>+{group.count - 1} pers.</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Légende rapide */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 12, height: 12, background: 'var(--primary)', borderRadius: '3px' }} /> Mes shifts</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 12, height: 12, background: '#8b5cf6', borderRadius: '3px' }} /> Besoins (Postuler)</div>
                </div>

                {/* Mes Demandes de Shifts / Notifications */}
                {(() => {
                    const myRequests = (shiftRequests || []).filter(req => req.requestingEmployeeId === currentEmployeeId);
                    if (myRequests.length === 0) return null;

                    return (
                        <div style={{ marginTop: '24px', padding: '0 12px' }}>
                            <h3 style={{ fontSize: '1.1rem', color: '#f1f5f9', fontWeight: 600, marginBottom: '8px' }}>Mes demandes</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {myRequests.map(req => {
                                    const shift = currentShifts.find(s => s.id === req.shiftId);
                                    if (!shift) return null;

                                    const isApproved = req.status === 'approved';
                                    const isRejected = req.status === 'rejected';

                                    return (
                                        <div key={req.id} style={{
                                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: '50%',
                                                    background: isApproved ? 'rgba(16, 185, 129, 0.1)' : isRejected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {isApproved ? <CheckCircle size={16} color="#10b981" /> : isRejected ? <X size={16} color="#ef4444" /> : <Clock size={16} color="#6366f1" />}
                                                </div>
                                                <div>
                                                    <div style={{ color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 600 }}>
                                                        Shift du {format(new Date(shift.date), 'dd/MM')} ({shift.startTime}-{shift.endTime})
                                                    </div>
                                                    <div style={{ color: isApproved ? '#10b981' : isRejected ? '#ef4444' : '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }}>
                                                        {isApproved ? 'Demande acceptée' : isRejected ? 'Demande refusée' : 'En attente de validation'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                <div style={{ height: '40px' }} /> {/* Espace pour le scrollbar/padding */}
            </div>
        );
    };

    const renderBourse = () => {
        // Obtenir tous les shifts 'offered' OU sans employé (vacants réels)
        const todayStr = new Date().toISOString().split('T')[0];
        const offeredShifts = currentShifts.filter(s =>
            (s.status === 'offered' || s.employeeId === null) &&
            s.employeeId !== currentEmployeeId &&
            s.date >= todayStr
        );


        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h2 style={{ color: '#f1f5f9', fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ArrowRightLeft color="var(--primary)" /> Bourse d'échanges
                </h2>

                {/* Section 1: Offrir l'un de mes shifts */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 style={{ fontSize: '1rem', color: '#f1f5f9', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <LogOut size={16} color="var(--primary)" /> Offrir l'un de mes shifts
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(() => {
                            const todayStr = new Date().toISOString().split('T')[0];
                            const futureShifts = myShiftsThisWeek.filter(s => s.date >= todayStr);

                            if (futureShifts.length === 0) {
                                return <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Aucun shift futur à proposer.</p>;
                            }

                            return futureShifts.map(shift => (

                                <div key={shift.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 600 }}>{format(new Date(shift.date), 'EEE d MMM', { locale: fr })}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{shift.startTime} - {shift.endTime}</div>
                                    </div>
                                    {shift.status === 'offered' ? (
                                        <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>Déjà proposé</span>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (window.confirm("Proposer ce shift à l'équipe ?")) offerShift(shift.id);
                                            }}
                                            style={{ background: 'rgba(99, 102, 241, 0.1)', border: 'none', color: 'var(--primary)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                        >
                                            Proposer
                                        </button>
                                    )}
                                </div>
                            ))
                        })()}
                    </div>
                </div>

                {/* Section 2: Shifts proposés par mes collègues */}
                <div>
                    <h3 style={{ fontSize: '1rem', color: '#f1f5f9', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Users size={16} color="var(--primary)" /> Échanges disponibles
                    </h3>
                    {offeredShifts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                            <p>Aucun shift n'est proposé par l'équipe pour le moment.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {offeredShifts.map(shift => {
                                const shiftDate = new Date(shift.date);
                                const owner = (employees[currentRestaurantId] || []).find(e => e.id === shift.employeeId);
                                const myRequest = shiftRequests.find(req => req.shiftId === shift.id && req.requestingEmployeeId === currentEmployeeId);

                                return (
                                    <div key={shift.id} style={{
                                        background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px',
                                        border: '1px solid rgba(245,158,11,0.2)'
                                    }}>
                                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'capitalize', marginBottom: 4 }}>
                                            {format(shiftDate, 'EEEE d MMMM yyyy', { locale: fr })}
                                        </div>
                                        <div style={{ color: '#f1f5f9', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: '8px' }}>
                                            <Clock size={18} color="var(--primary)" />
                                            {shift.startTime} - {shift.endTime}
                                        </div>
                                        <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <User size={14} /> {shift.employeeId === null ? <span style={{ color: '#8b5cf6' }}>Poste à pourvoir (Besoin)</span> : <>Laissé par <strong style={{ color: 'white' }}>{owner?.name || 'Inconnu'}</strong></>}
                                        </div>

                                        {myRequest ? (
                                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
                                                Demande en attente de validation
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    if (!shift.employeeId) {

                                                        // Pour un besoin vacant, on propose l'aide partielle
                                                        setPartialShiftSelection({
                                                            shiftId: shift.id,
                                                            date: shift.date,
                                                            startTime: shift.startTime,
                                                            endTime: shift.endTime,
                                                            originalStart: shift.startTime,
                                                            originalEnd: shift.endTime
                                                        });
                                                    } else {
                                                        if (window.confirm(`Voulez-vous récupérer ce shift ? Le manager devra valider votre demande.`)) {
                                                            setActionLoading(true);
                                                            takeShift(shift.id, currentEmployeeId, shift.date)
                                                                .then(() => alert("Demande envoyée !"))
                                                                .catch(e => alert("Erreur lors de la prise du shift"))
                                                                .finally(() => setActionLoading(false));
                                                        }
                                                    }
                                                }}

                                                disabled={actionLoading}
                                                style={{
                                                    background: 'var(--primary)', border: 'none', color: 'white', width: '100%',
                                                    padding: '12px', borderRadius: '8px', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 600,
                                                    opacity: actionLoading ? 0.5 : 1
                                                }}
                                            >
                                                Demander ce shift
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderDispos = () => {
        // Helpers de date (similaires à PlanningPage)

        const getWeekDates = (date) => {
            const start = startOfWeek(date, { weekStartsOn: 1 });
            return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
        };

        const getMonthDates = (date) => {
            const year = date.getFullYear();
            const month = date.getMonth();
            const firstDay = new Date(year, month, 1);
            const start = startOfWeek(firstDay, { weekStartsOn: 1 });
            return Array.from({ length: 42 }).map((_, i) => addDays(start, i));
        };

        const displayDates = disposView === 'week' ? getWeekDates(disposDate) : getMonthDates(disposDate);

        const handleDisposNav = (direction) => {
            if (disposView === 'week') setDisposDate(addDays(disposDate, direction * 7));
            else {
                const newDate = new Date(disposDate);
                newDate.setMonth(disposDate.getMonth() + direction);
                setDisposDate(newDate);
            }
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                        <h2 style={{ color: '#f1f5f9', fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock color="#fbbf24" /> Mes Disponibilités
                        </h2>
                        <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px', textTransform: 'capitalize' }}>
                            {disposView === 'week'
                                ? `Semaine du ${format(startOfWeek(disposDate, { weekStartsOn: 1 }), 'd MMMM', { locale: fr })}`
                                : format(disposDate, 'MMMM yyyy', { locale: fr })
                            }
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
                            <button
                                onClick={() => setDisposView('week')}
                                style={{
                                    background: disposView === 'week' ? 'var(--primary)' : 'transparent',
                                    border: 'none', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                Semaine
                            </button>
                            <button
                                onClick={() => setDisposView('month')}
                                style={{
                                    background: disposView === 'month' ? 'var(--primary)' : 'transparent',
                                    border: 'none', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                Mois
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => handleDisposNav(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
                            <button onClick={() => handleDisposNav(1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><ChevronRight size={18} /></button>
                        </div>
                    </div>
                </header>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '1px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {/* Header Jours */}
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                        <div key={d} style={{ background: 'rgba(30,41,59,0.5)', padding: '8px', textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                            {d}
                        </div>
                    ))}

                    {/* Grille */}
                    {displayDates.map((day, i) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayAvails = currentAvailabilities.filter(a => a.date === dateStr && a.employeeId === currentEmployeeId);
                        const isRepos = dayAvails.some(a => a.type === 'repos');
                        const isIndispo = dayAvails.some(a => a.type === 'indispo');
                        const isCurrentMonth = day.getMonth() === disposDate.getMonth();
                        const isTodayFlag = isToday(day);

                        const handleQuickRepos = async (e) => {
                            e.stopPropagation();
                            try {
                                if (isRepos) {
                                    // Supprimer tous les repos et indispos de ce jour
                                    for (const a of dayAvails) {
                                        await deleteAvailability(a.id);
                                    }
                                } else {
                                    await updateAvailability({ employeeId: currentEmployeeId, date: dateStr, type: 'repos' });
                                }
                            } catch (err) {
                                alert("Erreur lors de la mise à jour des disponibilités.");
                            }
                        };

                        const handleQuickIndispo = async (e) => {
                            e.stopPropagation();
                            try {
                                if (isIndispo) {
                                    // Supprimer toutes les indispos
                                    for (const a of dayAvails) {
                                        await deleteAvailability(a.id);
                                    }
                                } else {
                                    await updateAvailability({ employeeId: currentEmployeeId, date: dateStr, type: 'indispo', startTime: '08:00', endTime: '12:00' });
                                }
                            } catch (err) {
                                alert("Erreur lors de la mise à jour des disponibilités.");
                            }
                        };



                        return (
                            <div
                                key={i}
                                onClick={() => setSelectedDateForAction(dateStr)}
                                style={{
                                    background: isRepos ? 'rgba(16, 185, 129, 0.15)' : (isIndispo ? 'rgba(251, 191, 36, 0.15)' : (isTodayFlag ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-card)')),
                                    aspectRatio: disposView === 'month' ? '1/1' : 'auto',
                                    minHeight: disposView === 'week' ? '120px' : '64px',
                                    padding: '8px',
                                    opacity: (disposView === 'month' && !isCurrentMonth) ? 0.3 : 1,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    position: 'relative',
                                    transition: '0.2s',
                                    border: isTodayFlag ? '1px solid var(--primary)' : (isRepos ? '1px solid rgba(16,185,129,0.3)' : (isIndispo ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent')),
                                    borderRadius: '4px'
                                }}
                            >

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isTodayFlag ? 'var(--primary)' : '#f1f5f9' }}>
                                        {format(day, 'd')}
                                    </div>
                                    {disposView === 'week' && (
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                onClick={handleQuickRepos}
                                                style={{
                                                    background: isRepos ? '#10b981' : 'rgba(255,255,255,0.05)',
                                                    border: 'none', color: isRepos ? 'white' : '#64748b',
                                                    width: '20px', height: '20px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer'
                                                }}
                                                title="Repos"
                                            >R</button>
                                            <button
                                                onClick={handleQuickIndispo}
                                                style={{
                                                    background: isIndispo ? '#fbbf24' : 'rgba(255,255,255,0.05)',
                                                    border: 'none', color: isIndispo ? 'black' : '#64748b',
                                                    width: '20px', height: '20px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer'
                                                }}
                                                title="Indispo"
                                            >I</button>
                                        </div>
                                    )}
                                </div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {isRepos && (() => {
                                        const reposEntry = dayAvails.find(a => a.type === 'repos');
                                        const status = reposEntry?.status || 'pending';
                                        const statusLabel = status === 'approved' ? '✅' : status === 'rejected' ? '❌' : '⏳';
                                        const statusBg = status === 'approved' ? '#10b981' : status === 'rejected' ? '#ef4444' : '#f59e0b';
                                        return (
                                            <div style={{ background: statusBg, color: 'white', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '4px', fontWeight: 700 }}>
                                                {statusLabel} REPOS
                                            </div>
                                        );
                                    })()}
                                    {isIndispo && (() => {
                                        const indispoEntry = dayAvails.find(a => a.type === 'indispo');
                                        const status = indispoEntry?.status || 'pending';
                                        const statusLabel = status === 'approved' ? '✅' : status === 'rejected' ? '❌' : '⏳';
                                        const statusBg = status === 'approved' ? '#f59e0b' : status === 'rejected' ? '#ef4444' : '#78716c';
                                        return (
                                            <div style={{ background: statusBg, color: status === 'approved' ? 'black' : 'white', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '4px', fontWeight: 700 }}>
                                                {statusLabel} INDISPO
                                                <div style={{ fontSize: '0.5rem', opacity: 0.8 }}>{indispoEntry?.startTime}-{indispoEntry?.endTime}</div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {disposView === 'month' && (isRepos || isIndispo) && (() => {
                                    const mainEntry = dayAvails[0];
                                    const status = mainEntry?.status || 'pending';
                                    const dotColor = status === 'approved' ? (isRepos ? '#10b981' : '#fbbf24') : status === 'rejected' ? '#ef4444' : '#f59e0b';
                                    return <div style={{ position: 'absolute', bottom: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: dotColor }} />;
                                })()}

                            </div>
                        );
                    })}
                </div>


                {/* Modal d'Action Rapide */}
                {selectedDateForAction && (() => {
                    const date = new Date(selectedDateForAction);
                    const dayAvails = currentAvailabilities.filter(a => a.date === selectedDateForAction && a.employeeId === currentEmployeeId);
                    const mainAvail = dayAvails[0]; // On garde la première pour l'ID d'update si besoin

                    const handleSave = async () => {
                        setIsSaving(true);
                        try {
                            if (!localType) {
                                // Supprimer TOUT pour ce jour
                                for (const a of dayAvails) {
                                    await deleteAvailability(a.id);
                                }
                            } else {
                                // Si c'est un REPOS, updateAvailability s'occupe déjà de nettoyer les autres.
                                // Si c'est une INDISPO, on pourrait vouloir en rajouter plusieurs, 
                                // mais l'UI actuelle n'en gère qu'une seule à la fois via cette modale.
                                await updateAvailability({
                                    id: mainAvail?.id,
                                    employeeId: currentEmployeeId,
                                    date: selectedDateForAction,
                                    type: localType,
                                    startTime: localType === 'indispo' ? localStart : null,
                                    endTime: localType === 'indispo' ? localEnd : null,
                                    note: localNote
                                });
                            }
                            setSelectedDateForAction(null);
                        } catch (err) {
                            console.error("Erreur de sauvegarde:", err);
                            alert(`Erreur de sauvegarde : ${err.message || "Erreur lors de l'enregistrement."}`);
                        } finally {
                            setIsSaving(false);
                        }
                    };


                    return (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                            <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <div>
                                        <h3 style={{ color: 'white', margin: 0, textTransform: 'capitalize' }}>{format(date, 'EEEE d MMMM', { locale: fr })}</h3>
                                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Modifier ma disponibilité</p>
                                    </div>
                                    <button onClick={() => setSelectedDateForAction(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <button
                                        onClick={() => setLocalType(localType === 'repos' ? null : 'repos')}
                                        style={{ width: '100%', background: localType === 'repos' ? '#10b981' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, transition: '0.2s' }}
                                    >
                                        <div style={{ width: 12, height: 12, background: '#10b981', borderRadius: '50%', opacity: localType === 'repos' ? 1 : 0.3 }} /> Repos souhaité
                                    </button>

                                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', border: localType === 'indispo' ? '1px solid #fbbf24' : '1px solid transparent' }}>
                                        <button
                                            onClick={() => setLocalType(localType === 'indispo' ? null : 'indispo')}
                                            style={{ width: '100%', background: 'none', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, marginBottom: localType === 'indispo' ? '12px' : '0' }}
                                        >
                                            <div style={{ width: 12, height: 12, background: '#fbbf24', borderRadius: '50%', opacity: localType === 'indispo' ? 1 : 0.3 }} /> Indisponibilité
                                        </button>

                                        {localType === 'indispo' && (
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>De</label>
                                                    <input
                                                        type="time"
                                                        value={localStart}
                                                        onChange={(e) => setLocalStart(e.target.value)}
                                                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '6px' }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>À</label>
                                                    <input
                                                        type="time"
                                                        value={localEnd}
                                                        onChange={(e) => setLocalEnd(e.target.value)}
                                                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '6px' }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: '8px' }}>
                                        <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Note / Raison</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Rendez-vous médical..."
                                            value={localNote}
                                            onChange={(e) => setLocalNote(e.target.value)}
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '12px', borderRadius: '12px' }}
                                        />
                                    </div>

                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        style={{ marginTop: '16px', width: '100%', background: 'var(--primary)', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', opacity: isSaving ? 0.7 : 1 }}
                                    >
                                        {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                                    </button>

                                    {/* Bouton de suppression visible uniquement s'il existe déjà une demande */}
                                    {dayAvails.length > 0 && (
                                        <button
                                            onClick={async () => {
                                                setIsSaving(true);
                                                try {
                                                    for (const a of dayAvails) {
                                                        await deleteAvailability(a.id);
                                                    }
                                                    setSelectedDateForAction(null);
                                                } catch (err) {
                                                    alert(`Erreur : ${err.message}`);
                                                } finally {
                                                    setIsSaving(false);
                                                }
                                            }}
                                            disabled={isSaving}
                                            style={{ marginTop: '8px', width: '100%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', opacity: isSaving ? 0.7 : 1 }}
                                        >
                                            🗑️ Retirer ma demande
                                        </button>
                                    )}
                                </div>

                            </div>
                        </div>
                    );
                })()}


                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '12px', display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 10, height: 10, background: '#10b981', borderRadius: '2px' }} /> Repos</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 10, height: 10, background: '#fbbf24', borderRadius: '2px' }} /> Indisponibilité</div>
                </div>
            </div>
        );
    };



    const renderProfil = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                <div style={{ width: 80, height: 80, background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '2rem', fontWeight: 700 }}>
                    {me.name.charAt(0)}
                </div>
                <h2 style={{ color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px 0' }}>{me.name}</h2>
                <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0 }}>{me.role}</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Informations du contrat</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' }}>
                    <span style={{ color: '#64748b' }}>Contrat</span>
                    <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{me.contract}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' }}>
                    <span style={{ color: '#64748b' }}>Heures hebdo max</span>
                    <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{me.maxHoursPerWeek}h</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Taux horaire</span>
                    <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{me.hourlyRate}€ / h</span>
                </div>
            </div>

            <button onClick={logout} style={{
                background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '20px'
            }}>
                <LogOut size={18} /> Déconnexion
            </button>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Header Mobile */}
            <header style={{
                background: 'rgba(30,41,59,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)',
                padding: '16px 20px', position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 2 }}>
                        {currentRestaurant?.name}
                    </div>
                    <div style={{ color: '#f1f5f9', fontSize: '1.2rem', fontWeight: 700 }}>
                        Bonjour, {me.name.split(' ')[0]} 👋
                    </div>
                </div>
                <div style={{ width: 40, height: 40, background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {me.name.charAt(0)}
                </div>
            </header>

            {/* Main Content Area */}
            <main style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                {activeTab === 'planning' && renderPlanning()}
                {activeTab === 'bourse' && renderBourse()}
                {activeTab === 'dispos' && renderDispos()}
                {activeTab === 'profil' && renderProfil()}

                {/* Modal Aide Partielle */}
                {partialShiftSelection && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div className="modal-content" style={{ background: '#1e293b', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Proposer mon aide</h3>
                                <button onClick={() => setPartialShiftSelection(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
                                Vous pouvez prendre tout ou partie de ce besoin ({partialShiftSelection.originalStart} - {partialShiftSelection.originalEnd}).
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>Début</label>
                                        <input
                                            type="time"
                                            value={partialShiftSelection.startTime}
                                            onChange={(e) => setPartialShiftSelection(prev => ({ ...prev, startTime: e.target.value }))}
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '8px' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>Fin</label>
                                        <input
                                            type="time"
                                            value={partialShiftSelection.endTime}
                                            onChange={(e) => setPartialShiftSelection(prev => ({ ...prev, endTime: e.target.value }))}
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '8px' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setPartialShiftSelection(null)}
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'white', cursor: 'pointer' }}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={async () => {
                                        setActionLoading(true);
                                        try {
                                            await takeShift(
                                                partialShiftSelection.shiftId,
                                                currentEmployeeId,
                                                partialShiftSelection.date,
                                                partialShiftSelection.startTime,
                                                partialShiftSelection.endTime
                                            );
                                            alert("Demande d'aide envoyée !");
                                            setPartialShiftSelection(null);
                                            await refreshData();

                                        } catch (e) {
                                            alert("Erreur lors de l'envoi de la demande.");
                                        } finally {
                                            setActionLoading(false);
                                        }
                                    }}
                                    disabled={actionLoading}
                                    style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: actionLoading ? 0.7 : 1 }}
                                >
                                    {actionLoading ? 'Envoi...' : 'Confirmer'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Navigation Bar (Mobile Style) */}
            <nav style={{
                background: 'rgba(30,41,59,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.05)',
                padding: '12px 20px 24px 20px', display: 'flex', justifyContent: 'space-around', position: 'sticky', bottom: 0, zIndex: 50
            }}>
                <button
                    onClick={() => setActiveTab('planning')}
                    style={{
                        background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        color: activeTab === 'planning' ? 'var(--primary)' : '#64748b', cursor: 'pointer'
                    }}
                >
                    <CalendarIcon size={24} />
                    <span style={{ fontSize: '0.75rem', fontWeight: activeTab === 'planning' ? 600 : 500 }}>Planning</span>
                </button>
                <button
                    onClick={() => setActiveTab('bourse')}
                    style={{
                        background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        color: activeTab === 'bourse' ? 'var(--primary)' : '#64748b', cursor: 'pointer'
                    }}
                >
                    <ArrowRightLeft size={24} />
                    <span style={{ fontSize: '0.75rem', fontWeight: activeTab === 'bourse' ? 600 : 500 }}>Échanges</span>
                </button>
                <button
                    onClick={() => setActiveTab('dispos')}
                    style={{
                        background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        color: activeTab === 'dispos' ? 'var(--primary)' : '#64748b', cursor: 'pointer'
                    }}
                >
                    <Clock size={24} />
                    <span style={{ fontSize: '0.75rem', fontWeight: activeTab === 'dispos' ? 600 : 500 }}>Mes Dispos</span>
                </button>
                <button
                    onClick={() => setActiveTab('profil')}
                    style={{
                        background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        color: activeTab === 'profil' ? 'var(--primary)' : '#64748b', cursor: 'pointer'
                    }}
                >
                    <User size={24} />
                    <span style={{ fontSize: '0.75rem', fontWeight: activeTab === 'profil' ? 600 : 500 }}>Profil</span>
                </button>
            </nav>
        </div>
    );
};

export default EmployeeDashboard;
