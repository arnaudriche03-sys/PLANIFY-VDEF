import { Icons } from '../UI/Icons';
import { useData } from '../../context/DataContext';
import { Settings, Plus, LogOut, Users, Calendar, Calculator, LineChart, Menu, X } from 'lucide-react';
import React, { useState } from 'react';

const Header = ({ currentTab, setCurrentTab, onOpenRestaurantModal }) => {
    const { currentRestaurantId, setCurrentRestaurantId, restaurants, logout } = useData();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <>
            <header className="header">
                <div className="logo">
                    <div className="logo-icon"><Icons.Calendar size={24} /></div>
                    <span className="logo-text">Planify</span>
                </div>
                
                {/* Desktop Nav */}
                <nav className="nav">
                    <button className={`nav-btn ${currentTab === 'equipe' ? 'active' : ''}`} onClick={() => setCurrentTab('equipe')}><Users size={18} /> Equipe</button>
                    <button className={`nav-btn ${currentTab === 'planning' ? 'active' : ''}`} onClick={() => setCurrentTab('planning')}><Calendar size={18} /> Planning</button>
                    <button className={`nav-btn ${currentTab === 'prepaie' ? 'active' : ''}`} onClick={() => setCurrentTab('prepaie')}><Calculator size={18} /> Pré-paie</button>
                    <button className={`nav-btn ${currentTab === 'assistant' ? 'active' : ''}`} onClick={() => setCurrentTab('assistant')}><LineChart size={18} /> Analyse IA</button>
                </nav>

                <div className="user-section">
                    <select className="restaurant-selector" value={currentRestaurantId} onChange={(e) => setCurrentRestaurantId(parseInt(e.target.value))}>
                        {restaurants.map(resto => <option key={resto.id} value={resto.id}>{resto.name}</option>)}
                    </select>
                    <button className="restaurant-manage-btn desktop-only" onClick={() => onOpenRestaurantModal('edit')} title="Réglages"><Settings size={16} /></button>
                    <button className="restaurant-manage-btn desktop-only" onClick={() => onOpenRestaurantModal('create')} title="Ajouter"><Plus size={16} /></button>
                    <span className="user-email desktop-only">arnaudriche03@gmail.com</span>
                    <button className="btn-disconnect desktop-only" onClick={logout}><LogOut size={16} /> Déconnexion</button>
                    
                    {/* Mobile Menu Toggle */}
                    <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="mobile-menu-overlay" onClick={() => setIsMenuOpen(false)}>
                    <div className="mobile-menu-content" onClick={e => e.stopPropagation()}>
                        <div className="mobile-menu-header">
                            <span className="logo-text">Menu</span>
                            <button onClick={() => setIsMenuOpen(false)}><X size={24} /></button>
                        </div>
                        <div className="mobile-menu-links">
                            <button className={`mobile-nav-btn ${currentTab === 'equipe' ? 'active' : ''}`} onClick={() => { setCurrentTab('equipe'); setIsMenuOpen(false); }}><Users size={20} /> Equipe</button>
                            <button className={`mobile-nav-btn ${currentTab === 'planning' ? 'active' : ''}`} onClick={() => { setCurrentTab('planning'); setIsMenuOpen(false); }}><Calendar size={20} /> Planning</button>
                            <button className={`mobile-nav-btn ${currentTab === 'prepaie' ? 'active' : ''}`} onClick={() => { setCurrentTab('prepaie'); setIsMenuOpen(false); }}><Calculator size={20} /> Pré-paie</button>
                            <button className={`mobile-nav-btn ${currentTab === 'assistant' ? 'active' : ''}`} onClick={() => { setCurrentTab('assistant'); setIsMenuOpen(false); }}><LineChart size={20} /> Analyse IA</button>
                        </div>
                        <div className="mobile-menu-footer">
                            <button className="mobile-action-btn" onClick={() => { onOpenRestaurantModal('edit'); setIsMenuOpen(false); }}><Settings size={18} /> Paramètres</button>
                            <button className="mobile-action-btn" onClick={() => { onOpenRestaurantModal('create'); setIsMenuOpen(false); }}><Plus size={18} /> Nouveau Restaurant</button>
                            <button className="mobile-logout-btn" onClick={logout}><LogOut size={18} /> Déconnexion</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Nav for Mobile Manager */}
            <nav className="mobile-bottom-nav">
                <button className={`bottom-nav-btn ${currentTab === 'equipe' ? 'active' : ''}`} onClick={() => setCurrentTab('equipe')}><Users size={20} /><span>Equipe</span></button>
                <button className={`bottom-nav-btn ${currentTab === 'planning' ? 'active' : ''}`} onClick={() => setCurrentTab('planning')}><Calendar size={20} /><span>Plannings</span></button>
                <button className={`bottom-nav-btn ${currentTab === 'prepaie' ? 'active' : ''}`} onClick={() => setCurrentTab('prepaie')}><Calculator size={20} /><span>Paie</span></button>
                <button className={`bottom-nav-btn ${currentTab === 'assistant' ? 'active' : ''}`} onClick={() => setCurrentTab('assistant')}><LineChart size={20} /><span>Analyse</span></button>
            </nav>
        </>
    );
};

export default Header;
