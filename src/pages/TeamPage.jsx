import React, { useState } from 'react';
import { Icons } from '../components/UI/Icons';
import { UserPlus, Settings, Trash2, X, Info } from 'lucide-react';
import { useData } from '../context/DataContext';

const EquipePage = () => {
    const { currentEmployees, updateEmployees, getEmployeeColor } = useData();
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [formData, setFormData] = useState({
        name: '', role: 'Serveur', contract: 'CDI', level: 'junior',
        hourlyRate: 11.65, maxHoursPerWeek: 35, phone: '', email: '', notes: '',
        hoursType: 'weekly', monthlyHours: 151.67
    });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const openModal = (employee = null) => {
        setEditingEmployee(employee);
        setShowDeleteConfirm(false);
        if (employee) {
            setFormData({
                ...employee,
                hoursType: employee.hoursType || 'weekly',
                monthlyHours: employee.hoursType === 'monthly'
                    ? parseFloat((employee.maxHoursPerWeek * 52 / 12).toFixed(2))
                    : parseFloat((employee.maxHoursPerWeek * 52 / 12).toFixed(2))
            });
        } else {
            setFormData({
                name: '', role: 'Serveur', contract: 'CDI', level: 'junior',
                hourlyRate: 11.65, maxHoursPerWeek: 35, phone: '', email: '', notes: '',
                hoursType: 'weekly', monthlyHours: 151.67
            });
        }
        setShowEmployeeModal(true);
    };

    const handleDeleteEmployee = () => {
        if (editingEmployee) {
            updateEmployees(currentEmployees.filter(e => e.id !== editingEmployee.id));
            setShowEmployeeModal(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleHoursChange = (value, type) => {
        const numValue = parseFloat(value) || 0;
        if (type === 'weekly') {
            setFormData({
                ...formData,
                maxHoursPerWeek: numValue,
                monthlyHours: parseFloat((numValue * 52 / 12).toFixed(2)),
                hoursType: 'weekly'
            });
        } else {
            setFormData({
                ...formData,
                monthlyHours: numValue,
                maxHoursPerWeek: parseFloat((numValue * 12 / 52).toFixed(2)),
                hoursType: 'monthly'
            });
        }
    };

    const toggleHoursType = (type) => {
        setFormData({ ...formData, hoursType: type });
    };

    const handleSubmit = () => {
        const employeeData = {
            ...formData,
            maxHoursPerWeek: formData.hoursType === 'weekly'
                ? formData.maxHoursPerWeek
                : parseFloat((formData.monthlyHours * 12 / 52).toFixed(2))
        };

        if (editingEmployee) {
            updateEmployees(currentEmployees.map(emp =>
                emp.id === editingEmployee.id
                    ? { ...emp, ...employeeData }
                    : emp
            ));
        } else {
            const newId = Math.max(...currentEmployees.map(e => e.id), 0) + 1;
            updateEmployees([...currentEmployees, { id: newId, ...employeeData }]);
        }
        setShowEmployeeModal(false);
    };

    return (
        <div>
            <div className="team-header">
                <div>
                    <h1 className="page-title">Mon Équipe</h1>
                    <p className="page-subtitle">Gérez vos employés, leurs contrats et disponibilités ({currentEmployees.length} actifs)</p>
                </div>
                <button className="btn-primary" onClick={() => openModal()}>
                    <UserPlus size={18} /> Ajouter un employé
                </button>
            </div>

            <div className="team-grid">
                {currentEmployees.map(employee => (
                    <div key={employee.id} className="employee-card">
                        <div className="employee-header">
                            <div>
                                <h3 className="employee-name">
                                    <span className="employee-color-dot" style={{ background: getEmployeeColor(employee.id) }}></span>
                                    {employee.name}
                                </h3>
                                <p className="employee-role">{employee.role}</p>
                            </div>
                            <div className="employee-actions">
                                <button className="btn-edit" onClick={() => openModal(employee)}>
                                    <Settings size={16} /> Modifier
                                </button>
                            </div>
                        </div>
                        <div className="employee-badges">
                            <span className="badge badge-info">{employee.contract}</span>
                            <span className="badge badge-success">{employee.level}</span>
                        </div>
                        <p className="employee-info">
                            {employee.hourlyRate.toFixed(2)}€/h •
                            {employee.hoursType === 'monthly'
                                ? ` ${(employee.maxHoursPerWeek * 52 / 12).toFixed(1)}h / mois`
                                : ` ${employee.maxHoursPerWeek}h / sem`
                            }
                        </p>
                    </div>
                ))}
            </div>

            {showEmployeeModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">{editingEmployee ? 'Modifier' : 'Ajouter'} un employé</h2>
                            <button className="btn-close" onClick={() => setShowEmployeeModal(false)}><X size={20} /></button>
                        </div>

                        {/* Modal Body (kept same as before) */}
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '20px' }}>
                            <div className="form-group">
                                <label className="form-label">Prénom et nom *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Jean Dupont"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={formData.email || ''}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="exemple@restaurant.fr"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Téléphone</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="06 12 34 56 78"
                                />
                            </div>

                            <div className="row" style={{ display: 'flex', gap: '16px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Rôle *</label>
                                    <select
                                        className="form-select"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="Serveur">Serveur</option>
                                        <option value="Chef de rang">Chef de rang</option>
                                        <option value="Cuisinier">Cuisinier</option>
                                        <option value="Chef de cuisine">Chef de cuisine</option>
                                        <option value="Plongeur">Plongeur</option>
                                        <option value="Barman">Barman</option>
                                        <option value="Commis">Commis</option>
                                    </select>
                                </div>

                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Type de contrat *</label>
                                    <select
                                        className="form-select"
                                        value={formData.contract}
                                        onChange={(e) => setFormData({ ...formData, contract: e.target.value })}
                                    >
                                        <option value="CDI">CDI</option>
                                        <option value="CDD">CDD</option>
                                        <option value="Intérim">Intérim</option>
                                        <option value="Stage">Stage</option>
                                        <option value="Apprentissage">Apprentissage</option>
                                    </select>
                                </div>
                            </div>

                            <div className="row" style={{ display: 'flex', gap: '16px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Niveau *</label>
                                    <select
                                        className="form-select"
                                        value={formData.level}
                                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                    >
                                        <option value="junior">Junior</option>
                                        <option value="confirmé">Confirmé</option>
                                        <option value="senior">Senior</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Taux horaire (€) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="form-input"
                                        value={formData.hourlyRate}
                                        onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Base Horaire *</label>
                                <div className="tabs" style={{ display: 'flex', marginBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                                    <button
                                        className={`tab-btn ${formData.hoursType === 'weekly' ? 'active' : ''}`}
                                        onClick={() => toggleHoursType('weekly')}
                                        style={{
                                            padding: '8px 16px',
                                            borderBottom: formData.hoursType === 'weekly' ? '2px solid var(--primary)' : 'none',
                                            color: formData.hoursType === 'weekly' ? 'var(--primary)' : 'var(--text-secondary)',
                                            background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500
                                        }}
                                    >
                                        Hebdomadaire
                                    </button>
                                    <button
                                        className={`tab-btn ${formData.hoursType === 'monthly' ? 'active' : ''}`}
                                        onClick={() => toggleHoursType('monthly')}
                                        style={{
                                            padding: '8px 16px',
                                            borderBottom: formData.hoursType === 'monthly' ? '2px solid var(--primary)' : 'none',
                                            color: formData.hoursType === 'monthly' ? 'var(--primary)' : 'var(--text-secondary)',
                                            background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500
                                        }}
                                    >
                                        Mensuel
                                    </button>
                                </div>

                                {formData.hoursType === 'weekly' ? (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="number"
                                                min="0"
                                                max="60"
                                                className="form-input"
                                                value={formData.maxHoursPerWeek}
                                                onChange={(e) => handleHoursChange(e.target.value, 'weekly')}
                                                required
                                            />
                                            <span>heures / semaine</span>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            Soit environ <strong>{formData.monthlyHours}h</strong> / mois
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="number"
                                                min="0"
                                                className="form-input"
                                                value={formData.monthlyHours}
                                                onChange={(e) => handleHoursChange(e.target.value, 'monthly')}
                                                required
                                            />
                                            <span>heures / mois</span>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            Soit environ <strong>{formData.maxHoursPerWeek}h</strong> / semaine
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Disponibilités, préférences..."
                                />
                            </div>
                        </div>

                        <div className="form-actions" style={{ justifyContent: 'space-between', padding: '20px', borderTop: '1px solid var(--border)' }}>
                            {editingEmployee && (
                                !showDeleteConfirm ? (
                                    <button className="btn-delete" onClick={() => setShowDeleteConfirm(true)}>
                                        <Trash2 size={16} /> Supprimer
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn-danger" onClick={handleDeleteEmployee}>
                                            Confirmer ?
                                        </button>
                                        <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                                            Annuler
                                        </button>
                                    </div>
                                )
                            )}
                            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                                <button className="btn-secondary" onClick={() => setShowEmployeeModal(false)}>Annuler</button>
                                <button className="btn-primary" onClick={handleSubmit}>{editingEmployee ? 'Enregistrer' : 'Créer'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipePage;
