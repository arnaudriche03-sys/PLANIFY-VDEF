import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const DataContext = createContext();

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
    const [isLoading, setIsLoading] = useState(true);

    // ─── Chargement initial depuis Supabase ───────────────────────────────────

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [resResult, empResult, shiResult, noteResult, revResult, reqResult] = await Promise.all([
                supabase.from('restaurants').select('*'),
                supabase.from('employees').select('*'),
                supabase.from('shifts').select('*'),
                supabase.from('day_notes').select('*'),
                supabase.from('revenue_data').select('*'),
                supabase.from('shift_requests').select('*')
            ]);

            if (resResult.error) throw resResult.error;
            if (empResult.error) throw empResult.error;
            if (shiResult.error) throw shiResult.error;
            if (noteResult.error) throw noteResult.error;
            if (reqResult.error && reqResult.error.code !== '42P01') {
                console.warn('shift_requests table might not exist yet:', reqResult.error);
            }

            setRestaurants(resResult.data || []);

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

        } catch (error) {
            console.error('Erreur fetchData Supabase:', error);
        } finally {
            setIsLoading(false);
        }
    }, []); // Removed isDemoMode as it's not defined in the original context

    useEffect(() => {
        fetchData();
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

    // ─── Actions Restaurants ──────────────────────────────────────────────────

    const updateRestaurants = async (newRestaurants) => {
        setRestaurants(newRestaurants);
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
                    employee_id: s.employeeId,
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

    const takeShift = async (shiftId, requestingEmployeeId, targetDate) => {
        try {
            // Créer la demande en BDD
            const { data, error } = await supabase
                .from('shift_requests')
                .insert([{
                    shift_id: shiftId,
                    requesting_employee_id: requestingEmployeeId,
                    target_date: targetDate,
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
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
