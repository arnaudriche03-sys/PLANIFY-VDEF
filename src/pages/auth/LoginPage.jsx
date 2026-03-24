import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { ChefHat, Users, Lock, ChevronRight, ArrowLeft } from 'lucide-react';
import '../../index.css';

const LoginPage = ({ onBack }) => {
    const { restaurants, currentRestaurantId, setCurrentRestaurantId, currentEmployees, loginAsManager, loginAsEmployee } = useData();
    const [view, setView] = useState('selection'); // 'selection' | 'manager' | 'employee' | 'employee-pin'
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [pinCode, setPinCode] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleManagerLogin = (e) => {
        e.preventDefault();
        // TODO: Vérification du mot de passe Manager réel avec Supabase
        // Pour l'instant on bypass pour avancer sur l'interface
        loginAsManager();
    };

    const handleEmployeeSelect = (emp) => {
        setSelectedEmployee(emp);
        setView('employee-pin');
        setErrorMsg('');
        setPinCode('');
    };

    const handlePinSubmit = (e) => {
        e.preventDefault();
        // TODO: Vérifier le vrai pin_code en base (à ajouter plus tard)
        if (pinCode.length === 4) {
            loginAsEmployee(selectedEmployee.id);
        } else {
            setErrorMsg('Le code PIN doit comporter 4 chiffres.');
        }
    };

    const renderSelection = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            {onBack && (
                <button onClick={onBack} style={{
                    background: 'none', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center',
                    gap: '8px', cursor: 'pointer', padding: 0, marginBottom: '8px', fontSize: '0.9rem'
                }}>
                    <ArrowLeft size={16} /> Retour au site
                </button>
            )}
            <h2 style={{ fontSize: '1.5rem', color: '#f1f5f9', fontWeight: '700', marginBottom: '8px', textAlign: 'center' }}>
                Bienvenue sur Planify
            </h2>
            <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '24px', fontSize: '0.95rem' }}>
                Sélectionnez votre espace de connexion
            </p>

            <button onClick={() => setView('employee')} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s',
            }} className="hover-lift">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '12px', borderRadius: '12px' }}>
                        <Users size={24} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ color: '#f1f5f9', fontWeight: '600', fontSize: '1.1rem' }}>Espace Salarié</div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>Consultez votre planning et vos shifts</div>
                    </div>
                </div>
                <ChevronRight color="#64748b" />
            </button>

            <button onClick={() => setView('manager')} style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s',
            }} className="hover-lift">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', padding: '12px', borderRadius: '12px' }}>
                        <ChefHat size={24} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '1.1rem' }}>Espace Manager</div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>Gérez votre équipe et vos plannings</div>
                    </div>
                </div>
                <ChevronRight color="#64748b" />
            </button>
        </div>
    );

    const renderEmployeeList = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            <button onClick={() => setView('selection')} style={{
                background: 'none', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center',
                gap: '8px', cursor: 'pointer', padding: 0, marginBottom: '16px', fontSize: '0.9rem'
            }}>
                <ArrowLeft size={16} /> Retour
            </button>

            <h2 style={{ fontSize: '1.3rem', color: '#f1f5f9', fontWeight: '700', textAlign: 'center' }}>
                Qui êtes-vous ?
            </h2>

            {/* Sélecteur de restaurant si plusieurs (utile pour les chaînes) */}
            {restaurants.length > 1 && (
                <div style={{ marginBottom: '16px' }}>
                    <select
                        value={currentRestaurantId}
                        onChange={(e) => setCurrentRestaurantId(e.target.value)}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.95rem'
                        }}
                    >
                        {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
            )}

            <div style={{ display: 'grid', gap: '8px', overflowY: 'auto', maxHeight: '50vh', paddingRight: '4px' }} className="custom-scrollbar">
                {currentEmployees.map(emp => (
                    <button
                        key={emp.id}
                        onClick={() => handleEmployeeSelect(emp)}
                        style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                            padding: '16px', borderRadius: '12px', textAlign: 'left', color: '#f1f5f9',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>{emp.name}</div>
                            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>{emp.role}</div>
                        </div>
                        <ChevronRight size={16} color="#475569" />
                    </button>
                ))}
            </div>
        </div>
    );

    const renderEmployeePin = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            <button onClick={() => setView('employee')} style={{
                background: 'none', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center',
                gap: '8px', cursor: 'pointer', padding: 0, marginBottom: '16px', fontSize: '0.9rem'
            }}>
                <ArrowLeft size={16} /> Je ne suis pas {selectedEmployee?.name}
            </button>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: 64, height: 64, background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Lock size={28} />
                </div>
                <h2 style={{ fontSize: '1.3rem', color: '#f1f5f9', fontWeight: '700' }}>
                    Code PIN
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
                    Entrez votre code à 4 chiffres pour accéder à votre espace
                </p>
            </div>

            <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))} // Que des chiffres
                    placeholder="••••"
                    style={{
                        padding: '16px', borderRadius: '12px', background: 'var(--bg-lighter)',
                        border: '1px solid var(--border)', color: 'white', fontSize: '2rem',
                        textAlign: 'center', letterSpacing: '0.5em', outline: 'none'
                    }}
                    autoFocus
                />
                {errorMsg && <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{errorMsg}</div>}

                <button type="submit" style={{
                    background: 'var(--primary)', color: 'white', padding: '16px', borderRadius: '12px',
                    border: 'none', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', marginTop: '8px'
                }}>
                    Se connecter
                </button>
            </form>
        </div>
    );

    const renderManagerLogin = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            <button onClick={() => setView('selection')} style={{
                background: 'none', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center',
                gap: '8px', cursor: 'pointer', padding: 0, marginBottom: '16px', fontSize: '0.9rem'
            }}>
                <ArrowLeft size={16} /> Retour
            </button>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: 64, height: 64, background: 'rgba(245,158,11,0.1)', color: '#fbbf24', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <ChefHat size={32} />
                </div>
                <h2 style={{ fontSize: '1.3rem', color: '#f1f5f9', fontWeight: '700' }}>
                    Connexion Manager
                </h2>
            </div>

            <form onSubmit={handleManagerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input
                    type="email"
                    placeholder="Email"
                    style={{
                        padding: '14px', borderRadius: '12px', background: 'var(--bg-lighter)',
                        border: '1px solid var(--border)', color: 'white', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box'
                    }}
                />
                <input
                    type="password"
                    placeholder="Mot de passe"
                    style={{
                        padding: '14px', borderRadius: '12px', background: 'var(--bg-lighter)',
                        border: '1px solid var(--border)', color: 'white', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box'
                    }}
                />
                <button type="submit" style={{
                    background: '#fbbf24', color: '#0f172a', padding: '14px', borderRadius: '12px',
                    border: 'none', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', marginTop: '8px'
                }}>
                    Accéder au Dashboard
                </button>
            </form>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-main)', padding: '20px', overflowX: 'hidden'
        }}>
            {/* Shapes décoratives de fond */}
            <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(15,23,42,0) 70%)', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} />
            <div style={{ position: 'absolute', bottom: -50, left: -100, width: 300, height: 300, background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, rgba(15,23,42,0) 70%)', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} />

            {/* Container principal */}
            <div style={{
                position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px',
                background: 'rgba(30,41,59,0.5)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px',
                padding: '32px 24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: view === 'selection' ? '24px' : '0' }}>
                    <div className="logo cursor-pointer" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="logo-icon" style={{
                            width: 32, height: 32, background: 'var(--primary)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: 'white', fontWeight: 800
                        }}>P</div>
                        <span className="logo-text" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            Planify<span style={{ color: 'var(--primary)' }}>.</span>
                        </span>
                    </div>
                </div>

                {view === 'selection' && renderSelection()}
                {view === 'manager' && renderManagerLogin()}
                {view === 'employee' && renderEmployeeList()}
                {view === 'employee-pin' && renderEmployeePin()}
            </div>
            <style>{`
                .hover-lift:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.2) !important; background: rgba(255,255,255,0.08) !important; }
            `}</style>
        </div>
    );
};

export default LoginPage;
