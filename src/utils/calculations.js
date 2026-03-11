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
export const splitShiftHours = (shift, tauxHoraireBreut = 0) => {
    if (!shift.startTime || !shift.endTime) {
        return { heuresJour: 0, heuresNuit: 0, heuresDimanche: 0, heuresTotal: 0, coutBrut: 0 };
    }

    const [sh, sm] = shift.startTime.split(':').map(Number);
    const [eh, em] = shift.endTime.split(':').map(Number);

    const startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;

    if (endMin <= startMin) {
        // Shift traversant minuit : endMin représente les minutes après minuit
        // On étend à 1440 (24h) + endMin pour boucler correctement
        endMin += 1440;
    }

    // Détection dimanche en timezone LOCALE (new Date('YYYY-MM-DD') est UTC → bias UTC+1)
    let isDimanche = false;
    if (shift.date) {
        const [y, mo, da] = shift.date.split('-').map(Number);
        isDimanche = new Date(y, mo - 1, da).getDay() === 0;
    }

    // Plages nuit en minutes depuis minuit : 0→420 (0h→7h) et 1320→1440 (22h→24h)
    const NUIT_MATIN_FIN = 7 * 60;   // 420
    const NUIT_SOIR_DEBUT = 22 * 60; // 1320

    let minutesJour = 0;
    let minutesNuit = 0;

    // Parcours minute par minute. Pour les shifts traversant minuit, m peut dépasser 1440.
    // On normalise avec % 1440 pour que 1h30 du matin (= 90min) reste classée "nuit".
    for (let m = startMin; m < endMin; m++) {
        const mNorm = m % 1440;
        const isNuit = mNorm < NUIT_MATIN_FIN || mNorm >= NUIT_SOIR_DEBUT;
        if (isNuit) minutesNuit++;
        else minutesJour++;
    }

    const heuresJour = minutesJour / 60;
    const heuresNuit = minutesNuit / 60;
    const heuresTotal = heuresJour + heuresNuit;

    // Heures dimanche = toutes les heures du shift si c'est un dimanche
    const heuresDimanche = isDimanche ? heuresTotal : 0;

    // Calcul du coût brut avec majorations
    let coutBrut = 0;
    if (tauxHoraireBreut > 0) {
        // Coût des heures selon leur nature (nuit et/ou dimanche se cumulent)
        if (isDimanche) {
            // Dimanche : toutes les heures à +10%
            const tauxDimanche = tauxHoraireBreut * 1.10;
            const tauxNuitDimanche = tauxHoraireBreut * 1.20; // nuit + dimanche
            coutBrut = heuresJour * tauxDimanche + heuresNuit * tauxNuitDimanche;
        } else {
            coutBrut = heuresJour * tauxHoraireBreut + heuresNuit * tauxHoraireBreut * 1.10;
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
export const calculatePerformanceMetrics = (shifts, employees, revenueEntry, capaciteMax = 0) => {
    const empMap = {};
    employees.forEach(e => { empMap[e.id] = e; });

    let totalHeures = 0;
    let coutChargeTotal = 0;

    shifts.forEach(s => {
        const emp = empMap[s.employeeId];
        const taux = emp?.hourlyRate || 0;
        const split = splitShiftHours(s, taux);
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
