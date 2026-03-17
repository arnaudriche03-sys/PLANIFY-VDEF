import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Calendar as CalendarIcon, Clock, User, LogOut, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, ArrowRightLeft, X, Users } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getVacantTimeSlots } from '../../utils/calculations';

const EmployeeDashboard = () => {
    const { currentRestaurant, employees, currentRestaurantId, currentShifts, currentEmployeeId, logout, offerShift, takeShift, claimVacantShift, shiftRequests } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState('planning'); // 'planning' | 'dispos' | 'profil' | 'bourse'
    const [actionLoading, setActionLoading] = useState(false);

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
                                                if (window.confirm(`Proposer mon aide pour ce créneau de ${group.startTime} à ${group.endTime} ?`)) {
                                                    takeShift(group.ids[0], currentEmployeeId, dateStr);
                                                }
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
        const offeredShifts = currentShifts.filter(s => 
            (s.status === 'offered' || s.employeeId === null) && s.employeeId !== currentEmployeeId
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
                        {myShiftsThisWeek.length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Aucun shift prévu pour le moment.</p>
                        ) : (
                            myShiftsThisWeek.map(shift => (
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
                        )}
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
                                                onClick={async () => {
                                                    if (window.confirm(`Voulez-vous récupérer ce shift ? Le manager devra valider votre demande.`)) {
                                                        setActionLoading(true);
                                                        try {
                                                            await takeShift(shift.id, currentEmployeeId, shift.date);
                                                            alert("Demande envoyée !");
                                                        } catch (e) { alert("Erreur lors de la prise du shift"); }
                                                        setActionLoading(false);
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

    const renderDispos = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(245,158,11,0.1)', color: '#fbbf24', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Clock size={32} />
            </div>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.3rem', fontWeight: 700 }}>Mes Disponibilités</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Bientôt, vous pourrez indiquer ici vos jours de repos souhaités et vos indisponibilités.
                Elles remonteront directement au manager lors de la création du planning.
            </p>
        </div>
    );

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
