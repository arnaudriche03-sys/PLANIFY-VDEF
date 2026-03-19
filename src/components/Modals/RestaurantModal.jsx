import React, { useState, useEffect } from 'react';
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
    const [formData, setFormData] = useState({ 
        name: '', 
        address: '', 
        openingTime: '09:00', 
        closingTime: '23:00',
        openingTimeWeekend: '09:00',
        closingTimeWeekend: '23:00',
        nightBonusPct: 10,
        sundayBonusPct: 10
    });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (mode === 'create') {
            setFormData({ name: '', address: '' });
        } else if (currentRestaurant) {
            setFormData({
                name: currentRestaurant.name,
                address: currentRestaurant.address,
                openingTime: currentRestaurant.openingTime || '09:00',
                closingTime: currentRestaurant.closingTime || '23:00',
                openingTimeWeekend: currentRestaurant.openingTimeWeekend || '09:00',
                closingTimeWeekend: currentRestaurant.closingTimeWeekend || '23:00',
                nightBonusPct: currentRestaurant.nightBonusPct !== undefined ? currentRestaurant.nightBonusPct : 10,
                sundayBonusPct: currentRestaurant.sundayBonusPct !== undefined ? currentRestaurant.sundayBonusPct : 10
            });

        }
        setShowDeleteConfirm(false);
    }, [mode, currentRestaurant]);

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
                sundayBonusPct: Number(formData.sundayBonusPct)
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
                    sundayBonusPct: Number(formData.sundayBonusPct)
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
                sunday_bonus_pct: Number(formData.sundayBonusPct)
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
