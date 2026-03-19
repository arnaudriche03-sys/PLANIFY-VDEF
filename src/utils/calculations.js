export const calculateShiftHours = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const start = startHour + startMin / 60;
    let end = endHour + endMin / 60;
    if (end <= start) end += 24; // Shift traversant minuit
    return end - start;
};

export const calculateWeeklyHours = (shifts, employeeId) => {
    return shifts
        .filter(shift => shift.employeeId === employeeId)
        .reduce((total, shift) => total + calculateShiftHours(shift.startTime, shift.endTime), 0);
};

/**
 * Découpe un shift en heures jour / nuit / dimanche selon CCN HCR.
 *
 * Règles appliquées :
 *   - Heures de NUIT  : plage 22h → 7h du lendemain → majoration +10%
 *   - Heures DIMANCHE : toute la journée (date.getDay() === 0) → majoration +10%
 *   - Cumul possible  : heure de nuit un dimanche = +20%
 *
 * @param {object} shift  - { startTime: "HH:MM", endTime: "HH:MM", date: "YYYY-MM-DD" }
 * @param {number} tauxHoraireBreut - taux horaire brut de l'employé (€/h)
 * @returns {{ heuresJour, heuresNuit, heuresDimanche, coutBrut }}
 */
export const splitShiftHours = (shift, tauxHoraireBreut = 0, restaurantSettings = null) => {
    if (!shift.startTime || !shift.endTime) {
        return { heuresJour: 0, heuresNuit: 0, heuresDimanche: 0, heuresTotal: 0, coutBrut: 0 };
    }

    // Récupérer les taux de majoration du restaurant (défaut 10% si non défini)
    const nightBonus = (restaurantSettings?.nightBonusPct ?? 10) / 100;
    const sundayBonus = (restaurantSettings?.sundayBonusPct ?? 10) / 100;

    const [sh, sm] = shift.startTime.split(':').map(Number);
    const [eh, em] = shift.endTime.split(':').map(Number);

    const startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;

    if (endMin <= startMin) {
        endMin += 1440;
    }

    let isDimanche = false;
    if (shift.date) {
        const [y, mo, da] = shift.date.split('-').map(Number);
        isDimanche = new Date(y, mo - 1, da).getDay() === 0;
    }

    const NUIT_MATIN_FIN = 7 * 60;
    const NUIT_SOIR_DEBUT = 22 * 60;

    let minutesJour = 0;
    let minutesNuit = 0;

    for (let m = startMin; m < endMin; m++) {
        const mNorm = m % 1440;
        const isNuit = mNorm < NUIT_MATIN_FIN || mNorm >= NUIT_SOIR_DEBUT;
        if (isNuit) minutesNuit++;
        else minutesJour++;
    }

    const heuresJour = minutesJour / 60;
    const heuresNuit = minutesNuit / 60;
    const heuresTotal = heuresJour + heuresNuit;
    const heuresDimanche = isDimanche ? heuresTotal : 0;

    let coutBrut = 0;
    if (tauxHoraireBreut > 0) {
        if (isDimanche) {
            // Dimanche : toutes les heures à +sundayBonus
            // Si c'est aussi la nuit : tauxHoraireBreut * (1 + sundayBonus + nightBonus)
            const tauxDimanche = tauxHoraireBreut * (1 + sundayBonus);
            const tauxNuitDimanche = tauxHoraireBreut * (1 + sundayBonus + nightBonus);
            coutBrut = heuresJour * tauxDimanche + heuresNuit * tauxNuitDimanche;
        } else {
            coutBrut = heuresJour * tauxHoraireBreut + heuresNuit * tauxHoraireBreut * (1 + nightBonus);
        }
    }

    return {
        heuresJour: Math.round(heuresJour * 100) / 100,
        heuresNuit: Math.round(heuresNuit * 100) / 100,
        heuresDimanche: Math.round(heuresDimanche * 100) / 100,
        heuresTotal: Math.round(heuresTotal * 100) / 100,
        coutBrut: Math.round(coutBrut * 100) / 100,
    };
};


// Check if two time ranges overlap
const timesOverlap = (start1, end1, start2, end2) => {
    const [s1h, s1m] = start1.split(':').map(Number);
    const [e1h, e1m] = end1.split(':').map(Number);
    const [s2h, s2m] = start2.split(':').map(Number);
    const [e2h, e2m] = end2.split(':').map(Number);

    const start1Min = s1h * 60 + s1m;
    const end1Min = e1h * 60 + e1m;
    const start2Min = s2h * 60 + s2m;
    const end2Min = e2h * 60 + e2m;

    return start1Min < end2Min && start2Min < end1Min;
};

// Detect if a new shift conflicts with existing shifts (same employee, same time, same day)
export const detectScheduleConflict = (shifts, newShift) => {
    return shifts.find(shift =>
        shift.employeeId === newShift.employeeId &&
        shift.date === newShift.date &&
        timesOverlap(shift.startTime, shift.endTime, newShift.startTime, newShift.endTime)
    );
};

// Check if adding a new shift would exceed the employee's max hours
export const wouldExceedMaxHours = (shifts, employee, newShift) => {
    const newShiftHours = calculateShiftHours(newShift.startTime, newShift.endTime);
    const currentWeekHours = calculateWeeklyHours(shifts, employee.id);
    return (currentWeekHours + newShiftHours) > employee.maxHoursPerWeek;
};

/**
 * Calcule les 4 KPI stratégiques pour une semaine donnée.
 *
 * @param {Array}  shifts       - Shifts filtrés pour la semaine
 * @param {Array}  employees    - Liste des employés (avec hourlyRate)
 * @param {Object} revenueEntry - { caPrevisionnel, nbCouverts } pour la semaine
 * @param {number} capaciteMax  - Capacité max en couverts (0 = désactivé)
 * @returns {Object} métriques calculées
 */
export const calculatePerformanceMetrics = (shifts, employees, revenueEntry, capaciteMax = 0, restaurantSettings = null) => {
    const empMap = {};
    employees.forEach(e => { empMap[e.id] = e; });

    let totalHeures = 0;
    let coutChargeTotal = 0;

    shifts.forEach(s => {
        const emp = empMap[s.employeeId];
        const taux = emp?.hourlyRate || 0;
        const split = splitShiftHours(s, taux, restaurantSettings);
        totalHeures += split.heuresTotal;
        coutChargeTotal += split.coutBrut * 1.42;
    });


    totalHeures = Math.round(totalHeures * 100) / 100;
    coutChargeTotal = Math.round(coutChargeTotal);

    const ca = revenueEntry?.caPrevisionnel ? parseFloat(revenueEntry.caPrevisionnel) : null;
    const nbCouverts = revenueEntry?.nbCouverts ? parseInt(revenueEntry.nbCouverts) : null;

    const ratioMasseSalariale = ca && ca > 0 && coutChargeTotal > 0
        ? Math.round((coutChargeTotal / ca) * 1000) / 10 : null;

    const productiviteHoraire = ca && ca > 0 && totalHeures > 0
        ? Math.round(ca / totalHeures) : null;

    const ticketMoyen = ca && ca > 0 && nbCouverts && nbCouverts > 0
        ? Math.round((ca / nbCouverts) * 100) / 100 : null;

    const tauxFrequentation = capaciteMax > 0 && nbCouverts && nbCouverts > 0
        ? Math.round((nbCouverts / capaciteMax) * 1000) / 10 : null;

    return {
        ratioMasseSalariale,
        productiviteHoraire,
        ticketMoyen,
        tauxFrequentation,
        totalHeures,
        coutChargeTotal,
        ca,
        nbCouverts,
    };
};

/**
 * Identifie les créneaux horaires où personne n'est planifié durant les heures d'ouverture.
 * @param {string} openingTime - "HH:MM"
 * @param {string} closingTime - "HH:MM"
 * @param {Array} dayShifts - Liste des shifts (réels) pour une journée
 * @returns {Array} Liste des créneaux vacants [{ startTime, endTime }]
 */
/**
 * Identifie les créneaux horaires où personne n'est planifié durant les heures d'ouverture.
 * @param {Array} dayShifts - Liste des shifts (réels) pour une journée
 * @param {string} date - "YYYY-MM-DD"
 * @param {Object} restaurantSettings - Objet restaurant complet
 * @returns {Array} Liste des créneaux vacants [{ startTime, endTime }]
 */
export const getVacantTimeSlots = (dayShifts, date, restaurantSettings) => {
    if (!restaurantSettings || !date) return [];

    // Déterminer si weekend
    const [y, mo, da] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, mo - 1, da).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0=Dimanche, 6=Samedi

    const openingTime = isWeekend ? restaurantSettings.openingTimeWeekend : restaurantSettings.openingTime;
    const closingTime = isWeekend ? restaurantSettings.closingTimeWeekend : restaurantSettings.closingTime;

    if (!openingTime || !closingTime) return [];

    const [oh, om] = openingTime.split(':').map(Number);
    const [ch, cm] = closingTime.split(':').map(Number);

    let startMin = oh * 60 + om;
    let endMin = ch * 60 + cm;
    if (endMin <= startMin) endMin += 1440; // Fermeture après minuit

    // Créer une timeline minute par minute (true si quelqu'un travaille)
    const timeline = new Array(endMin - startMin).fill(false);

    // Ne considérer que les shifts avec un employé assigné pour calculer la "couverture" réelle
    const coveredShifts = dayShifts.filter(s => s.employeeId !== null && s.employeeId !== undefined);

    coveredShifts.forEach(shift => {
        const [sh, sm] = (shift.startTime || '00:00').split(':').map(Number);
        const [eh, em] = (shift.endTime || '00:00').split(':').map(Number);

        let sM = sh * 60 + sm;
        let eM = eh * 60 + em;
        if (eM <= sM) eM += 1440;

        // Mapper sur la timeline de l'ouverture
        for (let m = sM; m < eM; m++) {
            if (m >= startMin && m < endMin) {
                timeline[m - startMin] = true;
            }
        }
    });

    // Extraire les intervalles de 'false' (personne)
    const vacantSlots = [];
    let currentStart = null;

    for (let i = 0; i <= timeline.length; i++) {
        if (i < timeline.length && !timeline[i]) {
            if (currentStart === null) currentStart = i;
        } else {
            if (currentStart !== null) {
                const s = startMin + currentStart;
                const e = startMin + i;
                
                const formatTime = (totalMin) => {
                    const h = Math.floor((totalMin % 1440) / 60).toString().padStart(2, '0');
                    const m = (totalMin % 60).toString().padStart(2, '0');
                    return `${h}:${m}`;
                };

                // On ne garde que les trous de plus de 15 minutes
                if (e - s >= 15) {
                    vacantSlots.push({
                        startTime: formatTime(s),
                        endTime: formatTime(e)
                    });
                }
                currentStart = null;
            }
        }
    }

    return vacantSlots;
};

