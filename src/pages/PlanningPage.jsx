import React, { useState, useEffect } from 'react';
import { Icons } from '../components/UI/Icons';
import { ChevronDown, ChevronRight, AlertTriangle, Moon, Clock, Calendar as CalendarIcon, Users, Calculator, Trash, X, ArrowRightLeft } from 'lucide-react';

import { useData } from '../context/DataContext';
import { calculateWeeklyHours, detectScheduleConflict, wouldExceedMaxHours, getVacantTimeSlots } from '../utils/calculations';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const PlanningPage = () => {
    const { 
        currentRestaurant, currentShifts, currentDayNotes, updateShifts, updateDayNotes, 
        updateEmployees, currentEmployees, getEmployeeColor, shiftRequests, approveShiftRequest, 
        rejectShiftRequest, currentAvailabilities, refreshData, approveAvailability, rejectAvailability
    } = useData();

    
    const [actionLoading, setActionLoading] = useState(false);


    const [planningView, setPlanningView] = useState('week'); // 'week' or 'month'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [showAvailability, setShowAvailability] = useState(true); // Toggle for availability panel
    const [editingShift, setEditingShift] = useState(null); // null for create, shift object for edit
    const [shiftFormData, setShiftFormData] = useState({
        date: '',
        employeeId: '',
        startTime: '09:00',
        endTime: '17:00',
        note: ''
    });
    const [validationWarnings, setValidationWarnings] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // ── Helper : formate une date en YYYY-MM-DD en heure LOCALE (évite le décalage UTC+1) ──
    const toLocalDateString = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    // Date Helpers
    const getWeekDates = (date) => {
        const days = ['LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.', 'DIM.'];
        const current = new Date(date);
        const dayOfWeek = current.getDay();
        const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(current.setDate(diff));

        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const today = new Date();
            return {
                name: days[i],
                number: d.getDate(),
                fullDate: d,
                dateString: toLocalDateString(d),
                isToday: d.toDateString() === today.toDateString()
            };
        });
    };

    const getMonthDates = (date) => {
        const days = ['DIM.', 'LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.'];
        const year = date.getFullYear();
        const month = date.getMonth();

        const firstDay = new Date(year, month, 1);
        const startDate = new Date(firstDay);
        const dayOfWeek = firstDay.getDay();
        startDate.setDate(firstDay.getDate() - dayOfWeek);

        const dates = [];
        const today = new Date();

        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + (week * 7) + day);

                dates.push({
                    name: days[day],
                    number: d.getDate(),
                    fullDate: d,
                    dateString: toLocalDateString(d),
                    isToday: d.toDateString() === today.toDateString(),
                    isCurrentMonth: d.getMonth() === month
                });
            }
        }

        return dates;
    };

    const displayDates = planningView === 'month' ? getMonthDates(currentDate) : getWeekDates(currentDate);

    // Navigation
    const navigateWeek = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + (direction * 7));
        setCurrentDate(newDate);
    };

    const navigateMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    // Format date range for display
    const getDateRangeText = () => {
        if (planningView === 'week') {
            const weekDatesArray = getWeekDates(currentDate);
            const start = weekDatesArray[0].fullDate;
            const end = weekDatesArray[6].fullDate;
            const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
            return `Semaine du ${start.getDate()} ${monthNames[start.getMonth()]} au ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
        } else {
            const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
    };

    // Filter shifts for the current week
    const weekDatesArray = getWeekDates(currentDate);
    const weekStart = weekDatesArray[0].dateString;
    const weekEnd = weekDatesArray[6].dateString;
    const currentWeekShifts = currentShifts.filter(s => s.date >= weekStart && s.date <= weekEnd);

    // Identify overtime employees
    const overtimeEmployees = currentEmployees.map(emp => {
        const hours = calculateWeeklyHours(currentWeekShifts, emp.id);
        return { ...emp, weeklyHours: hours };
    }).filter(emp => emp.weeklyHours > emp.maxHoursPerWeek);

    // Open shift modal for creation
    const openShiftModal = (dateString) => {
        setEditingShift(null);
        setShiftFormData({
            date: dateString,
            employeeId: currentEmployees[0]?.id || '',
            startTime: '09:00',
            endTime: '17:00',
            note: ''
        });
        setValidationWarnings([]);
        setShowDeleteConfirm(false);
        setShowShiftModal(true);
    };

    // Open shift modal for editing
    const openEditShiftModal = (shift) => {
        setEditingShift(shift);
        setShiftFormData({
            date: shift.date,
            employeeId: shift.employeeId,
            startTime: shift.startTime,
            endTime: shift.endTime,
            note: shift.note || ''
        });
        setValidationWarnings([]);
        setShowDeleteConfirm(false);
        setShowShiftModal(true);
    };

    // Delete shift
    const handleDeleteShift = () => {
        if (editingShift) {
            updateShifts(currentShifts.filter(s => s.id !== editingShift.id));
            setShowShiftModal(false);
        }
    };

    // Validation temps réel pour les alertes de disponibilité
    useEffect(() => {
        if (!showShiftModal) return;
        
        const warnings = [];
        const isVacant = shiftFormData.employeeId === 'vacant' || !shiftFormData.employeeId;
        const employee = isVacant ? null : currentEmployees.find(e => e.id == shiftFormData.employeeId);

        if (employee && shiftFormData.date) {
            // Check for schedule conflicts (exclude current shift if editing)
            const shiftsToCheck = editingShift
                ? currentWeekShifts.filter(s => s.id !== editingShift.id)
                : currentWeekShifts;

            const conflict = detectScheduleConflict(shiftsToCheck, {
                employeeId: employee.id,
                date: shiftFormData.date,
                startTime: shiftFormData.startTime,
                endTime: shiftFormData.endTime
            });

            if (conflict) {
                warnings.push(`Conflit d'horaire : ${employee.name} est déjà shifté de ${conflict.startTime} à ${conflict.endTime} ce jour`);
            }

            // Check for overtime
            if (wouldExceedMaxHours(shiftsToCheck, employee, {
                startTime: shiftFormData.startTime,
                endTime: shiftFormData.endTime
            })) {
                const currentHours = calculateWeeklyHours(shiftsToCheck, employee.id);
                warnings.push(`Heures supplémentaires : ${employee.name} dépassera son quota (${currentHours.toFixed(1)}h / ${employee.maxHoursPerWeek}h)`);
            }

            // Check for Availabilities/Preferences - only APPROVED availabilities trigger alerts
            const dayAvails = currentAvailabilities.filter(a => a.employeeId == employee.id && a.date === shiftFormData.date && a.status === 'approved');

            dayAvails.forEach(avail => {
                if (avail.type === 'repos') {
                    warnings.push(`⚠️ REPOS : ${employee.name} a demandé un repos pour ce jour.`);
                } else if (avail.type === 'indispo') {
                    const [uSH, uSM] = avail.startTime.split(':').map(Number);
                    const [uEH, uEM] = avail.endTime.split(':').map(Number);
                    const [sH, sM] = shiftFormData.startTime.split(':').map(Number);
                    const [eH, eM] = shiftFormData.endTime.split(':').map(Number);
                    
                    const endHNorm = eH < sH ? eH + 24 : eH;
                    const uEndHNorm = uEH < uSH ? uEH + 24 : uEH;

                    const hasOverlap = (sH * 60 + sM) < (uEndHNorm * 60 + uEM) && (endHNorm * 60 + eM) > (uSH * 60 + uSM);
                    
                    if (hasOverlap) {
                        warnings.push(`🚫 INDISPO : ${employee.name} est indisponible de ${avail.startTime} à ${avail.endTime} !`);
                    } else {
                        warnings.push(`ℹ️ NOTE : ${employee.name} a une contrainte sur une autre partie du jour (${avail.startTime}-${avail.endTime}).`);
                    }
                }
            });
        }
        
        // Déduplication des messages pour éviter les alertes redondantes
        const uniqueWarnings = Array.from(new Set(warnings));
        setValidationWarnings(uniqueWarnings);
    }, [shiftFormData, showShiftModal, currentAvailabilities, currentEmployees, currentWeekShifts, editingShift]);


      // Validate and save shift (create or update)
    const handleSaveShift = () => {
        if (!shiftFormData.employeeId || !shiftFormData.date || !shiftFormData.startTime || !shiftFormData.endTime) {
            alert('Veuillez remplir tous les champs requis');
            return;
        }

        const isVacant = shiftFormData.employeeId === 'vacant' || !shiftFormData.employeeId;
        
        // Final check on warnings before save (though they are already real-time)
        if (validationWarnings.length > 0) {
            // Already handled by UI displaying Forcer la sauvegarde
            // but double check here if needed
        }
        // Save shift (create or update)
        if (editingShift) {
            // Update existing shift
            updateShifts(currentShifts.map(s =>
                s.id === editingShift.id
                    ? {
                        ...s,
                        employeeId: isVacant ? null : parseInt(shiftFormData.employeeId),
                        date: shiftFormData.date,
                        startTime: shiftFormData.startTime,
                        endTime: shiftFormData.endTime,
                        note: shiftFormData.note
                    }
                    : s
            ));
        } else {
            // Create new shift
            const newId = Math.max(...currentShifts.map(s => s.id), 0) + 1;
            updateShifts([...currentShifts, {
                id: newId,
                employeeId: isVacant ? null : parseInt(shiftFormData.employeeId),
                date: shiftFormData.date,
                startTime: shiftFormData.startTime,
                endTime: shiftFormData.endTime,
                note: shiftFormData.note
            }]);
        }

        setShowShiftModal(false);
        setEditingShift(null);
    };

    // Force save despite warnings
    const handleForceSave = () => {
        const isVacant = shiftFormData.employeeId === 'vacant' || !shiftFormData.employeeId;
        if (editingShift) {

            // Update existing shift
            updateShifts(currentShifts.map(s =>
                s.id === editingShift.id
                    ? {
                        ...s,
                        employeeId: isVacant ? null : parseInt(shiftFormData.employeeId),
                        date: shiftFormData.date,
                        startTime: shiftFormData.startTime,
                        endTime: shiftFormData.endTime,
                        note: shiftFormData.note
                    }
                    : s
            ));
        } else {
            // Create new shift
            const newId = Math.max(...currentShifts.map(s => s.id), 0) + 1;
            updateShifts([...currentShifts, {
                id: newId,
                employeeId: isVacant ? null : parseInt(shiftFormData.employeeId),
                date: shiftFormData.date,
                startTime: shiftFormData.startTime,
                endTime: shiftFormData.endTime,
                note: shiftFormData.note
            }]);
        }

        setShowShiftModal(false);
        setValidationWarnings([]);
        setEditingShift(null);
    };

    // Availability view calculations
    const employeeAvailability = currentEmployees.map(emp => {
        const hours = calculateWeeklyHours(currentWeekShifts, emp.id);
        const remaining = emp.maxHoursPerWeek - hours;
        const percentage = (hours / emp.maxHoursPerWeek) * 100;

        let status = 'available'; // green
        if (percentage >= 80) status = 'limited'; // red
        else if (percentage >= 50) status = 'moderate'; // yellow

        // Nouveau: Préférences de la semaine
        const weekAvails = currentAvailabilities.filter(a => a.employeeId === emp.id && a.date >= weekStart && a.date <= weekEnd);
        // Compter les demandes en attente vs approuvées
        const pendingRepos = weekAvails.filter(a => a.type === 'repos' && a.status === 'pending');
        const pendingIndispo = weekAvails.filter(a => a.type === 'indispo' && a.status === 'pending');
        const reposCount = new Set(weekAvails.filter(a => a.type === 'repos' && a.status === 'approved').map(a => a.date)).size;
        const indispoCount = new Set(weekAvails.filter(a => a.type === 'indispo' && a.status === 'approved').map(a => a.date)).size;

        return {
            ...emp,
            hoursWorked: hours,
            hoursRemaining: remaining,
            percentage: percentage,
            status: status,
            reposCount,
            indispoCount,
            pendingRepos, // Tableaux complets pour le panneau d'approbation
            pendingIndispo
        };
    }).sort((a, b) => {
        // Sort by major preference first, then by remaining hours
        if (b.reposCount !== a.reposCount) return b.reposCount - a.reposCount;
        return b.hoursRemaining - a.hoursRemaining;
    });


    // Render Logic
    return (
        <div className="planning-wrapper">
            {/* Controls */}
            <div className="planning-controls">
                <div>
                    <h2 className="planning-title">Planning</h2>
                    <p className="planning-subtitle">{getDateRangeText()}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="view-switcher">
                        <button className={`view-btn ${planningView === 'week' ? 'active' : ''}`} onClick={() => setPlanningView('week')}>Semaine</button>
                        <button className={`view-btn ${planningView === 'month' ? 'active' : ''}`} onClick={() => setPlanningView('month')}>Mois</button>
                        <button
                            className={`view-btn ${showAvailability ? 'active' : ''}`}
                            onClick={() => setShowAvailability(!showAvailability)}
                        >
                            Disponibilités {showAvailability ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>

                        <button
                            className="btn-secondary"
                            style={{ padding: '0.5rem 1rem' }}
                            onClick={() => planningView === 'week' ? navigateWeek(-1) : navigateMonth(-1)}
                        >
                            <Icons.ChevronLeft size={18} />
                        </button>
                        <button
                            className="btn-secondary"
                            style={{ padding: '0.5rem 1rem' }}
                            onClick={() => planningView === 'week' ? navigateWeek(1) : navigateMonth(1)}
                        >
                            <Icons.ChevronRight size={18} />
                        </button>
                    </div>

                </div>
            </div>


            {/* Overtime Alert */}
            {
                overtimeEmployees.length > 0 && (
                    <div className="conflict-alert">
                        <div className="conflict-icon"><AlertTriangle size={24} color="#dc2626" /></div>
                        <div className="conflict-content">
                            <div className="conflict-title">Alerte Heures Supplémentaires</div>
                            <div className="conflict-message">
                                {overtimeEmployees.map(emp => (
                                    <div key={emp.id}>
                                        <strong>{emp.name}</strong> dépassera son quota : {emp.weeklyHours.toFixed(1)}h / {emp.maxHoursPerWeek}h
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Availability Panel (collapsible) */}
            {showAvailability && (
                <div className="availability-panel">
                    <div className="availability-view">
                        {employeeAvailability.map(emp => (
                            <div key={emp.id} className={`availability-card status-${emp.status}`}>
                                <div className="availability-header">
                                    <div className="availability-name">{emp.name}</div>
                                    <div className="availability-role">{emp.role}</div>
                                </div>
                                <div className="availability-stats">
                                    <div className="availability-hours">
                                        <span className="hours-worked">{emp.hoursWorked.toFixed(1)}h</span>
                                        <span className="hours-separator">/</span>
                                        <span className="hours-max">{emp.maxHoursPerWeek}h</span>
                                    </div>
                                    <div className="availability-percentage">
                                        {emp.percentage.toFixed(0)}%
                                    </div>
                                </div>
                                <div className="availability-bar">
                                    <div
                                        className="availability-bar-fill"
                                        style={{ width: `${Math.min(emp.percentage, 100)}%` }}
                                    ></div>
                                </div>
                                <div className="availability-remaining">
                                    {emp.hoursRemaining > 0
                                        ? `${emp.hoursRemaining.toFixed(1)}h disponibles`
                                        : `Quota dépassé de ${Math.abs(emp.hoursRemaining).toFixed(1)}h`
                                    }
                                </div>
                                {/* Demandes APPROUVÉES (badges simples) */}
                                {(emp.reposCount > 0 || emp.indispoCount > 0) && (
                                    <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {emp.reposCount > 0 && <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>✅ {emp.reposCount} Repos</span>}
                                        {emp.indispoCount > 0 && <span style={{ fontSize: '0.65rem', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>✅ {emp.indispoCount} Indispo.</span>}
                                    </div>
                                )}
                                {/* Demandes EN ATTENTE d'approbation */}
                                {(emp.pendingRepos?.length > 0 || emp.pendingIndispo?.length > 0) && (
                                    <div style={{ marginTop: '8px', borderTop: '1px solid rgba(251,191,36,0.2)', paddingTop: '8px' }}>
                                        <div style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            ⏳ DEMANDES EN ATTENTE
                                        </div>
                                        {[...( emp.pendingRepos || []), ...(emp.pendingIndispo || [])].map(avail => (
                                            <div key={avail.id} style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '8px', padding: '6px 8px', marginBottom: '4px' }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '4px' }}>
                                                    {avail.type === 'repos' ? '🛌 Repos' : `🚫 Indispo (${avail.startTime}–${avail.endTime})`} – {avail.date}
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button
                                                        onClick={() => approveAvailability(avail.id)}
                                                        style={{ flex: 1, background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', fontSize: '0.6rem', fontWeight: 700, padding: '3px 6px', borderRadius: '6px', cursor: 'pointer' }}
                                                    >
                                                        ✅ Approuver
                                                    </button>
                                                    <button
                                                        onClick={() => rejectAvailability(avail.id)}
                                                        style={{ flex: 1, background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.6rem', fontWeight: 700, padding: '3px 6px', borderRadius: '6px', cursor: 'pointer' }}
                                                    >
                                                        ❌ Refuser
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>


                        ))}
                    </div>
                </div>
            )}

            {/* Shift Requests Section (Toutes les demandes en attente) */}
            {(() => {
                const pendingRequests = (shiftRequests || []).filter(req => req.status === 'pending');

                if (pendingRequests.length === 0) return null;

                return (
                    <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ArrowRightLeft size={18} /> Demandes de shifts en attente
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                            {pendingRequests.map(req => {
                                const shift = currentShifts.find(s => s.id === req.shiftId);
                                const requester = currentEmployees.find(e => e.id === req.requestingEmployeeId);
                                const originalOwner = currentEmployees.find(e => e.id === req.originalEmployeeId);
                                if (!shift || !requester) return null;

                                const isPartial = req.startTime && req.endTime && (req.startTime !== shift.startTime || req.endTime !== shift.endTime);

                                return (
                                    <div key={req.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <div>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'capitalize' }}>
                                                    {format(new Date(shift.date), 'EEEE d MMMM', { locale: fr })}
                                                </div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                                                    {shift.startTime} - {shift.endTime}
                                                </div>
                                            </div>
                                        {isPartial && (
                                            <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                AIDE PARTIELLE
                                            </div>
                                        )}
                                        {!isPartial && (
                                            <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                ÉCHANGE
                                            </div>
                                        )}
                                    </div>
                                    
                                    {isPartial && (
                                        <div style={{ margin: '8px 0', padding: '10px', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '2px' }}>Intervalle demandé :</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>
                                                {req.startTime} - {req.endTime}
                                            </div>
                                        </div>
                                    )}
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                                            <Users size={16} color="var(--text-muted)" />
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                <strong style={{ color: 'var(--text-primary)' }}>{requester.name}</strong> souhaite {shift.employeeId === null ? "récupérer ce poste" : `remplacer ${originalOwner?.name || '?'}`}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                            <button 
                                                onClick={() => approveShiftRequest(req.id, shift.id, requester.id)}
                                                style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
                                            >
                                                Accepter
                                            </button>
                                            <button 
                                                onClick={() => rejectShiftRequest(req.id)}
                                                style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
                                            >
                                                Refuser
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* Calendar Grid - Week or Month View */}
            <div className={`calendar-grid ${planningView === 'month' ? 'month-view' : 'week-view'}`}>
                {displayDates.map((date, idx) => {
                    // Filter shifts for this day
                    const dayShifts = currentShifts.filter(s => s.date === date.dateString).sort((a, b) => a.startTime.localeCompare(b.startTime));

                    // Calculate layout for overlaps (only for week view)
                    const getShiftStyle = (shift, allVisibleCards = dayShifts) => {
                        if (planningView === 'month') return {};

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

                        // On calcule les overlaps par rapport aux CARTES affichées, pas seulement aux shifts individuels
                        const overlaps = allVisibleCards.filter(s => {
                            if (s.id === shift.id) return true;
                            // Check overlap for cards (grouped or single)
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

                    // Détecter les shifts hors de la plage visible (avant 7h)
                    const hiddenShifts = planningView === 'week'
                        ? dayShifts.filter(s => {
                            const h = parseInt((s.startTime || '0:0').split(':')[0]);
                            return h < 7 && h >= 2; // 2h-7h non couverts
                        })
                        : [];

                    return (
                        <div key={idx} className={`day-column ${date.isToday ? 'today' : ''} ${planningView === 'month' && !date.isCurrentMonth ? 'day-out-of-month' : ''}`}>
                            <div className="day-header">
                                <div className="day-name">{date.name}</div>
                                <div className="day-number">{date.number}</div>
                                {/* Indicateurs de dispos pour la journée */}
                                {(() => {
                                        const dayAvails = currentAvailabilities.filter(a => a.date === date.dateString);
                                        if (dayAvails.length === 0) return null;
                                        // On compte le nombre d'EMPLOYÉS uniques ayant un repos ou une indispo
                                        const repos = new Set(dayAvails.filter(a => a.type === 'repos' && a.status === 'approved').map(a => a.employeeId)).size;
                                        const indispo = new Set(dayAvails.filter(a => a.type === 'indispo' && a.status === 'approved').map(a => a.employeeId)).size;
                                        
                                        if (repos === 0 && indispo === 0) return null;
                                        
                                        return (
                                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'center' }}>
                                                {repos > 0 && <span title={`${repos} personne(s) en repos`} style={{ background: '#10b981', color: 'white', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>{repos}R</span>}
                                                {indispo > 0 && <span title={`${indispo} personne(s) indisponible(s)`} style={{ background: '#fbbf24', color: 'black', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>{indispo}I</span>}

                                            </div>
                                        );

                                })()}
                            </div>


                            <div className="day-content" style={{ position: 'relative', height: '100%', minHeight: '800px', overflow: 'visible' }}>
                                {/* Background Grid Lines 7h-02h (only for week view) */}
                                {planningView === 'week' && (
                                    <div className="day-grid-lines">
                                        {Array.from({ length: 20 }).map((_, i) => {
                                            const hour = 7 + i; // 7h à 26h (02h AM)
                                            const is22h = hour === 22;
                                            const isMidnight = hour === 24;
                                            return (
                                                <div
                                                    key={i}
                                                    className="grid-line"
                                                    style={{
                                                        top: `${(i / 19) * 100}%`,
                                                        borderTopColor: (is22h || isMidnight) ? 'rgba(99,102,241,0.35)' : undefined,
                                                        borderTopWidth: (is22h || isMidnight) ? '2px' : undefined,
                                                    }}
                                                >
                                                    {(is22h || isMidnight) && (
                                                        <span style={{ fontSize: '0.6rem', color: 'rgba(99,102,241,0.6)', position: 'absolute', left: 2, top: -8 }}>
                                                            {is22h ? 'NUIT' : 'MINUIT'}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Alerte shift hors plage visible (entre 2h et 7h) */}
                                {hiddenShifts.length > 0 && (
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, right: 0,
                                        background: '#fef3c7', borderBottom: '1px solid #f59e0b',
                                        padding: '2px 4px', fontSize: '0.65rem', color: '#92400e',
                                        zIndex: 10, cursor: 'pointer',
                                    }}
                                        onClick={() => openEditShiftModal(hiddenShifts[0])}
                                    >
                                        <AlertTriangle size={10} style={{ marginRight: 4 }} /> {hiddenShifts.map(s => {
                                            const emp = currentEmployees.find(e => e.id === s.employeeId);
                                            return `${emp?.name} ${s.startTime}-${s.endTime}`;
                                        }).join(', ')}
                                    </div>
                                )}

                                {/* Traitement et groupement des shifts */}
                                {(() => {
                                    // 1. Séparer real et vacant
                                    const realShifts = dayShifts.filter(s => s.employeeId !== null && s.employeeId !== undefined);
                                    const vacantShifts = dayShifts.filter(s => s.employeeId === null || s.employeeId === undefined);

                                    // 2. Grouper les vacant par (startTime, endTime)
                                    const groupedVacant = [];
                                    const vacantMap = new Map();

                                    vacantShifts.forEach(vs => {
                                        const key = `${vs.startTime}-${vs.endTime}`;
                                        if (vacantMap.has(key)) {
                                            const group = vacantMap.get(key);
                                            group.count++;
                                            group.ids.push(vs.id);
                                        } else {
                                            const group = {
                                                id: `group-${vs.id}`,
                                                startTime: vs.startTime,
                                                endTime: vs.endTime,
                                                date: vs.date,
                                                count: 1,
                                                ids: [vs.id],
                                                isGroup: true
                                            };
                                            vacantMap.set(key, group);
                                            groupedVacant.push(group);
                                        }
                                    });

                                    // 3. Liste finale des cartes à afficher pour le calcul d'overlap
                                    const allVisibleCards = [...realShifts, ...groupedVacant];

                                    return (
                                        <>
                                            {/* Rendu des shifts réels */}
                                            {realShifts.map(shift => {
                                                const employee = currentEmployees.find(e => e.id === shift.employeeId);
                                                if (!employee) return null;

                                                const style = getShiftStyle(shift, allVisibleCards);
                                                const startH = parseInt((shift.startTime || '0:0').split(':')[0]);
                                                const isNightShift = startH < 7;
                                                const hasRequests = (shiftRequests || []).some(req => req.shiftId === shift.id && req.status === 'pending');

                                                return (
                                                    <div
                                                        key={shift.id}
                                                        className={`shift-card ${planningView === 'week' ? 'shift-timeline' : ''}`}
                                                        style={{
                                                            borderColor: isNightShift ? '#f59e0b' : getEmployeeColor(employee.id),
                                                            backgroundColor: isNightShift ? 'rgba(245,158,11,0.15)' : `${getEmployeeColor(employee.id)}15`,
                                                            borderLeft: `4px solid ${isNightShift ? '#f59e0b' : getEmployeeColor(employee.id)}`,
                                                            position: 'relative',
                                                            padding: allVisibleCards.length > 3 ? '4px 6px' : '0.75rem',
                                                            ...style
                                                        }}
                                                        onClick={(e) => { e.stopPropagation(); openEditShiftModal(shift); }}
                                                    >
                                                        {isNightShift && <div style={{ fontSize: '0.6rem', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 2 }}><Moon size={10} /> Nuit</div>}
                                                        <div className="shift-name" style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: 4, 
                                                            fontSize: allVisibleCards.length > 3 ? '0.7rem' : '0.8rem',
                                                            lineHeight: 1.1
                                                        }}>
                                                            {employee.name}
                                                        </div>
                                                        <div className="shift-time" style={{ 
                                                            fontSize: allVisibleCards.length > 3 ? '0.6rem' : '0.7rem',
                                                            opacity: 0.9
                                                        }}>
                                                            {shift.startTime} - {shift.endTime}
                                                        </div>

                                                        {/* Badges footer */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '4px' }}>
                                                            {shift.status === 'offered' ? (
                                                                <span style={{ fontSize: '0.55rem', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', padding: '1px 4px', borderRadius: 4, fontWeight: 700 }}>
                                                                    BOURSE
                                                                </span>
                                                            ) : <div />}
                                                            
                                                            {hasRequests && (
                                                                <div style={{
                                                                    background: '#f59e0b',
                                                                    color: 'white', borderRadius: '50%', width: 16, height: 16,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                                }} title="Demande d'échange en attente">
                                                                    <ArrowRightLeft size={10} strokeWidth={3} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Rendu des shifts vacants groupés (Besoins manuels) */}
                                            {groupedVacant.map(group => {
                                                const style = getShiftStyle(group, allVisibleCards);
                                                return (
                                                    <div
                                                        key={group.id}
                                                        className="shift-card"
                                                        style={{
                                                            borderColor: '#8b5cf6', // Violet distinct
                                                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                                            borderLeft: '4px solid #8b5cf6',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            justifyContent: 'center',
                                                            padding: allVisibleCards.length > 3 ? '4px 6px' : '0.75rem',
                                                            ...style
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // On ouvre le premier shift du groupe pour modification
                                                            const firstShift = vacantShifts.find(s => s.id === parseInt(group.ids[0]));
                                                            openEditShiftModal(firstShift);
                                                        }}
                                                    >
                                                        <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 2 }}>
                                                            Besoin
                                                        </div>
                                                        <div style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 800 }}>
                                                            {group.count} {group.count > 1 ? 'pers.' : 'pers.'}
                                                        </div>
                                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 600 }}>
                                                            {group.startTime} - {group.endTime}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    );
                                })()}

                                {getVacantTimeSlots(dayShifts, date.dateString, currentRestaurant).map((vacant, vIdx) => {
                                    // Pour les slots virtuels, on utilise toujours dayShifts pour le calcul (ou mieux, allVisibleCards)
                                    // Mais les virtual n'overlap jamais entre eux normalement.
                                    const style = getShiftStyle(vacant, [...dayShifts, ...getVacantTimeSlots(dayShifts, date.dateString, currentRestaurant).map((v, i) => ({ ...v, id: `v-${i}` }))]);

                                    return (
                                        <div
                                            key={`vacant-${vIdx}`}
                                            className="shift-card vacant-virtual"
                                            style={{
                                                ...style,
                                                border: '2px dashed #94a3b8',
                                                backgroundColor: 'rgba(148, 163, 184, 0.05)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                zIndex: 5
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingShift(null);
                                                setShiftFormData({
                                                    date: date.dateString,
                                                    employeeId: 'vacant',
                                                    startTime: vacant.startTime,
                                                    endTime: vacant.endTime,
                                                    note: ''
                                                });
                                                setShowShiftModal(true);
                                            }}
                                        >
                                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>AIDE ?</div>
                                            <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{vacant.startTime}-{vacant.endTime}</div>
                                        </div>
                                    );
                                })}

                                {/* Click to add shift at specific time (approx) */}
                                {(planningView === 'week' || date.isCurrentMonth) && (
                                    <div
                                        className="day-click-area"
                                        onClick={() => openShiftModal(date.dateString)}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
                                    ></div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Shift Modal */}
            {showShiftModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">{editingShift ? 'Modifier un shift' : 'Ajouter un shift'}</h2>
                            <button className="btn-close" onClick={() => setShowShiftModal(false)}><X size={20} /></button>
                        </div>

                        {validationWarnings.length > 0 && (
                            <div className="warning-box">
                                {validationWarnings.map((warning, idx) => <div key={idx}>{warning}</div>)}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input
                                type="date"
                                className="form-input"
                                value={shiftFormData.date}
                                onChange={(e) => setShiftFormData({ ...shiftFormData, date: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Employé *</label>
                            <select
                                className="form-select"
                                value={shiftFormData.employeeId}
                                onChange={(e) => setShiftFormData({ ...shiftFormData, employeeId: e.target.value })}
                            >
                                <option value="vacant">-- Poste Libre (Besoin) --</option>
                                {currentEmployees.map(emp => {
                                    const dayAvails = currentAvailabilities.filter(a => a.employeeId == emp.id && a.date === shiftFormData.date);
                                    const hasRepos = dayAvails.some(a => a.type === 'repos');
                                    const hasIndispo = dayAvails.some(a => a.type === 'indispo');
                                    const label = `${emp.name} - ${emp.role}${hasRepos ? ' (REPOS ⚠️)' : hasIndispo ? ' (INDISPO ⚠️)' : ''}`;
                                    
                                    return (
                                        <option key={emp.id} value={emp.id}>
                                            {label}
                                        </option>
                                    );
                                })}

                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Heure de début *</label>
                            <input
                                type="time"
                                className="form-input"
                                value={shiftFormData.startTime}
                                onChange={(e) => setShiftFormData({ ...shiftFormData, startTime: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Heure de fin *</label>
                            <input
                                type="time"
                                className="form-input"
                                value={shiftFormData.endTime}
                                onChange={(e) => setShiftFormData({ ...shiftFormData, endTime: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Note</label>
                            <textarea
                                className="form-input"
                                rows="2"
                                value={shiftFormData.note}
                                onChange={(e) => setShiftFormData({ ...shiftFormData, note: e.target.value })}
                                placeholder="Note optionnelle..."
                            />
                        </div>

                        {editingShift && (shiftRequests || []).some(req => req.shiftId === editingShift.id && req.status === 'pending') && (
                            <div className="form-group" style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(245,158,11,0.05)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <label className="form-label" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <ArrowRightLeft size={16} /> Demandes d'échange en attente
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {shiftRequests
                                        .filter(req => req.shiftId === editingShift.id && req.status === 'pending')
                                        .map(req => {
                                            const requester = currentEmployees.find(e => e.id === req.requestingEmployeeId);
                                            return (
                                                <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px' }}>
                                                    <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{requester?.name || 'Inconnu'}</span>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            className="btn-primary"
                                                            style={{ padding: '4px 12px', fontSize: '0.8rem', background: '#10b981' }}
                                                            onClick={async () => {
                                                                if (window.confirm(`Approuver le remplacement par ${requester?.name} ?`)) {
                                                                    await approveShiftRequest(req.id, editingShift.id, req.requestingEmployeeId);
                                                                    setShowShiftModal(false);
                                                                }
                                                            }}
                                                        >
                                                            Approuver
                                                        </button>
                                                        <button
                                                            className="btn-secondary"
                                                            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                                            onClick={async () => {
                                                                if (window.confirm(`Refuser la demande de ${requester?.name} ?`)) {
                                                                    await rejectShiftRequest(req.id);
                                                                }
                                                            }}
                                                        >
                                                            Refuser
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        <div className="form-actions">
                            {editingShift && (
                                !showDeleteConfirm ? (
                                    <button className="btn-delete" onClick={() => setShowDeleteConfirm(true)}>
                                        <Icons.Trash size={16} /> Supprimer
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn-danger" onClick={handleDeleteShift}>
                                            Confirmer ?
                                        </button>
                                        <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                                            Annuler
                                        </button>
                                    </div>
                                )
                            )}
                            <button className="btn-secondary" onClick={() => setShowShiftModal(false)}>Annuler</button>
                            {validationWarnings.length > 0 ? (
                                <button className="btn-warning" onClick={handleForceSave}>Forcer la sauvegarde</button>
                            ) : (
                                <button className="btn-primary" onClick={handleSaveShift}>
                                    {editingShift ? 'Enregistrer' : 'Créer'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div >
    );
};

export default PlanningPage;
