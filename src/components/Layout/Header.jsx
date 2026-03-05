import React from 'react';
import { Icons } from '../UI/Icons';
import { useData } from '../../context/DataContext';

const Header = ({ currentTab, setCurrentTab, onOpenRestaurantModal }) => {
    const { currentRestaurantId, setCurrentRestaurantId, restaurants, currentRestaurant } = useData();

    return (
        <header className="header">
            <div className="logo">
                <div className="logo-icon"><Icons.Calendar size={24} /></div>
                <span className="logo-text">Planify</span>
            </div>
            <nav className="nav">
                <button className={`nav-btn ${currentTab === 'equipe' ? 'active' : ''}`} onClick={() => setCurrentTab('equipe')}><Icons.Users size={18} /> Équipe</button>
                <button className={`nav-btn ${currentTab === 'planning' ? 'active' : ''}`} onClick={() => setCurrentTab('planning')}><Icons.Calendar size={18} /> Planning</button>
                <button className={`nav-btn ${currentTab === 'prepaie' ? 'active' : ''}`} onClick={() => setCurrentTab('prepaie')}><Icons.Calculator size={18} /> Pré-paie</button>
                <button className={`nav-btn ${currentTab === 'assistant' ? 'active' : ''}`} onClick={() => setCurrentTab('assistant')}><Icons.Sparkles size={18} /> Assistant IA</button>
            </nav>
            <div className="user-section">
                <select className="restaurant-selector" value={currentRestaurantId} onChange={(e) => setCurrentRestaurantId(parseInt(e.target.value))}>
                    {restaurants.map(resto => <option key={resto.id} value={resto.id}>🏪 {resto.name}</option>)}
                </select>
                <button className="restaurant-manage-btn" onClick={() => onOpenRestaurantModal('edit')} title="Modifier">✏️</button>
                <button className="restaurant-manage-btn" onClick={() => onOpenRestaurantModal('create')} title="Ajouter">+</button>
                <span className="user-email">arnaudriche03@gmail.com</span>
                <button className="btn-disconnect">🚪 Déconnexion</button>
            </div>
        </header>
    );
};

export default Header;
