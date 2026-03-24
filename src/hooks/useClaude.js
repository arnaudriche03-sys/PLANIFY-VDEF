import { useState } from 'react';
import { useData } from '../context/DataContext';
import { SYSTEM_PROMPT } from '../constants/prompts';
import { splitShiftHours, calculatePerformanceMetrics } from '../utils/calculations';


// Parse la réponse de l'IA et extrait le bloc PLANNING_PROPOSAL s'il existe
const parseAIResponse = (rawText) => {
    const startMarker = 'PLANNING_PROPOSAL_START';
    const endMarker = 'PLANNING_PROPOSAL_END';
    const startIdx = rawText.indexOf(startMarker);
    const endIdx = rawText.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
        return { text: rawText.trim(), proposal: null };
    }

    const textPart = rawText.slice(0, startIdx).trim();
    const jsonPart = rawText.slice(startIdx + startMarker.length, endIdx).trim();

    let proposal = null;
    try {
        proposal = JSON.parse(jsonPart);
    } catch (e) {
        console.warn('Impossible de parser la proposition IA :', e);
    }

    return { text: textPart, proposal };
};

export const useClaude = () => {
    const [isAILoading, setIsAILoading] = useState(false);
    const { currentRestaurant, currentEmployees, currentShifts, currentRevenueData, currentAvailabilities, shiftRequests } = useData();


    const buildEnrichedContext = () => {
        try {
            const today = new Date();
            const dayOfWeek = today.getDay();
            // Lundi de la SE MAINE ACTUELLE (réelle)
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const realMonday = new Date(today);
            realMonday.setDate(today.getDate() + diffToMonday);
            realMonday.setHours(0, 0, 0, 0);

            const realSunday = new Date(realMonday);
            realSunday.setDate(realMonday.getDate() + 6);
            realSunday.setHours(23, 59, 59, 999);

            const fmt = (d) => d.toISOString().split('T')[0];
            const startStr = fmt(realMonday);
            const endStr = fmt(realSunday);
            const semaineCouranteLabel = `${startStr} → ${endStr}`;

            // ── RÉCUPÉRATION TOUTES DONNÉES ─────────────────────────────────────
            const allShifts = currentShifts || [];
            const allAvails = currentAvailabilities || [];
            const allRequests = shiftRequests || [];
            
            const employeeMap = {};
            currentEmployees.forEach(e => { employeeMap[e.id] = e; });

            // ── STATS SEMAINE ACTUELLE (réelle) ──────────────────────────────────
            const currentWeekShifts = allShifts.filter(s => s.date >= startStr && s.date <= endStr);
            const currentWeekHeures = {};
            const currentWeekCoutBrut = {};

            currentWeekShifts.forEach(s => {
                const emp = currentEmployees.find(e => e.id === s.employeeId);
                const taux = emp?.hourlyRate || 0;
                const split = splitShiftHours(s, taux, currentRestaurant);
                if (!currentWeekHeures[s.employeeId]) {
                    currentWeekHeures[s.employeeId] = 0;
                    currentWeekCoutBrut[s.employeeId] = 0;
                }
                currentWeekHeures[s.employeeId] += split.heuresTotal;
                currentWeekCoutBrut[s.employeeId] += split.coutBrut;
            });

            const currentWeekCoutTotal = currentEmployees.reduce((acc, e) => {
                const coutBrut = currentWeekCoutBrut[e.id] || 0;
                return acc + (coutBrut * 1.42);
            }, 0);

            const daysFr = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
            const allShiftsEnrichis = allShifts.map(s => {
                const emp = employeeMap[s.employeeId];
                let jourFr = '';
                if (s.date) {
                    const [y, m, d] = s.date.split('-').map(Number);
                    jourFr = daysFr[new Date(y, m - 1, d).getDay()];
                }
                return {
                    id: s.id,
                    employe: emp ? emp.name : `ID:${s.employeeId}`,
                    role: emp ? emp.role : '?',
                    date: s.date,
                    jour: jourFr,
                    debut: s.startTime,
                    fin: s.endTime,
                };
            }).sort((a, b) => (`${a.date} ${a.debut}` > `${b.date} ${b.debut}` ? 1 : -1));

            const context = {
                date_aujourdhui: fmt(today),
                semaine_actuelle_temps_reel: semaineCouranteLabel,
                stats_semaine_actuelle: {
                    total_heures: Math.round(Object.values(currentWeekHeures).reduce((a, b) => a + b, 0) * 10) / 10,
                    cout_charge_estime: Math.round(currentWeekCoutTotal) + '€',
                    note: "Ces statistiques concernent uniquement la semaine du " + semaineCouranteLabel
                },
                // ── SEMAINE ACTUELLE (Détails prioritaires) ─────────────────────
                planning_semaine_actuelle: allShiftsEnrichis.filter(s => s.date >= startStr && s.date <= endStr),

                // ── AUTRES PÉRIODES (Pour info seulement) ───────────────────────
                archives_et_futur: allShiftsEnrichis.filter(s => s.date < startStr || s.date > endStr).map(s => ({
                    date: s.date,
                    employe: s.employe,
                    info: "Période hors semaine actuelle - Ne pas proposer de modification si date passée."
                })),

                disponibilites_toutes: allAvails.map(a => ({
                    employe: employeeMap[a.employeeId]?.name || a.employeeId,
                    date: a.date,
                    type: a.type,
                    statut: a.status
                })),
                kpis_semaine_actuelle: (() => {
                    const caEntry = currentRevenueData[startStr];
                    if (!caEntry || !caEntry.caPrevisionnel) return { ca_disponible: false };
                    const ca = parseFloat(caEntry.caPrevisionnel);
                    const rmo = currentWeekCoutTotal > 0 ? Math.round((currentWeekCoutTotal / ca) * 1000) / 10 : null;
                    return { ca_previsionnel: `${ca}€`, rmo: rmo !== null ? `${rmo}%` : 'non calculable' };
                })(),
            };
            return context;
        } catch (err) {
            console.error("Error in buildEnrichedContext:", err);
            throw err;
        }
    };


    const askClaude = async (question, conversationHistory = []) => {
        setIsAILoading(true);
        const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

        if (!apiKey) {
            setIsAILoading(false);
            return { text: "[Erreur] Clé API manquante. Veuillez configurer VITE_ANTHROPIC_API_KEY.", proposal: null };
        }

        try {
            const contextData = buildEnrichedContext();

            const systemWithContext = `${SYSTEM_PROMPT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📂 DONNÉES ACTUELLES DU RESTAURANT (utilise-les dans tes réponses)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(contextData, null, 2)}
`;

            console.log("ANTHROPIC_REQUEST_SYSTEM_SIZE:", systemWithContext.length);

            const messages = [];
            if (conversationHistory.length > 0) {
                const recent = conversationHistory.slice(-10);
                recent.forEach(msg => {
                    messages.push({ role: msg.role, content: msg.content });
                });
            }
            messages.push({ role: 'user', content: question });

            const response = await fetch('/api/anthropic/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: "claude-3-haiku-20240307",
                    max_tokens: 2048,
                    system: systemWithContext,
                    messages,
                    temperature: 0,
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("API Error:", errorData);
                throw new Error(errorData.error?.message || `Erreur API: ${response.status}`);
            }

            const data = await response.json();
            setIsAILoading(false);

            if (data.content && data.content[0] && data.content[0].text) {
                return parseAIResponse(data.content[0].text);
            }
            return { text: "[Erreur] Réponse vide de l'IA", proposal: null };

        } catch (error) {
            console.error("Claude Hook Error:", error);
            setIsAILoading(false);
            return { text: `❌ Erreur: ${error.message}. (Vérifiez votre clé API et que le serveur de dev est redémarré)`, proposal: null };
        }
    };

    // ── Audit Stratégique ────────────────────────────────────────────────────
    const runStrategicAudit = async (forcedWeekStart = null, viewType = 'week') => {
        setIsAILoading(true);
        try {
            const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

            // ── Helpers date (audit) ─────────────────────────────────────────────
            const auditGetMondayOf = (iso) => {
                const d = new Date(iso);
                const day = d.getDay();
                const diff = day === 0 ? -6 : 1 - day;
                d.setDate(d.getDate() + diff);
                return d.toISOString().split('T')[0];
            };

            const auditAddDays = (iso, n) => {
                const d = new Date(iso);
                d.setDate(d.getDate() + n);
                return d.toISOString().split('T')[0];
            };

            // ── Sélection de la période de référence ─────────────────────────────
            const todayIso = new Date().toISOString().split('T')[0];
            const currentWeekStart = auditGetMondayOf(todayIso);
            let weekStart;

            if (forcedWeekStart) {
                weekStart = forcedWeekStart;
            } else {
                const revenueKeys = Object.keys(currentRevenueData || {});
                weekStart = currentWeekStart;
                let bestDiff = Infinity;
                for (const key of revenueKeys) {
                    const entry = currentRevenueData[key];
                    if (entry?.caPrevisionnel) {
                        const diff = Math.abs(new Date(key) - new Date(currentWeekStart));
                        if (diff < bestDiff) { bestDiff = diff; weekStart = key; }
                    }
                }
            }

            // ── Définition des bornes de la période ───────────────────────────────
            let periodStart, periodEnd, prevPeriodStart, prevPeriodEnd;

            if (viewType === 'month') {
                const d = new Date(weekStart);
                periodStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
                prevPeriodStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0];
                prevPeriodEnd = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0];
            } else {
                periodStart = weekStart;
                periodEnd = auditAddDays(weekStart, 6);
                prevPeriodStart = auditAddDays(weekStart, -7);
                prevPeriodEnd = auditAddDays(weekStart, -1);
            }

            // ── Filtrer les shifts par période ───────────────────────────────────
            let shiftsCurrentPeriod = currentShifts.filter(s => s.date >= periodStart && s.date <= periodEnd);
            const shiftsPrevPeriod = currentShifts.filter(s => s.date >= prevPeriodStart && s.date <= prevPeriodEnd);

            // Si aucun shift pour la période (et qu'on est en vue semaine) → fallback comme avant
            if (viewType === 'week' && shiftsCurrentPeriod.length === 0) {
                const shiftWeeks = [...new Set(currentShifts.map(s => s.date ? auditGetMondayOf(s.date) : null).filter(Boolean))];
                let closestWeek = weekStart;
                let closestDiff = Infinity;
                for (const sw of shiftWeeks) {
                    const d = Math.abs(new Date(sw) - new Date(weekStart));
                    if (d < closestDiff) { closestDiff = d; closestWeek = sw; }
                }
                const closestEnd = auditAddDays(closestWeek, 6);
                shiftsCurrentPeriod = currentShifts.filter(s => s.date >= closestWeek && s.date <= closestEnd);
            }

            // ── Agrégation du Revenue ───────────────────────────────────────────
            const aggregateRevenue = (start, end) => {
                let totalCA = 0;
                let totalCouverts = 0;
                let hasData = false;

                Object.keys(currentRevenueData || {}).forEach(key => {
                    if (key >= start && key <= end) {
                        const entry = currentRevenueData[key];
                        if (entry.caPrevisionnel || entry.nbCouverts) {
                            totalCA += Number(entry.caPrevisionnel || 0);
                            totalCouverts += Number(entry.nbCouverts || 0);
                            hasData = true;
                        }
                    }
                });

                return hasData ? { caPrevisionnel: totalCA, nbCouverts: totalCouverts } : null;
            };

            const revCurrent = viewType === 'month'
                ? aggregateRevenue(periodStart, periodEnd)
                : currentRevenueData[weekStart] || null;

            const revPrev = viewType === 'month'
                ? aggregateRevenue(prevPeriodStart, prevPeriodEnd)
                : currentRevenueData[prevPeriodStart] || null;

            const metrics = calculatePerformanceMetrics(shiftsCurrentPeriod, currentEmployees, revCurrent, 0, currentRestaurant);
            const prevMetrics = calculatePerformanceMetrics(shiftsPrevPeriod, currentEmployees, revPrev, 0, currentRestaurant);


            // Stocker la période réelle pour l'UI
            metrics.weekStart = periodStart;
            metrics.viewType = viewType;



            // ── Prompt d'audit dédié ─────────────────────────────────────────────
            const fmt = (v, unit) => v !== null ? `${v}${unit}` : 'N/D (CA non renseigné)';
            const delta = (cur, prev, unit) => {
                if (cur === null || prev === null) return 'N/D';
                const d = Math.round((cur - prev) * 10) / 10;
                return `${d > 0 ? '+' : ''}${d}${unit} vs S-1`;
            };

            const auditPrompt = `Tu es un moteur d'analyse financière RH pour restaurateur professionnel.
Analyse les KPI ci-dessous et produis un rapport structuré en 3 sections au maximum.

DONNÉES — ${viewType === 'month' ? 'Mois complet' : 'Semaine'} du ${periodStart} au ${periodEnd} :
- Ratio Masse Salariale : ${fmt(metrics.ratioMasseSalariale, '%')} (${delta(metrics.ratioMasseSalariale, prevMetrics.ratioMasseSalariale, 'pts')}) [seuil sain < 35%, critique > 45%]
- Productivité Horaire : ${fmt(metrics.productiviteHoraire, '€/h')} (${delta(metrics.productiviteHoraire, prevMetrics.productiviteHoraire, '€/h')}) [seuil sain > 80€/h]
- Ticket Moyen : ${fmt(metrics.ticketMoyen, '€')} (${delta(metrics.ticketMoyen, prevMetrics.ticketMoyen, '€')}) [seuil sain > 25€]
- Heures planifiées : ${metrics.totalHeures}h | Coût chargé : ${metrics.coutChargeTotal > 0 ? metrics.coutChargeTotal + '€' : 'N/D'} | CA : ${metrics.ca ? metrics.ca + '€' : 'Non renseigné'}

FORMAT REQUIS :
### Diagnostic
[2-3 lignes factuelles sur les ratios du ${viewType === 'month' ? 'mois' : 'la semaine'}, sans reformuler les chiffres bruts — donner le contexte et la signification]

### Écart critique
[Uniquement si un indicateur dépasse un seuil. Sinon, écrire "Aucun écart critique détecté."]

### Action corrective
[1 action précise et immédiatement actionnable¹. Si tous les KPI sont OK, proposer un levier d'optimisation proactif]

¹ Pour une vue Mensuelle, focus sur la structure de coût ou le recrutement. Pour une vue Hebdo, focus sur l'ajustement immédiat des shifts.

CONTRAINTES ABSOLUES : Aucun emoji. Ton factuel et direct. Pas de phrases d'introduction ou de conclusion. Réponse < 200 mots. Police de ton : Vercel, analytique.`;

            if (!apiKey) {
                setIsAILoading(false);
                return { metrics, prevMetrics, analysisText: 'Clé API manquante. Configurez VITE_ANTHROPIC_API_KEY.' };
            }

            const response = await fetch('/api/anthropic/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 512,
                    messages: [{ role: 'user', content: auditPrompt }],
                })
            });

            if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
            const data = await response.json();
            setIsAILoading(false);
            const analysisText = data.content?.[0]?.text?.trim() || 'Analyse non disponible.';
            return { metrics, prevMetrics, analysisText };
        } catch (error) {
            console.error("Strategic Audit Error:", error);
            setIsAILoading(false);
            return {
                metrics: { weekStart: forcedWeekStart || new Date().toISOString().split('T')[0] },
                prevMetrics: {},
                analysisText: `Erreur lors de l'analyse: ${error.message}`
            };
        }
    };

    return { askClaude, isAILoading, runStrategicAudit };
};
