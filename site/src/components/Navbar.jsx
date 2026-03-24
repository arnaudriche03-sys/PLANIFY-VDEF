import React from 'react';
import { Layout } from 'lucide-react';

const Navbar = ({ onLoginClick }) => {
  return (
    <nav className="site-nav">
      <div className="site-logo">
        <Layout size={28} />
        <span>Planify</span>
      </div>
      <div className="nav-links">
        <a href="#features" className="nav-link">Fonctionnalités</a>
        <a href="#about" className="nav-link">À propos</a>
        <button onClick={onLoginClick} className="nav-cta">
          Accéder à l'app
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
