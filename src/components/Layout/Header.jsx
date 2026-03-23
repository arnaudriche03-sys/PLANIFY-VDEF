import { Icons } from '../UI/Icons';
import { useData } from '../../context/DataContext';
import { Settings, Plus, LogOut, LayoutDashboard, Users, Calendar, Calculator, LineChart } from 'lucide-react';

const Header = ({ currentTab, setCurrentTab, onOpenRestaurantModal }) => {
    const { currentRestaurantId, setCurrentRestaurantId, restaurants, logout } = useData();

    return (
        <header className="header">
            <div className="logo">
                <div className="logo-icon"><Icons.Calendar size={24} /></div>
                <span className="logo-text">Planify</span>
            </div>
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
                <button className="restaurant-manage-btn" onClick={() => onOpenRestaurantModal('edit')} title="Réglages"><Settings size={16} /></button>
                <button className="restaurant-manage-btn" onClick={() => onOpenRestaurantModal('create')} title="Ajouter"><Plus size={16} /></button>
                <span className="user-email">arnaudriche03@gmail.com</span>
                <button className="btn-disconnect" onClick={logout}><LogOut size={16} /> Déconnexion</button>
            </div>
        </header>
    );
};

export default Header;
