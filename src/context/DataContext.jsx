import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const DataContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const [currentRestaurantId, setCurrentRestaurantId] = useState(1);
    const [restaurants, setRestaurants] = useState([]);
    const [employees, setEmployees] = useState({});
    const [shifts, setShifts] = useState({});
    const [shiftRequests, setShiftRequests] = useState([]); // Nouveau: Bourse d'échange
    const [dayNotes, setDayNotes] = useState({});
    const [paidStatus, setPaidStatus] = useState({});
    const [revenueData, setRevenueData] = useState({});
    const [availabilities, setAvailabilities] = useState({}); // Nouveau: Dispos/Repos
    const [isLoading, setIsLoading] = useState(true);


    // ─── Chargement initial depuis Supabase ───────────────────────────────────

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [resResult, empResult, shiResult, noteResult, revResult, reqResult, availResult] = await Promise.all([
                supabase.from('restaurants').select('*'),
                supabase.from('employees').select('*'),
                supabase.from('shifts').select('*'),
                supabase.from('day_notes').select('*'),
                supabase.from('revenue_data').select('*'),
                supabase.from('shift_requests').select('*'),
                supabase.from('employee_availabilities').select('*')
            ]);



            if (resResult.error) throw resResult.error;
            if (empResult.error) throw empResult.error;
            if (shiResult.error) throw shiResult.error;
            if (noteResult.error) throw noteResult.error;
            if (reqResult.error && reqResult.error.code !== '42P01') {
                console.warn('shift_requests table might not exist yet:', reqResult.error);
            }

            setRestaurants((resResult.data || []).map(r => ({
                id: r.id,
                name: r.name,
                address: r.address,
                closingTimeWeekend: r.closing_time_weekend || '23:00',
                nightBonusPct: r.night_bonus_pct !== undefined ? r.night_bonus_pct : 10,
                sundayBonusPct: r.sunday_bonus_pct !== undefined ? r.sunday_bonus_pct : 10,
                // ADN & Historique
                establishmentType: r.establishment_type || 'bistro',
                targetRmo: r.target_rmo || 30,
                targetProductivity: r.target_productivity || 80,
                averageTicket: r.average_ticket || 25,
                revenueN1: r.revenue_n1 || 0,
                rmoN1: r.rmo_n1 || 0,
                customersN1: r.customers_n1 || 0,
                salaryCostN1: r.salary_cost_n1 || 0
            })));


            // Employees par restaurant
            const empByResto = {};
            (empResult.data || []).forEach(emp => {
                if (!empByResto[emp.restaurant_id]) empByResto[emp.restaurant_id] = [];
                // Normaliser les noms de colonnes snake_case -> camelCase
                empByResto[emp.restaurant_id].push({
                    id: emp.id,
                    restaurant_id: emp.restaurant_id,
                    name: emp.name,
                    role: emp.role,
                    contract: emp.contract,
                    level: emp.level,
                    hourlyRate: emp.hourly_rate,
                    maxHoursPerWeek: emp.max_hours_per_week,
                    phone: emp.phone,
                    email: emp.email,
                    notes: emp.notes,
                });
            });
            setEmployees(empByResto);

            // Shifts par restaurant
            const shiByResto = {};
            (shiResult.data || []).forEach(shi => {
                if (!shiByResto[shi.restaurant_id]) shiByResto[shi.restaurant_id] = [];
                shiByResto[shi.restaurant_id].push({
                    id: shi.id,
                    employeeId: shi.employee_id,
                    date: shi.date,
                    startTime: (shi.start_time || '').slice(0, 5),
                    endTime: (shi.end_time || '').slice(0, 5),
                    note: shi.note,
                    status: shi.status || 'assigned' // Nouveau: status ('assigned', 'offered')
                });
            });
            setShifts(shiByResto);

            // Shift requests
            if (reqResult.data) {
                setShiftRequests(reqResult.data.map(req => ({
                    id: req.id,
                    shiftId: req.shift_id,
                    requestingEmployeeId: req.requesting_employee_id,
                    targetDate: req.target_date,
                    startTime: req.start_time, // Nouveau
                    endTime: req.end_time,     // Nouveau
                    status: req.status, // 'pending', 'approved', 'rejected'
                    createdAt: req.created_at
                })));

            }

            // Notes par restaurant
            const noteByResto = {};
            (noteResult.data || []).forEach(n => {
                if (!noteByResto[n.restaurant_id]) noteByResto[n.restaurant_id] = {};
                noteByResto[n.restaurant_id][n.date] = n.note;
            });
            setDayNotes(noteByResto);

            // Revenue data par restaurant (CA + couverts par semaine)
            if (!revResult.error) {
                const revByResto = {};
                (revResult.data || []).forEach(r => {
                    if (!revByResto[r.restaurant_id]) revByResto[r.restaurant_id] = {};
                    revByResto[r.restaurant_id][r.week_start] = {
                        id: r.id,
                        caPrevisionnel: r.ca_previsionnel,
                        nbCouverts: r.nb_couverts,
                        notes: r.notes,
                    };
                });
                setRevenueData(revByResto);
            }

            // Nettoyage de sécurité : identifier et supprimer les doublons de disponibilités
            const seen = new Set();
            const duplicates = [];
            const rawAvails = availResult?.data || [];
            rawAvails.forEach(a => {
                const key = `${a.employee_id}-${a.date}-${a.type}-${a.start_time || ''}-${a.end_time || ''}`;
                if (seen.has(key)) duplicates.push(a.id);
                else seen.add(key);
            });
            if (duplicates.length > 0) {
                console.log(`Nettoyage de ${duplicates.length} doublons de dispo...`);
                await Promise.all(duplicates.map(id => supabase.from('employee_availabilities').delete().eq('id', id)));
            }

            // Availabilities par restaurant (on utilise rawAvails filtré)
            const filteredAvails = rawAvails.filter(a => !duplicates.includes(a.id));
            const availByResto = {};
            filteredAvails.forEach(a => {
                if (!availByResto[a.restaurant_id]) availByResto[a.restaurant_id] = [];
                availByResto[a.restaurant_id].push({
                    id: a.id,
                    employeeId: a.employee_id,
                    date: a.date,
                    type: a.type, // 'repos', 'indispo'
                    status: a.status || 'pending', // 'pending', 'approved', 'rejected'
                    startTime: a.start_time?.slice(0, 5) || null,
                    endTime: a.end_time?.slice(0, 5) || null,
                    note: a.note || ''
                });
            });
            setAvailabilities(availByResto);


        } catch (error) {

            console.error('Erreur fetchData Supabase:', error);
        } finally {
            setIsLoading(false);
        }
    }, []); // Removed isDemoMode as it's not defined in the original context

    useEffect(() => {
        fetchData();

        // ─── Abonnements Supabase Realtime ─────────────────────────────────
        // Dès qu'un salarié ou manager modifie des données, tout le monde est mis à jour automatiquement.
        const channel = supabase
            .channel('planify-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
                console.log('[Realtime] Changement détecté sur shifts → Rechargement...');
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_availabilities' }, () => {
                console.log('[Realtime] Changement détecté sur employee_availabilities → Rechargement...');
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_requests' }, () => {
                console.log('[Realtime] Changement détecté sur shift_requests → Rechargement...');
                fetchData();
            })
            .subscribe();

        // Nettoyage à la destruction du composant
        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);


    useEffect(() => {
        if (currentRestaurantId) {
            localStorage.setItem('currentRestaurantId', currentRestaurantId);
        }
    }, [currentRestaurantId]);

    // ─── Gestion de l'Authentification (Manager vs Employee) ────────────────

    // 'manager' ou 'employee'
    const [currentUserRole, setCurrentUserRole] = useState(() => {
        return localStorage.getItem('currentUserRole') || null; // null = non connecté
    });

    // ID de l'employé connecté (si role === 'employee')
    const [currentEmployeeId, setCurrentEmployeeId] = useState(() => {
        return parseInt(localStorage.getItem('currentEmployeeId')) || null;
    });

    useEffect(() => {
        if (currentUserRole) localStorage.setItem('currentUserRole', currentUserRole);
        else localStorage.removeItem('currentUserRole');

        if (currentEmployeeId) localStorage.setItem('currentEmployeeId', currentEmployeeId);
        else localStorage.removeItem('currentEmployeeId');
    }, [currentUserRole, currentEmployeeId]);

    const loginAsManager = () => {
        setCurrentUserRole('manager');
        setCurrentEmployeeId(null);
    };

    const loginAsEmployee = (employeeId) => {
        setCurrentUserRole('employee');
        setCurrentEmployeeId(employeeId);
    };

    const logout = () => {
        setCurrentUserRole(null);
        setCurrentEmployeeId(null);
    };

    // ─── Valeurs dérivées ─────────────────────────────────────────────────────

    const currentRestaurant = restaurants.find(r => r.id === currentRestaurantId) || { name: '…', id: currentRestaurantId };
    const currentEmployees = employees[currentRestaurantId] || [];
    const currentShifts = shifts[currentRestaurantId] || [];
    const currentDayNotes = dayNotes[currentRestaurantId] || {};
    const currentRevenueData = revenueData[currentRestaurantId] || {};
    const currentAvailabilities = availabilities[currentRestaurantId] || [];


    // ─── Actions Restaurants ──────────────────────────────────────────────────

    const updateRestaurants = async (newRestaurants, dbPayload = null) => {
        setRestaurants(newRestaurants);
        if (dbPayload && currentRestaurantId) {
            try {
                await supabase.from('restaurants').update(dbPayload).eq('id', currentRestaurantId);
            } catch (error) {
                console.error('Erreur updateRestaurants Supabase:', error);
            }
        }
    };

    // ─── Actions Employés ─────────────────────────────────────────────────────

    /**
     * updateEmployees : remplace TOUT le tableau d'employés d'un restaurant.
     * Détecte les ajouts, modifications et suppressions.
     */
    const updateEmployees = async (newEmployees) => {
        // Mise à jour optimiste (UI réactive immédiatement)
        setEmployees(prev => ({ ...prev, [currentRestaurantId]: newEmployees }));

        try {
            const oldEmployees = employees[currentRestaurantId] || [];
            const oldIds = new Set(oldEmployees.map(e => e.id));
            const newIds = new Set(newEmployees.map(e => e.id));

            // Suppressions
            const deleted = oldEmployees.filter(e => !newIds.has(e.id));
            for (const emp of deleted) {
                await supabase.from('employees').delete().eq('id', emp.id);
            }

            // Ajouts et modifications
            for (const emp of newEmployees) {
                const isNew = !oldIds.has(emp.id);
                const payload = {
                    restaurant_id: currentRestaurantId,
                    name: emp.name,
                    role: emp.role,
                    contract: emp.contract,
                    level: emp.level,
                    hourly_rate: emp.hourlyRate,
                    max_hours_per_week: emp.maxHoursPerWeek,
                    phone: emp.phone || null,
                    email: emp.email || null,
                    notes: emp.notes || null,
                };

                if (isNew) {
                    const { data, error } = await supabase.from('employees').insert([payload]).select();
                    if (!error && data?.[0]) {
                        // Mettre à jour l'id local avec l'id réel de Supabase
                        setEmployees(prev => {
                            const updated = (prev[currentRestaurantId] || []).map(e =>
                                e.id === emp.id ? { ...e, id: data[0].id } : e
                            );
                            return { ...prev, [currentRestaurantId]: updated };
                        });
                    }
                } else {
                    await supabase.from('employees').update(payload).eq('id', emp.id);
                }
            }
        } catch (error) {
            console.error('Erreur updateEmployees Supabase:', error);
        }
    };

    // ─── Actions Shifts ───────────────────────────────────────────────────────

    const updateShifts = async (newShifts) => {
        const oldShifts = shifts[currentRestaurantId] || [];
        // Mise à jour optimiste immédiate
        setShifts(prev => ({ ...prev, [currentRestaurantId]: newShifts }));

        try {
            const oldIds = new Set(oldShifts.map(s => s.id));
            const newIds = new Set(newShifts.map(s => s.id));

            // Suppressions
            const deleted = oldShifts.filter(s => !newIds.has(s.id));
            if (deleted.length > 0) {
                await supabase.from('shifts')
                    .delete()
                    .in('id', deleted.map(s => s.id));
            }

            // Ajouts et modifications
            for (const s of newShifts) {
                const isNew = !oldIds.has(s.id);
                const payload = {
                    restaurant_id: currentRestaurantId,
                    employee_id: s.employeeId || null,
                    date: s.date,
                    start_time: s.startTime,
                    end_time: s.endTime,
                    note: s.note || '',
                };

                if (isNew) {
                    const { data, error } = await supabase.from('shifts').insert([payload]).select();
                    if (!error && data?.[0]) {
                        // Mettre à jour l'id local avec l'id réel de Supabase
                        setShifts(prev => {
                            const updated = (prev[currentRestaurantId] || []).map(shift =>
                                shift.id === s.id ? { ...shift, id: data[0].id } : shift
                            );
                            return { ...prev, [currentRestaurantId]: updated };
                        });
                    }
                } else {
                    await supabase.from('shifts').update(payload).eq('id', s.id);
                }
            }
        } catch (error) {
            console.error('Erreur updateShifts Supabase:', error);
        }
    };

    // ─── Actions Day Notes ────────────────────────────────────────────────────

    const updateDayNotes = async (newNotes) => {
        setDayNotes(prev => ({ ...prev, [currentRestaurantId]: newNotes }));

        try {
            for (const [date, note] of Object.entries(newNotes)) {
                await supabase.from('day_notes').upsert({
                    restaurant_id: currentRestaurantId,
                    date,
                    note,
                }, { onConflict: 'restaurant_id,date' });
            }
        } catch (error) {
            console.error('Erreur updateDayNotes Supabase:', error);
        }
    };

    // ─── Actions Revenue Data ─────────────────────────────────────────────────

    const upsertRevenueData = async (weekStart, caPrevisionnel, nbCouverts, notes = '') => {
        // Mise à jour optimiste
        setRevenueData(prev => ({
            ...prev,
            [currentRestaurantId]: {
                ...(prev[currentRestaurantId] || {}),
                [weekStart]: { caPrevisionnel, nbCouverts, notes },
            },
        }));
        try {
            const safeCa = caPrevisionnel !== null ? Math.round(Number(caPrevisionnel) * 100) / 100 : null;
            const safeCouverts = nbCouverts !== null ? Math.round(Number(nbCouverts)) : null;

            const { error } = await supabase.from('revenue_data').upsert({
                restaurant_id: currentRestaurantId,
                week_start: weekStart,
                ca_previsionnel: safeCa,
                nb_couverts: safeCouverts,
                notes: notes || null,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'restaurant_id,week_start' });
            if (error) throw error;
        } catch (error) {
            console.error('Erreur upsertRevenueData Supabase:', error);
        }
    };

    // ─── Bourse d'Échange (Shifts) ──────────────────────────────────────────

    const offerShift = async (shiftId) => {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const shift = (shifts[currentRestaurantId] || []).find(s => s.id === shiftId);
            
            if (shift && shift.date < todayStr) {
                throw new Error("Impossible de proposer un shift passé.");
            }

            // Mettre à jour en base de données
            const { error } = await supabase
                .from('shifts')
                .update({ status: 'offered' })
                .eq('id', shiftId);


            if (error) throw error;

            // Mettre à jour l'état local
            const newShifts = { ...shifts };
            if (newShifts[currentRestaurantId]) {
                newShifts[currentRestaurantId] = newShifts[currentRestaurantId].map(s =>
                    s.id === shiftId ? { ...s, status: 'offered' } : s
                );
            }
            setShifts(newShifts);
        } catch (error) {
            console.error('Erreur offerShift Supabase:', error);
            throw error;
        }
    };

    const takeShift = async (shiftId, requestingEmployeeId, targetDate, startTime = null, endTime = null) => {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            if (targetDate < todayStr) {
                throw new Error("Impossible de demander un shift passé.");
            }

            // Créer la demande en BDD
            const { data, error } = await supabase
                .from('shift_requests')
                .insert([{
                    shift_id: shiftId,
                    requesting_employee_id: requestingEmployeeId,
                    target_date: targetDate,
                    start_time: startTime,
                    end_time: endTime,
                    status: 'pending'
                }])
                .select();

            if (error) throw error;

            // Mettre à jour l'état local
            if (data && data[0]) {
                setShiftRequests(prev => [...prev, {
                    id: data[0].id,
                    shiftId: data[0].shift_id,
                    requestingEmployeeId: data[0].requesting_employee_id,
                    targetDate: data[0].target_date,
                    status: data[0].status,
                    createdAt: data[0].created_at
                }]);
            }
        } catch (error) {
            console.error('Erreur takeShift Supabase:', error);
            throw error;
        }
    };

    const approveShiftRequest = async (requestId, shiftId, newEmployeeId) => {
        try {
            // 0. Récupérer le shift et la demande
            const req = shiftRequests.find(r => r.id === requestId);
            const originalShift = (shifts[currentRestaurantId] || []).find(s => s.id === shiftId);

            if (!req || !originalShift) throw new Error("Requête ou shift introuvable");

            const isPartial = req.startTime && req.endTime && (req.startTime !== originalShift.startTime || req.endTime !== originalShift.endTime);

            // 1. Marquer la demande comme approuvée
            const { error: errorApprove } = await supabase
                .from('shift_requests')
                .update({ status: 'approved' })
                .eq('id', requestId);
            if (errorApprove) throw errorApprove;

            // 2. Marquer les AUTRES demandes pour ce même shift comme rejetées
            await supabase
                .from('shift_requests')
                .update({ status: 'rejected' })
                .eq('shift_id', shiftId)
                .neq('id', requestId)
                .eq('status', 'pending');

            // 3. Gérer le splitting si c'est une aide partielle
            if (isPartial) {
                // Créer les shifts vacants pour les restes
                const adds = [];
                if (req.startTime > originalShift.startTime) {
                    adds.push({
                        restaurant_id: currentRestaurantId,
                        date: originalShift.date,
                        start_time: originalShift.startTime,
                        end_time: req.startTime,
                        status: 'offered',
                        employee_id: null
                    });
                }
                if (req.endTime < originalShift.endTime) {
                    adds.push({
                        restaurant_id: currentRestaurantId,
                        date: originalShift.date,
                        start_time: req.endTime,
                        end_time: originalShift.endTime,
                        status: 'offered',
                        employee_id: null
                    });
                }

                if (adds.length > 0) {
                    const { error: errAdd } = await supabase.from('shifts').insert(adds);
                    if (errAdd) throw errAdd;
                }

                // Mettre à jour le shift original pour devenir l'aide de l'employé
                const { error: errUpd } = await supabase
                    .from('shifts')
                    .update({
                        employee_id: newEmployeeId,
                        start_time: req.startTime,
                        end_time: req.endTime,
                        status: 'assigned'
                    })
                    .eq('id', shiftId);
                if (errUpd) throw errUpd;
            } else {
                // Cas standard (pas partiel)
                const { error: errorShift } = await supabase
                    .from('shifts')
                    .update({
                        employee_id: newEmployeeId,
                        status: 'assigned'
                    })
                    .eq('id', shiftId);
                if (errorShift) throw errorShift;
            }

            // 4. Mettre à jour l'état local via refresh global (plus simple pour les splits complexes)
            await fetchData();
        } catch (error) {
            console.error('Erreur approveShiftRequest Supabase:', error);
            throw error;
        }
    };

    const rejectShiftRequest = async (requestId) => {

        try {
            const { error } = await supabase
                .from('shift_requests')
                .update({ status: 'rejected' })
                .eq('id', requestId);

            if (error) throw error;

            setShiftRequests(prev => prev.map(req =>
                req.id === requestId ? { ...req, status: 'rejected' } : req
            ));
        } catch (error) {
            console.error('Erreur rejectShiftRequest Supabase:', error);
            throw error;
        }
    };

    const claimVacantShift = async (shiftId, requestingEmployeeId, date) => {
        return takeShift(shiftId, requestingEmployeeId, date);
    };

    // ─── Disponibilités / Repos ──────────────────────────────────────────────

    const updateAvailability = async (payload) => {
        try {
            // Nettoyage proactif des doublons pour les Repos
            if (payload.type === 'repos') {
                let query = supabase
                    .from('employee_availabilities')
                    .delete()
                    .eq('employee_id', payload.employeeId)
                    .eq('date', payload.date);
                // N'exclure un ID que si on en a un valide (update, pas insert)
                if (payload.id) query = query.neq('id', payload.id);
                const { error: delError } = await query;
                if (delError) throw delError;
            }


            const isNew = !payload.id;
            const dbPayload = {
                restaurant_id: currentRestaurantId,
                employee_id: payload.employeeId,
                date: payload.date,
                type: payload.type,
                start_time: payload.startTime || null,
                end_time: payload.endTime || null,
                note: payload.note || null
            };

            let finalId = payload.id;

            if (isNew) {
                const { data, error } = await supabase.from('employee_availabilities').insert([dbPayload]).select();
                if (error) throw error;
                if (data?.[0]) finalId = data[0].id;
            } else {
                const { error } = await supabase.from('employee_availabilities').update(dbPayload).eq('id', payload.id);
                if (error) throw error;
            }

            // Sync local state with cleaning
            setAvailabilities(prev => {
                const current = prev[currentRestaurantId] || [];
                let cleaned = current;
                if (payload.type === 'repos') {
                    cleaned = current.filter(a => !(a.employeeId == payload.employeeId && a.date === payload.date && a.id !== payload.id));
                }
                
                let updated;
                if (isNew) {
                    updated = [...cleaned, { ...payload, id: finalId }];
                } else {
                    updated = cleaned.map(a => a.id === payload.id ? { ...payload, id: finalId } : a);
                }
                return { ...prev, [currentRestaurantId]: updated };
            });

            return finalId;
        } catch (error) {
            console.error('Erreur updateAvailability Supabase:', error);
            throw error;
        }
    };



    const deleteAvailability = async (id) => {
        try {
            const { error } = await supabase.from('employee_availabilities').delete().eq('id', id);
            if (error) throw error;

            setAvailabilities(prev => {
                const current = prev[currentRestaurantId] || [];
                const updated = current.filter(a => a.id !== id);
                return { ...prev, [currentRestaurantId]: updated };
            });
        } catch (error) {
            console.error('Erreur deleteAvailability Supabase:', error);
            throw error;
        }
    };

    const approveAvailability = async (id) => {
        try {
            const { error } = await supabase
                .from('employee_availabilities')
                .update({ status: 'approved' })
                .eq('id', id);
            if (error) throw error;
            setAvailabilities(prev => {
                const current = prev[currentRestaurantId] || [];
                return { ...prev, [currentRestaurantId]: current.map(a => a.id === id ? { ...a, status: 'approved' } : a) };
            });
        } catch (error) {
            console.error('Erreur approveAvailability:', error);
            throw error;
        }
    };

    const rejectAvailability = async (id) => {
        try {
            const { error } = await supabase
                .from('employee_availabilities')
                .update({ status: 'rejected' })
                .eq('id', id);
            if (error) throw error;
            setAvailabilities(prev => {
                const current = prev[currentRestaurantId] || [];
                return { ...prev, [currentRestaurantId]: current.map(a => a.id === id ? { ...a, status: 'rejected' } : a) };
            });
        } catch (error) {
            console.error('Erreur rejectAvailability:', error);
            throw error;
        }
    };

    // ─── Utilitaires ──────────────────────────────────────────────────────────


    const getEmployeeColor = (employeeId) => {
        const colorIndex = ((employeeId - 1) % 10) + 1;
        return `var(--employee-color-${colorIndex})`;
    };

    const getPaidKey = (employeeId, date) =>
        `${employeeId}-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const isPaid = (employeeId, date) =>
        paidStatus[currentRestaurantId]?.[getPaidKey(employeeId, date)] || false;

    const togglePaid = (employeeId, date) => {
        const key = getPaidKey(employeeId, date);
        const currentStatus = paidStatus[currentRestaurantId] || {};
        setPaidStatus({
            ...paidStatus,
            [currentRestaurantId]: { ...currentStatus, [key]: !currentStatus[key] },
        });
    };

    // ─── Context Value ────────────────────────────────────────────────────────

    const value = {
        // Authentification
        currentUserRole,
        currentEmployeeId,
        loginAsManager,
        loginAsEmployee,
        logout,

        // Data Management originel
        currentRestaurantId,
        setCurrentRestaurantId,
        restaurants,
        updateRestaurants,
        employees,
        updateEmployees,
        shifts,
        updateShifts,
        dayNotes,
        updateDayNotes,
        revenueData,
        upsertRevenueData,
        currentRestaurant,
        currentEmployees,
        currentShifts,
        currentDayNotes,
        currentRevenueData,
        getEmployeeColor,
        isPaid,
        togglePaid,
        isLoading,
        refreshData: fetchData,

        // Bourse d'échange
        shiftRequests,
        offerShift,
        takeShift,
        approveShiftRequest,
        rejectShiftRequest,
        claimVacantShift,

        // Disponibilités
        availabilities,
        currentAvailabilities,
        updateAvailability,
        deleteAvailability,
        approveAvailability,
        rejectAvailability,

    };


    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
