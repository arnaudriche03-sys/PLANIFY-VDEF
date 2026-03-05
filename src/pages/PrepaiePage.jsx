import React, { useState } from 'react';
import { Icons } from '../components/UI/Icons';
import { useData } from '../context/DataContext';
import { splitShiftHours } from '../utils/calculations';

const PrepaiePage = () => {
    const { currentEmployees, currentShifts, currentRestaurant } = useData();
    const [prepaieView, setPrepaieView] = useState('week');
    const [prepaieDate, setPrepaieDate] = useState(new Date(2026, 1, 4));

    // ── Helper : formate une date en YYYY-MM-DD en heure LOCALE (évite le décalage UTC+1) ──
    const toLocalDateString = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    // ── Date Helpers ──────────────────────────────────────────────────────────
    const getWeekDates = (date) => {
        const current = new Date(date);
        const dayOfWeek = current.getDay();
        const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(current.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { start: monday, end: sunday };
    };

    const getMonthDates = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        return { start, end };
    };

    // ── Navigation ────────────────────────────────────────────────────────────
    const navigateWeek = (direction) => {
        const newDate = new Date(prepaieDate);
        newDate.setDate(prepaieDate.getDate() + direction * 7);
        setPrepaieDate(newDate);
    };

    const navigateMonth = (direction) => {
        const newDate = new Date(prepaieDate);
        newDate.setMonth(prepaieDate.getMonth() + direction);
        setPrepaieDate(newDate);
    };

    const getPeriodText = () => {
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        if (prepaieView === 'week') {
            const { start, end } = getWeekDates(prepaieDate);
            const monthNamesLower = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
            return `Semaine du ${start.getDate()} ${monthNamesLower[start.getMonth()]} au ${end.getDate()} ${monthNamesLower[end.getMonth()]} ${end.getFullYear()}`;
        } else {
            return `${monthNames[prepaieDate.getMonth()]} ${prepaieDate.getFullYear()}`;
        }
    };

    // ── Filtrage des shifts de la période ────────────────────────────────────
    const getShiftsForPeriod = () => {
        let startDate, endDate;
        if (prepaieView === 'week') {
            const { start, end } = getWeekDates(prepaieDate);
            startDate = toLocalDateString(start);
            endDate = toLocalDateString(end);
        } else {
            const { start, end } = getMonthDates(prepaieDate);
            startDate = toLocalDateString(start);
            endDate = toLocalDateString(end);
        }
        return currentShifts.filter(s => s.date >= startDate && s.date <= endDate);
    };

    // ── Calcul enrichi par employé (CCN HCR) ─────────────────────────────────
    /**
     * Retourne pour un employé :
     *   - heuresJour      : heures entre 7h et 22h
     *   - heuresNuit      : heures entre 22h et 7h (+10%)
     *   - heuresDimanche  : toutes heures un dimanche (+10%, cumulable avec nuit)
     *   - heuresTotal
     *   - coutBrut        : brut avec majorations CCN HCR
     *   - coutBrutSansM   : brut sans aucune majoration (référence)
     *   - isCompliant, maxAllowedHours, overagePercent
     */
    const calculateEmployeeStats = (employee) => {
        const periodShifts = getShiftsForPeriod();
        const employeeShifts = periodShifts.filter(s => s.employeeId === employee.id);

        let heuresJour = 0;
        let heuresNuit = 0;
        let heuresDimanche = 0;
        let heuresTotal = 0;
        let coutBrut = 0;

        employeeShifts.forEach(shift => {
            const split = splitShiftHours(shift, employee.hourlyRate || 0);
            heuresJour += split.heuresJour;
            heuresNuit += split.heuresNuit;
            heuresDimanche += split.heuresDimanche;
            heuresTotal += split.heuresTotal;
            coutBrut += split.coutBrut;
        });

        // Référence sans majoration (pour afficher la différence)
        const coutBrutSansM = heuresTotal * (employee.hourlyRate || 0);
        const gainMajorations = coutBrut - coutBrutSansM;

        const maxAllowedHours = prepaieView === 'week'
            ? employee.maxHoursPerWeek
            : employee.maxHoursPerWeek * 4;

        const isCompliant = heuresTotal <= maxAllowedHours;
        const overagePercent = isCompliant ? 0 : ((heuresTotal - maxAllowedHours) / maxAllowedHours) * 100;

        return {
            heuresJour: Math.round(heuresJour * 100) / 100,
            heuresNuit: Math.round(heuresNuit * 100) / 100,
            heuresDimanche: Math.round(heuresDimanche * 100) / 100,
            heuresTotal: Math.round(heuresTotal * 100) / 100,
            coutBrut: Math.round(coutBrut * 100) / 100,
            coutBrutSansM: Math.round(coutBrutSansM * 100) / 100,
            gainMajorations: Math.round(gainMajorations * 100) / 100,
            isCompliant,
            maxAllowedHours,
            overagePercent,
        };
    };

    const globalStats = currentEmployees.map(emp => calculateEmployeeStats(emp));
    const totalHours = globalStats.reduce((s, st) => s + st.heuresTotal, 0);
    const totalGross = globalStats.reduce((s, st) => s + st.coutBrut, 0);
    const totalNuit = globalStats.reduce((s, st) => s + st.heuresNuit, 0);
    const totalDimanche = globalStats.reduce((s, st) => s + st.heuresDimanche, 0);
    const totalGainMaj = globalStats.reduce((s, st) => s + st.gainMajorations, 0);

    const nonCompliantEmployees = currentEmployees
        .map((emp, idx) => ({ ...emp, stats: globalStats[idx] }))
        .filter(emp => !emp.stats.isCompliant);
    const isGloballyCompliant = nonCompliantEmployees.length === 0;

    // ── Export CSV enrichi ───────────────────────────────────────────────────
    const handleExportCSV = () => {
        const headers = [
            'Nom', 'Rôle', 'Taux horaire (€/h)',
            'Heures totales', 'Heures de jour', 'Heures de nuit (22h-7h)', 'Heures dimanche',
            'Brut sans majoration (€)', 'Brut avec majorations CCN HCR (€)', 'Gain majorations (€)',
            'Statut conformité'
        ];
        const rows = currentEmployees.map((emp, idx) => {
            const stats = globalStats[idx];
            return [
                emp.name,
                emp.role,
                (emp.hourlyRate || 0).toFixed(2),
                stats.heuresTotal.toFixed(2),
                stats.heuresJour.toFixed(2),
                stats.heuresNuit.toFixed(2),
                stats.heuresDimanche.toFixed(2),
                stats.coutBrutSansM.toFixed(2),
                stats.coutBrut.toFixed(2),
                stats.gainMajorations.toFixed(2),
                stats.isCompliant ? 'Conforme' : 'Non conforme',
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const periodLabel = prepaieView === 'week' ? 'semaine' : 'mois';
        const dateStr = toLocalDateString(prepaieDate);
        link.setAttribute('href', url);
        link.setAttribute('download', `prepaie-${periodLabel}-${dateStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div>
            {/* Header controls */}
            <div className="prepaie-controls">
                <div>
                    <h2 className="prepaie-title">Pré-paie</h2>
                    <p className="page-subtitle">{getPeriodText()}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="view-switcher">
                        <button className={`view-btn ${prepaieView === 'week' ? 'active' : ''}`} onClick={() => setPrepaieView('week')}>Semaine</button>
                        <button className={`view-btn ${prepaieView === 'month' ? 'active' : ''}`} onClick={() => setPrepaieView('month')}>Mois</button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => prepaieView === 'week' ? navigateWeek(-1) : navigateMonth(-1)}>
                            <Icons.ChevronLeft size={18} />
                        </button>
                        <button className="btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => prepaieView === 'week' ? navigateWeek(1) : navigateMonth(1)}>
                            <Icons.ChevronRight size={18} />
                        </button>
                    </div>
                    <button className="btn-export" onClick={handleExportCSV}>
                        <Icons.Download size={18} /> Exporter CSV
                    </button>
                </div>
            </div>

            {/* Légende majorations CCN HCR */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: '10px',
                padding: '0.75rem 1.25rem',
                marginBottom: '1rem',
                display: 'flex',
                gap: '2rem',
                flexWrap: 'wrap',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
            }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>⚖️ CCN HCR — Majorations appliquées :</span>
                <span>🌙 <strong>Heures de nuit</strong> (22h → 7h) : <strong style={{ color: '#f59e0b' }}>+10%</strong></span>
                <span>☀️ <strong>Dimanche</strong> : <strong style={{ color: '#10b981' }}>+10%</strong></span>
                <span>🌙☀️ <strong>Nuit + Dimanche</strong> cumulé : <strong style={{ color: '#ef4444' }}>+20%</strong></span>
            </div>

            {/* Non-compliant alert panel */}
            {nonCompliantEmployees.length > 0 && (
                <div className="non-compliant-panel">
                    <div className="non-compliant-icon">⚠️</div>
                    <div className="non-compliant-content">
                        <div className="non-compliant-title">Alertes Heures Non Conformes</div>
                        <div className="non-compliant-message">
                            {nonCompliantEmployees.map(emp => (
                                <div key={emp.id}>
                                    <strong>{emp.name}</strong> : {emp.stats.heuresTotal.toFixed(1)}h / {emp.stats.maxAllowedHours}h quota
                                    ({emp.stats.overagePercent.toFixed(0)}% dépassement)
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* KPI cards */}
            <div className="stats-grid">
                <div className="stat-card hours">
                    <div className="stat-label">Heures totales</div>
                    <div className="stat-value">{totalHours.toFixed(2)} h</div>
                    {totalNuit > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                            dont 🌙 {totalNuit.toFixed(2)}h de nuit
                        </div>
                    )}
                    {totalDimanche > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
                            dont ☀️ {totalDimanche.toFixed(2)}h dimanche
                        </div>
                    )}
                </div>
                <div className="stat-card amount">
                    <div className="stat-label">Masse salariale brute estimée</div>
                    <div className="stat-value">{totalGross.toFixed(2)} €</div>
                    {totalGainMaj > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                            dont +{totalGainMaj.toFixed(2)} € de majorations
                        </div>
                    )}
                </div>
                <div className={`stat-card compliance ${isGloballyCompliant ? 'compliant' : 'non-compliant'}`}>
                    <div className="stat-label">Statut global</div>
                    <div className="stat-value">{isGloballyCompliant ? 'Conforme' : 'Non conforme'}</div>
                </div>
            </div>

            {/* Table ventilation heures */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Employé</th>
                            <th>Taux</th>
                            <th>Heures Jour</th>
                            <th>Heures Nuit 🌙</th>
                            <th>Heures Dim. ☀️</th>
                            <th>Total Heures</th>
                            <th>Brut Est. (majoré)</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentEmployees.map((employee, idx) => {
                            const stats = globalStats[idx];
                            const hasNuit = stats.heuresNuit > 0;
                            const hasDim = stats.heuresDimanche > 0;
                            return (
                                <tr key={employee.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{employee.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{employee.role}</div>
                                    </td>
                                    <td>{(employee.hourlyRate || 0).toFixed(2)} €/h</td>

                                    {/* Heures de jour */}
                                    <td>{stats.heuresJour.toFixed(2)} h</td>

                                    {/* Heures de nuit */}
                                    <td>
                                        {hasNuit ? (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                background: 'rgba(245,158,11,0.12)', color: '#d97706',
                                                borderRadius: '6px', padding: '0.15rem 0.5rem',
                                                fontWeight: 600, fontSize: '0.85rem',
                                            }}>
                                                🌙 {stats.heuresNuit.toFixed(2)} h
                                                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>+10%</span>
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>—</span>
                                        )}
                                    </td>

                                    {/* Heures dimanche */}
                                    <td>
                                        {hasDim ? (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                background: 'rgba(16,185,129,0.12)', color: '#059669',
                                                borderRadius: '6px', padding: '0.15rem 0.5rem',
                                                fontWeight: 600, fontSize: '0.85rem',
                                            }}>
                                                ☀️ {stats.heuresDimanche.toFixed(2)} h
                                                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>+10%</span>
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>—</span>
                                        )}
                                    </td>

                                    {/* Total */}
                                    <td style={{ fontWeight: 600 }}>{stats.heuresTotal.toFixed(2)} h</td>

                                    {/* Brut majoré */}
                                    <td>
                                        <div style={{ fontWeight: 700 }}>{stats.coutBrut.toFixed(2)} €</div>
                                        {stats.gainMajorations > 0 && (
                                            <div style={{ fontSize: '0.72rem', color: '#f59e0b' }}>
                                                +{stats.gainMajorations.toFixed(2)} € de majorations
                                            </div>
                                        )}
                                    </td>

                                    {/* Statut conformité */}
                                    <td>
                                        <span className="status-badge" style={stats.isCompliant ? {} : { background: '#fee2e2', color: '#991b1b' }}>
                                            {stats.isCompliant ? 'Conforme' : 'Non conforme'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PrepaiePage;
