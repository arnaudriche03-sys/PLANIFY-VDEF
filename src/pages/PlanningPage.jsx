import React, { useState, useMemo } from 'react';
import { Icons } from '../components/UI/Icons';
import { ChevronDown, ChevronRight, AlertTriangle, Moon, Clock, Calendar as CalendarIcon, Users, Calculator, Trash, X, ArrowRightLeft } from 'lucide-react';

import { useData } from '../context/DataContext';
import { calculateWeeklyHours, detectScheduleConflict, wouldExceedMaxHours, getVacantTimeSlots } from '../utils/calculations';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const PlanningPage = () => {
    const { 
        currentRestaurant, currentShifts, updateShifts, 
        currentEmployees, getEmployeeColor, shiftRequests, approveShiftRequest, 
        rejectShiftRequest, currentAvailabilities, approveAvailability, rejectAvailability
    } = useData();

    
    // UI State


    const [planningView, setPlanningView] = useState('week'); // 'week' or 'month'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); // 0-6 (L-D)
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [showAvailability, setShowAvailability] = useState(true); // Toggle for availability panel
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [editingShift, setEditingShift] = useState(null); // null for create, shift object for edit
    const [shiftFormData, setShiftFormData] = useState({
        date: '',
        employeeId: '',
        startTime: '09:00',
        endTime: '17:00',
        note: ''
    });
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
    const currentWeekShifts = useMemo(() => 
        currentShifts.filter(s => s.date >= weekStart && s.date <= weekEnd),
    [currentShifts, weekStart, weekEnd]);

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
    const validationWarnings = useMemo(() => {
        if (!showShiftModal) return [];
        
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
        return Array.from(new Set(warnings));
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
        <div className={`planning-wrapper ${isMobile ? 'is-mobile' : ''}`}>
            {/* Controls */}
            <div className="planning-controls">
                <div className="planning-header-info">
                    <h2 className="planning-title">Planning</h2>
                    <p className="planning-subtitle">{getDateRangeText()}</p>
                </div>
                <div className="planning-actions">
                    <div className="view-switcher desktop-only">
                        <button className={`view-btn ${planningView === 'week' ? 'active' : ''}`} onClick={() => setPlanningView('week')}>Semaine</button>
                        <button className={`view-btn ${planningView === 'month' ? 'active' : ''}`} onClick={() => setPlanningView('month')}>Mois</button>
                    </div>
                    
                    <button
                        className={`view-btn ${showAvailability ? 'active' : ''}`}
                        onClick={() => setShowAvailability(!showAvailability)}
                    >
                        {isMobile ? <Users size={18} /> : 'Disponibilités'} {showAvailability ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <div className="nav-arrows">
                        <button
                            className="btn-secondary"
                            onClick={() => planningView === 'week' ? navigateWeek(-1) : navigateMonth(-1)}
                        >
                            <Icons.ChevronLeft size={18} />
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={() => planningView === 'week' ? navigateWeek(1) : navigateMonth(1)}
                        >
                            <Icons.ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Day Selector */}
            {isMobile && planningView === 'week' && (
                <div className="mobile-day-selector">
                    {displayDates.map((date, idx) => (
                        <button 
                            key={idx} 
                            className={`day-selector-btn ${selectedDayIndex === idx ? 'active' : ''} ${date.isToday ? 'is-today' : ''}`}
                            onClick={() => setSelectedDayIndex(idx)}
                        >
                            <span className="day-name-short">{date.name.charAt(0)}</span>
                            <span className="day-number-short">{date.number}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Content Area */}
            <div className="planning-content-area">
                {/* Overtime Alert */}
                {overtimeEmployees.length > 0 && !isMobile && (
                    <div className="conflict-alert">
                        <div className="conflict-icon"><AlertTriangle size={24} color="#dc2626" /></div>
                        <div className="conflict-content">
                            <div className="conflict-title">Heures Supplémentaires</div>
                            <div className="conflict-message">
                                {overtimeEmployees.map(emp => (
                                    <div key={emp.id}><strong>{emp.name}</strong> ({emp.weeklyHours.toFixed(1)}h / {emp.maxHoursPerWeek}h)</div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

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
                                    </div>
                                    <div className="availability-bar">
                                        <div className="availability-bar-fill" style={{ width: `${Math.min(emp.percentage, 100)}%` }}></div>
                                    </div>
                                    
                                    {(emp.pendingRepos?.length > 0 || emp.pendingIndispo?.length > 0) && (
                                        <div className="pending-requests-inline">
                                            {[...(emp.pendingRepos || []), ...(emp.pendingIndispo || [])].map(avail => (
                                                <div key={avail.id} className="pending-request-item">
                                                    <span>{avail.type === 'repos' ? '🛌' : '🚫'} {avail.date}</span>
                                                    <div className="pending-actions">
                                                        <button onClick={() => approveAvailability(avail.id)}>✅</button>
                                                        <button onClick={() => rejectAvailability(avail.id)}>❌</button>
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

                {/* Calendar Grid */}
                <div className={`calendar-grid ${planningView === 'month' ? 'month-view' : 'week-view'} ${isMobile ? 'mobile-grid' : ''}`}>
                    {displayDates.filter((d, i) => {
                        if (!isMobile || planningView === 'month') return true;
                        // Show a window of 3 days starting from selectedDayIndex (capped at the end of the week)
                        const start = Math.min(selectedDayIndex, displayDates.length - 3);
                        const effectiveStart = Math.max(0, start);
                        return i >= effectiveStart && i < effectiveStart + 3;
                    }).map((date, idx) => {
                        const dayShifts = currentShifts.filter(s => s.date === date.dateString).sort((a, b) => a.startTime.localeCompare(b.startTime));
                        
                        // Treat shifts for layout
                        const realShifts = dayShifts.filter(s => s.employeeId !== null && s.employeeId !== undefined);
                        const vacantShifts = dayShifts.filter(s => s.employeeId === null || s.employeeId === undefined);
                        const groupedVacant = [];
                        const vacantMap = new Map();

                        vacantShifts.forEach(vs => {
                            const key = `${vs.startTime}-${vs.endTime}`;
                            if (vacantMap.has(key)) {
                                vacantMap.get(key).count++;
                                vacantMap.get(key).ids.push(vs.id);
                            } else {
                                const group = { id: `group-${vs.id}`, startTime: vs.startTime, endTime: vs.endTime, date: vs.date, count: 1, ids: [vs.id], isGroup: true };
                                vacantMap.set(key, group);
                                groupedVacant.push(group);
                            }
                        });

                        const allVisibleCards = [...realShifts, ...groupedVacant];

                        // Day column render logic
                        const getShiftStyle = (shift, cards = allVisibleCards) => {
                            if (planningView === 'month') return {};
                            const startHour = 7, endHour = 26, totalMinutes = (endHour - startHour) * 60;
                            const [sH, sM] = shift.startTime.split(':').map(Number);
                            const [eH, eM] = shift.endTime.split(':').map(Number);
                            const eHNorm = eH < startHour ? eH + 24 : eH;
                            const startMinutes = (sH * 60 + sM) - (startHour * 60);
                            let durationMinutes = (eHNorm * 60 + eM) - (sH * 60 + sM);
                            if (durationMinutes <= 0) durationMinutes += 24 * 60;
                            const top = (startMinutes / totalMinutes) * 100;
                            const height = (durationMinutes / totalMinutes) * 100;
                            const overlaps = cards.filter(s => {
                                if (s.id === shift.id || s.id === `v-${shift.id}`) return true;
                                const [s1H, s1M] = s.startTime.split(':').map(Number);
                                const [e1H, e1M] = s.endTime.split(':').map(Number);
                                const e1Norm = e1H < startHour ? e1H + 24 : e1H;
                                return (s1H * 60 + s1M) < (eHNorm * 60 + eM) && (sH * 60 + sM) < (e1Norm * 60 + e1M);
                            });
                            const overlapIndex = overlaps.findIndex(s => s.id === shift.id || s.id === `v-${shift.id}`);
                            const width = 100 / overlaps.length;
                            return { top: `${Math.max(top, 0)}%`, height: `${Math.max(height, 2)}%`, left: `${width * overlapIndex}%`, width: `${width}%`, position: 'absolute' };
                        };

                        return (
                            <div key={idx} className={`day-column ${date.isToday ? 'today' : ''} ${planningView === 'month' && !date.isCurrentMonth ? 'day-out-of-month' : ''}`}>
                                {isMobile && planningView === 'week' && (
                                    <div className="day-header-mini">
                                        {date.name} {date.number}
                                    </div>
                                )}

                                {!isMobile && (
                                    <div className="day-header">
                                        <div className="day-name">{date.name}</div>
                                        <div className="day-number">{date.number}</div>
                                    </div>
                                )}

                                <div className="day-content" style={{ position: 'relative', height: '100%', minHeight: isMobile ? 'calc(100vh - 250px)' : '800px', overflowY: isMobile ? 'auto' : 'visible' }}>
                                    {planningView === 'week' && (
                                        <div className="day-grid-lines">
                                            {Array.from({ length: 20 }).map((_, i) => (
                                                <div key={i} className="grid-line" style={{ top: `${(i / 19) * 100}%` }}>
                                                    <span className="grid-hour-label">{7 + i}h</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {allVisibleCards.map(card => {
                                        const isVacant = card.isGroup;
                                        const employee = !isVacant ? currentEmployees.find(e => e.id === card.employeeId) : null;
                                        if (!isVacant && !employee) return null;
                                        const style = getShiftStyle(card);
                                        const hasRequests = (shiftRequests || []).some(req => req.shiftId === card.id && req.status === 'pending');

                                        return (
                                            <div
                                                key={card.id}
                                                className={`shift-card ${isVacant ? 'vacant' : ''}`}
                                                style={{
                                                    ...style,
                                                    borderLeft: `4px solid ${isVacant ? '#8b5cf6' : getEmployeeColor(employee.id)}`,
                                                    background: isVacant ? 'rgba(139, 92, 246, 0.1)' : `${getEmployeeColor(employee.id)}15`,
                                                    borderColor: isVacant ? '#8b5cf6' : getEmployeeColor(employee.id)
                                                }}
                                                onClick={() => openEditShiftModal(isVacant ? vacantShifts.find(s => s.id === parseInt(card.ids[0])) : card)}
                                            >
                                                <div className="shift-name" style={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                                                    {isVacant ? `Besoin (${card.count})` : employee.name}
                                                </div>
                                                <div className="shift-time" style={{ fontSize: isMobile ? '0.6rem' : '0.7rem' }}>
                                                    {card.startTime} - {card.endTime}
                                                </div>
                                                {hasRequests && <div className="shift-badge-alert"><ArrowRightLeft size={10} /></div>}
                                            </div>
                                        );
                                    })}

                                    {/* Virtual Vacant Slots (Only Desktop or single day mobile) */}
                                    {getVacantTimeSlots(dayShifts, date.dateString, currentRestaurant).map((vacant, vIdx) => {
                                        const style = getShiftStyle({ ...vacant, id: `v-${vIdx}` }, [...allVisibleCards, ...getVacantTimeSlots(dayShifts, date.dateString, currentRestaurant).map((v, i) => ({ ...v, id: `v-${i}` }))]);
                                        return (
                                            <div
                                                key={`v-${vIdx}`}
                                                className="shift-card vacant-virtual"
                                                style={{ ...style, border: '2px dashed #94a3b8', backgroundColor: 'rgba(148, 163, 184, 0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', zIndex: 1 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openShiftModal(date.dateString);
                                                    setShiftFormData(prev => ({ ...prev, startTime: vacant.startTime, endTime: vacant.endTime, employeeId: 'vacant' }));
                                                }}
                                            >
                                                <div style={{ fontSize: '0.6rem', color: '#64748b' }}>AIDE ?</div>
                                            </div>
                                        );
                                    })}

                                    <div className="day-click-area" onClick={() => openShiftModal(date.dateString)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Shift Modal */}
            {showShiftModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">{editingShift ? 'Modifier' : 'Ajouter'}</h2>
                            <button className="btn-close" onClick={() => setShowShiftModal(false)}><X size={20} /></button>
                        </div>

                        {validationWarnings.length > 0 && (
                            <div className="warning-box">
                                {validationWarnings.map((warning, idx) => <div key={idx}>{warning}</div>)}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Employé</label>
                            <select
                                className="form-select"
                                value={shiftFormData.employeeId}
                                onChange={(e) => setShiftFormData({ ...shiftFormData, employeeId: e.target.value })}
                            >
                                <option value="vacant">-- Poste Libre --</option>
                                {currentEmployees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div className="form-group">
                                <label className="form-label">Début</label>
                                <input type="time" className="form-input" value={shiftFormData.startTime} onChange={(e) => setShiftFormData({ ...shiftFormData, startTime: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Fin</label>
                                <input type="time" className="form-input" value={shiftFormData.endTime} onChange={(e) => setShiftFormData({ ...shiftFormData, endTime: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-actions">
                            {editingShift && (
                                <button className="btn-delete" onClick={handleDeleteShift}><Icons.Trash size={16} /></button>
                            )}
                            <button className="btn-secondary" onClick={() => setShowShiftModal(false)}>Annuler</button>
                            <button className="btn-primary" onClick={handleSaveShift}>Enregistrer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanningPage;
