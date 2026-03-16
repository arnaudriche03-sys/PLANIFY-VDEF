import React, { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import Header from './components/Layout/Header';
import EquipePage from './pages/TeamPage';
import PlanningPage from './pages/PlanningPage';
import PrepaiePage from './pages/PrepaiePage';
import AssistantPage from './pages/AssistantPage';
import RestaurantModal from './components/Modals/RestaurantModal';
import LoginPage from './pages/auth/LoginPage';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';

function AppContent() {
  const [currentTab, setCurrentTab] = useState('equipe');
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [restaurantModalMode, setRestaurantModalMode] = useState('create');
  const { isLoading, currentUserRole } = useData();

  const handleOpenRestaurantModal = (mode) => {
    setRestaurantModalMode(mode);
    setShowRestaurantModal(true);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: '1rem',
        background: 'var(--bg-main)', color: 'var(--text-secondary)'
      }}>
        <div style={{
          width: 40, height: 40, border: '3px solid var(--border)',
          borderTopColor: 'var(--primary)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Chargement des données…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté
  if (!currentUserRole) {
    return <LoginPage />;
  }

  // Si l'utilisateur est un Employé (Dashboard mobile)
  if (currentUserRole === 'employee') {
    return <EmployeeDashboard />;
  }

  // Render logic : Vue Manager par défaut
  const renderContent = () => {
    switch (currentTab) {
      case 'equipe': return <EquipePage />;
      case 'planning': return <PlanningPage />;
      case 'prepaie': return <PrepaiePage />;
      case 'assistant': return <AssistantPage />;
      default: return <EquipePage />;
    }
  };

  return (
    <>
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenRestaurantModal={handleOpenRestaurantModal}
      />
      <main className="main-content">
        {renderContent()}
      </main>

      {showRestaurantModal && (
        <RestaurantModal
          mode={restaurantModalMode}
          onClose={() => setShowRestaurantModal(false)}
        />
      )}
    </>
  );
}

function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default App;
