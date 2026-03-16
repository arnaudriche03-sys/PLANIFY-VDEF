import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Calendar as CalendarIcon, Clock, User, LogOut, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, ArrowRightLeft } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

const EmployeeDashboard = () => {
    const { currentRestaurant, employees, currentRestaurantId, currentShifts, currentEmployeeId, logout, offerShift, takeShift, shiftRequests } = useData();
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

    const renderPlanning = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header Calendrier */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <button onClick={handlePrevWeek} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '8px', cursor: 'pointer' }}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ fontWeight: '600', color: '#f1f5f9', fontSize: '1.05rem', textTransform: 'capitalize' }}>
                    {format(weekStart, 'MMMM yyyy', { locale: fr })}
                </div>
                <button onClick={handleNextWeek} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '8px', cursor: 'pointer' }}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Jours de la semaine style "Mobile Calendar" */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                {weekDays.map(day => {
                    const isTodayFlag = isToday(day);
                    const hasShift = myShiftsThisWeek.some(s => isSameDay(new Date(s.date), day));

                    return (
                        <div key={day.toISOString()} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                            background: isTodayFlag ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                            padding: '10px 4px', borderRadius: '12px', minWidth: '40px',
                            border: isTodayFlag ? 'none' : '1px solid rgba(255,255,255,0.05)',
                        }}>
                            <span style={{ fontSize: '0.7rem', color: isTodayFlag ? 'white' : '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                                {format(day, 'EEEEEE', { locale: fr })}
                            </span>
                            <span style={{ fontSize: '1rem', color: isTodayFlag ? 'white' : '#f1f5f9', fontWeight: 700 }}>
                                {format(day, 'd')}
                            </span>
                            {hasShift && (
                                <div style={{ width: 4, height: 4, borderRadius: '50%', background: isTodayFlag ? 'white' : 'var(--primary)', marginTop: 2 }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Liste des shifts */}
            <h3 style={{ fontSize: '1.1rem', color: '#f1f5f9', fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>Mes horaires</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {weekDays.map(day => {
                    const shiftsForDay = myShiftsThisWeek.filter(s => isSameDay(new Date(s.date), day));
                    if (shiftsForDay.length === 0) return null; // Ne pas afficher les jours sans shift pour alléger la vue

                    return shiftsForDay.map((shift, idx) => (
                        <div key={`${day.toISOString()}-${idx}`} style={{
                            background: 'rgba(255,255,255,0.05)', borderLeft: '4px solid var(--primary)',
                            borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'capitalize', marginBottom: 4 }}>
                                        {format(day, 'EEEE d MMMM', { locale: fr })}
                                    </div>
                                    <div style={{ color: '#f1f5f9', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Clock size={18} color="var(--primary)" />
                                        {shift.startTime} - {shift.endTime}
                                    </div>
                                    {shift.note && (
                                        <div style={{ color: '#fbbf24', fontSize: '0.85rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <AlertCircle size={14} /> {shift.note}
                                        </div>
                                    )}
                                </div>
                                {shift.status === 'offered' && (
                                    <span style={{ fontSize: '0.75rem', background: 'rgba(245,158,11,0.2)', color: '#fbbf24', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                        Proposé
                                    </span>
                                )}
                            </div>

                            {/* Actions sur le shift */}
                            {shift.status !== 'offered' && (
                                <button
                                    onClick={async () => {
                                        if (window.confirm("Voulez-vous vraiment proposer ce shift à l'équipe ? Si personne ne le prend ou si le manager refuse, il restera sous votre responsabilité.")) {
                                            setActionLoading(true);
                                            try {
                                                await offerShift(shift.id);
                                                alert("Shift proposé avec succès !");
                                            } catch (e) {
                                                alert("Erreur lors de la proposition de shift");
                                            }
                                            setActionLoading(false);
                                        }
                                    }}
                                    disabled={actionLoading}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#cbd5e1', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 500,
                                        opacity: actionLoading ? 0.5 : 1
                                    }}
                                >
                                    <ArrowRightLeft size={16} /> Proposer à l'équipe
                                </button>
                            )}
                        </div>
                    ));
                })}
                {myShiftsThisWeek.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                        <CalendarIcon size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                        <p>Aucun shift prévu cette semaine.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderBourse = () => {
        // Obtenir tous les shifts 'offered' du restaurant qui ne sont pas à MOI
        const offeredShifts = currentShifts.filter(s => s.status === 'offered' && s.employeeId !== currentEmployeeId);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ color: '#f1f5f9', fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ArrowRightLeft color="var(--primary)" /> Échanges de shifts
                </h2>

                {offeredShifts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                        <p>Aucun shift n'est proposé par l'équipe pour le moment.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {offeredShifts.map(shift => {
                            const shiftDate = new Date(shift.date);
                            const owner = (employees[currentRestaurantId] || []).find(e => e.id === shift.employeeId);
                            // Vérifier si j'ai DÉJÀ fait une demande pour ce shift
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
                                        <User size={14} /> Laissé par <strong style={{ color: 'white' }}>{owner?.name || 'Inconnu'}</strong>
                                    </div>

                                    {myRequest ? (
                                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
                                            Demande envoyée au manager
                                        </div>
                                    ) : (
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`Voulez-vous récupérer ce shift de ${owner?.name} ? Le manager devra valider votre demande.`)) {
                                                    setActionLoading(true);
                                                    try {
                                                        await takeShift(shift.id, currentEmployeeId, shift.date);
                                                        alert("Demande envoyée ! Le manager va être notifié.");
                                                    } catch (e) {
                                                        alert("Erreur lors de la prise du shift");
                                                    }
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
