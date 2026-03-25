import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { X, Trash2 } from 'lucide-react';

const RestaurantModal = ({ onClose, mode }) => {
    const {
        restaurants,
        currentRestaurant,
        updateRestaurants,
        setCurrentRestaurantId,
        currentRestaurantId
    } = useData();

    const isEdit = mode === 'edit';
    const [formData, setFormData] = useState(() => {
        if (mode === 'edit' && currentRestaurant) {
            return {
                name: currentRestaurant.name || '',
                address: currentRestaurant.address || '',
                openingTime: currentRestaurant.openingTime || '09:00',
                closingTime: currentRestaurant.closingTime || '23:00',
                openingTimeWeekend: currentRestaurant.openingTimeWeekend || '09:00',
                closingTimeWeekend: currentRestaurant.closingTimeWeekend || '23:00',
                nightBonusPct: currentRestaurant.nightBonusPct !== undefined ? currentRestaurant.nightBonusPct : 10,
                sundayBonusPct: currentRestaurant.sundayBonusPct !== undefined ? currentRestaurant.sundayBonusPct : 10,
                // ADN & Historique
                establishmentType: currentRestaurant.establishmentType || 'bistro',
                targetRmo: currentRestaurant.targetRmo || 30,
                targetProductivity: currentRestaurant.targetProductivity || 80,
                averageTicket: currentRestaurant.averageTicket || 25,
                revenueN1: currentRestaurant.revenueN1 || 0,
                rmoN1: currentRestaurant.rmoN1 || 0,
                customersN1: currentRestaurant.customersN1 || 0
            };
        }
        return { 
            name: '', 
            address: '', 
            openingTime: '09:00', 
            closingTime: '23:00',
            openingTimeWeekend: '09:00',
            closingTimeWeekend: '23:00',
            nightBonusPct: 10,
            sundayBonusPct: 10,
            establishmentType: 'bistro',
            targetRmo: 30,
            targetProductivity: 80,
            averageTicket: 25,
            revenueN1: 0,
            rmoN1: 0,
            customersN1: 0
        };
    });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        if (mode === 'create') {
            const newId = Math.max(...restaurants.map(r => r.id), 0) + 1;
            const newRestaurant = {
                id: newId,
                name: formData.name,
                address: formData.address,
                openingTime: formData.openingTime,
                closingTime: formData.closingTime,
                openingTimeWeekend: formData.openingTimeWeekend,
                closingTimeWeekend: formData.closingTimeWeekend,
                nightBonusPct: Number(formData.nightBonusPct),
                sundayBonusPct: Number(formData.sundayBonusPct),
                establishmentType: formData.establishmentType,
                targetRmo: Number(formData.targetRmo),
                targetProductivity: Number(formData.targetProductivity),
                averageTicket: Number(formData.averageTicket),
                revenueN1: Number(formData.revenueN1),
                rmoN1: Number(formData.rmoN1),
                customersN1: Number(formData.customersN1)
            };
            updateRestaurants([...restaurants, newRestaurant]);
            setCurrentRestaurantId(newId);
        } else {
            const updatedRestaurants = restaurants.map(r =>
                r.id === currentRestaurantId ? {
                    ...r,
                    name: formData.name,
                    address: formData.address,
                    openingTime: formData.openingTime,
                    closingTime: formData.closingTime,
                    openingTimeWeekend: formData.openingTimeWeekend,
                    closingTimeWeekend: formData.closingTimeWeekend,
                    nightBonusPct: Number(formData.nightBonusPct),
                    sundayBonusPct: Number(formData.sundayBonusPct),
                    establishmentType: formData.establishmentType,
                    targetRmo: Number(formData.targetRmo),
                    targetProductivity: Number(formData.targetProductivity),
                    averageTicket: Number(formData.averageTicket),
                    revenueN1: Number(formData.revenueN1),
                    rmoN1: Number(formData.rmoN1),
                    customersN1: Number(formData.customersN1)
                } : r
            );

            // Persister en BDD (mapping camelCase -> snake_case)
            const payload = {
                name: formData.name,
                address: formData.address,
                opening_time: formData.openingTime,
                closing_time: formData.closingTime,
                opening_time_weekend: formData.openingTimeWeekend,
                closing_time_weekend: formData.closingTimeWeekend,
                night_bonus_pct: Number(formData.nightBonusPct),
                sunday_bonus_pct: Number(formData.sundayBonusPct),
                establishment_type: formData.establishmentType,
                target_rmo: Number(formData.targetRmo),
                target_productivity: Number(formData.targetProductivity),
                average_ticket: Number(formData.averageTicket),
                revenue_n1: Number(formData.revenueN1),
                rmo_n1: Number(formData.rmoN1),
                customers_n1: Number(formData.customersN1)
            };

            updateRestaurants(updatedRestaurants, payload);
        }
        onClose();
    };

    const handleDelete = () => {
        if (restaurants.length <= 1) {
            alert("Impossible de supprimer le seul restaurant actif.");
            return;
        }

        const updatedRestaurants = restaurants.filter(r => r.id !== currentRestaurantId);
        updateRestaurants(updatedRestaurants);
        if (updatedRestaurants.length > 0) {
            setCurrentRestaurantId(updatedRestaurants[0].id);
        }
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2>{isEdit ? 'Modifier le Restaurant' : 'Ajouter un Restaurant'}</h2>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label>Nom du restaurant</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Le Bistrot Parisien"
                        />
                    </div>
                    <div className="form-group">
                        <label>Adresse</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Ex: 12 rue de la Paix..."
                        />
                    </div>
                    <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'block', marginBottom: '12px' }}>Horaires de la Semaine (Lundi-Vendredi)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem' }}>Ouverture</label>
                                <input
                                    type="time"
                                    className="form-input"
                                    value={formData.openingTime}
                                    onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem' }}>Fermeture</label>
                                <input
                                    type="time"
                                    className="form-input"
                                    value={formData.closingTime}
                                    onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'block', marginBottom: '12px' }}>Horaires du Weekend (Samedi-Dimanche)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem' }}>Ouverture</label>
                                <input
                                    type="time"
                                    className="form-input"
                                    value={formData.openingTimeWeekend}
                                    onChange={(e) => setFormData({ ...formData, openingTimeWeekend: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem' }}>Fermeture</label>
                                <input
                                    type="time"
                                    className="form-input"
                                    value={formData.closingTimeWeekend}
                                    onChange={(e) => setFormData({ ...formData, closingTimeWeekend: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)', marginBottom: '16px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'block', marginBottom: '12px' }}>ADN du Concept</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem' }}>Type d'établissement</label>
                                <select 
                                    className="form-input"
                                    value={formData.establishmentType}
                                    onChange={(e) => setFormData({ ...formData, establishmentType: e.target.value })}
                                >
                                    <option value="bistro">Bistro / Brasserie</option>
                                    <option value="gastro">Gastronomique</option>
                                    <option value="fastfood">Restauration Rapide</option>
                                    <option value="bar">Bar / Pub</option>
                                    <option value="bakery">Boulangerie / Pâtisserie</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem' }}>Ticket Moyen (€)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.averageTicket}
                                    onChange={(e) => setFormData({ ...formData, averageTicket: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem' }}>Objectif RMO (%)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.targetRmo}
                                    onChange={(e) => setFormData({ ...formData, targetRmo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem' }}>Prod. Horaire (€/h)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.targetProductivity}
                                    onChange={(e) => setFormData({ ...formData, targetProductivity: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '16px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '12px' }}>Historique de Référence (N-1)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem' }}>CA N-1 (€)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.revenueN1}
                                    onChange={(e) => setFormData({ ...formData, revenueN1: e.target.value })}
                                    style={{ fontSize: '0.8rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem' }}>RMO N-1 (%)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.rmoN1}
                                    onChange={(e) => setFormData({ ...formData, rmoN1: e.target.value })}
                                    style={{ fontSize: '0.8rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem' }}>Couverts N-1</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.customersN1}
                                    onChange={(e) => setFormData({ ...formData, customersN1: e.target.value })}
                                    style={{ fontSize: '0.8rem' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'block', marginBottom: '12px' }}>Taux de Majorations (%)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem' }}>Nuit (22h-7h)</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.nightBonusPct}
                                        onChange={(e) => setFormData({ ...formData, nightBonusPct: e.target.value })}
                                        style={{ paddingRight: '25px' }}
                                    />
                                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>%</span>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem' }}>Dimanche</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.sundayBonusPct}
                                        onChange={(e) => setFormData({ ...formData, sundayBonusPct: e.target.value })}
                                        style={{ paddingRight: '25px' }}
                                    />
                                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                    {isEdit ? (
                        !showDeleteConfirm ? (
                            <button
                                className="btn btn-danger"
                                onClick={() => setShowDeleteConfirm(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Trash2 size={16} /> Supprimer
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-danger" onClick={handleDelete}>
                                    Confirmer ?
                                </button>
                                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                                    Annuler
                                </button>
                            </div>
                        )
                    ) : (
                        <div></div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
                        <button className="btn btn-primary" onClick={handleSubmit} disabled={!formData.name.trim()}>Enregistrer</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RestaurantModal;
