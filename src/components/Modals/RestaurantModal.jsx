import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Icons } from '../UI/Icons';

const RestaurantModal = ({ onClose, mode }) => {
    const {
        restaurants,
        currentRestaurant,
        updateRestaurants,
        setCurrentRestaurantId,
        currentRestaurantId
    } = useData();

    const isEdit = mode === 'edit';
    const [formData, setFormData] = useState({ name: '', address: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (mode === 'create') {
            setFormData({ name: '', address: '' });
        } else if (currentRestaurant) {
            setFormData({
                name: currentRestaurant.name,
                address: currentRestaurant.address
            });
        }
        setShowDeleteConfirm(false);
    }, [mode, currentRestaurant]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        if (mode === 'create') {
            const newId = Math.max(...restaurants.map(r => r.id), 0) + 1;
            const newRestaurant = { id: newId, ...formData };
            updateRestaurants([...restaurants, newRestaurant]);
            setCurrentRestaurantId(newId);
        } else {
            const updatedRestaurants = restaurants.map(r =>
                r.id === currentRestaurantId ? { ...r, ...formData } : r
            );
            updateRestaurants(updatedRestaurants);
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
                    <button className="close-btn" onClick={onClose}><Icons.Close size={20} /></button>
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
                </div>

                <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                    {isEdit ? (
                        !showDeleteConfirm ? (
                            <button
                                className="btn btn-danger"
                                onClick={() => setShowDeleteConfirm(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Icons.Trash size={16} /> Supprimer
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
