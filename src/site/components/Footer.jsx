import React from 'react';
import { Layout } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="site-logo">
          <Layout size={24} />
          <span>Planify</span>
        </div>
        <div className="footer-copyright">
          © 2026 Planify. Tous droits réservés. <br />
          Fait avec passion pour les restaurateurs.
        </div>
        <div className="nav-links">
          <a href="#" className="nav-link">Contact</a>
          <a href="#" className="nav-link">Mentions Légales</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
