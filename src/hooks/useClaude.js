import { useState } from 'react';
import { useData } from '../context/DataContext';
import { SYSTEM_PROMPT } from '../constants/prompts';
import { splitShiftHours } from '../utils/calculations';

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
    const { currentRestaurant, currentEmployees, currentShifts, currentRevenueData } = useData();

    const buildEnrichedContext = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const fmt = (d) => d.toISOString().split('T')[0];
        const semaineCourante = `${fmt(monday)} → ${fmt(sunday)}`;

        const employeeMap = {};
        currentEmployees.forEach(e => { employeeMap[e.id] = e; });

        // ── Calcul durée et ventilation des shifts par employé ───────────────
        const heuresParEmploye = {};       // total
        const heuresNuitParEmploye = {};   // nuit (22h-7h)
        const heuresDimParEmploye = {};    // dimanche
        const coutBrutParEmploye = {};     // brut avec majorations

        const shiftDuration = (s) => {
            if (!s.startTime || !s.endTime) return 0;
            const [sh, sm] = s.startTime.split(':').map(Number);
            const [eh, em] = s.endTime.split(':').map(Number);
            const d = (eh * 60 + em - (sh * 60 + sm)) / 60;
            return d > 0 ? d : 0;
        };

        currentShifts.forEach(s => {
            const emp = currentEmployees.find(e => e.id === s.employeeId);
            const taux = emp?.hourlyRate || 0;
            const split = splitShiftHours(s, taux);
            if (!heuresParEmploye[s.employeeId]) {
                heuresParEmploye[s.employeeId] = 0;
                heuresNuitParEmploye[s.employeeId] = 0;
                heuresDimParEmploye[s.employeeId] = 0;
                coutBrutParEmploye[s.employeeId] = 0;
            }
            heuresParEmploye[s.employeeId] += split.heuresTotal;
            heuresNuitParEmploye[s.employeeId] += split.heuresNuit;
            heuresDimParEmploye[s.employeeId] += split.heuresDimanche;
            coutBrutParEmploye[s.employeeId] += split.coutBrut;
        });

        // ── Résumé employés ──────────────────────────────────────────────────
        const employes = currentEmployees.map(e => {
            const heuresPlanifiees = Math.round((heuresParEmploye[e.id] || 0) * 100) / 100;
            const heuresNuit = Math.round((heuresNuitParEmploye[e.id] || 0) * 100) / 100;
            const heuresDimanche = Math.round((heuresDimParEmploye[e.id] || 0) * 100) / 100;
            const tauxHoraire = e.hourlyRate || 0;
            const coutBrut = coutBrutParEmploye[e.id] || 0;
            // Coût chargé = coût brut majoré × coefficient charges patronales 1.42
            const coutChargeEstime = coutBrut > 0 ? Math.round(coutBrut * 1.42) : null;
            const ecartContrat = e.maxHoursPerWeek ? Math.round((heuresPlanifiees - e.maxHoursPerWeek) * 10) / 10 : null;
            return {
                id: e.id,
                nom: e.name,
                role: e.role,
                contrat: e.contract,
                heures_contrat_semaine: e.maxHoursPerWeek,
                taux_horaire_brut: tauxHoraire > 0 ? `${tauxHoraire}€/h` : 'non renseigné',
                heures_planifiees: heuresPlanifiees,
                dont_heures_nuit_22h_7h: heuresNuit > 0 ? `${heuresNuit}h (+10% CCN HCR)` : '0h',
                dont_heures_dimanche: heuresDimanche > 0 ? `${heuresDimanche}h (+10% CCN HCR)` : '0h',
                ecart_vs_contrat: ecartContrat,
                cout_brut_estime_avec_majorations: coutBrut > 0 ? `${Math.round(coutBrut * 100) / 100}€` : 'non calculable',
                cout_charge_estime: coutChargeEstime !== null ? `${coutChargeEstime}€` : 'non calculable',
                notes: e.notes || null,
            };
        });

        const coutTotalSemaine = employes.reduce((acc, e) => {
            const val = parseInt(e.cout_charge_estime);
            return isNaN(val) ? acc : acc + val;
        }, 0);

        const aNuitCeSemaine = Object.values(heuresNuitParEmploye).some(h => h > 0);
        const aDimancheCeSemaine = Object.values(heuresDimParEmploye).some(h => h > 0);

        // ── Shifts enrichis et triés ─────────────────────────────────────────
        const shiftsEnrichis = currentShifts.map(s => {
            const emp = employeeMap[s.employeeId];
            const taux = emp?.hourlyRate || 0;
            const split = splitShiftHours(s, taux);
            return {
                shiftId: s.id,
                employeeId: s.employeeId,
                employe: emp ? emp.name : `ID:${s.employeeId}`,
                role: emp ? emp.role : '?',
                date: s.date,
                debut: s.startTime,
                fin: s.endTime,
                duree_h: split.heuresTotal,
                heures_jour: split.heuresJour,
                heures_nuit_22h_7h: split.heuresNuit,
                heures_dimanche: split.heuresDimanche,
                cout_brut_shift: taux > 0 ? `${split.coutBrut}€` : 'taux manquant',
                majoration_nuit: split.heuresNuit > 0,
                majoration_dimanche: split.heuresDimanche > 0,
            };
        }).sort((a, b) => (a.date > b.date ? 1 : -1));

        // ── PRÉ-CALCUL COMPLIANCE ENGINE ─────────────────────────────────────
        const violations = [];

        // Regrouper les shifts par employé
        const shiftsByEmployee = {};
        shiftsEnrichis.forEach(s => {
            if (!shiftsByEmployee[s.employeeId]) shiftsByEmployee[s.employeeId] = [];
            shiftsByEmployee[s.employeeId].push(s);
        });

        Object.entries(shiftsByEmployee).forEach(([empId, shifts]) => {
            const emp = employeeMap[empId];
            const empName = emp ? emp.name : `ID:${empId}`;
            const sorted = [...shifts].sort((a, b) => `${a.date} ${a.debut}` > `${b.date} ${b.debut}` ? 1 : -1);

            sorted.forEach((s, i) => {
                // 1. Durée journalière > 10h
                if (s.duree_h > 10) {
                    violations.push({
                        type: 'DURÉE_MAX_JOURNALIÈRE',
                        severity: s.duree_h > 12 ? 'CRITIQUE' : 'ALERTE',
                        employe: empName,
                        date: s.date,
                        detail: `${s.duree_h}h de travail (max légal : 10h, dérogation 12h)`,
                    });
                }
                // 2. Repos entre services < 11h
                if (i > 0) {
                    const prev = sorted[i - 1];
                    const prevEnd = new Date(`${prev.date}T${prev.fin}:00`);
                    const currStart = new Date(`${s.date}T${s.debut}:00`);
                    const reposH = (currStart - prevEnd) / 3600000;
                    if (reposH >= 0 && reposH < 11) {
                        violations.push({
                            type: 'REPOS_INSUFFISANT',
                            severity: 'CRITIQUE',
                            employe: empName,
                            date: s.date,
                            detail: `Seulement ${Math.round(reposH * 10) / 10}h de repos entre le ${prev.date} fin ${prev.fin} et le ${s.date} début ${s.debut} (min 11h)`,
                        });
                    }
                }
            });

            // 3. Dépassement hebdomadaire > 48h
            const totalH = heuresParEmploye[empId] || 0;
            if (totalH > 48) {
                violations.push({
                    type: 'DÉPASSEMENT_HEBDO',
                    severity: 'CRITIQUE',
                    employe: empName,
                    detail: `${Math.round(totalH * 10) / 10}h planifiées sur la semaine (maximum légal : 48h)`,
                });
            }

            // 4. Heures complémentaires temps partiel > 10%
            if (emp && emp.contract === 'CDI partiel' || emp?.maxHoursPerWeek < 35) {
                const contratH = emp?.maxHoursPerWeek || 0;
                if (contratH > 0 && totalH > contratH * 1.1) {
                    violations.push({
                        type: 'HEURES_COMPLÉMENTAIRES',
                        severity: 'ALERTE',
                        employe: empName,
                        detail: `${Math.round(totalH * 10) / 10}h planifiées pour un contrat de ${contratH}h (limite +10% = ${Math.round(contratH * 1.1 * 10) / 10}h)`,
                    });
                }
            }
        });

        // ── Contexte temporel ────────────────────────────────────────────────
        const shiftDates = currentShifts.map(s => s.date).filter(Boolean).sort();
        const planningStart = shiftDates[0] || null;
        const planningEnd = shiftDates[shiftDates.length - 1] || null;
        const planningPeriod = planningStart ? `${planningStart} → ${planningEnd}` : 'Aucun shift planifié';
        const isSameWeek = planningStart >= fmt(monday) && planningStart <= fmt(sunday);

        return {
            date_aujourdhui: fmt(today),
            semaine_courante: semaineCourante,
            planning_charge: {
                periode: planningPeriod,
                avertissement: isSameWeek
                    ? 'Planning = semaine actuelle.'
                    : `⚠️ Le planning chargé (${planningPeriod}) N'EST PAS la semaine actuelle (${semaineCourante}). Utilise "la semaine du ${planningStart}" et non "cette semaine".`,
            },
            restaurant: currentRestaurant,
            resume_planning: {
                nb_employes_planifies: Object.keys(heuresParEmploye).length,
                total_heures_planifiees: Math.round(Object.values(heuresParEmploye).reduce((a, b) => a + b, 0) * 10) / 10,
                total_heures_nuit_22h_7h: Math.round(Object.values(heuresNuitParEmploye).reduce((a, b) => a + b, 0) * 10) / 10,
                total_heures_dimanche: Math.round(Object.values(heuresDimParEmploye).reduce((a, b) => a + b, 0) * 10) / 10,
                alerte_majorations: [
                    ...(aNuitCeSemaine ? ['🌙 Des heures de nuit (22h-7h) sont planifiées → majoration +10% CCN HCR appliquée dans les coûts'] : []),
                    ...(aDimancheCeSemaine ? ['☀️ Des heures du dimanche sont planifiées → majoration +10% CCN HCR appliquée dans les coûts'] : []),
                ],
                cout_total_charge_estime: coutTotalSemaine > 0 ? `${coutTotalSemaine}€ (majorations nuit/dim. incluses)` : 'non calculable (taux manquants)',
                note_rmo: 'CA non fourni — RMO non calculable. Demandez le CA pour obtenir le ratio.',
            },
            employes,
            planning_detaille: shiftsEnrichis,
            rapport_conformite_hcr: {
                nb_violations: violations.length,
                statut: violations.length === 0 ? '✅ Aucune violation détectée' : `⚠️ ${violations.length} violation(s) détectée(s)`,
                violations,
            },
            kpis_economiques: (() => {
                // Chercher le CA pour la semaine du planning chargé
                const caEntry = planningStart ? currentRevenueData[planningStart] : null;
                if (!caEntry || !caEntry.caPrevisionnel) {
                    return {
                        ca_disponible: false,
                        message: 'CA non renseigné pour cette semaine. Utilisez le bouton "📊 Renseigner les KPIs" pour saisir le CA prévisionnel.',
                    };
                }
                const ca = parseFloat(caEntry.caPrevisionnel);
                const rmo = coutTotalSemaine > 0 ? Math.round((coutTotalSemaine / ca) * 1000) / 10 : null;
                const totalH = Math.round(Object.values(heuresParEmploye).reduce((a, b) => a + b, 0) * 10) / 10;
                const productiviteHoraire = totalH > 0 ? Math.round(ca / totalH) : null;
                return {
                    ca_disponible: true,
                    ca_previsionnel: `${ca}€`,
                    nb_couverts: caEntry.nbCouverts || 'non renseigné',
                    cout_total_charge: coutTotalSemaine > 0 ? `${coutTotalSemaine}€` : 'non calculable',
                    rmo: rmo !== null ? `${rmo}%` : 'non calculable',
                    alerte_rmo: rmo !== null && rmo > 35 ? `🔴 RMO à ${rmo}% > seuil d'alerte 35%${rmo > 45 ? ' — CRITIQUE > 45%' : ''}` : '✅ RMO dans les limites',
                    productivite_horaire: productiviteHoraire !== null ? `${productiviteHoraire}€/h` : 'non calculable',
                };
            })(),
        };
    };


    const askClaude = async (question, conversationHistory = []) => {
        setIsAILoading(true);
        const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

        if (!apiKey) {
            setIsAILoading(false);
            return { text: "⚠️ Clé API manquante. Veuillez ajouter VITE_ANTHROPIC_API_KEY dans le fichier .env", proposal: null };
        }

        try {
            const contextData = buildEnrichedContext();

            const systemWithContext = `${SYSTEM_PROMPT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📂 DONNÉES ACTUELLES DU RESTAURANT (utilise-les dans tes réponses)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(contextData, null, 2)}
`;

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
            return { text: "❌ Réponse vide de l'IA", proposal: null };

        } catch (error) {
            console.error("Claude Hook Error:", error);
            setIsAILoading(false);
            return { text: `❌ Erreur: ${error.message}. (Vérifiez votre clé API et que le serveur de dev est redémarré)`, proposal: null };
        }
    };

    return { askClaude, isAILoading };
};
