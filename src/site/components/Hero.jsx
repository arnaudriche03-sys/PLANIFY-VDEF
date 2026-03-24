import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

const Hero = ({ onLoginClick }) => {
  return (
    <section className="site-section hero-content">
      <div className="hero-badge animate-fade-up">
        <ShieldCheck size={16} />
        Conformité HCR & Code du travail garantie
      </div>
      <h1 className="hero-title animate-fade-up delay-1">
        Gérez votre équipe <br />
        <span className="hero-gradient-text">en toute sécurité.</span>
      </h1>
      <p className="hero-subtitle animate-fade-up delay-2">
        Planning intelligent, gestion des exceptions et pré-paie automatique.
        Planify pilote votre restaurant en respectant la législation française.
      </p>
      <div className="hero-actions animate-fade-up delay-3">
        <a href="#pricing" className="btn btn-primary">
          Découvrir nos offres <ArrowRight size={18} />
        </a>
        <a href="#preview" className="btn btn-secondary">
          Voir l'application
        </a>
      </div>
    </section>
  );
};

export default Hero;
